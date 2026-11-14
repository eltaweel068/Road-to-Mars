/**
 * Road to Mars — Sound Manager
 * Plays sound effects wired to game events.
 * Exposes window.RTM.Audio
 */
window.RTM = window.RTM || {};
window.RTM.Audio = (function () {
  'use strict';

  /* ─── sound bank ─── */
  var SOUNDS = {
    alert:       '/assets/sounds/alert.ogg',
    overg:       '/assets/sounds/overg.ogg',
    pullup:      '/assets/sounds/pullup.ogg',
    bang:        '/assets/sounds/bang.ogg',
    lockondone:  '/assets/sounds/lockondone.ogg',
    voice_start: '/assets/sounds/voice_start_a.ogg'
  };

  /* ─── active sounds tracking ─── */
  var activeSounds = []; // { audio, name }

  /* ─── warning state (to avoid spamming) ─── */
  var warningCooldowns = {};
  var COOLDOWN_MS = 5000;

  /* ─── play a one-shot sound ─── */
  function play(name, volume) {
    if (volume === undefined) volume = 0.5;
    var path = SOUNDS[name];
    if (!path) {
      console.warn('[Audio] Unknown sound:', name);
      return null;
    }
    try {
      var audio = new Audio(path);
      audio.volume = Math.max(0, Math.min(1, volume));

      var entry = { audio: audio, name: name };
      activeSounds.push(entry);

      audio.addEventListener('ended', function () {
        removeEntry(entry);
      });
      audio.addEventListener('error', function () {
        // graceful failure — remove from tracking silently
        removeEntry(entry);
      });

      audio.play().catch(function () {
        // autoplay may be blocked — fail silently
        removeEntry(entry);
      });

      return audio;
    } catch (e) {
      // graceful failure
      return null;
    }
  }

  /* ─── play a looping sound, return a stop handle ─── */
  function loop(name, volume) {
    if (volume === undefined) volume = 0.3;
    var path = SOUNDS[name];
    if (!path) {
      console.warn('[Audio] Unknown sound:', name);
      return { stop: function () {} };
    }
    try {
      var audio = new Audio(path);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = true;

      var entry = { audio: audio, name: name, looping: true };
      activeSounds.push(entry);

      audio.addEventListener('error', function () {
        removeEntry(entry);
      });

      audio.play().catch(function () {
        removeEntry(entry);
      });

      return {
        audio: audio,
        stop: function () {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (_) {}
          removeEntry(entry);
        },
        setVolume: function (v) {
          audio.volume = Math.max(0, Math.min(1, v));
        }
      };
    } catch (e) {
      return { stop: function () {} };
    }
  }

  /* ─── stop all active sounds ─── */
  function stopAll() {
    for (var i = activeSounds.length - 1; i >= 0; i--) {
      try {
        activeSounds[i].audio.pause();
        activeSounds[i].audio.currentTime = 0;
      } catch (_) {}
    }
    activeSounds = [];
  }

  /* ─── internal: remove a tracking entry ─── */
  function removeEntry(entry) {
    for (var i = activeSounds.length - 1; i >= 0; i--) {
      if (activeSounds[i] === entry) {
        activeSounds.splice(i, 1);
        break;
      }
    }
  }

  /* ─── play with cooldown (for warnings) ─── */
  function playWithCooldown(name, volume) {
    var now = Date.now();
    if (warningCooldowns[name] && now - warningCooldowns[name] < COOLDOWN_MS) return;
    warningCooldowns[name] = now;
    play(name, volume);
  }

  /* ─── wire to game events via RTM.Net.bus ─── */
  function wireEvents() {
    var net = window.RTM && window.RTM.Net;
    if (!net || !net.bus) {
      // retry after a tick — net.js might not be initialized yet
      setTimeout(wireEvents, 100);
      return;
    }

    var bus = net.bus;

    // meeting started → alert
    bus.addEventListener('meeting:started', function () {
      play('alert', 0.6);
    });

    // player killed → bang
    bus.addEventListener('player:killed', function () {
      play('bang', 0.7);
    });

    // task updated → lockondone
    bus.addEventListener('task:updated', function () {
      play('lockondone', 0.4);
    });

    // game started → voice_start
    bus.addEventListener('game:started', function () {
      play('voice_start', 0.5);
    });

    // telemetry warnings
    bus.addEventListener('telemetry:updated', function (e) {
      var detail = e.detail || e;
      var data = detail.telemetry || detail;

      // starvation warning: food below 15%
      if (data.food !== undefined && data.food < 15) {
        playWithCooldown('overg', 0.5);
      }

      // low fuel warning: below 15%
      if (data.fuel !== undefined && data.fuel < 15) {
        playWithCooldown('pullup', 0.6);
      }

      // low O2 warning: below 15%
      if (data.o2 !== undefined && data.o2 < 15) {
        playWithCooldown('pullup', 0.6);
      }
    });

    // player ejected → alert
    bus.addEventListener('player:ejected', function () {
      play('alert', 0.5);
    });

    console.log('[Audio] Event wiring complete');
  }

  /* ─── init: preload sounds + wire events ─── */
  function init() {
    // preload by creating Audio elements (browsers may cache)
    for (var name in SOUNDS) {
      try {
        var preload = new Audio();
        preload.preload = 'auto';
        preload.src = SOUNDS[name];
      } catch (_) {}
    }
    wireEvents();
    console.log('[Audio] Initialized');
  }

  return {
    init: init,
    play: play,
    loop: loop,
    stopAll: stopAll,
    SOUNDS: SOUNDS
  };
})();
