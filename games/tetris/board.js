// The playfield: a ROWS x COLS matrix holding either null (empty) or a piece
// type letter (the letter is what gives a locked cell its colour).
//
// Nothing here mutates a piece. Movement everywhere in this game is "build a
// candidate {type, rot, x, y}, test it with valid(), keep it only if it passes"
// — which is also exactly how the wall-kick loop in game.js works.
var Board = (function () {
  var COLS = 10;
  var ROWS = 20;

  function create() {
    var grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(null);
      grid.push(row);
    }
    return grid;
  }

  // Cells above the top of the playfield (y < 0) count as empty, so upward
  // wall kicks near the ceiling and a partially-off-screen spawn both behave.
  function valid(grid, piece) {
    var cells = Tetromino.cells(piece);
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return false;
      if (cell.y >= 0 && grid[cell.y][cell.x]) return false;
    }
    return true;
  }

  // How many rows the piece can fall before it would collide. Drives both the
  // ghost preview and the hard drop.
  function dropDistance(grid, piece) {
    var probe = { type: piece.type, rot: piece.rot, x: piece.x, y: piece.y };
    var dist = 0;
    for (;;) {
      probe.y += 1;
      if (!valid(grid, probe)) return dist;
      dist += 1;
    }
  }

  function fullRows(grid) {
    var rows = [];
    for (var r = 0; r < ROWS; r++) {
      var complete = true;
      for (var c = 0; c < COLS; c++) {
        if (!grid[r][c]) {
          complete = false;
          break;
        }
      }
      if (complete) rows.push(r);
    }
    return rows;
  }

  // Writes the piece into the grid. A cell that ends up above the playfield
  // means the stack grew out the top, reported as toppedOut.
  function lock(grid, piece) {
    var cells = Tetromino.cells(piece);
    var toppedOut = false;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      if (cell.y < 0) {
        toppedOut = true;
        continue;
      }
      grid[cell.y][cell.x] = piece.type;
    }
    return { toppedOut: toppedOut, full: fullRows(grid) };
  }

  // Removing row k and unshifting a blank leaves every row BELOW k at its old
  // index, so an ascending list of row indices stays valid as we go.
  function clearRows(grid, rows) {
    for (var i = 0; i < rows.length; i++) {
      grid.splice(rows[i], 1);
      var blank = [];
      for (var c = 0; c < COLS; c++) blank.push(null);
      grid.unshift(blank);
    }
  }

  return {
    COLS: COLS,
    ROWS: ROWS,
    create: create,
    valid: valid,
    dropDistance: dropDistance,
    fullRows: fullRows,
    lock: lock,
    clearRows: clearRows,
  };
})();
