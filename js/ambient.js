/*
 * NUV — ambient sound.
 * A small generative pad built with Web Audio: no audio files, no requests.
 * Four detuned voices drift through a slow chord cycle behind a warm low-pass
 * filter, with a quiet bed of filtered noise for air. The context is created
 * on the first click so it never fights the browser's autoplay policy.
 */
(function () {
  "use strict";

  var CHORDS = [
    [110.0, 164.81, 220.0, 329.63], // A2  E3  A3  E4
    [87.31, 130.81, 174.61, 261.63], // F2  C3  F3  C4
    [98.0, 146.83, 196.0, 293.66], // G2  D3  G3  D4
    [130.81, 196.0, 261.63, 392.0] // C3  G3  C4  G4
  ];
  var CHORD_SECONDS = 13;
  var LEVEL = 0.08;

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var filter = null;
  var voices = [];
  var chordIndex = 0;
  var rotateTimer = null;
  var suspendTimer = null;
  var playing = false;
  var failed = false;

  function noiseBuffer(context) {
    var length = Math.floor(context.sampleRate * 4);
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var data = buffer.getChannelData(0);
    var last = 0;
    for (var i = 0; i < length; i += 1) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  function build() {
    ctx = new Ctx();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(master);

    CHORDS[0].forEach(function (freq) {
      var gain = ctx.createGain();
      gain.gain.value = 0.16;
      gain.connect(filter);

      var oscA = ctx.createOscillator();
      oscA.type = "sine";
      oscA.frequency.value = freq;
      oscA.detune.value = -4;
      oscA.connect(gain);

      var oscB = ctx.createOscillator();
      oscB.type = "triangle";
      oscB.frequency.value = freq;
      oscB.detune.value = 6;
      var shape = ctx.createGain();
      shape.gain.value = 0.32;
      oscB.connect(shape);
      shape.connect(gain);

      oscA.start();
      oscB.start();
      voices.push({ a: oscA, b: oscB, gain: gain });
    });

    // Air: brown-ish noise through a band-pass.
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    var noiseBand = ctx.createBiquadFilter();
    noiseBand.type = "bandpass";
    noiseBand.frequency.value = 720;
    noiseBand.Q.value = 0.5;
    var noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.03;
    noise.connect(noiseBand);
    noiseBand.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    // Very slow filter movement keeps the pad from sounding static.
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Each voice breathes at its own rate.
    voices.forEach(function (voice, index) {
      var drift = ctx.createOscillator();
      drift.frequency.value = 0.06 + index * 0.017;
      var driftGain = ctx.createGain();
      driftGain.gain.value = 0.045;
      drift.connect(driftGain);
      driftGain.connect(voice.gain.gain);
      drift.start();
    });
  }

  function rotateChord() {
    if (!ctx) return;
    chordIndex = (chordIndex + 1) % CHORDS.length;
    var now = ctx.currentTime;
    CHORDS[chordIndex].forEach(function (freq, index) {
      var voice = voices[index];
      if (!voice) return;
      voice.a.frequency.setTargetAtTime(freq, now, 1.2);
      voice.b.frequency.setTargetAtTime(freq, now, 1.2);
    });
  }

  function play() {
    if (failed) return false;
    try {
      if (!ctx) build();
      if (ctx.state === "suspended" && typeof ctx.resume === "function") ctx.resume();
      if (suspendTimer) {
        window.clearTimeout(suspendTimer);
        suspendTimer = null;
      }
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 1.8);
      if (rotateTimer) window.clearInterval(rotateTimer);
      rotateTimer = window.setInterval(rotateChord, CHORD_SECONDS * 1000);
      playing = true;
    } catch (error) {
      failed = true;
      playing = false;
    }
    return playing;
  }

  function pause() {
    playing = false;
    if (rotateTimer) {
      window.clearInterval(rotateTimer);
      rotateTimer = null;
    }
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    suspendTimer = window.setTimeout(function () {
      if (!playing && ctx && ctx.state === "running" && typeof ctx.suspend === "function") {
        try {
          ctx.suspend();
        } catch (error) {
          /* nothing to do — the pad is already silent */
        }
      }
    }, 2400);
  }

  function toggle() {
    if (playing) {
      pause();
      return false;
    }
    return play();
  }

  window.NUVAmbient = {
    supported: function () {
      return Boolean(Ctx) && !failed;
    },
    isPlaying: function () {
      return playing;
    },
    toggle: toggle
  };
})();
