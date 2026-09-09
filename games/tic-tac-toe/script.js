(function () {
  var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  /* v2 keeps a separate tally per opponent, so beating the computer cannot
     inflate a two-player record. v1 held one flat {X, O, draws} and only ever
     recorded two-player games, so it migrates straight into that side. */
  var STORAGE_KEY = 'ttt_scores_v2';
  var LEGACY_KEY = 'ttt_scores_v1';

  var TWO = 'two';
  var CPU = 'cpu';

  /* In the computer game you are always X and you always open. */
  var HUMAN = 'X';
  var COMPUTER = 'O';

  /* A move that lands the instant you lift your finger reads as the board
     glitching rather than as an opponent answering. */
  var THINK_MS = 420;

  var cells = Array.prototype.slice.call(document.querySelectorAll('.cell'));
  var statusEl = document.getElementById('status');
  var winLineSvg = document.getElementById('winLine');
  var winLineEl = document.getElementById('winLineEl');
  var scoreXValue = document.getElementById('scoreXValue');
  var scoreOValue = document.getElementById('scoreOValue');
  var scoreDrawValue = document.getElementById('scoreDrawValue');
  var scoreXCard = document.getElementById('scoreX');
  var scoreOCard = document.getElementById('scoreO');
  var scoreXLabel = document.getElementById('scoreXLabel');
  var scoreOLabel = document.getElementById('scoreOLabel');
  var headRule = document.getElementById('headRule');
  var modeTwoBtn = document.getElementById('modeTwo');
  var modeCpuBtn = document.getElementById('modeCpu');
  var newRoundBtn = document.getElementById('newRoundBtn');
  var resetScoresBtn = document.getElementById('resetScoresBtn');

  var board = new Array(9).fill(null);
  var currentPlayer = 'X';
  var startingPlayer = 'X';
  var gameOver = false;
  var thinkTimer = null;
  var store = loadStore();

  /* ── the record ─────────────────────────────────────────────────────── */

  function blank() { return { X: 0, O: 0, draws: 0 }; }

  function whole(v) {
    var n = typeof v === 'number' ? v : parseInt(v, 10);
    return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
  }

  function tallyFrom(raw) {
    var t = blank();
    if (raw && typeof raw === 'object') {
      t.X = whole(raw.X);
      t.O = whole(raw.O);
      t.draws = whole(raw.draws);
    }
    return t;
  }

  function loadStore() {
    var out = { mode: TWO, two: blank(), cpu: blank() };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed) {
          out.two = tallyFrom(parsed.two);
          out.cpu = tallyFrom(parsed.cpu);
          if (parsed.mode === CPU) out.mode = CPU;
        }
        return out;
      }
      /* Nothing at v2 yet: carry an existing v1 tally across rather than
         starting somebody's record from zero. v1 is left where it is — the
         hub still reads it as a fallback for the same reason. */
      var old = localStorage.getItem(LEGACY_KEY);
      if (old) out.two = tallyFrom(JSON.parse(old));
    } catch (e) { /* localStorage unavailable — in-memory scores this session */ }
    return out;
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* ignore — scores just won't persist this session */ }
  }

  function vsComputer() { return store.mode === CPU; }
  function tally() { return vsComputer() ? store.cpu : store.two; }

  /* ── the opponent, and how good it is on purpose ─────────────────────────
     It takes a win, blocks a loss, and otherwise prefers the centre, then a
     corner, then a side. What it deliberately never does is look a move
     further ahead, so it walks into a fork: take two opposite corners and it
     has to answer the threat you already made while you quietly build a
     second one it cannot cover.

     That ceiling is the whole design. Tic tac toe is solved, so a minimax
     opponent cannot be beaten at all, only drawn — and something you can
     never beat is not an opponent, it is a wall. This one is beatable if you
     set a trap and unforgiving if you do not. */
  function lineGap(b, mark) {
    for (var i = 0; i < WIN_LINES.length; i++) {
      var line = WIN_LINES[i];
      var owned = 0, gap = -1;
      for (var j = 0; j < 3; j++) {
        var at = line[j];
        if (b[at] === mark) owned++;
        else if (!b[at]) gap = at;
      }
      if (owned === 2 && gap >= 0) return gap;
    }
    return -1;
  }

  function freeFrom(b, list) {
    var out = [];
    for (var i = 0; i < list.length; i++) if (!b[list[i]]) out.push(list[i]);
    return out;
  }

  function anyOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function chooseMove(b) {
    var take = lineGap(b, COMPUTER);
    if (take >= 0) return take;
    var block = lineGap(b, HUMAN);
    if (block >= 0) return block;
    if (!b[4]) return 4;
    var corners = freeFrom(b, [0, 2, 6, 8]);
    if (corners.length) return anyOf(corners);
    var sides = freeFrom(b, [1, 3, 5, 7]);
    if (sides.length) return anyOf(sides);
    return -1;
  }

  /* ── the round ──────────────────────────────────────────────────────── */

  function checkResult(b) {
    for (var i = 0; i < WIN_LINES.length; i++) {
      var line = WIN_LINES[i];
      var a = line[0], m = line[1], c = line[2];
      if (b[a] && b[a] === b[m] && b[a] === b[c]) {
        return { winner: b[a], line: line };
      }
    }
    if (b.every(function (v) { return v; })) {
      return { winner: null, line: null, draw: true };
    }
    return null;
  }

  function render() {
    /* While the computer is answering, the board is not yours to touch — the
       disabled cells are what stop a fast second click landing inside the
       think delay and playing the computer's turn for it. */
    var locked = vsComputer() && currentPlayer !== HUMAN;
    var scores = tally();
    cells.forEach(function (cell, i) {
      var v = board[i];
      cell.textContent = v || '';
      cell.classList.toggle('x', v === 'X');
      cell.classList.toggle('o', v === 'O');
      cell.disabled = !!v || gameOver || locked;
    });
    scoreXValue.textContent = scores.X;
    scoreOValue.textContent = scores.O;
    scoreDrawValue.textContent = scores.draws;
    scoreXCard.classList.toggle('active', !gameOver && currentPlayer === 'X');
    scoreOCard.classList.toggle('active', !gameOver && currentPlayer === 'O');
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  function showTurn() {
    if (vsComputer()) {
      setStatus(currentPlayer === HUMAN ? 'Your turn' : "Computer's turn",
        currentPlayer === 'X' ? 'turn-x' : 'turn-o');
      return;
    }
    setStatus(currentPlayer + "'s turn", currentPlayer === 'X' ? 'turn-x' : 'turn-o');
  }

  function showWinner(winner) {
    if (vsComputer()) {
      setStatus(winner === HUMAN ? 'You win!' : 'Computer wins', 'win');
      return;
    }
    setStatus(winner + ' wins!', 'win');
  }

  function cellCenter(index) {
    return { x: (index % 3) * 100 + 50, y: Math.floor(index / 3) * 100 + 50 };
  }

  function drawWinLine(line) {
    var start = cellCenter(line[0]);
    var end = cellCenter(line[2]);
    winLineEl.setAttribute('x1', start.x);
    winLineEl.setAttribute('y1', start.y);
    winLineEl.setAttribute('x2', end.x);
    winLineEl.setAttribute('y2', end.y);
    winLineSvg.classList.remove('show');
    void winLineSvg.offsetWidth; // force reflow so the draw-on transition replays
    winLineSvg.classList.add('show');
  }

  function clearWinLine() {
    winLineSvg.classList.remove('show');
    winLineEl.setAttribute('x1', 0);
    winLineEl.setAttribute('y1', 0);
    winLineEl.setAttribute('x2', 0);
    winLineEl.setAttribute('y2', 0);
  }

  function placeMark(index) {
    if (gameOver || board[index]) return;

    board[index] = currentPlayer;
    cells[index].classList.add('pop');
    render();

    var result = checkResult(board);
    if (result && result.winner) {
      gameOver = true;
      result.line.forEach(function (i) { cells[i].classList.add('win-cell'); });
      drawWinLine(result.line);
      tally()[result.winner] += 1;
      saveStore();
      showWinner(result.winner);
      render();
      return;
    }
    if (result && result.draw) {
      gameOver = true;
      tally().draws += 1;
      saveStore();
      setStatus("It's a draw!", 'draw');
      render();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    showTurn();
    render();
    scheduleComputer();
  }

  function scheduleComputer() {
    if (!vsComputer() || gameOver || currentPlayer !== COMPUTER) return;
    thinkTimer = setTimeout(function () {
      thinkTimer = null;
      /* The mode can change, or the board be cleared, inside the delay. */
      if (!vsComputer() || gameOver || currentPlayer !== COMPUTER) return;
      var move = chooseMove(board);
      if (move >= 0) placeMark(move);
    }, THINK_MS);
  }

  function cancelThinking() {
    if (thinkTimer) {
      clearTimeout(thinkTimer);
      thinkTimer = null;
    }
  }

  function humanPlay(index) {
    if (gameOver || board[index]) return;
    if (vsComputer() && currentPlayer !== HUMAN) return;
    placeMark(index);
  }

  function newRound() {
    cancelThinking();
    board = new Array(9).fill(null);
    gameOver = false;
    /* Two players alternate the opening each round; against the computer you
       always open, which is the one advantage on offer against an opponent
       that never blunders a block. */
    startingPlayer = vsComputer() ? HUMAN : (startingPlayer === 'X' ? 'O' : 'X');
    currentPlayer = startingPlayer;
    cells.forEach(function (cell) {
      cell.classList.remove('x', 'o', 'pop', 'win-cell');
      cell.textContent = '';
    });
    clearWinLine();
    showTurn();
    render();
  }

  /* Resets what is on screen, which is the tally for the mode you are in.
     Wiping both from one button would throw away a record you cannot see. */
  function resetScores() {
    if (vsComputer()) store.cpu = blank();
    else store.two = blank();
    saveStore();
    render();
  }

  /* ── choosing an opponent ───────────────────────────────────────────── */

  function applyMode() {
    var cpu = vsComputer();
    modeTwoBtn.classList.toggle('is-on', !cpu);
    modeCpuBtn.classList.toggle('is-on', cpu);
    modeTwoBtn.setAttribute('aria-pressed', cpu ? 'false' : 'true');
    modeCpuBtn.setAttribute('aria-pressed', cpu ? 'true' : 'false');

    headRule.textContent = cpu
      ? 'Three in a row wins. You are X, and you always start.'
      : 'Three in a row wins. Whoever starts alternates each round.';

    /* The mark on each plate already says X or O; the label says whose those
       are, which is the part that changes with the opponent. */
    scoreXLabel.textContent = cpu ? 'you' : 'wins';
    scoreOLabel.textContent = cpu ? 'computer' : 'wins';
    scoreXCard.setAttribute('aria-label', cpu ? 'Your wins, playing X' : 'Wins for X');
    scoreOCard.setAttribute('aria-label', cpu ? 'Wins for the computer, playing O' : 'Wins for O');
  }

  function setMode(next) {
    if (store.mode === next) return;
    store.mode = next;
    saveStore();
    applyMode();
    /* A half-played board belongs to the opponent it was played against. */
    newRound();
  }

  /* ── wiring ─────────────────────────────────────────────────────────── */

  cells.forEach(function (cell, i) {
    cell.addEventListener('click', function () { humanPlay(i); });
  });
  modeTwoBtn.addEventListener('click', function () { setMode(TWO); });
  modeCpuBtn.addEventListener('click', function () { setMode(CPU); });
  newRoundBtn.addEventListener('click', newRound);
  resetScoresBtn.addEventListener('click', resetScores);

  applyMode();
  if (vsComputer()) {
    startingPlayer = HUMAN;
    currentPlayer = HUMAN;
  }
  showTurn();
  render();
})();
