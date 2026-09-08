// DOM rendering, input, undo history and persistence. All board maths lives in
// board.js; this file owns the tile elements and the animation timing.
//
// Tiles are persistent DOM nodes keyed by tile id (see `nodes`). A move updates
// each node's --r/--c custom properties, CSS transitions the transform, and a
// single timer fires MOVE_MS later to retire absorbed tiles, relabel the
// survivors and drop in the new tile.
(function () {
  var STORAGE_KEY = '2048_state_v1';
  var MOVE_MS = 130;      // must match the .tile transform transition in style.css
  var UNDO_LIMIT = 25;

  var boardEl = document.getElementById('board');
  var cellsEl = document.getElementById('cells');
  var tilesEl = document.getElementById('tiles');
  var scoreEl = document.getElementById('score');
  var scoreAddEl = document.getElementById('scoreAdd');
  var bestEl = document.getElementById('best');
  var undoBtn = document.getElementById('undoBtn');
  var newGameBtn = document.getElementById('newGameBtn');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlayTitle');
  var overlayTextEl = document.getElementById('overlayText');
  var overlayPrimaryBtn = document.getElementById('overlayPrimary');
  var overlayUndoBtn = document.getElementById('overlayUndo');

  var cells = Board.create();
  var nodes = {};         // tile id -> DOM element
  var history = [];       // snapshots, oldest first; the top is one undo back
  var score = 0;
  var best = 0;
  var won = false;        // 2048 has been reached at some point
  var keepPlaying = false; // the player dismissed the win screen
  var over = false;
  var busy = false;       // true while a slide is animating

  function snapshot() {
    return {
      values: Board.toValues(cells),
      score: score,
      won: won,
      keepPlaying: keepPlaying,
    };
  }

  function pushHistory() {
    history.push(snapshot());
    if (history.length > UNDO_LIMIT) history.shift();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        values: Board.toValues(cells),
        score: score,
        best: best,
        won: won,
        keepPlaying: keepPlaying,
        over: over,
        history: history,
      }));
    } catch (e) { /* localStorage unavailable — the game just won't resume next visit */ }
  }

  // Restores the board, score, best AND undo history, so undo survives a
  // reload. Anything malformed falls back to a fresh game.
  function load() {
    var saved = null;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { /* ignore — treated as no saved game */ }

    if (saved && typeof saved.best === 'number') best = saved.best;
    if (!saved || !Board.isValidValues(saved.values)) return false;

    cells = Board.fromValues(saved.values);
    score = typeof saved.score === 'number' ? saved.score : 0;
    won = !!saved.won;
    keepPlaying = !!saved.keepPlaying;
    over = !!saved.over;
    history = [];
    if (saved.history && saved.history.length) {
      for (var i = 0; i < saved.history.length; i++) {
        var snap = saved.history[i];
        if (snap && Board.isValidValues(snap.values)) {
          history.push({
            values: snap.values,
            score: typeof snap.score === 'number' ? snap.score : 0,
            won: !!snap.won,
            keepPlaying: !!snap.keepPlaying,
          });
        }
      }
    }
    return true;
  }

  function buildCells() {
    var total = Board.SIZE * Board.SIZE;
    for (var i = 0; i < total; i++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cellsEl.appendChild(cell);
    }
  }

  function setPos(el, r, c) {
    el.style.setProperty('--r', r);
    el.style.setProperty('--c', c);
  }

  function addTile(tile, isNew) {
    var el = document.createElement('div');
    el.className = 'tile tile-' + tile.value + (isNew ? ' tile-new' : '');
    el.textContent = tile.value;
    setPos(el, tile.r, tile.c);
    tilesEl.appendChild(el);
    nodes[tile.id] = el;
    return el;
  }

  // Tears down every tile element and rebuilds from `cells`. Used for a new
  // game, an undo and a restore — none of which should animate as a slide.
  function rebuild() {
    tilesEl.innerHTML = '';
    nodes = {};
    var tiles = Board.listTiles(cells);
    for (var i = 0; i < tiles.length; i++) {
      addTile(tiles[i], false);
    }
  }

  function syncUi() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    undoBtn.disabled = busy || history.length === 0;
    overlayUndoBtn.disabled = busy || history.length === 0;
  }

  function bumpScore(gained) {
    if (!gained) return;
    scoreAddEl.textContent = '+' + gained;
    scoreAddEl.classList.remove('show');
    void scoreAddEl.offsetWidth; // force reflow so the float-up replays
    scoreAddEl.classList.add('show');
  }

  function showOverlay(kind) {
    if (kind === 'win') {
      overlayTitleEl.textContent = 'You win!';
      overlayTextEl.textContent = 'You reached 2048 with ' + score + ' points.';
      overlayPrimaryBtn.textContent = 'Keep going';
      overlayEl.className = 'overlay overlay-win';
    } else {
      overlayTitleEl.textContent = 'Game over';
      overlayTextEl.textContent = 'No moves left — final score ' + score + '.';
      overlayPrimaryBtn.textContent = 'Try again';
      overlayEl.className = 'overlay overlay-over';
    }
    overlayEl.dataset.kind = kind;
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
    overlayEl.dataset.kind = '';
  }

  function checkEnd() {
    if (!won && Board.maxValue(cells) >= Board.WIN_VALUE) {
      won = true;
      if (!keepPlaying) {
        showOverlay('win');
        return;
      }
    }
    if (!Board.hasMove(cells)) {
      over = true;
      showOverlay('over');
    }
  }

  function doMove(dir) {
    if (busy || over || !overlayEl.hidden) return;

    var result = Board.move(cells, dir);
    if (!result.moved) return;

    pushHistory(); // snapshot the position BEFORE this move, for undo
    busy = true;

    // The pop/appear keyframes drive `transform` themselves, and they outlast
    // MOVE_MS — so a tile still mid-animation would jump to its new cell
    // instead of gliding. Strip those classes and flush the style change before
    // touching any position, so every tile slides from a plain base transform.
    var stale = false;
    for (var id in nodes) {
      if (nodes[id].className.indexOf('tile-new') !== -1 || nodes[id].className.indexOf('tile-merged') !== -1) {
        nodes[id].classList.remove('tile-new', 'tile-merged');
        stale = true;
      }
    }
    if (stale) void tilesEl.offsetWidth;

    // Both halves of a merge slide onto the same cell; the absorbed one is
    // pushed underneath so the surviving tile is what stays visible.
    for (var m = 0; m < result.merges.length; m++) {
      var gone = nodes[result.merges[m].absorbedId];
      if (gone) gone.style.zIndex = '1';
    }
    for (var i = 0; i < result.moves.length; i++) {
      var el = nodes[result.moves[i].id];
      if (el) setPos(el, result.moves[i].to.r, result.moves[i].to.c);
    }

    cells = result.cells;
    score += result.gained;
    if (score > best) best = score;
    syncUi();

    window.setTimeout(function () {
      for (var j = 0; j < result.merges.length; j++) {
        var merge = result.merges[j];
        var absorbed = nodes[merge.absorbedId];
        if (absorbed && absorbed.parentNode) absorbed.parentNode.removeChild(absorbed);
        delete nodes[merge.absorbedId];

        var survivor = nodes[merge.id];
        if (survivor) {
          survivor.className = 'tile tile-' + merge.value;
          survivor.textContent = merge.value;
          void survivor.offsetWidth; // force reflow so the pop replays on a re-merge
          survivor.classList.add('tile-merged');
        }
      }

      var spawned = Board.spawn(cells);
      if (spawned) addTile(spawned, true);

      busy = false;
      bumpScore(result.gained);
      checkEnd();
      save();
      syncUi();
    }, MOVE_MS);
  }

  function undo() {
    if (busy || history.length === 0) return;
    var snap = history.pop();
    cells = Board.fromValues(snap.values);
    score = snap.score;
    won = snap.won;
    keepPlaying = snap.keepPlaying;
    over = false;
    rebuild();
    hideOverlay();
    save();
    syncUi();
  }

  function newGame() {
    cells = Board.create();
    score = 0;
    history = [];
    won = false;
    keepPlaying = false;
    over = false;
    busy = false;
    Board.spawn(cells);
    Board.spawn(cells);
    rebuild();
    hideOverlay();
    save();
    syncUi();
  }

  var KEY_DIRS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down',
    h: 'left', l: 'right', k: 'up', j: 'down',
  };

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var dir = KEY_DIRS[e.key];
    if (dir) {
      e.preventDefault();
      doMove(dir);
      return;
    }
    if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
      e.preventDefault();
      undo();
    }
  });

  // Swipe: whichever axis moved further wins, past a small threshold so a tap
  // never counts as a move.
  var touchStart = null;
  boardEl.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  boardEl.addEventListener('touchmove', function (e) {
    if (touchStart) e.preventDefault(); // stop the page scrolling under the swipe
  }, { passive: false });

  boardEl.addEventListener('touchend', function (e) {
    if (!touchStart || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  });

  newGameBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  overlayUndoBtn.addEventListener('click', undo);

  overlayPrimaryBtn.addEventListener('click', function () {
    if (overlayEl.dataset.kind === 'win') {
      keepPlaying = true;
      hideOverlay();
      save();
      syncUi();
    } else {
      newGame();
    }
  });

  buildCells();
  if (load()) {
    rebuild();
    if (over) showOverlay('over');
    else if (won && !keepPlaying) showOverlay('win');
    syncUi();
  } else {
    newGame();
  }
})();
