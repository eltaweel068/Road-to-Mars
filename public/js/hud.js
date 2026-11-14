/**
 * Road to Mars — HUD (Heads-Up Display)
 * Task progress bar, telemetry clipboard, action buttons, notifications.
 * Exposes window.RTM.HUD
 */
window.RTM = window.RTM || {};
window.RTM.HUD = (function () {
  'use strict';

  /* ─── constants ─── */
  var SEGMENT_COUNT = 5;
  var NOTIFICATION_DURATION = 3500;

  /* ─── cached DOM refs ─── */
  var els = {};

  /* ─── state ─── */
  var clipboardOpen = false;
  var warningFlashTimers = {};

  /* ────────────────────────────────────────────
   *  TASK PROGRESS BAR  (top-left)
   * ──────────────────────────────────────────── */

  function createHUD() {
    var ui = document.getElementById('uiLayer');
    if (!ui) return;

    /* --- task bar --- */
    var taskBar = document.getElementById('taskBar');
    if (taskBar) {
      // DOM already in index.html — enhance it
      var track = document.getElementById('taskBarTrack');
      if (track) {
        track.innerHTML = '';
        for (var i = 0; i < SEGMENT_COUNT; i++) {
          var seg = document.createElement('div');
          seg.className = 'taskbar-seg';
          seg.setAttribute('data-idx', i);
          track.appendChild(seg);
        }
      }
      // add rivets
      var frame = taskBar.querySelector('.taskbar-frame');
      if (frame && !frame.querySelector('.rivet')) {
        var positions = ['tl', 'tr', 'bl', 'br'];
        for (var r = 0; r < positions.length; r++) {
          var rivet = document.createElement('span');
          rivet.className = 'rivet rivet-' + positions[r];
          frame.appendChild(rivet);
        }
      }
      // add count label
      var label = taskBar.querySelector('.taskbar-label');
      if (label) {
        label.textContent = 'TASKS';
        var countSpan = document.createElement('span');
        countSpan.id = 'taskCount';
        countSpan.className = 'task-count';
        countSpan.textContent = ' 0/5';
        label.appendChild(countSpan);
      }
    }

    /* --- telemetry clipboard --- */
    var clipboard = document.getElementById('telemetryClipboard');
    if (clipboard) {
      _enhanceClipboard(clipboard);
    }

    /* cache element refs */
    _cacheElements();

    /* clipboard toggle */
    var toggle = document.getElementById('clipboardToggle');
    if (toggle) {
      toggle.addEventListener('click', _toggleClipboard);
    }
  }

  function _enhanceClipboard(clipboard) {
    var body = document.getElementById('clipboardBody');
    if (!body) return;

    body.innerHTML = '';

    // O2 gauge
    body.appendChild(_makeGaugeRow('O2', 'gaugeO2', 'gauge-o2', '100%'));
    // Food gauge
    body.appendChild(_makeGaugeRow('FOOD', 'gaugeFood', 'gauge-food', '100%'));
    // Fuel gauge
    body.appendChild(_makeGaugeRow('FUEL', 'gaugeFuel', 'gauge-fuel', '100%'));
    // Science
    body.appendChild(_makeInfoRow('SCI', 'sciValue', '0', 'info-sci'));
    // Mass budget
    body.appendChild(_makeInfoRow('MASS', 'massValue', '0 / 0 kg', 'info-mass'));
    // Crew
    body.appendChild(_makeInfoRow('CREW', 'crewValue', '0 alive, 0 ghosts', 'info-crew'));
    // Mars progress
    var marsRow = _makeGaugeRow('MARS', 'gaugeMars', 'gauge-mars', '0%');
    body.appendChild(marsRow);
  }

  function _makeGaugeRow(label, fillId, fillClass, initPct) {
    var row = document.createElement('div');
    row.className = 'gauge-row';

    var lbl = document.createElement('span');
    lbl.className = 'gauge-label';
    lbl.textContent = label;

    var track = document.createElement('div');
    track.className = 'gauge-track';

    var fill = document.createElement('div');
    fill.className = 'gauge-fill ' + fillClass;
    fill.id = fillId;
    fill.style.width = initPct;

    var pct = document.createElement('span');
    pct.className = 'gauge-pct';
    pct.id = fillId + 'Pct';
    pct.textContent = initPct;

    var warn = document.createElement('span');
    warn.className = 'gauge-warn';
    warn.id = fillId + 'Warn';
    warn.style.display = 'none';

    track.appendChild(fill);
    track.appendChild(pct);
    row.appendChild(lbl);
    row.appendChild(track);
    row.appendChild(warn);
    return row;
  }

  function _makeInfoRow(label, valueId, initText, cls) {
    var row = document.createElement('div');
    row.className = 'gauge-row info-row ' + (cls || '');

    var lbl = document.createElement('span');
    lbl.className = 'gauge-label';
    lbl.textContent = label;

    var val = document.createElement('span');
    val.className = 'gauge-value';
    val.id = valueId;
    val.textContent = initText;

    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  function _cacheElements() {
    els.taskBarTrack = document.getElementById('taskBarTrack');
    els.taskCount = document.getElementById('taskCount');
    els.clipboardBody = document.getElementById('clipboardBody');
    els.clipboard = document.getElementById('telemetryClipboard');
    els.clipboardToggle = document.getElementById('clipboardToggle');

    // gauges
    els.gaugeO2 = document.getElementById('gaugeO2');
    els.gaugeO2Pct = document.getElementById('gaugeO2Pct');
    els.gaugeO2Warn = document.getElementById('gaugeO2Warn');
    els.gaugeFood = document.getElementById('gaugeFood');
    els.gaugeFoodPct = document.getElementById('gaugeFoodPct');
    els.gaugeFoodWarn = document.getElementById('gaugeFoodWarn');
    els.gaugeFuel = document.getElementById('gaugeFuel');
    els.gaugeFuelPct = document.getElementById('gaugeFuelPct');
    els.gaugeFuelWarn = document.getElementById('gaugeFuelWarn');
    els.gaugeMars = document.getElementById('gaugeMars');
    els.gaugeMarsPct = document.getElementById('gaugeMarsPct');
    els.sciValue = document.getElementById('sciValue');
    els.massValue = document.getElementById('massValue');
    els.crewValue = document.getElementById('crewValue');

    // action buttons
    els.btnUse = document.getElementById('btnUse');
    els.btnReport = document.getElementById('btnReport');
    els.btnPilot = document.getElementById('btnPilot');
    els.btnKill = document.getElementById('btnKill');
    els.btnMoonEva = document.getElementById('btnMoonEva');
  }

  function _toggleClipboard() {
    clipboardOpen = !clipboardOpen;
    var clipboard = els.clipboard;
    if (!clipboard) return;
    if (clipboardOpen) {
      clipboard.classList.remove('clipboard-collapsed');
      clipboard.classList.add('clipboard-expanded');
      if (els.clipboardToggle) els.clipboardToggle.textContent = '▲ TELEMETRY';
    } else {
      clipboard.classList.remove('clipboard-expanded');
      clipboard.classList.add('clipboard-collapsed');
      if (els.clipboardToggle) els.clipboardToggle.textContent = '▼ TELEMETRY';
    }
  }

  /* ────────────────────────────────────────────
   *  UPDATE HUD
   * ──────────────────────────────────────────── */

  function updateHUD(telemetry, tasks) {
    if (!telemetry) return;

    /* --- task progress segments --- */
    var progress = tasks && tasks.progress != null ? tasks.progress : 0;
    var filledCount = Math.min(SEGMENT_COUNT, Math.round((progress / 100) * SEGMENT_COUNT));
    if (els.taskBarTrack) {
      var segs = els.taskBarTrack.querySelectorAll('.taskbar-seg');
      for (var i = 0; i < segs.length; i++) {
        if (i < filledCount) {
          segs[i].classList.add('filled');
          segs[i].classList.remove('seg-filled');
        } else {
          segs[i].classList.remove('filled');
          segs[i].classList.remove('seg-filled');
        }
      }
    }
    if (els.taskCount) {
      var tasksDone = tasks && tasks.completions != null ? tasks.completions : filledCount;
      var tasksTotal = tasks && tasks.total != null ? tasks.total : 5;
      els.taskCount.textContent = ' ' + Math.min(tasksDone, tasksTotal) + '/' + tasksTotal;
    }

    /* --- O2 --- */
    var o2 = _clamp(telemetry.o2 != null ? telemetry.o2 : 100, 0, 100);
    _animateGauge(els.gaugeO2, els.gaugeO2Pct, o2);
    _setWarning(els.gaugeO2Warn, o2 < 35, 'LOW O2!', 'gaugeO2');

    /* --- Food --- */
    var food = _clamp(telemetry.food != null ? telemetry.food : 100, 0, 100);
    _animateGauge(els.gaugeFood, els.gaugeFoodPct, food);
    _setWarning(els.gaugeFoodWarn, food <= 0, 'STARVING', 'gaugeFood');

    /* --- Fuel --- */
    var fuel = _clamp(telemetry.fuel != null ? telemetry.fuel : 100, 0, 100);
    _animateGauge(els.gaugeFuel, els.gaugeFuelPct, fuel);
    _setWarning(els.gaugeFuelWarn, fuel < 20, 'LOW FUEL!', 'gaugeFuel');

    /* --- Science --- */
    if (els.sciValue) {
      els.sciValue.textContent = (telemetry.science || 0).toString();
    }

    /* --- Mass budget --- */
    if (els.massValue) {
      var totalMass = telemetry.mass || telemetry.totalMass || 0;
      var maxMass = telemetry.maxMass || 0;
      var overloaded = maxMass > 0 && totalMass > maxMass;
      els.massValue.textContent = totalMass + ' / ' + maxMass + ' kg';
      if (overloaded) {
        els.massValue.innerHTML = totalMass + ' / ' + maxMass + ' kg <span class="overloaded-warn">OVERLOADED</span>';
      }
    }

    /* --- Crew --- */
    if (els.crewValue) {
      var alive = telemetry.aliveCount != null ? telemetry.aliveCount : 0;
      var ghosts = telemetry.ghostCount != null ? telemetry.ghostCount : 0;
      els.crewValue.textContent = alive + ' alive, ' + ghosts + ' ghosts';
    }

    /* --- Mars Progress --- */
    _animateGauge(els.gaugeMars, els.gaugeMarsPct, telemetry.marsProgress || 0);
  }

  function _animateGauge(fillEl, pctEl, value) {
    if (fillEl) {
      fillEl.style.transition = 'width 0.4s ease';
      fillEl.style.width = value + '%';
    }
    if (pctEl) {
      pctEl.textContent = Math.round(value) + '%';
    }
  }

  function _setWarning(warnEl, condition, text, key) {
    if (!warnEl) return;
    if (condition) {
      warnEl.textContent = text;
      warnEl.style.display = 'inline';
      warnEl.classList.add('warn-flash');
      // pulse flash
      if (!warningFlashTimers[key]) {
        warningFlashTimers[key] = setInterval(function () {
          warnEl.style.visibility = warnEl.style.visibility === 'hidden' ? 'visible' : 'hidden';
        }, 500);
      }
    } else {
      warnEl.style.display = 'none';
      warnEl.classList.remove('warn-flash');
      if (warningFlashTimers[key]) {
        clearInterval(warningFlashTimers[key]);
        delete warningFlashTimers[key];
      }
      warnEl.style.visibility = 'visible';
    }
  }

  function _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /* ────────────────────────────────────────────
   *  ACTION BUTTONS  (bottom-right)
   * ──────────────────────────────────────────── */

  function createActionButtons() {
    var container = document.getElementById('actionButtons');
    if (!container) return;

    container.innerHTML = '';

    // USE button
    var btnUse = _makeActionBtn('btnUse', 'action-btn action-btn-use', '#f5f557', '🔧', 'USE', '/assets/icons/use.png');
    btnUse.addEventListener('click', function () {
      if (RTM.Moon && RTM.Moon.isActive()) {
        if (RTM.Moon.useAction) RTM.Moon.useAction();
      } else if (typeof RTM.Ship !== 'undefined' && RTM.Ship.useAction) {
        RTM.Ship.useAction();
      }
    });
    container.appendChild(btnUse);

    // REPORT / MEETING button
    var btnReport = _makeActionBtn('btnReport', 'action-btn action-btn-report', '#c51111', '!', 'REPORT', '/assets/icons/report.png');
    btnReport.addEventListener('click', function () {
      if (btnReport.classList.contains('btn-cooldown')) return;
      if (typeof RTM.Meeting !== 'undefined' && RTM.Meeting.callMeeting) {
        RTM.Meeting.callMeeting();
      }
    });
    container.appendChild(btnReport);

    // PILOT 3D button
    var btnPilot = _makeActionBtn('btnPilot', 'action-btn action-btn-pilot', '#132ed1', '🚀', 'PILOT 3D (P)');
    btnPilot.style.display = 'none';
    btnPilot.addEventListener('click', function () {
      claimAndEnterPilot();
    });
    container.appendChild(btnPilot);

    // MAP button
    var btnMap = _makeActionBtn('btnMap', 'action-btn action-btn-map', '#2ecc71', '🗺️', 'MAP (M)');
    btnMap.addEventListener('click', function () {
      if (RTM.Renderer && RTM.Renderer.toggleMinimap) {
        RTM.Renderer.toggleMinimap();
      }
    });
    container.appendChild(btnMap);

    // KILL button
    var btnKill = _makeActionBtn('btnKill', 'action-btn action-btn-kill', '#c51111', '💀', 'KILL', '/assets/icons/kill.png');
    btnKill.style.display = 'none';
    btnKill.addEventListener('click', function () {
      if (RTM.Moon && RTM.Moon.isActive()) {
        if (RTM.Moon.kill) RTM.Moon.kill();
      } else if (RTM.Ship && RTM.Ship.kill) {
        RTM.Ship.kill();
      }
    });
    container.appendChild(btnKill);

    // MOON EVA button
    var btnMoon = _makeActionBtn('btnMoonEva', 'action-btn action-btn-moon', '#6b6b6b', '🌙', 'MOON EVA');
    btnMoon.style.display = 'none';
    btnMoon.addEventListener('click', function () {
      var gameState = RTM.Net ? RTM.Net.getState() : null;
      if (!gameState || !RTM.Net) return;
      if (gameState.moon && gameState.moon.state === 'landed') {
        if (RTM.Moon && RTM.Moon.depart) RTM.Moon.depart();
      } else {
        RTM.Net.emit('moon:land');
      }
    });
    container.appendChild(btnMoon);

    _cacheElements();
  }

  function _makeActionBtn(id, className, bgColor, iconText, label, iconSrc) {
    var btn = document.createElement('button');
    btn.id = id;
    btn.className = className;
    btn.style.backgroundColor = bgColor;
    btn.setAttribute('data-label', label);
    btn.setAttribute('aria-label', label);
    btn.title = label;

    var icon = document.createElement('span');
    icon.className = 'action-icon';
    if (iconSrc) {
      btn.classList.add('has-art');
      var img = document.createElement('img');
      img.src = iconSrc;
      img.alt = '';
      img.draggable = false;
      icon.appendChild(img);
    } else {
      icon.textContent = iconText;
    }

    var lbl = document.createElement('span');
    lbl.className = 'action-label';
    lbl.textContent = label;

    btn.appendChild(icon);
    btn.appendChild(lbl);
    return btn;
  }

  /* ────────────────────────────────────────────
   *  BUTTON VISIBILITY
   * ──────────────────────────────────────────── */

  function updateButtons(state) {
    if (!state) return;

    _showBtn(els.btnUse, !!state.nearStation || !!state.nearMoonItem);

    if (els.btnReport) {
      var canReport = state.canReport !== false;
      els.btnReport.style.display = canReport ? '' : 'none';
      if (state.meetingCooldown) {
        els.btnReport.classList.add('btn-cooldown');
        els.btnReport.style.opacity = '0.5';
      } else {
        els.btnReport.classList.remove('btn-cooldown');
        els.btnReport.style.opacity = '1';
      }
    }

    var canPilot = !!state.nearPilotChair || (RTM.Net && RTM.Net.isPilot());
    if (!canPilot && RTM.Renderer && RTM.Renderer.isInNavigationRoom && RTM.Net) {
      var localPlayer = RTM.Net.getState().players[RTM.Net.playerId];
      if (localPlayer && RTM.Renderer.isInNavigationRoom(localPlayer.x, localPlayer.y)) {
        canPilot = true;
      }
    }
    _showBtn(els.btnPilot, canPilot);

    var isImposter = RTM.Net && RTM.Net.isImpostor && RTM.Net.isImpostor();
    _showBtn(els.btnKill, !!isImposter && !!state.nearCrewmate);

    var canMoon = !!state.canLandMoon || !!state.canDepartMoon;
    _showBtn(els.btnMoonEva, canMoon);
    if (els.btnMoonEva) {
      var label = state.canDepartMoon ? 'DEPART' : 'MOON EVA';
      var lbl = els.btnMoonEva.querySelector('.action-label');
      var icon = els.btnMoonEva.querySelector('.action-icon');
      if (lbl) lbl.textContent = label;
      if (icon) icon.textContent = state.canDepartMoon ? '🚀' : '🌙';
    }
  }

  function _showBtn(btn, visible) {
    if (!btn) return;
    btn.style.display = visible ? '' : 'none';
  }

  function claimAndEnterPilot() {
    if (!RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing') return;
    if (RTM.Net.isPilot()) {
      if (RTM.Cockpit && RTM.Cockpit.show) RTM.Cockpit.show();
    } else if (!gameState.pilotSeat || !gameState.pilotSeat.locked || gameState.pilotSeat.occupantId === RTM.Net.playerId) {
      if (RTM.Cockpit) RTM.Cockpit._pendingAutoOpen = true;
      RTM.Net.emit('pilot:seat:claim');
    } else {
      showNotification('Pilot seat is currently occupied!', 'error');
    }
  }

  /* ────────────────────────────────────────────
   *  NOTIFICATIONS
   * ──────────────────────────────────────────── */

  function showNotification(message, type, variant) {
    var ui = document.getElementById('uiLayer');
    if (!ui) return;

    var toast = document.createElement('div');
    toast.className = 'au-toast';
    if (type) toast.classList.add('toast-' + type);
    if (variant) toast.classList.add('toast-' + variant);

    toast.textContent = message;
    ui.appendChild(toast);

    // animate in
    requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    // auto dismiss
    setTimeout(function () {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, NOTIFICATION_DURATION);
  }

  /* ────────────────────────────────────────────
   *  KILL ANIMATION
   * ──────────────────────────────────────────── */

  function showKillAnimation(x, y, color) {
    var ui = document.getElementById('uiLayer');
    if (!ui) return;

    var flash = document.createElement('div');
    flash.className = 'kill-flash';
    ui.appendChild(flash);

    // trigger animation
    requestAnimationFrame(function () {
      flash.classList.add('kill-flash-active');
    });

    setTimeout(function () {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 600);
  }

  /* ────────────────────────────────────────────
   *  WIRE EVENTS
   * ──────────────────────────────────────────── */

  function init() {
    createHUD();
    createActionButtons();

    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      var key = (e.key || '').toLowerCase();
      if (key === 'm') {
        if (RTM.Renderer && RTM.Renderer.toggleMinimap) {
          e.preventDefault();
          RTM.Renderer.toggleMinimap();
        }
      } else if (key === 'p') {
        if (!RTM.Cockpit || !RTM.Cockpit.isOpen()) {
          e.preventDefault();
          claimAndEnterPilot();
        }
      }
    });

    if (RTM.Net) {
      RTM.Net.on('telemetry:updated', function (data) {
        updateHUD(data.telemetry || data, data.tasks || null);
      });

      RTM.Net.on('game:notif', function (data) {
        showNotification(data.message || data.text || '', data.type || 'info');
      });

      RTM.Net.on('player:killed', function (data) {
        showKillAnimation(data.x, data.y, data.color);
      });

      RTM.Net.on('task:updated', function (data) {
        if (data && data.tasks) {
          updateHUD(RTM.Net.getState().telemetry, data.tasks);
        }
      });
    }
  }

  /* ─── public API ─── */
  return {
    init: init,
    createHUD: createHUD,
    createActionButtons: createActionButtons,
    updateHUD: updateHUD,
    updateButtons: updateButtons,
    showNotification: showNotification,
    showKillAnimation: showKillAnimation
  };
})();
