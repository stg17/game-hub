// End-of-level flagpole.
Game.Goal = function (x, y) {
  var g = {
    x: x, y: y, w: 24, h: 120,
    wave: 0,

    update: function (dt) {
      g.wave += dt * 4;
    },

    draw: function (ctx, cam) {
      var sx = g.x - cam.x;
      var sy = g.y - cam.y;
      // Pole
      var poleGrad = ctx.createLinearGradient(sx, sy, sx + 8, sy);
      poleGrad.addColorStop(0, '#e8e8e8');
      poleGrad.addColorStop(1, '#9a9a9a');
      ctx.fillStyle = poleGrad;
      ctx.fillRect(sx + 8, sy, 6, g.h);
      // Flag
      var flap = Math.sin(g.wave) * 6;
      ctx.fillStyle = '#3b6fd1';
      ctx.beginPath();
      ctx.moveTo(sx + 14, sy + 6);
      ctx.lineTo(sx + 14 + 34 + flap, sy + 16);
      ctx.lineTo(sx + 14, sy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,40,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Star
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx + 22, sy + 16, 3, 0, Math.PI * 2);
      ctx.fill();
      // Base
      Game.Draw.groundShadow(ctx, sx + 11, sy + g.h + 4, 30, 0.3);
    },
  };
  return g;
};
