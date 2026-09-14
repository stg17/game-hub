/* The box remembers. Each game keeps its own localStorage key and shares
   nothing with the others, so the hub reads every key itself and prints
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
      return best > 0 ? 'Best score ' + group(best) : null;
    },

    '2048': function () {
      var s = json('2048_state_v1');
      if (!s) return null;
      var best = num(s.best);
      var score = num(s.score);
      if (!best && !score) return null;
      var line = 'Best score ' + group(best);
      if (score > 0) line += ' · game in progress';
      return line;
    },

    ttt: function () {
      /* v2 keeps two tallies, two-player and vs-computer, so that beating the
         computer cannot inflate a two-player record inside the game. Here they
         are summed: this strip is the record of a board, not of a person, and
         it has never claimed to know who X and O were. v1 is still read for
         anyone who has not reopened the game since the split. */
      var x, o, d;
      var s = json('ttt_scores_v2');
      if (s) {
        var two = s.two || {}, cpu = s.cpu || {};
        x = num(two.X) + num(cpu.X);
        o = num(two.O) + num(cpu.O);
        d = num(two.draws) + num(cpu.draws);
      } else {
        var old = json('ttt_scores_v1');
        if (!old) return null;
        x = num(old.X); o = num(old.O); d = num(old.draws);
      }
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
    },

    terms: function () {
      var s = json('terms_stats_v1');
      if (!s) return null;
      var best = num(s.bestStreak);
      var runs = num(s.runs);
      if (best > 0) {
        var line = 'Best streak ' + best;
        var clauses = num(s.bestClauses);
        if (clauses > 0) line += ' · ' + plural(clauses, 'clause', 'clauses');
        return line;
      }
      /* Show completed attempts when no streak has been recorded. */
      return runs > 0 ? plural(runs, 'game played', 'games played') : null;
    },

    /* Nonograms (No. 07). The slug and the storage key predate the rename and
       are deliberately frozen: players' recorded times live under the old key. */
    ink: function () {
      var s = json('inkbynumbers_stats_v1');
      if (!s) return null;
      /* Counted rather than compared against a total: the hub cannot read that
         game's picture list without linking across folders, and a number typed
         here would go stale the first time a plate is added. */
      var done = 0;
      var bag = s.solved || {};
      for (var size in bag) {
        if (!Object.prototype.hasOwnProperty.call(bag, size)) continue;
        var got = bag[size];
        if (!got) continue;
        for (var id in got) if (Object.prototype.hasOwnProperty.call(got, id)) done++;
      }
      if (done > 0) return plural(done, 'puzzle solved', 'puzzles solved');
      return s.current ? 'Puzzle in progress' : null;
    }
  };

  /* Nothing played yet is a real state, and it should read as an invitation
     rather than as a broken value. */
  var unplayed = {
    tetris: 'No score set yet',
    '2048': 'No score set yet',
    ttt: 'No games played yet',
    math: 'No puzzles solved yet',
    romp: 'Level 1 of 5 unlocked',
    terms: 'No streak set yet',
    ink: 'No puzzles solved yet'
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

  /* The beats, as absolute milliseconds on one clock. Everything below reads
     from these, so retiming the opening means editing this block only. */
  var CLOSED_UNTIL = 1000;   /* the closed box sits still this long */
  var LIFTED_AT    = 1800;   /* the cover is off and you can see inside */
  var FLY_FROM     = 2500;   /* the look-inside beat ends, the view moves */
  var FLY_TO       = 4400;   /* the cards are full size, the tag has landed */
  var TOTAL        = 4600;   /* handover done, everything torn down */

  function at(ms) { return ms / TOTAL; }

  /* Easing goes on individual keyframes, never in the options. An effect-level
     easing warps iteration progress *before* keyframe offsets are read, which
     silently crushes the held beats — a one-second hold becomes about two
     hundred milliseconds. The beats above only mean what they say because
     every animation below runs linear at the effect level. */
  var EASE_LIFT = 'cubic-bezier(.2, .85, .3, 1)';    /* the house curve */
  var EASE_PUSH = 'cubic-bezier(.48, .04, .24, 1)';  /* a long camera move */

  var WALL_TOTAL = 32;   /* the chipboard rings drawn outside the window */
  var FIT = 0.88;        /* how much of the screen the closed box takes up */
  var SEEN_KEY = 'gamehub_intro_seen';

  var html = document.documentElement;
  var lid = document.querySelector('.lid');
  var plate = document.querySelector('.lid__plate');
  var stamp = document.querySelector('.lid__stamp');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !!(lid && plate && document.body.animate);
  /* On a phone the URL bar collapses mid-scroll and grows innerHeight, which
     would pull the bottom wall back into view; leave it more room down there. */
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function seen() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* fine, it just replays */ }
  }

  /* Two states, and the distinction matters.

     `boot-hold` hides the page's contents but not the baize behind them, so
     what shows is an empty table — which is the first frame of the story
     anyway. It has to go on synchronously, before anything is awaited: the
     box cannot appear until the lid face has loaded, and `document.fonts`
     does not settle until the load event, which is after the first paint. Add
     it late and the finished page is guaranteed to flash up first.

     `booting` is the animation itself. Both are removed at the end, and a
     guard timer releases the hold if the opening never starts, so the page
     can never be left hidden. */
  function hold() {
    if (html.className.indexOf('boot-hold') === -1) html.className += ' boot-hold';
  }
  function release() {
    html.className = html.className.replace(/\s*\bboot-hold\b/, '');
  }
  function boot_on() {
    if (html.className.indexOf('booting') === -1) html.className += ' booting';
  }
  function unboot() {
    release();
    html.className = html.className.replace(/\s*\bbooting\b/, '');
  }

  /* The plate sits level and untransformed at rest, so its bounding box is
     its layout box and can be read straight off. (It used to carry a
     -1.1deg rotation, which had to be stripped before measuring.) */
  function plateBox() {
    return plate.getBoundingClientRect();
  }

  function openTheBox() {
    /* Measure and place from the top of the page. A replay is a reload, and
       the browser would otherwise restore the old scroll offset under us. */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    var stage = document.createElement('div');
    stage.className = 'boot-stage';
    while (document.body.firstChild) stage.appendChild(document.body.firstChild);
    document.body.appendChild(stage);

    var target = plateBox();
    var anims = [];
    var boot, frame, cloth;

    boot_on();
    release();
    /* real links must not stay tabbable behind the overlay */
    if ('inert' in stage) stage.inert = true;

    /* Armed here, before anything can go wrong. finish() is hoisted and
       defensive, so if any of the setup below throws — leaving the cloth over
       the page — this still gives the page back. */
    setTimeout(function () { finish(); }, TOTAL + 2500);

    /* The box is a window onto the top of the page, not walls around all of
       it — that is what lets the cards inside be big enough to read.

       The window is exactly the viewport plus a margin. That is the whole
       requirement: it has to cover the viewport at scale(1) so every wall
       ends up outside the frame and the box can be removed at the end with
       nothing fading away in view. Asking for any more than that — a boxier
       aspect ratio, a wider overhang — buys nothing and is paid for directly
       in how small the cards start, which is the thing being fixed. It also
       gives the piece a nice property: the window frames the above-the-fold
       view, so the flight reveals nothing new. It is purely a camera move. */
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var sr = stage.getBoundingClientRect();

    var MX = Math.min(40, Math.round(vw * 0.045));  /* slack each side */
    var MY = coarse ? 160 : 56;                     /* and below; see below */

    var winW = Math.round(vw + MX * 2);
    var winH = Math.round(vh + MY);
    var winX = Math.round(-sr.left - MX);   /* relative to the stage */

    /* The stage's transform-origin is its own top-left, so the translate has
       to be measured from there — not from the viewport origin. Getting that
       wrong leaves the box off-centre by sr.left * (1 - s0). */
    var outerW = winW + WALL_TOTAL * 2;
    var outerH = winH + WALL_TOTAL * 2;
    var s0 = Math.min(FIT * vw / outerW, FIT * vh / outerH);

    frame = document.createElement("div");
    frame.className = 'boot-frame';
    frame.style.left = winX + 'px';
    frame.style.top = '0px';
    frame.style.width = winW + 'px';
    frame.style.height = winH + 'px';
    /* wide enough to reach the screen edges once scaled, and no wider */
    frame.style.boxShadow =
      '0 0 0 3px var(--ink),' +
      '0 0 0 29px var(--tray),' +
      '0 0 0 32px var(--ink),' +
      '0 0 0 ' + (Math.ceil(Math.max(vw, vh) / s0) + 240) + 'px var(--table)';
    stage.appendChild(frame);

    /* the cloth covers the window, bled 2px under the frame's keyline so no
       hairline can open up between them */
    cloth = document.createElement("div");
    cloth.className = 'boot-cloth';
    cloth.style.left = (winX - 2) + 'px';
    cloth.style.top = '-2px';
    cloth.style.width = (winW + 4) + 'px';
    cloth.style.height = (winH + 4) + 'px';
    stage.appendChild(cloth);

    var boxCX = sr.left + winX - WALL_TOTAL + outerW / 2;
    var boxCY = sr.top - WALL_TOTAL + outerH / 2;
    var tx = vw / 2 - sr.left - s0 * (boxCX - sr.left);
    var ty = vh / 2 - sr.top - s0 * (boxCY - sr.top);
    var closed = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + s0 + ')';

    /* The cover is the whole face of the closed box, level: the lid you are
       looking at before anything opens. It is the window rect and not the
       outer one, so the chipboard walls stay visible around it — the same
       reason the cloth is sized to the window. Take the walls in too and the
       first frame stops reading as a closed box and becomes a sign on a
       table. Where that rect lands on screen, under the same transform. */
    var startL = sr.left + tx + s0 * winX;
    var startT = sr.top + ty;
    var startW = s0 * winW;
    var startH = s0 * winH;

    boot = document.createElement("div");
    boot.className = 'boot';
    boot.setAttribute('aria-hidden', 'true');

    /* The cover's base geometry is the plate's own resting rect, and the
       animation ends on exactly these values — so the last frame of the
       opening is the resting page rather than a copy of it. */
    var cover = document.createElement('div');
    cover.className = 'boot__cover';
    cover.style.left = target.left + 'px';
    cover.style.top = target.top + 'px';
    cover.style.width = target.width + 'px';
    cover.style.height = target.height + 'px';

    /* The wordmark is wrapped so the plate and the words can move on their
       own terms: the plate shrinks by geometry, keeping its keyline printed
       weight, while the words scale with it and stay centred. */
    var coverPlate = plate.cloneNode(true);
    var mark = document.createElement('div');
    mark.className = 'boot__cover-mark';
    while (coverPlate.firstChild) mark.appendChild(coverPlate.firstChild);
    coverPlate.appendChild(mark);
    cover.appendChild(coverPlate);

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'boot__skip';
    skip.textContent = 'Skip';

    boot.appendChild(cover);
    boot.appendChild(skip);
    document.body.appendChild(boot);

    /* Lifted off, and properly: the cover hides the whole face now, so a
       polite nudge leaves nothing but a sliver of tray showing. It swings up
       and skews the way a lid does when you take it off with one hand, far
       enough to uncover most of the box. Running off the top of the screen on
       the way is fine — that is where a lid goes.

       Level at both ends of the flight and only ever tilted in between, so
       nothing on the finished page sits askew. */
    var lifted = 'translateY(' + -Math.round(startH * 0.42) + 'px) rotate(-8.5deg)';

    /* Read at every keyframe; the shape of the cover at rest is the plate. */
    function geom(l, t, w, h, transform, offset, easing) {
      var f = {
        left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px',
        transform: transform, offset: offset
      };
      if (easing) f.easing = easing;
      return f;
    }

    function play(el, frames, opts) {
      var a = el.animate(frames, opts);
      anims.push(a);
      return a;
    }

    var span = { duration: TOTAL, fill: 'both' };

    /* The cloth goes early, while the box is still shut and the cover hides
       every pixel of it — so the fade itself is never seen, and the tray is
       already full by the time the lid moves. That ordering is the whole
       point: lifting the cover has to reveal the games, not reveal an empty
       box that fills in a second later. It must finish before CLOSED_UNTIL,
       when the lift begins. */
    play(cloth, [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: at(250), easing: 'linear' },
      { opacity: 0, offset: at(850) },
      { opacity: 0, offset: 1 }
    ], span);

    /* Covering the whole box, then unseated and held there long enough to be
       looked at, then shrinking to the tag in the corner across the flight.
       The size is animated, not scaled — see the note in hub.css. */
    play(cover, [
      geom(startL, startT, startW, startH, 'none', 0),
      geom(startL, startT, startW, startH, 'none', at(CLOSED_UNTIL), EASE_LIFT),
      geom(startL, startT, startW, startH, lifted, at(LIFTED_AT)),
      geom(startL, startT, startW, startH, lifted, at(FLY_FROM), EASE_PUSH),
      geom(target.left, target.top, target.width, target.height, 'none', at(FLY_TO)),
      geom(target.left, target.top, target.width, target.height, 'none', 1)
    ], span);

    /* The words ride the shrink. They are scaled to the box at the start and
       their own size when they land, and because the plate's width and this
       scale share both endpoints and the easing, the wordmark stays exactly
       centred at every frame in between rather than drifting across it. */
    var markScale = startW / target.width;
    play(mark, [
      { transform: 'scale(' + markScale + ')', offset: 0 },
      { transform: 'scale(' + markScale + ')', offset: at(FLY_FROM), easing: EASE_PUSH },
      { transform: 'none', offset: at(FLY_TO) },
      { transform: 'none', offset: 1 }
    ], span);

    /* The box holds still while the cover comes off, then the view flies into
       it until the cards are full size and the chipboard leaves the frame.
       Shares EASE_PUSH with the cover, or the two visibly drift apart over
       nearly two seconds. */
    play(stage, [
      { transform: closed, offset: 0 },
      { transform: closed, offset: at(FLY_FROM), easing: EASE_PUSH },
      { transform: 'none', offset: at(FLY_TO) },
      { transform: 'none', offset: 1 }
    ], span);

    /* The handover, as a step on the same clock rather than a stray timer:
       the real lid appears underneath at the instant the flying copy lands
       on it, so the swap is the same pixels replacing themselves. */
    play(lid, [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: at(FLY_TO) },
      { opacity: 1, offset: at(FLY_TO) },
      { opacity: 1, offset: 1 }
    ], span);

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      for (var i = 0; i < anims.length; i++) {
        try { anims[i].cancel(); } catch (e) { /* already gone */ }
      }
      /* The frame's border box overflows the stage by MX, so it has to go
         before `booting` releases the scroll lock — otherwise a horizontal
         scrollbar flashes for a frame on the way out. */
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      if (cloth && cloth.parentNode) cloth.parentNode.removeChild(cloth);
      unboot();
      stage.style.transform = '';
      if ('inert' in stage) stage.inert = false;
      markSeen();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', finish);
      window.removeEventListener('orientationchange', finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    }

    skip.addEventListener('click', finish);
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    /* the window rect is baked in pixels, so a reflow mid-flight would
       unstick the box from its contents — bail out rather than show that */
    window.addEventListener('resize', finish);
    window.addEventListener('orientationchange', finish);

    /* the ordinary end; the belt-and-braces one was armed before setup began */
    setTimeout(finish, TOTAL);
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
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      requestAnimationFrame(openTheBox);
    };
    /* Arm the escape hatch before hiding anything, so a throw between here
       and openTheBox cannot leave the page hidden. */
    setTimeout(function () { if (!started) release(); }, 1400);
    hold();
    /* Wait for the lid face only — the box would otherwise open in a
       fallback font, and the one face its measurements depend on settles far
       sooner than the document-wide promise. */
    if (document.fonts && document.fonts.load) {
      document.fonts.load('400 88px Lid').then(start, start);
      setTimeout(start, 500);
    } else {
      start();
    }
  } else {
    markSeen();
  }
})();
