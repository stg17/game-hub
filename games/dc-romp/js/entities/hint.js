// Printed key prompts, stood in the level itself — the box teaching its own
// controls where each one is first needed rather than on a screen beforehand.
// Purely decorative: nothing collides with a hint, it fades up as the player
// reaches it and back down once they are past. Level data owns the wording and
// the placement; see Game.Levels.level1.
(function () {
  var PAPER = '#e6dcc4';
  var INK = '#171410';

  var CAP = 26;        // a key cap, and the row's height
  var GAP = 6;         // between caps
  var PAD = 11;        // plate padding
  var WORD_GAP = 9;    // caps row to word
  var WORD_H = 11;     // word cap-height
  var TRACK = 1.5;     // the tracking every small cap label in the box carries

  var CAP_FONT = '700 12px Slab, Georgia, serif';
  var WORD_FONT = '700 11px Slab, Georgia, serif';

  // An arrow key prints its arrow; anything else prints its own name.
  var ANGLE = { left: -Math.PI / 2, right: Math.PI / 2, up: 0, down: Math.PI };

  function trackedWidth(ctx, text, spacing) {
    var total = 0;
    for (var i = 0; i < text.length; i++) total += ctx.measureText(text[i]).width + spacing;
    return total - spacing;
  }

  function tracked(ctx, text, cx, y, spacing) {
    var x = cx - trackedWidth(ctx, text, spacing) / 2;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
  }

  // The arrow itself: head and stem, drawn rather than typed, like every other
  // mark in this box.
  function arrow(ctx, cx, cy, dir, colour) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ANGLE[dir]);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(-5.5, -0.5);
    ctx.lineTo(5.5, -0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-2, -1, 4, 7.5);
    ctx.restore();
  }

  // Measured once, the first time it is drawn, since the type has to be on the
  // page before a width means anything. The AABB follows from the same numbers.
  function layOut(ctx, keys, label) {
    var caps = [];
    var rowW = 0;
    ctx.font = CAP_FONT;
    for (var i = 0; i < keys.length; i++) {
      var isArrow = ANGLE[keys[i]] !== undefined;
      var text = isArrow ? '' : keys[i].toUpperCase();
      var w = isArrow ? CAP : Math.max(CAP, Math.ceil(trackedWidth(ctx, text, TRACK)) + 16);
      caps.push({ key: keys[i], arrow: isArrow, text: text, w: w });
      rowW += w + (i ? GAP : 0);
    }
    ctx.font = WORD_FONT;
    var wordW = trackedWidth(ctx, label.toUpperCase(), TRACK);
    return {
      caps: caps,
      rowW: rowW,
      w: Math.max(rowW, wordW) + PAD * 2,
      h: PAD * 2 + CAP + WORD_GAP + WORD_H,
    };
  }

  Game.Hint = function (opts) {
    var box = null;
    var h = {
      x: opts.x, y: opts.y, w: 90, h: 68,
      keys: opts.keys,
      label: opts.label,
      range: opts.range === undefined ? 170 : opts.range,
      alpha: 0,

      update: function (dt) {
        var p = Game.player;
        if (!p) return;
        var near = Math.abs((p.x + p.w / 2) - (h.x + h.w / 2)) < h.range;
        var step = dt * 3.5;
        if (near) h.alpha = Math.min(1, h.alpha + step);
        else h.alpha = Math.max(0, h.alpha - step);
      },

      draw: function (ctx, cam) {
        if (h.alpha <= 0.01) return;
        if (!box) {
          box = layOut(ctx, h.keys, h.label);
          h.w = box.w;
          h.h = box.h;
        }
        var sx = h.x - cam.x;
        var sy = h.y - cam.y;
        if (sx + h.w < -20 || sx > cam.width + 20) return;

        ctx.save();
        ctx.globalAlpha = h.alpha;

        // the plate: flat paper, hard ink edge, offset shadow — printed, not lit
        ctx.fillStyle = INK;
        ctx.fillRect(sx + 4, sy + 4, box.w, box.h);
        ctx.fillStyle = PAPER;
        ctx.fillRect(sx, sy, box.w, box.h);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.strokeRect(sx + 1.25, sy + 1.25, box.w - 2.5, box.h - 2.5);

        // the caps, stamped the way the set numbers are: ink chip, paper mark
        var cx = sx + (box.w - box.rowW) / 2;
        var cy = sy + PAD;
        ctx.textBaseline = 'middle';
        ctx.font = CAP_FONT;
        for (var i = 0; i < box.caps.length; i++) {
          var cap = box.caps[i];
          ctx.fillStyle = INK;
          ctx.fillRect(cx, cy, cap.w, CAP);
          if (cap.arrow) {
            arrow(ctx, cx + cap.w / 2, cy + CAP / 2, cap.key, PAPER);
          } else {
            ctx.fillStyle = PAPER;
            tracked(ctx, cap.text, cx + cap.w / 2, cy + CAP / 2 + 1, TRACK);
          }
          cx += cap.w + GAP;
        }

        ctx.font = WORD_FONT;
        ctx.fillStyle = INK;
        ctx.textBaseline = 'alphabetic';
        tracked(ctx, h.label.toUpperCase(), sx + box.w / 2, sy + PAD + CAP + WORD_GAP + WORD_H, TRACK);

        ctx.restore();
      },
    };
    return h;
  };
})();
