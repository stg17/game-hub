// Nonograms — headless self-check.  Run it with:  node selfcheck.js
//
// The throwaway-Node-script pattern CLAUDE.md documents for the other
// generators, kept in the folder because this game makes a promise that has to
// be enforced rather than intended: every plate in the box is finishable by
// pure deduction, never by a guess.
//
// A nonogram that needs a guess is the worst kind of broken. It looks fine, it
// plays fine for ten minutes, and then it asks the player to pick one of two
// branches with no way to tell which — and if they pick wrong they find out
// much later, with no idea where it went wrong. So the line solver runs over
// every plate from a blank sheet, and a plate that stalls it fails here.
// Solving a nonogram by forced deductions alone is also proof the solution is
// unique, so this covers both properties at once.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var sandbox = {};
sandbox.window = sandbox;
var ctx = vm.createContext(sandbox);
['nonograms.js', 'pictures.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
});

var N = sandbox.INK.Nonograms;
var P = sandbox.INK.Pictures;

var failures = [];
function check(ok, msg) { if (!ok) failures.push(msg); }

/* ── the clue reader, on its own ────────────────────────────────────────── */

(function () {
  var cases = [
    [[0, 0, 0, 0], [0]],
    [[1, 1, 1, 1], [4]],
    [[1, 0, 1, 0], [1, 1]],
    [[0, 1, 1, 0], [2]],
    [[1, 0, 0, 1], [1, 1]],
    [[1, 1, 0, 1, 1, 1], [2, 3]]
  ];
  cases.forEach(function (c) {
    var got = N.cluesFor(c[0]);
    check(got.join(',') === c[1].join(','),
      'cluesFor([' + c[0] + ']) gave [' + got + '], expected [' + c[1] + ']');
  });
})();

/* ── the line solver, on its own ────────────────────────────────────────── */

(function () {
  var U = N.UNKNOWN, F = N.FILLED, E = N.EMPTY;

  /* a run that fills the line is fully forced */
  var got = N.solveLine([5], [U, U, U, U, U]);
  check(got.join('') === [F, F, F, F, F].join(''), 'solveLine([5]) on 5 blanks: ' + got);

  /* the classic overlap: a 3 in a 4-wide line pins the middle two */
  got = N.solveLine([3], [U, U, U, U]);
  check(got[1] === F && got[2] === F && got[0] === U && got[3] === U,
    'solveLine([3]) on 4 blanks should pin only the middle two, gave ' + got);

  /* a blank line is all empty */
  got = N.solveLine([0], [U, U, U]);
  check(got.join('') === [E, E, E].join(''), 'solveLine([0]) should empty the line, gave ' + got);

  /* nothing is deducible here, and the solver must say so rather than guess */
  got = N.solveLine([1], [U, U, U]);
  check(got.join('') === [U, U, U].join(''), 'solveLine([1]) on 3 blanks should decide nothing, gave ' + got);

  /* a known cell narrows it */
  got = N.solveLine([1], [E, U, E]);
  check(got[1] === F, 'solveLine([1]) with both ends crossed should find the middle, gave ' + got);

  /* impossible lines are reported, not silently accepted */
  check(N.solveLine([4], [U, U, U]) === null, 'a 4-run in a 3-wide line should be impossible');
  check(N.solveLine([1, 1], [U, U]) === null, 'two separated runs cannot fit in 2 cells');
  check(N.solveLine([2], [E, U, E, E, E]) === null,
    'a 2-run with only one free cell should be impossible');
  /* ...but two adjacent free cells are enough, and are then forced */
  got = N.solveLine([2], [E, U, U, E, E]);
  check(got && got[1] === F && got[2] === F,
    'a 2-run with exactly two free cells should fill both, gave ' + got);

  /* every deduction must be sound: whatever the solver commits to has to hold
     in every arrangement, so re-solving from its own output changes nothing */
  var lines = [[3, 1], [1, 1, 1], [2, 2], [5], [1, 4], [0]];
  lines.forEach(function (clues) {
    var first = N.solveLine(clues, [U, U, U, U, U, U, U, U, U, U]);
    if (!first) { check(false, 'clues [' + clues + '] impossible in 10 cells'); return; }
    var second = N.solveLine(clues, first);
    check(second && second.join('') === first.join(''),
      'solveLine is not idempotent for [' + clues + ']: ' + first + ' then ' + second);
  });
})();

/* ── every plate ────────────────────────────────────────────────────────── */

var totals = { plates: 0, cells: 0 };
var report = [];

P.sizes().forEach(function (sz) {
  var list = P.plates(sz.id);
  check(list.length > 0, 'size "' + sz.id + '" has no plates');

  var seen = {};
  var hardest = { passes: 0, name: '' };

  list.forEach(function (pl) {
    totals.plates++;

    check(!seen[pl.id], 'duplicate plate id "' + pl.id + '" in size ' + sz.id);
    seen[pl.id] = true;
    check(!!pl.name && pl.name.length > 1, 'plate "' + pl.id + '" has no name');

    /* the shape must match the size it is filed under */
    check(pl.rows.length === sz.dim,
      'plate "' + pl.id + '" has ' + pl.rows.length + ' rows, but size ' + sz.id + ' is ' + sz.dim);
    pl.rows.forEach(function (r, y) {
      check(r.length === sz.dim,
        'plate "' + pl.id + '" row ' + y + ' is ' + r.length + ' wide, expected ' + sz.dim);
      check(/^[#.]+$/.test(r),
        'plate "' + pl.id + '" row ' + y + ' has characters other than # and .');
    });

    var grid = N.parse(pl.rows);
    totals.cells += sz.dim * sz.dim;

    /* an empty or completely full plate is not a puzzle */
    var ink = 0;
    grid.forEach(function (row) { row.forEach(function (c) { if (c) ink++; }); });
    var pct = ink / (sz.dim * sz.dim);
    check(pct > 0.12 && pct < 0.88,
      'plate "' + pl.id + '" is ' + Math.round(pct * 100) + '% ink, which is not a puzzle');

    /* clues must round-trip: derived from the plate, they describe the plate */
    var clues = N.cluesOf(grid);
    check(clues.rows.length === sz.dim && clues.cols.length === sz.dim,
      'plate "' + pl.id + '" produced the wrong number of clue lines');
    for (var y = 0; y < sz.dim; y++) {
      var sum = clues.rows[y].reduce(function (a, b) { return a + b; }, 0);
      var actual = grid[y].filter(Boolean).length;
      check(sum === actual,
        'plate "' + pl.id + '" row ' + y + ' clues total ' + sum + ' but the row holds ' + actual);
    }
    for (var x = 0; x < sz.dim; x++) {
      var csum = clues.cols[x].reduce(function (a, b) { return a + b; }, 0);
      var cactual = 0;
      for (var yy = 0; yy < sz.dim; yy++) if (grid[yy][x]) cactual++;
      check(csum === cactual,
        'plate "' + pl.id + '" column ' + x + ' clues total ' + csum + ' but the column holds ' + cactual);
    }

    /* THE ONE THAT MATTERS: finishable by forced deductions alone, which also
       makes the solution unique */
    var fair = N.isFair(grid);
    check(fair.fair,
      'plate "' + pl.id + '" (' + pl.name + ') needs a guess — ' + fair.why +
      '. Break its symmetry slightly, or drop it.');
    if (fair.fair && fair.passes > hardest.passes) {
      hardest = { passes: fair.passes, name: pl.name };
    }

    /* and the game's own win test must accept the finished plate and reject a
       plate with any one cell wrong */
    var done = [];
    for (var dy = 0; dy < sz.dim; dy++) {
      var drow = [];
      for (var dx = 0; dx < sz.dim; dx++) {
        drow.push(grid[dy][dx] ? N.FILLED : N.UNKNOWN);
      }
      done.push(drow);
    }
    check(N.isComplete(done, grid), 'plate "' + pl.id + '" is not recognised as finished when it is');
    check(N.mistakes(done, grid).length === 0, 'a correct plate reported mistakes');

    /* flip one inked cell off, and one blank cell on */
    var anyInk = null, anyBlank = null;
    for (var sy = 0; sy < sz.dim && (!anyInk || !anyBlank); sy++) {
      for (var sx = 0; sx < sz.dim; sx++) {
        if (grid[sy][sx] && !anyInk) anyInk = [sy, sx];
        if (!grid[sy][sx] && !anyBlank) anyBlank = [sy, sx];
      }
    }
    if (anyInk) {
      done[anyInk[0]][anyInk[1]] = N.EMPTY;
      check(!N.isComplete(done, grid), 'plate "' + pl.id + '" passes with an inked cell missing');
      done[anyInk[0]][anyInk[1]] = N.FILLED;
    }
    if (anyBlank) {
      done[anyBlank[0]][anyBlank[1]] = N.FILLED;
      check(!N.isComplete(done, grid), 'plate "' + pl.id + '" passes with a stray inked cell');
      check(N.mistakes(done, grid).length === 1, 'a single stray cell was not counted as one mistake');
      done[anyBlank[0]][anyBlank[1]] = N.UNKNOWN;
    }

    /* crossing off the blanks must not be required to win */
    for (var cy = 0; cy < sz.dim; cy++) {
      for (var cx = 0; cx < sz.dim; cx++) {
        if (!grid[cy][cx]) done[cy][cx] = N.EMPTY;
      }
    }
    check(N.isComplete(done, grid), 'plate "' + pl.id + '" fails when the blanks are crossed off');
  });

  report.push('  ' + sz.label + ' (' + sz.note + '): ' + list.length +
    ' plates, hardest is ' + hardest.name + ' at ' + hardest.passes + ' passes');
});

/* the solver must not "solve" a plate that has been sabotaged */
(function () {
  var pl = P.plate('medium', 'fish');
  var grid = N.parse(pl.rows);
  var clues = N.cluesOf(grid);
  clues.rows[0] = [9];          /* a row that cannot coexist with the columns */
  var res = N.solve(clues);
  check(res.status !== 'solved', 'the solver claimed to solve contradictory clues');
})();

/* ── report ─────────────────────────────────────────────────────────────── */

console.log('plates checked        ' + totals.plates);
console.log('cells checked         ' + totals.cells);
report.forEach(function (l) { console.log(l); });

if (failures.length) {
  console.log('\nFAILED (' + failures.length + ')');
  failures.slice(0, 25).forEach(function (f) { console.log('  - ' + f); });
  if (failures.length > 25) console.log('  ... and ' + (failures.length - 25) + ' more');
  process.exit(1);
}
console.log('\nevery plate is finishable by deduction alone, and its solution is the only one');
