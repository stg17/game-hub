// Global namespace shared by all plain <script> files (no bundler/modules).
var Game = window.Game || {};

Game.Canvas = {
  WIDTH: 960,
  HEIGHT: 540,
};

Game.Physics = {
  GRAVITY: 1600,
  MAX_FALL_SPEED: 900,
  WALK_SPEED: 160,
  RUN_SPEED: 280,
  ACCEL: 1800,
  AIR_ACCEL: 1000,
  FRICTION: 2000,
  JUMP_VELOCITY: -680, // max jump height ~144px — comfortably clears the tallest platform steps
  JUMP_CUT_MULTIPLIER: 0.45,
  GROUND_POUND_SPEED: 1300,
  STOMP_BOUNCE: -420,
  INVULN_DURATION: 1.2,
  KNOCKBACK_SPEED: 220,
  PROJECTILE_SPEED: 420,
  PROJECTILE_LIFETIME: 1.4,
};

Game.Colors = {
  SKY_TOP: '#7ec8e3',
  SKY_BOTTOM: '#bfe8f5',
};

Game.Catchphrases = [
  "I'm the greatest, I think there's ever been!",
  "Nobody jumps better than me, believe me.",
  "This level, folks, is going to be tremendous.",
  "We're gonna win so much, you'll get tired of winning.",
  "Very smart jump. Many people are saying it's the best jump.",
  "Huge platform. The best platform. Everybody agrees.",
];

Game.MenuOptions = ['Start Game', 'Pick a Level', 'How to Play', 'Sound: On'];
Game.PauseOptions = ['Continue', 'Restart', 'Menu'];
Game.LEVEL_COUNT = 5;
Game.LevelNames = {
  1: 'White House Lawn',
  2: 'Downtown Street',
  3: 'Capitol Rooftop',
  4: 'Golf Course',
  5: 'Air Force One',
};

Game.state = 'MENU';
Game.muted = false;
Game.lives = 3;
Game.score = 0;
Game.levelIndex = 1;
Game.menuIndex = 0;
Game.pauseIndex = 0;
Game.levelSelectIndex = 0;
Game.levelStartScore = 0;
Game.unlockedLevel = 1;
Game.entities = { platforms: [], enemies: [], collectibles: [], projectiles: [], hints: [], goal: null };
Game.player = null;
Game.currentLevel = null;
Game.levelCompleteTimer = 0;
