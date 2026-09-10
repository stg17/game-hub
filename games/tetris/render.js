// All canvas drawing for Tetris. Pure rendering: every function reads the state
// handed to it and mutates nothing, mirroring the game.js/ui.js split used in
// D.C. Romp. There are no image assets.
//
// Pieces are printed tokens, not lit plastic: one flat unmixed colour, a hard
// ink keyline, and a darker flat plate along the bottom and right for the
// token's own cut thickness. Depth here is overlap, never a gradient or a
// gloss highlight — the same rule the rest of the box follows.
var Render = (function () {
  var CELL = 30;
  var INK = '#171410';

  // Darken a #rrggbb colour toward the ink, for a token's cut edge.
  function cut(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    for (var i = 0; i < 3; i++) {
      parts[i] = Math.round(Math.max(0, Math.min(255, parts[i] * (1 - amount))));
    }
    return 'rgb(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ')';
  }

  function block(ctx, px, py, size, color, alpha) {
    var pad = size > 22 ? 1.5 : 1;
    var x = px + pad;
    var y = py + pad;
    var s = size - pad * 2;
    var a = alpha === undefined ? 1 : alpha;
    var lip = Math.max(2, s * 0.14);

    ctx.save();
    ctx.globalAlpha = a;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);

    // the token's own thickness, as a flat darker plate
    ctx.fillStyle = cut(color, 0.26);
    ctx.fillRect(x, y + s - lip, s, lip);
    ctx.fillRect(x + s - lip, y, lip, s);

    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.restore();
  }

  // A hollow block for the ghost/landing preview: the token's die-cut outline.
  function outlineBlock(ctx, px, py, size, color) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.strokeRect(px + 4, py + 4, size - 8, size - 8);
    ctx.restore();
  }

  function gridLines(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(23, 20, 16, 0.26)';
    ctx.lineWidth = 1;
    for (var c = 1; c < Board.COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, h);
      ctx.stroke();
    }
    for (var r = 1; r < Board.ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(w, r * CELL + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // view: {grid, piece, ghost, flash}
  function playfield(ctx, view) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    gridLines(ctx, w, h);

    for (var r = 0; r < Board.ROWS; r++) {
      for (var c = 0; c < Board.COLS; c++) {
        var type = view.grid[r][c];
        if (!type) continue;
        block(ctx, c * CELL, r * CELL, CELL, Tetromino.colorOf(type), 1);
      }
    }

    if (view.ghost) {
      var gcells = Tetromino.cells(view.ghost);
      for (var g = 0; g < gcells.length; g++) {
        if (gcells[g].y < 0) continue;
        outlineBlock(ctx, gcells[g].x * CELL, gcells[g].y * CELL, CELL, Tetromino.colorOf(view.ghost.type));
      }
    }

    if (view.piece) {
      var pcells = Tetromino.cells(view.piece);
      for (var p = 0; p < pcells.length; p++) {
        if (pcells[p].y < 0) continue;
        block(ctx, pcells[p].x * CELL, pcells[p].y * CELL, CELL, Tetromino.colorOf(view.piece.type), 1);
      }
    }

    /* The afterimage of a line that has already gone. By the time this draws,
       the rows have collapsed and the next piece is already falling — the band
       marks where the line was and fades, and it gates nothing. It goes on
       last, over the piece, because it is light on the plate rather than
       another thing printed on it. */
    if (view.flash && view.flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, view.flash.alpha);
      ctx.fillStyle = '#e6dcc4';
      for (var f = 0; f < view.flash.rows.length; f++) {
        ctx.fillRect(0, view.flash.rows[f] * CELL, w, CELL);
      }
      ctx.restore();
    }
  }

  // Draw a piece in its spawn orientation, centred on its own occupied bounding
  // box inside the given rect — so an I and an O both look centred.
  function centered(ctx, type, x, y, w, h, cell, alpha) {
    var st = Tetromino.state(type, 0);
    var minC = Infinity;
    var maxC = -Infinity;
    var minR = Infinity;
    var maxR = -Infinity;
    for (var i = 0; i < st.length; i++) {
      minC = Math.min(minC, st[i][0]);
      maxC = Math.max(maxC, st[i][0]);
      minR = Math.min(minR, st[i][1]);
      maxR = Math.max(maxR, st[i][1]);
    }
    var ox = x + (w - (maxC - minC + 1) * cell) / 2 - minC * cell;
    var oy = y + (h - (maxR - minR + 1) * cell) / 2 - minR * cell;
    for (var j = 0; j < st.length; j++) {
      block(ctx, ox + st[j][0] * cell, oy + st[j][1] * cell, cell, Tetromino.colorOf(type), alpha);
    }
  }

  // The first upcoming piece is drawn larger than the rest of the queue.
  function preview(ctx, types) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!types || !types.length) return;
    var slot = h / types.length;
    for (var i = 0; i < types.length; i++) {
      centered(ctx, types[i], 0, i * slot, w, slot, i === 0 ? 22 : 17, i === 0 ? 1 : 0.7);
    }
  }

  function hold(ctx, type, used) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!type) return;
    centered(ctx, type, 0, 0, w, h, 22, used ? 0.3 : 1);
  }

  return {
    CELL: CELL,
    playfield: playfield,
    preview: preview,
    hold: hold,
  };
})();
