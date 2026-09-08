Game.Utils = {
  clamp: function (v, min, max) {
    return Math.max(min, Math.min(max, v));
  },
  lerp: function (a, b, t) {
    return a + (b - a) * t;
  },
  aabbOverlap: function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  },
  rand: function (min, max) {
    return Math.random() * (max - min) + min;
  },
  randInt: function (min, max) {
    return Math.floor(Game.Utils.rand(min, max + 1));
  },
  choice: function (arr) {
    return arr[Game.Utils.randInt(0, arr.length - 1)];
  },
};

// Shared cartoon-style rendering helpers reused by entities, background, and UI.
Game.Draw = {
  roundRectPath: function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // Rounded gradient box with a highlight + dark outline — the base "cartoon panel" look
  // reused for platforms, UI buttons, and speech bubbles.
  cartoonBox: function (ctx, x, y, w, h, colorTop, colorBottom, radius) {
    var r = radius === undefined ? 8 : radius;
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);
    Game.Draw.roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20,20,30,0.6)';
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    Game.Draw.roundRectPath(ctx, x + w * 0.08, y + h * 0.08, w * 0.4, h * 0.25, radius ? radius * 0.5 : 4);
    ctx.fill();
    ctx.restore();
  },

  // Flattened ellipse shadow beneath a character/enemy, fading with airborne height.
  groundShadow: function (ctx, cx, groundY, width, alpha) {
    ctx.save();
    ctx.globalAlpha = Game.Utils.clamp(alpha, 0, 0.45);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, groundY, width / 2, width / 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // A glossy highlight ellipse to fake specular lighting on a rounded cartoon shape.
  highlight: function (ctx, cx, cy, rx, ry, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.35 : alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};
