// Enemy types: 'goon' (ground patrol suit), 'drone' (hovering paparazzi camera-drone),
// 'turkey' (ground patrol waddler). All share stomp/side-hit/projectile-hit handling in collision.js.
Game.Enemy = function (opts) {
  var w = opts.type === 'drone' ? 30 : 28;
  var h = opts.type === 'drone' ? 22 : 32;
  var e = {
    type: opts.type,
    x: opts.x, y: opts.y, w: w, h: h,
    baseX: opts.x, baseY: opts.y,
    range: opts.patrolRange !== undefined ? opts.patrolRange : 80,
    speed: opts.type === 'turkey' ? 70 : (opts.type === 'drone' ? 60 : 50),
    dir: -1,
    state: 'alive', // 'alive' | 'defeated'
    squishTimer: 0,
    animT: Math.random() * Math.PI * 2,
    dead: false,

    update: function (dt) {
      e.animT += dt * 6;
      if (e.state === 'defeated') {
        e.squishTimer -= dt;
        if (e.squishTimer <= 0) e.dead = true;
        return;
      }
      e.x += e.dir * e.speed * dt;
      if (e.x > e.baseX + e.range) { e.x = e.baseX + e.range; e.dir = -1; }
      if (e.x < e.baseX - e.range) { e.x = e.baseX - e.range; e.dir = 1; }
      if (e.type === 'drone') {
        e.y = e.baseY + Math.sin(e.animT * 0.7) * 14;
      }
    },

    defeat: function () {
      if (e.state === 'defeated') return;
      e.state = 'defeated';
      e.squishTimer = 0.35;
    },

    draw: function (ctx, cam) {
      var sx = e.x - cam.x;
      var sy = e.y - cam.y;
      if (sx + e.w < -20 || sx > cam.width + 20) return;

      ctx.save();
      if (e.state === 'defeated') {
        ctx.translate(sx + e.w / 2, sy + e.h);
        ctx.scale(1.3, 0.25);
        ctx.translate(-(sx + e.w / 2), -(sy + e.h));
      }

      if (e.type === 'goon') {
        drawGoon(ctx, sx, sy, e);
      } else if (e.type === 'drone') {
        drawDrone(ctx, sx, sy, e);
      } else {
        drawTurkey(ctx, sx, sy, e);
      }
      ctx.restore();

      if (e.state !== 'defeated' && e.type !== 'drone') {
        Game.Draw.groundShadow(ctx, sx + e.w / 2, sy + e.h + 2, e.w * 0.9, 0.3);
      }
    },
  };

  function drawGoon(ctx, sx, sy, e) {
    var waddle = Math.sin(e.animT) * 4;
    var grad = ctx.createLinearGradient(sx, sy, sx, sy + e.h);
    grad.addColorStop(0, '#3a3f52');
    grad.addColorStop(1, '#20232f');
    Game.Draw.roundRectPath(ctx, sx + 2, sy + 6, e.w - 4, e.h - 6, 6);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // legs
    ctx.fillStyle = '#111';
    ctx.fillRect(sx + 4 + waddle, sy + e.h - 2, 6, 6);
    ctx.fillRect(sx + e.w - 10 - waddle, sy + e.h - 2, 6, 6);
    // head
    ctx.beginPath();
    ctx.arc(sx + e.w / 2, sy + 4, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#e8b98a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
    Game.Draw.highlight(ctx, sx + e.w / 2 - 3, sy + 1, 3, 2, 0.4);
    // scowl
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(sx + e.w / 2 - 4, sy + 6);
    ctx.lineTo(sx + e.w / 2 + 4, sy + 6);
    ctx.stroke();
  }

  function drawDrone(ctx, sx, sy, e) {
    var grad = ctx.createLinearGradient(sx, sy, sx, sy + e.h);
    grad.addColorStop(0, '#5b5f66');
    grad.addColorStop(1, '#2c2f33');
    ctx.beginPath();
    ctx.ellipse(sx + e.w / 2, sy + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    Game.Draw.highlight(ctx, sx + e.w / 2 - 5, sy + e.h / 2 - 4, 5, 3, 0.3);
    // lens
    ctx.beginPath();
    ctx.arc(sx + e.w / 2, sy + e.h / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e63946';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + e.w / 2 - 1.5, sy + e.h / 2 - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // propeller blur
    var blade = Math.sin(e.animT * 3) * 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy + 2 + blade);
    ctx.lineTo(sx + 4, sy + 2 - blade);
    ctx.moveTo(sx + e.w - 4, sy + 2 - blade);
    ctx.lineTo(sx + e.w + 4, sy + 2 + blade);
    ctx.stroke();
  }

  function drawTurkey(ctx, sx, sy, e) {
    var waddle = Math.sin(e.animT * 1.4) * 3;
    // tail fan
    ctx.fillStyle = '#8b5a2b';
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(sx + 4, sy + e.h / 2 + i * 3, 8, 3, i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    // body
    var grad = ctx.createLinearGradient(sx, sy, sx, sy + e.h);
    grad.addColorStop(0, '#a9713a');
    grad.addColorStop(1, '#6e4420');
    ctx.beginPath();
    ctx.ellipse(sx + e.w / 2 + 2, sy + e.h / 2 + 4, e.w / 2, e.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
    Game.Draw.highlight(ctx, sx + e.w / 2, sy + e.h / 2, 4, 3, 0.3);
    // head/wattle
    ctx.beginPath();
    ctx.arc(sx + e.w - 2, sy + 6 + waddle * 0.3, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3f2e1c';
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(sx + e.w - 2, sy + 10 + waddle * 0.3);
    ctx.lineTo(sx + e.w - 4, sy + 15 + waddle * 0.3);
    ctx.lineTo(sx + e.w, sy + 15 + waddle * 0.3);
    ctx.closePath();
    ctx.fill();
    // legs
    ctx.fillStyle = '#d68a2c';
    ctx.fillRect(sx + 6 + waddle, sy + e.h - 2, 4, 6);
    ctx.fillRect(sx + e.w - 10 - waddle, sy + e.h - 2, 4, 6);
  }

  return e;
};
