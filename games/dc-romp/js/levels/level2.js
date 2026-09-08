Game.Levels = Game.Levels || {};

Game.Levels.level2 = {
  name: 'Downtown Street',
  width: 3300,
  height: 560,
  killY: 680,
  theme: 'downtown',
  playerStart: { x: 50, y: 460 },

  platforms: [
    { x: 0, y: 500, w: 600, h: 100, type: 'static' },
    { x: 720, y: 500, w: 400, h: 100, type: 'static' },
    { x: 1290, y: 440, w: 110, h: 20, type: 'moving', axis: 'x', range: 80, speed: 70 },
    { x: 1370, y: 500, w: 450, h: 100, type: 'static' },
    { x: 1950, y: 500, w: 400, h: 100, type: 'static' },
    { x: 2350, y: 440, w: 120, h: 20, type: 'static' },
    { x: 2470, y: 380, w: 120, h: 20, type: 'static' },
    { x: 2600, y: 500, w: 700, h: 100, type: 'static' },
    // Bonus vertical-moving platform with coins above segment D
    { x: 2050, y: 340, w: 100, h: 20, type: 'moving', axis: 'y', range: 60, speed: 40 },
  ],

  enemies: [
    { type: 'goon', x: 350, y: 468, patrolRange: 80 },
    { type: 'drone', x: 660, y: 330, patrolRange: 80 },
    { type: 'goon', x: 900, y: 468, patrolRange: 90 },
    { type: 'drone', x: 1180, y: 340, patrolRange: 90 },
    { type: 'turkey', x: 1500, y: 468, patrolRange: 100 },
    { type: 'goon', x: 1700, y: 468, patrolRange: 80 },
    { type: 'drone', x: 1880, y: 330, patrolRange: 100 },
    { type: 'turkey', x: 2100, y: 468, patrolRange: 90 },
    { type: 'goon', x: 2650, y: 468, patrolRange: 100 },
    { type: 'drone', x: 2900, y: 340, patrolRange: 100 },
  ],

  collectibles: [
    { x: 150, y: 460 }, { x: 450, y: 460 }, { x: 800, y: 460 },
    { x: 1050, y: 460 }, { x: 1320, y: 405 }, { x: 1550, y: 460 },
    { x: 1750, y: 460 }, { x: 2050, y: 305 }, { x: 2100, y: 460 },
    { x: 2380, y: 405 }, { x: 2500, y: 345 }, { x: 2750, y: 460 },
    { x: 3000, y: 460 }, { x: 3150, y: 460 },
  ],

  goal: { x: 3230, y: 380 },
};
