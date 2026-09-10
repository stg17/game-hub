Game.Input = (function () {
  var down = {};
  var justPressed = {};
  var justReleased = {};
  var mouse = { x: -1, y: -1 };
  var mouseClickedFlag = false;

  function normalize(key) {
    if (key === ' ') return 'Space';
    return key;
  }

  window.addEventListener('keydown', function (e) {
    var key = normalize(e.key);
    if (!down[key]) {
      justPressed[key] = true;
    }
    down[key] = true;
    // Prevent page scrolling on arrows/space.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(key) !== -1) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', function (e) {
    var key = normalize(e.key);
    down[key] = false;
    justReleased[key] = true;
  });

  return {
    isDown: function (key) {
      return !!down[key];
    },
    wasPressed: function (key) {
      return !!justPressed[key];
    },
    wasReleased: function (key) {
      return !!justReleased[key];
    },
    // Menu/UI mouse support: translates client coordinates to the authored
    // 960x540 field, so hit-testing works whatever size the board is drawn at.
    // Not to the backing store — main.js sizes that in device pixels, while
    // every hit region Game.UI registers is in field coordinates.
    attachMouse: function (canvas) {
      function toCanvasCoords(e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = Game.Canvas.WIDTH / rect.width;
        var scaleY = Game.Canvas.HEIGHT / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      }
      canvas.addEventListener('mousemove', function (e) {
        var p = toCanvasCoords(e);
        mouse.x = p.x;
        mouse.y = p.y;
      });
      canvas.addEventListener('click', function (e) {
        var p = toCanvasCoords(e);
        mouse.x = p.x;
        mouse.y = p.y;
        mouseClickedFlag = true;
      });
      canvas.addEventListener('mouseleave', function () {
        mouse.x = -1;
        mouse.y = -1;
      });
    },
    getMousePos: function () {
      return mouse;
    },
    mouseClicked: function () {
      return mouseClickedFlag;
    },
    // Called once per frame after update/render so "just pressed/released" only fires for one frame.
    endFrame: function () {
      justPressed = {};
      justReleased = {};
      mouseClickedFlag = false;
    },
  };
})();
