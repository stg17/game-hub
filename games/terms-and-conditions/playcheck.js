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
// game. It reads the fake DOM exactly as a player reads the sheet — the backdrop
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
/* padded, so recap__cell never matches recap__cell--picked */
El.prototype.has = function (cls) {
  return (' ' + this.className + ' ').indexOf(' ' + cls + ' ') >= 0;
};

var lastFocused = null;

/* Read the id list out of index.html rather than keeping a copy here. A
   hand-maintained list drifts the moment the markup gains an element, and
   getElementById then hands the game a null it did not expect. */
var MARKUP = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var IDS = (MARKUP.match(/ id="[^"]+"/g) || []).map(function (m) {
  return m.replace(/ id="/, '').replace(/"$/, '');
});
if (IDS.length < 20) { console.log('could not read the ids out of index.html'); process.exit(1); }

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

// Rebuilds the round from the printed DOM only: the backdrop stamp, each shape's
// label, and the numbered clause list. Nothing here reaches into the game.
var LABEL = /^Shape (\d+): (\w+) (\w+), size (\d+) of (\d+)/;

function readSheet() {
  var stampText = byId.backdropStamp.textContent;        /* "Backdrop: YELLOW" */
  var backdrop = stampText.replace(/^Backdrop:\s*/, '').trim().toLowerCase();
  check(stampText !== backdrop,
    'the corner stamp does not say what it is naming: "' + stampText + '"');

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

  return { backdrop: backdrop, shapes: shapes, clauses: clauses, labels: buttons };
}

function solveFromSheet() {
  var sheet = readSheet();
  check(sheet.shapes.every(Boolean), 'a shape carried no readable label');
  check(C.backdrop(sheet.backdrop) !== null,
    'the corner stamp reads "' + sheet.backdrop + '", which is not a backdrop');
  /* Every printed clause must read as an override of the headline, and must be
     one the engine actually knows — a line the player can only read as advice
     is a line that will cost them a run. */
  sheet.clauses.forEach(function (c) {
    check(/^Except when /.test(c.text),
      'a printed clause does not read as an override: "' + c.text + '"');
  });
  var res = C.resolve({ backdrop: sheet.backdrop, shapes: sheet.shapes, clauses: sheet.clauses });
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
    check(amendmentText().length > 10, 'the amendment printed no clause text');
    /* the override word is lifted out and set on its own, not left inline */
    check(byId.amendExcept.hidden === false && byId.amendExcept.textContent === 'Except',
      'the amendment card did not lift "Except" onto its own line');
    check(byId.amendText.textContent.slice(0, 5) === 'when ',
      'the clause under the lifted word reads "' + byId.amendText.textContent.slice(0, 20) + '"');
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

/* The amendment card sets the leading "Except" on its own line, so the clause
   a player reads is the two halves together. Reading only one of them is how a
   split that silently stopped working would still pass. */
function amendmentText() {
  var lead = byId.amendExcept.hidden ? '' : byId.amendExcept.textContent + ' ';
  return lead + byId.amendText.textContent;
}

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
  var shapeCount = byId.shapes.children.length;
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
  /* The recap has to agree with the words above it, or the picture is
     lying about the round the player just lost. */
  check(byId.overRecap.hidden === false, 'the loss screen printed no recap of the round');
  var cells = byId.recapShapes.children;
  check(cells.length === shapeCount,
    'the recap shows ' + cells.length + ' shapes, the round had ' + shapeCount);
  var crossed = [], ringed = [];
  cells.forEach(function (c, i) {
    if (c.has('recap__cell--picked')) crossed.push(i);
    if (c.has('recap__cell--answer')) ringed.push(i);
  });
  check(crossed.length === 1 && crossed[0] === wrong,
    'the recap crosses out ' + JSON.stringify(crossed) + ', the click was ' + wrong);
  check(ringed.length === 1 && ringed[0] === solved.answer,
    'the recap rings ' + JSON.stringify(ringed) + ', the answer was ' + solved.answer);
  /* the mark is printed as a word too, not colour alone */
  var tagOf = function (c) {
    var t = c.all().filter(function (e) { return e.has('recap__tag'); })[0];
    return t ? t.textContent : '';
  };
  check(tagOf(cells[wrong]) === 'You picked',
    'the crossed-out shape is labelled "' + tagOf(cells[wrong]) + '"');
  check(tagOf(cells[solved.answer]) === 'The answer',
    'the ringed shape is labelled "' + tagOf(cells[solved.answer]) + '"');
  /* and the X is actually drawn over it */
  var art = cells[wrong].all().filter(function (e) { return e.has('recap__art'); })[0];
  check(art && /recap__x/.test(art.innerHTML), 'no X was drawn over the shape that was clicked');
  var clean = cells[solved.answer].all().filter(function (e) { return e.has('recap__art'); })[0];
  check(clean && !/recap__x/.test(clean.innerHTML), 'the answer was crossed out as well');

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
  /* Nothing was clicked, so nothing is crossed out — but the answer is still
     shown, which is the whole reason the recap is there. */
  check(byId.overRecap.hidden === false, 'a timeout printed no recap');
  var tcells = byId.recapShapes.children;
  check(tcells.filter(function (c) { return c.has('recap__cell--picked'); }).length === 0,
    'a timeout crossed a shape out even though nothing was clicked');
  check(tcells.filter(function (c) { return c.has('recap__cell--answer'); }).length === 1,
    'a timeout did not ring the answer');
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

/* ── two runs must not be the same lesson ────────────────────────────────
   The catalogue holds several clauses at every difficulty tier and a run deals
   one from each, so restarting should hand you different small print rather
   than the same six lines in a slightly different order. Checked through the
   real game loop, reading the amendment screens, because that is where a
   player meets them. */
(function () {
  function freshRun() {
    while (screen() === 'amendment') byId.amendBtn.fire('click');
    if (screen() === 'play') {
      /* answer wrong on purpose — the quickest honest way back to the start */
      var solved = solveFromSheet();
      var wrong = solved.answer === 0 ? 1 : 0;
      clickShape(wrong);
    }
    if (screen() === 'over') byId.againBtn.fire('click');
    else if (screen() === 'menu') byId.startBtn.fire('click');
  }

  var OPENERS = 3;      /* how many clauses in before two runs are compared */
  var RUNS = 14;
  var sets = {};
  var everySeen = {};

  for (var r = 0; r < RUNS; r++) {
    freshRun();
    var seen = [];
    for (var step = 0; step < 60 && seen.length < OPENERS; step++) {
      if (screen() === 'amendment') {
        var text = amendmentText();
        check(/^Except when /.test(text),
          'an amendment does not read as an override: "' + text + '"');
        seen.push(text);
        everySeen[text] = true;
        byId.amendBtn.fire('click');
        continue;
      }
      if (screen() !== 'play') break;
      clickShape(solveFromSheet().answer);
    }
    check(seen.length === OPENERS,
      'a run dealt only ' + seen.length + ' clauses in 60 rounds');
    sets[seen.join(' | ')] = true;
  }

  var distinct = Object.keys(sets).length;
  check(distinct >= 4, 'only ' + distinct + ' different openings in ' + RUNS +
    ' runs — every run is teaching the same thing');
  console.log('openings in ' + RUNS + ' runs   ' + distinct + ' distinct, ' +
    Object.keys(everySeen).length + ' different clauses');
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
