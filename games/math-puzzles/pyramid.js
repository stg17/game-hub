// "Number Pyramid": every block equals the sum of the two blocks directly
// below it. Some blocks are given; the rest must be deduced via addition/subtraction.
window.MathPuzzles = window.MathPuzzles || {};

window.MathPuzzles.pyramid = (function () {
  var activeRerender = null;

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Row 0 = top (1 cell) ... row N-1 = bottom (N cells); cells[r][i] = cells[r+1][i] + cells[r+1][i+1].
  function buildPyramidFromBottom(bottom, N) {
    var grid = new Array(N);
    grid[N - 1] = bottom.slice();
    for (var r = N - 2; r >= 0; r--) {
      grid[r] = [];
      for (var i = 0; i <= r; i++) grid[r][i] = grid[r + 1][i] + grid[r + 1][i + 1];
    }
    return grid;
  }

  function allTrue(N) {
    var g = [];
    for (var r = 0; r < N; r++) { g[r] = []; for (var i = 0; i <= r; i++) g[r][i] = true; }
    return g;
  }

  function revealedCellList(revealed) {
    var out = [];
    for (var r = 0; r < revealed.length; r++) {
      for (var i = 0; i < revealed[r].length; i++) if (revealed[r][i]) out.push({ r: r, i: i });
    }
    return out;
  }

  function applyMask(solution, revealed, N) {
    var out = [];
    for (var r = 0; r < N; r++) {
      out[r] = [];
      for (var i = 0; i <= r; i++) out[r][i] = revealed[r][i] ? solution[r][i] : null;
    }
    return out;
  }

  // Constraint propagation: whenever exactly one of {parent, leftChild, rightChild}
  // is unknown, deduce it from the other two. Loops to a fixed point.
  function propagate(values, N) {
    var work = values.map(function (row) { return row.slice(); });
    var changed = true;
    while (changed) {
      changed = false;
      for (var r = 0; r <= N - 2; r++) {
        for (var i = 0; i <= r; i++) {
          var p = work[r][i], l = work[r + 1][i], rr = work[r + 1][i + 1];
          var unknowns = (p === null ? 1 : 0) + (l === null ? 1 : 0) + (rr === null ? 1 : 0);
          if (unknowns !== 1) continue;
          if (p === null) { work[r][i] = l + rr; changed = true; }
          else if (l === null) { work[r + 1][i] = p - rr; changed = true; }
          else { work[r + 1][i + 1] = p - l; changed = true; }
        }
      }
    }
    return work;
  }

  function hasNulls(grid) {
    for (var r = 0; r < grid.length; r++) {
      for (var i = 0; i < grid[r].length; i++) if (grid[r][i] === null) return true;
    }
    return false;
  }

  function generate(difficulty) {
    var N = { easy: 4, medium: 5, hard: 6 }[difficulty] || 4;
    var range = { easy: [1, 9], medium: [1, 15], hard: [1, 20] }[difficulty] || [1, 9];
    var allowNegative = difficulty === 'hard';

    var bottom = [];
    for (var i = 0; i < N; i++) {
      var v = randInt(range[0], range[1]);
      if (allowNegative && Math.random() < 0.5) v = -v;
      bottom.push(v);
    }
    var solution = buildPyramidFromBottom(bottom, N);

    var totalCells = N * (N + 1) / 2;
    var minRevealed = Math.ceil(totalCells * ({ easy: 0.5, medium: 0.35, hard: 0 }[difficulty] || 0.35));
    var revealed = allTrue(N);
    var countRevealed = totalCells;

    for (var pass = 0; pass < 6 && countRevealed > minRevealed; pass++) {
      var candidates = shuffle(revealedCellList(revealed));
      var progressed = false;
      for (var k = 0; k < candidates.length && countRevealed > minRevealed; k++) {
        var cell = candidates[k];
        if (!revealed[cell.r][cell.i]) continue;
        revealed[cell.r][cell.i] = false;
        var masked = applyMask(solution, revealed, N);
        var result = propagate(masked, N);
        if (hasNulls(result)) {
          revealed[cell.r][cell.i] = true; // still needed — revert
        } else {
          countRevealed--;
          progressed = true;
        }
      }
      if (!progressed) break;
    }

    var playerGrid = [];
    for (var r = 0; r < N; r++) {
      playerGrid[r] = [];
      for (var i2 = 0; i2 <= r; i2++) playerGrid[r][i2] = revealed[r][i2] ? solution[r][i2] : null;
    }

    return { N: N, difficulty: difficulty, solution: solution, revealed: revealed, playerGrid: playerGrid };
  }

  function checkSolution(puzzleState) {
    var N = puzzleState.N;
    var allFilled = true;
    var mismatches = [];
    for (var r = 0; r < N; r++) {
      for (var i = 0; i <= r; i++) {
        var v = puzzleState.playerGrid[r][i];
        if (v === null || v === undefined || isNaN(v)) {
          allFilled = false;
        } else if (v !== puzzleState.solution[r][i]) {
          mismatches.push({ r: r, i: i });
        }
      }
    }
    return { solved: allFilled && mismatches.length === 0, allFilled: allFilled, mismatches: mismatches };
  }

  function render(container, puzzleState, callbacks) {
    var N = puzzleState.N;
    var lastMismatches = {};

    function redraw() {
      container.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'pyr-wrap';

      var pyramid = document.createElement('div');
      pyramid.className = 'pyr-pyramid';
      for (var r = 0; r < N; r++) {
        var row = document.createElement('div');
        row.className = 'pyr-row';
        for (var i = 0; i <= r; i++) {
          var key = r + ',' + i;
          var cell = document.createElement('div');
          cell.className = 'pyr-cell' + (lastMismatches[key] ? ' mismatch' : '');

          if (puzzleState.revealed[r][i]) {
            cell.classList.add('pyr-given');
            cell.textContent = String(puzzleState.solution[r][i]);
          } else {
            var input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.className = 'pyr-input-el';
            var val = puzzleState.playerGrid[r][i];
            input.value = (val === null || val === undefined) ? '' : String(val);
            (function (r, i, input) {
              input.addEventListener('input', function () {
                var raw = input.value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
                input.value = raw;
                var parsed = parseInt(raw, 10);
                puzzleState.playerGrid[r][i] = isNaN(parsed) ? null : parsed;
                onGridChanged();
              });
            })(r, i, input);
            cell.appendChild(input);
          }
          row.appendChild(cell);
        }
        pyramid.appendChild(row);
      }
      wrap.appendChild(pyramid);

      var msg = document.createElement('p');
      msg.className = 'pyr-message';
      wrap.appendChild(msg);

      container.appendChild(wrap);
    }

    var checkTimer = null;

    function onGridChanged() {
      // A cell reads as "filled" the instant one digit of a two-digit answer lands,
      // so redrawing right away would yank focus out of the box before the second
      // digit is typed. Wait for a pause in typing before redrawing.
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = setTimeout(function () {
        checkTimer = null;
        var result = checkSolution(puzzleState);
        if (!result.allFilled) return;
        lastMismatches = {};
        result.mismatches.forEach(function (m) { lastMismatches[m.r + ',' + m.i] = true; });
        redraw();
        var msg = container.querySelector('.pyr-message');
        if (result.solved) {
          if (msg) { msg.textContent = 'Solved!'; msg.className = 'pyr-message success'; }
          callbacks.onSolved();
        } else if (msg) {
          msg.textContent = result.mismatches.length + ' block' + (result.mismatches.length === 1 ? '' : 's') +
            " don't add up — check the highlighted ones.";
          msg.className = 'pyr-message error';
        }
      }, 1500);
    }

    activeRerender = redraw;
    redraw();
  }

  function getHint(puzzleState) {
    var N = puzzleState.N;
    for (var r = 0; r < N; r++) {
      for (var i = 0; i <= r; i++) {
        if (!puzzleState.revealed[r][i] && puzzleState.playerGrid[r][i] !== puzzleState.solution[r][i]) {
          puzzleState.playerGrid[r][i] = puzzleState.solution[r][i];
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
