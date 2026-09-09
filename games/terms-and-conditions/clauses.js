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
// PRECEDENCE: the later clause wins. Resolution starts at the headline's target
// and every clause whose `when` is true replaces it, in order. So the newest
// clause — always appended at the bottom — is always the most powerful.
window.TC = window.TC || {};
window.TC.Clauses = (function () {
  'use strict';

  /* ── the materials ──────────────────────────────────────────────────── */

  // The stock is the paper the round is printed on. Pale tints, so ink reads.
  var STOCKS = [
    { id: 'yellow', label: 'YELLOW', hex: '#e8d9a0' },
    { id: 'grey',   label: 'GREY',   hex: '#b9bcb4' },
    { id: 'pink',   label: 'PINK',   hex: '#e0bcbc' },
    { id: 'green',  label: 'GREEN',  hex: '#b8ccb4' },
    { id: 'blue',   label: 'BLUE',   hex: '#b6c6da' }
  ];

  // Ink colours for the shapes, borrowed from the other games in the box so
  // the whole set looks like it was printed in one run.
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
  // selector depends on that, and one step apart is ~45% more ink — a
  // difference nobody has to squint at.
  var SIZE_POOL = [34, 42, 51, 62, 75, 90];

  /* ── the glyphs, and why they are sized the way they are ────────────────
     The headline of this game is CLICK THE BIGGEST SHAPE, so "biggest" has to
     have an answer. Drawn at the same box, a triangle carries 38% of a
     square's ink and a slim five-point star about 24% — so a "large" triangle
     beside a "small" square would genuinely be the smaller of the two, and the
     headline would be asking an unanswerable question. That is not a polish
     issue; it is the game lying.

     So a shape's `size` is its intended visual weight, not its drawn box, and
     each kind's box is scaled by 1/sqrt(unitArea) to put every kind on equal
     ink at equal weight. Area is the right measure to equalise — it is the
     standard for comparing symbols of different silhouette, and it is the one
     that makes the ordering provable: with areas equal per unit weight, ink
     area is strictly monotone in `size` for every pair of kinds, which the
     self-check verifies exhaustively rather than taking on trust.

     The cost is extent: equal ink means the star's bounding box runs ~1.4x the
     square's, and a shape's extent is the other thing an eye reads as "big".
     Nothing can make both metrics agree — they are different functions of the
     silhouette — so the star is drawn deliberately fat (inner radius .55 of
     the outer, rather than the slim .382 of a pentagram) to hold that
     disagreement down. A slim star would need a 1.68x box.

     The defining numbers live here, once. The SVG path and the area are both
     derived from them, so the drawn shape and the shape the maths believes in
     cannot drift apart. */
  var GLYPH = {
    /* every kind is drawn inside a 100x100 viewBox, centred on (50, 50) */
    circle:   { r: 44 },
    square:   { side: 82 },
    triangle: { base: 90, height: 84 },
    star:     { points: 5, r: 46, innerRatio: 0.55 }
  };

  // Ink area of one kind's glyph, as a fraction of its 100x100 box.
  function unitArea(kind) {
    var g = GLYPH[kind];
    if (kind === 'circle') return Math.PI * g.r * g.r / 10000;
    if (kind === 'square') return g.side * g.side / 10000;
    if (kind === 'triangle') return 0.5 * g.base * g.height / 10000;
    /* a p-pointed star is 2p triangles about the centre, alternating radii */
    return g.points * g.r * (g.r * g.innerRatio) * Math.sin(Math.PI / g.points) / 10000;
  }

  // Scale each kind's box so equal `size` means equal ink. The square is the
  // reference simply because it is the densest, which keeps every factor >= 1.
  var KIND_SCALE = (function () {
    var ref = unitArea('square');
    var out = {};
    for (var i = 0; i < KINDS.length; i++) {
      out[KINDS[i]] = Math.sqrt(ref / unitArea(KINDS[i]));
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
  function smallest(shapes) {
    var order = shapes.slice().sort(function (a, b) { return a.size - b.size; });
    return order.length ? order[0].i : -1;
  }
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

  // The one ink shared by exactly two shapes, when there is exactly one such
  // ink and no ink appears more often than twice. Otherwise null — which is
  // what makes "the larger of the two" a single, defensible shape.
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

  // `rank` is how hard the clause is to hold in mind, and it decides the order
  // clauses are introduced in — easy ones first, so the ramp is a ramp.
  //
  // `needs` is what the generator must guarantee for this clause to be able to
  // fire at all without ambiguity. The generator reads it; nothing else does.
  var CLAUSES = [
    {
      id: 'yellow-smallest',
      rank: 1,
      text: 'If the stock is yellow, click the smallest.',
      needs: { stock: 'yellow' },
      when: function (r) { return r.stock === 'yellow'; },
      pick: function (r) { return smallest(r.shapes); }
    },
    {
      id: 'star',
      rank: 1,
      text: 'If there is a star, click the star.',
      needs: { exactlyOneKind: 'star' },
      when: function (r) { return countKind(r.shapes, 'star') === 1; },
      pick: function (r) { return ofKind(r.shapes, 'star'); }
    },
    {
      id: 'pink-right',
      rank: 2,
      text: 'If the stock is pink, click the shape on the right.',
      needs: { stock: 'pink' },
      when: function (r) { return r.stock === 'pink'; },
      pick: function (r) { return r.shapes[r.shapes.length - 1].i; }
    },
    {
      id: 'black',
      rank: 2,
      text: 'If a shape is black, click it.',
      needs: { exactlyOneInk: 'black' },
      when: function (r) { return countInk(r.shapes, 'black') === 1; },
      pick: function (r) { return ofInk(r.shapes, 'black'); }
    },
    {
      id: 'three-left',
      rank: 3,
      text: 'If there are exactly three shapes, click the shape on the left.',
      needs: { count: 3 },
      when: function (r) { return r.shapes.length === 3; },
      pick: function (r) { return r.shapes[0].i; }
    },
    {
      id: 'no-circle-biggest',
      rank: 3,
      text: 'If there is no circle, click the biggest.',
      needs: { noKind: 'circle' },
      when: function (r) { return countKind(r.shapes, 'circle') === 0; },
      pick: function (r) { return byRank(r.shapes, 0); }
    },
    {
      id: 'grey-second',
      rank: 4,
      text: 'If the stock is grey, click the second largest.',
      needs: { stock: 'grey', minCount: 2 },
      when: function (r) { return r.stock === 'grey' && r.shapes.length >= 2; },
      pick: function (r) { return byRank(r.shapes, 1); }
    },
    {
      id: 'all-one-ink-right',
      rank: 4,
      text: 'If every shape is the same colour, click the shape on the right.',
      needs: { allOneInk: true },
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
      text: 'If there are two or more triangles, click the smallest triangle.',
      needs: { minKind: { kind: 'triangle', n: 2 } },
      when: function (r) { return countKind(r.shapes, 'triangle') >= 2; },
      pick: function (r) { return smallestOfKind(r.shapes, 'triangle'); }
    },
    {
      id: 'shared-ink',
      rank: 5,
      text: 'If two shapes share a colour, click the larger of the two.',
      needs: { lonePair: true },
      when: function (r) { return lonePair(r.shapes) !== null; },
      pick: function (r) {
        var ink = lonePair(r.shapes);
        if (ink === null) return -1;
        var pair = r.shapes.filter(function (s) { return s.ink === ink; });
        pair.sort(function (a, b) { return b.size - a.size; });
        return pair[0].i;
      }
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

  function stock(id) {
    for (var i = 0; i < STOCKS.length; i++) if (STOCKS[i].id === id) return STOCKS[i];
    return null;
  }
  function ink(id) {
    for (var i = 0; i < INKS.length; i++) if (INKS[i].id === id) return INKS[i];
    return null;
  }

  return {
    STOCKS: STOCKS,
    INKS: INKS,
    KINDS: KINDS,
    SIZE_POOL: SIZE_POOL,
    GLYPH: GLYPH,
    KIND_SCALE: KIND_SCALE,
    unitArea: unitArea,
    drawnBox: drawnBox,
    glyphMarkup: glyphMarkup,
    HEADLINE: HEADLINE,
    CLAUSES: CLAUSES,
    resolve: resolve,
    byId: byId,
    stock: stock,
    ink: ink,
    /* exported for the generator and the self-check */
    countKind: countKind,
    countInk: countInk,
    lonePair: lonePair
  };
})();
