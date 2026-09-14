// All canvas-drawn UI: menus, HUD, and overlays. Pure drawing — navigation/state
// transitions are handled in game.js so input logic lives in one place. Every
// clickable element registers a hit rect (via registerHit) so game.js can test
// mouse clicks against exactly what's currently drawn — keyboard and mouse stay
// perfectly in sync since both read from the same layout code.
//
// The menus are printed componentry from the Game Hub box: board stock, flat
// ink, a hard keyline, and a cut edge drawn as a darker plate underneath. No
// gradients and no gloss here — the in-level world art keeps its own look, but
// everything the box itself prints follows the box's rules. Type is 'Lid' and
// 'Slab', both loaded by type.css on the page.
Game.UI = (function () {
  var W = Game.Canvas.WIDTH;
  var H = Game.Canvas.HEIGHT;
  var hitRegions = [];

  var INK        = '#171410';
  var PAPER      = '#e6dcc4';
  var PAPER_DIM  = '#c3b696';
  var TABLE      = '#123b2c';
  var TABLE_WEFT = '#16452f';
  var RED        = '#b32d17';
  var RED_LIT    = '#e8542f';
  var GOLD       = '#e8c25a';
  var FIELD      = '#4aa3d8';

  var LID  = '400 %spx Lid, Georgia, serif';
  var SLAB = '%wpx Slab, Georgia, serif';

  function lid(size) { return LID.replace('%s', size); }
  function slab(size, bold) { return (bold ? '700 ' : '400 ') + SLAB.replace('%w', size); }

  function registerHit(x, y, w, h, id) {
    hitRegions.push({ x: x, y: y, w: w, h: h, id: id });
  }

  // Nothing is hovered while the keyboard is the device in use, so a keyboard
  // selection and a stale pointer resting elsewhere cannot both print red.
  function isHovered(x, y, w, h) {
    if (!Game.Input.pointerActive()) return false;
    var m = Game.Input.getMousePos();
    return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  }

  // Letter-spaced caps. Canvas has no tracking, so it is done by hand.
  function tracked(ctx, text, cx, y, spacing) {
    var chars = text.split('');
    var total = 0;
    var i;
    for (i = 0; i < chars.length; i++) {
      total += ctx.measureText(chars[i]).width + spacing;
    }
    total -= spacing;
    var x = cx - total / 2;
    var prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x, y);
      x += ctx.measureText(chars[i]).width + spacing;
    }
    ctx.textAlign = prevAlign;
  }

  // A flat printed plate: the board, its keyline, and its cut edge beneath.
  function plate(ctx, x, y, w, h, fill, edge) {
    var e = edge === undefined ? 6 : edge;
    ctx.fillStyle = INK;
    ctx.fillRect(x + e, y + e, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }

  // The printer's registration mark, in the corner of every printed sheet.
  function regMark(ctx, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 11, cy);
    ctx.lineTo(cx + 11, cy);
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx, cy + 11);
    ctx.stroke();
    ctx.restore();
  }

  function title(ctx, text, y, size) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = lid(size || 42);
    ctx.fillStyle = INK;
    tracked(ctx, text, W / 2, y, (size || 42) * 0.02);
    ctx.restore();
  }

  // The green table the box sits on, woven with hard rules rather than noise.
  function backdrop(ctx) {
    ctx.save();
    ctx.fillStyle = TABLE;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = TABLE_WEFT;
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i < W; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, H);
      ctx.stroke();
    }
    for (i = 0; i < H; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(W, i + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The printed sheet the menus are set on.
  function sheet(ctx, x, y, w, h) {
    plate(ctx, x, y, w, h, PAPER, 8);
    regMark(ctx, x + 20, y + 20, 'rgba(23,20,16,0.28)');
    regMark(ctx, x + w - 20, y + 20, 'rgba(23,20,16,0.28)');
  }

  // A clickable printed chip. Registers its own hit rect (if id given) and
  // presses in when either keyboard-selected or moused-over.
  function button(ctx, x, y, w, h, label, selected, id, fontSize) {
    var hovered = isHovered(x, y, w, h);
    var active = selected || hovered;
    var size = fontSize || 15;

    if (active) {
      plate(ctx, x + 2, y + 2, w, h, RED, 3);
    } else {
      plate(ctx, x, y, w, h, PAPER, 5);
    }

    // the lamp gutter is always reserved, so the label never shifts between states
    var gutter = 24;
    ctx.save();
    ctx.font = slab(size, true);
    ctx.fillStyle = active ? PAPER : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    tracked(ctx, label.toUpperCase(), x + gutter + (w - gutter) / 2 + (active ? 2 : 0), y + h / 2 + 1 + (active ? 2 : 0), size * 0.14);
    ctx.restore();

    // which chip is under the finger, marked the way the box marks a chosen
    // piece: a punched square in the plate, not a glow
    if (active) {
      ctx.fillStyle = PAPER;
      ctx.fillRect(x + 15, y + h / 2 - 4, 12, 12);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.strokeRect(x + 16, y + h / 2 - 3, 10, 10);
    }

    if (id) registerHit(x, y, w, h, id);
    return hovered;
  }

  // A compact printed control for the HUD rail: the menu chip without its lamp
  // gutter, since nothing on the HUD is keyboard-selected — the mouse is the
  // only thing that can be on it. It carries a drawn mark rather than a word,
  // so `paint` is handed the chip's centre and the colour the mark reads in.
  function hudButton(ctx, x, y, w, h, id, paint) {
    var hovered = isHovered(x, y, w, h);
    var nudge = hovered ? 2 : 0;
    if (hovered) {
      plate(ctx, x + 2, y + 2, w, h, RED, 3);
    } else {
      plate(ctx, x, y, w, h, PAPER, 4);
    }
    paint(ctx, x + w / 2 + nudge, y + h / 2 + nudge, hovered ? PAPER : INK);
    registerHit(x, y, w, h, id);
  }

  // The pause mark: two struck bars, flat ink like the rest of the apparatus.
  function pauseMark(ctx, cx, cy, colour) {
    var bw = 6, bh = 18, gap = 6;
    ctx.save();
    ctx.fillStyle = colour;
    ctx.fillRect(cx - gap / 2 - bw, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + gap / 2, cy - bh / 2, bw, bh);
    ctx.restore();
  }

  // The stamped set number every surface in the box carries.
  function setStamp(ctx, x, y, text) {
    ctx.save();
    ctx.font = slab(11, true);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    var w = ctx.measureText(text.toUpperCase()).width + 26;
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = PAPER;
    tracked(ctx, text.toUpperCase(), x + w / 2, y + 6, 1.8);
    ctx.restore();
    return w;
  }

  function drawMenu(ctx, selectedIndex) {
    backdrop(ctx);
    sheet(ctx, 150, 42, W - 300, H - 104);

    // the title sits on this game's own printed field, the same sky the hub
    // prints board No. 02 on — full strength, not a tinted-up word
    plate(ctx, 150, 42, W - 300, 152, FIELD, 8);
    regMark(ctx, 172, 64, "rgba(23,20,16,0.30)");
    setStamp(ctx, 810 - 84, 42, "No. 02");
    title(ctx, 'D.C. ROMP', 128, 54);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = slab(15);
    ctx.fillStyle = 'rgba(23,20,16,0.78)';
    ctx.fillText('A very, very tremendous platforming adventure', W / 2, 164);
    ctx.restore();

    var options = Game.MenuOptions.slice();
    options[3] = Game.muted ? 'Sound: Off' : 'Sound: On';
    var startY = 226;
    var bw = 250, bh = 42, gap = 13;
    for (var i = 0; i < options.length; i++) {
      button(ctx, W / 2 - bw / 2, startY + i * (bh + gap), bw, bh, options[i], i === selectedIndex, 'menu-' + i);
    }
  }

  function drawHowTo(ctx) {
    backdrop(ctx);
    sheet(ctx, 60, 26, W - 120, H - 52);
    setStamp(ctx, 92, 56, 'No. 02 · Rules');
    title(ctx, 'HOW TO PLAY', 100, 34);

    var lines = [
      ['Left / Right', 'Move'],
      ['Up / Space', 'Jump — hold it for a higher one'],
      ['Shift', 'Run'],
      ['Down, in the air', 'Ground pound'],
      ['X / Ctrl', 'Throw a necktie'],
      ['Q', 'The catchphrase'],
      ['Escape / P', 'Pause — restart the level or quit from there'],
    ];

    ctx.save();
    ctx.textBaseline = 'middle';
    for (var i = 0; i < lines.length; i++) {
      var y = 142 + i * 30;
      ctx.font = slab(12, true);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText(lines[i][0].toUpperCase(), 130, y);
      ctx.font = slab(15);
      ctx.fillStyle = 'rgba(23,20,16,0.72)';
      ctx.fillText(lines[i][1], 330, y);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(23,20,16,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, 366);
    ctx.lineTo(W - 130, 366);
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = slab(14);
    ctx.fillStyle = 'rgba(23,20,16,0.72)';
    ctx.fillText('Stomp enemies from above, or throw a tie at them. Mind the pits.', W / 2, 392);
    ctx.fillText('Three lives. Reach the flag to finish the level.', W / 2, 414);
    ctx.restore();

    button(ctx, W / 2 - 85, H - 92, 170, 40, 'Back', true, 'howto-back');
  }

  function drawLevelSelect(ctx, unlockedLevel, selectedLevel, levelCount) {
    backdrop(ctx);
    sheet(ctx, 40, 104, W - 80, 264);
    setStamp(ctx, 92, 134, 'No. 02 · Levels');
    title(ctx, 'PICK A LEVEL', 174, 32);

    var bw = 158, bh = 96, gap = 14;
    var totalW = bw * levelCount + gap * (levelCount - 1);
    var startX = W / 2 - totalW / 2;
    var y = 218;

    for (var i = 1; i <= levelCount; i++) {
      var x = startX + (i - 1) * (bw + gap);
      var locked = i > unlockedLevel;
      var hovered = isHovered(x, y, bw, bh);
      var active = (i === selectedLevel) || (hovered && !locked);

      plate(ctx, x, y, bw, bh, locked ? PAPER_DIM : (active ? FIELD : PAPER), 5);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      ctx.font = lid(26);
      ctx.fillStyle = locked ? 'rgba(23,20,16,0.42)' : INK;
      ctx.fillText(String(i), x + bw / 2, y + 42);

      ctx.font = slab(11, true);
      ctx.fillStyle = locked ? 'rgba(23,20,16,0.42)' : 'rgba(23,20,16,0.75)';
      tracked(ctx, (locked ? 'Locked' : Game.LevelNames[i]).toUpperCase(), x + bw / 2, y + 68, 1.4);
      ctx.restore();

      if (active && !locked) {
        ctx.fillStyle = RED_LIT;
        ctx.fillRect(x + bw / 2 - 12, y + 78, 24, 7);
      }

      if (!locked) registerHit(x, y, bw, bh, 'level-' + i);
    }

    button(ctx, W / 2 - 92, 396, 184, 40, 'Back', false, 'levelselect-back');
  }

  function drawHUD(ctx, levelCount, showPause) {
    // score plate, top left
    plate(ctx, 14, 14, 158, 40, PAPER, 4);

    // Pause, on the same rail as the score — the mouse's way to the pause menu,
    // which Escape and P already reach. Only while the level is actually
    // running: under the pause sheet it would be a control you cannot press.
    if (showPause) hudButton(ctx, 182, 14, 44, 40, 'hud-pause', pauseMark);

    ctx.save();
    ctx.textBaseline = 'middle';

    // lives as printed pips, not glyphs
    for (var i = 0; i < 3; i++) {
      var px = 26 + i * 17;
      var alive = i < Game.lives;
      ctx.fillStyle = alive ? RED : 'rgba(23,20,16,0.14)';
      ctx.fillRect(px, 27, 12, 13);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.strokeRect(px + 1, 28, 10, 11);
    }

    ctx.font = slab(11, true);
    ctx.fillStyle = 'rgba(23,20,16,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 88, 26);

    ctx.font = slab(19, true);
    ctx.fillStyle = INK;
    ctx.fillText(String(Game.score), 88, 42);
    ctx.restore();

    // level plate, top right, carrying this unit's set number — the edge rail
    // every printed surface in the box has
    var label = (Game.LevelNames[Game.levelIndex] || '').toUpperCase();
    ctx.save();
    ctx.font = slab(11, true);
    var tw = ctx.measureText(label).width + label.length * 1.6 + 30;
    var lw = Math.max(tw, 176);
    plate(ctx, W - lw - 14, 14, lw, 40, PAPER, 4);
    ctx.fillStyle = 'rgba(23,20,16,0.62)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = slab(11, true);
    tracked(ctx, 'No. 02 · LEVEL ' + Game.levelIndex + ' OF ' + levelCount, W - lw / 2 - 14, 26, 1.2);
    ctx.font = slab(12, true);
    ctx.fillStyle = INK;
    tracked(ctx, label, W - lw / 2 - 14, 43, 1.6);
    ctx.restore();
  }

  // A sheet laid over the running game.
  function overlaySheet(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(13,43,32,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    plate(ctx, x, y, w, h, PAPER, 8);
    regMark(ctx, x + 18, y + 18, 'rgba(23,20,16,0.28)');
    regMark(ctx, x + w - 18, y + 18, 'rgba(23,20,16,0.28)');
  }

  function drawPauseOverlay(ctx, selectedIndex) {
    var w = 330;
    var h = 66 + Game.PauseOptions.length * 55 + 46;
    var x = W / 2 - w / 2;
    var y = H / 2 - h / 2;
    overlaySheet(ctx, x, y, w, h);

    title(ctx, 'PAUSED', y + 56, 32);

    var bw = 220, bh = 42, gap = 13;
    var startY = y + 84;
    for (var i = 0; i < Game.PauseOptions.length; i++) {
      button(ctx, W / 2 - bw / 2, startY + i * (bh + gap), bw, bh, Game.PauseOptions[i], i === selectedIndex, 'pause-' + i);
    }
  }

  function resultSheet(ctx, heading, headingColor, statLabel, statValue, btnLabel, btnId) {
    var w = 380, h = 244;
    var x = W / 2 - w / 2;
    var y = H / 2 - h / 2;
    overlaySheet(ctx, x, y, w, h);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = lid(34);
    ctx.fillStyle = headingColor;
    tracked(ctx, heading, W / 2, y + 68, 0.8);

    ctx.font = slab(11, true);
    ctx.fillStyle = 'rgba(23,20,16,0.6)';
    tracked(ctx, statLabel, W / 2, y + 106, 1.6);

    ctx.font = slab(40, true);
    ctx.fillStyle = INK;
    ctx.fillText(String(statValue), W / 2, y + 152);
    ctx.restore();

    button(ctx, W / 2 - 112, y + 176, 224, 42, btnLabel, true, btnId);
  }

  function drawGameOver(ctx) {
    resultSheet(ctx, 'GAME OVER', RED, 'FINAL SCORE', Game.score, 'Back to the menu', 'gameover-menu');
  }

  function drawLevelComplete(ctx) {
    resultSheet(ctx, 'LEVEL CLEARED', '#1c6b3f', 'SCORE', Game.score, 'Carry on', 'levelcomplete-continue');
  }

  function drawWin(ctx) {
    backdrop(ctx);
    sheet(ctx, 150, 56, W - 300, 340);
    setStamp(ctx, 182, 86, 'No. 02 · Complete');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = lid(44);
    ctx.fillStyle = GOLD;
    tracked(ctx, 'YOU WON D.C.', W / 2 + 3, 175, 1);
    ctx.fillStyle = INK;
    tracked(ctx, 'YOU WON D.C.', W / 2, 172, 1);

    ctx.font = slab(16);
    ctx.fillStyle = 'rgba(23,20,16,0.72)';
    ctx.fillText('Tremendous victory. The best victory.', W / 2, 212);

    ctx.font = slab(11, true);
    ctx.fillStyle = 'rgba(23,20,16,0.6)';
    tracked(ctx, 'FINAL SCORE', W / 2, 254, 1.6);

    ctx.font = slab(44, true);
    ctx.fillStyle = INK;
    ctx.fillText(String(Game.score), W / 2, 306);
    ctx.restore();

    button(ctx, W / 2 - 112, 330, 224, 44, 'Back to the menu', true, 'win-menu');
  }

  return {
    drawMenu: drawMenu,
    drawHowTo: drawHowTo,
    drawLevelSelect: drawLevelSelect,
    drawHUD: drawHUD,
    drawPauseOverlay: drawPauseOverlay,
    drawGameOver: drawGameOver,
    drawLevelComplete: drawLevelComplete,
    drawWin: drawWin,
    clearHits: function () { hitRegions.length = 0; },
    hitRegions: hitRegions,
  };
})();
