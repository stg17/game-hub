// State machine, input, scoring and the frame loop. All input handling and
// state transitions live here; render.js only draws.
(function () {
  var STORAGE_KEY = 'tetris_best_v1';

  // Short enough that a landing reads as instant, long enough that a slide or
  // rotate you are already making still lands. A deliberate late adjustment
  // does not, which is the trade.
  var LOCK_DELAY = 0.15;       // seconds a grounded piece waits before locking
  var MAX_LOCK_RESETS = 15;    // cap on move/rotate lock-delay resets per piece
  var CLEAR_FLASH = 0.18;      // seconds the afterimage of a cleared line fades over
  var SOFT_DROP_INTERVAL = 0.03;
  var DAS_DELAY = 0.16;        // hold-to-repeat: initial pause
  var DAS_REPEAT = 0.04;       // hold-to-repeat: cadence after that
  var NEXT_COUNT = 3;
  var LINE_SCORE = [0, 100, 300, 500, 800];

  var boardCtx = document.getElementById('board').getContext('2d');
  var nextCtx = document.getElementById('next').getContext('2d');
  var holdCtx = document.getElementById('hold').getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var linesEl = document.getElementById('lines');
  var levelEl = document.getElementById('level');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayTextEl = document.getElementById('overlayText');
  var newGameBtn = document.getElementById('newGameBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var soundBtn = document.getElementById('soundBtn');

  // 'PLAYING' | 'PAUSED' | 'OVER' — the well deals a piece the moment the
  // page opens, so there is no idle state to sit in.
  var state = 'PLAYING';
  var grid = Board.create();
  var bag = Tetromino.bag();
  var piece = null;
  var holdType = null;
  var holdUsed = false;

  var score = 0;
  var lines = 0;
  var level = 1;
  var combo = -1;
  var best = loadBest();

  var gravityTimer = 0;
  var lockTimer = 0;
  var lockResets = 0;
  var grounded = false;
  var flashRows = [];
  var flashLeft = 0;

  var leftDown = false;
  var rightDown = false;
  var heldDir = 0;
  var dasTimer = 0;
  var softDropping = false;
  var audioWoken = false;

  function loadBest() {
    try {
      var n = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      if (!isNaN(n) && n >= 0) return n;
    } catch (e) { /* localStorage unavailable — best score just won't persist */ }
    return 0;
  }

  function saveBest() {
    try {
      localStorage.setItem(STORAGE_KEY, String(best));
    } catch (e) { /* ignore — the score just won't persist this session */ }
  }

  // Official guideline speed curve: each level's fall interval, floored so the
  // highest levels stay playable rather than instant.
  function dropInterval() {
    var l = Math.min(level, 20);
    return Math.max(Math.pow(0.8 - (l - 1) * 0.007, l - 1), 0.02);
  }

  function canFit(dx, dy) {
    return Board.valid(grid, {
      type: piece.type,
      rot: piece.rot,
      x: piece.x + dx,
      y: piece.y + dy,
    });
  }

  // A grounded piece gets its lock delay refreshed by any successful move or
  // rotation, but only MAX_LOCK_RESETS times — otherwise a piece could be
  // wiggled along the floor forever and never lock.
  function refreshLockDelay() {
    if (grounded && lockResets < MAX_LOCK_RESETS) {
      lockTimer = 0;
      lockResets += 1;
    }
  }

  function tryMove(dx, dy) {
    if (!canFit(dx, dy)) return false;
    piece.x += dx;
    piece.y += dy;
    refreshLockDelay();
    return true;
  }

  function tryRotate(dir) {
    var from = piece.rot;
    var to = (from + dir + 4) % 4;
    var kicks = Tetromino.kicks(piece.type, from, to);
    for (var i = 0; i < kicks.length; i++) {
      var candidate = {
        type: piece.type,
        rot: to,
        x: piece.x + kicks[i][0],
        y: piece.y + kicks[i][1],
      };
      if (Board.valid(grid, candidate)) {
        piece = candidate;
        refreshLockDelay();
        Sfx.rotate();
        return true;
      }
    }
    return false;
  }

  function spawnPiece(type) {
    piece = Tetromino.spawn(type || bag.next());
    grounded = false;
    lockTimer = 0;
    lockResets = 0;
    gravityTimer = 0;
    if (!Board.valid(grid, piece)) {
      gameOver();
      return false;
    }
    return true;
  }

  function addScore(points) {
    score += points;
    if (score > best) {
      best = score;
      saveBest();
    }
  }

  function lockPiece() {
    var result = Board.lock(grid, piece);
    piece = null;
    holdUsed = false;

    if (result.full.length > 0) {
      var previousLevel = level;
      addScore(LINE_SCORE[result.full.length] * level);
      combo += 1;
      if (combo > 0) addScore(50 * combo * level);
      lines += result.full.length;
      level = Math.floor(lines / 10) + 1;

      // Collapse the rows and spawn the next piece on this same frame. A
      // clear used to park the game in a CLEARING state for CLEAR_FLASH
      // seconds, which is the one place the board ever stopped answering —
      // now it costs exactly what a landing that clears nothing costs, which
      // is nothing. What is left of the flash is an afterimage the renderer
      // fades over a board that has already moved on; `flashLeft` is only
      // ever read by `draw`, and nothing waits on it.
      Board.clearRows(grid, result.full);
      flashRows = result.full;
      flashLeft = CLEAR_FLASH;
      Sfx.clear(result.full.length);
      if (level > previousLevel) Sfx.levelUp();
      // Top-out is not checked here for the same reason it never was: the
      // rows that just went may well have taken the offending cells with
      // them, so the honest test is whether the next piece fits, which
      // spawnPiece does.
      spawnPiece();
      syncPanel();
      return;
    }

    combo = -1;
    Sfx.lock();
    // Topping out is only fatal once a piece locks with cells above the
    // playfield; a blocked spawn is caught separately in spawnPiece.
    if (result.toppedOut) {
      gameOver();
      return;
    }
    spawnPiece();
    syncPanel();
  }

  function hardDrop() {
    var dist = Board.dropDistance(grid, piece);
    if (dist > 0) {
      piece.y += dist;
      addScore(dist * 2);
    }
    Sfx.hardDrop();
    lockPiece();
  }

  // One hold per piece: swapping again is blocked until the next lock clears
  // holdUsed, so hold can't be used to stall indefinitely.
  function holdPiece() {
    if (holdUsed) return;
    var swap = holdType;
    holdType = piece.type;
    holdUsed = true;
    if (!spawnPiece(swap || undefined)) return;
    Sfx.hold();
    syncPanel();
  }

  function gameOver() {
    state = 'OVER';
    piece = null;
    Sfx.gameOver();
    showOverlay('Game Over', 'Score ' + score + ' — press Enter to play again');
    syncPanel();
  }

  function startGame() {
    grid = Board.create();
    bag = Tetromino.bag();
    holdType = null;
    holdUsed = false;
    score = 0;
    lines = 0;
    level = 1;
    combo = -1;
    flashRows = [];
    flashLeft = 0;
    gravityTimer = 0;
    lockTimer = 0;
    lockResets = 0;
    grounded = false;
    leftDown = false;
    rightDown = false;
    heldDir = 0;
    softDropping = false;
    state = 'PLAYING';
    hideOverlay();
    spawnPiece();
    syncPanel();
  }

  function togglePause() {
    if (state === 'PLAYING') {
      state = 'PAUSED';
      heldDir = 0;
      leftDown = false;
      rightDown = false;
      softDropping = false;
      showOverlay('Paused', 'Press Escape or P to resume');
    } else if (state === 'PAUSED') {
      state = 'PLAYING';
      hideOverlay();
    }
    syncPanel();
  }

  // The AudioContext cannot be built before a gesture, and the game now deals
  // its first piece on load, so the wake-up waits for the first key or click.
  function wakeAudio() {
    if (audioWoken) return;
    audioWoken = true;
    Sfx.init();
  }

  function showOverlay(title, text) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
  }

  function syncPanel() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    linesEl.textContent = lines;
    levelEl.textContent = level;
    pauseBtn.textContent = state === 'PAUSED' ? 'Resume' : 'Pause';
    pauseBtn.disabled = state === 'OVER';
  }

  function update(dt) {
    if (state !== 'PLAYING' || !piece) return;
    /* Purely cosmetic, and deliberately ticked here rather than in draw() so a
       paused game does not quietly burn the fade off behind the overlay. */
    if (flashLeft > 0) flashLeft = Math.max(0, flashLeft - dt);

    if (heldDir !== 0) {
      dasTimer -= dt;
      while (dasTimer <= 0) {
        if (!tryMove(heldDir, 0)) {
          dasTimer = DAS_REPEAT;
          break;
        }
        dasTimer += DAS_REPEAT;
      }
    }

    var interval = softDropping ? Math.min(SOFT_DROP_INTERVAL, dropInterval()) : dropInterval();
    gravityTimer += dt;
    var steps = 0;
    while (gravityTimer >= interval && steps < 24) {
      gravityTimer -= interval;
      steps += 1;
      if (tryMove(0, 1)) {
        if (softDropping) addScore(1);
      } else {
        gravityTimer = 0;
        break;
      }
    }

    grounded = !canFit(0, 1);
    if (grounded) {
      lockTimer += dt;
      if (lockTimer >= LOCK_DELAY) lockPiece();
    } else {
      lockTimer = 0;
    }
  }

  function draw() {
    var view = {
      grid: grid,
      piece: null,
      ghost: null,
      flash: flashLeft > 0 ? { rows: flashRows, alpha: flashLeft / CLEAR_FLASH } : null,
    };
    if (piece) {
      view.piece = piece;
      if (state === 'PLAYING') {
        var dist = Board.dropDistance(grid, piece);
        if (dist > 0) {
          view.ghost = { type: piece.type, rot: piece.rot, x: piece.x, y: piece.y + dist };
        }
      }
    }
    Render.playfield(boardCtx, view);
    Render.preview(nextCtx, bag.peek(NEXT_COUNT));
    Render.hold(holdCtx, holdType, holdUsed);
  }

  var lastTime = 0;
  function frame(timestamp) {
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.25) dt = 0.25; // clamp on tab-switch/lag spikes
    if (dt > 0) update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function setHorizontal(dir) {
    if (dir !== 0 && heldDir !== dir) dasTimer = DAS_DELAY;
    heldDir = dir;
  }

  var SCROLL_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Spacebar'];

  window.addEventListener('keydown', function (e) {
    var key = e.key;
    if (SCROLL_KEYS.indexOf(key) !== -1 || key === ' ') e.preventDefault();
    wakeAudio();

    if (state === 'OVER') {
      if (key === 'Enter') startGame();
      return;
    }
    if (key === 'Escape' || key === 'p' || key === 'P') {
      togglePause();
      return;
    }
    if (state !== 'PLAYING' || !piece) return;
    if (e.repeat) return; // OS auto-repeat is ignored; DAS above does the repeating

    switch (key) {
      case 'ArrowLeft':
        leftDown = true;
        setHorizontal(-1);
        if (tryMove(-1, 0)) Sfx.move();
        break;
      case 'ArrowRight':
        rightDown = true;
        setHorizontal(1);
        if (tryMove(1, 0)) Sfx.move();
        break;
      case 'ArrowDown':
        softDropping = true;
        gravityTimer = 0;
        if (tryMove(0, 1)) addScore(1);
        break;
      case 'ArrowUp':
      case 'x':
      case 'X':
        tryRotate(1);
        break;
      case 'z':
      case 'Z':
      case 'Control':
        tryRotate(-1);
        break;
      case ' ':
        hardDrop();
        break;
      case 'c':
      case 'C':
      case 'Shift':
        holdPiece();
        break;
    }
  });

  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') {
      leftDown = false;
      setHorizontal(rightDown ? 1 : 0);
    } else if (e.key === 'ArrowRight') {
      rightDown = false;
      setHorizontal(leftDown ? -1 : 0);
    } else if (e.key === 'ArrowDown') {
      softDropping = false;
    }
  });

  // Key releases aren't delivered while the tab is unfocused, so drop every
  // held key instead of letting a piece keep sliding when the user returns.
  window.addEventListener('blur', function () {
    leftDown = false;
    rightDown = false;
    heldDir = 0;
    softDropping = false;
  });

  newGameBtn.addEventListener('click', function () {
    wakeAudio();
    startGame();
  });

  pauseBtn.addEventListener('click', function () {
    wakeAudio();
    togglePause();
  });

  soundBtn.addEventListener('click', function () {
    var muted = Sfx.setMuted(!Sfx.isMuted());
    soundBtn.textContent = muted ? 'Sound: Off' : 'Sound: On';
    soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
    if (!muted) wakeAudio();
  });

  startGame();
  requestAnimationFrame(function (t) {
    lastTime = t;
    requestAnimationFrame(frame);
  });
})();
