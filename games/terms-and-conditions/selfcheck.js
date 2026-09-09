// Terms & Conditions — headless self-check.  Run it with:  node selfcheck.js
//
// There is no test runner in this repo, and this is not one: it is the
// throwaway-Node-script pattern CLAUDE.md documents for the other generators,
// kept because this game makes a promise the others do not. Every round claims
// "the answer was in the small print", so the thing worth checking is that the
// printed English and the code that judges you cannot disagree.
//
// The important trick below: for every clause, this file re-implements the
// English independently, reading only attributes a player can see on screen.
// It then asserts the clause's own `when` agrees. A clause that drifted from
// its wording, or that keyed on something invisible, fails here.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

/* The game files are plain <script>s, not modules, so run them in a context
   with `window` stubbed as the sandbox — same approach as the notes in
   CLAUDE.md for Tetris and 2048. */
var sandbox = {};
sandbox.window = sandbox;
var ctx = vm.createContext(sandbox);
['clauses.js', 'round.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
});

var C = sandbox.TC.Clauses;
var R = sandbox.TC.Round;

var failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); }

/* ── independent readings of each clause's English ──────────────────────
   Written from the printed text, not from the implementation. Each reads only
   what is drawn: the stock, and each shape's kind, ink and size. */
function count(shapes, key, val) {
  return shapes.filter(function (s) { return s[key] === val; }).length;
}
var ENGLISH = {
  'yellow-smallest':   function (r) { return r.stock === 'yellow'; },
  'star':              function (r) { return count(r.shapes, 'kind', 'star') === 1; },
  'pink-right':        function (r) { return r.stock === 'pink'; },
  'black':             function (r) { return count(r.shapes, 'ink', 'black') === 1; },
  'three-left':        function (r) { return r.shapes.length === 3; },
  'no-circle-biggest': function (r) { return count(r.shapes, 'kind', 'circle') === 0; },
  'grey-second':       function (r) { return r.stock === 'grey' && r.shapes.length >= 2; },
  'all-one-ink-right': function (r) {
    if (r.shapes.length < 2) return false;
    return r.shapes.every(function (s) { return s.ink === r.shapes[0].ink; });
  },
  'two-triangles':     function (r) { return count(r.shapes, 'kind', 'triangle') >= 2; },
  'shared-ink':        function (r) {
    var tally = {};
    r.shapes.forEach(function (s) { tally[s.ink] = (tally[s.ink] || 0) + 1; });
    var twos = 0;
    for (var k in tally) {
      if (!Object.prototype.hasOwnProperty.call(tally, k)) continue;
      if (tally[k] > 2) return false;
      if (tally[k] === 2) twos++;
    }
    return twos === 1;
  }
};

/* every clause in the catalogue must have an independent reading here */
C.CLAUSES.forEach(function (c) {
  check(typeof ENGLISH[c.id] === 'function', 'no independent reading for clause "' + c.id + '"');
});
check(Object.keys(ENGLISH).length === C.CLAUSES.length,
  'ENGLISH has ' + Object.keys(ENGLISH).length + ' readings for ' + C.CLAUSES.length + ' clauses');

/* ── "biggest" has to have an answer ────────────────────────────────────
   The headline is CLICK THE BIGGEST SHAPE, so ink area must be strictly
   monotone in `size` for every pair of kinds — otherwise a "large" triangle
   really can carry less ink than a "small" square and the question is a lie.
   Checked exhaustively over every kind pair and every size pair, from the
   glyph geometry rather than from the scale table, so a hand-edited scale
   factor cannot slip through. */
function inkArea(kind, size) {
  var box = size * C.KIND_SCALE[kind];
  return C.unitArea(kind) * box * box;
}
(function () {
  var pool = C.SIZE_POOL.slice().sort(function (a, b) { return a - b; });
  var worstRatio = Infinity, worstMsg = '';
  C.KINDS.forEach(function (ka) {
    C.KINDS.forEach(function (kb) {
      /* equal weight, any two kinds: equal ink */
      pool.forEach(function (s) {
        var ratio = inkArea(ka, s) / inkArea(kb, s);
        check(Math.abs(ratio - 1) < 0.02,
          'ink area not equalised: ' + ka + ' vs ' + kb + ' at size ' + s +
          ' differ by ' + ((ratio - 1) * 100).toFixed(1) + '%');
      });
      /* one step up in weight always means more ink, whatever the silhouettes */
      for (var i = 0; i < pool.length - 1; i++) {
        var bigger = inkArea(ka, pool[i + 1]);
        var smaller = inkArea(kb, pool[i]);
        check(bigger > smaller,
          'a ' + ka + ' at size ' + pool[i + 1] + ' has less ink than a ' +
          kb + ' at size ' + pool[i] + ' — "biggest" would be false');
        if (bigger / smaller < worstRatio) {
          worstRatio = bigger / smaller;
          worstMsg = ka + ' ' + pool[i + 1] + ' vs ' + kb + ' ' + pool[i];
        }
      }
    });
  });
  console.log('tightest ink-area margin  ' + worstRatio.toFixed(2) + 'x  (' + worstMsg + ')');
  console.log('drawn box per kind        ' + C.KINDS.map(function (k) {
    return k + ' ' + C.KIND_SCALE[k].toFixed(3);
  }).join(', '));
})();

/* every glyph must be drawable, and stay inside its 100x100 box */
C.KINDS.forEach(function (k) {
  var m = C.glyphMarkup(k);
  check(/^<(circle|rect|path)\b/.test(m), 'glyph "' + k + '" produced no element: ' + m);
  var nums = m.match(/-?\d+(\.\d+)?/g) || [];
  nums.forEach(function (n) {
    var v = parseFloat(n);
    check(v >= -0.01 && v <= 100.01, 'glyph "' + k + '" leaves its box: coordinate ' + v);
  });
});

/* ── the inert fallback must really be inert ────────────────────────────
   It is printed with the live clause list, so if any clause could fire on it
   the sheet would contradict the answer. */
(function () {
  var fb = R.fallback(C.CLAUSES.slice());
  check(fb.resolved.applied.length === 0,
    'the fallback round trips ' + fb.resolved.applied.length + ' clause(s): ' +
    fb.resolved.applied.map(function (a) { return a.clause.id; }).join(', '));
  check(R.dealable(fb.round, fb.resolved), 'the fallback round is not dealable');
  var fbSizes = fb.round.shapes.map(function (s) { return s.size; });
  check(new Set(fbSizes).size === fbSizes.length, 'the fallback round has tied sizes');
  fbSizes.forEach(function (s) {
    check(C.SIZE_POOL.indexOf(s) >= 0, 'fallback size ' + s + ' is not in SIZE_POOL');
  });
})();

/* ── the run ────────────────────────────────────────────────────────────── */

var ROUNDS = 4000;
var rng = R.lcg(20260909);
var all = C.CLAUSES.slice();

var fired = 0;
var decidedTally = {};
var appliedTally = {};
var sizesSeen = 0;

for (var n = 0; n < ROUNDS; n++) {
  /* sweep every clause depth, including 0 */
  var depth = n % (all.length + 1);
  var active = R.runOrder(rng).slice(0, depth);
  var dealt = R.deal(active, rng);
  var round = dealt.round;
  var res = dealt.resolved;

  /* 1. exactly one answer, and it is a real shape */
  check(res.answer >= 0 && res.answer < round.shapes.length,
    'round ' + n + ': answer out of range (' + res.answer + ' of ' + round.shapes.length + ')');

  /* 2. every clause that fired could name exactly one shape */
  res.applied.forEach(function (a) {
    check(a.pick >= 0 && a.pick < round.shapes.length,
      'round ' + n + ': clause "' + a.clause.id + '" picked ' + a.pick);
  });

  /* 3. no two shapes ever tie on size — every size selector depends on it */
  var sizes = round.shapes.map(function (s) { return s.size; });
  check(new Set(sizes).size === sizes.length, 'round ' + n + ': duplicate sizes ' + sizes.join(','));
  sizesSeen += sizes.length;

  /* 4. the printed English and the code agree, for every active clause */
  round.clauses.forEach(function (c) {
    var mine = ENGLISH[c.id](round);
    var theirs = c.when(round);
    check(mine === theirs,
      'round ' + n + ': clause "' + c.id + '" — text says ' + mine + ', code says ' + theirs);
  });

  /* 5. later wins: the deciding clause is the last one that applied */
  if (res.applied.length) {
    var last = res.applied[res.applied.length - 1];
    check(res.decidedBy && res.decidedBy.clause.id === last.clause.id,
      'round ' + n + ': precedence broken — decided by "' +
      (res.decidedBy ? res.decidedBy.clause.id : 'nothing') + '", last applied was "' + last.clause.id + '"');
    check(res.answer === last.pick, 'round ' + n + ': answer is not the last applied clause\'s pick');
  } else {
    check(res.decidedBy === null, 'round ' + n + ': decidedBy set with no clause applied');
    check(res.answer === res.headlineAnswer, 'round ' + n + ': no clause applied but answer left the headline');
  }

  /* 6. the override law: if the fine print switched on at all, at least one
     clause that fired must have moved the target off the headline's pick.
     A round that costs the player a read and changes nothing is a round that
     teaches them not to bother reading. */
  if (res.applied.length) {
    var movedAny = res.applied.some(function (a) { return a.pick !== res.headlineAnswer; });
    check(movedAny, 'round ' + n + ': ' + res.applied.length + ' clause(s) fired (' +
      res.applied.map(function (a) { return a.clause.id; }).join(', ') +
      ') but none moved the target off the headline');
  }

  /* 7. tallies for the interest-rate and spread checks (full depth only) */
  if (depth === all.length) {
    if (res.answer !== res.headlineAnswer) {
      fired++;
      var id = res.decidedBy ? res.decidedBy.clause.id : '(headline)';
      decidedTally[id] = (decidedTally[id] || 0) + 1;
    }
    res.applied.forEach(function (a) {
      appliedTally[a.clause.id] = (appliedTally[a.clause.id] || 0) + 1;
    });
  }
}

/* ── aggregate checks ───────────────────────────────────────────────────── */

var fullDepthRounds = Math.floor(ROUNDS / (all.length + 1));
var rate = fired / fullDepthRounds;
check(rate > 0.3 && rate < 0.72,
  'fire rate ' + rate.toFixed(3) + ' outside 0.30-0.72 — the fine print is being ignored or is mandatory');

/* no single clause may decide most of the fired rounds */
var top = 0, topId = '';
Object.keys(decidedTally).forEach(function (k) {
  if (decidedTally[k] > top) { top = decidedTally[k]; topId = k; }
});
check(fired === 0 || top / fired < 0.6,
  'clause "' + topId + '" decides ' + ((top / fired) * 100).toFixed(0) + '% of fired rounds — not spread');

/* every clause must be able to fire at all; a clause that never applies is
   dead weight the player is being asked to read for nothing */
C.CLAUSES.forEach(function (c) {
  check(appliedTally[c.id] > 0, 'clause "' + c.id + '" never applied in ' + fullDepthRounds + ' full-depth rounds');
});

/* runOrder must deal every clause, and ramp */
var order = R.runOrder(R.lcg(7));
check(order.length === all.length, 'runOrder returned ' + order.length + ' of ' + all.length);
var firstHalf = order.slice(0, 5).reduce(function (a, c) { return a + c.rank; }, 0);
var lastHalf = order.slice(5).reduce(function (a, c) { return a + c.rank; }, 0);
check(firstHalf < lastHalf, 'runOrder is not ramping: first-half rank ' + firstHalf + ' vs ' + lastHalf);

/* ── report ─────────────────────────────────────────────────────────────── */

console.log('rounds generated      ' + ROUNDS);
console.log('shapes drawn          ' + sizesSeen);
console.log('fire rate (full)      ' + rate.toFixed(3) + '   target ~' + R.FIRE_RATE);
console.log('deciding clause spread');
Object.keys(decidedTally).sort().forEach(function (k) {
  console.log('  ' + k + ': ' + ((decidedTally[k] / fired) * 100).toFixed(1) + '%');
});
console.log('clause application counts');
C.CLAUSES.forEach(function (c) {
  console.log('  ' + c.id + ': ' + (appliedTally[c.id] || 0));
});

if (failures.length) {
  console.log('\nFAILED (' + failures.length + ')');
  failures.slice(0, 25).forEach(function (f) { console.log('  - ' + f); });
  if (failures.length > 25) console.log('  ... and ' + (failures.length - 25) + ' more');
  process.exit(1);
}
console.log('\nall invariants hold');
