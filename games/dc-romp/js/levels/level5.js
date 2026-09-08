Game.Levels = Game.Levels || {};

Game.Levels.level5 = {
  name: 'Air Force One',
  width: 3000,
  height: 820,
  killY: 780,
  theme: 'sky',
  playerStart: { x: 50, y: 460 },

  platforms: [
    { x: 0, y: 500, w: 500, h: 100, type: 'static' },
    { x: 575, y: 430, w: 110, h: 20, type: 'moving', axis: 'x', range: 60, speed: 80 },
    { x: 650, y: 500, w: 350, h: 100, type: 'static' },
    { x: 1000, y: 420, w: 120, h: 20, type: 'static' },
    { x: 1150, y: 340, w: 120, h: 20, type: 'moving', axis: 'y', range: 50, speed: 60 },
    { x: 1300, y: 340, w: 400, h: 80, type: 'static' },
    { x: 1850, y: 340, w: 400, h: 80, type: 'static' },
    { x: 2250, y: 420, w: 120, h: 20, type: 'static' },
    { x: 2370, y: 500, w: 330, h: 100, type: 'static' },
    { x: 2700, y: 430, w: 110, h: 20, type: 'moving', axis: 'x', range: 60, speed: 90 },
    { x: 2820, y: 380, w: 180, h: 100, type: 'static' },
  ],

  enemies: [
    { type: 'goon', x: 150, y: 468, patrolRange: 100 },
    { type: 'drone', x: 560, y: 350, patrolRange: 70 },
    { type: 'turkey', x: 800, y: 468, patrolRange: 90 },
    { type: 'drone', x: 1050, y: 360, patrolRange: 60 },
    { type: 'goon', x: 1400, y: 308, patrolRange: 120 },
    { type: 'drone', x: 1600, y: 250, patrolRange: 80 },
    { type: 'drone', x: 1780, y: 300, patrolRange: 70 },
    { type: 'turkey', x: 1950, y: 308, patrolRange: 120 },
    { type: 'goon', x: 2150, y: 308, patrolRange: 90 },
    { type: 'drone', x: 2500, y: 380, patrolRange: 100 },
    { type: 'goon', x: 2600, y: 468, patrolRange: 90 },
    { type: 'drone', x: 2850, y: 330, patrolRange: 70 },
  ],

  collectibles: [
    { x: 150, y: 460 }, { x: 350, y: 460 }, { x: 700, y: 460 },
    { x: 1020, y: 365 }, { x: 1350, y: 285 }, { x: 1500, y: 285 },
    { x: 1650, y: 285 }, { x: 1900, y: 285 }, { x: 2050, y: 285 },
    { x: 2200, y: 285 }, { x: 2420, y: 460 }, { x: 2600, y: 460 },
    { x: 2870, y: 330 }, { x: 2960, y: 330 },
  ],

  goal: { x: 2940, y: 260 },
};
