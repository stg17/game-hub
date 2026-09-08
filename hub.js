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
})();
