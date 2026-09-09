// Nonogram — screens, the board, input, the clock.
//
// All the reasoning lives in nonogram.js, which is pure and self-checked. This
// file draws a plate and takes marks. Conventions kept from the rest of the
// box: screens toggled by the `hidden` property, one function that pushes state
// into the DOM, and elapsed time always computed from a wall-clock base rather
// than counted in ticks.
//
// The board is a CSS grid with the clue gutters as its first row and column, so
// the numbers and the squares are one grid and cannot drift out of alignment —
// which they would if the gutters were separate boxes sized by hand.
(function () {
  'use strict';

  var N = window.INK.Nonogram;
  var P = window.INK.Pictures;
  var Store = window.INK.Storage;

  /* Square size is deliberately NOT set from here. It lives in style.css,
     keyed off the .board--<size> class, because the narrow layout has to be
     able to shrink it — and an inline custom property set here would
     out-specify every media query that tried. */

  var state = {
    screen: 'index',
    sizeId: null,
    plate: null,        /* the picture record */
    solution: null,     /* grid of 0/1 */
    clues: null,
    marks: null,        /* grid of UNKNOWN / FILLED / EMPTY */
    cells: null,        /* the button elements, [y][x] */
    cursor: { x: 0, y: 0 },
    running: false,
    base: 0,            /* ms already banked */
    since: 0,           /* Date.now() when the clock last started */
    hints: 0,
    paint: null,        /* the mark a drag is applying */
    nextPlate: null,    /* the next unfinished plate, offered when one is done */
    done: false         /* the plate is finished and resolved in place */
  };

  var el = {};
  var tick = null;

  function cache() {
    el.screens = {
      index: document.getElementById('screen-index'),
      play: document.getElementById('screen-play')
    };
    el.resume = document.getElementById('resume');
    el.resumeWhat = document.getElementById('resumeWhat');
    el.resumeBtn = document.getElementById('resumeBtn');
    el.discardBtn = document.getElementById('discardBtn');

    /* One tab per size, looked up through P.sizes() rather than named here,
       so a fourth bucket would need no new code in this file. */
    el.sizeTabs = document.getElementById('sizeTabs');
    el.tabBtns = {};
    P.sizes().forEach(function (sz) { el.tabBtns[sz.id] = document.getElementById('tab-' + sz.id); });
    el.indexSpec = document.getElementById('indexSpec');
    el.plates = document.getElementById('plates');

    el.playNo = document.getElementById('playNo');
    el.clock = document.getElementById('clock');
    el.board = document.getElementById('board');
    el.hintLine = document.getElementById('hintLine');
    el.playKey = document.getElementById('playKey');
    el.playActions = document.getElementById('playActions');
    el.hintBtn = document.getElementById('hintBtn');
    el.restartBtn = document.getElementById('restartBtn');
    el.playBackBtn = document.getElementById('playBackBtn');

    el.finish = document.getElementById('finish');
    el.doneName = document.getElementById('doneName');
    el.doneStats = document.getElementById('doneStats');
    el.nextBtn = document.getElementById('nextBtn');
    el.doneIndexBtn = document.getElementById('doneIndexBtn');
  }

  function show(name) {
    state.screen = name;
    Object.keys(el.screens).forEach(function (k) {
      el.screens[k].hidden = k !== name;
    });
  }

  /* ── time ───────────────────────────────────────────────────────────── */

  function elapsed() {
    return state.base + (state.running ? Date.now() - state.since : 0);
  }
  function clockOn() {
    if (state.running) return;
    state.since = Date.now();
    state.running = true;
  }
  function clockOff() {
    if (!state.running) return;
    state.base = elapsed();
    state.running = false;
  }
  function stamp(ms) {
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function syncClock() {
    if (state.screen === 'play' && !state.done) el.clock.textContent = stamp(elapsed());
  }

  /* ── the index ──────────────────────────────────────────────────────── */

  /* The plate on the press, offered back. Redrawn on every return to the
     index so putting one back, or finishing it, shows up straight away. */
  function drawResume() {
    var open = Store.resumable();
    if (open && P.plate(open.size, open.plate)) {
      var sz = P.size(open.size);
      var pl = P.plate(open.size, open.plate);
      var idx = P.plates(open.size).indexOf(pl) + 1;
      el.resumeWhat.textContent = sz.label + ' plate ' + idx + ' of ' +
        P.count(open.size) + ' · ' + stamp(open.elapsed);
      el.resume.hidden = false;
    } else {
      el.resume.hidden = true;
    }
  }

  /* Choosing a size no longer navigates anywhere — it swaps the panel under
     the tabs, which is the whole reason the size screen could go. */
  function selectSize(id) {
    state.sizeId = id;
    P.sizes().forEach(function (sz) {
      var b = el.tabBtns[sz.id];
      var on = sz.id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    el.plates.setAttribute('aria-labelledby', 'tab-' + id);
    drawIndex();
  }

  function drawIndex() {
    var sz = P.size(state.sizeId);
    var list = P.plates(state.sizeId);
    el.indexSpec.textContent = sz.note + ' · ' + Store.solvedCount(sz.id) +
      ' of ' + list.length + ' printed';

    el.plates.innerHTML = '';
    list.forEach(function (pl, i) {
      var solved = Store.isSolved(sz.id, pl.id);

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'plate-card' + (solved ? ' plate-card--done' : '');
      card.setAttribute('data-plate', pl.id);

      var no = document.createElement('span');
      no.className = 'plate-card__no';
      no.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);

      var nm = document.createElement('span');
      /* The title is the reward, so an unprinted plate prints a ruled blank
         where its name will go — a gap in the collection, not greyed-out type. */
      nm.className = 'plate-card__name' + (solved ? '' : ' plate-card__name--blank');
      nm.textContent = solved ? pl.name : '';
      nm.setAttribute('aria-hidden', solved ? 'false' : 'true');

      var t = document.createElement('span');
      t.className = 'plate-card__time';
      t.textContent = solved ? stamp(Store.bestFor(sz.id, pl.id)) : '—';

      card.setAttribute('aria-label', 'Plate ' + (i + 1) + ', ' +
        (solved ? pl.name + ', best ' + stamp(Store.bestFor(sz.id, pl.id)) : 'not yet printed'));

      card.appendChild(no);
      card.appendChild(nm);
      card.appendChild(t);
      el.plates.appendChild(card);
    });

    drawResume();
  }

  /* ── starting a plate ───────────────────────────────────────────────── */

  function begin(sizeId, plateId, marksStr, banked) {
    var sz = P.size(sizeId);
    var pl = P.plate(sizeId, plateId);
    state.sizeId = sizeId;
    state.plate = pl;
    state.solution = N.parse(pl.rows);
    state.clues = N.cluesOf(state.solution);
    state.marks = marksStr ? unpack(marksStr, sz.dim) : N.blank(sz.dim, sz.dim);
    state.cursor = { x: 0, y: 0 };
    state.base = banked || 0;
    state.running = false;
    state.hints = 0;
    state.paint = null;

    state.done = false;

    var idx = P.plates(sizeId).indexOf(pl) + 1;
    el.playNo.textContent = 'Plate ' + idx + ' of ' + P.count(sizeId) +
      ' · ' + sz.label + ' · ' + sz.note;
    el.hintLine.textContent = '';
    el.finish.hidden = true;
    el.playKey.hidden = false;
    el.playActions.hidden = false;

    buildBoard(sz.dim);
    syncMarks();
    show('play');
    clockOn();
    syncClock();
    focusCursor();
  }

  function pack() {
    var out = '';
    for (var y = 0; y < state.marks.length; y++) {
      for (var x = 0; x < state.marks[y].length; x++) out += String(state.marks[y][x]);
    }
    return out;
  }
  function unpack(str, dim) {
    var g = [];
    for (var y = 0; y < dim; y++) {
      var row = [];
      for (var x = 0; x < dim; x++) {
        var ch = str.charAt(y * dim + x);
        row.push(ch === '1' ? N.FILLED : (ch === '2' ? N.EMPTY : N.UNKNOWN));
      }
      g.push(row);
    }
    return g;
  }

  /* ── drawing the board ──────────────────────────────────────────────── */

  function buildBoard(dim) {
    el.board.innerHTML = '';
    el.board.className = 'board board--' + state.sizeId;
    /* The track lists are written out rather than built with repeat(var(--dim)),
       which browsers have been inconsistent about. One gutter track, then one
       track per square, on both axes — so the numbers and the grid are a
       single grid and cannot fall out of alignment. */
    el.board.style.gridTemplateColumns = 'auto repeat(' + dim + ', var(--cell))';
    el.board.style.gridTemplateRows = 'auto repeat(' + dim + ', var(--cell))';

    var x, y;

    /* the corner, where the two gutters meet */
    var corner = document.createElement('div');
    corner.className = 'gut gut--corner';
    corner.setAttribute('aria-hidden', 'true');
    el.board.appendChild(corner);

    /* column clues along the top */
    for (x = 0; x < dim; x++) {
      var top = document.createElement('div');
      top.className = 'gut gut--col';
      top.id = 'cc' + x;
      /* every number on its own line, bottom-aligned against the grid */
      state.clues.cols[x].forEach(function (n) {
        var b = document.createElement('b');
        b.textContent = String(n);
        top.appendChild(b);
      });
      top.setAttribute('aria-label', 'Column ' + (x + 1) + ': ' + state.clues.cols[x].join(', '));
      el.board.appendChild(top);
    }

    state.cells = [];
    for (y = 0; y < dim; y++) {
      /* row clues down the side */
      var side = document.createElement('div');
      side.className = 'gut gut--row';
      side.id = 'rc' + y;
      state.clues.rows[y].forEach(function (n) {
        var b2 = document.createElement('b');
        b2.textContent = String(n);
        side.appendChild(b2);
      });
      side.setAttribute('aria-label', 'Row ' + (y + 1) + ': ' + state.clues.rows[y].join(', '));
      el.board.appendChild(side);

      var row = [];
      for (x = 0; x < dim; x++) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sq';
        cell.setAttribute('data-x', String(x));
        cell.setAttribute('data-y', String(y));
        /* the clues for this square's row and column are its description, so a
           screen reader reads the numbers that govern it rather than making the
           player go and find them */
        cell.setAttribute('aria-describedby', 'rc' + y + ' cc' + x);
        cell.tabIndex = -1;
        cell.className = sqClass(x, y, dim, N.UNKNOWN);
        el.board.appendChild(cell);
        row.push(cell);
      }
      state.cells.push(row);
    }
  }

  /* A square's ruling depends only on where it is: every fifth line is
     heavier, and the last row and column close the grid off. Both the build
     and the redraw go through here so they cannot disagree. */
  function sqClass(x, y, dim, mark) {
    var cls = 'sq';
    if (x % 5 === 0 && x > 0) cls += ' sq--rule-l';
    if (y % 5 === 0 && y > 0) cls += ' sq--rule-t';
    if (x === 0) cls += ' sq--edge-l';
    if (y === 0) cls += ' sq--edge-t';
    if (x === dim - 1) cls += ' sq--edge-r';
    if (y === dim - 1) cls += ' sq--edge-b';
    if (mark === N.FILLED) cls += ' sq--ink';
    else if (mark === N.EMPTY) cls += ' sq--out';
    return cls;
  }

  var MARK_WORD = {};
  MARK_WORD[N.UNKNOWN] = 'unmarked';
  MARK_WORD[N.FILLED] = 'inked';
  MARK_WORD[N.EMPTY] = 'crossed off';

  function syncCell(x, y) {
    var cell = state.cells[y][x];
    var m = state.marks[y][x];
    cell.className = sqClass(x, y, state.marks.length, m);
    cell.setAttribute('aria-label',
      'Row ' + (y + 1) + ', column ' + (x + 1) + ': ' + MARK_WORD[m]);
  }

  function syncMarks() {
    for (var y = 0; y < state.marks.length; y++) {
      for (var x = 0; x < state.marks[y].length; x++) syncCell(x, y);
    }
  }

  function focusCursor() {
    var c = state.cells[state.cursor.y][state.cursor.x];
    for (var y = 0; y < state.cells.length; y++) {
      for (var x = 0; x < state.cells[y].length; x++) state.cells[y][x].tabIndex = -1;
    }
    c.tabIndex = 0;
    c.focus();
  }

  /* ── marking ────────────────────────────────────────────────────────── */

  function setMark(x, y, mark) {
    if (state.marks[y][x] === mark) return false;
    state.marks[y][x] = mark;
    syncCell(x, y);
    return true;
  }

  function afterChange() {
    Store.keep(state.sizeId, state.plate.id, pack(), elapsed());
    if (N.isComplete(state.marks, state.solution)) finish();
  }

  /* Click cycles ink → cross → clear, which is the convention and means one
     pointer can do everything. A drag applies whatever the first square
     became, so sweeping a run does not toggle each square in turn. */
  function cycle(m) {
    if (m === N.UNKNOWN) return N.FILLED;
    if (m === N.FILLED) return N.EMPTY;
    return N.UNKNOWN;
  }

  function cellAt(target) {
    if (!target || !target.getAttribute) return null;
    var xs = target.getAttribute('data-x');
    if (xs === null) return null;
    return { x: parseInt(xs, 10), y: parseInt(target.getAttribute('data-y'), 10) };
  }

  function wireBoard() {
    el.board.addEventListener('pointerdown', function (e) {
      if (state.screen !== 'play' || state.done) return;
      var at = cellAt(e.target);
      if (!at) return;
      e.preventDefault();
      state.cursor = { x: at.x, y: at.y };
      /* right button (or a two-finger equivalent) goes straight to a cross,
         because crossing off is half the work and deserves one action */
      var want = (e.button === 2)
        ? (state.marks[at.y][at.x] === N.EMPTY ? N.UNKNOWN : N.EMPTY)
        : cycle(state.marks[at.y][at.x]);
      state.paint = want;
      if (setMark(at.x, at.y, want)) afterChange();
      focusCursor();
      if (el.board.setPointerCapture) {
        try { el.board.setPointerCapture(e.pointerId); } catch (err) { /* not vital */ }
      }
    });

    /* Pointer capture keeps the events on the board, so the square under the
       finger has to be looked up by position rather than read off the target. */
    el.board.addEventListener('pointermove', function (e) {
      if (state.paint === null || state.screen !== 'play' || state.done) return;
      var over = document.elementFromPoint(e.clientX, e.clientY);
      var at = cellAt(over);
      if (!at) return;
      if (setMark(at.x, at.y, state.paint)) {
        state.cursor = { x: at.x, y: at.y };
        afterChange();
      }
    });

    function release() { state.paint = null; }
    el.board.addEventListener('pointerup', release);
    el.board.addEventListener('pointercancel', release);
    window.addEventListener('pointerup', release);

    /* the right button is a game control here, not a menu */
    el.board.addEventListener('contextmenu', function (e) {
      if (cellAt(e.target)) e.preventDefault();
    });
  }

  /* ── one deduction ──────────────────────────────────────────────────────
     The hint runs the same line solver the player is up against, seeded with
     their own marks — so it only ever tells them something the numbers already
     say. It never consults the picture, except to explain a contradiction.  */

  function hint() {
    if (state.screen !== 'play' || state.done) return;
    var res = N.solve(state.clues, state.marks);

    if (res.status === 'contradiction') {
      var bad = N.mistakes(state.marks, state.solution);
      var wrongCross = null;
      for (var y = 0; y < state.marks.length && !wrongCross; y++) {
        for (var x = 0; x < state.marks[y].length; x++) {
          if (state.marks[y][x] === N.EMPTY && state.solution[y][x]) { wrongCross = { x: x, y: y }; break; }
        }
      }
      var spot = bad.length ? bad[0] : wrongCross;
      state.hints++;
      if (spot) {
        el.hintLine.textContent = 'Something here cannot be right — row ' +
          (spot.y + 1) + ', column ' + (spot.x + 1) + '.';
      } else {
        el.hintLine.textContent = 'Something here cannot be right.';
      }
      return;
    }

    /* the first cell the numbers settle that the player has not */
    for (var yy = 0; yy < state.marks.length; yy++) {
      for (var xx = 0; xx < state.marks[yy].length; xx++) {
        if (state.marks[yy][xx] !== N.UNKNOWN) continue;
        if (res.grid[yy][xx] === N.UNKNOWN) continue;
        state.hints++;
        setMark(xx, yy, res.grid[yy][xx]);
        el.hintLine.textContent = 'Row ' + (yy + 1) + ' and column ' + (xx + 1) +
          ' settle it: ' +
          (res.grid[yy][xx] === N.FILLED ? 'ink.' : 'blank.');
        state.cursor = { x: xx, y: yy };
        focusCursor();
        afterChange();
        return;
      }
    }

    el.hintLine.textContent = 'Nothing further follows from the numbers alone.';
  }

  /* ── finishing ──────────────────────────────────────────────────────── */

  function finish() {
    clockOff();
    state.done = true;
    var ms = state.base;
    var res = Store.recordSolve(state.sizeId, state.plate.id, ms);

    /* The plate resolves where it was made. The crosses come off and the
       squares go dead, but the ruling and the ink stay exactly as the player
       left them — the finished board IS the picture, so reprinting it on a
       separate card somewhere else would hand back a copy of the reward
       instead of the reward. */
    el.board.className += ' board--done';
    for (var y = 0; y < state.cells.length; y++) {
      for (var x = 0; x < state.cells[y].length; x++) state.cells[y][x].tabIndex = -1;
    }

    el.doneName.textContent = state.plate.name;

    var bits = [stamp(ms)];
    if (res.previous === null) bits.push('first printing');
    else if (res.record) bits.push('a new best, was ' + stamp(res.previous));
    else bits.push('best stands at ' + stamp(res.previous));
    if (state.hints) bits.push(state.hints + (state.hints === 1 ? ' hint' : ' hints'));
    el.doneStats.textContent = bits.join(' · ');

    var list = P.plates(state.sizeId);
    var at = list.indexOf(state.plate);
    var nextUp = null;
    for (var i = 1; i <= list.length; i++) {
      var cand = list[(at + i) % list.length];
      if (!Store.isSolved(state.sizeId, cand.id)) { nextUp = cand; break; }
    }
    state.nextPlate = nextUp;
    el.nextBtn.hidden = !nextUp;

    el.hintLine.textContent = '';
    el.playKey.hidden = true;
    el.playActions.hidden = true;
    el.finish.hidden = false;
    (nextUp ? el.nextBtn : el.doneIndexBtn).focus();
  }

  /* ── input ──────────────────────────────────────────────────────────── */

  function toIndex() {
    clockOff();
    /* Only an unfinished plate goes back on the press. Without the guard a
       finished one is re-saved as in progress the instant recordSolve has
       cleared it, and the index then offers to resume a plate you just did. */
    if (state.plate && !state.done) {
      Store.keep(state.sizeId, state.plate.id, pack(), state.base);
    }
    drawIndex();
    show('index');
    el.tabBtns[state.sizeId].focus();
  }

  function wire() {
    /* The tabs swap the panel; they never navigate. */
    el.sizeTabs.addEventListener('click', function (e) {
      var tab = e.target.closest ? e.target.closest('.tab') : null;
      if (!tab) return;
      selectSize(tab.getAttribute('data-size'));
    });

    /* Roving tabindex, so the strip is one stop and the arrows walk it. */
    el.sizeTabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = P.sizes().map(function (sz) { return sz.id; });
      var at = ids.indexOf(state.sizeId);
      if (at < 0) return;
      e.preventDefault();
      var to = ids[(at + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      selectSize(to);
      el.tabBtns[to].focus();
    });

    el.plates.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.plate-card') : null;
      if (!card) return;
      begin(state.sizeId, card.getAttribute('data-plate'), null, 0);
    });

    el.playBackBtn.addEventListener('click', toIndex);
    el.doneIndexBtn.addEventListener('click', toIndex);

    el.restartBtn.addEventListener('click', function () {
      begin(state.sizeId, state.plate.id, null, 0);
      el.hintLine.textContent = 'Plate cleared.';
    });

    el.hintBtn.addEventListener('click', hint);

    el.nextBtn.addEventListener('click', function () {
      if (state.nextPlate) begin(state.sizeId, state.nextPlate.id, null, 0);
    });

    el.resumeBtn.addEventListener('click', function () {
      var open = Store.resumable();
      if (open && P.plate(open.size, open.plate)) begin(open.size, open.plate, open.cells, open.elapsed);
    });
    el.discardBtn.addEventListener('click', function () {
      Store.drop();
      drawResume();
    });

    document.addEventListener('keydown', function (e) {
      if (state.screen !== 'play' || state.done) {
        /* On a finished plate Esc walks back to the index. On the index there
           is nowhere further back but the box, and the tab at the top of the
           page is that door. */
        if (state.done && e.key === 'Escape') { e.preventDefault(); toIndex(); }
        return;
      }

      var dim = state.marks.length;
      var moved = false;
      if (e.key === 'ArrowLeft')  { state.cursor.x = Math.max(0, state.cursor.x - 1); moved = true; }
      else if (e.key === 'ArrowRight') { state.cursor.x = Math.min(dim - 1, state.cursor.x + 1); moved = true; }
      else if (e.key === 'ArrowUp')    { state.cursor.y = Math.max(0, state.cursor.y - 1); moved = true; }
      else if (e.key === 'ArrowDown')  { state.cursor.y = Math.min(dim - 1, state.cursor.y + 1); moved = true; }
      if (moved) { e.preventDefault(); focusCursor(); return; }

      var c = state.cursor;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (setMark(c.x, c.y, cycle(state.marks[c.y][c.x]))) afterChange();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        var want = state.marks[c.y][c.x] === N.EMPTY ? N.UNKNOWN : N.EMPTY;
        if (setMark(c.x, c.y, want)) afterChange();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        hint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        toIndex();
      }
    });

    /* the clock should not run while nobody is looking at it */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clockOff();
      else if (state.screen === 'play' && !state.done) clockOn();
    });
    window.addEventListener('blur', clockOff);
    window.addEventListener('focus', function () {
      if (state.screen === 'play' && !state.done) clockOn();
    });
  }

  /* ── boot ───────────────────────────────────────────────────────────── */

  cache();
  wire();
  wireBoard();
  /* Open on the size of whatever plate is on the press, so carrying on is one
     click from a cold start. */
  var open = Store.resumable();
  selectSize(open && P.size(open.size) ? open.size : P.sizes()[0].id);
  show('index');
  /* A second is plenty for a readout in minutes and seconds, and the elapsed
     time is recomputed from the base every time rather than accumulated here. */
  tick = setInterval(syncClock, 1000);
})();
