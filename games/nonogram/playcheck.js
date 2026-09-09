// Nonogram — end-to-end check.  Run it with:  node playcheck.js
//
// selfcheck.js proves the plates and the solver. This drives the whole game —
// game.js included — against a small fake DOM and a clock we own, which is the
// pattern CLAUDE.md describes for Tetris and 2048. It is the only way to
// execute the screen machine, the marking, the hint, the win test and the
// resume without a browser.
//
// It plays by reading the clue gutters out of the fake DOM rather than by being
// handed the answer, so the numbers the player can see are proved sufficient.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); }

/* ── a fake DOM, just wide enough ──────────────────────────────────────── */

function Style() { this.props = {}; }
Style.prototype.setProperty = function (k, v) { this.props[k] = v; };

function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.children = [];
  this.attrs = {};
  this.style = new Style();
  this.listeners = {};
  this.hidden = false;
  this.className = '';
  this.tabIndex = 0;
  this._text = '';
  this.focused = 0;
}

Object.defineProperty(El.prototype, 'textContent', {
  get: function () {
    if (this.children.length) {
      return this.children.map(function (c) { return c.textContent; }).join('');
    }
    return this._text;
  },
  set: function (v) { this._text = String(v); this.children = []; }
});

Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html || ''; },
  set: function (v) {
    this._html = String(v);
    if (v === '') { this.children = []; this._text = ''; }
  }
});

Object.defineProperty(El.prototype, 'id', {
  get: function () { return this.attrs.id || ''; },
  set: function (v) { this.attrs.id = String(v); byId[v] = this; }
});

El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
};
El.prototype.addEventListener = function (t, fn) {
  (this.listeners[t] = this.listeners[t] || []).push(fn);
};
El.prototype.focus = function () { this.focused++; lastFocused = this; };
El.prototype.setPointerCapture = function () { /* nothing to capture here */ };
El.prototype.closest = function (sel) {
  var cls = sel.replace('.', '');
  var node = this;
  while (node) {
    if ((' ' + node.className + ' ').indexOf(' ' + cls + ' ') >= 0) return node;
    node = node.parentNode;
  }
  return null;
};
El.prototype.fire = function (type, ev) {
  var ls = this.listeners[type] || [];
  for (var i = 0; i < ls.length; i++) ls[i].call(this, ev || {});
};
El.prototype.all = function () {
  var out = [];
  this.children.forEach(function (c) { out.push(c); out = out.concat(c.all()); });
  return out;
};
El.prototype.has = function (cls) {
  return (' ' + this.className + ' ').indexOf(' ' + cls + ' ') >= 0;
};

var lastFocused = null;

/* Read the id list out of index.html rather than keeping a copy here. A
   hand-maintained list drifts: getElementById would hand the game a live
   element for an id the markup no longer has, and the run would pass while
   testing nothing. Deriving it means the harness cannot disagree with the
   page it is meant to be driving. */
var MARKUP = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var IDS = (MARKUP.match(/ id="[^"]+"/g) || []).map(function (m) {
  return m.replace(/ id="/, '').replace(/"$/, '');
});
if (IDS.length < 20) { console.log('could not read the ids out of index.html'); process.exit(1); }

/* Seed each element's class from the markup too. game.js routes clicks with
   closest('.tab') / closest('.plate-card'), so an element the harness invents
   with no class is unreachable — the click would land and quietly do nothing. */
var CLASS_OF = {};
var ATTRS_OF = {};
(MARKUP.match(/<[a-zA-Z][^>]*>/g) || []).forEach(function (tag) {
  var id = tag.match(/ id="([^"]+)"/);
  if (!id) return;
  var cls = tag.match(/ class="([^"]+)"/);
  if (cls) CLASS_OF[id[1]] = cls[1];
  var bag = {};
  (tag.match(/ [a-zA-Z-]+="[^"]*"/g) || []).forEach(function (pair) {
    var k = pair.slice(1, pair.indexOf('='));
    var v = pair.slice(pair.indexOf('=') + 2, -1);
    if (k !== 'class') bag[k] = v;
  });
  ATTRS_OF[id[1]] = bag;
});

/* The scripts run in the order index.html loads them, not an order copied
   here — a reordered page would otherwise pass headlessly and throw in a
   browser. */
var SCRIPTS = (MARKUP.match(/<script src="([^"]+)"/g) || []).map(function (m) {
  return m.replace(/.*src="/, '').replace(/"$/, '');
});

var byId = {};
IDS.forEach(function (id) { byId[id] = new El('div'); });

var store = {};
var docListeners = {};
var now = 1757300000000;
var timers = [];

function makeSandbox() {
  var sb = {
    document: {
      getElementById: function (id) { return byId[id] || null; },
      createElement: function (tag) { return new El(tag); },
      addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
      elementFromPoint: function () { return null; },
      hidden: false
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setInterval: function (fn) { timers.push(fn); return timers.length; },
    clearInterval: function () {},
    Date: { now: function () { return now; } },
    Math: Math, JSON: JSON, console: console,
    parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite, isNaN: isNaN,
    String: String, Number: Number, Object: Object, Array: Array
  };
  sb.window = sb;
  sb.window.addEventListener = function (t, fn) {
    (docListeners['window:' + t] = docListeners['window:' + t] || []).push(fn);
  };
  return sb;
}

function boot() {
  /* reset the element tree, keeping the same objects the game will look up */
  IDS.forEach(function (id) {
    var e = byId[id];
    e.children = [];
    /* the element starts life carrying the attributes the markup gives it —
       data-size, role, aria-*, the lot — so the game can route off them */
    e.attrs = {};
    var seed = ATTRS_OF[id] || {};
    for (var k in seed) if (Object.prototype.hasOwnProperty.call(seed, k)) e.attrs[k] = seed[k];
    e.attrs.id = id;
    e.listeners = {};
    e.hidden = false;
    e.className = CLASS_OF[id] || '';
    e._text = '';
    e._html = '';
    e.style = new Style();
  });
  docListeners = {};
  timers = [];
  lastFocused = null;

  var sb = makeSandbox();
  var ctx = vm.createContext(sb);
  SCRIPTS.forEach(function (f) {
    try {
      vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
    } catch (e) {
      console.log('THREW while loading ' + f + ': ' + e.message);
      console.log(e.stack);
      process.exit(1);
    }
  });
  return sb;
}

var sb = boot();
var N = sb.INK.Nonogram;
var P = sb.INK.Pictures;

/* ── helpers over the fake DOM ─────────────────────────────────────────── */

/* The finished plate is a state of the play screen, not a screen of its own:
   the board stays up so the player can see the picture they made. So 'first
   unhidden section wins' is not enough any more — play and finish are open
   together, and a probe that just answered 'play' would leave every
   done-screen assertion below passing while testing nothing. */
function screen() {
  var index = !byId['screen-index'].hidden;
  var play = !byId['screen-play'].hidden;
  if (index && play) {
    console.log('FAIL: the index and the plate are on screen at the same time');
    process.exit(1);
  }
  if (index) return 'index';
  if (play) return byId.finish.hidden ? 'play' : 'done';
  return '(none)';
}

function squares() {
  return byId.board.all().filter(function (e) { return e.getAttribute('data-x') !== null; });
}
function sq(x, y) {
  var all = squares();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getAttribute('data-x') === String(x) && all[i].getAttribute('data-y') === String(y)) return all[i];
  }
  return null;
}
function tap(x, y, button) {
  var cell = sq(x, y);
  if (!cell) { check(false, 'no square at ' + x + ',' + y); return; }
  byId.board.fire('pointerdown', { target: cell, button: button || 0, pointerId: 1,
    preventDefault: function () {}, clientX: 0, clientY: 0 });
  byId.board.fire('pointerup', {});
}
function key(k) {
  var ev = { key: k, preventDefault: function () { this.defaulted = true; } };
  (docListeners.keydown || []).forEach(function (fn) { fn(ev); });
  return ev;
}

// Reads the clue gutters back out of the DOM, so the puzzle is solved from what
// is printed rather than from the picture.
function cluesFromDom(dim) {
  var rows = [], cols = [];
  var nodes = byId.board.all();
  function numbersIn(prefix, i) {
    for (var k = 0; k < nodes.length; k++) {
      if (nodes[k].attrs.id === prefix + i) {
        return nodes[k].children.map(function (b) { return parseInt(b.textContent, 10); });
      }
    }
    return null;
  }
  for (var y = 0; y < dim; y++) rows.push(numbersIn('rc', y));
  for (var x = 0; x < dim; x++) cols.push(numbersIn('cc', x));
  return { rows: rows, cols: cols };
}

/* ── the index ─────────────────────────────────────────────────────────── */

/* One navigation helper per move, so the next screen change edits four
   functions instead of every call site below. */
function chooseSize(id) {
  byId.sizeTabs.fire('click', { target: byId['tab-' + id] });
}
function plateCards() {
  return byId.plates.all().filter(function (e) { return e.has('plate-card'); });
}
function openPlate(i) {
  var cards = plateCards();
  byId.plates.fire('click', { target: cards[i] });
}

check(screen() === 'index', 'the game did not open on the index (opened on ' + screen() + ')');
check(byId.resume.hidden === true, 'a fresh game offers something to carry on');

/* the size tabs replace the old size screen: they swap the panel, not the screen */
var tabs = ['small', 'medium', 'large'].map(function (id) { return byId['tab-' + id]; });
check(tabs.every(function (t) { return t; }), 'the index is missing a size tab');
check(byId['tab-small'].attrs['aria-selected'] === 'true',
  'the index does not open with a size selected');

P.sizes().forEach(function (sz) {
  chooseSize(sz.id);
  check(screen() === 'index', 'choosing a size navigated away from the index');
  check(plateCards().length === P.count(sz.id),
    'the ' + sz.id + ' tab lists ' + plateCards().length + ', expected ' + P.count(sz.id));
  check(byId['tab-' + sz.id].attrs['aria-selected'] === 'true',
    'the ' + sz.id + ' tab did not mark itself selected');
});

chooseSize('small');

/* the title is the reward, so an unfinished plate must not print its name */
var names = plateCards().map(function (c) {
  var n = c.all().filter(function (e) { return e.has('plate-card__name'); })[0];
  return n ? n.textContent : '(no name node)';
});
check(names.every(function (n) { return n === ''; }),
  'an unprinted plate printed something where its title goes: ' + names.join(', '));
check(plateCards().every(function (c) {
  return c.all().filter(function (e) { return e.has('plate-card__name--blank'); }).length === 1;
}), 'an unprinted plate does not print the ruled blank where its title will go');
P.plates('small').forEach(function (pl) {
  check(names.indexOf(pl.name) < 0, 'plate title "' + pl.name + '" leaked into the index');
});

/* ── playing one plate, from the printed numbers only ──────────────────── */

openPlate(0);
check(screen() === 'play', 'choosing a plate did not start it (on ' + screen() + ')');

var firstPlate = P.plates('small')[0];
var dim = firstPlate.rows.length;
check(squares().length === dim * dim,
  'the board drew ' + squares().length + ' squares, expected ' + dim * dim);

/* the clues in the gutters must be the clues for this plate */
(function () {
  var shown = cluesFromDom(dim);
  var want = N.cluesOf(N.parse(firstPlate.rows));
  for (var y = 0; y < dim; y++) {
    check(shown.rows[y] && shown.rows[y].join(',') === want.rows[y].join(','),
      'row ' + y + ' prints [' + shown.rows[y] + '] but should print [' + want.rows[y] + ']');
  }
  for (var x = 0; x < dim; x++) {
    check(shown.cols[x] && shown.cols[x].join(',') === want.cols[x].join(','),
      'column ' + x + ' prints [' + shown.cols[x] + '] but should print [' + want.cols[x] + ']');
  }
})();

/* one tap inks, two crosses off, three clears — and the label says so */
(function () {
  tap(0, 0);
  check(sq(0, 0).has('sq--ink'), 'one tap did not ink the square: ' + sq(0, 0).className);
  check(/inked/.test(sq(0, 0).getAttribute('aria-label')), 'an inked square does not say so');
  tap(0, 0);
  check(sq(0, 0).has('sq--out'), 'a second tap did not cross the square off: ' + sq(0, 0).className);
  check(/crossed off/.test(sq(0, 0).getAttribute('aria-label')), 'a crossed square does not say so');
  tap(0, 0);
  check(!sq(0, 0).has('sq--ink') && !sq(0, 0).has('sq--out'),
    'a third tap did not clear the square: ' + sq(0, 0).className);
  check(/unmarked/.test(sq(0, 0).getAttribute('aria-label')), 'a cleared square does not say so');

  /* the right button goes straight to a cross, and straight back */
  tap(1, 0, 2);
  check(sq(1, 0).has('sq--out'), 'the right button did not cross the square off');
  tap(1, 0, 2);
  check(!sq(1, 0).has('sq--out'), 'the right button did not clear its own cross');
})();

/* the fifth rules and the closing edges are on the squares that need them */
(function () {
  var mid = P.plates('medium')[0];
  var d2 = mid.rows.length;
  byId.playBackBtn.fire('click');
  chooseSize('medium');
  openPlate(0);

  check(sq(5, 0).has('sq--rule-l'), 'the sixth column does not carry a heavy rule');
  check(!sq(4, 0).has('sq--rule-l'), 'the fifth column carries a heavy rule it should not');
  check(sq(0, 5).has('sq--rule-t'), 'the sixth row does not carry a heavy rule');
  check(sq(d2 - 1, 0).has('sq--edge-r'), 'the last column does not close the grid');
  check(sq(0, d2 - 1).has('sq--edge-b'), 'the last row does not close the grid');
  check(!sq(0, 0).has('sq--edge-r'), 'the first column is closing the grid');
  /* and the plate is ruled the same on all four sides, not heavy on two */
  check(sq(0, 0).has('sq--edge-l') && sq(0, 0).has('sq--edge-t'),
    'the top-left square does not carry the outer rule: ' + sq(0, 0).className);
  check(!sq(1, 1).has('sq--edge-l') && !sq(1, 1).has('sq--edge-t'),
    'an inner square is carrying an outer rule: ' + sq(1, 1).className);

  /* every square names its own position, and is described by its two clue
     lines — the numbers a screen reader needs to play at all */
  check(sq(3, 2).getAttribute('aria-describedby') === 'rc2 cc3',
    'a square is not described by its row and column clues: ' +
    sq(3, 2).getAttribute('aria-describedby'));
  check(/Row 3, column 4/.test(sq(3, 2).getAttribute('aria-label')),
    'a square does not name its position: ' + sq(3, 2).getAttribute('aria-label'));
})();

/* ── the hint only ever says what the numbers say ──────────────────────── */

(function () {
  var pl = P.plates('medium')[0];
  var sol = N.parse(pl.rows);
  var d2 = sol.length;

  /* from a blank plate the hint must find something, ink or blank, and it must
     agree with the picture — a hint that lies is worse than no hint */
  byId.restartBtn.fire('click');
  var asked = 0;
  for (var i = 0; i < 12; i++) {
    byId.hintBtn.fire('click');
    var m = /Row (\d+) and column (\d+)/.exec(byId.hintLine.textContent);
    if (!m) break;
    asked++;
    var hy = parseInt(m[1], 10) - 1, hx = parseInt(m[2], 10) - 1;
    var said = /: ink\./.test(byId.hintLine.textContent);
    check(said === !!sol[hy][hx],
      'the hint said ' + (said ? 'ink' : 'blank') + ' at row ' + (hy + 1) +
      ', column ' + (hx + 1) + ', but the plate says otherwise');
    /* and the square it named must actually carry that mark now */
    var cell = sq(hx, hy);
    check(said ? cell.has('sq--ink') : cell.has('sq--out'),
      'the hint named row ' + (hy + 1) + ', column ' + (hx + 1) + ' as ' +
      (said ? 'ink' : 'blank') + ' but left the square as "' + cell.className + '"');
  }
  check(asked >= 5, 'the hint only produced ' + asked + ' deductions on a blank plate');

  /* a wrong mark must be reported as a contradiction, not worked around */
  byId.restartBtn.fire('click');
  var wrong = null;
  for (var y = 0; y < d2 && !wrong; y++) {
    for (var x = 0; x < d2; x++) if (!sol[y][x]) { wrong = [x, y]; break; }
  }
  tap(wrong[0], wrong[1]);                      /* ink a square that is blank */
  for (var g = 0; g < 40; g++) {
    byId.hintBtn.fire('click');
    if (/cannot be right/.test(byId.hintLine.textContent)) break;
  }
  check(/cannot be right/.test(byId.hintLine.textContent),
    'the hint never noticed a square inked where the plate is blank: "' +
    byId.hintLine.textContent + '"');
})();

/* ── finishing a plate, solved from the printed numbers ────────────────── */

var solvedMs;
(function () {
  byId.restartBtn.fire('click');
  var pl = P.plates('medium')[0];
  var d2 = pl.rows.length;

  /* solve it from the gutters, never from pictures.js */
  var shown = cluesFromDom(d2);
  var res = N.solve(shown);
  check(res.status === 'solved', 'the printed numbers alone did not solve the plate: ' + res.status);

  now += 65000;                                  /* a minute and five seconds */
  for (var y = 0; y < d2; y++) {
    for (var x = 0; x < d2; x++) {
      if (res.grid[y][x] === N.FILLED) tap(x, y);
    }
  }

  check(screen() === 'done', 'inking every square did not finish the plate (on ' + screen() + ')');
  check(byId.doneName.textContent === pl.name,
    'the finish card names "' + byId.doneName.textContent + '", expected "' + pl.name + '"');
  check(/first printing/.test(byId.doneStats.textContent),
    'a first finish is not reported as one: "' + byId.doneStats.textContent + '"');
  check(/^1:0/.test(byId.doneStats.textContent),
    'the finish card reports "' + byId.doneStats.textContent + '", expected about 1:05');

  /* The plate resolves in place rather than being reprinted somewhere else,
     so the proof is the board itself: every inked square, and only those,
     must match the picture. Counting cells would pass on a blank plate. */
  check(byId.board.className.indexOf('board--done') >= 0,
    'the finished board was not marked resolved: ' + byId.board.className);
  var wrong = 0;
  for (var py = 0; py < d2; py++) {
    for (var px = 0; px < d2; px++) {
      var inked = sq(px, py).has('sq--ink');
      if (inked !== (res.grid[py][px] === N.FILLED)) wrong++;
    }
  }
  check(wrong === 0, wrong + ' squares of the finished plate do not match the picture');
  check(squares().length === d2 * d2,
    'the finished plate has ' + squares().length + ' squares, expected ' + d2 * d2);

  var saved = JSON.parse(store['inkbynumbers_stats_v1'] || '{}');
  check(saved.solved && typeof saved.solved.medium[pl.id] === 'number',
    'the finish was not recorded: ' + JSON.stringify(saved.solved));
  solvedMs = saved.solved.medium[pl.id];
  check(saved.current === null, 'a finished plate is still listed as in progress');
})();

/* the index must now print the title it was withholding */
(function () {
  byId.doneIndexBtn.fire('click');
  check(screen() === 'index', 'the finish card did not go back to the index');
  var cards = byId.plates.all().filter(function (e) { return e.has('plate-card'); });
  var first = cards[0].all().filter(function (e) { return e.has('plate-card__name'); })[0];
  check(first.textContent === P.plates('medium')[0].name,
    'a finished plate still reads "' + first.textContent + '"');
  check(cards[0].has('plate-card--done'), 'a finished plate is not marked as finished');
})();

/* a slower second run must not overwrite the best time */
(function () {
  var cards = byId.plates.all().filter(function (e) { return e.has('plate-card'); });
  byId.plates.fire('click', { target: cards[0] });
  var d2 = P.plates('medium')[0].rows.length;
  var res = N.solve(cluesFromDom(d2));
  now += 200000;
  for (var y = 0; y < d2; y++) {
    for (var x = 0; x < d2; x++) if (res.grid[y][x] === N.FILLED) tap(x, y);
  }
  check(screen() === 'done', 'the second run did not finish');
  check(/best stands at/.test(byId.doneStats.textContent),
    'a slower run did not keep the old best: "' + byId.doneStats.textContent + '"');
  var saved = JSON.parse(store['inkbynumbers_stats_v1'] || '{}');
  check(saved.solved.medium[P.plates('medium')[0].id] === solvedMs,
    'a slower run overwrote the best time');
})();

/* ── crossing off the blanks must not be required ──────────────────────── */

(function () {
  byId.doneIndexBtn.fire('click');
  var cards = byId.plates.all().filter(function (e) { return e.has('plate-card'); });
  byId.plates.fire('click', { target: cards[1] });
  var pl = P.plates('medium')[1];
  var sol = N.parse(pl.rows);
  var d2 = sol.length;
  /* cross off every blank first, then ink — the win must land on the last ink */
  for (var y = 0; y < d2; y++) {
    for (var x = 0; x < d2; x++) if (!sol[y][x]) tap(x, y, 2);
  }
  check(screen() === 'play', 'crossing off blanks alone finished the plate');
  for (y = 0; y < d2; y++) {
    for (x = 0; x < d2; x++) if (sol[y][x]) tap(x, y);
  }
  check(screen() === 'done', 'a plate with every blank crossed off did not finish');
})();

/* ── the keyboard alone ────────────────────────────────────────────────── */

(function () {
  byId.doneIndexBtn.fire('click');
  var cards = byId.plates.all().filter(function (e) { return e.has('plate-card'); });
  byId.plates.fire('click', { target: cards[2] });
  var pl = P.plates('medium')[2];
  var sol = N.parse(pl.rows);
  var d2 = sol.length;

  check(lastFocused && lastFocused.getAttribute('data-x') === '0',
    'starting a plate did not put the cursor on the first square');

  /* arrows must move and must not run off the edge */
  key('ArrowLeft'); key('ArrowUp');
  check(lastFocused.getAttribute('data-x') === '0' && lastFocused.getAttribute('data-y') === '0',
    'the cursor walked off the top-left corner');
  var ev = key('ArrowRight');
  check(ev.defaulted === true, 'an arrow key did not preventDefault while playing');
  check(lastFocused.getAttribute('data-x') === '1', 'ArrowRight did not move the cursor');
  for (var i = 0; i < d2 + 4; i++) key('ArrowRight');
  check(lastFocused.getAttribute('data-x') === String(d2 - 1),
    'the cursor walked off the right edge to ' + lastFocused.getAttribute('data-x'));

  /* space inks, x crosses */
  key('ArrowLeft');
  var at = { x: parseInt(lastFocused.getAttribute('data-x'), 10), y: 0 };
  key(' ');
  check(sq(at.x, 0).has('sq--ink'), 'Space did not ink the square under the cursor');
  key('x');
  check(sq(at.x, 0).has('sq--out'), 'X did not cross off the square under the cursor');
  key('x');
  check(!sq(at.x, 0).has('sq--out'), 'X did not clear its own cross');

  /* H asks for a deduction */
  byId.hintLine.textContent = '';
  key('h');
  check(byId.hintLine.textContent.length > 10, 'H did not produce a deduction');

  /* and a whole plate can be finished without a pointer */
  var res = N.solve(cluesFromDom(d2));
  var cx = 0, cy = 0;
  function moveTo(x, y) {
    while (cx < x) { key('ArrowRight'); cx++; }
    while (cx > x) { key('ArrowLeft'); cx--; }
    while (cy < y) { key('ArrowDown'); cy++; }
    while (cy > y) { key('ArrowUp'); cy--; }
  }
  /* clear whatever the poking above left behind */
  byId.restartBtn.fire('click');
  cx = 0; cy = 0;
  for (var y2 = 0; y2 < d2; y2++) {
    for (var x2 = 0; x2 < d2; x2++) {
      if (res.grid[y2][x2] !== N.FILLED) continue;
      moveTo(x2, y2);
      key(' ');
    }
  }
  check(screen() === 'done', 'a plate could not be finished from the keyboard alone');
  console.log('keyboard-only finish   ' + pl.name);
})();

/* ── Escape walks back out ─────────────────────────────────────────────── */

/* Written as the guarantee rather than as today's ladder: from the deepest
   state, Escape reaches the top in a bounded number of presses and settles
   there. That survives the next screen change; pinning the exact steps would
   not, and this game has now changed shape twice. */
(function () {
  var seen = [screen()];
  for (var i = 0; i < 6 && screen() !== 'index'; i++) {
    key('Escape');
    seen.push(screen());
  }
  check(screen() === 'index',
    'Escape did not walk back to the index in six presses: ' + seen.join(' -> '));
  key('Escape');
  check(screen() === 'index',
    'Escape on the index went somewhere: ' + screen() + ' (the back tab is the way out)');
})();

/* ── the plate in hand survives a reload ───────────────────────────────── */

(function () {
  chooseSize('large');
  openPlate(0);

  var pl = P.plates('large')[0];
  var sol = N.parse(pl.rows);
  var marked = 0;
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < sol.length; x++) {
      if (sol[y][x]) { tap(x, y); marked++; }
    }
  }
  now += 130000;
  byId.playBackBtn.fire('click');                 /* leaving must bank it */

  var kept = JSON.parse(store['inkbynumbers_stats_v1']).current;
  check(kept && kept.size === 'large' && kept.plate === pl.id,
    'leaving a plate did not keep it: ' + JSON.stringify(kept));
  check(kept.cells.split('1').length - 1 === marked,
    'the kept plate has ' + (kept.cells.split('1').length - 1) + ' inked squares, expected ' + marked);
  check(kept.elapsed >= 130000, 'the kept clock reads ' + kept.elapsed + ', expected at least 130000');

  /* now reload the whole game against the same storage */
  sb = boot();
  N = sb.INK.Nonogram;
  P = sb.INK.Pictures;

  check(screen() === 'index', 'the reloaded game did not open on the index');
  check(byId.resume.hidden === false, 'the reloaded game does not offer to carry on');
  check(/Large plate 1/.test(byId.resumeWhat.textContent),
    'the carry-on line reads "' + byId.resumeWhat.textContent + '"');
  check(/2:1/.test(byId.resumeWhat.textContent),
    'the carry-on line lost the clock: "' + byId.resumeWhat.textContent + '"');

  byId.resumeBtn.fire('click');
  check(screen() === 'play', 'carrying on did not open the plate');
  var back = 0;
  squares().forEach(function (s) { if (s.has('sq--ink')) back++; });
  check(back === marked, 'carrying on restored ' + back + ' inked squares, expected ' + marked);
  check(/^2:1/.test(byId.clock.textContent),
    'the carried-on clock reads ' + byId.clock.textContent + ', expected about 2:10');

  /* and putting it back clears it */
  byId.playBackBtn.fire('click');
  byId.discardBtn.fire('click');
  check(byId.resume.hidden === true, 'putting the plate back left it on the menu');
  check(JSON.parse(store['inkbynumbers_stats_v1']).current === null,
    'putting the plate back did not clear it from storage');
})();

/* ── the clock stops when nobody is watching ───────────────────────────── */

(function () {
  chooseSize('small');
  openPlate(3);

  now += 10000;
  timers.forEach(function (fn) { fn(); });
  check(byId.clock.textContent === '0:10', 'the clock reads ' + byId.clock.textContent + ' after 10s');

  sb.document.hidden = true;
  (docListeners.visibilitychange || []).forEach(function (fn) { fn({}); });
  now += 600000;                                  /* ten minutes away */
  sb.document.hidden = false;
  (docListeners.visibilitychange || []).forEach(function (fn) { fn({}); });
  timers.forEach(function (fn) { fn(); });
  check(byId.clock.textContent === '0:10',
    'ten minutes in another tab put ' + byId.clock.textContent + ' on the clock');

  now += 5000;
  timers.forEach(function (fn) { fn(); });
  check(byId.clock.textContent === '0:15',
    'the clock did not restart on return: ' + byId.clock.textContent);
})();

/* ── report ────────────────────────────────────────────────────────────── */

console.log('plates in the set      ' + (P.count('small') + P.count('medium') + P.count('large')));
console.log('finishes recorded      ' + JSON.stringify(JSON.parse(store['inkbynumbers_stats_v1']).solved));

if (failures.length) {
  console.log('\nFAILED (' + failures.length + ')');
  failures.slice(0, 25).forEach(function (f) { console.log('  - ' + f); });
  if (failures.length > 25) console.log('  ... and ' + (failures.length - 25) + ' more');
  process.exit(1);
}
console.log('\nplayed end to end from the printed numbers, by pointer and by keyboard');
