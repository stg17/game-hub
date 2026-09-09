// Nonogram — what the box remembers.
//
// Same try/catch + in-memory-fallback shape as the other games (see
// games/math-puzzles/storage.js): blocked or full storage degrades to a
// session-only record rather than throwing.
//
// Two things are kept. Which plates are finished, with the best time for each —
// that is the collection you are filling in. And the plate currently in
// progress, cells and clock, because a large plate is twenty minutes of careful
// deduction and losing it to a stray reload would be unforgivable. 2048 keeps
// its board and its undo stack for the same reason.
window.INK = window.INK || {};
window.INK.Storage = (function () {
  'use strict';

  var KEY = 'inkbynumbers_stats_v1';

  function blank() {
    return {
      solved: { small: {}, medium: {}, large: {} },   /* plateId -> best ms */
      current: null                                    /* the plate in hand */
    };
  }

  var data = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        var out = blank();
        if (parsed && parsed.solved) {
          ['small', 'medium', 'large'].forEach(function (k) {
            var got = parsed.solved[k];
            if (!got || typeof got !== 'object') return;
            for (var id in got) {
              if (!Object.prototype.hasOwnProperty.call(got, id)) continue;
              var ms = got[id];
              if (typeof ms === 'number' && ms >= 0 && isFinite(ms)) out.solved[k][id] = ms;
            }
          });
        }
        /* A malformed in-progress blob costs nothing to discard, so it is
           validated harder than the record is: cells must be the right count
           and hold only the three legal marks. */
        var c = parsed && parsed.current;
        if (c && typeof c.size === 'string' && typeof c.plate === 'string' &&
            typeof c.cells === 'string' && /^[012]+$/.test(c.cells) &&
            typeof c.elapsed === 'number' && c.elapsed >= 0 && isFinite(c.elapsed)) {
          out.current = { size: c.size, plate: c.plate, cells: c.cells, elapsed: c.elapsed };
        }
        return out;
      }
    } catch (e) { /* unavailable or malformed — a fresh record for this session */ }
    return blank();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* ignore — the record just will not outlive the tab */ }
  }

  function get() { return data; }

  function isSolved(sizeId, plateId) {
    return Object.prototype.hasOwnProperty.call(data.solved[sizeId] || {}, plateId);
  }
  function bestFor(sizeId, plateId) {
    return isSolved(sizeId, plateId) ? data.solved[sizeId][plateId] : null;
  }
  function solvedCount(sizeId) {
    var n = 0;
    var bag = data.solved[sizeId] || {};
    for (var k in bag) if (Object.prototype.hasOwnProperty.call(bag, k)) n++;
    return n;
  }
  function totalSolved() {
    return solvedCount('small') + solvedCount('medium') + solvedCount('large');
  }

  // Returns whether this run beat the previous best (or was the first finish).
  function recordSolve(sizeId, plateId, ms) {
    if (!data.solved[sizeId]) data.solved[sizeId] = {};
    var prev = bestFor(sizeId, plateId);
    var record = (prev === null) || (ms < prev);
    if (record) data.solved[sizeId][plateId] = ms;
    data.current = null;
    save();
    return { record: record, previous: prev };
  }

  /* ── the plate in hand ────────────────────────────────────────────────── */

  // `cells` is a flat grid of marks as one string of 0/1/2, which is compact
  // enough that saving on every change is not worth debouncing.
  function keep(sizeId, plateId, cells, elapsed) {
    data.current = { size: sizeId, plate: plateId, cells: cells, elapsed: elapsed };
    save();
  }
  function resumable() { return data.current; }
  function drop() {
    data.current = null;
    save();
  }

  return {
    get: get,
    isSolved: isSolved,
    bestFor: bestFor,
    solvedCount: solvedCount,
    totalSolved: totalSolved,
    recordSolve: recordSolve,
    keep: keep,
    resumable: resumable,
    drop: drop
  };
})();
