// Pure 2048 board logic — no DOM, no timers, no rendering.
//
// A board is a SIZE x SIZE array of rows holding either null or a tile record
// {id, value}. Ids are stable across a move, which is what lets game.js animate
// a slide by moving the SAME element rather than redrawing the grid: move()
// reports, per tile id, the cell it ends up in.
//
// move() returns a brand-new board and never touches the one passed in, so the
// caller can hold on to the previous board (or a values snapshot of it) for undo.
var Board = (function () {
  var SIZE = 4;
  var WIN_VALUE = 2048;
  var nextId = 1;

  function create() {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(null);
      cells.push(row);
    }
    return cells;
  }

  function emptyCells(cells) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!cells[r][c]) out.push({ r: r, c: c });
      }
    }
    return out;
  }

  // Adds one tile in a random empty cell (90% a 2, 10% a 4) and returns it,
  // or null when the board is full. Mutates cells.
  function spawn(cells) {
    var open = emptyCells(cells);
    if (!open.length) return null;
    var spot = open[Math.floor(Math.random() * open.length)];
    var tile = { id: nextId++, value: Math.random() < 0.9 ? 2 : 4, r: spot.r, c: spot.c };
    cells[spot.r][spot.c] = { id: tile.id, value: tile.value };
    return tile;
  }

  // Cell coordinates for each of the four lines that run along `dir`, ordered
  // from the destination edge inward — so compaction is always "pack toward
  // index 0" regardless of direction.
  function lines(dir) {
    var out = [];
    var i, j, line;
    for (i = 0; i < SIZE; i++) {
      line = [];
      for (j = 0; j < SIZE; j++) {
        if (dir === 'left') line.push({ r: i, c: j });
        else if (dir === 'right') line.push({ r: i, c: SIZE - 1 - j });
        else if (dir === 'up') line.push({ r: j, c: i });
        else line.push({ r: SIZE - 1 - j, c: i });
      }
      out.push(line);
    }
    return out;
  }

  // Slides and merges in `dir`. Returns the new board plus:
  //   moves   — [{id, to:{r,c}}] for every tile that survives the slide, including
  //             BOTH halves of a merge (they land on the same cell; the absorbed
  //             one is then removed by the caller once the animation finishes)
  //   merges  — [{id, absorbedId, value, at}] one per merge
  //   gained  — score earned (sum of merged values)
  //   moved   — false when the move is a no-op and should be ignored entirely
  //
  // Each tile can merge at most once per move, which falls out of stepping the
  // scan forward by two whenever a pair merges.
  function move(cells, dir) {
    var next = create();
    var moves = [];
    var merges = [];
    var gained = 0;
    var moved = false;
    var all = lines(dir);

    for (var l = 0; l < all.length; l++) {
      var line = all[l];
      var items = [];
      for (var i = 0; i < line.length; i++) {
        var tile = cells[line[i].r][line[i].c];
        if (tile) items.push({ tile: tile, from: line[i] });
      }

      var slot = 0;
      var k = 0;
      while (k < items.length) {
        var near = items[k];
        var far = k + 1 < items.length ? items[k + 1] : null;
        var target = line[slot];

        if (far && far.tile.value === near.tile.value) {
          var merged = near.tile.value * 2;
          next[target.r][target.c] = { id: near.tile.id, value: merged };
          moves.push({ id: near.tile.id, to: target });
          moves.push({ id: far.tile.id, to: target });
          merges.push({ id: near.tile.id, absorbedId: far.tile.id, value: merged, at: target });
          gained += merged;
          moved = true;
          k += 2;
        } else {
          next[target.r][target.c] = { id: near.tile.id, value: near.tile.value };
          moves.push({ id: near.tile.id, to: target });
          if (near.from.r !== target.r || near.from.c !== target.c) moved = true;
          k += 1;
        }
        slot += 1;
      }
    }

    return { cells: next, moves: moves, merges: merges, gained: gained, moved: moved };
  }

  // True while any move is still possible: an empty cell, or two equal
  // neighbours somewhere.
  function hasMove(cells) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var tile = cells[r][c];
        if (!tile) return true;
        if (c + 1 < SIZE && cells[r][c + 1] && cells[r][c + 1].value === tile.value) return true;
        if (r + 1 < SIZE && cells[r + 1][c] && cells[r + 1][c].value === tile.value) return true;
      }
    }
    return false;
  }

  function maxValue(cells) {
    var max = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (cells[r][c] && cells[r][c].value > max) max = cells[r][c].value;
      }
    }
    return max;
  }

  function listTiles(cells) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (cells[r][c]) {
          out.push({ id: cells[r][c].id, value: cells[r][c].value, r: r, c: c });
        }
      }
    }
    return out;
  }

  // Snapshot / restore for undo and for localStorage. Ids are deliberately NOT
  // preserved — a restored board is rebuilt from scratch in the DOM, so fresh
  // ids avoid colliding with elements still on screen.
  function toValues(cells) {
    var values = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(cells[r][c] ? cells[r][c].value : 0);
      values.push(row);
    }
    return values;
  }

  function fromValues(values) {
    var cells = create();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = values[r][c];
        if (v) cells[r][c] = { id: nextId++, value: v };
      }
    }
    return cells;
  }

  // Shape check for anything coming back out of localStorage.
  function isValidValues(values) {
    if (!values || values.length !== SIZE) return false;
    for (var r = 0; r < SIZE; r++) {
      if (!values[r] || values[r].length !== SIZE) return false;
      for (var c = 0; c < SIZE; c++) {
        var v = values[r][c];
        if (typeof v !== 'number' || v < 0 || v % 2 !== 0) return false;
      }
    }
    return true;
  }

  return {
    SIZE: SIZE,
    WIN_VALUE: WIN_VALUE,
    create: create,
    spawn: spawn,
    move: move,
    hasMove: hasMove,
    maxValue: maxValue,
    listTiles: listTiles,
    toValues: toValues,
    fromValues: fromValues,
    isValidValues: isValidValues,
  };
})();
