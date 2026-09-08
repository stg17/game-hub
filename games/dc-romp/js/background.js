// Multi-layer parallax backgrounds per level theme. Each layer scrolls at a fraction of
// camera speed (factor < 1) to fake depth using only flat Canvas 2D shapes.
Game.Background = (function () {
  var cache = {};

  function buildLayer(spacing, levelWidth, shapeFn) {
    var positions = [];
    for (var x = -spacing; x < levelWidth + spacing; x += spacing) {
      positions.push(x + (Math.sin(x * 0.013) * spacing * 0.15));
    }
    return { positions: positions, shapeFn: shapeFn };
  }

  function drawSky(ctx, topColor, bottomColor) {
    var grad = ctx.createLinearGradient(0, 0, 0, Game.Canvas.HEIGHT);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Game.Canvas.WIDTH, Game.Canvas.HEIGHT);
  }

  function drawLayer(ctx, cam, factor, layer, groundY) {
    var w = Game.Canvas.WIDTH;
    for (var i = 0; i < layer.positions.length; i++) {
      var wx = layer.positions[i];
      var sx = wx - cam.x * factor;
      if (sx < -160 || sx > w + 160) continue;
      layer.shapeFn(ctx, sx, groundY, i);
    }
  }

  function themeLawn(levelWidth) {
    return {
      sky: ['#7ec8e3', '#d7f3ff'],
      groundY: 470,
      layers: [
        { factor: 0.15, data: buildLayer(500, levelWidth, function (ctx, sx, gy) {
          // Distant monument silhouette
          ctx.fillStyle = 'rgba(200,210,225,0.7)';
          ctx.fillRect(sx - 6, gy - 140, 12, 140);
          ctx.beginPath();
          ctx.moveTo(sx - 6, gy - 140);
          ctx.lineTo(sx, gy - 165);
          ctx.lineTo(sx + 6, gy - 140);
          ctx.closePath();
          ctx.fill();
        }) },
        { factor: 0.35, data: buildLayer(180, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(70,140,80,0.55)';
          ctx.beginPath();
          ctx.arc(sx, gy - 40, 34, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(sx - 5, gy - 40, 10, 40);
        }) },
        { factor: 0.6, data: buildLayer(90, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(60,120,60,0.7)';
          ctx.beginPath();
          ctx.ellipse(sx, gy, 26, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }) },
      ],
    };
  }

  function themeDowntown(levelWidth) {
    return {
      sky: ['#a7c6e0', '#e7f0f7'],
      groundY: 470,
      layers: [
        { factor: 0.12, data: buildLayer(140, levelWidth, function (ctx, sx, gy) {
          var h = 90 + (Math.sin(sx * 0.05) * 30);
          ctx.fillStyle = 'rgba(150,160,180,0.55)';
          ctx.fillRect(sx - 22, gy - h, 44, h);
        }) },
        { factor: 0.3, data: buildLayer(110, levelWidth, function (ctx, sx, gy) {
          var h = 130 + (Math.cos(sx * 0.04) * 40);
          ctx.fillStyle = 'rgba(100,110,130,0.65)';
          ctx.fillRect(sx - 28, gy - h, 56, h);
          ctx.fillStyle = 'rgba(255,240,180,0.35)';
          for (var wy = gy - h + 10; wy < gy - 10; wy += 18) {
            ctx.fillRect(sx - 20, wy, 8, 8);
            ctx.fillRect(sx + 6, wy, 8, 8);
          }
        }) },
        { factor: 0.55, data: buildLayer(140, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(40,40,45,0.8)';
          ctx.fillRect(sx - 2, gy - 50, 4, 50);
          ctx.beginPath();
          ctx.arc(sx, gy - 52, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,220,120,0.6)';
          ctx.fill();
        }) },
      ],
    };
  }

  function themeRooftop(levelWidth) {
    return {
      sky: ['#5f8ec7', '#c9dff0'],
      groundY: 470,
      layers: [
        { factor: 0.1, data: buildLayer(220, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.ellipse(sx, gy - 220, 40, 16, 0, 0, Math.PI * 2);
          ctx.ellipse(sx + 30, gy - 225, 30, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }) },
        { factor: 0.25, data: buildLayer(160, levelWidth, function (ctx, sx, gy) {
          var h = 100 + (Math.sin(sx * 0.03) * 25);
          ctx.fillStyle = 'rgba(120,130,150,0.5)';
          ctx.fillRect(sx - 20, gy - h, 40, h);
        }) },
        { factor: 0.5, data: buildLayer(100, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(180,60,50,0.6)';
          ctx.fillRect(sx - 4, gy - 18, 8, 18);
        }) },
      ],
    };
  }

  function themeGolf(levelWidth) {
    return {
      sky: ['#8fd0f0', '#eaf9ff'],
      groundY: 470,
      layers: [
        { factor: 0.15, data: buildLayer(340, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(90,170,90,0.5)';
          ctx.beginPath();
          ctx.ellipse(sx, gy + 30, 170, 60, 0, Math.PI, 0);
          ctx.fill();
        }) },
        { factor: 0.35, data: buildLayer(220, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(50,140,60,0.6)';
          ctx.beginPath();
          ctx.arc(sx, gy - 36, 30, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(sx - 4, gy - 36, 8, 36);
        }) },
        { factor: 0.55, data: buildLayer(150, levelWidth, function (ctx, sx, gy) {
          // Little flag on a pin — a golf-hole marker dotted along the fairway.
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.lineTo(sx, gy - 46);
          ctx.stroke();
          ctx.fillStyle = 'rgba(230,60,50,0.75)';
          ctx.beginPath();
          ctx.moveTo(sx, gy - 46);
          ctx.lineTo(sx + 18, gy - 40);
          ctx.lineTo(sx, gy - 34);
          ctx.closePath();
          ctx.fill();
        }) },
      ],
    };
  }

  function themeSky(levelWidth) {
    return {
      sky: ['#4f7fc9', '#cfe6f7'],
      groundY: 470,
      layers: [
        { factor: 0.08, data: buildLayer(260, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.ellipse(sx, gy - 260, 46, 18, 0, 0, Math.PI * 2);
          ctx.ellipse(sx + 34, gy - 266, 32, 14, 0, 0, Math.PI * 2);
          ctx.ellipse(sx - 30, gy - 258, 28, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }) },
        { factor: 0.2, data: buildLayer(180, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.beginPath();
          ctx.ellipse(sx, gy - 120, 38, 15, 0, 0, Math.PI * 2);
          ctx.ellipse(sx + 26, gy - 124, 24, 11, 0, 0, Math.PI * 2);
          ctx.fill();
        }) },
        { factor: 0.4, data: buildLayer(130, levelWidth, function (ctx, sx, gy) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.ellipse(sx, gy - 20, 26, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }) },
      ],
    };
  }

  function getTheme(name, levelWidth) {
    var key = name + '_' + levelWidth;
    if (!cache[key]) {
      if (name === 'downtown') cache[key] = themeDowntown(levelWidth);
      else if (name === 'rooftop') cache[key] = themeRooftop(levelWidth);
      else if (name === 'golf') cache[key] = themeGolf(levelWidth);
      else if (name === 'sky') cache[key] = themeSky(levelWidth);
      else cache[key] = themeLawn(levelWidth);
    }
    return cache[key];
  }

  return {
    draw: function (ctx, cam, themeName, levelWidth) {
      var theme = getTheme(themeName, levelWidth);
      drawSky(ctx, theme.sky[0], theme.sky[1]);
      for (var i = 0; i < theme.layers.length; i++) {
        drawLayer(ctx, cam, theme.layers[i].factor, theme.layers[i].data, theme.groundY);
      }
    },
  };
})();
