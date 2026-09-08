// Central state machine: owns transitions between menu/gameplay screens and
// drives the per-frame update/render dispatch. Levels are loaded from plain
// data objects in js/levels/*.js.
(function () {
  var Input = Game.Input;

  Game.init = function () {
    var saved = parseInt(localStorage.getItem('dcromp_unlocked') || '1', 10);
    Game.unlockedLevel = isNaN(saved) ? 1 : Game.Utils.clamp(saved, 1, Game.LEVEL_COUNT);
    Game.levelSelectIndex = Game.unlockedLevel;
  };

  Game.loadLevel = function (n) {
    var data = Game.Levels['level' + n];
    Game.currentLevel = data;
    Game.levelIndex = n;
    Game.levelStartScore = Game.score;
    Game.player = Game.Player(data.playerStart.x, data.playerStart.y);
    Game.entities.platforms = data.platforms.map(function (o) { return Game.Platform(o); });
    Game.entities.enemies = data.enemies.map(function (o) { return Game.Enemy(o); });
    Game.entities.collectibles = data.collectibles.map(function (o) { return Game.Collectible(o); });
    Game.entities.projectiles = [];
    Game.entities.goal = Game.Goal(data.goal.x, data.goal.y);
    Game.Camera.reset();
    Game.Camera.follow(Game.player, data.width, data.height);
  };

  Game.startNewRun = function (fromLevel) {
    Game.lives = 3;
    Game.score = 0;
    Game.loadLevel(fromLevel || 1);
    Game.state = 'PLAYING';
  };

  function respawnPlayer() {
    var level = Game.currentLevel;
    var p = Game.player;
    p.x = level.playerStart.x;
    p.y = level.playerStart.y;
    p.vx = 0;
    p.vy = 0;
    p.isStomping = false;
    p.invulnTimer = Game.Physics.INVULN_DURATION;
  }

  // Returns the id of whatever UI hit-region the mouse just clicked (if any),
  // testing against the rects Game.UI registered on the previous render pass.
  function getClickedId() {
    if (!Input.mouseClicked()) return null;
    var m = Input.getMousePos();
    var regions = Game.UI.hitRegions;
    for (var i = regions.length - 1; i >= 0; i--) {
      var r = regions[i];
      if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) return r.id;
    }
    return null;
  }

  function activateMenuOption(i) {
    Game.Audio.init();
    switch (i) {
      case 0: Game.startNewRun(1); break;
      case 1: Game.levelSelectIndex = Game.unlockedLevel; Game.state = 'LEVEL_SELECT'; break;
      case 2: Game.state = 'HOWTO'; break;
      case 3: Game.muted = !Game.muted; break;
    }
  }

  function updateMenu(clickedId) {
    var n = Game.MenuOptions.length;
    if (Input.wasPressed('ArrowUp')) Game.menuIndex = (Game.menuIndex - 1 + n) % n;
    if (Input.wasPressed('ArrowDown')) Game.menuIndex = (Game.menuIndex + 1) % n;
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      activateMenuOption(Game.menuIndex);
    }
    if (clickedId && clickedId.indexOf('menu-') === 0) {
      activateMenuOption(parseInt(clickedId.slice(5), 10));
    }
  }

  function updateHowTo(clickedId) {
    if (Input.wasPressed('Escape') || Input.wasPressed('Backspace') || Input.wasPressed('Enter') || clickedId === 'howto-back') {
      Game.state = 'MENU';
    }
  }

  function beginLevel(n) {
    if (n <= Game.unlockedLevel) {
      Game.Audio.init();
      Game.startNewRun(n);
    }
  }

  function updateLevelSelect(clickedId) {
    if (Input.wasPressed('ArrowLeft')) Game.levelSelectIndex = Math.max(1, Game.levelSelectIndex - 1);
    if (Input.wasPressed('ArrowRight')) Game.levelSelectIndex = Math.min(Game.LEVEL_COUNT, Game.levelSelectIndex + 1);
    if (Input.wasPressed('Escape') || Input.wasPressed('Backspace') || clickedId === 'levelselect-back') {
      Game.state = 'MENU';
      return;
    }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      beginLevel(Game.levelSelectIndex);
    }
    if (clickedId && clickedId.indexOf('level-') === 0) {
      var n = parseInt(clickedId.slice(6), 10);
      Game.levelSelectIndex = n;
      beginLevel(n);
    }
  }

  function updatePlaying(dt) {
    if (Input.wasPressed('Escape') || Input.wasPressed('p') || Input.wasPressed('P')) {
      Game.state = 'PAUSED';
      Game.pauseIndex = 0;
      return;
    }

    var level = Game.currentLevel;
    var ents = Game.entities;

    Game.player.update(dt);
    ents.platforms.forEach(function (p) { p.update(dt); });
    ents.enemies.forEach(function (e) { e.update(dt); });
    ents.collectibles.forEach(function (c) { c.update(dt); });
    ents.projectiles.forEach(function (pr) { pr.update(dt); });
    ents.goal.update(dt);

    Game.Collision.resolvePlayer(Game.player, ents.platforms, dt);
    Game.Collision.handleEnemyCollisions(Game.player, ents.enemies);
    Game.Collision.handleProjectileVsEnemies(ents.projectiles, ents.enemies);
    Game.Collision.handleCollectibles(Game.player, ents.collectibles);

    ents.enemies = ents.enemies.filter(function (e) { return !e.dead; });
    ents.projectiles = ents.projectiles.filter(function (pr) {
      return !pr.dead && pr.x > -50 && pr.x < level.width + 50;
    });

    if (Game.Collision.checkPit(Game.player, level.killY)) {
      Game.lives -= 1;
      Game.Audio.hit();
      respawnPlayer();
    }

    if (Game.lives <= 0) {
      Game.state = 'GAME_OVER';
      return;
    }

    if (Game.Collision.checkGoal(Game.player, ents.goal)) {
      Game.Audio.goal();
      if (Game.levelIndex < Game.LEVEL_COUNT && Game.levelIndex + 1 > Game.unlockedLevel) {
        Game.unlockedLevel = Game.levelIndex + 1;
        localStorage.setItem('dcromp_unlocked', String(Game.unlockedLevel));
      }
      Game.state = 'LEVEL_COMPLETE';
      return;
    }

    Game.Camera.follow(Game.player, level.width, level.height);
  }

  function activatePauseOption(i) {
    switch (i) {
      case 0: // Resume
        Game.state = 'PLAYING';
        break;
      case 1: // Restart Level — fresh lives, score rolled back to what it was when the level began
        Game.score = Game.levelStartScore;
        Game.lives = 3;
        Game.loadLevel(Game.levelIndex);
        Game.state = 'PLAYING';
        break;
      case 2: // Quit to Menu
        Game.state = 'MENU';
        break;
    }
  }

  function updatePaused(clickedId) {
    var n = Game.PauseOptions.length;
    if (Input.wasPressed('ArrowUp')) Game.pauseIndex = (Game.pauseIndex - 1 + n) % n;
    if (Input.wasPressed('ArrowDown')) Game.pauseIndex = (Game.pauseIndex + 1) % n;
    if (Input.wasPressed('Escape') || Input.wasPressed('p') || Input.wasPressed('P')) {
      Game.state = 'PLAYING';
      return;
    }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      activatePauseOption(Game.pauseIndex);
    }
    if (clickedId && clickedId.indexOf('pause-') === 0) {
      activatePauseOption(parseInt(clickedId.slice(6), 10));
    }
  }

  function advanceAfterLevelComplete() {
    if (Game.levelIndex < Game.LEVEL_COUNT) {
      Game.loadLevel(Game.levelIndex + 1);
      Game.state = 'PLAYING';
    } else {
      Game.state = 'WIN';
    }
  }

  function updateLevelComplete(clickedId) {
    if (Input.wasPressed('Enter') || Input.wasPressed('Space') || clickedId === 'levelcomplete-continue') {
      advanceAfterLevelComplete();
    }
  }

  function updateGameOver(clickedId) {
    if (Input.wasPressed('Enter') || clickedId === 'gameover-menu') Game.state = 'MENU';
  }

  function updateWin(clickedId) {
    if (Input.wasPressed('Enter') || clickedId === 'win-menu') Game.state = 'MENU';
  }

  function renderWorld(ctx) {
    var level = Game.currentLevel;
    var cam = Game.Camera;
    Game.Background.draw(ctx, cam, level.theme, level.width);
    Game.entities.platforms.forEach(function (p) { p.draw(ctx, cam); });
    Game.entities.collectibles.forEach(function (c) { c.draw(ctx, cam); });
    Game.entities.goal.draw(ctx, cam);
    Game.entities.enemies.forEach(function (e) { e.draw(ctx, cam); });
    Game.entities.projectiles.forEach(function (pr) { pr.draw(ctx, cam); });
    Game.player.draw(ctx, cam);
  }

  Game.update = function (dt) {
    if (Input.wasPressed('m') || Input.wasPressed('M')) {
      Game.muted = !Game.muted;
    }
    var clickedId = getClickedId();
    switch (Game.state) {
      case 'MENU': updateMenu(clickedId); break;
      case 'HOWTO': updateHowTo(clickedId); break;
      case 'LEVEL_SELECT': updateLevelSelect(clickedId); break;
      case 'PLAYING': updatePlaying(dt); break;
      case 'PAUSED': updatePaused(clickedId); break;
      case 'LEVEL_COMPLETE': updateLevelComplete(clickedId); break;
      case 'GAME_OVER': updateGameOver(clickedId); break;
      case 'WIN': updateWin(clickedId); break;
    }
  };

  Game.render = function (ctx) {
    ctx.clearRect(0, 0, Game.Canvas.WIDTH, Game.Canvas.HEIGHT);
    Game.UI.clearHits();
    switch (Game.state) {
      case 'MENU': Game.UI.drawMenu(ctx, Game.menuIndex); break;
      case 'HOWTO': Game.UI.drawHowTo(ctx); break;
      case 'LEVEL_SELECT': Game.UI.drawLevelSelect(ctx, Game.unlockedLevel, Game.levelSelectIndex, Game.LEVEL_COUNT); break;
      case 'PLAYING': renderWorld(ctx); Game.UI.drawHUD(ctx, Game.LEVEL_COUNT); break;
      case 'PAUSED': renderWorld(ctx); Game.UI.drawHUD(ctx, Game.LEVEL_COUNT); Game.UI.drawPauseOverlay(ctx, Game.pauseIndex); break;
      case 'LEVEL_COMPLETE': renderWorld(ctx); Game.UI.drawHUD(ctx, Game.LEVEL_COUNT); Game.UI.drawLevelComplete(ctx); break;
      case 'GAME_OVER': renderWorld(ctx); Game.UI.drawGameOver(ctx); break;
      case 'WIN': Game.UI.drawWin(ctx); break;
    }
  };
})();
