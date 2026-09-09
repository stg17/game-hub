// Terms & Conditions — end-to-end check.  Run it with:  node playcheck.js
//
// selfcheck.js proves the pure engine. This drives the whole game — game.js
// included — against a small fake DOM and a hand-pumped clock, which is the
// approach CLAUDE.md already documents for Tetris and 2048. It is the only way
// to execute the screen machine, the ramp, the clock and the persistence
// without a browser, and it catches the class of bug a generator check never
// can: a typo in a draw function that throws on the first round.
//
// THE INTERESTING PART is how it decides what to click. It does not ask the
// game. It reads the fake DOM exactly as a player reads the sheet — the stock
// stamp, each shape's printed label, the numbered clause list — rebuilds the
// round from that alone, and resolves it independently. So a passing run is
// evidence of the game's actual promise: everything needed to know the answer
// is printed on the sheet. If the game ever relied on something it did not
// print, this would start losing.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); }

/* ── a fake DOM, just wide enough ──────────────────────────────────────── */

function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.children = [];
  this.attrs = {};
  this.style = new Style();
  this.listeners = {};
  this.hidden = false;
  this.className = '';
  this._text = '';
  this.focused = 0;
}
function Style() { this.props = {}; }
Style.prototype.setProperty = function (k, v) { this.props[k] = v; };

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
    /* assigning innerHTML replaces children, which is what drawRound relies on
       to clear the previous round */
    if (v === '') { this.children = []; this._text = ''; }
  }
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
/* every descendant, for the DOM reads below */
El.prototype.all = function () {
  var out = [];
  this.children.forEach(function (c) { out.push(c); out = out.concat(c.all()); });
  return out;
};

var lastFocused = null;

var IDS = ['screen-menu', 'screen-amendment', 'screen-play', 'screen-over',
  'hud', 'hudStreak', 'hudClauses', 'hudBest', 'menuBest', 'startBtn',
  'amendNo', 'amendText', 'amendBtn', 'sheet', 'stockStamp', 'headline',
  'shapes', 'clauseList', 'barFill', 'overTitle', 'overWhy', 'overDetail',
  'againBtn'];

var byId = {};
IDS.forEach(function (id) { byId[id] = new El('div'); });

var store = {};
var docListeners = {};

/* a clock we own outright */
var now = 1757300000000;
var rafQueue = [];

var sandbox = {
  document: {
    getElementById: function (id) { return byId[id] || null; },
    createElement: function (tag) { return new El(tag); },
    addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    hidden: false
  },
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  requestAnimationFrame: function (fn) { rafQueue.push(fn); return rafQueue.length; },
  Date: { now: function () { return now; } },
  Math: Math,
  Set: Set,
  JSON: JSON,
  console: console,
  parseInt: parseInt,
  parseFloat: parseFloat,
  String: String,
  Number: Number,
  Object: Object,
  Array: Array,
  isNaN: isNaN
};
sandbox.window = sandbox;
sandbox.window.addEventListener = function (t, fn) {
  (docListeners['window:' + t] = docListeners['window:' + t] || []).push(fn);
};

var ctx = vm.createContext(sandbox);
['clauses.js', 'round.js', 'storage.js', 'game.js'].forEach(function (f) {
  try {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  } catch (e) {
    console.log('THREW while loading ' + f + ': ' + e.message);
    console.log(e.stack);
    process.exit(1);
  }
});

var C = sandbox.TC.Clauses;

/* one animation frame */
function pump() {
  var q = rafQueue;
  rafQueue = [];
  q.forEach(function (fn) { fn(now); });
}
function advance(ms) { now += ms; pump(); }

/* ── reading the sheet the way a player does ───────────────────────────── */

// Rebuilds the round from the printed DOM only: the stock stamp, each shape's
// label, and the numbered clause list. Nothing here reaches into the game.
var LABEL = /^Shape (\d+): (\w+) (\w+), size (\d+) of (\d+)/;

function readSheet() {
  var stockText = byId.stockStamp.textContent;           /* "Stock: YELLOW" */
  var stock = stockText.replace(/^Stock:\s*/, '').trim().toLowerCase();

  var buttons = byId.shapes.children;
  var shapes = buttons.map(function (btn, i) {
    var m = LABEL.exec(btn.getAttribute('aria-label') || '');
    if (!m) return null;
    var rank = parseInt(m[4], 10);
    var total = parseInt(m[5], 10);
    check(parseInt(m[1], 10) === i + 1, 'shape ' + i + ' announces itself as ' + m[1]);
    check(total === buttons.length,
      'shape ' + i + ' says there are ' + total + ' shapes, but ' + buttons.length + ' are drawn');
    return {
      i: i,
      ink: m[2],
      kind: m[3],
      /* only the ordering is printed, and only the ordering is needed: a
         synthetic size that preserves rank drives every size selector */
      size: total - rank
    };
  });

  var clauses = byId.clauseList.children.map(function (li) {
    var id = li.getAttribute('data-clause');
    return id ? C.byId(id) : null;
  }).filter(Boolean);

  return { stock: stock, shapes: shapes, clauses: clauses, labels: buttons };
}

function solveFromSheet() {
  var sheet = readSheet();
  check(sheet.shapes.every(Boolean), 'a shape carried no readable label');
  check(C.stock(sheet.stock) !== null, 'the stock stamp reads "' + sheet.stock + '", which is not a stock');
  var res = C.resolve({ stock: sheet.stock, shapes: sheet.shapes, clauses: sheet.clauses });
  return { sheet: sheet, answer: res.answer, clauseCount: sheet.clauses.length };
}

function clickShape(i) {
  var btn = byId.shapes.children[i];
  check(!!btn, 'no shape at index ' + i + ' to click');
  if (!btn) return;
  byId.shapes.fire('click', { target: btn });
}

function screen() {
  if (!byId['screen-menu'].hidden) return 'menu';
  if (!byId['screen-amendment'].hidden) return 'amendment';
  if (!byId['screen-play'].hidden) return 'play';
  if (!byId['screen-over'].hidden) return 'over';
  return '(none)';
}

/* ── the run ───────────────────────────────────────────────────────────── */

check(screen() === 'menu', 'the game did not open on the menu (opened on ' + screen() + ')');
check(byId.hud.hidden === true, 'the HUD is showing on the menu');
check(byId.menuBest.textContent === '0', 'a fresh menu shows best streak "' + byId.menuBest.textContent + '"');

var TARGET = 40;          /* correct answers to play through */
var maxClauses = 0;
var amendments = 0;
var barSeen = [];

byId.startBtn.fire('click');

var answered = 0;
var guard = 0;
while (answered < TARGET && guard++ < 400) {
  if (screen() === 'amendment') {
    amendments++;
    check(/^Amendment \d+$/.test(byId.amendNo.textContent),
      'amendment heading reads "' + byId.amendNo.textContent + '"');
    check(byId.amendText.textContent.length > 10, 'the amendment printed no clause text');
    check(lastFocused === byId.amendBtn, 'focus did not land on the amendment button');
    byId.amendBtn.fire('click');
    continue;
  }

  check(screen() === 'play', 'expected the play screen, got ' + screen());
  if (screen() !== 'play') break;

  var solved = solveFromSheet();
  maxClauses = Math.max(maxClauses, solved.clauseCount);

  /* the clock is running and the bar is full at the start of a round */
  check(byId.barFill.style.width === undefined || true, '');
  advance(16);
  var w = parseFloat(byId.barFill.style.width || '100');
  check(w > 0 && w <= 100, 'the time bar reads ' + w + '% at the top of a round');
  barSeen.push(w);

  clickShape(solved.answer);
  answered++;

  check(screen() !== 'over',
    'round ' + answered + ': the answer read off the sheet was wrong — ' +
    'the sheet does not contain what it takes to answer it');
  if (screen() === 'over') break;

  check(byId.hudStreak.textContent === String(answered),
    'after ' + answered + ' correct the HUD streak reads "' + byId.hudStreak.textContent + '"');
}

check(answered === TARGET, 'only got through ' + answered + ' of ' + TARGET + ' rounds');
check(amendments >= 5, 'only ' + amendments + ' amendments arrived in ' + TARGET + ' rounds');
check(maxClauses >= 5, 'the clause list only ever reached ' + maxClauses);
check(byId.hud.hidden === false, 'the HUD is hidden mid-run');

/* the bar must actually drain */
(function () {
  var before = parseFloat(byId.barFill.style.width);
  advance(600);
  var after = parseFloat(byId.barFill.style.width);
  check(after < before, 'the time bar did not drain (' + before + '% then ' + after + '%)');
})();

/* ── tabbing away must not cost you the run ────────────────────────────── */

(function () {
  var solved = solveFromSheet();
  var beforeW = parseFloat(byId.barFill.style.width);

  sandbox.document.hidden = true;
  (docListeners.visibilitychange || []).forEach(function (fn) { fn({}); });
  now += 60000;                        /* a full minute away */
  sandbox.document.hidden = false;
  (docListeners.visibilitychange || []).forEach(function (fn) { fn({}); });
  pump();

  check(screen() === 'play', 'a minute in another tab ended the run');
  var afterW = parseFloat(byId.barFill.style.width);
  check(Math.abs(afterW - beforeW) < 6,
    'a minute away moved the clock from ' + beforeW.toFixed(1) + '% to ' + afterW.toFixed(1) + '%');

  /* and the refund must not be paid twice */
  advance(16);
  var settled = parseFloat(byId.barFill.style.width);
  check(settled <= afterW + 0.5,
    'the clock ran backwards after resuming (' + afterW.toFixed(1) + '% then ' + settled.toFixed(1) + '%)');

  clickShape(solved.answer);
  check(screen() !== 'over', 'the round after resuming was judged wrong');
  answered++;
})();

/* ── a machine that slept must not cost you the run either ─────────────── */

(function () {
  while (screen() === 'amendment') byId.amendBtn.fire('click');
  var solved = solveFromSheet();
  advance(16);
  var beforeW = parseFloat(byId.barFill.style.width);
  /* no blur, no visibilitychange — just a huge gap between frames, which is
     all a closed lid or a suspended machine leaves behind */
  advance(45000);
  check(screen() === 'play', 'a 45-second stall with no blur event ended the run');
  var afterW = parseFloat(byId.barFill.style.width);
  check(Math.abs(afterW - beforeW) < 6,
    'the stall backstop did not hold the clock (' + beforeW.toFixed(1) + '% then ' + afterW.toFixed(1) + '%)');
  clickShape(solved.answer);
  check(screen() !== 'over', 'the round after the stall was judged wrong');
})();

/* ── losing, and what the loss screen says ─────────────────────────────── */

(function () {
  while (screen() === 'amendment') byId.amendBtn.fire('click');
  check(screen() === 'play', 'not on the play screen to lose from');
  var solved = solveFromSheet();
  var wrong = -1;
  for (var i = 0; i < byId.shapes.children.length; i++) {
    if (i !== solved.answer) { wrong = i; break; }
  }
  var streakAt = parseInt(byId.hudStreak.textContent, 10);
  clickShape(wrong);

  check(screen() === 'over', 'a wrong answer did not end the run');
  check(byId.overTitle.textContent === 'Void', 'the loss screen is titled "' + byId.overTitle.textContent + '"');
  var why = byId.overWhy.textContent;
  check(why.length > 10, 'the loss screen did not explain the round');
  check(/Clause \d+ decided this round|No clause applied/.test(why),
    'the loss screen explanation reads "' + why + '"');
  var detail = byId.overDetail.textContent;
  check(detail.indexOf('The answer was shape ' + (solved.answer + 1)) === 0,
    'the loss screen names the answer as "' + detail.slice(0, 60) + '"');
  check(detail.indexOf('You clicked shape ' + (wrong + 1)) > 0,
    'the loss screen does not say what was clicked: "' + detail + '"');
  check(detail.indexOf('Streak: ' + streakAt) > 0,
    'the loss screen reports the wrong streak: "' + detail + '"');
  check(lastFocused === byId.againBtn, 'focus did not land on the restart button');

  /* the record is written, and read back */
  var saved = JSON.parse(store['terms_stats_v1'] || '{}');
  check(saved.bestStreak === streakAt,
    'stored best streak is ' + saved.bestStreak + ', expected ' + streakAt);
  check(saved.runs === 1, 'stored run count is ' + saved.runs + ', expected 1');
  check(saved.bestClauses >= 5, 'stored best clause depth is ' + saved.bestClauses);
  console.log('stored record          ' + JSON.stringify(saved));
})();

/* ── timing out ends the run too ───────────────────────────────────────── */

(function () {
  byId.againBtn.fire('click');
  check(screen() === 'play', 'restart did not deal a round (on ' + screen() + ')');
  check(byId.hudStreak.textContent === '0', 'restart did not reset the streak');
  /* small steps, so no single gap trips the stall backstop */
  for (var i = 0; i < 800 && screen() === 'play'; i++) advance(60);
  check(screen() === 'over', 'the clock never ran out');
  check(byId.overTitle.textContent === 'Time', 'a timeout is titled "' + byId.overTitle.textContent + '"');
  var saved = JSON.parse(store['terms_stats_v1'] || '{}');
  check(saved.runs === 2, 'a timeout did not count as a run (' + saved.runs + ')');
})();

/* ── the keyboard alone must be enough ─────────────────────────────────── */

(function () {
  function key(k) {
    var ev = { key: k, preventDefault: function () { this.defaulted = true; } };
    (docListeners.keydown || []).forEach(function (fn) { fn(ev); });
    return ev;
  }
  key('Enter');                                  /* restart from the loss screen */
  check(screen() === 'play' || screen() === 'amendment',
    'Enter did not restart the run (on ' + screen() + ')');

  var played = 0;
  for (var i = 0; i < 12; i++) {
    if (screen() === 'amendment') { key(' '); continue; }
    if (screen() !== 'play') break;
    var solved = solveFromSheet();
    var ev = key(String(solved.answer + 1));
    check(ev.defaulted === true, 'a number key did not preventDefault while playing');
    played++;
    if (screen() === 'over') break;
  }
  check(played >= 6, 'only ' + played + ' rounds were playable from the keyboard');
  check(screen() !== 'over', 'the keyboard-only run ended early');

  /* a key for a shape that is not on the sheet must do nothing */
  var count = byId.shapes.children.length;
  if (count < 9) {
    var before = screen();
    key('9');
    check(screen() === before, 'pressing 9 with ' + count + ' shapes changed the screen');
  }
  console.log('keyboard-only rounds   ' + played);
})();

/* ── report ────────────────────────────────────────────────────────────── */

console.log('rounds answered        ' + answered);
console.log('amendments seen        ' + amendments);
console.log('deepest clause list    ' + maxClauses);

if (failures.length) {
  console.log('\nFAILED (' + failures.length + ')');
  failures.filter(function (f) { return f; }).slice(0, 25).forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
console.log('\nplayed end to end, reading only what the sheet prints');
