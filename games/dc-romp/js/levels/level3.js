Game.Levels = Game.Levels || {};

Game.Levels.level3 = {
  name: 'Capitol Rooftop',
  width: 1050,
  height: 900,
  killY: 950,
  theme: 'rooftop',
  playerStart: { x: 80, y: 660 },

  platforms: [
    { x: 0, y: 700, w: 300, h: 100, type: 'static' },
    { x: 260, y: 610, w: 130, h: 20, type: 'static' },
    { x: 430, y: 520, w: 130, h: 20, type: 'moving', axis: 'x', range: 60, speed: 50 },
    { x: 250, y: 430, w: 130, h: 20, type: 'static' },
    { x: 430, y: 340, w: 130, h: 20, type: 'moving', axis: 'x', range: 60, speed: 60 },
    { x: 250, y: 250, w: 130, h: 20, type: 'static' },
    { x: 430, y: 160, w: 130, h: 20, type: 'static' },
    { x: 600, y: 140, w: 450, h: 100, type: 'static' },
  ],

  enemies: [
    { type: 'goon', x: 100, y: 668, patrolRange: 100 },
    { type: 'drone', x: 350, y: 560, patrolRange: 60 },
    { type: 'drone', x: 350, y: 380, patrolRange: 60 },
    { type: 'drone', x: 350, y: 200, patrolRange: 60 },
    { type: 'goon', x: 750, y: 88, patrolRange: 150 },
    { type: 'turkey', x: 900, y: 88, patrolRange: 100 },
  ],

  collectibles: [
    { x: 150, y: 660 }, { x: 300, y: 570 }, { x: 460, y: 480 },
    { x: 290, y: 390 }, { x: 460, y: 300 }, { x: 290, y: 210 },
    { x: 460, y: 120 }, { x: 700, y: 100 }, { x: 850, y: 100 },
    { x: 970, y: 100 },
  ],

  goal: { x: 960, y: 20 },
};
