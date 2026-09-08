// A thrown red necktie — travels straight, defeats enemies on contact, expires after its lifetime.
Game.Projectile = function (x, y, dir) {
  var speed = Game.Physics.PROJECTILE_SPEED;
  var proj = {
    x: x, y: y, w: 20, h: 10,
    vx: speed * dir,
    dir: dir,
    life: Game.Physics.PROJECTILE_LIFETIME,
    dead: false,
    spin: 0,

    update: function (dt) {
      proj.x += proj.vx * dt;
      proj.spin += dt * 14;
      proj.life -= dt;
      if (proj.life <= 0) proj.dead = true;
    },

    draw: function (ctx, cam) {
      var sx = proj.x - cam.x + proj.w / 2;
      var sy = proj.y - cam.y + proj.h / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.sin(proj.spin) * 0.6);
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(6, -6);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 6);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    },
  };
  return proj;
};
