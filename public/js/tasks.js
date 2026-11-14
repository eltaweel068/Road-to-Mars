window.RTM = window.RTM || {};
window.RTM.Tasks = (function () {
  'use strict';

  var TASKS = {
    wires: { title: 'ELECTRICAL WIRING', eyebrow: 'ELECTRICAL', instruction: 'Drag colored cables to matching sockets. Watch out for sparks!' },
    o2_filter: { title: 'HYDROPONIC VEGGIE FARM', eyebrow: 'LIFE SUPPORT', instruction: 'Irrigate 3 crop beds (Potatoes, Lettuce, Tomatoes) with water droplets, then harvest ripe crops!' },
    water_recycle: { title: 'ECLSS WATER FILTRATION', eyebrow: 'WATER SYSTEM', instruction: 'Flush the 3 clogged filter valves (Charcoal, RO, UV) and pump clean H2O into the reserve tank!' },
    co2_scrubber: { title: 'CO2 SCRUBBER & O2 SENSOR', eyebrow: 'AIR QUALITY', instruction: 'Vent 3 saturated Zeolite canisters into space, then calibrate the O2 regulator to 21.0 kPa!' },
    fuel_synth: { title: 'SABATIER FUEL & BENZINE PUMP', eyebrow: 'PROPULSION', instruction: 'Connect the fuel nozzle and pump propellant keeping pressure in the green zone until 100%!' },
    nav: { title: 'RADAR ASTEROID LOCK', eyebrow: 'NAVIGATION', instruction: 'Click 4 detected orbital targets on the sweeping radar screen.' },
    cargo: { title: 'HULL BREACH PLASMA WELD', eyebrow: 'STORAGE & HULL', instruction: 'Drag the plasma torch across the breach seam to weld it airtight!' },
    science: { title: 'DEEP SPACE DISH ALIGNMENT', eyebrow: 'SCIENCE LAB & COMMS', instruction: 'Rotate the satellite dish antenna toward the DSN carrier signal.' },
    cheese_grill: { title: 'ZERO-G ROMY MELTER', eyebrow: 'CAFETERIA GALLEY', instruction: 'Assemble bread & Egyptian Romy cheese on the grill and press down to melt!' },
    reactor_cool: { title: 'CRYO REACTOR COOLING', eyebrow: 'UPPER REACTOR', instruction: 'Insert Boron control rods into sockets and turn the cryo valve wheel to stabilize core!' },
    shields_prime: { title: 'DEFLECTOR MATRIX ALIGN', eyebrow: 'WEAPONS & SHIELDS', instruction: 'Click red honeycomb nodes to align them cyan, then pull the master capacitor lever!' },
    engine_align: { title: 'THRUSTER GIMBAL ALIGN', eyebrow: 'LOWER ENGINE', instruction: 'Align gimbal angle with the green vector and balance fuel mixture into the sweet spot!' },
    medbay_scan: { title: 'CREW BIO-HEALTH SCAN', eyebrow: 'MEDBAY LAB', instruction: 'Scan crewmate and click to eliminate 4 radiation/fatigue anomalies!' }
  };

  var TASK_REWARDS = {
    wires: '⚡ POWER RESTORED: +15% FUEL & POWER!',
    o2_filter: '🥔 VEGGIES HARVESTED: +22% FOOD, +18% O2, -18% CO2!',
    water_recycle: '💧 ECLSS WATER PURIFIED: +30% CLEAN WATER!',
    co2_scrubber: '🫧 CO2 VENTED & O2 AT 21.0 kPa: -45% CO2, +18% O2!',
    fuel_synth: '⛽ PROPELLANT SYNTHESIZED: +28% FUEL & -15% CO2!',
    nav: '🧭 VECTOR LOCKED: +8% MARS PROGRESS & GYRO CALIBRATED!',
    cargo: '🛡️ HULL WELDED: +20% HULL INTEGRITY & -15 KG MASS!',
    science: '📡 DSN LINK ESTABLISHED: +30 SCIENCE DATA!',
    cheese_grill: '🧀 ROMY CHEESE MELTED: +18% FOOD & STARVATION PREVENTED!',
    reactor_cool: '❄️ CRYO COOLING NOMINAL: +18% FUEL & CORE STABILIZED!',
    shields_prime: '🛡️ DEFLECTOR SHIELDS PRIMED: +22% HULL INTEGRITY!',
    engine_align: '🚀 THRUST GIMBAL OPTIMAL: +10% MARS PROGRESS & +6% FUEL!',
    medbay_scan: '🩺 CREW HEALTH VITALIZED: +15% O2 & +25 SCIENCE DATA!'
  };

  var els = {};
  var currentTask = null;
  var open = false;
  var completed = false;
  var closeTimer = null;
  var stateCleanup = null;

  function cache() {
    els.overlay = document.getElementById('taskOverlay');
    els.content = document.getElementById('taskContent');
    els.close = document.getElementById('taskClose');
  }

  function openTask(taskId) {
    var id = (typeof taskId === 'object' && taskId !== null) ? taskId.id : taskId;
    if (!id || !TASKS[id] || !RTM.Net || !els.overlay || !els.content) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || !RTM.Net.isAlive()) return;
    if (open) close();
    currentTask = id;
    completed = false;
    open = true;
    els.overlay.style.display = 'flex';
    document.body.classList.add('task-open');
    cleanupState();
    buildTask(id);
  }

  function close() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    cleanupState();
    open = false;
    currentTask = null;
    completed = false;
    if (els.overlay) els.overlay.style.display = 'none';
    if (els.content) els.content.innerHTML = '';
    document.body.classList.remove('task-open');
    if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
  }

  function cleanupState() {
    if (typeof stateCleanup === 'function') {
      try {
        stateCleanup();
      } catch (err) {
        console.error('Task cleanup error:', err);
      }
      stateCleanup = null;
    }
  }

  function shell(taskId) {
    var meta = TASKS[taskId];
    els.content.innerHTML = [
      '<div class="task-header">',
      '  <span class="task-eyebrow">' + meta.eyebrow + '</span>',
      '  <h3 class="task-title">' + meta.title + '</h3>',
      '</div>',
      '<p class="task-instruction">' + meta.instruction + '</p>',
      '<div class="task-stage"><canvas id="taskCanvas" width="540" height="380"></canvas></div>',
      '<div class="task-feedback" id="taskFeedback"></div>'
    ].join('');
    return els.content.querySelector('#taskCanvas');
  }

  function feedback(message, type) {
    var element = document.getElementById('taskFeedback');
    if (!element) return;
    element.textContent = message;
    element.className = 'task-feedback' + (type ? ' task-feedback-' + type : '');
  }

  function finish() {
    if (completed || !currentTask) return;
    completed = true;
    feedback('TASK COMPLETE', 'success');
    RTM.Net.emit('task:complete', { taskId: currentTask });
    if (RTM.HUD && RTM.HUD.showNotification) {
      RTM.HUD.showNotification(TASK_REWARDS[currentTask] || 'TASK COMPLETE!', 'success', 'engineering');
    }
    closeTimer = setTimeout(function () {
      closeTimer = null;
      close();
    }, 850);
  }

  // ==============================================================
  // MINI-GAME 1: HYDROPONIC VEGGIE FARM (O2, FOOD, CO2, WATER)
  // ==============================================================
  function runGreenhouseGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var beds = [
      { x: 50,  w: 130, y: 140, h: 175, moisture: 0, ripe: false, harvested: false, label: 'Martian Potatoes', icon: '🥔', color: '#c49a45' },
      { x: 205, w: 130, y: 140, h: 175, moisture: 0, ripe: false, harvested: false, label: 'Space Lettuce', icon: '🥬', color: '#2ecc71' },
      { x: 360, w: 130, y: 140, h: 175, moisture: 0, ripe: false, harvested: false, label: 'Gene Tomatoes', icon: '🍅', color: '#e74c3c' }
    ];

    var waterDrops = [];
    var sparkles = [];
    var isPouring = false;
    var mousePos = { x: 270, y: 70 };
    var finished = false;

    function updateMouse(e) {
      var rect = canvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseDown(e) {
      updateMouse(e);
      var clickedHarvest = false;
      beds.forEach(function (bed) {
        if (bed.ripe && !bed.harvested) {
          if (mousePos.x >= bed.x && mousePos.x <= bed.x + bed.w && mousePos.y >= bed.y && mousePos.y <= bed.y + bed.h) {
            bed.harvested = true;
            clickedHarvest = true;
            if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockondone', 0.5);
            for (var s = 0; s < 14; s++) {
              sparkles.push({
                x: bed.x + bed.w / 2 + (Math.random() - 0.5) * 40,
                y: bed.y + 60,
                vx: (Math.random() - 0.5) * 6,
                vy: -3 - Math.random() * 5,
                color: bed.color,
                life: 1.0
              });
            }
          }
        }
      });
      if (!clickedHarvest) {
        isPouring = true;
      }
    }

    function onMouseUp() {
      isPouring = false;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', updateMouse);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', updateMouse);
    };

    function loop() {
      ctx.fillStyle = '#0f1713';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#17281e';
      ctx.fillRect(0, 0, canvas.width, 32);
      for (var l = 50; l < canvas.width; l += 80) {
        ctx.fillStyle = '#ff3388';
        ctx.fillRect(l, 8, 45, 8);
        ctx.fillStyle = 'rgba(255, 51, 136, 0.08)';
        ctx.beginPath();
        ctx.moveTo(l, 16);
        ctx.lineTo(l - 25, 300);
        ctx.lineTo(l + 70, 300);
        ctx.lineTo(l + 45, 16);
        ctx.fill();
      }

      if (isPouring) {
        for (var i = 0; i < 4; i++) {
          waterDrops.push({
            x: mousePos.x + (Math.random() - 0.5) * 20,
            y: mousePos.y + 14,
            vx: (Math.random() - 0.5) * 1.6,
            vy: 8 + Math.random() * 6
          });
        }
      }

      ctx.fillStyle = '#38fedc';
      for (var d = waterDrops.length - 1; d >= 0; d--) {
        var drop = waterDrops[d];
        drop.x += drop.vx;
        drop.y += drop.vy;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 3, 0, Math.PI * 2);
        ctx.fill();

        beds.forEach(function (bed) {
          if (drop.x >= bed.x && drop.x <= bed.x + bed.w && drop.y >= bed.y + 70 && drop.y <= bed.y + bed.h) {
            bed.moisture = Math.min(100, bed.moisture + 1.2);
            if (bed.moisture >= 100 && !bed.ripe) {
              bed.ripe = true;
              if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockon', 0.4);
            }
          }
        });

        if (drop.y > canvas.height - 10) waterDrops.splice(d, 1);
      }

      var allHarvested = true;
      beds.forEach(function (bed) {
        if (!bed.harvested) allHarvested = false;

        ctx.fillStyle = '#2d241e';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.fillRect(bed.x, bed.y + 70, bed.w, bed.h - 70);
        ctx.strokeRect(bed.x, bed.y + 70, bed.w, bed.h - 70);

        ctx.fillStyle = bed.moisture > 70 ? '#382515' : '#573d27';
        ctx.fillRect(bed.x + 8, bed.y + 78, bed.w - 16, 50);

        ctx.fillStyle = '#111513';
        ctx.fillRect(bed.x + 8, bed.y + 135, bed.w - 16, 12);
        ctx.strokeRect(bed.x + 8, bed.y + 135, bed.w - 16, 12);
        ctx.fillStyle = bed.ripe ? '#50ef39' : '#00bfff';
        ctx.fillRect(bed.x + 8, bed.y + 135, (bed.w - 16) * (bed.moisture / 100), 12);

        var growth = bed.moisture / 100;
        ctx.font = '34px sans-serif';
        ctx.textAlign = 'center';
        if (bed.harvested) {
          ctx.fillStyle = '#50ef39';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('✅ HARVESTED', bed.x + bed.w / 2, bed.y + 50);
        } else if (bed.ripe) {
          var bob = Math.sin(Date.now() * 0.008) * 6;
          ctx.fillText(bed.icon, bed.x + bed.w / 2, bed.y + 40 + bob);
          ctx.fillStyle = '#f5f557';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('CLICK TO HARVEST!', bed.x + bed.w / 2, bed.y + 65);
        } else {
          ctx.strokeStyle = '#2ecc71';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bed.x + bed.w / 2, bed.y + 90);
          ctx.lineTo(bed.x + bed.w / 2, bed.y + 90 - growth * 45);
          ctx.stroke();
          if (growth > 0.4) {
            ctx.fillStyle = '#27ae60';
            ctx.beginPath();
            ctx.arc(bed.x + bed.w / 2 - 12, bed.y + 90 - growth * 35, 8 * growth, 0, Math.PI * 2);
            ctx.arc(bed.x + bed.w / 2 + 12, bed.y + 90 - growth * 35, 8 * growth, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(bed.label, bed.x + bed.w / 2, bed.y + 162);
      });

      for (var sp = sparkles.length - 1; sp >= 0; sp--) {
        var s = sparkles[sp];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.03;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillRect(s.x, s.y, 6, 6);
        ctx.globalAlpha = 1.0;
        if (s.life <= 0) sparkles.splice(sp, 1);
      }

      ctx.fillStyle = '#3a4b59';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.fillRect(mousePos.x - 14, mousePos.y - 12, 28, 22);
      ctx.strokeRect(mousePos.x - 14, mousePos.y - 12, 28, 22);
      ctx.fillStyle = '#38fedc';
      ctx.fillRect(mousePos.x - 6, mousePos.y + 10, 12, 6);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD CLICK TO IRRIGATE BEDS 100% — THEN CLICK TO HARVEST!', canvas.width / 2, 54);

      if (allHarvested && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 19px monospace';
        ctx.fillText('🥔 VEGGIES HARVESTED! (+22% FOOD, +18% O2, -18% CO2)', canvas.width / 2, 110);
        setTimeout(onComplete, 900);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==============================================================
  // MINI-GAME 1B: ECLSS WATER FILTRATION (WATER RECYCLE)
  // ==============================================================
  function runWaterRecycleGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var filters = [
      { id: 'charcoal', label: '1. ACTIVATED CHARCOAL', x: 40, y: 70,  w: 180, h: 62, flushed: false },
      { id: 'ro',       label: '2. REVERSE OSMOSIS',   x: 40, y: 155, w: 180, h: 62, flushed: false },
      { id: 'uv',       label: '3. UV PURIFIER',       x: 40, y: 240, w: 180, h: 62, flushed: false }
    ];

    var waterTank = { x: 260, y: 65, w: 110, h: 245, level: 15 };
    var pumpBtn = { x: 395, y: 140, w: 120, h: 90, pressed: false };
    var bubbles = [];
    var finished = false;

    function getMouse(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onMouseDown(e) {
      var m = getMouse(e);
      filters.forEach(function (f) {
        if (!f.flushed && m.x >= f.x && m.x <= f.x + f.w && m.y >= f.y && m.y <= f.y + f.h) {
          f.flushed = true;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockondone', 0.5);
        }
      });
      if (m.x >= pumpBtn.x && m.x <= pumpBtn.x + pumpBtn.w && m.y >= pumpBtn.y && m.y <= pumpBtn.y + pumpBtn.h) {
        pumpBtn.pressed = true;
      }
    }

    function onMouseUp() {
      pumpBtn.pressed = false;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };

    function loop() {
      ctx.fillStyle = '#0f1824';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLUSH 3 CLOGGED VALVES, THEN HOLD PUMP TO FILL WATER TANK', canvas.width / 2, 38);

      var allFlushed = filters.every(function (f) { return f.flushed; });

      filters.forEach(function (f) {
        ctx.fillStyle = f.flushed ? '#1b3b27' : '#3b1c1c';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.strokeRect(f.x, f.y, f.w, f.h);

        ctx.fillStyle = f.flushed ? '#2ecc71' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(f.x + 24, f.y + f.h / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(f.label, f.x + 44, f.y + 26);

        ctx.font = '10px monospace';
        ctx.fillStyle = f.flushed ? '#50ef39' : '#f39c12';
        ctx.fillText(f.flushed ? 'FLUSHED & NOMINAL' : 'CLOGGED — CLICK TO FLUSH', f.x + 44, f.y + 46);
      });

      ctx.strokeStyle = allFlushed ? '#00bfff' : '#445566';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(220, 100);
      ctx.lineTo(260, 100);
      ctx.moveTo(220, 185);
      ctx.lineTo(260, 185);
      ctx.moveTo(220, 270);
      ctx.lineTo(260, 270);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(waterTank.x, waterTank.y, waterTank.w, waterTank.h);
      ctx.strokeRect(waterTank.x, waterTank.y, waterTank.w, waterTank.h);

      if (allFlushed && pumpBtn.pressed) {
        waterTank.level = Math.min(100, waterTank.level + 0.65);
        bubbles.push({
          x: waterTank.x + 15 + Math.random() * (waterTank.w - 30),
          y: waterTank.y + waterTank.h - 10,
          vy: -2 - Math.random() * 3,
          r: 2 + Math.random() * 4
        });
      }

      var fillH = (waterTank.h - 10) * (waterTank.level / 100);
      ctx.fillStyle = '#00bfff';
      ctx.fillRect(waterTank.x + 5, waterTank.y + waterTank.h - fillH - 5, waterTank.w - 10, fillH);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      for (var b = bubbles.length - 1; b >= 0; b--) {
        var bb = bubbles[b];
        bb.y += bb.vy;
        ctx.beginPath();
        ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
        ctx.stroke();
        if (bb.y <= waterTank.y + waterTank.h - fillH) bubbles.splice(b, 1);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('H2O RESERVE: ' + Math.round(waterTank.level) + '%', waterTank.x + waterTank.w / 2, waterTank.y + waterTank.h + 20);

      var canPump = allFlushed;
      ctx.fillStyle = canPump ? (pumpBtn.pressed ? '#16a085' : '#1abc9c') : '#444c56';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      var byOff = pumpBtn.pressed ? 4 : 0;
      ctx.fillRect(pumpBtn.x, pumpBtn.y + byOff, pumpBtn.w, pumpBtn.h - byOff);
      ctx.strokeRect(pumpBtn.x, pumpBtn.y + byOff, pumpBtn.w, pumpBtn.h - byOff);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('PUMP CLEAN', pumpBtn.x + pumpBtn.w / 2, pumpBtn.y + 40 + byOff);
      ctx.fillText('H2O', pumpBtn.x + pumpBtn.w / 2, pumpBtn.y + 60 + byOff);

      if (waterTank.level >= 100 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('💧 ECLSS WATER PURIFIED! (+30% WATER)', canvas.width / 2, 180);
        setTimeout(onComplete, 900);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==============================================================
  // MINI-GAME 1C: CO2 SCRUBBER & O2 SENSOR (AIR SYSTEM)
  // ==============================================================
  function runCo2ScrubberGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var canisters = [
      { id: 1, x: 50,  y: 70, w: 120, h: 120, vented: false },
      { id: 2, x: 210, y: 70, w: 120, h: 120, vented: false },
      { id: 3, x: 370, y: 70, w: 120, h: 120, vented: false }
    ];

    var slider = { x: 80, y: 275, w: 380, h: 16, val: 27.5, dragging: false };
    var steamParticles = [];
    var finished = false;

    function getMouse(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onMouseDown(e) {
      var m = getMouse(e);
      canisters.forEach(function (c) {
        if (!c.vented && m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) {
          c.vented = true;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('pullup', 0.5);
          for (var p = 0; p < 25; p++) {
            steamParticles.push({
              x: c.x + c.w / 2,
              y: c.y + 20,
              vx: (Math.random() - 0.5) * 6,
              vy: -2 - Math.random() * 5,
              r: 4 + Math.random() * 7,
              alpha: 0.9
            });
          }
        }
      });

      var handleX = slider.x + ((slider.val - 15.0) / 15.0) * slider.w;
      if (Math.hypot(m.x - handleX, m.y - slider.y) < 26) {
        slider.dragging = true;
      }
    }

    function onMouseMove(e) {
      if (!slider.dragging) return;
      var m = getMouse(e);
      var ratio = Math.max(0, Math.min(1, (m.x - slider.x) / slider.w));
      slider.val = 15.0 + ratio * 15.0;
    }

    function onMouseUp() {
      slider.dragging = false;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    function loop() {
      ctx.fillStyle = '#141724';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VENT 3 SATURATED ZEOLITE CANISTERS & CALIBRATE O2 TO 21.0 kPa', canvas.width / 2, 38);

      for (var s = steamParticles.length - 1; s >= 0; s--) {
        var sp = steamParticles[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.r += 0.3;
        sp.alpha -= 0.025;
        ctx.fillStyle = 'rgba(200, 220, 235, ' + Math.max(0, sp.alpha) + ')';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        if (sp.alpha <= 0) steamParticles.splice(s, 1);
      }

      canisters.forEach(function (c, idx) {
        ctx.fillStyle = c.vented ? '#1e382b' : '#3d1d1d';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ZEOLITE #' + (idx + 1), c.x + c.w / 2, c.y + 24);

        ctx.font = '32px sans-serif';
        ctx.fillText(c.vented ? '🫧' : '⚠️', c.x + c.w / 2, c.y + 68);

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = c.vented ? '#50ef39' : '#e74c3c';
        ctx.fillText(c.vented ? 'VENTED NOMINAL' : 'CLICK TO VENT', c.x + c.w / 2, c.y + 104);
      });

      var allVented = canisters.every(function (c) { return c.vented; });
      var isOptimal = Math.abs(slider.val - 21.0) <= 0.6;

      ctx.fillStyle = '#22283a';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(40, 220, 460, 130);
      ctx.strokeRect(40, 220, 460, 130);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OXYGEN REGULATOR: ' + slider.val.toFixed(1) + ' kPa ' + (isOptimal ? '✨ [OPTIMAL 21.0 kPa]' : ''), canvas.width / 2, 250);

      ctx.fillStyle = '#10141f';
      ctx.fillRect(slider.x, slider.y, slider.w, slider.h);
      ctx.strokeRect(slider.x, slider.y, slider.w, slider.h);

      var targetX1 = slider.x + ((20.4 - 15.0) / 15.0) * slider.w;
      var targetW = ((21.6 - 20.4) / 15.0) * slider.w;
      ctx.fillStyle = 'rgba(80, 239, 57, 0.4)';
      ctx.fillRect(targetX1, slider.y - 4, targetW, slider.h + 8);

      var handleX = slider.x + ((slider.val - 15.0) / 15.0) * slider.w;
      ctx.fillStyle = isOptimal ? '#50ef39' : '#38fedc';
      ctx.beginPath();
      ctx.arc(handleX, slider.y + slider.h / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (allVented && isOptimal && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('🫧 CO2 VENTED & O2 AT 21.0 kPa! (-45% CO2, +18% O2)', canvas.width / 2, 335);
        setTimeout(onComplete, 900);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==============================================================
  // MINI-GAME 1D: SABATIER FUEL & BENZINE PUMP (FUEL SYNTH)
  // ==============================================================
  function runFuelSynthGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;

    var nozzle = { x: 60, y: 120, w: 90, h: 45, docked: false, dragging: false };
    var dock = { x: 190, y: 110, w: 60, h: 65 };
    var tank = { x: 370, y: 70, w: 120, h: 250, fill: 10 };
    var pressure = 20;
    var pumpLever = { x: 230, y: 280, w: 100, h: 50, pressed: false };
    var finished = false;

    function getMouse(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onMouseDown(e) {
      var m = getMouse(e);
      if (!nozzle.docked && m.x >= nozzle.x && m.x <= nozzle.x + nozzle.w && m.y >= nozzle.y && m.y <= nozzle.y + nozzle.h) {
        nozzle.dragging = true;
      }
      if (nozzle.docked && m.x >= pumpLever.x && m.x <= pumpLever.x + pumpLever.w && m.y >= pumpLever.y && m.y <= pumpLever.y + pumpLever.h) {
        pumpLever.pressed = true;
      }
    }

    function onMouseMove(e) {
      if (nozzle.dragging) {
        var m = getMouse(e);
        nozzle.x = m.x - nozzle.w / 2;
        nozzle.y = m.y - nozzle.h / 2;
        if (Math.hypot(nozzle.x - dock.x, nozzle.y - dock.y) < 40) {
          nozzle.x = dock.x;
          nozzle.y = dock.y + 10;
          nozzle.docked = true;
          nozzle.dragging = false;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockondone', 0.5);
        }
      }
    }

    function onMouseUp() {
      nozzle.dragging = false;
      pumpLever.pressed = false;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    function loop() {
      ctx.fillStyle = '#16141c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CONNECT NOZZLE & PUMP PROPELLANT IN GREEN ZONE UNTIL 100%', canvas.width / 2, 38);

      if (pumpLever.pressed && nozzle.docked) {
        pressure = Math.min(95, pressure + 1.2);
        if (pressure >= 40 && pressure <= 65) {
          tank.fill = Math.min(100, tank.fill + 0.55);
        } else if (pressure > 65) {
          tank.fill = Math.min(100, tank.fill + 0.15);
        }
      } else {
        pressure = Math.max(15, pressure - 0.7);
      }

      ctx.fillStyle = nozzle.docked ? '#2ecc71' : '#445566';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(dock.x, dock.y, dock.w, dock.h);
      ctx.strokeRect(dock.x, dock.y, dock.w, dock.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(nozzle.docked ? 'LOCKED' : 'DOCK', dock.x + dock.w / 2, dock.y + 36);

      ctx.strokeStyle = '#e67e22';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.bezierCurveTo(40, 240, nozzle.x - 30, nozzle.y + 40, nozzle.x, nozzle.y + 20);
      ctx.stroke();

      ctx.fillStyle = nozzle.docked ? '#27ae60' : '#f39c12';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(nozzle.x, nozzle.y, nozzle.w, nozzle.h);
      ctx.strokeRect(nozzle.x, nozzle.y, nozzle.w, nozzle.h);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(nozzle.docked ? 'CONNECTED' : 'DRAG NOZZLE', nozzle.x + nozzle.w / 2, nozzle.y + 26);

      var gaugeX = 280;
      var gaugeY = 170;
      var gaugeR = 48;
      ctx.fillStyle = '#222533';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(gaugeX, gaugeY, gaugeR - 8, Math.PI * 0.9, Math.PI * 1.6);
      ctx.stroke();

      var needleAngle = Math.PI * 0.6 + (pressure / 100) * (Math.PI * 1.4);
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gaugeX, gaugeY);
      ctx.lineTo(gaugeX + Math.cos(needleAngle) * (gaugeR - 12), gaugeY + Math.sin(needleAngle) * (gaugeR - 12));
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(Math.round(pressure) + ' PSI', gaugeX, gaugeY + 28);

      var byOff = pumpLever.pressed ? 4 : 0;
      ctx.fillStyle = nozzle.docked ? (pumpLever.pressed ? '#d35400' : '#e67e22') : '#444c56';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(pumpLever.x, pumpLever.y + byOff, pumpLever.w, pumpLever.h - byOff);
      ctx.strokeRect(pumpLever.x, pumpLever.y + byOff, pumpLever.w, pumpLever.h - byOff);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('PUMP FUEL', pumpLever.x + pumpLever.w / 2, pumpLever.y + 30 + byOff);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(tank.x, tank.y, tank.w, tank.h);
      ctx.strokeRect(tank.x, tank.y, tank.w, tank.h);

      var fillH = (tank.h - 10) * (tank.fill / 100);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(tank.x + 5, tank.y + tank.h - fillH - 5, tank.w - 10, fillH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('FUEL: ' + Math.round(tank.fill) + '%', tank.x + tank.w / 2, tank.y + tank.h + 20);

      if (tank.fill >= 100 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('⛽ PROPELLANT SYNTHESIZED! (+28% FUEL, -15% CO2)', canvas.width / 2, 180);
        setTimeout(onComplete, 900);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 2: ELECTRICAL WIRING (FUEL)
  // ==========================================
  function runWiresGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var colors = ['#c51111', '#132ed1', '#f5f557', '#117f2d'];
    var leftTerminals = [
      { y: 80,  color: colors[0], connected: -1 },
      { y: 150, color: colors[1], connected: -1 },
      { y: 220, color: colors[2], connected: -1 },
      { y: 290, color: colors[3], connected: -1 }
    ];

    var perm = [2, 0, 3, 1];
    var rightTerminals = perm.map(function (pIdx, idx) {
      return { y: [80, 150, 220, 290][idx], color: colors[pIdx] };
    });

    var draggingWire = -1;
    var mousePos = { x: 0, y: 0 };
    var sparks = [];
    var finished = false;

    function updateMouse(e) {
      var rect = canvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseDown(e) {
      updateMouse(e);
      leftTerminals.forEach(function (term, idx) {
        if (Math.hypot(mousePos.x - 50, mousePos.y - term.y) < 30 && term.connected === -1) {
          draggingWire = idx;
        }
      });
    }

    function onMouseUp() {
      if (draggingWire !== -1) {
        var targetCol = leftTerminals[draggingWire].color;
        rightTerminals.forEach(function (rTerm, rIdx) {
          if (rTerm.color === targetCol && Math.hypot(mousePos.x - 490, mousePos.y - rTerm.y) < 34) {
            leftTerminals[draggingWire].connected = rIdx;
            for (var s = 0; s < 22; s++) {
              sparks.push({
                x: 490, y: rTerm.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 25
              });
            }
            if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
          }
        });
        draggingWire = -1;
      }
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', updateMouse);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', updateMouse);
    };

    function loop() {
      ctx.fillStyle = '#1c1f2b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Terminal panels
      ctx.fillStyle = '#12141c';
      ctx.fillRect(20, 45, 60, 290);
      ctx.fillRect(460, 45, 60, 290);
      ctx.strokeStyle = '#2f354a';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 45, 60, 290);
      ctx.strokeRect(460, 45, 60, 290);

      // Left sockets
      leftTerminals.forEach(function (term) {
        ctx.fillStyle = term.color;
        ctx.beginPath();
        ctx.arc(50, term.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // Right sockets
      rightTerminals.forEach(function (term) {
        ctx.fillStyle = term.color;
        ctx.beginPath();
        ctx.arc(490, term.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // Connected / Dragging Wires with natural sag
      var connectedCount = 0;
      leftTerminals.forEach(function (term, idx) {
        if (term.connected !== -1) {
          connectedCount++;
          var rY = rightTerminals[term.connected].y;
          ctx.strokeStyle = term.color;
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(50, term.y);
          ctx.bezierCurveTo(200, term.y + 40, 340, rY + 40, 490, rY);
          ctx.stroke();
        } else if (draggingWire === idx) {
          ctx.strokeStyle = term.color;
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.moveTo(50, term.y);
          ctx.bezierCurveTo(160, term.y + 25, mousePos.x - 60, mousePos.y + 25, mousePos.x, mousePos.y);
          ctx.stroke();
        }
      });

      // Live electric sparks
      for (var sp = sparks.length - 1; sp >= 0; sp--) {
        var spark = sparks[sp];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life--;
        ctx.fillStyle = '#f5f557';
        ctx.fillRect(spark.x, spark.y, 3, 3);
        if (spark.life <= 0) sparks.splice(sp, 1);
      }

      if (connectedCount === 4 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ POWER BUS RESTORED! (+15% FUEL)', canvas.width / 2, 355);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 3: HULL BREACH PLASMA WELD (HULL & MASS)
  // ==========================================
  function runHullWelderGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var crackPoints = [];
    for (var x = 80; x <= 460; x += 14) {
      crackPoints.push({
        x: x,
        y: 190 + Math.sin(x * 0.045) * 32 + ((x % 28 === 0) ? 14 : -10),
        welded: false
      });
    }

    var clamps = [
      { x: 140, y: 310, locked: false, label: 'CLAMP #1' },
      { x: 380, y: 310, locked: false, label: 'CLAMP #2' }
    ];

    var torchPos = { x: 80, y: 190 };
    var isWelding = false;
    var sparks = [];
    var finished = false;

    function updateTorch(e) {
      var rect = canvas.getBoundingClientRect();
      torchPos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      torchPos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseDown(e) {
      updateTorch(e);
      clamps.forEach(function (c) {
        if (Math.hypot(torchPos.x - c.x, torchPos.y - c.y) < 30) {
          c.locked = true;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        }
      });
      isWelding = true;
    }

    function onMouseUp() {
      isWelding = false;
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', updateTorch);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', updateTorch);
    };

    function loop() {
      ctx.fillStyle = '#181b24';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Titanium bulkhead plates
      ctx.strokeStyle = '#2c3244';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 25, 480, 330);

      // Draw Unwelded Crack
      ctx.strokeStyle = '#ef440d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      crackPoints.forEach(function (pt, idx) {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Check Welding Proximity
      var weldedCount = 0;
      crackPoints.forEach(function (pt) {
        if (isWelding && Math.hypot(torchPos.x - pt.x, torchPos.y - pt.y) < 26) {
          pt.welded = true;
          sparks.push({
            x: pt.x, y: pt.y,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.5) * 14,
            color: Math.random() > 0.4 ? '#38fedc' : '#ffffff',
            life: 14
          });
        }
        if (pt.welded) weldedCount++;
      });

      // Welded Bead
      ctx.strokeStyle = '#d9e2ec';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 8;
      crackPoints.forEach(function (pt) {
        if (pt.welded) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Cargo Clamps
      clamps.forEach(function (c) {
        ctx.fillStyle = c.locked ? '#50ef39' : '#e63946';
        ctx.fillRect(c.x - 30, c.y - 12, 60, 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x - 30, c.y - 12, 60, 24);
        ctx.fillStyle = '#0b0d12';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.locked ? 'LOCKED' : 'CLICK CLAMP', c.x, c.y + 4);
      });

      // Sparks
      for (var sp = sparks.length - 1; sp >= 0; sp--) {
        var s = sparks[sp];
        s.x += s.vx; s.y += s.vy; s.life--;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 3, 3);
        if (s.life <= 0) sparks.splice(sp, 1);
      }

      // Plasma Torch
      ctx.fillStyle = isWelding ? '#38fedc' : '#778899';
      ctx.beginPath();
      ctx.arc(torchPos.x, torchPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      if (isWelding) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(torchPos.x, torchPos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      var progress = weldedCount / crackPoints.length;
      var clampsDone = clamps.every(function (c) { return c.locked; });

      if (progress >= 0.95 && clampsDone && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ HULL WELDED & SECURED! (+20% HULL, -15KG)', canvas.width / 2, 50);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 4: DEEP SPACE DISH ALIGNMENT (SCIENCE)
  // ==========================================
  function runCommsDishGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var targetAngle = Math.PI * 0.72;
    var currentAngle = Math.PI * 0.15;
    var isDragging = false;
    var finished = false;

    function onMouseDown() { isDragging = true; }
    function onMouseUp() { isDragging = false; }
    function onMouseMove(e) {
      if (!isDragging) return;
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      var my = (e.clientY - rect.top) * (canvas.height / rect.height);
      currentAngle = Math.atan2(my - 220, mx - 270);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
    };

    function loop() {
      ctx.fillStyle = '#0c1020';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var diff = Math.abs(currentAngle - targetAngle);
      var signalStrength = Math.max(0, 1 - diff / (Math.PI * 0.45));

      // Signal Strength Bar
      ctx.fillStyle = '#222838';
      ctx.fillRect(90, 35, 360, 24);
      ctx.fillStyle = signalStrength > 0.92 ? '#50ef39' : '#f5f557';
      ctx.fillRect(90, 35, 360 * signalStrength, 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DSN CARRIER LOCK: ' + Math.round(signalStrength * 100) + '%', canvas.width / 2, 52);

      // Oscilloscope Sine Wave Comparison
      ctx.strokeStyle = 'rgba(56, 254, 220, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var ox = 90; ox <= 450; ox += 4) {
        var targetSine = 110 + Math.sin(ox * 0.08 + Date.now() * 0.006) * 18;
        if (ox === 90) ctx.moveTo(ox, targetSine);
        else ctx.lineTo(ox, targetSine);
      }
      ctx.stroke();

      ctx.strokeStyle = signalStrength > 0.92 ? '#50ef39' : '#ef7d0d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var sx = 90; sx <= 450; sx += 4) {
        var userSine = 110 + Math.sin(sx * (0.04 + signalStrength * 0.04) + Date.now() * 0.006) * (18 * signalStrength);
        if (sx === 90) ctx.moveTo(sx, userSine);
        else ctx.lineTo(sx, userSine);
      }
      ctx.stroke();

      // Satellite Dish Pedestal
      ctx.fillStyle = '#445566';
      ctx.fillRect(250, 230, 40, 80);
      ctx.fillStyle = '#223344';
      ctx.fillRect(220, 300, 100, 22);

      // Rotating Parabolic Dish
      ctx.save();
      ctx.translate(270, 230);
      ctx.rotate(currentAngle);

      ctx.strokeStyle = '#d6e0f0';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 80, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      // Feed horn
      ctx.strokeStyle = '#38fedc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(60, 0);
      ctx.stroke();
      ctx.restore();

      if (signalStrength > 0.94 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('📡 DSN LINK ESTABLISHED! (+30 SCIENCE)', canvas.width / 2, 355);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 5: RADAR ASTEROID LOCK (NAV & AUTOPILOT)
  // ==========================================
  function runRadarLockGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var radarAngle = 0;
    var targets = [
      { x: 180, y: 140, vx: 0.4, vy: 0.3, locked: false },
      { x: 350, y: 160, vx: -0.3, vy: 0.5, locked: false },
      { x: 230, y: 270, vx: 0.5, vy: -0.4, locked: false },
      { x: 340, y: 280, vx: -0.4, vy: -0.3, locked: false }
    ];
    var finished = false;

    function onClick(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      var my = (e.clientY - rect.top) * (canvas.height / rect.height);

      targets.forEach(function (t) {
        if (Math.hypot(mx - t.x, my - t.y) < 28 && !t.locked) {
          t.locked = true;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        }
      });
    }

    canvas.addEventListener('click', onClick);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('click', onClick);
    };

    function loop() {
      ctx.fillStyle = '#06160a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var cx = canvas.width / 2;
      var cy = canvas.height / 2;

      // Polar Radar Rings
      ctx.strokeStyle = '#155724';
      ctx.lineWidth = 2;
      [45, 95, 145].forEach(function (r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.moveTo(cx - 155, cy); ctx.lineTo(cx + 155, cy);
      ctx.moveTo(cx, cy - 155); ctx.lineTo(cx, cy + 155);
      ctx.stroke();

      // Phosphor Sweeper Beam
      radarAngle += 0.045;
      ctx.strokeStyle = '#50ef39';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(radarAngle) * 155, cy + Math.sin(radarAngle) * 155);
      ctx.stroke();

      // Moving Targets
      var lockedCount = 0;
      targets.forEach(function (t) {
        if (!t.locked) {
          t.x += t.vx;
          t.y += t.vy;
          if (Math.hypot(t.x - cx, t.y - cy) > 140) {
            t.vx = -t.vx;
            t.vy = -t.vy;
          }
        } else {
          lockedCount++;
        }

        ctx.fillStyle = t.locked ? '#50ef39' : '#ff3344';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.locked ? 9 : 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = t.locked ? '#50ef39' : '#ff7788';
        ctx.lineWidth = 2;
        ctx.strokeRect(t.x - 14, t.y - 14, 28, 28);
      });

      // HUD Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK 4 DETECTED ASTEROID VECTORS (' + lockedCount + '/4 LOCKED)', canvas.width / 2, 40);

      if (lockedCount === 4 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('🧭 NAVIGATION VECTOR LOCKED! (+8% MARS PROGRESS)', canvas.width / 2, cy);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 6: ZERO-G ROMY MELTER (CAFETERIA GALLEY)
  // ==========================================
  function runCheeseGrillGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var mousePos = { x: 0, y: 0 };
    var dragging = null; // 'bread' | 'cheese' | 'handle'
    var finished = false;

    var bread = { x: 80, y: 130, w: 90, h: 65, placed: false };
    var cheese = { x: 80, y: 240, w: 80, h: 60, placed: false };
    var grillZone = { x: 230, y: 160, w: 180, h: 120 };
    var handleY = 100; // dragged to 180 to grill
    var grillProgress = 0; // 0 to 100
    var particles = [];

    function updateCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      mousePos.x = (clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (clientY - rect.top) * (canvas.height / rect.height);
    }

    function onDown(e) {
      updateCoords(e);
      if (finished) return;
      if (!bread.placed && Math.hypot(mousePos.x - (bread.x + bread.w / 2), mousePos.y - (bread.y + bread.h / 2)) < 50) {
        dragging = 'bread';
      } else if (!cheese.placed && Math.hypot(mousePos.x - (cheese.x + cheese.w / 2), mousePos.y - (cheese.y + cheese.h / 2)) < 50) {
        dragging = 'cheese';
      } else if (bread.placed && cheese.placed && Math.abs(mousePos.x - 320) < 100 && Math.abs(mousePos.y - handleY) < 35) {
        dragging = 'handle';
      }
    }

    function onMove(e) {
      updateCoords(e);
      if (!dragging) return;
      if (dragging === 'bread') {
        bread.x = mousePos.x - bread.w / 2;
        bread.y = mousePos.y - bread.h / 2;
      } else if (dragging === 'cheese') {
        cheese.x = mousePos.x - cheese.w / 2;
        cheese.y = mousePos.y - cheese.h / 2;
      } else if (dragging === 'handle') {
        handleY = Math.max(100, Math.min(185, mousePos.y));
      }
    }

    function onUp() {
      if (dragging === 'bread') {
        if (Math.hypot(bread.x + bread.w / 2 - (grillZone.x + grillZone.w / 2), bread.y + bread.h / 2 - (grillZone.y + grillZone.h / 2)) < 90) {
          bread.placed = true;
          bread.x = grillZone.x + 45;
          bread.y = grillZone.y + 35;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        } else {
          bread.x = 80; bread.y = 130;
        }
      } else if (dragging === 'cheese') {
        if (Math.hypot(cheese.x + cheese.w / 2 - (grillZone.x + grillZone.w / 2), cheese.y + cheese.h / 2 - (grillZone.y + grillZone.h / 2)) < 90) {
          cheese.placed = true;
          cheese.x = grillZone.x + 50;
          cheese.y = grillZone.y + 30;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        } else {
          cheese.x = 80; cheese.y = 240;
        }
      }
      if (dragging === 'handle' && handleY < 175) {
        handleY = 100;
      }
      dragging = null;
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', function(e) { if (dragging) e.preventDefault(); onMove(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };

    function loop() {
      ctx.fillStyle = '#1e2330';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Kitchen Counter Tiling
      ctx.strokeStyle = '#2d3345';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < canvas.width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (var gy = 0; gy < canvas.height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }

      // Title & Instruction
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      if (!bread.placed || !cheese.placed) {
        ctx.fillText('DRAG BREAD & EGYPTIAN ROMY CHEESE ONTO THE PANINI GRILL', canvas.width / 2, 40);
      } else if (grillProgress < 100) {
        ctx.fillText('PULL CHROME HANDLE DOWN AND HOLD TO MELT CHEESE!', canvas.width / 2, 40);
      }

      // Ingredient Tray on Left
      ctx.fillStyle = '#161922';
      ctx.strokeStyle = '#38fedc';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 70, 160, 270);
      ctx.fillRect(30, 70, 160, 270);
      ctx.fillStyle = '#a0aec0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('GALLEY PANTRY', 110, 95);

      // Cast-Iron Panini Grill Base
      ctx.fillStyle = '#10121a';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.fillRect(grillZone.x - 15, grillZone.y - 15, grillZone.w + 30, grillZone.h + 30);
      ctx.strokeRect(grillZone.x - 15, grillZone.y - 15, grillZone.w + 30, grillZone.h + 30);

      // Grill Ridges
      ctx.strokeStyle = '#ff8c00';
      ctx.lineWidth = 3;
      for (var ry = grillZone.y; ry <= grillZone.y + grillZone.h; ry += 18) {
        ctx.beginPath();
        ctx.moveTo(grillZone.x, ry);
        ctx.lineTo(grillZone.x + grillZone.w, ry);
        ctx.stroke();
      }

      // Draw Bread Slice
      ctx.save();
      ctx.fillStyle = '#d49b4b';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bread.x, bread.y, bread.w, bread.h, 12);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fdf4dc';
      ctx.beginPath();
      ctx.roundRect(bread.x + 6, bread.y + 6, bread.w - 12, bread.h - 12, 8);
      ctx.fill();
      ctx.fillStyle = '#4a3512';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('BREAD', bread.x + bread.w / 2, bread.y + bread.h / 2 + 4);
      ctx.restore();

      // Draw Egyptian Romy Cheese Wedge
      ctx.save();
      ctx.fillStyle = '#f5c518';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cheese.x, cheese.y + cheese.h);
      ctx.lineTo(cheese.x + cheese.w, cheese.y + cheese.h);
      ctx.lineTo(cheese.x + cheese.w, cheese.y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Cheese Holes
      ctx.fillStyle = '#d4a010';
      ctx.beginPath(); ctx.arc(cheese.x + 40, cheese.y + 40, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cheese.x + 60, cheese.y + 25, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cheese.x + 25, cheese.y + 50, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ROMY', cheese.x + 42, cheese.y + 48);
      ctx.restore();

      // Press Handle & Grill Lid
      if (bread.placed && cheese.placed) {
        // Upper grill press plate
        var lidY = handleY + 20;
        ctx.fillStyle = '#2d3748';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.fillRect(grillZone.x - 10, lidY, grillZone.w + 20, 24);
        ctx.strokeRect(grillZone.x - 10, lidY, grillZone.w + 20, 24);

        // Chrome Handle bar
        ctx.fillStyle = '#cbd5e0';
        ctx.fillRect(grillZone.x + 10, handleY, grillZone.w - 20, 16);
        ctx.strokeRect(grillZone.x + 10, handleY, grillZone.w - 20, 16);

        // Handle knob
        ctx.fillStyle = '#c53030';
        ctx.fillRect(305, handleY - 6, 30, 28);
        ctx.strokeRect(305, handleY - 6, 30, 28);

        // Handle prompt
        if (handleY < 170) {
          ctx.fillStyle = '#f5f557';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('⬇ PULL HANDLE DOWN ⬇', 320, handleY - 14);
        }

        // Grilling active check
        if (handleY >= 170 && !finished) {
          grillProgress = Math.min(100, grillProgress + 0.85);

          // Steam & Golden Aroma Particles
          for (var p = 0; p < 2; p++) {
            particles.push({
              x: grillZone.x + Math.random() * grillZone.w,
              y: grillZone.y + 20,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -1.8 - Math.random() * 2,
              life: 40,
              color: Math.random() > 0.4 ? 'rgba(255,220,100,0.8)' : 'rgba(240,240,255,0.7)',
              size: 4 + Math.random() * 6
            });
          }
        }
      }

      // Progress bar on right
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.fillRect(450, 100, 36, 180);
      ctx.strokeRect(450, 100, 36, 180);
      var fillH = (grillProgress / 100) * 174;
      ctx.fillStyle = grillProgress >= 100 ? '#50ef39' : '#ff9900';
      ctx.fillRect(453, 277 - fillH, 30, fillH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(Math.floor(grillProgress) + '%', 468, 296);

      // Draw Particles
      for (var i = particles.length - 1; i >= 0; i--) {
        var pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // Completion Banner
      if (grillProgress >= 100 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('🧀 ROMY CHEESE MELTED! (+18% FOOD)', canvas.width / 2, 190);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 7: CRYO REACTOR COOLING (UPPER REACTOR)
  // ==========================================
  function runReactorCoolGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var mousePos = { x: 0, y: 0 };
    var finished = false;
    var draggingRod = -1;

    var rods = [
      { id: 0, x: 70,  y: 70, targetY: 210, locked: false },
      { id: 1, x: 160, y: 70, targetY: 210, locked: false },
      { id: 2, x: 250, y: 70, targetY: 210, locked: false }
    ];
    var coreTemp = 1200; // drops to 320°C
    var valveAngle = 0;
    var valveDragging = false;
    var frostParticles = [];

    function updateCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      mousePos.x = (clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (clientY - rect.top) * (canvas.height / rect.height);
    }

    function onDown(e) {
      updateCoords(e);
      if (finished) return;
      rods.forEach(function (rod, idx) {
        if (!rod.locked && Math.hypot(mousePos.x - (rod.x + 20), mousePos.y - (rod.y + 40)) < 40) {
          draggingRod = idx;
        }
      });
      // Check Valve interaction
      var allRodsLocked = rods.every(function (r) { return r.locked; });
      if (allRodsLocked && Math.hypot(mousePos.x - 430, mousePos.y - 190) < 55) {
        valveDragging = true;
      }
    }

    function onMove(e) {
      updateCoords(e);
      if (draggingRod !== -1) {
        rods[draggingRod].y = Math.max(70, Math.min(215, mousePos.y - 40));
      }
      if (valveDragging) {
        valveAngle += 0.08;
        coreTemp = Math.max(320, coreTemp - 14);
        for (var p = 0; p < 3; p++) {
          frostParticles.push({
            x: 430 + (Math.random() - 0.5) * 60,
            y: 190 + (Math.random() - 0.5) * 60,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color: '#a0f0ff',
            size: 3 + Math.random() * 4
          });
        }
      }
    }

    function onUp() {
      if (draggingRod !== -1) {
        if (rods[draggingRod].y >= 195) {
          rods[draggingRod].locked = true;
          rods[draggingRod].y = rods[draggingRod].targetY;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        } else {
          rods[draggingRod].y = 70;
        }
        draggingRod = -1;
      }
      valveDragging = false;
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', function (e) { if (draggingRod !== -1 || valveDragging) e.preventDefault(); onMove(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };

    function loop() {
      ctx.fillStyle = '#12141e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      var allRodsLocked = rods.every(function (r) { return r.locked; });
      if (!allRodsLocked) {
        ctx.fillText('INSERT ALL 3 BORON CONTROL RODS INTO CORE SOCKETS', canvas.width / 2, 40);
      } else if (coreTemp > 320) {
        ctx.fillText('TURN CRYO VALVE WHEEL TO VENT NITROGEN AND COOL CORE!', canvas.width / 2, 40);
      }

      // Reactor Core Background Glow
      var tempRatio = (coreTemp - 320) / (1200 - 320);
      var coreColor = tempRatio > 0.4 ? 'rgba(255, 40, 40, ' + (0.2 + tempRatio * 0.4) + ')' : 'rgba(56, 254, 220, 0.3)';
      ctx.fillStyle = coreColor;
      ctx.fillRect(40, 60, 270, 260);

      // Rod Chamber Frame
      ctx.strokeStyle = '#2f354a';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 60, 270, 260);

      // Sockets at Bottom
      rods.forEach(function (rod) {
        ctx.fillStyle = rod.locked ? '#38fedc' : '#222636';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.fillRect(rod.x - 5, rod.targetY, 50, 70);
        ctx.strokeRect(rod.x - 5, rod.targetY, 50, 70);

        // Control Rod (Boron Cylinder)
        ctx.fillStyle = rod.locked ? '#38fedc' : '#a0aec0';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.fillRect(rod.x, rod.y, 40, 70);
        ctx.strokeRect(rod.x, rod.y, 40, 70);

        // Rod Handle
        ctx.fillStyle = '#f5f557';
        ctx.fillRect(rod.x + 10, rod.y - 12, 20, 14);
        ctx.strokeRect(rod.x + 10, rod.y - 12, 20, 14);
      });

      // Right Side: Cryo Valve Wheel (430, 190)
      ctx.save();
      ctx.translate(430, 190);
      ctx.rotate(valveAngle);
      ctx.fillStyle = allRodsLocked ? '#3182ce' : '#4a5568';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Spokes
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1a202c';
      ctx.beginPath();
      ctx.moveTo(-48, 0); ctx.lineTo(48, 0);
      ctx.moveTo(0, -48); ctx.lineTo(0, 48);
      ctx.stroke();
      ctx.restore();

      // Temperature Readout
      ctx.fillStyle = tempRatio > 0.4 ? '#ff4d4d' : '#38fedc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CORE TEMP: ' + Math.floor(coreTemp) + '°C', 430, 95);

      // Frost Particles
      for (var i = frostParticles.length - 1; i >= 0; i--) {
        var fp = frostParticles[i];
        fp.x += fp.vx; fp.y += fp.vy; fp.life--;
        ctx.fillStyle = fp.color;
        ctx.fillRect(fp.x, fp.y, fp.size, fp.size);
        if (fp.life <= 0) frostParticles.splice(i, 1);
      }

      // Finish Check
      if (coreTemp <= 320 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('❄️ CRYO COOLING NOMINAL! (+18% FUEL)', canvas.width / 2, 190);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 8: DEFLECTOR MATRIX ALIGNMENT (WEAPONS & SHIELDS)
  // ==========================================
  function runShieldsPrimeGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var mousePos = { x: 0, y: 0 };
    var finished = false;

    // 7 Honeycomb Shield Nodes (1 center, 6 perimeter)
    var nodes = [{ x: 200, y: 190, aligned: false }];
    for (var i = 0; i < 6; i++) {
      var angle = (i * Math.PI) / 3;
      nodes.push({
        x: 200 + Math.cos(angle) * 75,
        y: 190 + Math.sin(angle) * 75,
        aligned: (i % 2 === 0) // initial mixed alignment
      });
    }

    var shockwaves = [];
    var leverPos = 0; // 0 to 1
    var draggingLever = false;

    function updateCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      mousePos.x = (clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (clientY - rect.top) * (canvas.height / rect.height);
    }

    function onDown(e) {
      updateCoords(e);
      if (finished) return;

      // Click Shield Node
      nodes.forEach(function (node) {
        if (!node.aligned && Math.hypot(mousePos.x - node.x, mousePos.y - node.y) < 28) {
          node.aligned = true;
          shockwaves.push({ x: node.x, y: node.y, r: 10, alpha: 1.0 });
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        }
      });

      // Lever Check
      var allAligned = nodes.every(function (n) { return n.aligned; });
      if (allAligned && Math.abs(mousePos.x - 440) < 30 && Math.abs(mousePos.y - (90 + leverPos * 180)) < 30) {
        draggingLever = true;
      }
    }

    function onMove(e) {
      updateCoords(e);
      if (draggingLever) {
        leverPos = Math.max(0, Math.min(1, (mousePos.y - 90) / 180));
      }
    }

    function onUp() {
      if (draggingLever && leverPos < 0.9) {
        leverPos = 0;
      }
      draggingLever = false;
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', function (e) { if (draggingLever) e.preventDefault(); onMove(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };

    function loop() {
      ctx.fillStyle = '#151722';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      var allAligned = nodes.every(function (n) { return n.aligned; });
      if (!allAligned) {
        ctx.fillText('CLICK DISALIGNED RED NODES TO TUNE DEFLECTOR FREQUENCY', canvas.width / 2, 40);
      } else if (leverPos < 0.95) {
        ctx.fillText('PULL HIGH-VOLTAGE CAPACITOR LEVER TO 100%!', canvas.width / 2, 40);
      }

      // Draw Honeycomb Links
      ctx.strokeStyle = allAligned ? '#38fedc' : '#394154';
      ctx.lineWidth = 3;
      for (var j = 1; j < nodes.length; j++) {
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }

      // Draw Nodes
      nodes.forEach(function (node) {
        ctx.fillStyle = node.aligned ? '#38fedc' : '#e53e3e';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(node.aligned ? 'OK' : 'ERR', node.x, node.y + 4);
      });

      // Draw Shockwaves
      for (var s = shockwaves.length - 1; s >= 0; s--) {
        var sw = shockwaves[s];
        sw.r += 2.5;
        sw.alpha -= 0.05;
        ctx.strokeStyle = 'rgba(56, 254, 220, ' + sw.alpha + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        if (sw.alpha <= 0) shockwaves.splice(s, 1);
      }

      // Right Side: Master Capacitor Lever (440, 90 to 270)
      ctx.fillStyle = '#1a202c';
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 3;
      ctx.fillRect(425, 80, 30, 200);
      ctx.strokeRect(425, 80, 30, 200);

      // Track groove
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(440, 95); ctx.lineTo(440, 265);
      ctx.stroke();

      // Lever Knob
      var knobY = 95 + leverPos * 170;
      ctx.fillStyle = '#f6e05e';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(415, knobY - 14, 50, 28, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(Math.floor(leverPos * 100) + '%', 440, knobY + 4);

      // Completion Check
      if (leverPos >= 0.95 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('🛡️ DEFLECTORS PRIMED! (+22% HULL)', canvas.width / 2, 190);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 9: THRUSTER GIMBAL ALIGNMENT (LOWER ENGINE)
  // ==========================================
  function runEngineAlignGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var mousePos = { x: 0, y: 0 };
    var finished = false;

    var currentAngle = -15; // Target is +8°
    var targetAngle = 8;
    var fuelMix = 20; // Target is 45-55%
    var lockTimer = 0; // needs 1.0 second

    var draggingSlider = null; // 'angle' | 'mix'

    function updateCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      mousePos.x = (clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (clientY - rect.top) * (canvas.height / rect.height);
    }

    function onDown(e) {
      updateCoords(e);
      if (finished) return;
      // Angle Slider (70 to 330, y: 325)
      if (mousePos.y >= 305 && mousePos.y <= 345 && mousePos.x >= 60 && mousePos.x <= 340) {
        draggingSlider = 'angle';
      }
      // Mix Slider (440, y: 70 to 270)
      if (mousePos.x >= 415 && mousePos.x <= 465 && mousePos.y >= 60 && mousePos.y <= 280) {
        draggingSlider = 'mix';
      }
    }

    function onMove(e) {
      updateCoords(e);
      if (draggingSlider === 'angle') {
        var ratio = Math.max(0, Math.min(1, (mousePos.x - 70) / 260));
        currentAngle = -30 + ratio * 60; // -30° to +30°
      } else if (draggingSlider === 'mix') {
        var ratioMix = Math.max(0, Math.min(1, 1 - (mousePos.y - 70) / 200));
        fuelMix = ratioMix * 100;
      }
    }

    function onUp() {
      draggingSlider = null;
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', function (e) { if (draggingSlider) e.preventDefault(); onMove(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };

    function loop() {
      ctx.fillStyle = '#10131d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ALIGN NOZZLE TO GREEN TARGET (±3°) & FUEL MIX TO GREEN ZONE', canvas.width / 2, 35);

      // Center Gimbal Viewport
      var cx = 200;
      var cy = 160;

      // Target Vector
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((targetAngle * Math.PI) / 180);
      ctx.strokeStyle = '#50ef39';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(130, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Rotating Nozzle & Flame
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((currentAngle * Math.PI) / 180);

      // Rocket Nozzle Cone
      ctx.fillStyle = '#4a5568';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-40, -25); ctx.lineTo(20, -15); ctx.lineTo(20, 15); ctx.lineTo(-40, 25);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Exhaust Flame
      var flameLen = 60 + Math.random() * 20;
      var isOptimal = Math.abs(currentAngle - targetAngle) <= 3 && (fuelMix >= 45 && fuelMix <= 55);
      ctx.fillStyle = isOptimal ? '#38fedc' : '#ed8936';
      ctx.beginPath();
      ctx.moveTo(20, -12);
      ctx.quadraticCurveTo(20 + flameLen, 0, 20, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Angle Slider at Bottom (70 to 330, y: 325)
      ctx.fillStyle = '#1a202c';
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 3;
      ctx.strokeRect(70, 315, 260, 20);
      ctx.fillRect(70, 315, 260, 20);

      var knobX = 70 + ((currentAngle + 30) / 60) * 260;
      ctx.fillStyle = Math.abs(currentAngle - targetAngle) <= 3 ? '#50ef39' : '#e2e8f0';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(knobX - 12, 307, 24, 36, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('GIMBAL ANGLE: ' + Math.round(currentAngle) + '° (TARGET: ' + targetAngle + '°)', 200, 362);

      // Right Side: Fuel Mixture Slider (440, 70 to 270)
      ctx.fillStyle = '#1a202c';
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 3;
      ctx.strokeRect(425, 70, 30, 200);
      ctx.fillRect(425, 70, 30, 200);

      // Optimal Green Zone (45% to 55%)
      ctx.fillStyle = 'rgba(80, 239, 57, 0.4)';
      ctx.fillRect(427, 70 + (1 - 0.55) * 200, 26, 0.10 * 200);

      var mixKnobY = 70 + (1 - fuelMix / 100) * 200;
      ctx.fillStyle = (fuelMix >= 45 && fuelMix <= 55) ? '#50ef39' : '#f6ad55';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(415, mixKnobY - 10, 50, 20, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('MIX: ' + Math.round(fuelMix) + '%', 440, 290);

      // Hold Calibration Check
      if (isOptimal) {
        lockTimer += 0.016;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('HOLDING LOCK: ' + Math.min(1.0, lockTimer).toFixed(1) + 's / 1.0s', cx, cy - 80);
      } else {
        lockTimer = Math.max(0, lockTimer - 0.03);
      }

      if (lockTimer >= 1.0 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('🚀 THRUST VECTOR OPTIMAL! (+10% PROG, +6% FUEL)', canvas.width / 2, cy);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  // ==========================================
  // MINI-GAME 10: CREW BIO-HEALTH SCAN (MEDBAY LAB)
  // ==========================================
  function runMedbayScanGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var mousePos = { x: 0, y: 0 };
    var finished = false;

    var anomalies = [
      { x: 270, y: 155, r: 16, cleared: false },
      { x: 220, y: 195, r: 16, cleared: false },
      { x: 290, y: 225, r: 16, cleared: false },
      { x: 250, y: 265, r: 16, cleared: false }
    ];

    var laserX = 170;
    var laserDir = 1;
    var ecgPhase = 0;
    var particles = [];

    function updateCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var clientX = e.clientX;
      var clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      mousePos.x = (clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (clientY - rect.top) * (canvas.height / rect.height);
    }

    function onDown(e) {
      updateCoords(e);
      if (finished) return;
      anomalies.forEach(function (ano) {
        if (!ano.cleared && Math.hypot(mousePos.x - ano.x, mousePos.y - ano.y) < ano.r + 12) {
          ano.cleared = true;
          for (var p = 0; p < 16; p++) {
            particles.push({
              x: ano.x, y: ano.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 30,
              size: 4 + Math.random() * 4
            });
          }
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.5);
        }
      });
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('touchstart', onDown);
    };

    function loop() {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top ECG Heartbeat Graph
      ecgPhase += 0.08;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var ex = 60; ex <= 480; ex += 4) {
        var ey = 60 + Math.sin(ex * 0.08 + ecgPhase) * 6;
        if ((ex + Math.floor(ecgPhase * 20)) % 100 < 12) {
          ey -= 22; // heart beat pulse
        }
        if (ex === 60) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.stroke();

      // Vital Readout
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      var clearedCount = anomalies.filter(function (a) { return a.cleared; }).length;
      ctx.fillText('PULSE: 72 BPM | O2 SAT: 99% | RADIATION ANOMALIES PURGED: ' + clearedCount + '/4', canvas.width / 2, 30);

      // Bio Bed Frame
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38fedc';
      ctx.lineWidth = 3;
      ctx.strokeRect(160, 100, 220, 230);
      ctx.fillRect(160, 100, 220, 230);

      // Authentic Among Us Crewmate Silhouette (X-Ray View)
      // Body
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(210, 130, 110, 170, 40);
      ctx.fill(); ctx.stroke();

      // Backpack
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(185, 160, 25, 110);
      ctx.strokeRect(185, 160, 25, 110);

      // Visor
      ctx.fillStyle = '#38fedc';
      ctx.beginPath();
      ctx.roundRect(250, 150, 65, 42, 16);
      ctx.fill(); ctx.stroke();

      // Central Bone
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(255, 205, 16, 45);
      ctx.beginPath(); ctx.arc(255, 205, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(271, 205, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(255, 250, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(271, 250, 10, 0, Math.PI * 2); ctx.fill();

      // Sweeping Laser Beam
      laserX += laserDir * 2.5;
      if (laserX < 170 || laserX > 370) laserDir *= -1;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(laserX, 100); ctx.lineTo(laserX, 330);
      ctx.stroke();

      // Draw Anomalies
      anomalies.forEach(function (ano) {
        if (!ano.cleared) {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ano.x, ano.y, ano.r, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('☣', ano.x, ano.y + 4);
        }
      });

      // Draw Green Healing Cross Particles
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('+', pt.x, pt.y);
        if (pt.life <= 0) particles.splice(p, 1);
      }

      // Check Completion
      if (clearedCount === 4 && !finished) {
        finished = true;
        if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit', 0.6);
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('🩺 CREW SCAN CLEAR! (+15% O2, +25 SCIENCE)', canvas.width / 2, 210);
        setTimeout(onComplete, 850);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }

  function buildTask(taskId) {
    var canvas = shell(taskId);
    if (!canvas) return;
    if (taskId === 'o2_filter') runGreenhouseGame(canvas, finish);
    else if (taskId === 'water_recycle') runWaterRecycleGame(canvas, finish);
    else if (taskId === 'co2_scrubber') runCo2ScrubberGame(canvas, finish);
    else if (taskId === 'fuel_synth') runFuelSynthGame(canvas, finish);
    else if (taskId === 'wires') runWiresGame(canvas, finish);
    else if (taskId === 'cargo') runHullWelderGame(canvas, finish);
    else if (taskId === 'science') runCommsDishGame(canvas, finish);
    else if (taskId === 'nav') runRadarLockGame(canvas, finish);
    else if (taskId === 'cheese_grill') runCheeseGrillGame(canvas, finish);
    else if (taskId === 'reactor_cool') runReactorCoolGame(canvas, finish);
    else if (taskId === 'shields_prime') runShieldsPrimeGame(canvas, finish);
    else if (taskId === 'engine_align') runEngineAlignGame(canvas, finish);
    else if (taskId === 'medbay_scan') runMedbayScanGame(canvas, finish);
  }

  function onKeyDown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function init() {
    cache();
    if (els.close) els.close.addEventListener('click', close);
    window.addEventListener('keydown', onKeyDown);
    if (RTM.Net) {
      RTM.Net.on('meeting:started', close);
      RTM.Net.on('game:ended', close);
      RTM.Net.on('room:left', close);
      RTM.Net.on('player:killed', function (data) {
        if (data && data.playerId === RTM.Net.playerId) close();
      });
    }
  }

  return {
    init: init,
    open: openTask,
    close: close,
    isOpen: function () { return open; },
    currentTask: function () { return currentTask; }
  };
})();
