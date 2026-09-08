// localStorage load/save for cross-puzzle stats, mirroring the tic-tac-toe
// try/catch + in-memory-fallback pattern (games/tic-tac-toe/script.js).
var Storage = (function () {
  var STORAGE_KEY = 'mathpuzzles_stats_v1';

  function blankSlot() {
    return { solved: 0, currentStreak: 0, bestStreak: 0, bestTimeMs: null };
  }

  function perDifficulty() {
    return { easy: blankSlot(), medium: blankSlot(), hard: blankSlot() };
  }

  function defaultStats() {
    return { make24: perDifficulty(), calcudoku: perDifficulty(), pyramid: perDifficulty() };
  }

  var stats = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Merge onto defaults so a schema change or partial blob never crashes.
        var defaults = defaultStats();
        ['make24', 'calcudoku', 'pyramid'].forEach(function (type) {
          ['easy', 'medium', 'hard'].forEach(function (diff) {
            if (parsed[type] && parsed[type][diff]) {
              defaults[type][diff] = Object.assign(blankSlot(), parsed[type][diff]);
            }
          });
        });
        return defaults;
      }
    } catch (e) { /* localStorage unavailable — fall back to in-memory stats */ }
    return defaultStats();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) { /* ignore — stats just won't persist this session */ }
  }

  function getSlot(type, difficulty) {
    return stats[type][difficulty];
  }

  function recordSolve(type, difficulty, timed, elapsedMs) {
    var slot = stats[type][difficulty];
    slot.solved += 1;
    slot.currentStreak += 1;
    if (slot.currentStreak > slot.bestStreak) slot.bestStreak = slot.currentStreak;
    if (timed && (slot.bestTimeMs === null || elapsedMs < slot.bestTimeMs)) {
      slot.bestTimeMs = elapsedMs;
    }
    save();
    return slot;
  }

  function recordAbandon(type, difficulty) {
    var slot = stats[type][difficulty];
    slot.currentStreak = 0;
    save();
    return slot;
  }

  return {
    getSlot: getSlot,
    recordSolve: recordSolve,
    recordAbandon: recordAbandon,
  };
})();
