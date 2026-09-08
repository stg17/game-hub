// AABB collision resolution. Player velocities are set in player.update(); this module
// actually moves the player and resolves contact against platforms/enemies/etc.
Game.Collision = (function () {
  var overlap = Game.Utils.aabbOverlap;

  function resolvePlayerX(player, platforms, dt) {
    player.x += player.vx * dt;
    for (var i = 0; i < platforms.length; i++) {
      var plat = platforms[i];
      if (!overlap(player, plat)) continue;
      if (player.vx > 0) {
        player.x = plat.x - player.w;
      } else if (player.vx < 0) {
        player.x = plat.x + plat.w;
      }
      player.vx = 0;
    }
  }

  function resolvePlayerY(player, platforms, dt) {
    player.y += player.vy * dt;
    var wasStomping = player.isStomping;
    player.onGround = false;
    player.standingPlatform = null;

    for (var i = 0; i < platforms.length; i++) {
      var plat = platforms[i];
      if (!overlap(player, plat)) continue;

      // Compare against the platform's position from BEFORE its own movement
      // this frame (plat.y minus the vertical delta it just moved), not where
      // it ends up. Using the post-move position here breaks for vertically
      // moving platforms: a 1px epsilon only tolerates ~60px/s of platform
      // motion before "was I standing above it" starts failing every frame,
      // which is what made vertical movers kick the player off.
      var oldTop = plat.y - (plat.lastDy || 0);
      var oldBottom = oldTop + plat.h;

      if (player.vy >= 0 && player.prevY + player.h <= oldTop + 1) {
        // Falling (or resting) onto the platform's top surface.
        player.y = plat.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.standingPlatform = plat;
      } else if (player.vy < 0 && player.prevY >= oldBottom - 1) {
        // Hit the underside of a platform while moving up.
        player.y = plat.y + plat.h;
        player.vy = 0;
      }
    }

    if (player.onGround && player.standingPlatform && player.standingPlatform.type === 'moving') {
      player.x += player.standingPlatform.lastDx;
    }

    if (player.onGround && wasStomping) {
      player.landed();
      groundPoundImpact(player);
      Game.Audio.stomp();
    }
  }

  function groundPoundImpact(player) {
    var enemies = Game.entities.enemies;
    var cx = player.x + player.w / 2;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.state !== 'alive') continue;
      var ecx = e.x + e.w / 2;
      if (Math.abs(ecx - cx) < 55 && Math.abs(e.y - player.y) < 90) {
        e.defeat();
        Game.score += 50;
      }
    }
  }

  function handleEnemyCollisions(player, enemies) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.state !== 'alive') continue;
      if (!overlap(player, e)) continue;

      var stomped = player.vy >= 0 && (player.prevY + player.h) <= (e.y + e.h * 0.5 + 2);
      if (stomped) {
        e.defeat();
        player.vy = Game.Physics.STOMP_BOUNCE;
        player.onGround = false;
        Game.score += 50;
        Game.Audio.stomp();
      } else {
        player.takeHit(e.x + e.w / 2);
      }
    }
  }

  function handleProjectileVsEnemies(projectiles, enemies) {
    for (var i = 0; i < projectiles.length; i++) {
      var proj = projectiles[i];
      if (proj.dead) continue;
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.state !== 'alive') continue;
        if (overlap(proj, e)) {
          e.defeat();
          proj.dead = true;
          Game.score += 30;
          Game.Audio.stomp();
          break;
        }
      }
    }
  }

  function handleCollectibles(player, collectibles) {
    for (var i = 0; i < collectibles.length; i++) {
      var c = collectibles[i];
      if (c.collected) continue;
      if (overlap(player, c)) {
        c.collected = true;
        Game.score += 10;
        Game.Audio.coin();
      }
    }
  }

  function checkPit(player, killY) {
    return player.y > killY;
  }

  function checkGoal(player, goal) {
    return goal && overlap(player, goal);
  }

  return {
    resolvePlayer: function (player, platforms, dt) {
      resolvePlayerX(player, platforms, dt);
      resolvePlayerY(player, platforms, dt);
    },
    handleEnemyCollisions: handleEnemyCollisions,
    handleProjectileVsEnemies: handleProjectileVsEnemies,
    handleCollectibles: handleCollectibles,
    checkPit: checkPit,
    checkGoal: checkGoal,
  };
})();
