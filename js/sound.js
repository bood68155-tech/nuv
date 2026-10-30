/*
 * NUV — interface sound.
 *
 * A quiet tick when the pointer lands on something interactive and a fuller
 * "select" tone when it is clicked. The reference studio streams sample packs
 * from a CDN; these are generated with Web Audio instead, so the site stays
 * dependency-free and ships no third-party audio.
 *
 * The context is only ever created inside a real user gesture, so browsers that
 * block autoplay never throw. Enabled by default, muted from the header sound
 * button, and remembered in localStorage between visits.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "nuv:sound";
  var INTERACTIVE = [
    "button",
    "a[href]",
    "input:not([type='hidden'])",
    "select",
    "textarea",
    "summary",
    "[role='button']",
    "[role='link']",
    "[data-sound-interactive]"
  ].join(",");

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var noise = null;
  var lastHover = 0;
  var enabled = readPreference();

  function readPreference() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (error) {
      /* storage can be blocked; the default is enough */
    }
    return true;
  }

  function writePreference(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      /* ignore */
    }
  }

  function noiseBuffer(context) {
    var length = Math.floor(context.sampleRate * 0.3);
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function ensureContext() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(function () {});
      return ctx;
    }
    if (!Ctx) return null;
    try {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.15;
      master.connect(ctx.destination);
      noise = noiseBuffer(ctx);
    } catch (error) {
      ctx = null;
      return null;
    }
    return ctx;
  }

  // A short band-passed noise burst: the "tick".
  function tick(at, frequency, duration, level) {
    var source = ctx.createBufferSource();
    source.buffer = noise;

    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = frequency;
    band.Q.value = 1.2;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    source.connect(band);
    band.connect(gain);
    gain.connect(master);
    source.start(at, Math.random() * 0.08, duration + 0.02);
    source.stop(at + duration + 0.04);
  }

  // A falling sine under the tick: the body that makes a click feel physical.
  function thock(at, frequency, level) {
    var osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, at);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.55, at + 0.055);

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);

    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + 0.09);
  }

  function play(kind) {
    if (!enabled || document.hidden) return;
    if (!ensureContext()) return;

    var at = ctx.currentTime + 0.001;
    if (kind === "select") {
      tick(at, 2100, 0.03, 0.85);
      thock(at, 320, 0.3);
    } else {
      tick(at, 3400, 0.016, 0.4);
    }
  }

  function interactiveTarget(node) {
    if (!node || node.nodeType !== 1) return null;
    var found = node.closest(INTERACTIVE);
    if (!found) return null;
    if (found.matches(":disabled")) return null;
    return found;
  }

  function onPointerOver(event) {
    if (event.pointerType === "touch") return;
    var target = interactiveTarget(event.target);
    if (!target) return;
    // Ignore the internal moves of a single element.
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    var now = Date.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    play("hover");
  }

  function onPointerDown(event) {
    if (!event.isTrusted) return;
    ensureContext();
    if (!interactiveTarget(event.target)) return;
    play("select");
  }

  function setEnabled(value, persist) {
    enabled = Boolean(value);
    if (persist) writePreference(enabled);
    if (enabled) ensureContext();
    return enabled;
  }

  window.NUVSound = {
    supported: function () {
      return Boolean(Ctx);
    },
    enabled: function () {
      return enabled;
    },
    setEnabled: setEnabled,
    play: play
  };

  if (!Ctx) return;

  document.addEventListener("pointerover", onPointerOver, true);
  document.addEventListener("pointerdown", onPointerDown, true);
})();
