window.RTM = window.RTM || {};
window.RTM.Tasks = (function () {
  'use strict';

  var TASKS = {
    wires: { title: 'ELECTRICAL WIRING', eyebrow: 'ELECTRICAL', instruction: 'Drag colored cables to matching sockets. Watch out for sparks!' },
    o2_filter: { title: 'GREENHOUSE HYDROPONICS', eyebrow: 'LIFE SUPPORT', instruction: 'Hold left click to pour water and nurture alien plants until they bloom!' },
    nav: { title: 'RADAR ASTEROID LOCK', eyebrow: 'NAVIGATION', instruction: 'Click 3 detected orbital targets on the sweeping radar screen.' },
    cargo: { title: 'HULL BREACH PLASMA WELD', eyebrow: 'STORAGE & HULL', instruction: 'Drag the plasma torch across the breach seam to weld it airtight!' },
    science: { title: 'DEEP SPACE DISH ALIGNMENT', eyebrow: 'SCIENCE LAB & COMMS', instruction: 'Rotate the satellite dish antenna toward the DSN carrier signal.' }
  };

  var TASK_REWARDS = {
    wires: '⚡ POWER RESTORED: +15% FUEL & POWER!',
    o2_filter: '🌱 GREENHOUSE THRIVING: +20% OXYGEN!',
    nav: '🧭 VECTOR LOCKED: +5% MARS PROGRESS!',
    cargo: '🛡️ HULL WELDED: +20% HULL INTEGRITY & -15 KG MASS!',
    science: '📡 DSN LINK ESTABLISHED: +30 SCIENCE DATA!'
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
    if (!TASKS[taskId] || !RTM.Net || !els.overlay || !els.content) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || !RTM.Net.isAlive()) return;
    if (open) close();
    currentTask = taskId;
    completed = false;
    open = true;
    els.overlay.style.display = 'flex';
    document.body.classList.add('task-open');
    cleanupState();
    buildTask(taskId);
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
      '<div class="task-stage"><canvas id="taskCanvas" width="540" height="380" style="display:block; margin:0 auto; border-radius:12px; border:3px solid #000; box-shadow:0 8px 24px rgba(0,0,0,0.6); background:#111;"></canvas></div>',
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

  // ==========================================
  // MINI-GAME 1: GREENHOUSE HYDROPONICS (O2)
  // ==========================================
  function runGreenhouseGame(canvas, onComplete) {
    var ctx = canvas.getContext('2d');
    var animId = null;
    var plants = [
      { x: 70,  waterLevel: 0, bloomed: false, label: 'Alocasia-X' },
      { x: 180, waterLevel: 0, bloomed: false, label: 'Fern-Mars' },
      { x: 290, waterLevel: 0, bloomed: false, label: 'Chlorophytum' },
      { x: 400, waterLevel: 0, bloomed: false, label: 'Sprout-V' }
    ];

    var waterDrops = [];
    var isPouring = false;
    var mousePos = { x: 270, y: 80 };
    var finished = false;

    function updateMouse(e) {
      var rect = canvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseDown(e) {
      isPouring = true;
      updateMouse(e);
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
      ctx.fillStyle = '#18241d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Greenhouse ceiling and grow-lights
      ctx.fillStyle = '#223828';
      ctx.fillRect(0, 0, canvas.width, 24);
      ctx.fillStyle = '#ff5599';
      for (var l = 50; l < canvas.width; l += 80) {
        ctx.fillRect(l, 8, 40, 6);
      }

      // Water droplets
      if (isPouring) {
        for (var i = 0; i < 3; i++) {
          waterDrops.push({
            x: mousePos.x + (Math.random() - 0.5) * 16,
            y: mousePos.y + 15,
            vy: 6 + Math.random() * 4
          });
        }
      }

      ctx.fillStyle = '#38fedc';
      for (var d = waterDrops.length - 1; d >= 0; d--) {
        var drop = waterDrops[d];
        drop.y += drop.vy;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        plants.forEach(function (plant) {
          if (Math.abs(drop.x - plant.x - 30) < 35 && drop.y >= 280 && drop.y <= 330) {
            plant.waterLevel = Math.min(100, plant.waterLevel + 1.2);
            if (plant.waterLevel >= 100) plant.bloomed = true;
          }
        });

        if (drop.y > canvas.height) waterDrops.splice(d, 1);
      }

      // Draw 4 Plant Pots & Plants
      var allBloomed = true;
      plants.forEach(function (plant) {
        if (!plant.bloomed) allBloomed = false;

        // Pot
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(plant.x, 290, 60, 50);
        ctx.fillStyle = '#653b1b';
        ctx.fillRect(plant.x - 4, 286, 68, 8);

        // Water gauge on pot
        ctx.fillStyle = '#333333';
        ctx.fillRect(plant.x + 8, 324, 44, 8);
        ctx.fillStyle = plant.bloomed ? '#50ef39' : '#38fedc';
        ctx.fillRect(plant.x + 8, 324, 44 * (plant.waterLevel / 100), 8);

        // Growth stem & leaves
        var growth = plant.waterLevel / 100;
        var plantColor = plant.bloomed ? '#50ef39' : '#887744';
        ctx.strokeStyle = plantColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(plant.x + 30, 290);
        ctx.lineTo(plant.x + 30, 290 - growth * 95);
        ctx.stroke();

        if (growth > 0.25) {
          ctx.fillStyle = plantColor;
          ctx.beginPath();
          ctx.ellipse(plant.x + 15, 290 - growth * 60, 14 * growth, 7 * growth, -0.5, 0, Math.PI * 2);
          ctx.ellipse(plant.x + 45, 290 - growth * 70, 14 * growth, 7 * growth, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (plant.bloomed) {
          // Flower bloom
          ctx.fillStyle = '#ff44aa';
          ctx.beginPath();
          ctx.arc(plant.x + 30, 290 - 100, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffff55';
          ctx.beginPath();
          ctx.arc(plant.x + 30, 290 - 100, 4, 0, Math.PI * 2);
          ctx.fill();

          // Oxygen bubble
          ctx.strokeStyle = '#38fedc';
          ctx.lineWidth = 2;
          var bubbleY = 290 - 120 - ((Date.now() * 0.05 + plant.x * 2) % 60);
          ctx.beginPath();
          ctx.arc(plant.x + 30, bubbleY, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Watering Can Head
      ctx.fillStyle = '#556677';
      ctx.fillRect(mousePos.x - 22, mousePos.y - 12, 44, 24);
      ctx.fillStyle = '#8899aa';
      ctx.fillRect(mousePos.x + 10, mousePos.y + 4, 16, 8);

      if (allBloomed && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🌱 GREENHOUSE THRIVING! (+20% O2)', canvas.width / 2, 60);
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

    // Permute right terminals
    var perm = [1, 3, 0, 2];
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
        if (Math.hypot(mousePos.x - 50, mousePos.y - term.y) < 28 && term.connected === -1) {
          draggingWire = idx;
        }
      });
    }

    function onMouseUp() {
      if (draggingWire !== -1) {
        var targetCol = leftTerminals[draggingWire].color;
        rightTerminals.forEach(function (rTerm, rIdx) {
          if (rTerm.color === targetCol && Math.hypot(mousePos.x - 490, mousePos.y - rTerm.y) < 32) {
            leftTerminals[draggingWire].connected = rIdx;
            for (var s = 0; s < 18; s++) {
              sparks.push({
                x: 490, y: rTerm.y,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                life: 22
              });
            }
            if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit');
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
      ctx.fillStyle = '#22252e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Terminal panels
      ctx.fillStyle = '#171920';
      ctx.fillRect(20, 40, 60, 300);
      ctx.fillRect(460, 40, 60, 300);

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

      // Wires
      var connectedCount = 0;
      leftTerminals.forEach(function (term, idx) {
        if (term.connected !== -1) {
          connectedCount++;
          var rY = rightTerminals[term.connected].y;
          ctx.strokeStyle = term.color;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(50, term.y);
          ctx.bezierCurveTo(200, term.y + 40, 340, rY + 40, 490, rY);
          ctx.stroke();
        } else if (draggingWire === idx) {
          ctx.strokeStyle = term.color;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(50, term.y);
          ctx.bezierCurveTo(150, term.y + 20, mousePos.x - 50, mousePos.y + 20, mousePos.x, mousePos.y);
          ctx.stroke();
        }
      });

      // Sparks
      for (var sp = sparks.length - 1; sp >= 0; sp--) {
        var spark = sparks[sp];
        spark.x += spark.vx; spark.y += spark.vy; spark.life--;
        ctx.fillStyle = '#f5f557';
        ctx.fillRect(spark.x, spark.y, 3, 3);
        if (spark.life <= 0) sparks.splice(sp, 1);
      }

      if (connectedCount === 4 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ POWER BUS RESTORED! (+15% FUEL)', canvas.width / 2, 350);
        setTimeout(onComplete, 800);
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
    for (var x = 80; x <= 460; x += 15) {
      crackPoints.push({
        x: x,
        y: 190 + Math.sin(x * 0.05) * 25 + (Math.random() - 0.5) * 10,
        welded: false
      });
    }

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
      isWelding = true;
      updateTorch(e);
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
      ctx.fillStyle = '#1c1e28';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Titanium bulkhead plates
      ctx.strokeStyle = '#2b2f3e';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 30, 460, 320);

      // Unwelded crack
      ctx.strokeStyle = '#ef7d0d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      crackPoints.forEach(function (pt, idx) {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Check weld near torch
      var weldedCount = 0;
      crackPoints.forEach(function (pt) {
        if (isWelding && Math.hypot(torchPos.x - pt.x, torchPos.y - pt.y) < 25) {
          pt.welded = true;
          sparks.push({
            x: pt.x, y: pt.y,
            vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
            color: Math.random() > 0.5 ? '#38fedc' : '#ffffff',
            life: 15
          });
        }
        if (pt.welded) weldedCount++;
      });

      // Welded silver bead
      ctx.strokeStyle = '#d6e0f0';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 8;
      crackPoints.forEach(function (pt) {
        if (pt.welded) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Sparks
      for (var sp = sparks.length - 1; sp >= 0; sp--) {
        var s = sparks[sp];
        s.x += s.vx; s.y += s.vy; s.life--;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 3, 3);
        if (s.life <= 0) sparks.splice(sp, 1);
      }

      // Plasma Torch Tip
      ctx.fillStyle = isWelding ? '#38fedc' : '#778899';
      ctx.beginPath();
      ctx.arc(torchPos.x, torchPos.y, 9, 0, Math.PI * 2);
      ctx.fill();
      if (isWelding) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(torchPos.x, torchPos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      var progress = weldedCount / crackPoints.length;
      if (progress >= 0.95 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ HULL INTEGRITY RESTORED! (+20% HULL)', canvas.width / 2, 50);
        setTimeout(onComplete, 800);
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
    var targetAngle = Math.PI * 0.75;
    var currentAngle = Math.PI * 0.2;
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
      var signalStrength = Math.max(0, 1 - diff / (Math.PI * 0.5));

      // Signal Strength Bar
      ctx.fillStyle = '#333344';
      ctx.fillRect(100, 40, 340, 24);
      ctx.fillStyle = signalStrength > 0.92 ? '#50ef39' : '#f5f557';
      ctx.fillRect(100, 40, 340 * signalStrength, 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SIGNAL LOCK: ' + Math.round(signalStrength * 100) + '%', canvas.width / 2, 58);

      // Dish Base & Pedestal
      ctx.fillStyle = '#445566';
      ctx.fillRect(250, 220, 40, 80);
      ctx.fillStyle = '#223344';
      ctx.fillRect(230, 290, 80, 20);

      // Rotating Dish Arc
      ctx.save();
      ctx.translate(270, 220);
      ctx.rotate(currentAngle);

      ctx.strokeStyle = '#d6e0f0';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 80, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      // Antenna feed horn
      ctx.strokeStyle = '#ef7d0d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(55, 0);
      ctx.stroke();
      ctx.restore();

      if (signalStrength > 0.95 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('📡 DSN LINK ESTABLISHED! (+30 SCIENCE)', canvas.width / 2, 350);
        setTimeout(onComplete, 800);
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
      { x: 190, y: 150, locked: false },
      { x: 340, y: 170, locked: false },
      { x: 260, y: 280, locked: false }
    ];
    var finished = false;

    function onClick(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      var my = (e.clientY - rect.top) * (canvas.height / rect.height);

      targets.forEach(function (t) {
        if (Math.hypot(mx - t.x, my - t.y) < 25) {
          t.locked = true;
          if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('hit');
        }
      });
    }

    canvas.addEventListener('click', onClick);

    stateCleanup = function () {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('click', onClick);
    };

    function loop() {
      ctx.fillStyle = '#06180c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radar Circular Grid
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 2;
      [50, 100, 150].forEach(function (r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 160, cy); ctx.lineTo(cx + 160, cy);
      ctx.moveTo(cx, cy - 160); ctx.lineTo(cx, cy + 160);
      ctx.stroke();

      // Sweeper Beam
      radarAngle += 0.04;
      ctx.strokeStyle = '#50ef39';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(radarAngle) * 165, cy + Math.sin(radarAngle) * 165);
      ctx.stroke();

      // Targets
      var lockedCount = 0;
      targets.forEach(function (t) {
        ctx.fillStyle = t.locked ? '#50ef39' : '#f5f557';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.locked ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();

        if (t.locked) {
          lockedCount++;
          ctx.strokeStyle = '#50ef39';
          ctx.lineWidth = 2;
          ctx.strokeRect(t.x - 14, t.y - 14, 28, 28);
        }
      });

      if (lockedCount === 3 && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🧭 VECTOR LOCKED! (+5% PROGRESS)', canvas.width / 2, 40);
        setTimeout(onComplete, 800);
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
    else if (taskId === 'wires') runWiresGame(canvas, finish);
    else if (taskId === 'cargo') runHullWelderGame(canvas, finish);
    else if (taskId === 'science') runCommsDishGame(canvas, finish);
    else if (taskId === 'nav') runRadarLockGame(canvas, finish);
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
