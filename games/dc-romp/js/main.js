(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  /* The board is sized by CSS and the game is authored against a fixed
     960x540 field. Give the backing store the device pixels the box really
     occupies and scale the context back to the authored field: the picture is
     then drawn at the screen's own resolution instead of being stretched to
     it, which is what a HiDPI display was making blurry. Capped at 2x so a
     large board on a 3x screen does not quadruple the fill cost for nothing. */
  function sizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;   // assigning either also resets the context state,
      canvas.height = h;  // so the transform below is set after, every time
    }
    ctx.setTransform(w / Game.Canvas.WIDTH, 0, 0, h / Game.Canvas.HEIGHT, 0, 0);
  }

  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  Game.Input.attachMouse(canvas);
  Game.init();

  var STEP = 1000 / 60;
  var accumulator = 0;
  var lastTime = 0;

  function loop(timestamp) {
    var frameTime = timestamp - lastTime;
    lastTime = timestamp;
    if (frameTime > 250) frameTime = 250; // clamp on tab-switch/lag spikes

    accumulator += frameTime;
    while (accumulator >= STEP) {
      Game.update(STEP / 1000);
      Game.Input.endFrame();
      accumulator -= STEP;
    }
    Game.render(ctx);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(function (t) {
    lastTime = t;
    requestAnimationFrame(loop);
  });
})();
