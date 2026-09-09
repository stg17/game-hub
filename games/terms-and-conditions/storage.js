// Terms & Conditions — what the box remembers.
//
// Same try/catch + in-memory-fallback shape as the other games (see
// games/tic-tac-toe/script.js and games/math-puzzles/storage.js): blocked or
// full storage degrades to a session-only record rather than throwing.
window.TC = window.TC || {};
window.TC.Storage = (function () {
  'use strict';

  var KEY = 'terms_stats_v1';

  function blank() {
    return { bestStreak: 0, runs: 0, bestClauses: 0 };
  }

  var stats = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        /* Merge onto defaults, so a partial or older blob can never crash a
           read — the same guard math-puzzles uses. */
        var parsed = JSON.parse(raw);
        var out = blank();
        if (typeof parsed.bestStreak === 'number' && parsed.bestStreak >= 0) out.bestStreak = parsed.bestStreak;
        if (typeof parsed.runs === 'number' && parsed.runs >= 0) out.runs = parsed.runs;
        if (typeof parsed.bestClauses === 'number' && parsed.bestClauses >= 0) out.bestClauses = parsed.bestClauses;
        return out;
      }
    } catch (e) { /* unavailable or malformed — a fresh record for this session */ }
    return blank();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch (e) { /* ignore — the record just will not outlive the tab */ }
  }

  function get() { return stats; }

  // Called once when a run ends. Returns whether the run set a new record, so
  // the loss screen can say so.
  function recordRun(streak, clauses) {
    var record = streak > stats.bestStreak;
    stats.runs += 1;
    if (record) stats.bestStreak = streak;
    if (clauses > stats.bestClauses) stats.bestClauses = clauses;
    save();
    return record;
  }

  return { get: get, recordRun: recordRun };
})();
