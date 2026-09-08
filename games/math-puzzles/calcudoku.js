// "Calcudoku" (KenKen-style): fill an NxN grid 1..N per row/col, satisfying
// each cage's target+operation clue.
window.MathPuzzles = window.MathPuzzles || {};

window.MathPuzzles.calcudoku = (function () {
  var activeRerender = null; // set by the most recent render() call, used by getHint

  function zerosGrid(N) {
    var g = [];
    for (var r = 0; r < N; r++) g.push(new Array(N).fill(0));
    return g;
  }

  function shuffledRange(min, max) {
    var arr = [];
    for (var i = min; i <= max; i++) arr.push(i);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function generateLatinSquare(N) {
    var grid = zerosGrid(N);
    var rowUsed = [], colUsed = [];
    for (var i = 0; i < N; i++) {
      rowUsed.push(new Array(N + 1).fill(false));
      colUsed.push(new Array(N + 1).fill(false));
    }
    function backtrack(index) {
      if (index === N * N) return true;
      var r = Math.floor(index / N), c = index % N;
      var candidates = shuffledRange(1, N);
      for (var k = 0; k < candidates.length; k++) {
        var v = candidates[k];
        if (rowUsed[r][v] || colUsed[c][v]) continue;
        grid[r][c] = v; rowUsed[r][v] = true; colUsed[c][v] = true;
        if (backtrack(index + 1)) return true;
        grid[r][c] = 0; rowUsed[r][v] = false; colUsed[c][v] = false;
      }
      return false;
    }
    backtrack(0);
    return grid;
  }

  function cellKey(r, c) { return r + ',' + c; }

  function neighborsOf(r, c, N) {
    var out = [];
    if (r > 0) out.push({ r: r - 1, c: c });
    if (r < N - 1) out.push({ r: r + 1, c: c });
    if (c > 0) out.push({ r: r, c: c - 1 });
    if (c < N - 1) out.push({ r: r, c: c + 1 });
    return out;
  }

  // Cage-size distributions approximating the plan's skew (smaller at Easy, larger at Hard).
  var SIZE_POOLS = {
    easy: [1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
    medium: [1, 2, 2, 2, 3, 3, 3, 4, 4, 5],
    hard: [1, 2, 3, 3, 3, 4, 4, 4, 5, 5],
  };

  function pickCageSize(difficulty) {
    var pool = SIZE_POOLS[difficulty] || SIZE_POOLS.medium;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function generateCages(N, difficulty) {
    var unassigned = {};
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) unassigned[cellKey(r, c)] = { r: r, c: c };
    var cages = [];

    function popRandomUnassigned() {
      var keys = Object.keys(unassigned);
      var key = keys[Math.floor(Math.random() * keys.length)];
      var cell = unassigned[key];
      delete unassigned[key];
      return cell;
    }

    while (Object.keys(unassigned).length > 0) {
      var start = popRandomUnassigned();
      var remainingCount = Object.keys(unassigned).length + 1;
      var targetSize = Math.min(pickCageSize(difficulty), remainingCount);
      var cage = [start];
      var frontier = neighborsOf(start.r, start.c, N).filter(function (n) { return unassigned[cellKey(n.r, n.c)]; });

      while (cage.length < targetSize && frontier.length > 0) {
        var idx = Math.floor(Math.random() * frontier.length);
        var next = frontier[idx];
        frontier.splice(idx, 1);
        var key = cellKey(next.r, next.c);
        if (!unassigned[key]) continue;
        delete unassigned[key];
        cage.push(next);
        var more = neighborsOf(next.r, next.c, N).filter(function (n) { return unassigned[cellKey(n.r, n.c)]; });
        more.forEach(function (n) {
          var nk = cellKey(n.r, n.c);
          if (!frontier.some(function (f) { return cellKey(f.r, f.c) === nk; })) frontier.push(n);
        });
      }
      cages.push(cage);
    }
    return cages;
  }

  function computeCageClue(cells, solution) {
    var vals = cells.map(function (c) { return solution[c.r][c.c]; });
    if (vals.length === 1) return { op: null, target: vals[0] };
    if (vals.length === 2) {
      var a = vals[0], b = vals[1];
      var options = [
        { op: '+', target: a + b },
        { op: '*', target: a * b },
        { op: '-', target: Math.abs(a - b) },
      ];
      if (a !== 0 && b !== 0 && (a % b === 0 || b % a === 0)) {
        options.push({ op: '/', target: Math.max(a, b) / Math.min(a, b) });
      }
      return options[Math.floor(Math.random() * options.length)];
    }
    var sum = vals.reduce(function (s, v) { return s + v; }, 0);
    var prod = vals.reduce(function (p, v) { return p * v; }, 1);
    return Math.random() < 0.7 ? { op: '+', target: sum } : { op: '*', target: prod };
  }

  function buildCageObjects(cageCells, solution) {
    return cageCells.map(function (cells, idx) {
      var clue = computeCageClue(cells, solution);
      return { id: 'cage' + idx, cells: cells, op: clue.op, target: clue.target };
    });
  }

  function buildCageIndex(cageObjs, N) {
    var grid = [];
    for (var r = 0; r < N; r++) grid.push(new Array(N).fill(null));
    cageObjs.forEach(function (cage) {
      cage.cells.forEach(function (cell) { grid[cell.r][cell.c] = cage; });
    });
    return grid;
  }

  function checkCageSatisfied(op, target, vals) {
    if (op === null) return vals[0] === target;
    if (op === '+') return vals.reduce(function (s, v) { return s + v; }, 0) === target;
    if (op === '*') return vals.reduce(function (p, v) { return p * v; }, 1) === target;
    if (op === '-') return Math.abs(vals[0] - vals[1]) === target;
    return (vals[1] !== 0 && vals[0] / vals[1] === target) || (vals[0] !== 0 && vals[1] / vals[0] === target);
  }

  // Backtracking solution counter, stopping early once maxCount solutions are found.
  // Never reads the generator's stored solution — a genuinely independent check.
  function countSolutions(N, cageIndex, maxCount, nodeBudget) {
    var grid = zerosGrid(N);
    var count = 0, nodes = 0, budgetExceeded = false;

    function rowColOk(r, c, v) {
      for (var k = 0; k < N; k++) { if (grid[r][k] === v || grid[k][c] === v) return false; }
      return true;
    }
    function cageComplete(cage) {
      return cage.cells.every(function (cell) { return grid[cell.r][cell.c] !== 0; });
    }
    function backtrack(index) {
      if (count >= maxCount || budgetExceeded) return;
      if (index === N * N) { count++; return; }
      var r = Math.floor(index / N), c = index % N;
      for (var v = 1; v <= N; v++) {
        nodes++;
        if (nodes > nodeBudget) { budgetExceeded = true; return; }
        if (!rowColOk(r, c, v)) continue;
        grid[r][c] = v;
        var cage = cageIndex[r][c];
        var ok = true;
        if (cageComplete(cage)) {
          var vals = cage.cells.map(function (cell) { return grid[cell.r][cell.c]; });
          ok = checkCageSatisfied(cage.op, cage.target, vals);
        }
        if (ok) backtrack(index + 1);
        grid[r][c] = 0;
        if (count >= maxCount || budgetExceeded) return;
      }
    }
    backtrack(0);
    return budgetExceeded ? -1 : count;
  }

  function generate(difficulty) {
    var N = { easy: 4, medium: 5, hard: 6 }[difficulty] || 4;
    var maxSingletons = Math.ceil(N * ({ easy: 0.5, medium: 0.3, hard: 0.2 }[difficulty] || 0.3));
    var lastAttempt = null, firstUnique = null;

    for (var outer = 0; outer < 8; outer++) {
      var solution = generateLatinSquare(N);
      for (var inner = 0; inner < 15; inner++) {
        var cageCells = generateCages(N, difficulty);
        var cageObjs = buildCageObjects(cageCells, solution);
        var cageIndex = buildCageIndex(cageObjs, N);
        var count = countSolutions(N, cageIndex, 2, 200000);
        var attempt = {
          N: N, difficulty: difficulty, solution: solution,
          cages: cageObjs, cageIndex: cageIndex, playerGrid: zerosGrid(N),
        };
        lastAttempt = attempt;
        if (count === 1) {
          if (!firstUnique) firstUnique = attempt;
          var singletons = cageCells.filter(function (c) { return c.length === 1; }).length;
          if (singletons <= maxSingletons) return attempt;
        }
      }
    }
    return firstUnique || lastAttempt;
  }

  function findConflicts(grid, N) {
    var conflicts = {};
    for (var r = 0; r < N; r++) {
      var counts = {};
      for (var c = 0; c < N; c++) { var v = grid[r][c]; if (v) counts[v] = (counts[v] || 0) + 1; }
      for (var c = 0; c < N; c++) { var v = grid[r][c]; if (v && counts[v] > 1) conflicts[cellKey(r, c)] = true; }
    }
    for (var c = 0; c < N; c++) {
      var counts2 = {};
      for (var r = 0; r < N; r++) { var v = grid[r][c]; if (v) counts2[v] = (counts2[v] || 0) + 1; }
      for (var r = 0; r < N; r++) { var v = grid[r][c]; if (v && counts2[v] > 1) conflicts[cellKey(r, c)] = true; }
    }
    return conflicts;
  }

  function validatePlayerGrid(N, playerGrid, cages) {
    var conflicts = findConflicts(playerGrid, N);
    var allFilled = true;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!playerGrid[r][c]) allFilled = false;
    var allCagesOk = cages.every(function (cage) {
      var vals = cage.cells.map(function (cell) { return playerGrid[cell.r][cell.c]; });
      if (vals.some(function (v) { return !v; })) return false;
      return checkCageSatisfied(cage.op, cage.target, vals);
    });
    var solved = allFilled && Object.keys(conflicts).length === 0 && allCagesOk;
    return { conflicts: conflicts, solved: solved, allFilled: allFilled };
  }

  function checkSolution(puzzleState) {
    return validatePlayerGrid(puzzleState.N, puzzleState.playerGrid, puzzleState.cages);
  }

  function render(container, puzzleState, callbacks) {
    var N = puzzleState.N;
    var labelCellOf = {}; // cage.id -> "r,c" of its label cell (row-major first cell)
    puzzleState.cages.forEach(function (cage) {
      var first = cage.cells.reduce(function (best, cell) {
        if (!best) return cell;
        if (cell.r < best.r || (cell.r === best.r && cell.c < best.c)) return cell;
        return best;
      }, null);
      labelCellOf[cage.id] = cellKey(first.r, first.c);
    });

    var inputs = {}; // "r,c" -> <input>
    var lastFocused = null;

    function redraw() {
      container.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'ck-wrap';

      var instructions = document.createElement('p');
      instructions.className = 'puzzle-instructions';
      instructions.textContent = 'Fill 1-' + N + ' in every row and column so each cage hits its target.';
      wrap.appendChild(instructions);

      var grid = document.createElement('div');
      grid.className = 'ck-grid';
      grid.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';

      var conflicts = findConflicts(puzzleState.playerGrid, N);

      for (var r = 0; r < N; r++) {
        for (var c = 0; c < N; c++) {
          var cage = puzzleState.cageIndex[r][c];
          var cellDiv = document.createElement('div');
          cellDiv.className = 'ck-cell';
          if (cellKey(r, c) === labelCellOf[cage.id]) {
            var label = document.createElement('span');
            label.className = 'ck-clue';
            label.textContent = cage.target + (cage.op ? (cage.op === '*' ? '×' : cage.op === '/' ? '÷' : cage.op) : '');
            cellDiv.appendChild(label);
          }

          // Thicker borders wherever the neighboring cell belongs to a different cage.
          if (r === 0 || puzzleState.cageIndex[r - 1][c].id !== cage.id) cellDiv.classList.add('ck-edge-top');
          if (c === 0 || puzzleState.cageIndex[r][c - 1].id !== cage.id) cellDiv.classList.add('ck-edge-left');
          if (r === N - 1 || puzzleState.cageIndex[r + 1][c].id !== cage.id) cellDiv.classList.add('ck-edge-bottom');
          if (c === N - 1 || puzzleState.cageIndex[r][c + 1].id !== cage.id) cellDiv.classList.add('ck-edge-right');

          var input = document.createElement('input');
          input.type = 'text';
          input.inputMode = 'numeric';
          input.maxLength = 1;
          input.className = 'ck-input' + (conflicts[cellKey(r, c)] ? ' conflict' : '');
          var val = puzzleState.playerGrid[r][c];
          input.value = val ? String(val) : '';
          (function (r, c, input) {
            input.addEventListener('focus', function () { lastFocused = { r: r, c: c }; });
            input.addEventListener('input', function () {
              var digit = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
              if (isNaN(digit) || digit < 1 || digit > N) digit = 0;
              puzzleState.playerGrid[r][c] = digit;
              onGridChanged();
            });
          })(r, c, input);
          inputs[cellKey(r, c)] = input;
          cellDiv.appendChild(input);
          grid.appendChild(cellDiv);
        }
      }
      wrap.appendChild(grid);

      var pad = document.createElement('div');
      pad.className = 'ck-numpad';
      for (var n = 1; n <= N; n++) {
        (function (n) {
          var btn = document.createElement('button');
          btn.className = 'ck-pad-btn';
          btn.textContent = String(n);
          btn.addEventListener('click', function () {
            if (!lastFocused) return;
            puzzleState.playerGrid[lastFocused.r][lastFocused.c] = n;
            onGridChanged();
          });
          pad.appendChild(btn);
        })(n);
      }
      var clearBtn = document.createElement('button');
      clearBtn.className = 'ck-pad-btn ck-pad-clear';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', function () {
        if (!lastFocused) return;
        puzzleState.playerGrid[lastFocused.r][lastFocused.c] = 0;
        onGridChanged();
      });
      pad.appendChild(clearBtn);
      wrap.appendChild(pad);

      var msg = document.createElement('p');
      msg.className = 'ck-message';
      wrap.appendChild(msg);

      container.appendChild(wrap);
      var toFocus = lastFocused && inputs[cellKey(lastFocused.r, lastFocused.c)];
      if (toFocus) toFocus.focus();
    }

    function onGridChanged() {
      redraw();
      var result = validatePlayerGrid(N, puzzleState.playerGrid, puzzleState.cages);
      if (result.solved) {
        var msg = container.querySelector('.ck-message');
        if (msg) { msg.textContent = 'Solved!'; msg.className = 'ck-message success'; }
        callbacks.onSolved();
      }
    }

    activeRerender = redraw;
    redraw();
  }

  function getHint(puzzleState) {
    var N = puzzleState.N;
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        if (puzzleState.playerGrid[r][c] !== puzzleState.solution[r][c]) {
          puzzleState.playerGrid[r][c] = puzzleState.solution[r][c];
          if (activeRerender) activeRerender();
          return;
        }
      }
    }
  }

  return {
    generate: generate,
    render: render,
    checkSolution: checkSolution,
    getHint: getHint,
  };
})();
