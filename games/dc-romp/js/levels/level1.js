Game.Levels = Game.Levels || {};

Game.Levels.level1 = {
  name: 'White House Lawn',
  width: 2700,
  height: 540,
  killY: 650,
  theme: 'lawn',
  playerStart: { x: 50, y: 460 },

  platforms: [
    { x: 0, y: 500, w: 760, h: 100, type: 'static' },
    { x: 880, y: 500, w: 480, h: 100, type: 'static' },
    { x: 1430, y: 440, w: 120, h: 20, type: 'moving', axis: 'x', range: 90, speed: 60 },
    { x: 1600, y: 500, w: 500, h: 100, type: 'static' },
    { x: 2210, y: 500, w: 490, h: 100, type: 'static' },
    // Bonus floating platforms with coins
    { x: 300, y: 400, w: 120, h: 20, type: 'static' },
    { x: 1020, y: 380, w: 100, h: 20, type: 'static' },
    { x: 1850, y: 400, w: 110, h: 20, type: 'static' },
  ],

  enemies: [
    { type: 'goon', x: 500, y: 468, patrolRange: 80 },
    { type: 'turkey', x: 1000, y: 468, patrolRange: 100 },
    { type: 'drone', x: 1500, y: 350, patrolRange: 120 },
    { type: 'goon', x: 1900, y: 468, patrolRange: 90 },
    { type: 'turkey', x: 2400, y: 468, patrolRange: 80 },
  ],

  collectibles: [
    { x: 150, y: 460 }, { x: 340, y: 365 }, { x: 600, y: 460 },
    { x: 1040, y: 345 }, { x: 1250, y: 460 }, { x: 1470, y: 405 },
    { x: 1700, y: 460 }, { x: 1870, y: 365 }, { x: 2000, y: 460 },
    { x: 2350, y: 460 }, { x: 2550, y: 460 },
  ],

  // The opening teaches the controls in place: each prompt stands where the
  // thing it explains is first needed, and fades up as the player reaches it.
  hints: [
    { x: 96, y: 352, keys: ['left', 'right'], label: 'Move', range: 110 },
    { x: 248, y: 318, keys: ['up'], label: 'Jump', range: 130 },
    { x: 470, y: 330, keys: ['X', 'Ctrl'], label: 'Throw', range: 140 },
    { x: 1680, y: 352, keys: ['Q'], label: 'Catchphrase' },
  ],

  goal: { x: 2650, y: 380 },
};
