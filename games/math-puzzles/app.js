// Shared app shell: state machine (menu -> settings -> play -> solved), HUD,
// timer, and wiring of shared controls (New Puzzle/Hint/Check/Back) to
// whichever puzzle module is currently active via its common 4-function interface.
(function () {
  var TYPE_LABELS = { make24: 'Make 24', calcudoku: 'Calcudoku', pyramid: 'Number Pyramid' };
  var DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  var state = {
    screen: 'menu',
    type: null,
    difficulty: 'easy',
    timed: false,
    puzzleState: null,
    timerHandle: null,
    startTimeMs: null,
  };

  // Remembered per puzzle type for the session (not persisted — only stats/streaks are).
  var lastSettings = {
    make24: { difficulty: 'easy', timed: false },
    calcudoku: { difficulty: 'easy', timed: false },
    pyramid: { difficulty: 'easy', timed: false },
  };

  var el = {};

  function cacheEls() {
    el.hud = document.getElementById('hud');
    el.hudType = document.getElementById('hudType');
    el.hudDifficulty = document.getElementById('hudDifficulty');
    el.hudTimer = document.getElementById('hudTimer');
    el.hudStats = document.getElementById('hudStats');
    el.screens = {
      menu: document.getElementById('screen-menu'),
      settings: document.getElementById('screen-settings'),
      play: document.getElementById('screen-play'),
      solved: document.getElementById('screen-solved'),
    };
    el.settingsTitle = document.getElementById('settingsTitle');
    el.difficultyToggle = document.getElementById('difficultyToggle');
    el.timedToggle = document.getElementById('timedToggle');
    el.settingsStats = document.getElementById('settingsStats');
    el.settingsStartBtn = document.getElementById('settingsStartBtn');
    el.puzzleContainer = document.getElementById('puzzleContainer');
    el.playMessage = document.getElementById('playMessage');
    el.puzzleBackBtn = document.getElementById('puzzleBackBtn');
    el.playHintBtn = document.getElementById('playHintBtn');
    el.playCheckBtn = document.getElementById('playCheckBtn');
    el.playNewBtn = document.getElementById('playNewBtn');
    el.solvedDetail = document.getElementById('solvedDetail');
    el.solvedMenuBtn = document.getElementById('solvedMenuBtn');
    el.solvedNextBtn = document.getElementById('solvedNextBtn');
  }

  function showScreen(name) {
    state.screen = name;
    Object.keys(el.screens).forEach(function (key) { el.screens[key].hidden = key !== name; });
    /* The running head reports a puzzle in progress. There is not one yet on
       settings, where it drew an empty badge and a rule under the title. */
    el.hud.hidden = (name === 'menu' || name === 'settings');
    /* Once you have picked a puzzle there is always somewhere to go back to,
       and it is always in the same place. */
    el.puzzleBackBtn.hidden = (name === 'menu');
  }

  function getModule() { return window.MathPuzzles[state.type]; }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateHud() {
    el.hudType.textContent = TYPE_LABELS[state.type] || '';
    el.hudDifficulty.textContent = DIFF_LABELS[state.difficulty] || '';
    el.hudTimer.hidden = !state.timed;
    var slot = Storage.getSlot(state.type, state.difficulty);
    var text = 'Solved: ' + slot.solved + ' · Streak: ' + slot.currentStreak + ' (best ' + slot.bestStreak + ')';
    if (slot.bestTimeMs !== null) text += ' · Best time: ' + formatTime(slot.bestTimeMs);
    el.hudStats.textContent = text;
  }

  function tickTimer() {
    if (!state.timed || !state.startTimeMs) return;
    el.hudTimer.textContent = formatTime(Date.now() - state.startTimeMs);
  }

  function stopTimer() {
    if (state.timerHandle) { clearInterval(state.timerHandle); state.timerHandle = null; }
  }

  function startTimerIfNeeded() {
    stopTimer();
    if (state.timed) {
      state.startTimeMs = Date.now();
      el.hudTimer.textContent = '0:00';
      state.timerHandle = setInterval(tickTimer, 250);
    } else {
      state.startTimeMs = null;
    }
  }

  function backToMenu() {
    stopTimer();
    showScreen('menu');
  }

  function goToSettings(type) {
    state.type = type;
    var last = lastSettings[type];
    state.difficulty = last.difficulty;
    state.timed = last.timed;
    el.settingsTitle.textContent = TYPE_LABELS[type] + ' Settings';
    renderSettingsToggles();
    renderSettingsStats();
    showScreen('settings');
  }

  function renderSettingsToggles() {
    Array.prototype.forEach.call(el.difficultyToggle.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.value === state.difficulty);
    });
    Array.prototype.forEach.call(el.timedToggle.children, function (btn) {
      var isTimed = btn.dataset.value === 'timed';
      btn.classList.toggle('active', isTimed === state.timed);
    });
  }

  function renderSettingsStats() {
    var slot = Storage.getSlot(state.type, state.difficulty);
    var text = 'Solved: ' + slot.solved + ' · Best streak: ' + slot.bestStreak;
    if (slot.bestTimeMs !== null) text += ' · Best time: ' + formatTime(slot.bestTimeMs);
    el.settingsStats.textContent = text;
  }

  function setPlayMessage(text) {
    if (!text) { el.playMessage.hidden = true; return; }
    el.playMessage.textContent = text;
    el.playMessage.hidden = false;
  }

  function startPuzzle() {
    lastSettings[state.type] = { difficulty: state.difficulty, timed: state.timed };
    setPlayMessage(null);
    el.puzzleContainer.innerHTML = '<p class="puzzle-loading">Generating puzzle…</p>';
    // Defer one tick so the loading text actually paints before generation
    // (Hard Calcudoku's backtracking search can take a noticeable moment).
    setTimeout(function () {
      state.puzzleState = getModule().generate(state.difficulty);
      updateHud();
      /* Make 24 has nothing to check. render() calls onSolved the instant the
         last tile reads 24, so the button could never report a win — only
         ever "not solved yet", which the player can already see. */
      el.playCheckBtn.hidden = (state.type === 'make24');
      showScreen('play');
      startTimerIfNeeded();
      getModule().render(el.puzzleContainer, state.puzzleState, { onSolved: handleSolved });
    }, 10);
  }

  function handleSolved() {
    stopTimer();
    var elapsed = (state.timed && state.startTimeMs) ? (Date.now() - state.startTimeMs) : null;
    Storage.recordSolve(state.type, state.difficulty, state.timed, elapsed);
    updateHud();
    var slot = Storage.getSlot(state.type, state.difficulty);
    var detail = 'Streak: ' + slot.currentStreak + ' (best ' + slot.bestStreak + ')';
    if (elapsed !== null) detail += ' · Time: ' + formatTime(elapsed);
    el.solvedDetail.textContent = detail;
    showScreen('solved');
  }

  function wireEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('.type-card'), function (card) {
      card.addEventListener('click', function () { goToSettings(card.dataset.type); });
    });

    Array.prototype.forEach.call(el.difficultyToggle.children, function (btn) {
      btn.addEventListener('click', function () {
        state.difficulty = btn.dataset.value;
        renderSettingsToggles();
        renderSettingsStats();
      });
    });
    Array.prototype.forEach.call(el.timedToggle.children, function (btn) {
      btn.addEventListener('click', function () {
        state.timed = btn.dataset.value === 'timed';
        renderSettingsToggles();
      });
    });

    el.settingsStartBtn.addEventListener('click', startPuzzle);

    el.puzzleBackBtn.addEventListener('click', function () {
      Storage.recordAbandon(state.type, state.difficulty);
      backToMenu();
    });
    el.playNewBtn.addEventListener('click', function () {
      Storage.recordAbandon(state.type, state.difficulty);
      startPuzzle();
    });
    el.playHintBtn.addEventListener('click', function () {
      setPlayMessage(null);
      getModule().getHint(state.puzzleState);
    });
    el.playCheckBtn.addEventListener('click', function () {
      var result = getModule().checkSolution(state.puzzleState);
      if (result.solved) handleSolved();
      else setPlayMessage('Not solved yet — keep going!');
    });

    el.solvedMenuBtn.addEventListener('click', function () { showScreen('menu'); });
    el.solvedNextBtn.addEventListener('click', startPuzzle);
  }

  function init() {
    cacheEls();
    wireEvents();
    showScreen('menu');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
