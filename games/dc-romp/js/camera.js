Game.Camera = {
  x: 0,
  y: 0,
  width: Game.Canvas.WIDTH,
  height: Game.Canvas.HEIGHT,

  reset: function () {
    this.x = 0;
    this.y = 0;
  },

  follow: function (target, levelWidth, levelHeight) {
    var targetX = target.x + target.w / 2 - this.width / 2;
    var targetY = target.y + target.h / 2 - this.height * 0.6;
    this.x = Game.Utils.clamp(targetX, 0, Math.max(0, levelWidth - this.width));
    this.y = Game.Utils.clamp(targetY, 0, Math.max(0, levelHeight - this.height));
  },
};
