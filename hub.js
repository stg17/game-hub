/* The box remembers. Each game keeps its own localStorage key and shares
   nothing with the others, so the hub reads all five keys itself and prints
   what it finds onto each board's record strip.

   Also counts the boards on the page, so adding a game is one block of markup:
   the set line and the number on the empty slot follow on their own. */
(function () {
  'use strict';

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null; /* private mode, blocked storage — the board just says nothing */
    }
  }

  function json(key) {
    var raw = read(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function num(v) {
    var n = typeof v === 'number' ? v : parseInt(v, 10);
    return isFinite(n) ? n : 0;
  }

  function group(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  /* One reader per game. Each returns a printed line, or null for "unplayed". */
  var readers = {
    tetris: function () {
      var best = num(read('tetris_best_v1'));
      return best > 0 ? 'Best ' + group(best) : null;
    },

    '2048': function () {
      var s = json('2048_state_v1');
      if (!s) return null;
      var best = num(s.best);
      var score = num(s.score);
      if (!best && !score) return null;
      var line = 'Best ' + group(best);
      if (score > 0) line += ' · game in progress';
      return line;
    },

    ttt: function () {
      var s = json('ttt_scores_v1');
      if (!s) return null;
      var x = num(s.X), o = num(s.O), d = num(s.draws);
      if (!(x + o + d)) return null;
      return 'X ' + x + ' · O ' + o + ' · ' + plural(d, 'draw', 'draws');
    },

    math: function () {
      var s = json('mathpuzzles_stats_v1');
      if (!s) return null;
      var total = 0;
      for (var type in s) {
        if (!Object.prototype.hasOwnProperty.call(s, type)) continue;
        var levels = s[type];
        for (var lvl in levels) {
          if (!Object.prototype.hasOwnProperty.call(levels, lvl)) continue;
          total += num(levels[lvl] && levels[lvl].solved);
        }
      }
      return total > 0 ? plural(total, 'puzzle solved', 'puzzles solved') : null;
    },

    romp: function () {
      var lvl = num(read('dcromp_unlocked'));
      return lvl > 1 ? 'Level ' + lvl + ' of 5 unlocked' : null;
    }
  };

  /* Nothing played yet is a real state, and it should read as an invitation
     rather than as a broken value. */
  var unplayed = {
    tetris: 'No score set yet',
    '2048': 'No score set yet',
    ttt: 'No games played yet',
    math: 'No puzzles solved yet',
    romp: 'Level 1 of 5 · unopened'
  };

  var strips = document.querySelectorAll('[data-record]');
  for (var i = 0; i < strips.length; i++) {
    var el = strips[i];
    var name = el.getAttribute('data-record');
    var line = null;
    if (readers[name]) {
      try {
        line = readers[name]();
      } catch (e) {
        line = null;
      }
    }
    el.textContent = line || unplayed[name] || '';
    if (!line) el.className += ' board__record--none';
  }

  /* The set grows: count what is actually on the table. */
  var boards = document.querySelectorAll('.tray .board');
  var count = boards.length;

  function setNo(n) {
    return 'No. ' + (n < 10 ? '0' + n : n);
  }

  /* Numbers come from position, so adding a game never means renumbering the
     ones after it. The markup keeps a literal as the no-JS fallback. */
  for (var b = 0; b < count; b++) {
    var stamp = boards[b].querySelector('.board__no');
    if (stamp) stamp.textContent = setNo(b + 1);
  }
  var words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
               'eight', 'nine', 'ten', 'eleven', 'twelve'];
  var spelled = words[count] || String(count);

  var countEl = document.querySelector('[data-count]');
  if (countEl) countEl.textContent = spelled;

  var nextEl = document.querySelector('[data-next-no]');
  if (nextEl) nextEl.textContent = setNo(count + 1);

  /* ── opening the box ─────────────────────────────────────────────────
     The cover comes off, the view pushes into the box, and that same cover
     settles into the corner as the title tag — one object the whole way, so
     the animation ends on the real page rather than on a picture of it.

     Everything is driven off the real elements, and every state it sets is
     removed at the end. If any of it fails, a hard timer tears it down. */

  var TIMING = {
    settle: 520,    /* the closed box arrives on the table */
    lift: 700,      /* the cover comes off and you can see inside */
    fly: 1700,      /* the view pushes all the way in, the cover to the corner */
    handover: 200   /* the real lid takes over from the flying copy */
  };
  var WALL = 46;    /* chipboard around the set, in page pixels */
  var TOTAL = TIMING.settle + TIMING.lift + TIMING.fly + TIMING.handover;
  var EASE_OUT = 'cubic-bezier(.22, .9, .3, 1)';
  var SEEN_KEY = 'gamehub_intro_seen';

  var html = document.documentElement;
  var lid = document.querySelector('.lid');
  var plate = document.querySelector('.lid__plate');
  var stamp = document.querySelector('.lid__stamp');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !!(lid && plate && document.body.animate);

  function seen() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* fine, it just replays */ }
  }

  /* The lid plate is rotated, so its bounding box is not its layout box.
     Measure it square, then put the rotation back. */
  function plateBox() {
    var prev = plate.style.transform;
    plate.style.transform = 'none';
    var r = plate.getBoundingClientRect();
    plate.style.transform = prev;
    return r;
  }

  function openTheBox() {
    var stage = document.createElement('div');
    stage.className = 'boot-stage';
    while (document.body.firstChild) stage.appendChild(document.body.firstChild);
    document.body.appendChild(stage);

    var target = plateBox();
    html.className += ' booting';

    /* The set sits in a tray whose walls are drawn around the real page, so
       the whole box — boards and all — is one thing the view flies into.
       Measured at rest, then scaled down to fit the viewport as a closed box;
       the flight is that scale running back up to 1, which is why the boards
       finish at full size and the walls finish outside the frame. */
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var walls = document.createElement('div');
    walls.className = 'boot-walls';
    walls.style.inset = (-WALL) + 'px';
    stage.insertBefore(walls, stage.firstChild);

    /* the cloth sits inside the box and scales with it */
    var cloth = document.createElement('div');
    cloth.className = 'boot-cloth';
    stage.appendChild(cloth);

    var sr = stage.getBoundingClientRect();
    var boxL = sr.left - WALL;
    var boxT = sr.top - WALL;
    var boxW = sr.width + WALL * 2;
    var boxH = sr.height + WALL * 2;

    var s0 = Math.min(vw * 0.84 / boxW, vh * 0.84 / boxH);
    var tx = vw / 2 - s0 * (boxL + boxW / 2);
    var ty = vh / 2 - s0 * (boxT + boxH / 2);
    var closed = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s0 + ')';

    /* the cover lies across the top of the tray at that same scale */
    var coverW = s0 * boxW;
    var scale = coverW / target.width;
    var coverH = target.height * scale;
    var cx = tx + s0 * boxL;
    var cy = ty + s0 * boxT;

    var boot = document.createElement('div');
    boot.className = 'boot';
    boot.setAttribute('aria-hidden', 'true');

    var cover = document.createElement('div');
    cover.className = 'boot__cover';
    cover.style.left = target.left + 'px';
    cover.style.top = target.top + 'px';
    cover.style.width = target.width + 'px';
    cover.style.height = target.height + 'px';
    cover.appendChild(plate.cloneNode(true));

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'boot__skip';
    skip.textContent = 'Skip';

    boot.appendChild(cover);
    boot.appendChild(skip);
    document.body.appendChild(boot);

    /* the cover starts big and centred over the box, and ends exactly on the
       real plate's own box — one object, two resting places */
    var dx = cx - target.left;
    var dy = cy - target.top;
    var from = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
    var off = 'translate(' + dx + 'px, ' + (dy - coverH * 0.62) + 'px) scale(' + (scale * 1.03) + ') rotate(-1.6deg)';

    var openAt = TIMING.settle;              /* the cover starts to move */
    var openedAt = TIMING.settle + TIMING.lift;   /* it is clear of the box */

    var anims = [];
    function play(el, frames, opts) {
      var a = el.animate(frames, opts);
      anims.push(a);
      return a;
    }

    /* the cloth over the set dissolves as the cover clears it: this is the
       moment you can see into the box */
    play(cloth, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 520,
      delay: openAt + TIMING.lift * 0.30,
      easing: 'linear',
      fill: 'both'
    });

    play(cover, [
      { transform: from, offset: 0 },
      { transform: from, offset: openAt / TOTAL },
      { transform: off, offset: openedAt / TOTAL, easing: EASE_OUT },
      { transform: 'none', offset: 1 }
    ], { duration: TOTAL, easing: EASE_OUT, fill: 'both' });

    /* the whole tray sits closed and small, then the view flies into it until
       the boards are full size — the walls leave the frame rather than fade */
    play(stage, [
      { transform: closed, offset: 0 },
      { transform: closed, offset: (openAt + TIMING.lift * 0.30) / TOTAL },
      { transform: 'none', offset: 1 }
    ], { duration: TOTAL, easing: EASE_OUT, fill: 'both' });

    /* by the time this runs the chipboard is already past the edges of the
       screen, and the interior was always the same green as the table, so
       there is nothing visible left to take away */
    play(walls, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 420,
      delay: TOTAL - 480,
      easing: 'linear',
      fill: 'forwards'
    });

    /* The boards do not arrive — they were in the box the whole time. They
       come up with the cloth, so what the lifting cover reveals is a tray
       already full, and every bit of movement after that is the view moving
       rather than the contents rearranging themselves. */
    var pieces = document.querySelectorAll('.tray .board, .tray .slot, .colophon');
    for (var p = 0; p < pieces.length; p++) {
      play(pieces[p], [{ opacity: 0 }, { opacity: 1 }], {
        duration: 380,
        delay: openAt + TIMING.lift * 0.30,
        easing: 'linear',
        fill: 'both'
      });
    }

    if (stamp) {
      play(stamp, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 400,
        delay: TOTAL - 120,
        easing: EASE_OUT,
        fill: 'both'
      });
    }

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      for (var i = 0; i < anims.length; i++) {
        try { anims[i].cancel(); } catch (e) { /* already gone */ }
      }
      if (boot.parentNode) boot.parentNode.removeChild(boot);
      if (walls.parentNode) walls.parentNode.removeChild(walls);
      if (cloth.parentNode) cloth.parentNode.removeChild(cloth);
      html.className = html.className.replace(/\s*\bbooting\b/, '');
      stage.style.transform = '';
      markSeen();
      document.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    }

    skip.addEventListener('click', finish);
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);

    /* the lid appears underneath just before the flying copy goes, so the
       handover is the same pixels swapping places with themselves */
    setTimeout(function () { lid.style.opacity = '1'; }, TOTAL - TIMING.handover);
    setTimeout(finish, TOTAL + 120);
    /* and a belt-and-braces teardown if anything above never fires */
    setTimeout(finish, TOTAL + 2500);
  }

  function replay() {
    try { sessionStorage.removeItem(SEEN_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }

  /* the printed mark by the lid opens the box again */
  if (stamp && canAnimate && !reduced) {
    var rosette = stamp.querySelector('.rosette');
    if (rosette) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lid__replay';
      btn.title = 'Open the box again';
      btn.setAttribute('aria-label', 'Open the box again');
      rosette.parentNode.insertBefore(btn, rosette);
      btn.appendChild(rosette);
      btn.addEventListener('click', replay);
    }
  }

  if (canAnimate && !reduced && !seen()) {
    /* wait for the lid face, or the box would open in a fallback font */
    var start = function () { requestAnimationFrame(openTheBox); };
    if (document.fonts && document.fonts.ready) {
      var raced = false;
      var go = function () { if (!raced) { raced = true; start(); } };
      document.fonts.ready.then(go);
      setTimeout(go, 800);
    } else {
      start();
    }
  } else {
    markSeen();
  }
})();
