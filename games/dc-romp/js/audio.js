Game.Audio = (function () {
  var ctx = null;

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function beep(freq, duration, type, gainStart, sweepTo) {
    if (Game.muted) return;
    var c = ensureCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainStart || 0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  return {
    init: function () {
      ensureCtx();
    },
    jump: function () {
      beep(300, 0.18, 'square', 0.2, 700);
    },
    stomp: function () {
      beep(150, 0.12, 'sine', 0.25, 60);
    },
    coin: function () {
      beep(700, 0.08, 'triangle', 0.2, 1100);
      setTimeout(function () { beep(1100, 0.08, 'triangle', 0.15); }, 60);
    },
    hit: function () {
      beep(220, 0.25, 'sawtooth', 0.25, 60);
    },
    throwProjectile: function () {
      beep(500, 0.1, 'square', 0.15, 300);
    },
    goal: function () {
      var notes = [523, 659, 784, 1047];
      var c = ensureCtx();
      if (!c || Game.muted) return;
      notes.forEach(function (f, i) {
        setTimeout(function () { beep(f, 0.15, 'triangle', 0.2); }, i * 110);
      });
    },
  };
})();
