// Terms & Conditions — the printed rules, and the machine that reads them.
//
// No DOM and no timers in this file: it is pure data plus pure functions, so a
// throwaway Node script can generate thousands of rounds and check that every
// one of them has exactly one defensible answer. For a game whose whole promise
// is "the answer was there in the small print", that check is not optional.
//
// THE ONE INVARIANT: a clause's `text` is the contract with the player, and
// `when`/`pick` are the contract with the machine. If they ever disagree, the
// game is lying. Every clause below is written so the English and the code say
// the same thing, and the self-check asserts it.
//
// A corollary that is easy to get wrong: the text must state the WHOLE firing
// condition, not a friendly approximation of it. "If there is a star, click the
// star" reads as though it fires whenever a star is on the sheet, but the code
// needs exactly one star to be able to name a single shape. A player looking at
// two stars cannot tell whether the clause is on. So every clause here spells
// out the count it needs — "exactly one shape is a star" — even where that
// costs a few words.
//
// PRECEDENCE: the later clause wins. Resolution starts at the headline's target
// and every clause whose `when` is true replaces it, in order. So the newest
// clause — always appended at the bottom — is always the most powerful. Every
// clause is phrased "Except when …" to print that relationship on the sheet.
window.TC = window.TC || {};
window.TC.Clauses = (function () {
  'use strict';

  /* ── the materials ──────────────────────────────────────────────────── */

  // The backdrop is the paper the round is printed on. Pale tints, so ink
  // reads. ("Backdrop", not "stock": stock is what a printer calls it, and a
  // clause that turns on a word the player has to look up is a clause that
  // cannot be read at speed.)
  var BACKDROPS = [
    { id: 'yellow', label: 'YELLOW', hex: '#e8d9a0' },
    { id: 'grey',   label: 'GREY',   hex: '#b9bcb4' },
    { id: 'pink',   label: 'PINK',   hex: '#e0bcbc' },
    { id: 'green',  label: 'GREEN',  hex: '#b8ccb4' },
    { id: 'blue',   label: 'BLUE',   hex: '#b6c6da' }
  ];

  // Ink colours for the shapes, borrowed from the other games in the box so
  // the whole set looks like it was printed in one run. Two of the names are
  // shared with the backdrops on purpose — that is what makes the
  // 'match-backdrop' clause readable, since both are printed as words.
  var INKS = [
    { id: 'red',   label: 'RED',   hex: '#b13f1f' },
    { id: 'blue',  label: 'BLUE',  hex: '#1f4f9c' },
    { id: 'gold',  label: 'GOLD',  hex: '#e0c341' },
    { id: 'green', label: 'GREEN', hex: '#2e7d3a' },
    { id: 'black', label: 'BLACK', hex: '#171410' }
  ];

  var KINDS = ['circle', 'square', 'triangle', 'star'];

  // Sizes are drawn from this pool without replacement, so no two shapes in a
  // round are ever the same size. Every "biggest / smallest / second largest"
  // selector depends on that.
  //
  // The steps are ~1.27x apart, and that number is load-bearing rather than
  // decorative — see the note on KIND_SCALE below for what it has to clear.
  var SIZE_POOL = [34, 44, 56, 71, 91, 116];

  /* ── the glyphs, and why they are sized the way they are ────────────────
     The headline of this game is CLICK THE BIGGEST SHAPE, so "biggest" has to
     have an answer, and — just as important — it has to have an answer the eye
     can find in a couple of seconds under a clock.

     An eye reads "big" two ways at once: how much ink is on the paper, and how
     far the shape reaches across. Those are different functions of the
     silhouette, so for shapes of different kinds they can be made to agree only
     up to a point. Drawn in the same box a triangle carries ~70% of a square's
     ink and a star ~69%, so:

       - scale every kind to equal INK at equal weight, and the star's box runs
         well over the square's, so a smaller star looks wider than a bigger
         square;
       - scale nothing, and equal-looking boxes differ by ~1.44x in ink.

     Either way the two cues contradict each other and the player is left
     guessing. So this build splits the difference geometrically: each kind's
     box is scaled by the SQUARE ROOT of the ink-equalising factor. Neither cue
     is exact, both are off by the same modest factor, and — the point — a
     single step up the size pool is more than enough to swamp that factor in
     BOTH of them at once. One step up is at least 1.15x wider AND at least
     1.33x more ink, whatever the two silhouettes are. Nothing on the sheet
     disagrees with anything else about which shape is bigger.

     The arithmetic behind "one step is enough": with box = size * K^t (K the
     ink-equalising factor, t the split), extent needs step > (Kmax/Kmin)^t and
     ink needs step > (Kmax/Kmin)^(1-t). Both are hardest at the same value when
     t = 1/2, which is why the split is a square root and not a taste call. The
     self-check verifies the resulting margins exhaustively over every pair of
     kinds and every pair of sizes, from the glyph geometry rather than from the
     table, so a hand-edited factor cannot slip through.

     The glyphs are also drawn as full as their silhouettes allow — a nearly
     box-filling triangle, a deliberately fat star — which shrinks Kmax/Kmin to
     ~1.10 and is what leaves both margins comfortable at a 1.27x step. Don't
     slim the star back down without re-reading the self-check's margins.

     The defining numbers live here, once. The SVG path and the area are both
     derived from them, so the drawn shape and the shape the maths believes in
     cannot drift apart. */
  var GLYPH = {
    /* every kind is drawn inside a 100x100 viewBox, centred on (50, 50) */
    circle:   { r: 46 },
    square:   { side: 82 },
    triangle: { base: 98, height: 96 },
    star:     { points: 5, r: 49, innerRatio: 0.66 }
  };

  // How the two readings of "big" are traded off. 1 = equal ink at equal
  // weight (extent disagrees), 0 = equal box at equal weight (ink disagrees),
  // 0.5 = both off by the same factor, which is the smallest that factor can
  // be made. See the note above.
  var AREA_WEIGHT = 0.5;

  // Ink area of one kind's glyph, as a fraction of its 100x100 box.
  function unitArea(kind) {
    var g = GLYPH[kind];
    if (kind === 'circle') return Math.PI * g.r * g.r / 10000;
    if (kind === 'square') return g.side * g.side / 10000;
    if (kind === 'triangle') return 0.5 * g.base * g.height / 10000;
    /* a p-pointed star is 2p triangles about the centre, alternating radii */
    return g.points * g.r * (g.r * g.innerRatio) * Math.sin(Math.PI / g.points) / 10000;
  }

  // The scale each kind's box gets. The square is the reference simply because
  // it is the densest, which keeps every factor >= 1.
  var KIND_SCALE = (function () {
    var ref = unitArea('square');
    var out = {};
    for (var i = 0; i < KINDS.length; i++) {
      out[KINDS[i]] = Math.pow(Math.sqrt(ref / unitArea(KINDS[i])), AREA_WEIGHT);
    }
    return out;
  })();

  // The box a shape is actually drawn in, in px.
  function drawnBox(shape) {
    return Math.round(shape.size * KIND_SCALE[shape.kind]);
  }

  // The SVG path/element for a kind, derived from GLYPH so it cannot disagree
  // with the area maths above.
  function glyphMarkup(kind) {
    var g = GLYPH[kind];
    if (kind === 'circle') {
      return '<circle cx="50" cy="50" r="' + g.r + '"/>';
    }
    if (kind === 'square') {
      var o = (100 - g.side) / 2;
      return '<rect x="' + o + '" y="' + o + '" width="' + g.side + '" height="' + g.side + '"/>';
    }
    if (kind === 'triangle') {
      var hx = g.base / 2, hy = g.height / 2;
      return '<path d="M50 ' + (50 - hy) + 'L' + (50 + hx) + ' ' + (50 + hy) +
        'H' + (50 - hx) + 'z"/>';
    }
    var pts = [];
    var n = g.points * 2;
    for (var i = 0; i < n; i++) {
      /* start at the top and alternate outer/inner radius */
      var ang = -Math.PI / 2 + i * Math.PI / g.points;
      var rad = (i % 2 === 0) ? g.r : g.r * g.innerRatio;
      pts.push(round2(50 + rad * Math.cos(ang)) + ' ' + round2(50 + rad * Math.sin(ang)));
    }
    return '<path d="M' + pts.join('L') + 'z"/>';
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* ── selectors ──────────────────────────────────────────────────────── */

  // Each returns an index into round.shapes, or -1 if it cannot pick exactly
  // one. A live clause must never return -1; the self-check asserts that.

  function byRank(shapes, rank) {          /* rank 0 = biggest */
    var order = shapes.slice().sort(function (a, b) { return b.size - a.size; });
    return order.length > rank ? order[rank].i : -1;
  }
  function bySmallRank(shapes, rank) {     /* rank 0 = smallest */
    var order = shapes.slice().sort(function (a, b) { return a.size - b.size; });
    return order.length > rank ? order[rank].i : -1;
  }
  function smallest(shapes) { return bySmallRank(shapes, 0); }
  function ofKind(shapes, kind) {
    var found = shapes.filter(function (s) { return s.kind === kind; });
    return found.length === 1 ? found[0].i : -1;
  }
  function ofInk(shapes, ink) {
    var found = shapes.filter(function (s) { return s.ink === ink; });
    return found.length === 1 ? found[0].i : -1;
  }
  function smallestOfKind(shapes, kind) {
    var found = shapes.filter(function (s) { return s.kind === kind; });
    if (!found.length) return -1;
    found.sort(function (a, b) { return a.size - b.size; });
    return found[0].i;
  }
  function biggestOfKind(shapes, kind) {
    var found = shapes.filter(function (s) { return s.kind === kind; });
    if (!found.length) return -1;
    found.sort(function (a, b) { return b.size - a.size; });
    return found[0].i;
  }
  function middle(shapes) {
    return shapes.length % 2 === 1 ? shapes[(shapes.length - 1) / 2].i : -1;
  }

  function countKind(shapes, kind) {
    var n = 0;
    for (var i = 0; i < shapes.length; i++) if (shapes[i].kind === kind) n++;
    return n;
  }
  function countInk(shapes, ink) {
    var n = 0;
    for (var i = 0; i < shapes.length; i++) if (shapes[i].ink === ink) n++;
    return n;
  }
  function allInksDistinct(shapes) {
    for (var i = 0; i < shapes.length; i++) {
      for (var j = i + 1; j < shapes.length; j++) {
        if (shapes[i].ink === shapes[j].ink) return false;
      }
    }
    return true;
  }

  // The one ink shared by exactly two shapes, when there is exactly one such
  // ink and no ink appears more often than twice. Otherwise null — which is
  // what makes "the larger of the two" a single, defensible shape, and what
  // the clause's wording has to spell out.
  function lonePair(shapes) {
    var counts = {};
    var i;
    for (i = 0; i < shapes.length; i++) {
      counts[shapes[i].ink] = (counts[shapes[i].ink] || 0) + 1;
    }
    var pairs = [];
    for (var ink in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, ink)) continue;
      if (counts[ink] > 2) return null;      /* a triple is not "two shapes" */
      if (counts[ink] === 2) pairs.push(ink);
    }
    return pairs.length === 1 ? pairs[0] : null;
  }

  /* ── the headline ───────────────────────────────────────────────────── */

  // Fixed for every run. One stable instruction to hold on to makes the
  // clauses the only thing you have to learn, and it is the line the whole
  // game is a joke about. Varying it later is a one-line change here.
  var HEADLINE = {
    text: 'CLICK THE BIGGEST SHAPE',
    pick: function (round) { return byRank(round.shapes, 0); }
  };

  /* ── the clauses ────────────────────────────────────────────────────── */

  // `rank` is how hard the clause is to hold in mind. It is also the run's
  // difficulty tier: round.js deals one clause per tier in ascending order, so
  // the ramp stays a ramp while WHICH clause you meet at each step changes from
  // run to run. Keep the tiers evenly stocked when adding to this list.
  //
  // Every `text` states its full firing condition, counts included. If you
  // find yourself writing a shorter, friendlier line that leaves a count out,
  // that is the bug this game exists to not have.
  var CLAUSES = [
    /* ── tier 1: one thing to look at, and it names the target outright ── */
    {
      id: 'yellow-smallest',
      rank: 1,
      text: 'Except when the backdrop is yellow, click the smallest shape.',
      when: function (r) { return r.backdrop === 'yellow'; },
      pick: function (r) { return smallest(r.shapes); }
    },
    {
      id: 'star',
      rank: 1,
      text: 'Except when exactly one shape is a star, click the star.',
      when: function (r) { return countKind(r.shapes, 'star') === 1; },
      pick: function (r) { return ofKind(r.shapes, 'star'); }
    },
    {
      id: 'green-left',
      rank: 1,
      text: 'Except when the backdrop is green, click the shape on the left.',
      when: function (r) { return r.backdrop === 'green'; },
      pick: function (r) { return r.shapes[0].i; }
    },

    /* ── tier 2 ─────────────────────────────────────────────────────────── */
    {
      id: 'pink-right',
      rank: 2,
      text: 'Except when the backdrop is pink, click the shape on the right.',
      when: function (r) { return r.backdrop === 'pink'; },
      pick: function (r) { return r.shapes[r.shapes.length - 1].i; }
    },
    {
      id: 'black',
      rank: 2,
      text: 'Except when exactly one shape is black, click the black shape.',
      when: function (r) { return countInk(r.shapes, 'black') === 1; },
      pick: function (r) { return ofInk(r.shapes, 'black'); }
    },
    {
      id: 'no-square-smallest',
      rank: 2,
      text: 'Except when no shape is a square, click the smallest shape.',
      when: function (r) { return countKind(r.shapes, 'square') === 0; },
      pick: function (r) { return smallest(r.shapes); }
    },

    /* ── tier 3: something has to be counted first ──────────────────────── */
    {
      id: 'three-left',
      rank: 3,
      text: 'Except when there are exactly three shapes, click the shape on the left.',
      when: function (r) { return r.shapes.length === 3; },
      pick: function (r) { return r.shapes[0].i; }
    },
    {
      id: 'no-circle-biggest',
      rank: 3,
      text: 'Except when no shape is a circle, click the biggest shape.',
      when: function (r) { return countKind(r.shapes, 'circle') === 0; },
      pick: function (r) { return byRank(r.shapes, 0); }
    },
    {
      id: 'two-circles',
      rank: 3,
      text: 'Except when two or more shapes are circles, click the biggest circle.',
      when: function (r) { return countKind(r.shapes, 'circle') >= 2; },
      pick: function (r) { return biggestOfKind(r.shapes, 'circle'); }
    },

    /* ── tier 4: the target is a rank or a comparison, not a thing ──────── */
    {
      id: 'grey-second',
      rank: 4,
      text: 'Except when the backdrop is grey, click the second biggest shape.',
      when: function (r) { return r.backdrop === 'grey' && r.shapes.length >= 2; },
      pick: function (r) { return byRank(r.shapes, 1); }
    },
    {
      id: 'four-second-smallest',
      rank: 4,
      text: 'Except when there are four or more shapes, click the second smallest shape.',
      when: function (r) { return r.shapes.length >= 4; },
      pick: function (r) { return bySmallRank(r.shapes, 1); }
    },
    {
      id: 'match-backdrop',
      rank: 4,
      text: 'Except when exactly one shape is the same colour as the backdrop, click that shape.',
      when: function (r) { return countInk(r.shapes, r.backdrop) === 1; },
      pick: function (r) { return ofInk(r.shapes, r.backdrop); }
    },

    /* ── tier 5: a property of the whole sheet ──────────────────────────── */
    {
      id: 'all-one-ink-right',
      rank: 5,
      text: 'Except when every shape is the same colour, click the shape on the right.',
      when: function (r) {
        for (var i = 1; i < r.shapes.length; i++) {
          if (r.shapes[i].ink !== r.shapes[0].ink) return false;
        }
        return r.shapes.length > 1;
      },
      pick: function (r) { return r.shapes[r.shapes.length - 1].i; }
    },
    {
      id: 'two-triangles',
      rank: 5,
      text: 'Except when two or more shapes are triangles, click the smallest triangle.',
      when: function (r) { return countKind(r.shapes, 'triangle') >= 2; },
      pick: function (r) { return smallestOfKind(r.shapes, 'triangle'); }
    },
    {
      id: 'all-inks-different',
      rank: 5,
      text: 'Except when no two shapes share a colour, click the smallest shape.',
      when: function (r) { return r.shapes.length > 1 && allInksDistinct(r.shapes); },
      pick: function (r) { return smallest(r.shapes); }
    },

    /* ── tier 6: two things at once, or a condition about the answer ────── */
    {
      id: 'shared-ink',
      rank: 6,
      text: 'Except when one colour appears twice and no colour appears more often, click the larger of those two.',
      when: function (r) { return lonePair(r.shapes) !== null; },
      pick: function (r) {
        var ink = lonePair(r.shapes);
        if (ink === null) return -1;
        var pair = r.shapes.filter(function (s) { return s.ink === ink; });
        pair.sort(function (a, b) { return b.size - a.size; });
        return pair[0].i;
      }
    },
    {
      id: 'blue-middle',
      rank: 6,
      text: 'Except when the backdrop is blue and the number of shapes is odd, click the middle shape.',
      when: function (r) { return r.backdrop === 'blue' && r.shapes.length % 2 === 1; },
      pick: function (r) { return middle(r.shapes); }
    },
    {
      id: 'biggest-is-circle',
      rank: 6,
      text: 'Except when the biggest shape is a circle, click the smallest shape.',
      when: function (r) {
        var big = byRank(r.shapes, 0);
        return big >= 0 && r.shapes[big].kind === 'circle';
      },
      pick: function (r) { return smallest(r.shapes); }
    }
  ];

  /* ── resolution ─────────────────────────────────────────────────────── */

  // Walks the headline then every active clause in order. Later wins, so the
  // last clause that applies is the one that decided the round — which is
  // exactly what the loss screen needs to be able to show.
  function resolve(round) {
    var answer = HEADLINE.pick(round);
    var decidedBy = null;
    var applied = [];
    for (var i = 0; i < round.clauses.length; i++) {
      var c = round.clauses[i];
      if (!c.when(round)) continue;
      var pick = c.pick(round);
      applied.push({ clause: c, number: i + 1, pick: pick });
      answer = pick;
      decidedBy = { clause: c, number: i + 1 };
    }
    return {
      answer: answer,
      headlineAnswer: HEADLINE.pick(round),
      decidedBy: decidedBy,      /* null when the headline stood */
      applied: applied           /* every clause that fired, for the loss screen */
    };
  }

  function byId(id) {
    for (var i = 0; i < CLAUSES.length; i++) if (CLAUSES[i].id === id) return CLAUSES[i];
    return null;
  }

  function backdrop(id) {
    for (var i = 0; i < BACKDROPS.length; i++) if (BACKDROPS[i].id === id) return BACKDROPS[i];
    return null;
  }
  function ink(id) {
    for (var i = 0; i < INKS.length; i++) if (INKS[i].id === id) return INKS[i];
    return null;
  }

  // The highest `rank` in the catalogue — the number of difficulty tiers, and
  // therefore how many clauses a single run can deal without repeating a tier.
  var TIERS = (function () {
    var top = 0;
    for (var i = 0; i < CLAUSES.length; i++) if (CLAUSES[i].rank > top) top = CLAUSES[i].rank;
    return top;
  })();

  return {
    BACKDROPS: BACKDROPS,
    INKS: INKS,
    KINDS: KINDS,
    SIZE_POOL: SIZE_POOL,
    GLYPH: GLYPH,
    AREA_WEIGHT: AREA_WEIGHT,
    KIND_SCALE: KIND_SCALE,
    TIERS: TIERS,
    unitArea: unitArea,
    drawnBox: drawnBox,
    glyphMarkup: glyphMarkup,
    HEADLINE: HEADLINE,
    CLAUSES: CLAUSES,
    resolve: resolve,
    byId: byId,
    backdrop: backdrop,
    ink: ink,
    /* exported for the generator and the self-check */
    countKind: countKind,
    countInk: countInk,
    allInksDistinct: allInksDistinct,
    lonePair: lonePair
  };
})();
