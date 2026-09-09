// Terms & Conditions — the round generator.
//
// Pure, like clauses.js: no DOM, no timers, and an injectable RNG so the
// self-check can drive it deterministically.
//
// Two jobs. First, never deal an unanswerable round: a round is built, resolved
// and then rejected unless it has exactly one defensible answer. That is the
// same rejection-sampling shape make24.js uses for its difficulty buckets and
// calcudoku.js uses for solution uniqueness — trust the check, not the builder.
//
// Second, keep the fine print worth reading. If clauses almost never change the
// answer, the right strategy is to ignore them; if they almost always do, the
// right strategy is to ignore the headline. Either way the game stops being
// about reading. So the generator aims at a mix, and spreads which clause does
// the deciding instead of always leaning on the newest one.
window.TC = window.TC || {};
window.TC.Round = (function () {
  'use strict';

  var C = window.TC.Clauses;

  var MIN_SHAPES = 3;
  var MAX_SHAPES = 6;
  var FIRE_RATE = 0.5;    /* share of rounds where a clause changes the answer */
  var ATTEMPTS = 80;      /* per round, before settling for what we have */

  /* A small seeded generator, so the self-check can reproduce a failure. */
  function lcg(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function sampleDistinct(rng, arr, n) {
    var pool = arr.slice();
    var out = [];
    for (var i = 0; i < n && pool.length; i++) {
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return out;
  }

  function shapeIds(arr) {
    return arr.map(function (s) { return s.id; });
  }

  /* ── one candidate ──────────────────────────────────────────────────── */

  function build(rng, clauses) {
    var count = MIN_SHAPES + Math.floor(rng() * (MAX_SHAPES - MIN_SHAPES + 1));
    /* Sizes without replacement: every size selector in the catalogue depends
       on no two shapes ever tying. */
    var sizes = sampleDistinct(rng, C.SIZE_POOL, count);
    var shapes = [];
    for (var i = 0; i < count; i++) {
      shapes.push({
        i: i,
        kind: pick(rng, C.KINDS),
        ink: pick(rng, shapeIds(C.INKS)),
        size: sizes[i]
      });
    }
    return {
      stock: pick(rng, shapeIds(C.STOCKS)),
      shapes: shapes,
      clauses: clauses
    };
  }

  /* A round is dealable only if the resolver lands on exactly one shape and
     every clause that fired could name exactly one shape too. A selector
     returns -1 precisely when it cannot — so this is the uniqueness check, not
     a proxy for it.

     THE OVERRIDE LAW. On top of uniqueness: if any clause fires, at least one
     of the clauses that fired must have moved the target off the headline's
     pick. Otherwise the round is one where the fine print switched on, cost
     the player the time it takes to check it, and changed nothing — which
     quietly teaches that reading is optional. Those rounds get rejected.

     Note what this deliberately does NOT reject. 'no-circle-biggest' reinstates
     the headline, so it can never be the clause that satisfies the law on its
     own; a round where it is the only clause firing is thrown out. But a round
     where an earlier clause moved the target and it puts it back is kept, and
     that is the whole point of a reinstatement clause. The law is written as
     "some clause moved the target", not "the answer differs from the headline",
     precisely so those rounds survive. */
  function dealable(round, res) {
    if (res.answer < 0 || res.answer >= round.shapes.length) return false;
    var moved = false;
    for (var i = 0; i < res.applied.length; i++) {
      if (res.applied[i].pick < 0) return false;
      if (res.applied[i].pick !== res.headlineAnswer) moved = true;
    }
    if (res.applied.length && !moved) return false;
    return true;
  }

  /* ── the deal ───────────────────────────────────────────────────────── */

  // Returns { round, resolved }. `clauses` is the active list, in printed
  // order; pass [] for the opening rounds where only the headline applies.
  function deal(clauses, rng) {
    rng = rng || Math.random;
    var wantFired = clauses.length > 0 && rng() < FIRE_RATE;
    /* Spread the deciding clause around, so late-game rounds are not always
       decided by whichever clause arrived last. */
    var prefer = wantFired ? pick(rng, clauses) : null;

    var onTarget = null;   /* right fired-ness and the preferred clause */
    var closeEnough = null;/* right fired-ness, some other clause */
    var anything = null;   /* dealable at all */

    for (var a = 0; a < ATTEMPTS; a++) {
      var round = build(rng, clauses);
      var res = C.resolve(round);
      if (!dealable(round, res)) continue;

      var candidate = { round: round, resolved: res };
      if (!anything) anything = candidate;

      var fired = res.answer !== res.headlineAnswer;
      if (fired !== wantFired) continue;
      if (!closeEnough) closeEnough = candidate;

      if (!prefer) return candidate;
      if (res.decidedBy && res.decidedBy.clause.id === prefer.id) {
        onTarget = candidate;
        break;
      }
    }

    return onTarget || closeEnough || anything || fallback(clauses);
  }

  /* If eighty attempts somehow produce nothing dealable, hand back a round that
     cannot fail to resolve. Better a dull round than a broken one.

     Every attribute here is picked to switch every clause in the catalogue OFF,
     and it is resolved with the real clause list rather than an empty one — so
     what the sheet prints and what the answer is cannot disagree. Resolving
     against [] and then printing the live clauses would be the worst bug this
     game can have: with 'three-left' active, a three-shape fallback prints a
     clause that plainly applies while the stored answer ignores it, and the
     player who read correctly is the one who loses.

       four shapes      — not three, so 'three-left' is off
       all circles      — 'no-circle-biggest', 'star', 'two-triangles' off
       four inks, no black, no repeat
                        — 'black', 'all-one-ink-right', 'shared-ink' off
       blue stock       — the yellow, pink and grey clauses off

     A clause added later that this round would trip is a real hazard, so the
     self-check asserts the fallback resolves with nothing applied. */
  function fallback(clauses) {
    var round = {
      stock: 'blue',
      shapes: [
        { i: 0, kind: 'circle', ink: 'red',   size: 34 },
        { i: 1, kind: 'circle', ink: 'blue',  size: 51 },
        { i: 2, kind: 'circle', ink: 'gold',  size: 75 },
        { i: 3, kind: 'circle', ink: 'green', size: 90 }
      ],
      clauses: clauses
    };
    return { round: round, resolved: C.resolve(round) };
  }

  /* ── the order clauses arrive in ────────────────────────────────────── */

  // Sorted by how hard they are to hold in mind, with enough jitter that two
  // runs differ. The ramp stays a ramp: the sixth clause you meet is always
  // harder than the first.
  function runOrder(rng) {
    rng = rng || Math.random;
    return C.CLAUSES.slice().sort(function (a, b) {
      return (a.rank + rng() * 1.4) - (b.rank + rng() * 1.4);
    });
  }

  return {
    deal: deal,
    runOrder: runOrder,
    lcg: lcg,
    build: build,
    dealable: dealable,
    fallback: fallback,
    MIN_SHAPES: MIN_SHAPES,
    MAX_SHAPES: MAX_SHAPES,
    FIRE_RATE: FIRE_RATE
  };
})();
