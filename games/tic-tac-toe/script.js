(function () {
  var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  var STORAGE_KEY = 'ttt_scores_v1';

  var cells = Array.prototype.slice.call(document.querySelectorAll('.cell'));
  var statusEl = document.getElementById('status');
  var winLineSvg = document.getElementById('winLine');
  var winLineEl = document.getElementById('winLineEl');
  var scoreXValue = document.getElementById('scoreXValue');
  var scoreOValue = document.getElementById('scoreOValue');
  var scoreDrawValue = document.getElementById('scoreDrawValue');
  var scoreXCard = document.getElementById('scoreX');
  var scoreOCard = document.getElementById('scoreO');
  var newRoundBtn = document.getElementById('newRoundBtn');
  var resetScoresBtn = document.getElementById('resetScoresBtn');

  var board = new Array(9).fill(null);
  var currentPlayer = 'X';
  var startingPlayer = 'X';
  var gameOver = false;
  var scores = loadScores();

  function loadScores() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage unavailable — fall back to in-memory scores */ }
    return { X: 0, O: 0, draws: 0 };
  }

  function saveScores() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) { /* ignore — scores just won't persist this session */ }
  }

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
    cells.forEach(function (cell, i) {
      var v = board[i];
      cell.textContent = v || '';
      cell.classList.toggle('x', v === 'X');
      cell.classList.toggle('o', v === 'O');
      cell.disabled = !!v || gameOver;
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
      scores[result.winner] += 1;
      saveScores();
      setStatus(result.winner + ' wins!', 'win');
      render();
      return;
    }
    if (result && result.draw) {
      gameOver = true;
      scores.draws += 1;
      saveScores();
      setStatus("It's a draw!", 'draw');
      render();
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setStatus(currentPlayer + "'s turn", currentPlayer === 'X' ? 'turn-x' : 'turn-o');
    render();
  }

  function newRound() {
    board = new Array(9).fill(null);
    gameOver = false;
    startingPlayer = startingPlayer === 'X' ? 'O' : 'X';
    currentPlayer = startingPlayer;
    cells.forEach(function (cell) {
      cell.classList.remove('x', 'o', 'pop', 'win-cell');
      cell.textContent = '';
    });
    clearWinLine();
    setStatus(currentPlayer + "'s turn", currentPlayer === 'X' ? 'turn-x' : 'turn-o');
    render();
  }

  function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };
    saveScores();
    render();
  }

  cells.forEach(function (cell, i) {
    cell.addEventListener('click', function () { placeMark(i); });
  });
  newRoundBtn.addEventListener('click', newRound);
  resetScoresBtn.addEventListener('click', resetScores);

  setStatus(currentPlayer + "'s turn", 'turn-x');
  render();
})();
