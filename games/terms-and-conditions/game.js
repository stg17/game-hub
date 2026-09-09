// Terms & Conditions — screens, the clock, input, and drawing the round.
//
// Everything that judges a round lives in clauses.js and round.js, which are
// pure and self-checked. This file only shows you the round and reads your
// answer, in the same shape as the other games: one function that pushes all
// state into the DOM (syncHud, cf. tetris syncPanel / math-puzzles updateHud),
// screens toggled by the `hidden` property, and no time ever measured by
// counting ticks — the deadline is a wall-clock timestamp, always.
(function () {
  'use strict';

  var C = window.TC.Clauses;
  var R = window.TC.Round;
  var Store = window.TC.Storage;

  /* ── the ramp ───────────────────────────────────────────────────────── */

  var CLAUSE_CAP = 6;
  var EASE_IN_ROUNDS = 2;   /* rounds of headline-only, to learn the base */
  var PER_CLAUSE = 3;       /* correct answers between amendments */
  var TIME_START = 6000;
  var TIME_STEP = 130;      /* shaved per correct answer */
  var TIME_FLOOR = 2400;    /* below this it stops being reading and is luck */

  function clausesFor(streak) {
    if (streak < EASE_IN_ROUNDS) return 0;
    return Math.min(CLAUSE_CAP, 1 + Math.floor((streak - EASE_IN_ROUNDS) / PER_CLAUSE));
  }
  function timeFor(streak) {
    return Math.max(TIME_FLOOR, TIME_START - streak * TIME_STEP);
  }

  /* ── state ──────────────────────────────────────────────────────────── */

  var state = {
    screen: 'menu',
    running: false,
    streak: 0,
    clauseOrder: [],     /* this run's clauses, in the order they arrive */
    active: [],          /* the ones printed so far */
    round: null,
    resolved: null,
    limit: TIME_START,
    deadline: 0,
    paused: false,
    pausedAt: 0,
    lastPick: null,
    lastReason: ''
  };

  var el = {};

  function cache() {
    el.screens = {
      menu: document.getElementById('screen-menu'),
      amendment: document.getElementById('screen-amendment'),
      play: document.getElementById('screen-play'),
      over: document.getElementById('screen-over')
    };
    el.hud = document.getElementById('hud');
    el.hudStreak = document.getElementById('hudStreak');
    el.hudClauses = document.getElementById('hudClauses');
    el.hudBest = document.getElementById('hudBest');

    el.menuBest = document.getElementById('menuBest');
    el.startBtn = document.getElementById('startBtn');

    el.amendNo = document.getElementById('amendNo');
    el.amendText = document.getElementById('amendText');
    el.amendBtn = document.getElementById('amendBtn');

    el.sheet = document.getElementById('sheet');
    el.stockStamp = document.getElementById('stockStamp');
    el.headline = document.getElementById('headline');
    el.shapes = document.getElementById('shapes');
    el.clauseList = document.getElementById('clauseList');
    el.barFill = document.getElementById('barFill');

    el.overTitle = document.getElementById('overTitle');
    el.overWhy = document.getElementById('overWhy');
    el.overDetail = document.getElementById('overDetail');
    el.againBtn = document.getElementById('againBtn');
  }

  function show(name) {
    state.screen = name;
    Object.keys(el.screens).forEach(function (k) {
      el.screens[k].hidden = k !== name;
    });
    el.hud.hidden = (name === 'menu');
  }

  function syncHud() {
    var stats = Store.get();
    el.hudStreak.textContent = String(state.streak);
    el.hudClauses.textContent = state.active.length + ' of ' + C.CLAUSES.length;
    el.hudBest.textContent = 'Best streak ' + stats.bestStreak;
  }

  /* ── drawing a round ────────────────────────────────────────────────── */

  function drawRound() {
    var round = state.round;
    var stock = C.stock(round.stock);

    el.sheet.style.background = stock.hex;
    el.stockStamp.textContent = 'Stock: ' + stock.label;
    el.headline.textContent = C.HEADLINE.text;

    /* Size rank, biggest first. A sighted player reads the ordering off the
       sheet; announcing the rank gives a screen-reader player exactly that and
       nothing more, where announcing raw pixel weights would be noise. */
    var bySize = round.shapes.slice().sort(function (a, b) { return b.size - a.size; });
    var rankOf = {};
    bySize.forEach(function (s, r) { rankOf[s.i] = r + 1; });
    var total = round.shapes.length;

    el.shapes.innerHTML = '';
    round.shapes.forEach(function (s, idx) {
      var ink = C.ink(s.ink);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tc-shape';
      btn.setAttribute('data-i', String(idx));
      /* The whole point of the game is reading, so the button says out loud
         what it is — which is also what makes the colour clauses usable
         without relying on colour vision. */
      btn.setAttribute('aria-label', 'Shape ' + (idx + 1) + ': ' + ink.label.toLowerCase() +
        ' ' + s.kind + ', size ' + rankOf[s.i] + ' of ' + total + ', where 1 is the biggest');

      /* The box is the shape's weight scaled per kind (see clauses.js), so
         equal weight is equal ink whatever the silhouette. It goes out as a
         custom property rather than a width attribute so the narrow layout can
         shrink the whole row instead of wrapping it — comparing sizes across
         two lines is much harder than along one.
         The stroke is non-scaling, so the smallest and largest shapes carry
         the same 2.5px printed keyline instead of the outline thinning away. */
      var box = C.drawnBox(s);
      var art = document.createElement('span');
      art.className = 'tc-shape__art';
      art.style.setProperty('--box', box);
      art.innerHTML =
        '<svg viewBox="0 0 100 100" width="' + box + '" height="' + box + '" aria-hidden="true" focusable="false">' +
        '<g fill="' + ink.hex + '" stroke="#171410" stroke-width="2.5" vector-effect="non-scaling-stroke">' +
        C.glyphMarkup(s.kind) +
        '</g></svg>';

      var label = document.createElement('span');
      label.className = 'tc-shape__label';
      label.textContent = (idx + 1) + ' · ' + ink.label;

      btn.appendChild(art);
      btn.appendChild(label);
      el.shapes.appendChild(btn);
    });

    el.clauseList.innerHTML = '';
    if (!state.active.length) {
      var none = document.createElement('li');
      none.className = 'tc-clause--none';
      none.textContent = 'No clauses yet.';
      el.clauseList.appendChild(none);
    } else {
      state.active.forEach(function (c) {
        var li = document.createElement('li');
        li.setAttribute('data-clause', c.id);
        li.textContent = c.text;
        el.clauseList.appendChild(li);
      });
    }
  }

  /* ── the run ────────────────────────────────────────────────────────── */

  function startRun() {
    state.running = true;
    state.streak = 0;
    state.clauseOrder = R.runOrder();
    state.active = [];
    state.lastPick = null;
    nextRound();
  }

  function nextRound() {
    var want = clausesFor(state.streak);
    if (want > state.active.length) {
      /* A new clause must be read before it can end a run. */
      var added = state.clauseOrder[state.active.length];
      state.active = state.active.concat([added]);
      el.amendNo.textContent = 'Amendment ' + state.active.length;
      el.amendText.textContent = added.text;
      syncHud();
      show('amendment');
      el.amendBtn.focus();
      return;
    }
    dealRound();
  }

  function dealRound() {
    var dealt = R.deal(state.active);
    state.round = dealt.round;
    state.resolved = dealt.resolved;
    state.limit = timeFor(state.streak);
    state.deadline = Date.now() + state.limit;
    state.paused = false;
    /* A fresh deadline gets a fresh frame clock: the menu and amendment screens
       are not paused, so a tab hidden there would otherwise leave a stale gap
       for the backstop to refund into a round that had not started yet. */
    lastFrameAt = 0;
    drawRound();
    syncHud();
    show('play');
    el.barFill.style.width = '100%';
    /* keyboard stays on the sheet, so 1-6 works without a click first */
    el.sheet.focus();
  }

  function answer(index) {
    if (state.screen !== 'play' || !state.running) return;
    state.lastPick = index;
    if (index === state.resolved.answer) {
      state.streak += 1;
      nextRound();
    } else {
      endRun('wrong');
    }
  }

  function endRun(why) {
    state.running = false;
    var record = Store.recordRun(state.streak, state.active.length);
    var stats = Store.get();
    var res = state.resolved;
    var correct = state.round.shapes[res.answer];
    var correctInk = C.ink(correct.ink);

    el.overTitle.textContent = why === 'time' ? 'Time' : 'Void';

    if (res.decidedBy) {
      el.overWhy.innerHTML = '';
      var lead = document.createElement('p');
      lead.className = 'tc-over__lead';
      lead.textContent = 'Clause ' + res.decidedBy.number + ' decided this round:';
      var quote = document.createElement('p');
      quote.className = 'tc-over__clause';
      quote.textContent = res.decidedBy.clause.text;
      el.overWhy.appendChild(lead);
      el.overWhy.appendChild(quote);
    } else {
      el.overWhy.innerHTML = '';
      var only = document.createElement('p');
      only.className = 'tc-over__lead';
      only.textContent = 'No clause applied — the headline stood.';
      el.overWhy.appendChild(only);
    }

    var parts = [];
    parts.push('The answer was shape ' + (res.answer + 1) + ', the ' +
      correctInk.label.toLowerCase() + ' ' + correct.kind + '.');
    if (why === 'wrong' && state.lastPick !== null) {
      var picked = state.round.shapes[state.lastPick];
      parts.push('You clicked shape ' + (state.lastPick + 1) + ', the ' +
        C.ink(picked.ink).label.toLowerCase() + ' ' + picked.kind + '.');
    }
    parts.push('Streak: ' + state.streak + (record ? ' — a new best.' : ' · best ' + stats.bestStreak + '.'));
    el.overDetail.textContent = parts.join(' ');

    syncHud();
    show('over');
    el.againBtn.focus();
  }

  /* ── the clock ──────────────────────────────────────────────────────── */

  // One rAF loop, because there is a bar to drain smoothly. The remaining time
  // is always recomputed from the deadline; nothing accumulates.
  //
  // STALL BACKSTOP. blur and visibilitychange cover tabbing and switching
  // windows, but not everything: a laptop lid closing, the machine sleeping, or
  // a long main-thread stall can all take real time away without either event
  // arriving, and the player would come back to a run already lost. rAF cannot
  // fire during any of those, so an implausible gap between frames is the
  // signal — treat it as time the player was not present for and hand it back.
  // The threshold sits well above a dropped frame or two and well below the
  // shortest round, so it can only ever catch an actual stall.
  var STALL_MS = 1500;
  var lastFrameAt = 0;

  function frame() {
    var now = Date.now();
    var gap = lastFrameAt ? now - lastFrameAt : 0;
    lastFrameAt = now;

    if (state.screen === 'play' && state.running && !state.paused) {
      if (gap > STALL_MS) state.deadline += gap;
      var left = state.deadline - now;
      if (left <= 0) {
        el.barFill.style.width = '0%';
        endRun('time');
      } else {
        el.barFill.style.width = (left / state.limit * 100) + '%';
      }
    }
    requestAnimationFrame(frame);
  }

  // Tabbing away must not lose you a run: freeze the deadline and push it
  // forward by however long you were gone. Same reasoning as the blur handler
  // in Tetris, which drops held keys rather than letting a piece keep sliding.
  function pause() {
    if (state.paused || state.screen !== 'play' || !state.running) return;
    state.paused = true;
    state.pausedAt = Date.now();
  }
  function unpause() {
    if (!state.paused) return;
    state.deadline += Date.now() - state.pausedAt;
    state.paused = false;
    /* rAF does not run in a hidden tab, so lastFrameAt is stale by exactly the
       gap just refunded above. Clearing it stops the backstop refunding the
       same absence a second time. */
    lastFrameAt = 0;
  }

  /* ── input ──────────────────────────────────────────────────────────── */

  function wire() {
    el.startBtn.addEventListener('click', startRun);
    el.againBtn.addEventListener('click', startRun);
    el.amendBtn.addEventListener('click', dealRound);

    el.shapes.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.tc-shape') : null;
      if (btn) answer(parseInt(btn.getAttribute('data-i'), 10));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key >= '1' && e.key <= '9') {
        var i = parseInt(e.key, 10) - 1;
        if (state.screen === 'play' && state.round && i < state.round.shapes.length) {
          e.preventDefault();
          answer(i);
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (state.screen === 'menu') { e.preventDefault(); startRun(); }
        else if (state.screen === 'over') { e.preventDefault(); startRun(); }
        else if (state.screen === 'amendment') { e.preventDefault(); dealRound(); }
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else unpause();
    });
    window.addEventListener('blur', pause);
    window.addEventListener('focus', unpause);
  }

  /* ── boot ───────────────────────────────────────────────────────────── */

  cache();
  wire();
  el.menuBest.textContent = String(Store.get().bestStreak);
  syncHud();
  show('menu');
  requestAnimationFrame(frame);
})();
