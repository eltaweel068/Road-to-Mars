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
      '<div class="task-stage"><canvas id="taskCanvas" width="540" height="380" style="display:block; margin:0 auto; max-width:100%; max-height:100%; box-sizing:border-box; border-radius:12px; border:3px solid #000; box-shadow:0 8px 24px rgba(0,0,0,0.6); background:#111;"></canvas></div>',
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
      { x: 75,  waterLevel: 0, bloomed: false, label: 'Alocasia Mars-1' },
      { x: 185, waterLevel: 0, bloomed: false, label: 'Spirulina Moss' },
      { x: 295, waterLevel: 0, bloomed: false, label: 'Martian Bamboo' },
      { x: 405, waterLevel: 0, bloomed: false, label: 'O2 Fern Sprout' }
    ];

    var waterDrops = [];
    var bubbles = [];
    var isPouring = false;
    var mousePos = { x: 270, y: 70 };
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
      ctx.fillStyle = '#101c15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Greenhouse ceiling and UV grow-lights
      ctx.fillStyle = '#1b2f22';
      ctx.fillRect(0, 0, canvas.width, 28);
      ctx.fillStyle = '#ff3388';
      for (var l = 40; l < canvas.width; l += 70) {
        ctx.fillRect(l, 8, 36, 6);
        ctx.fillStyle = 'rgba(255, 51, 136, 0.12)';
        ctx.beginPath();
        ctx.moveTo(l, 14);
        ctx.lineTo(l - 20, 290);
        ctx.lineTo(l + 56, 290);
        ctx.lineTo(l + 36, 14);
        ctx.fill();
        ctx.fillStyle = '#ff3388';
      }

      // Water droplets from hose nozzle
      if (isPouring) {
        for (var i = 0; i < 4; i++) {
          waterDrops.push({
            x: mousePos.x + (Math.random() - 0.5) * 14,
            y: mousePos.y + 12,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 7 + Math.random() * 5
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

        plants.forEach(function (plant) {
          if (Math.abs(drop.x - (plant.x + 30)) < 32 && drop.y >= 270 && drop.y <= 325) {
            plant.waterLevel = Math.min(100, plant.waterLevel + 0.9);
            if (plant.waterLevel >= 100 && !plant.bloomed) {
              plant.bloomed = true;
              for (var b = 0; b < 6; b++) {
                bubbles.push({
                  x: plant.x + 30 + (Math.random() - 0.5) * 20,
                  y: 200,
                  vy: -1.2 - Math.random() * 1.8,
                  r: 4 + Math.random() * 5
                });
              }
              if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockondone', 0.4);
            }
          }
        });

        if (drop.y > canvas.height - 20) waterDrops.splice(d, 1);
      }

      // Update O2 rising bubbles
      ctx.strokeStyle = '#38fedc';
      ctx.lineWidth = 1.5;
      for (var bi = bubbles.length - 1; bi >= 0; bi--) {
        var bubble = bubbles[bi];
        bubble.y += bubble.vy;
        bubble.x += Math.sin(Date.now() * 0.005 + bi) * 0.5;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
        ctx.stroke();
        if (bubble.y < 35) bubbles.splice(bi, 1);
      }

      // Draw Pots & Botanicals
      var allBloomed = true;
      plants.forEach(function (plant) {
        if (!plant.bloomed) allBloomed = false;

        // Planter pot
        ctx.fillStyle = '#7a4e2d';
        ctx.fillRect(plant.x, 285, 60, 55);
        ctx.fillStyle = '#56351d';
        ctx.fillRect(plant.x - 4, 280, 68, 8);

        // Water level gauge
        ctx.fillStyle = '#1e2420';
        ctx.fillRect(plant.x + 6, 322, 48, 8);
        ctx.fillStyle = plant.bloomed ? '#50ef39' : '#38fedc';
        ctx.fillRect(plant.x + 6, 322, 48 * (plant.waterLevel / 100), 8);

        // Stem growth
        var growth = plant.waterLevel / 100;
        var stemHeight = growth * 105;
        ctx.strokeStyle = plant.bloomed ? '#50ef39' : '#998844';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(plant.x + 30, 280);
        ctx.lineTo(plant.x + 30, 280 - stemHeight);
        ctx.stroke();

        // Lush leaves
        if (growth > 0.25) {
          ctx.fillStyle = plant.bloomed ? '#35c422' : '#776633';
          ctx.beginPath();
          ctx.ellipse(plant.x + 14, 280 - stemHeight * 0.6, 14 * growth, 7 * growth, -0.4, 0, Math.PI * 2);
          ctx.ellipse(plant.x + 46, 280 - stemHeight * 0.7, 14 * growth, 7 * growth, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bloom flower
        if (plant.bloomed) {
          ctx.fillStyle = '#ff44aa';
          ctx.beginPath();
          ctx.arc(plant.x + 30, 280 - stemHeight - 4, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffff55';
          ctx.beginPath();
          ctx.arc(plant.x + 30, 280 - stemHeight - 4, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pot Label
        ctx.fillStyle = '#8899aa';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(plant.label, plant.x + 30, 354);
      });

      // Watering Hose Nozzle at Mouse
      ctx.fillStyle = '#445566';
      ctx.fillRect(mousePos.x - 18, mousePos.y - 12, 36, 22);
      ctx.fillStyle = '#38fedc';
      ctx.fillRect(mousePos.x - 6, mousePos.y + 10, 12, 6);

      // HUD Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD CLICK & WATER WILTING POTS UNTIL FULLY BLOOMED', canvas.width / 2, 50);

      if (allBloomed && !finished) {
        finished = true;
        ctx.fillStyle = '#50ef39';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🌱 GREENHOUSE RESTORED! (+20% O2)', canvas.width / 2, 170);
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
