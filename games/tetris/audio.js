// Synthesized sound effects — WebAudio oscillators only, no audio files, the
// same approach as games/dc-romp/js/audio.js. The AudioContext can only be
// created after a user gesture, hence the explicit init() from the first
// keypress/click rather than at load.
var Sfx = (function () {
  var ctx = null;
  var muted = false;

  function ensureCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, duration, type, gainStart, sweepTo) {
    if (muted) return;
    var c = ensureCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + duration);
    gain.gain.setValueAtTime(gainStart || 0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  return {
    init: function () { ensureCtx(); },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = !!value;
      return muted;
    },
    move: function () { beep(220, 0.04, 'square', 0.05); },
    rotate: function () { beep(380, 0.06, 'square', 0.07); },
    lock: function () { beep(160, 0.09, 'sine', 0.12, 90); },
    hold: function () { beep(520, 0.08, 'triangle', 0.09, 700); },
    hardDrop: function () { beep(120, 0.12, 'sawtooth', 0.14, 60); },
    // A short arpeggio whose length scales with the clear — a tetris is a run
    // of four notes, a single is one.
    clear: function (count) {
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < Math.max(1, Math.min(count, 4)); i++) {
        (function (freq, delay) {
          window.setTimeout(function () { beep(freq, 0.14, 'triangle', 0.13); }, delay);
        })(notes[i], i * 70);
      }
    },
    levelUp: function () { beep(700, 0.2, 'triangle', 0.14, 1300); },
    gameOver: function () { beep(300, 0.5, 'sawtooth', 0.16, 70); },
  };
})();
