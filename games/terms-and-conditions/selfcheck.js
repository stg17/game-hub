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
   what is drawn: the backdrop, and each shape's kind, ink and size.

   These are deliberately literal. Where a clause's text says "exactly one",
   the reading counts and compares to one; where the text is silent on a count,
   the reading is silent too. That is what makes a clause whose code quietly
   needs a count its text never mentions fail here instead of in play. */
function count(shapes, key, val) {
  return shapes.filter(function (s) { return s[key] === val; }).length;
}
function biggest(shapes) {
  return shapes.slice().sort(function (a, b) { return b.size - a.size; })[0];
}
function inkTally(shapes) {
  var tally = {};
  shapes.forEach(function (s) { tally[s.ink] = (tally[s.ink] || 0) + 1; });
  return tally;
}
var ENGLISH = {
  /* tier 1 */
  'yellow-smallest':      function (r) { return r.backdrop === 'yellow'; },
  'star':                 function (r) { return count(r.shapes, 'kind', 'star') === 1; },
  'green-left':           function (r) { return r.backdrop === 'green'; },
  /* tier 2 */
  'pink-right':           function (r) { return r.backdrop === 'pink'; },
  'black':                function (r) { return count(r.shapes, 'ink', 'black') === 1; },
  'no-square-smallest':   function (r) { return count(r.shapes, 'kind', 'square') === 0; },
  /* tier 3 */
  'three-left':           function (r) { return r.shapes.length === 3; },
  'no-circle-biggest':    function (r) { return count(r.shapes, 'kind', 'circle') === 0; },
  'two-circles':          function (r) { return count(r.shapes, 'kind', 'circle') >= 2; },
  /* tier 4 */
  'grey-second':          function (r) { return r.backdrop === 'grey'; },
  'four-second-smallest': function (r) { return r.shapes.length >= 4; },
  'match-backdrop':       function (r) { return count(r.shapes, 'ink', r.backdrop) === 1; },
  /* tier 5 */
  'all-one-ink-right':    function (r) {
    if (r.shapes.length < 2) return false;
    return r.shapes.every(function (s) { return s.ink === r.shapes[0].ink; });
  },
  'two-triangles':        function (r) { return count(r.shapes, 'kind', 'triangle') >= 2; },
  'all-inks-different':   function (r) {
    if (r.shapes.length < 2) return false;
    var tally = inkTally(r.shapes);
    return Object.keys(tally).every(function (k) { return tally[k] === 1; });
  },
  /* tier 6 */
  'shared-ink':           function (r) {
    var tally = inkTally(r.shapes);
    var twos = 0;
    for (var k in tally) {
      if (!Object.prototype.hasOwnProperty.call(tally, k)) continue;
      if (tally[k] > 2) return false;      /* "no colour appears more often" */
      if (tally[k] === 2) twos++;
    }
    return twos === 1;                     /* "one colour appears twice" */
  },
  'blue-middle':          function (r) {
    return r.backdrop === 'blue' && r.shapes.length % 2 === 1;
  },
  'biggest-is-circle':    function (r) { return biggest(r.shapes).kind === 'circle'; }
};

/* every clause in the catalogue must have an independent reading here */
C.CLAUSES.forEach(function (c) {
  check(typeof ENGLISH[c.id] === 'function', 'no independent reading for clause "' + c.id + '"');
});
check(Object.keys(ENGLISH).length === C.CLAUSES.length,
  'ENGLISH has ' + Object.keys(ENGLISH).length + ' readings for ' + C.CLAUSES.length + ' clauses');

/* clause ids are unique, and every clause is phrased as an override */
(function () {
  var seen = {};
  C.CLAUSES.forEach(function (c) {
    check(!seen[c.id], 'duplicate clause id "' + c.id + '"');
    seen[c.id] = true;
    check(/^Except when /.test(c.text),
      'clause "' + c.id + '" does not read as an override: "' + c.text + '"');
    check(/click /.test(c.text),
      'clause "' + c.id + '" never says what to click: "' + c.text + '"');
    check(!/\bstock\b/i.test(c.text), 'clause "' + c.id + '" still says "stock"');
  });
})();

/* ── "biggest" has to have an answer you can SEE ────────────────────────
   The headline is CLICK THE BIGGEST SHAPE, so the ordering must be readable at
   a glance, under a clock, across different silhouettes. An eye reads size two
   ways — how much ink is on the paper, and how far the shape reaches — so both
   have to be strictly monotone in `size`, for every pair of kinds. If they
   disagree, a "large" triangle really can look smaller than a "small" square
   and the question is a lie; that was the state this game shipped in first.

   Checked exhaustively over every kind pair and every adjacent size pair, from
   the glyph geometry rather than from the scale table, so a hand-edited factor
   cannot slip through. Both worst-case margins are reported: they are the real
   answer to "how obvious is this to look at". */
function extentOf(kind, size) { return size * C.KIND_SCALE[kind]; }
function inkArea(kind, size) {
  var box = extentOf(kind, size);
  return C.unitArea(kind) * box * box;
}
(function () {
  var pool = C.SIZE_POOL.slice().sort(function (a, b) { return a - b; });
  var worstInk = Infinity, worstInkMsg = '';
  var worstExt = Infinity, worstExtMsg = '';
  var sameSizeInk = 1, sameSizeExt = 1;

  C.KINDS.forEach(function (ka) {
    C.KINDS.forEach(function (kb) {
      /* how far the two cues are allowed to disagree at equal weight */
      pool.forEach(function (s) {
        sameSizeInk = Math.max(sameSizeInk, inkArea(ka, s) / inkArea(kb, s));
        sameSizeExt = Math.max(sameSizeExt, extentOf(ka, s) / extentOf(kb, s));
      });
      /* one step up in weight always means more ink AND more reach, whatever
         the two silhouettes are */
      for (var i = 0; i < pool.length - 1; i++) {
        var inkUp = inkArea(ka, pool[i + 1]), inkDown = inkArea(kb, pool[i]);
        check(inkUp > inkDown,
          'a ' + ka + ' at size ' + pool[i + 1] + ' has less ink than a ' +
          kb + ' at size ' + pool[i] + ' — "biggest" would be false');
        if (inkUp / inkDown < worstInk) {
          worstInk = inkUp / inkDown;
          worstInkMsg = ka + ' ' + pool[i + 1] + ' vs ' + kb + ' ' + pool[i];
        }

        var extUp = extentOf(ka, pool[i + 1]), extDown = extentOf(kb, pool[i]);
        check(extUp > extDown,
          'a ' + ka + ' at size ' + pool[i + 1] + ' is drawn narrower than a ' +
          kb + ' at size ' + pool[i] + ' — the two size cues would disagree');
        if (extUp / extDown < worstExt) {
          worstExt = extUp / extDown;
          worstExtMsg = ka + ' ' + pool[i + 1] + ' vs ' + kb + ' ' + pool[i];
        }
      }
    });
  });

  /* A step up must be obvious, not merely true. Under 10% either way is a
     difference nobody spots in the couple of seconds the clock allows. */
  check(worstInk > 1.15, 'tightest ink margin is only ' + worstInk.toFixed(3) + 'x');
  check(worstExt > 1.10, 'tightest width margin is only ' + worstExt.toFixed(3) + 'x');
  /* and neither cue may drift far from the other at equal weight */
  check(sameSizeInk < 1.25, 'ink differs by ' + sameSizeInk.toFixed(3) + 'x at equal weight');
  check(sameSizeExt < 1.25, 'width differs by ' + sameSizeExt.toFixed(3) + 'x at equal weight');

  console.log('one step up is at least  ' + worstInk.toFixed(2) + 'x the ink  (' + worstInkMsg + ')');
  console.log('                         ' + worstExt.toFixed(2) + 'x the width (' + worstExtMsg + ')');
  console.log('at equal weight, kinds differ by  ' + sameSizeInk.toFixed(2) + 'x ink, ' +
    sameSizeExt.toFixed(2) + 'x width');
  console.log('drawn box per kind       ' + C.KINDS.map(function (k) {
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
/* the number scan above cannot see that a circle is drawn from its centre */
check(50 - C.GLYPH.circle.r >= 0 && 50 + C.GLYPH.circle.r <= 100,
  'the circle glyph leaves its box at r=' + C.GLYPH.circle.r);
check(50 - C.GLYPH.star.r >= 0 && 50 + C.GLYPH.star.r <= 100,
  'the star glyph leaves its box at r=' + C.GLYPH.star.r);

/* ── the fallback must stay almost inert ────────────────────────────────
   It is printed with the live clause list, so any clause that fires on it must
   also be one that keeps it dealable. See the note in round.js: exactly one
   clause in the catalogue is unavoidable there, and it moves the target. */
(function () {
  var fb = R.fallback(C.CLAUSES.slice());
  check(fb.resolved.applied.length <= 1,
    'the fallback round trips ' + fb.resolved.applied.length + ' clauses: ' +
    fb.resolved.applied.map(function (a) { return a.clause.id; }).join(', '));
  check(R.dealable(fb.round, fb.resolved), 'the fallback round is not dealable');

  /* and it has to survive whatever subset a run happens to be holding */
  C.CLAUSES.forEach(function (c) {
    var one = R.fallback([c]);
    check(R.dealable(one.round, one.resolved),
      'the fallback round is not dealable against clause "' + c.id + '" alone');
  });
  var fbRng = R.lcg(9001);
  for (var t = 0; t < 200; t++) {
    var draw = R.runOrder(fbRng);
    var got = R.fallback(draw);
    check(R.dealable(got.round, got.resolved),
      'the fallback round is not dealable against run order ' +
      draw.map(function (c) { return c.id; }).join(', '));
  }

  var fbSizes = fb.round.shapes.map(function (s) { return s.size; });
  check(new Set(fbSizes).size === fbSizes.length, 'the fallback round has tied sizes');
  fbSizes.forEach(function (s) {
    check(C.SIZE_POOL.indexOf(s) >= 0, 'fallback size ' + s + ' is not in SIZE_POOL');
  });
})();

/* ── the clauses a run deals ────────────────────────────────────────────
   One per difficulty tier, ascending, and genuinely different from run to run
   — that second half is the whole reason the catalogue is bigger than a run. */
(function () {
  var tiers = {};
  C.CLAUSES.forEach(function (c) { tiers[c.rank] = (tiers[c.rank] || 0) + 1; });
  for (var t = 1; t <= C.TIERS; t++) {
    check(tiers[t] >= 2,
      'tier ' + t + ' holds ' + (tiers[t] || 0) + ' clause(s) — that slot would print the same line every run');
  }

  var sets = {};
  var seenClause = {};
  var DRAWS = 400;
  /* One stream, not a fresh seed per draw: an LCG's first output moves in
     lockstep with its seed, so reseeding per run samples the first tier along a
     straight line and can miss a clause that real play deals constantly. */
  var varyRng = R.lcg(4242);
  for (var d = 0; d < DRAWS; d++) {
    var order = R.runOrder(varyRng);
    check(order.length === R.RUN_CLAUSES,
      'runOrder dealt ' + order.length + ' clauses, expected ' + R.RUN_CLAUSES);
    for (var i = 0; i < order.length; i++) {
      seenClause[order[i].id] = true;
      check(order[i].rank === i + 1,
        'runOrder slot ' + (i + 1) + ' holds a tier-' + order[i].rank + ' clause — the ramp is broken');
    }
    sets[order.map(function (c) { return c.id; }).join('|')] = true;
  }
  var distinct = Object.keys(sets).length;
  check(distinct > DRAWS / 4,
    'only ' + distinct + ' distinct clause sets in ' + DRAWS + ' runs — runs repeat themselves');
  C.CLAUSES.forEach(function (c) {
    check(seenClause[c.id], 'clause "' + c.id + '" was never dealt in ' + DRAWS + ' runs');
  });
  console.log('clause sets in ' + DRAWS + ' runs   ' + distinct + ' distinct');
})();

/* ── the run ────────────────────────────────────────────────────────────── */

var ROUNDS = 4000;
var rng = R.lcg(20260909);
var DEPTHS = R.RUN_CLAUSES;   /* the deepest a real run ever gets */

var fired = 0;
var decidedTally = {};
var appliedTally = {};
var sizesSeen = 0;

for (var n = 0; n < ROUNDS; n++) {
  /* sweep every clause depth a player can actually reach, including 0 */
  var depth = n % (DEPTHS + 1);
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

  /* 7. tallies. Application is counted at every depth — a clause only has to
     be able to fire somewhere — but the fire rate and the spread are measured
     at full depth, which is the hardest a run ever gets. */
  res.applied.forEach(function (a) {
    appliedTally[a.clause.id] = (appliedTally[a.clause.id] || 0) + 1;
  });
  if (depth === DEPTHS) {
    if (res.answer !== res.headlineAnswer) {
      fired++;
      var id = res.decidedBy ? res.decidedBy.clause.id : '(headline)';
      decidedTally[id] = (decidedTally[id] || 0) + 1;
    }
  }
}

/* ── aggregate checks ───────────────────────────────────────────────────── */

var fullDepthRounds = Math.floor(ROUNDS / (DEPTHS + 1));
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
  check(appliedTally[c.id] > 0, 'clause "' + c.id + '" never applied in ' + ROUNDS + ' rounds');
});

/* ── report ─────────────────────────────────────────────────────────────── */

console.log('clauses in the box       ' + C.CLAUSES.length + ' over ' + C.TIERS +
  ' tiers, ' + R.RUN_CLAUSES + ' dealt per run');
console.log('rounds generated         ' + ROUNDS);
console.log('shapes drawn             ' + sizesSeen);
console.log('fire rate (full depth)   ' + rate.toFixed(3) + '   target ~' + R.FIRE_RATE);
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
