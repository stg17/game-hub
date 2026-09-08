// Gold coin — bobs in place, collected on player overlap.
Game.Collectible = function (opts) {
  var c = {
    x: opts.x, y: opts.y, w: 18, h: 18,
    baseY: opts.y,
    t: Math.random() * Math.PI * 2,
    collected: false,

    update: function (dt) {
      c.t += dt * 3;
      c.y = c.baseY + Math.sin(c.t) * 4;
    },

    draw: function (ctx, cam) {
      if (c.collected) return;
      var sx = c.x - cam.x + c.w / 2;
      var sy = c.y - cam.y + c.h / 2;
      if (sx < -20 || sx > cam.width + 20) return;
      var squash = Math.abs(Math.cos(c.t * 0.6));
      var rx = (c.w / 2) * (0.4 + 0.6 * squash);

      var grad = ctx.createLinearGradient(sx - rx, sy - c.h / 2, sx + rx, sy + c.h / 2);
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.5, '#ffd23f');
      grad.addColorStop(1, '#c8931a');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(90,60,10,0.7)';
      ctx.stroke();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = 'rgba(120,80,10,0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', sx, sy + 1);
      ctx.restore();
    },
  };
  return c;
};
