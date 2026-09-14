// Nonograms — the logic, with no DOM and no timers in sight.
//
// A nonogram is a printed picture described only by how much ink each row and
// column carries. The numbers along the top and side are the run lengths of
// filled cells, in order. You reconstruct the plate from the numbers.
//
// THE PROMISE THIS FILE KEEPS: every puzzle in the box can be finished by pure
// deduction. Never a guess, never a 50/50 you only discover was wrong four
// moves later. That is not a matter of taste — a nonogram that needs a guess is
// a nonogram that can waste twenty minutes and then blame the player. So the
// solver below is not a hint engine bolted on afterwards; it is the thing that
// decides whether a picture is allowed in the game at all, and selfcheck.js
// runs it over every picture in pictures.js.
window.INK = window.INK || {};
window.INK.Nonograms = (function () {
  'use strict';

  /* A cell in a player's grid, or in the solver's working grid. */
  var UNKNOWN = 0;
  var FILLED = 1;
  var EMPTY = 2;

  /* ── reading a picture ──────────────────────────────────────────────────
     A picture is authored as an array of strings, '#' for ink. Turning that
     into a grid of 1s and 0s is the only parsing in the game. */

  function parse(rows) {
    var grid = [];
    for (var y = 0; y < rows.length; y++) {
      var line = [];
      for (var x = 0; x < rows[y].length; x++) {
        line.push(rows[y].charAt(x) === '#' ? 1 : 0);
      }
      grid.push(line);
    }
    return grid;
  }

  function column(grid, x) {
    var out = [];
    for (var y = 0; y < grid.length; y++) out.push(grid[y][x]);
    return out;
  }

  /* ── clues ──────────────────────────────────────────────────────────────
     The run lengths of ink along one line. A line with no ink at all prints a
     single 0, which is the printed convention and also tells the player
     something real: the line is blank, cross it all off. */

  function cluesFor(line) {
    var out = [];
    var run = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i]) {
        run++;
      } else if (run) {
        out.push(run);
        run = 0;
      }
    }
    if (run) out.push(run);
    return out.length ? out : [0];
  }

  function cluesOf(grid) {
    var w = grid[0].length;
    var rows = [];
    var cols = [];
    for (var y = 0; y < grid.length; y++) rows.push(cluesFor(grid[y]));
    for (var x = 0; x < w; x++) cols.push(cluesFor(column(grid, x)));
    return { rows: rows, cols: cols };
  }

  /* ── solving one line ───────────────────────────────────────────────────
     The whole solver rests on this. Given a line's clues and what is already
     known about it, walk every arrangement of the runs that does not
     contradict what is known; a cell that comes out filled in all of them is
     filled, and one that comes out empty in all of them is empty. Anything
     else stays unknown.

     This is exact, not heuristic: it finds every deduction available from a
     single line, so if the puzzle stalls it is genuinely because no line has
     anything left to say — not because the solver was not clever enough. */

  function solveLine(clues, cells) {
    var n = cells.length;
    var runs = (clues.length === 1 && clues[0] === 0) ? [] : clues;

    var canFill = [];
    var canEmpty = [];
    var buf = [];
    var i;
    for (i = 0; i < n; i++) { canFill.push(false); canEmpty.push(false); buf.push(UNKNOWN); }

    /* least space the runs from `ri` onward can possibly occupy */
    var tail = [];
    tail[runs.length] = 0;
    for (i = runs.length - 1; i >= 0; i--) {
      tail[i] = runs[i] + (i + 1 < runs.length ? 1 + tail[i + 1] : 0);
    }

    var found = 0;

    function record() {
      found++;
      for (var k = 0; k < n; k++) {
        if (buf[k] === FILLED) canFill[k] = true; else canEmpty[k] = true;
      }
    }

    function place(ri, pos) {
      if (ri === runs.length) {
        /* everything left over must be blank */
        for (var k = pos; k < n; k++) {
          if (cells[k] === FILLED) return;
          buf[k] = EMPTY;
        }
        record();
        return;
      }
      var len = runs[ri];
      for (var start = pos; start + tail[ri] <= n; start++) {
        /* the gap before this run */
        var gapOk = true;
        for (var e = pos; e < start; e++) {
          if (cells[e] === FILLED) { gapOk = false; break; }
          buf[e] = EMPTY;
        }
        /* a known-filled cell cannot be skipped, and sliding further right
           would only skip it again — so this line of attack is finished */
        if (!gapOk) break;

        var runOk = true;
        for (var f = start; f < start + len; f++) {
          if (cells[f] === EMPTY) { runOk = false; break; }
          buf[f] = FILLED;
        }
        if (!runOk) continue;

        var after = start + len;
        if (after < n) {
          /* runs must be separated, so the cell after this one is blank */
          if (cells[after] === FILLED) continue;
          buf[after] = EMPTY;
        }
        place(ri + 1, after + 1);
      }
    }

    place(0, 0);

    if (!found) return null;                 /* the line contradicts itself */

    var out = [];
    for (i = 0; i < n; i++) {
      if (canFill[i] && !canEmpty[i]) out.push(FILLED);
      else if (canEmpty[i] && !canFill[i]) out.push(EMPTY);
      else out.push(UNKNOWN);
    }
    return out;
  }

  /* ── solving a whole puzzle ─────────────────────────────────────────────
     Rows and columns in turn, over and over, until a pass changes nothing.
     Every write is forced by a single line, so anything this reaches is a
     deduction the player could also have made. */

  function blank(h, w) {
    var g = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) row.push(UNKNOWN);
      g.push(row);
    }
    return g;
  }

  // Returns { status, grid, passes }. status is 'solved' when every cell is
  // decided, 'stuck' when line logic runs out (the puzzle would need a guess),
  // or 'contradiction' when the clues cannot be satisfied at all.
  function solve(clues, start) {
    var h = clues.rows.length;
    var w = clues.cols.length;
    var grid = start ? start.map(function (r) { return r.slice(); }) : blank(h, w);
    var passes = 0;
    var changed = true;
    var x, y;

    while (changed) {
      changed = false;
      passes++;

      for (y = 0; y < h; y++) {
        var got = solveLine(clues.rows[y], grid[y]);
        if (!got) return { status: 'contradiction', grid: grid, passes: passes };
        for (x = 0; x < w; x++) {
          if (got[x] !== UNKNOWN && grid[y][x] === UNKNOWN) { grid[y][x] = got[x]; changed = true; }
        }
      }

      for (x = 0; x < w; x++) {
        var col = [];
        for (y = 0; y < h; y++) col.push(grid[y][x]);
        var gotc = solveLine(clues.cols[x], col);
        if (!gotc) return { status: 'contradiction', grid: grid, passes: passes };
        for (y = 0; y < h; y++) {
          if (gotc[y] !== UNKNOWN && grid[y][x] === UNKNOWN) { grid[y][x] = gotc[y]; changed = true; }
        }
      }
    }

    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (grid[y][x] === UNKNOWN) return { status: 'stuck', grid: grid, passes: passes };
      }
    }
    return { status: 'solved', grid: grid, passes: passes };
  }

  /* A picture is fair if line logic alone finishes it from a blank sheet.
     Because every deduction the solver makes is forced, finishing this way is
     also proof the solution is the only one. */
  function isFair(grid) {
    var res = solve(cluesOf(grid));
    if (res.status !== 'solved') return { fair: false, why: res.status, passes: res.passes };
    /* and what it solved to had better be the picture we started from */
    for (var y = 0; y < grid.length; y++) {
      for (var x = 0; x < grid[y].length; x++) {
        var want = grid[y][x] ? FILLED : EMPTY;
        if (res.grid[y][x] !== want) {
          return { fair: false, why: 'solved to a different picture', passes: res.passes };
        }
      }
    }
    return { fair: true, why: 'line logic alone', passes: res.passes };
  }

  /* ── judging a player's grid ────────────────────────────────────────────
     Only ink counts. A cell the player crossed off and a cell they simply have
     not touched are both "no ink" as far as winning goes, so a finished
     picture wins whether or not they bothered to mark the blanks. */
  function isComplete(grid, solution) {
    for (var y = 0; y < solution.length; y++) {
      for (var x = 0; x < solution[y].length; x++) {
        var inked = grid[y][x] === FILLED;
        if (inked !== !!solution[y][x]) return false;
      }
    }
    return true;
  }

  // Cells the player has inked that carry no ink in the plate. Used for the
  // count on the finish card, never to interrupt play — being told mid-puzzle
  // that you are wrong would do the deducing for you.
  function mistakes(grid, solution) {
    var out = [];
    for (var y = 0; y < solution.length; y++) {
      for (var x = 0; x < solution[y].length; x++) {
        if (grid[y][x] === FILLED && !solution[y][x]) out.push({ x: x, y: y });
      }
    }
    return out;
  }

  return {
    UNKNOWN: UNKNOWN,
    FILLED: FILLED,
    EMPTY: EMPTY,
    parse: parse,
    cluesFor: cluesFor,
    cluesOf: cluesOf,
    solveLine: solveLine,
    solve: solve,
    isFair: isFair,
    isComplete: isComplete,
    mistakes: mistakes,
    blank: blank
  };
})();
