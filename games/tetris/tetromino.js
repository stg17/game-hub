// Tetromino shape data, SRS rotation states, wall-kick tables, and the 7-bag
// randomizer.
//
// Cell offsets are [col, row] inside each piece's own bounding box, with row
// increasing DOWNWARD to match canvas/grid coordinates. The wall-kick tables
// below are the standard SRS tables with their y components ALREADY NEGATED to
// suit that, so nothing has to flip signs at use time — add a kick offset to a
// piece's x/y directly.
var Tetromino = (function () {
  var SHAPES = {
    I: {
      size: 4,
      color: '#7fb5e0',
      states: [
        [[0, 1], [1, 1], [2, 1], [3, 1]],
        [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]],
        [[1, 0], [1, 1], [1, 2], [1, 3]],
      ],
    },
    J: {
      size: 3,
      color: '#e6dcc4',
      states: [
        [[0, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [0, 2], [1, 2]],
      ],
    },
    L: {
      size: 3,
      color: '#d8912a',
      states: [
        [[2, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
      ],
    },
    O: {
      size: 2,
      color: '#e0c341',
      states: [
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
      ],
    },
    S: {
      size: 3,
      color: '#8fbf6a',
      states: [
        [[1, 0], [2, 0], [0, 1], [1, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
      ],
    },
    T: {
      size: 3,
      color: '#a87fc0',
      states: [
        [[1, 0], [0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]],
        [[1, 0], [0, 1], [1, 1], [1, 2]],
      ],
    },
    Z: {
      size: 3,
      color: '#cf6b4a',
      states: [
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 0], [0, 1], [1, 1], [0, 2]],
      ],
    },
  };

  var TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  // Keyed 'fromRotation>toRotation'. Tried in order; the first offset that
  // leaves the piece in a legal spot wins, which is the whole of SRS kicking.
  var KICKS_JLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };

  var KICKS_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3>0': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '0>3': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  };

  function state(type, rot) {
    return SHAPES[type].states[((rot % 4) + 4) % 4];
  }

  function colorOf(type) {
    return SHAPES[type].color;
  }

  // Absolute grid cells occupied by a piece record {type, rot, x, y}.
  function cells(piece) {
    var st = state(piece.type, piece.rot);
    var out = [];
    for (var i = 0; i < st.length; i++) {
      out.push({ x: piece.x + st[i][0], y: piece.y + st[i][1] });
    }
    return out;
  }

  // The O piece is rotationally symmetric, so it never needs (or gets) a kick.
  function kicks(type, from, to) {
    if (type === 'O') return [[0, 0]];
    var table = type === 'I' ? KICKS_I : KICKS_JLSTZ;
    return table[from + '>' + to] || [[0, 0]];
  }

  // Spawn centred near the top. x is chosen so the piece straddles the middle
  // columns; y = 0 keeps the whole spawn visible rather than using the hidden
  // rows a full guideline implementation would have.
  function spawn(type) {
    return { type: type, rot: 0, x: type === 'O' ? 4 : 3, y: 0 };
  }

  // 7-bag: every shuffled bag of all seven pieces is consumed before the next
  // is mixed in, so droughts are bounded.
  function bag() {
    var queue = [];

    function refill() {
      var next = TYPES.slice();
      for (var i = next.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = next[i];
        next[i] = next[j];
        next[j] = swap;
      }
      queue = queue.concat(next);
    }

    return {
      next: function () {
        if (queue.length <= TYPES.length) refill();
        return queue.shift();
      },
      peek: function (n) {
        while (queue.length < n) refill();
        return queue.slice(0, n);
      },
    };
  }

  return {
    TYPES: TYPES,
    state: state,
    colorOf: colorOf,
    cells: cells,
    kicks: kicks,
    spawn: spawn,
    bag: bag,
  };
})();
