Game.Levels = Game.Levels || {};

Game.Levels.level4 = {
  name: 'Golf Course',
  width: 3500,
  height: 560,
  killY: 680,
  theme: 'golf',
  playerStart: { x: 50, y: 460 },

  platforms: [
    { x: 0, y: 500, w: 650, h: 100, type: 'static' },
    { x: 800, y: 500, w: 500, h: 100, type: 'static' },
    { x: 1385, y: 430, w: 120, h: 20, type: 'moving', axis: 'x', range: 70, speed: 70 },
    { x: 1470, y: 500, w: 530, h: 100, type: 'static' },
    { x: 2150, y: 500, w: 550, h: 100, type: 'static' },
    { x: 2760, y: 440, w: 120, h: 20, type: 'moving', axis: 'x', range: 60, speed: 65 },
    { x: 2900, y: 500, w: 600, h: 100, type: 'static' },
    // Bonus floating platforms with coins
    { x: 200, y: 400, w: 120, h: 20, type: 'static' },
    { x: 950, y: 380, w: 100, h: 20, type: 'static' },
    { x: 1650, y: 400, w: 110, h: 20, type: 'static' },
    { x: 2300, y: 380, w: 100, h: 20, type: 'static' },
  ],

  enemies: [
    { type: 'goon', x: 300, y: 468, patrolRange: 90 },
    { type: 'turkey', x: 550, y: 468, patrolRange: 80 },
    { type: 'drone', x: 900, y: 340, patrolRange: 130 },
    { type: 'goon', x: 1100, y: 468, patrolRange: 90 },
    { type: 'drone', x: 1420, y: 320, patrolRange: 100 },
    { type: 'turkey', x: 1750, y: 468, patrolRange: 100 },
    { type: 'goon', x: 2000, y: 468, patrolRange: 90 },
    { type: 'drone', x: 2250, y: 340, patrolRange: 110 },
    { type: 'goon', x: 2500, y: 468, patrolRange: 90 },
    { type: 'turkey', x: 2650, y: 468, patrolRange: 90 },
    { type: 'drone', x: 3000, y: 340, patrolRange: 120 },
    { type: 'goon', x: 3250, y: 468, patrolRange: 100 },
  ],

  collectibles: [
    { x: 150, y: 460 }, { x: 260, y: 365 }, { x: 450, y: 460 },
    { x: 850, y: 460 }, { x: 1000, y: 345 }, { x: 1250, y: 460 },
    { x: 1550, y: 460 }, { x: 1700, y: 365 }, { x: 1900, y: 460 },
    { x: 2200, y: 460 }, { x: 2350, y: 345 }, { x: 2550, y: 460 },
    { x: 2950, y: 460 }, { x: 3200, y: 460 }, { x: 3400, y: 460 },
  ],

  goal: { x: 3440, y: 380 },
};
