// The playable character: a small, cartoonish caricature (swoop hair, navy suit, red tie).
// Physics velocities are updated here; actual position movement + collision resolution
// happens in collision.js so ground/wall contact can be resolved per-axis.
Game.Player = function (x, y) {
  var Phys = Game.Physics;
  var p = {
    x: x, y: y, w: 26, h: 40,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    isRunning: false,
    isStomping: false,
    invulnTimer: 0,
    animTimer: 0,
    gagTimer: 0,
    gagText: '',
    standingPlatform: null,
    prevX: x, prevY: y,

    update: function (dt) {
      p.prevX = p.x;
      p.prevY = p.y;

      var dir = 0;
      if (Game.Input.isDown('ArrowLeft')) dir -= 1;
      if (Game.Input.isDown('ArrowRight')) dir += 1;
      p.isRunning = Game.Input.isDown('Shift');

      var targetSpeed = dir * (p.isRunning ? Phys.RUN_SPEED : Phys.WALK_SPEED);
      var accel = p.onGround ? Phys.ACCEL : Phys.AIR_ACCEL;

      if (dir !== 0) {
        if (p.vx < targetSpeed) p.vx = Math.min(p.vx + accel * dt, targetSpeed);
        else if (p.vx > targetSpeed) p.vx = Math.max(p.vx - accel * dt, targetSpeed);
        p.facing = dir;
      } else if (p.onGround) {
        if (p.vx > 0) p.vx = Math.max(0, p.vx - Phys.FRICTION * dt);
        else if (p.vx < 0) p.vx = Math.min(0, p.vx + Phys.FRICTION * dt);
      }

      var jumpPressed = Game.Input.wasPressed('ArrowUp') || Game.Input.wasPressed('Space');
      var jumpReleased = Game.Input.wasReleased('ArrowUp') || Game.Input.wasReleased('Space');

      if (jumpPressed && p.onGround) {
        p.vy = Phys.JUMP_VELOCITY;
        p.onGround = false;
        p.isStomping = false;
        Game.Audio.jump();
      }
      if (jumpReleased && p.vy < 0) {
        p.vy *= Phys.JUMP_CUT_MULTIPLIER;
      }

      if (Game.Input.wasPressed('ArrowDown') && !p.onGround && !p.isStomping) {
        p.isStomping = true;
      }

      if (p.isStomping) {
        p.vy = Phys.GROUND_POUND_SPEED;
      } else {
        p.vy += Phys.GRAVITY * dt;
        if (p.vy > Phys.MAX_FALL_SPEED) p.vy = Phys.MAX_FALL_SPEED;
      }

      var throwPressed = Game.Input.wasPressed('x') || Game.Input.wasPressed('X') || Game.Input.wasPressed('Control');
      if (throwPressed) {
        var proj = Game.Projectile(p.x + (p.facing > 0 ? p.w : -20), p.y + p.h * 0.35, p.facing);
        Game.entities.projectiles.push(proj);
        Game.Audio.throwProjectile();
      }

      // Text-only gag: no speech synthesis, since a generic browser voice
      // wouldn't sound like the character and a fake "impersonation" voice isn't
      // something this game does. The speech bubble carries the joke instead.
      var gagPressed = Game.Input.wasPressed('q') || Game.Input.wasPressed('Q');
      if (gagPressed) {
        p.gagText = Game.Utils.choice(Game.Catchphrases);
        p.gagTimer = 2.5;
      }
      if (p.gagTimer > 0) p.gagTimer -= dt;

      if (p.invulnTimer > 0) p.invulnTimer -= dt;

      var moving = dir !== 0 && p.onGround;
      var animSpeed = p.isRunning ? 16 : 9;
      p.animTimer += dt * (moving ? animSpeed : (p.onGround ? 2 : 0));
    },

    landed: function () {
      p.isStomping = false;
    },

    takeHit: function (fromX) {
      if (p.invulnTimer > 0) return;
      Game.lives -= 1;
      p.invulnTimer = Phys.INVULN_DURATION;
      var away = p.x + p.w / 2 < fromX ? -1 : 1;
      p.vx = away * Phys.KNOCKBACK_SPEED;
      p.vy = Phys.JUMP_VELOCITY * 0.5;
      p.onGround = false;
      Game.Audio.hit();
    },

    draw: function (ctx, cam) {
      var sx = p.x - cam.x;
      var sy = p.y - cam.y;
      var flicker = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 12) % 2 === 0;
      if (flicker) return;

      Game.Draw.groundShadow(ctx, sx + p.w / 2, sy + p.h + 2, p.w * (p.onGround ? 1.1 : 0.7), p.onGround ? 0.35 : 0.15);

      ctx.save();
      ctx.translate(sx + p.w / 2, sy + p.h);

      var squashX = 1, squashY = 1;
      if (p.isStomping) { squashX = 1.25; squashY = 0.8; }
      else if (!p.onGround) { squashX = 0.92; squashY = 1.08; }
      ctx.scale(squashX, squashY);
      ctx.translate(-(p.w / 2), -(p.h));

      var legSwing = p.onGround ? Math.sin(p.animTimer) * (p.isRunning ? 14 : 9) : 0;
      var armSwing = p.onGround ? Math.sin(p.animTimer + Math.PI) * (p.isRunning ? 12 : 8) : -18;

      // Legs
      ctx.fillStyle = '#1c2233';
      ctx.save();
      ctx.translate(p.w * 0.35, p.h - 12);
      ctx.rotate((legSwing / 90) * (!p.onGround ? 0.3 : 1));
      ctx.fillRect(-4, 0, 8, 14);
      ctx.restore();
      ctx.save();
      ctx.translate(p.w * 0.65, p.h - 12);
      ctx.rotate((-legSwing / 90) * (!p.onGround ? 0.3 : 1));
      ctx.fillRect(-4, 0, 8, 14);
      ctx.restore();

      // Arms (behind body, drawn first on far side then near side after body for layering simplicity)
      ctx.fillStyle = '#28304a';
      ctx.save();
      ctx.translate(p.w * 0.18, p.h * 0.42);
      ctx.rotate((armSwing / 90) * (p.isStomping ? -1.4 : 1));
      ctx.fillRect(-3, 0, 6, 16);
      ctx.restore();

      // Body (suit) with cartoon shading
      var bodyGrad = ctx.createLinearGradient(0, p.h * 0.25, p.w, p.h * 0.9);
      bodyGrad.addColorStop(0, '#2e3a63');
      bodyGrad.addColorStop(1, '#161c30');
      Game.Draw.roundRectPath(ctx, p.w * 0.12, p.h * 0.28, p.w * 0.76, p.h * 0.55, 6);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(10,10,20,0.7)';
      ctx.stroke();
      Game.Draw.highlight(ctx, p.w * 0.28, p.h * 0.38, 4, 6, 0.25);

      // Tie
      var tieSway = Math.sin(p.animTimer * 0.5) * 2;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(p.w / 2 - 3, p.h * 0.3);
      ctx.lineTo(p.w / 2 + 3, p.h * 0.3);
      ctx.lineTo(p.w / 2 + 4 + tieSway, p.h * 0.62);
      ctx.lineTo(p.w / 2, p.h * 0.7);
      ctx.lineTo(p.w / 2 - 4 + tieSway, p.h * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Far arm (front layer)
      ctx.fillStyle = '#222a45';
      ctx.save();
      ctx.translate(p.w * 0.82, p.h * 0.42);
      ctx.rotate((-armSwing / 90) * (p.isStomping ? -1.4 : 1));
      ctx.fillRect(-3, 0, 6, 16);
      ctx.restore();

      // Head
      var headCx = p.w / 2;
      var headCy = p.h * 0.14;
      var headR = p.w * 0.32;
      var skinGrad = ctx.createRadialGradient(headCx - 4, headCy - 4, 2, headCx, headCy, headR);
      skinGrad.addColorStop(0, '#ffd9a8');
      skinGrad.addColorStop(1, '#e8ab6e');
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
      ctx.fillStyle = skinGrad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(80,40,10,0.5)';
      ctx.stroke();
      Game.Draw.highlight(ctx, headCx - headR * 0.4, headCy - headR * 0.4, 3, 2, 0.4);

      // Hair swoosh (exaggerated caricature feature)
      var hairGrad = ctx.createLinearGradient(headCx - headR, headCy - headR, headCx + headR, headCy);
      hairGrad.addColorStop(0, '#f4d35e');
      hairGrad.addColorStop(1, '#d4a017');
      ctx.beginPath();
      ctx.moveTo(headCx - headR * 1.05, headCy - headR * 0.2);
      ctx.quadraticCurveTo(headCx - headR * 0.3, headCy - headR * 1.8, headCx + headR * 0.9, headCy - headR * 0.9);
      ctx.quadraticCurveTo(headCx + headR * 0.3, headCy - headR * 0.9, headCx + headR * 0.5, headCy - headR * 0.3);
      ctx.quadraticCurveTo(headCx, headCy - headR * 0.7, headCx - headR * 0.8, headCy - headR * 0.15);
      ctx.closePath();
      ctx.fillStyle = hairGrad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(120,80,10,0.6)';
      ctx.stroke();

      // Face: eyes + mouth (expression changes slightly when airborne / gagging)
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(headCx - headR * 0.35, headCy + headR * 0.05, 1.6, 0, Math.PI * 2);
      ctx.arc(headCx + headR * 0.35, headCy + headR * 0.05, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a3d1e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (!p.onGround) {
        ctx.arc(headCx, headCy + headR * 0.45, 3, 0, Math.PI);
      } else if (p.gagTimer > 0) {
        ctx.moveTo(headCx - 4, headCy + headR * 0.4);
        ctx.lineTo(headCx + 4, headCy + headR * 0.4);
      } else {
        ctx.arc(headCx, headCy + headR * 0.3, 3, 0.15 * Math.PI, 0.85 * Math.PI);
      }
      ctx.stroke();

      ctx.restore(); // end squash transform

      // Speech bubble gag caption (drawn in screen space above the head, outside squash transform).
      if (p.gagTimer > 0) {
        drawSpeechBubble(ctx, sx + p.w / 2, sy - 14, p.gagText);
      }
    },
  };

  function drawSpeechBubble(ctx, cx, bottomY, text) {
    ctx.save();
    ctx.font = '13px sans-serif';
    var maxWidth = 220;
    var words = text.split(' ');
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    var lineHeight = 16;
    var boxW = maxWidth + 20;
    var boxH = lines.length * lineHeight + 16;
    var boxX = Game.Utils.clamp(cx - boxW / 2, 4, Game.Canvas.WIDTH - boxW - 4);
    var boxY = bottomY - boxH;

    Game.Draw.cartoonBox(ctx, boxX, boxY, boxW, boxH, '#ffffff', '#f0f0f0', 10);

    // tail
    ctx.beginPath();
    ctx.moveTo(cx - 6, boxY + boxH - 2);
    ctx.lineTo(cx + 6, boxY + boxH - 2);
    ctx.lineTo(cx, boxY + boxH + 10);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,30,0.6)';
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], boxX + boxW / 2, boxY + 8 + j * lineHeight);
    }
    ctx.restore();
  }

  return p;
};
