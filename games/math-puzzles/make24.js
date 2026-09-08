// "Make 24": combine 4 tiles with +-*/ (click tile, click op, click tile) to reach 24.
window.MathPuzzles = window.MathPuzzles || {};

window.MathPuzzles.make24 = (function () {
  var nextTileId = 1;
  var activeSetMessage = null; // set by the most recent render() call, used by getHint

  function makeTile(value) {
    return { id: 't' + (nextTileId++), value: value };
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // All ways to combine two rational values: +, x, both subtraction orders,
  // and both division orders (only when the divisor is nonzero).
  function combineAll(a, b) {
    var out = [];
    out.push({ value: Rational.add(a, b), op: '+', order: 'ab' });
    out.push({ value: Rational.mul(a, b), op: '*', order: 'ab' });
    out.push({ value: Rational.sub(a, b), op: '-', order: 'ab' });
    out.push({ value: Rational.sub(b, a), op: '-', order: 'ba' });
    var d1 = Rational.div(a, b);
    if (d1) out.push({ value: d1, op: '/', order: 'ab' });
    var d2 = Rational.div(b, a);
    if (d2) out.push({ value: d2, op: '/', order: 'ba' });
    return out;
  }

  // Counts distinct solutions (by canonicalized expression shape) for difficulty bucketing.
  function countSolutions(numbers) {
    var target = Rational.fromInt(24);
    var seen = {};
    var count = 0;
    var leaves = numbers.map(function (n) { return { value: Rational.fromInt(n), key: 'N:' + n }; });

    function canonicalKey(node) {
      if (!node.op) return node.key;
      var lk = canonicalKey(node.left), rk = canonicalKey(node.right);
      if (node.op === '+' || node.op === '*') {
        var pair = [lk, rk].sort();
        return '(' + pair[0] + node.op + pair[1] + ')';
      }
      return '(' + lk + node.op + rk + ')';
    }

    function recurse(list) {
      if (list.length === 1) {
        if (Rational.equals(list[0].value, target)) {
          var key = canonicalKey(list[0]);
          if (!seen[key]) { seen[key] = true; count++; }
        }
        return;
      }
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var rest = [];
          for (var k = 0; k < list.length; k++) { if (k !== i && k !== j) rest.push(list[k]); }
          var results = combineAll(list[i].value, list[j].value);
          for (var r = 0; r < results.length; r++) {
            var newNode = {
              value: results[r].value,
              op: results[r].op,
              left: results[r].order === 'ab' ? list[i] : list[j],
              right: results[r].order === 'ab' ? list[j] : list[i],
            };
            recurse(rest.concat([newNode]));
          }
        }
      }
    }
    recurse(leaves);
    return count;
  }

  // Finds the first combine step of some solution reachable from the player's
  // CURRENT tile list (any length 2-4). Returns null if none exists.
  function findHint(tiles) {
    var target = Rational.fromInt(24);
    var found = null;

    function recurse(list, firstStep) {
      if (found) return;
      if (list.length === 1) {
        if (Rational.equals(list[0].value, target)) found = firstStep;
        return;
      }
      for (var i = 0; i < list.length && !found; i++) {
        for (var j = i + 1; j < list.length && !found; j++) {
          var rest = [];
          for (var k = 0; k < list.length; k++) { if (k !== i && k !== j) rest.push(list[k]); }
          var results = combineAll(list[i].value, list[j].value);
          for (var r = 0; r < results.length && !found; r++) {
            var step = firstStep || { aId: list[i].id, bId: list[j].id, op: results[r].op, order: results[r].order };
            var newNode = { id: 'hint-' + Math.random(), value: results[r].value };
            recurse(rest.concat([newNode]), step);
          }
        }
      }
    }
    recurse(tiles.map(function (t) { return { id: t.id, value: t.value }; }), null);
    return found;
  }

  function makePuzzleState(draw, count) {
    return {
      numbers: draw.slice(),
      solutionCount: count,
      tiles: draw.map(function (n) { return makeTile(Rational.fromInt(n)); }),
      history: [],
      selection: { tileA: null, op: null },
    };
  }

  function generate(difficulty) {
    var buckets = {
      easy: function (c) { return c >= 4; },
      medium: function (c) { return c >= 2 && c <= 3; },
      hard: function (c) { return c === 1; },
    };
    var bucketFn = buckets[difficulty] || buckets.medium;
    var maxAttempts = 300;
    var best = null, bestDist = Infinity;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var draw = [randInt(1, 9), randInt(1, 9), randInt(1, 9), randInt(1, 9)];
      var count = countSolutions(draw);
      if (bucketFn(count)) return makePuzzleState(draw, count);
      if (count > 0) {
        var dist = difficulty === 'hard' ? Math.abs(count - 1)
          : difficulty === 'medium' ? Math.min(Math.abs(count - 2), Math.abs(count - 3))
          : Math.abs(count - 4);
        if (dist < bestDist) { bestDist = dist; best = { draw: draw, count: count }; }
      }
    }
    // Guaranteed-solvable fallback (1*2*3*4=24) if 300 random draws never hit any bucket.
    return best ? makePuzzleState(best.draw, best.count) : makePuzzleState([1, 2, 3, 4], countSolutions([1, 2, 3, 4]));
  }

  function render(container, puzzleState, callbacks) {
    function setMessage(text, cls) {
      var msg = container.querySelector('.m24-message');
      if (msg) { msg.textContent = text; msg.className = 'm24-message' + (cls ? ' ' + cls : ''); }
    }
    activeSetMessage = setMessage;

    function draw() {
      container.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'm24-wrap';

      var instructions = document.createElement('p');
      instructions.className = 'puzzle-instructions';
      instructions.textContent = 'Combine all four tiles with +, -, ×, ÷ to make exactly 24.';
      wrap.appendChild(instructions);

      var tileRow = document.createElement('div');
      tileRow.className = 'm24-tiles';
      puzzleState.tiles.forEach(function (tile) {
        var btn = document.createElement('button');
        btn.className = 'm24-tile' + (puzzleState.selection.tileA === tile.id ? ' selected' : '');
        btn.textContent = Rational.toDisplayString(tile.value);
        btn.addEventListener('click', function () { onTileClick(tile.id); });
        tileRow.appendChild(btn);
      });
      wrap.appendChild(tileRow);

      var opRow = document.createElement('div');
      opRow.className = 'm24-ops';
      [['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷']].forEach(function (pair) {
        var op = pair[0];
        var btn = document.createElement('button');
        btn.className = 'm24-op' + (puzzleState.selection.op === op ? ' selected' : '');
        btn.textContent = pair[1];
        btn.disabled = !puzzleState.selection.tileA;
        btn.addEventListener('click', function () { onOpClick(op); });
        opRow.appendChild(btn);
      });
      wrap.appendChild(opRow);

      var undoBtn = document.createElement('button');
      undoBtn.className = 'btn btn-ghost m24-undo';
      undoBtn.textContent = 'Undo';
      undoBtn.disabled = puzzleState.history.length === 0;
      undoBtn.addEventListener('click', onUndo);
      wrap.appendChild(undoBtn);

      var msg = document.createElement('p');
      msg.className = 'm24-message';
      wrap.appendChild(msg);

      container.appendChild(wrap);
    }

    function onTileClick(id) {
      if (puzzleState.tiles.length === 1) return;
      var sel = puzzleState.selection;
      if (!sel.tileA) {
        sel.tileA = id;
        draw();
        return;
      }
      if (sel.tileA === id) {
        sel.tileA = null;
        sel.op = null;
        draw();
        return;
      }
      if (!sel.op) {
        sel.tileA = id; // re-pick first tile
        draw();
        return;
      }
      combine(sel.tileA, id, sel.op);
    }

    function onOpClick(op) {
      if (!puzzleState.selection.tileA) return;
      puzzleState.selection.op = op;
      draw();
    }

    function combine(aId, bId, op) {
      var tiles = puzzleState.tiles;
      var aTile = tiles.filter(function (t) { return t.id === aId; })[0];
      var bTile = tiles.filter(function (t) { return t.id === bId; })[0];
      var result;
      if (op === '+') result = Rational.add(aTile.value, bTile.value);
      else if (op === '-') result = Rational.sub(aTile.value, bTile.value);
      else if (op === '*') result = Rational.mul(aTile.value, bTile.value);
      else result = Rational.div(aTile.value, bTile.value);

      if (result === null) {
        puzzleState.selection.tileA = null;
        puzzleState.selection.op = null;
        draw();
        setMessage("Can't divide by zero — pick a different combo.", 'error');
        return;
      }

      puzzleState.history.push(tiles.slice()); // shallow copy is safe: tiles are never mutated in place

      var newTile = makeTile(result);
      var remaining = tiles.filter(function (t) { return t.id !== aId && t.id !== bId; });
      remaining.push(newTile);
      puzzleState.tiles = remaining;
      puzzleState.selection.tileA = null;
      puzzleState.selection.op = null;

      draw();

      if (puzzleState.tiles.length === 1) {
        if (Rational.equals(puzzleState.tiles[0].value, Rational.fromInt(24))) {
          setMessage('24! Solved!', 'success');
          callbacks.onSolved();
        } else {
          setMessage('That\'s ' + Rational.toDisplayString(puzzleState.tiles[0].value) + ', not 24 — try Undo.', 'error');
        }
      }
    }

    function onUndo() {
      if (puzzleState.history.length === 0) return;
      puzzleState.tiles = puzzleState.history.pop();
      puzzleState.selection.tileA = null;
      puzzleState.selection.op = null;
      draw();
    }

    draw();
  }

  function checkSolution(puzzleState) {
    var solved = puzzleState.tiles.length === 1 && Rational.equals(puzzleState.tiles[0].value, Rational.fromInt(24));
    return { solved: solved };
  }

  function getHint(puzzleState) {
    if (!activeSetMessage) return;
    if (puzzleState.tiles.length <= 1) {
      activeSetMessage('Already down to one tile — Undo to try a different path.', 'info');
      return;
    }
    var step = findHint(puzzleState.tiles);
    if (!step) {
      activeSetMessage('No path to 24 from here — try Undo.', 'info');
      return;
    }
    var aTile = puzzleState.tiles.filter(function (t) { return t.id === step.aId; })[0];
    var bTile = puzzleState.tiles.filter(function (t) { return t.id === step.bId; })[0];
    var opSymbol = step.op === '*' ? '×' : (step.op === '/' ? '÷' : step.op);
    var text = step.order === 'ab'
      ? Rational.toDisplayString(aTile.value) + ' ' + opSymbol + ' ' + Rational.toDisplayString(bTile.value)
      : Rational.toDisplayString(bTile.value) + ' ' + opSymbol + ' ' + Rational.toDisplayString(aTile.value);
    activeSetMessage('Hint: try ' + text, 'info');
  }

  return {
    generate: generate,
    render: render,
    checkSolution: checkSolution,
    getHint: getHint,
  };
})();
