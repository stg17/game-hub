(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

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
