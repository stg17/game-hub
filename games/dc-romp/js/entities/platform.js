// Static or back-and-forth moving platform.
Game.Platform = function (opts) {
  var p = {
    x: opts.x, y: opts.y, w: opts.w, h: opts.h,
    type: opts.type || 'static', // 'static' | 'moving'
    axis: opts.axis || 'x',
    baseX: opts.x, baseY: opts.y,
    range: opts.range || 0,
    speed: opts.speed || 0,
    dir: 1,
    lastDx: 0,
    lastDy: 0,
    theme: opts.theme || 'default',

    update: function (dt) {
      p.lastDx = 0;
      p.lastDy = 0;
      if (p.type !== 'moving') return;
      var delta = p.speed * p.dir * dt;
      if (p.axis === 'x') {
        p.x += delta;
        p.lastDx = delta;
        if (p.x > p.baseX + p.range) { p.x = p.baseX + p.range; p.dir = -1; }
        if (p.x < p.baseX - p.range) { p.x = p.baseX - p.range; p.dir = 1; }
      } else {
        p.y += delta;
        p.lastDy = delta;
        if (p.y > p.baseY + p.range) { p.y = p.baseY + p.range; p.dir = -1; }
        if (p.y < p.baseY - p.range) { p.y = p.baseY - p.range; p.dir = 1; }
      }
    },

    draw: function (ctx, cam) {
      var sx = p.x - cam.x;
      var sy = p.y - cam.y;
      if (sx + p.w < 0 || sx > cam.width || sy + p.h < 0 || sy > cam.height) return;
      var top = p.type === 'moving' ? '#8bd66b' : '#7cc95a';
      var bottom = p.type === 'moving' ? '#4f9c33' : '#3f8a2a';
      Game.Draw.cartoonBox(ctx, sx, sy, p.w, p.h, top, bottom, 4);
      // Dirt/stone underside strip for visual depth.
      ctx.fillStyle = 'rgba(90,60,30,0.55)';
      ctx.fillRect(sx, sy + p.h - 6, p.w, 6);
    },
  };
  return p;
};
