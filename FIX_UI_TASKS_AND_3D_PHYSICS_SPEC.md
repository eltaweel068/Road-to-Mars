# Road to Mars — Engineering Specification: UI, Interactive Tasks & 3D Physics Overhaul
**Document Version:** 1.0.0  
**Target Codebase:** `Road to Mars/` (`server.js`, `public/index.html`, `public/css/style.css`, `public/js/`)  
**Status:** READY FOR SEQUENTIAL IMPLEMENTATION  
**Mandate:** Provide exact, copy-paste-ready code blocks and targeted surgical edits. No placeholder stubs.

---

## TABLE OF CONTENTS
1. [Overview & Architecture Guidelines](#1-overview--architecture-guidelines)
2. [Section 1: Task Trigger Fix & 5 Tactile Mini-Games](#2-section-1-task-trigger-fix--5-tactile-mini-games)
   - 1.1 `public/js/tasks.js` — ID Normalization Fix
   - 1.2 `public/js/ship.js` — Station Parameter & Floating Interaction Prompt
   - 1.3 `public/js/renderer.js` — Persistent Task Waypoints & Floating Prompt Rendering
   - 1.4 `public/js/tasks.js` — Complete 5 Tactile Interactive Mini-Games
3. [Section 2: 3D Vector Laser Ballistics & Asteroid Fracture Physics](#3-section-2-3d-vector-laser-ballistics--asteroid-fracture-physics)
   - 2.1 Audio Assets & `public/js/audio.js`
   - 2.2 `public/js/cockpit.js` — Wingtip Laser Ballistics & Rapid-Fire
   - 2.3 `public/js/cockpit.js` — Multi-Stage 3D Asteroid Fracture & Continuous Spawning
   - 2.4 NASA Asteroid Metadata & Scientific Reward Scoring
4. [Section 3: Lobby UI Layout & Visual Upgrades](#4-section-3-lobby-ui-layout--visual-upgrades)
   - 3.1 `public/css/style.css` — Un-cramp Hangar Panel & 72px Preview Grid
   - 3.2 `public/index.html` — Duplicate Mass Bar Removal & Quick-Join Header Integration
5. [Section 4: Verification & Smoke Testing Protocol](#5-section-4-verification--smoke-testing-protocol)

---

## 1. Overview & Architecture Guidelines

This specification resolves three critical gameplay and presentation issues in **Road to Mars**:
1. **Broken Task Activation & Placeholder Mini-games**: Fixes the object-vs-string parameter mismatch preventing tasks from opening when interacting with stations, adds floating canvas prompts near stations, enables permanent navigation waypoints to all stations, and replaces basic placeholder tasks with 5 rich, tactile mini-games with animated canvas physics.
2. **3D Combat & Space Flight Physics**: Replaces the static z-axis laser logic with true 3D vector ballistics fired from dual wingtip muzzles matching ship orientation, enables rapid-fire holding (`Spacebar` / `Left Mouse`), unifies all visible space rocks into a shootable physics pipeline, and adds multi-stage rock fracture (HP=2, orange impact flash, shockwave torus ring, tumbling sub-fragments, and scientific rewards).
3. **Cramped Lobby UI**: Expands `.hangar-panel` to widescreen dimensions, upgrades rocket/payload preview cards to 72x72px with glow effects, and eliminates the redundant mass budget bar.

All edits must be applied sequentially to preserve vanilla ES6/Browser compatibility with no external bundler dependencies.

---

## 2. Section 1: Task Trigger Fix & 5 Tactile Mini-Games

### 1.1 `public/js/tasks.js` — ID Normalization Fix
In `public/js/tasks.js`, `openTask(taskId)` is currently checking `if (!TASKS[taskId]) return;`. Because `renderer.js` returns an object `{ id: 'wires', x: 850, y: 1350, room: 'Electrical' }`, passing this object directly causes `TASKS[taskId]` to evaluate to `undefined` and silently fail.

#### Exact Replacement in `public/js/tasks.js`:
Locate lines 34–46 in `public/js/tasks.js` and replace `openTask`:

```javascript
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
```

---

### 1.2 `public/js/ship.js` — Station Parameter & Action Wiring
In `public/js/ship.js`, `useAction()` must pass `station.id || station` and ensure both pressing `E` / `Spacebar` and clicking `#btnUse` immediately trigger the mini-game.

#### Exact Replacement in `public/js/ship.js`:
Locate lines 288–311 in `public/js/ship.js` and replace `useAction`:

```javascript
  function useAction() {
    if (!active || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || gameState.scene !== 'ship') return;
    var player = localPlayer();
    if (!player || !player.alive) return;

    var station = RTM.Renderer.getTaskStationAt(localX, localY);
    if (station) {
      if (RTM.Tasks && RTM.Tasks.open) {
        RTM.Tasks.open(station.id || station);
      }
      return;
    }

    if (RTM.Renderer.isNearEmergencyButton(localX, localY)) {
      callMeeting();
      return;
    }

    if (RTM.Renderer.isNearPilotChair(localX, localY)) {
      if (RTM.Net.isPilot()) {
        if (RTM.Cockpit && RTM.Cockpit.show) RTM.Cockpit.show();
      } else {
        RTM.Net.emit('pilot:seat:claim');
      }
    }
  }
```

---

### 1.3 `public/js/renderer.js` — Persistent Waypoints & Floating Prompts

#### A. Persistent Waypoints to All 5 Stations
In `public/js/renderer.js`, replace `getActiveObjectives` (lines 1175–1235) so that waypoints are ALWAYS visible to guide astronauts across the 10-room ship, prioritizing emergencies when resources are low:

```javascript
  function getActiveObjectives(gameState) {
    var objectives = [];
    var telemetry = (gameState && (gameState.telemetry || gameState.resources)) || {};
    var o2 = Number(telemetry.o2 != null ? telemetry.o2 : 100);
    var fuel = Number(telemetry.fuel != null ? telemetry.fuel : 100);
    var hull = Number(telemetry.hull != null ? telemetry.hull : 100);

    // 1. Critical System Emergencies (Priority 10)
    if (o2 < 35 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'o2')) {
      objectives.push({
        id: 'o2_emergency',
        x: 2250, y: 450,
        label: 'EMERGENCY: WATER PLANTS IN GREENHOUSE (O2 LOW!)',
        color: '#38fedc',
        priority: 10
      });
    }

    if (telemetry.autopilot === false) {
      objectives.push({
        id: 'pilot_cockpit',
        x: 2850, y: 950,
        label: 'ASTEROID ALERT: TAKE PILOT SEAT (COCKPIT)',
        color: '#f5f557',
        priority: 10
      });
    }

    if (fuel < 30 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'fuel')) {
      objectives.push({
        id: 'electrical_wires',
        x: 850, y: 1350,
        label: 'POWER ALERT: REPAIR WIRES IN ELECTRICAL',
        color: '#ef7d0d',
        priority: 9
      });
    }

    if (hull < 40 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'hull')) {
      objectives.push({
        id: 'hull_repair',
        x: 1500, y: 1450,
        label: 'HULL BREACH: PLASMA WELD BULKHEAD IN STORAGE',
        color: '#c51111',
        priority: 9
      });
    }

    // 2. Persistent Routine Ship Maintenance Waypoints (Priority 5)
    // Always active so astronauts always have guided tasks to complete
    if (o2 >= 35) {
      objectives.push({
        id: 'o2_routine',
        x: 2250, y: 450,
        label: 'GREENHOUSE: WATER PLANTS (+20% O2)',
        color: '#38fedc',
        priority: 5
      });
    }

    if (fuel >= 30) {
      objectives.push({
        id: 'wires_routine',
        x: 850, y: 1350,
        label: 'ELECTRICAL: CONNECT POWER BUS (+15% FUEL)',
        color: '#f5f557',
        priority: 5
      });
    }

    objectives.push({
      id: 'science_routine',
      x: 850, y: 450,
      label: 'LAB: ALIGN DSN ANTENNA (+30 SCIENCE)',
      color: '#72e7ff',
      priority: 5
    });

    objectives.push({
      id: 'nav_routine',
      x: 2640, y: 1040,
      label: 'NAVIGATION: LOCK ASTEROID RADAR (+8% PROGRESS)',
      color: '#50ef39',
      priority: 5
    });

    if (hull >= 40) {
      objectives.push({
        id: 'cargo_routine',
        x: 1500, y: 1450,
        label: 'STORAGE: WELD HULL SEAMS (+20% HULL, -15KG)',
        color: '#ffb347',
        priority: 4
      });
    }

    // 3. Moon Landed EVA Objective
    if (currentScene === 'moon' && gameState.moon && gameState.moon.state === 'landed') {
      objectives.push({
        id: 'moon_cheese',
        x: 1650, y: 550,
        label: 'EVA: HARVEST ROMY CHEESE (+18% FOOD)',
        color: '#f5f557',
        priority: 8
      });
    }

    return objectives.sort(function (a, b) { return b.priority - a.priority; });
  }
```

#### B. Floating Interaction Prompt Above Player
In `public/js/renderer.js`, inside the `render` function right after drawing the local player name (line 1152), insert the floating prompt helper:

```javascript
      // Floating Interaction Prompt
      var nearbyStation = getTaskStationAt(localP.x, localP.y);
      if (nearbyStation) {
        var promptText = '[PRESS E / USE] OPEN TASK: ' + (nearbyStation.room || nearbyStation.id).toUpperCase();
        ctx.save();
        ctx.font = 'bold 12px "Courier New", monospace';
        var pWidth = ctx.measureText(promptText).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#38fedc';
        ctx.lineWidth = 2;
        roundRect(ctx, localP.x - pWidth / 2 - 8, localP.y - 72, pWidth + 16, 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38fedc';
        ctx.textAlign = 'center';
        ctx.fillText(promptText, localP.x, localP.y - 57);
        ctx.restore();
      } else if (isNearPilotChair(localP.x, localP.y)) {
        var pilotPrompt = '[PRESS E / P] ENTER FLIGHT DECK (3D COCKPIT)';
        ctx.save();
        ctx.font = 'bold 12px "Courier New", monospace';
        var pilotWidth = ctx.measureText(pilotPrompt).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#f5f557';
        ctx.lineWidth = 2;
        roundRect(ctx, localP.x - pilotWidth / 2 - 8, localP.y - 72, pilotWidth + 16, 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f5f557';
        ctx.textAlign = 'center';
        ctx.fillText(pilotPrompt, localP.x, localP.y - 57);
        ctx.restore();
      } else if (isNearEmergencyButton(localP.x, localP.y)) {
        var meetPrompt = '[PRESS E / R] CALL EMERGENCY MEETING';
        ctx.save();
        ctx.font = 'bold 12px "Courier New", monospace';
        var meetWidth = ctx.measureText(meetPrompt).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#c51111';
        ctx.lineWidth = 2;
        roundRect(ctx, localP.x - meetWidth / 2 - 8, localP.y - 72, meetWidth + 16, 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ff7777';
        ctx.textAlign = 'center';
        ctx.fillText(meetPrompt, localP.x, localP.y - 57);
        ctx.restore();
      }
```

---

### 1.4 `public/js/tasks.js` — Complete 5 Tactile Interactive Mini-Games
Replace the mini-game functions in `public/js/tasks.js` (lines 110–742) with the following upgraded tactile implementations:

#### Task 1: Greenhouse Hydroponics (`o2_filter`)
- **Interaction:** Drag or hold mouse pouring animated water stream onto 4 wilted alien plants.
- **Visuals:** Plants physically grow leafy stems, bud flowers, and release rising translucent $O_2$ bubbles when moisture reaches 100%.
- **Reward:** `+20% O2`.

```javascript
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
        ctx.fillText('🌱 GREENHOUSE RESTORED! (+20% O2)', canvas.width / 2, 170);
        setTimeout(onComplete, 900);
        return;
      }

      animId = requestAnimationFrame(loop);
    }
    loop();
  }
```

---

#### Task 2: Electrical Wiring (`wires`)
- **Interaction:** Drag 4 colored cables from left pins to right sockets.
- **Visuals:** Dynamic Bezier sag curvature, live glowing sparks, matching terminal connections.
- **Reward:** `+15% Fuel & Power`.

```javascript
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
```

---

#### Task 3: Hull Breach Plasma Welder & Cargo Clamps (`cargo`)
- **Interaction:** Drag glowing cyan plasma torch across irregular hull fracture seam; click 2 loose magnetic cargo cargo straps to lock them.
- **Visuals:** Molten orange weld bead cools into silver titanium, sparks burst, clamps snap into locked position.
- **Reward:** `+20% Hull Integrity & -15 kg Mass`.

```javascript
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
```

---

#### Task 4: NASA Deep Space Network Dish Alignment (`science`)
- **Interaction:** Drag dish antenna azimuth and match frequency sine wave.
- **Visuals:** Live oscilloscope matching target carrier signal with green lock badge.
- **Reward:** `+30 Science Data`.

```javascript
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
```

---

#### Task 5: Asteroid Defense Radar Lock (`nav`)
- **Interaction:** Sweeping radar beam with 4 moving target blips. Click all 4 blips to lock navigation vectors.
- **Visuals:** Polar coordinate grid, phosphor sweep, red-to-green target lock reticles.
- **Reward:** `+8% Mars Progress` and restores `autopilot = true`.

```javascript
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
```

---

## 3. Section 2: 3D Vector Laser Ballistics & Asteroid Fracture Physics

### 2.1 Audio Assets & `public/js/audio.js`
1. Copy or make accessible sound files:
   - `/home/meko/work/Game play/3D-Airforce-Simulator/sounds/hit.ogg` → `Road to Mars/public/assets/sounds/hit.ogg`
   - `/home/meko/work/Game play/3D-Airforce-Simulator/sounds/30MM_M163.ogg` → `Road to Mars/public/assets/sounds/MGLAUNCH.ogg`
2. In `public/js/audio.js`, register `hit` and `laser`:
```javascript
  var SOUNDS = {
    alert:       '/assets/sounds/alert.ogg',
    overg:       '/assets/sounds/overg.ogg',
    pullup:      '/assets/sounds/pullup.ogg',
    bang:        '/assets/sounds/bang.ogg',
    lockondone:  '/assets/sounds/lockondone.ogg',
    voice_start: '/assets/sounds/voice_start_a.ogg',
    hit:         '/assets/sounds/hit.ogg',
    laser:       '/assets/sounds/MGLAUNCH.ogg'
  };
```

---

### 2.2 `public/js/cockpit.js` — Wingtip Laser Ballistics & Rapid-Fire
In `public/js/cockpit.js`:
1. Dual laser bolts must fire from the ship’s left and right wingtips:
   - Left wingtip: `new THREE.Vector3(-3.2, -0.3, -4.5).applyMatrix4(shipGroup.matrixWorld)`
   - Right wingtip: `new THREE.Vector3(3.2, -0.3, -4.5).applyMatrix4(shipGroup.matrixWorld)`
2. Laser bolts are given a 3D forward velocity vector `forwardDir.multiplyScalar(420)` matching `shipGroup.quaternion`.
3. Support rapid-fire firing every `160ms` when holding `Spacebar` or `Left Mouse`.

#### Drop-in Replacement Functions for `cockpit.js`:
```javascript
  var lastLaserFireTime = 0;
  var LASER_FIRE_INTERVAL = 160;
  var pointerFiring = false;

  function fireLaserCannons() {
    if (!shipGroup || !open) return;
    var now = performance.now();
    if (now - lastLaserFireTime < LASER_FIRE_INTERVAL) return;
    lastLaserFireTime = now;

    if (RTM.Audio) {
      if (!RTM.Audio.play('laser', 0.6)) {
        RTM.Audio.play('hit', 0.6);
      }
    }

    var leftLocal = new THREE.Vector3(-3.2, -0.3, -4.5);
    var rightLocal = new THREE.Vector3(3.2, -0.3, -4.5);

    var leftWorld = leftLocal.applyMatrix4(shipGroup.matrixWorld);
    var rightWorld = rightLocal.applyMatrix4(shipGroup.matrixWorld);

    var forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();

    var boltL = createLaserBolt(leftWorld, forwardDir, shipGroup.quaternion);
    var boltR = createLaserBolt(rightWorld, forwardDir, shipGroup.quaternion);

    scene.add(boltL);
    scene.add(boltR);
    activeLasers.push(boltL, boltR);

    // Camera subtle recoil
    if (camera) {
      camera.position.z += 0.35;
    }
  }

  function createLaserBolt(pos, dir, quat) {
    var geo = new THREE.CylinderGeometry(0.22, 0.22, 7.5, 8);
    geo.rotateX(Math.PI / 2);
    if (!laserMaterial) {
      laserMaterial = new THREE.MeshBasicMaterial({ color: 0x38fedc });
    }
    var mesh = new THREE.Mesh(geo, laserMaterial);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    mesh.userData = {
      velocity: dir.clone().multiplyScalar(420),
      distanceTraveled: 0
    };
    return mesh;
  }
```

#### Pointer & Keyboard Firing Hooks:
In `bindPointerFlight(element)`:
```javascript
    element.addEventListener('pointerdown', function (event) {
      if (!open) return;
      if (event.button === 0) {
        pointerFiring = true;
        fireLaserCannons();
      }
      mouseActive = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (element.setPointerCapture) {
        try { element.setPointerCapture(event.pointerId); } catch (_) {}
      }
    });

    window.addEventListener('pointerup', function () {
      mouseActive = false;
      pointerFiring = false;
    });
```

In `animate(timestamp)`:
```javascript
    if (pointerFiring || keysDown.Space || keysDown.KeyF) {
      fireLaserCannons();
    }
```

---

### 2.3 `public/js/cockpit.js` — Multi-Stage 3D Asteroid Fracture & Continuous Spawning
All visible space rocks and debris are shootable. Large asteroids have `hp: 2`.
1. **First Hit (`hp = 1`):**
   - Knockback impulse away from laser velocity.
   - Orange emissive flash (`0xff8822`) for 120ms.
   - Angular spin speed doubled.
   - 10 spark particles.
   - Sound: `hit`.
2. **Second Hit (`hp <= 0`):**
   - Shockwave Torus Ring expanding from scale 1 to 12 over 0.5s with fading opacity.
   - Shatters into 3 to 4 tumbling sub-fragments with inherited momentum + radial explosion velocity.
   - 25 glowing particles (orange, cyan, white).
   - Sound: `bang`.
   - Scientific reward: `+10 Science`, `+2% Mars Progress`, and trigger NASA scan popup.

#### Continuous Spawning & Fracture Implementation:
```javascript
  var shockwaveRings = [];
  var asteroidFragments = [];

  function spawnContinuousAsteroids() {
    if (!open || !shipGroup) return;
    if (activeObstacles.length >= 24) return;

    var asteroidKeys = Object.keys(nasaGeometryCache);
    var isNasa = asteroidKeys.length > 0 && Math.random() > 0.4;
    var mesh, meta;

    if (isNasa) {
      var key = asteroidKeys[Math.floor(Math.random() * asteroidKeys.length)];
      var cached = nasaGeometryCache[key];
      var mat = new THREE.MeshStandardMaterial({
        color: 0x9a9892,
        roughness: 0.88,
        metalness: 0.12
      });
      mesh = new THREE.Mesh(cached.geometry, mat);
      var scale = cached.meta.scale * (1.8 + Math.random() * 1.0);
      mesh.scale.setScalar(scale);
      meta = cached.meta;
    } else {
      var brickGeo = new THREE.BoxGeometry(7, 4.5, 3.5);
      var brickMat = new THREE.MeshStandardMaterial({
        color: 0xef7d0d,
        roughness: 0.45,
        metalness: 0.55
      });
      mesh = new THREE.Mesh(brickGeo, brickMat);
      meta = { name: 'Booster Debris Stage', fact: 'Jettisoned upper-stage casing in Mars transfer orbit.' };
    }

    var shipPos = shipGroup.position;
    mesh.position.set(
      shipPos.x + (Math.random() - 0.5) * 220,
      shipPos.y + (Math.random() - 0.5) * 140,
      shipPos.z - 380 - Math.random() * 260
    );

    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.userData = {
      hp: 2,
      maxHp: 2,
      radius: 5.5,
      rotSpeedX: (Math.random() - 0.5) * 1.8,
      rotSpeedY: (Math.random() - 0.5) * 1.8,
      meta: meta,
      flashTimer: 0
    };

    scene.add(mesh);
    activeObstacles.push(mesh);
  }

  function spawnShockwaveRing(pos) {
    var geo = new THREE.TorusGeometry(3.5, 0.35, 8, 28);
    var mat = new THREE.MeshBasicMaterial({
      color: 0x38fedc,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    var ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    ring.userData = { life: 0.5, maxLife: 0.5, scaleSpeed: 24 };
    scene.add(ring);
    shockwaveRings.push(ring);
  }

  function spawnFragments(parentObst) {
    var count = 3 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      var fragGeo = new THREE.DodecahedronGeometry(1.6 + Math.random() * 0.8);
      var fragMat = new THREE.MeshStandardMaterial({
        color: 0x8a847a,
        roughness: 0.9
      });
      var frag = new THREE.Mesh(fragGeo, fragMat);
      frag.position.copy(parentObst.position);
      frag.userData = {
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        vz: (Math.random() - 0.5) * 35,
        rotSpeed: (Math.random() - 0.5) * 4.0,
        life: 3.5
      };
      scene.add(frag);
      asteroidFragments.push(frag);
    }
  }

  function createExplosionParticles(pos, count) {
    count = count || 25;
    for (var p = 0; p < count; p++) {
      var pGeo = new THREE.SphereGeometry(0.45, 4, 4);
      var color = Math.random() > 0.4 ? 0xef7d0d : 0x38fedc;
      var pMat = new THREE.MeshBasicMaterial({ color: color });
      var pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(pos);
      pMesh.userData = {
        vx: (Math.random() - 0.5) * 28,
        vy: (Math.random() - 0.5) * 28,
        vz: (Math.random() - 0.5) * 28,
        life: 0.7
      };
      scene.add(pMesh);
      explosionParticles.push(pMesh);
    }
  }
```

#### Collision Detection & Asteroid Update Loop:
Replace `updateLasersAndCollisions(dt)` in `public/js/cockpit.js`:

```javascript
  function updateLasersAndCollisions(dt) {
    // 1. Lasers
    for (var l = activeLasers.length - 1; l >= 0; l--) {
      var laser = activeLasers[l];
      var step = laser.userData.velocity.clone().multiplyScalar(dt);
      laser.position.add(step);
      laser.userData.distanceTraveled += step.length();

      if (laser.userData.distanceTraveled > 550) {
        scene.remove(laser);
        activeLasers.splice(l, 1);
        continue;
      }

      var laserRemoved = false;
      for (var o = activeObstacles.length - 1; o >= 0; o--) {
        var obst = activeObstacles[o];
        var dist = laser.position.distanceTo(obst.position);

        if (dist < obst.userData.radius + 2.0) {
          obst.userData.hp--;

          if (obst.userData.hp === 1) {
            // First Hit: Knockback + Orange Flash + Sparks
            if (RTM.Audio) RTM.Audio.play('hit', 0.7);
            if (obst.material && obst.material.emissive) {
              obst.material.emissive.setHex(0xff7722);
              obst.userData.flashTimer = 0.15;
            }
            obst.position.addScaledVector(laser.userData.velocity.clone().normalize(), 6.0);
            obst.userData.rotSpeedX *= 2.2;
            obst.userData.rotSpeedY *= 2.2;
            createExplosionParticles(laser.position, 10);
          } else if (obst.userData.hp <= 0) {
            // Second Hit: Shatter into fragments + shockwave + rewards
            if (RTM.Audio) RTM.Audio.play('bang', 0.85);
            createExplosionParticles(obst.position, 25);
            spawnShockwaveRing(obst.position);
            spawnFragments(obst);

            if (RTM.Net) {
              var state = RTM.Net.getState();
              state.telemetry.science = (state.telemetry.science || 0) + 10;
              state.telemetry.marsProgress = Math.min(100, (state.telemetry.marsProgress || 0) + 2);
              RTM.Net.emit('cockpit:obstacle:cleared');
            }
            showCockpitScanPopup(obst.userData.meta);

            scene.remove(obst);
            activeObstacles.splice(o, 1);

            obstaclesClearedCount++;
            if (obstaclesClearedCount >= 8) {
              restoreAutopilot();
            }
          }

          scene.remove(laser);
          activeLasers.splice(l, 1);
          laserRemoved = true;
          break;
        }
      }
      if (laserRemoved) continue;
    }

    // 2. Continuous Spawning & Movement of Asteroids
    spawnContinuousAsteroids();

    for (var k = activeObstacles.length - 1; k >= 0; k--) {
      var obs = activeObstacles[k];
      obs.position.z += 42 * dt;
      obs.rotation.x += obs.userData.rotSpeedX * dt;
      obs.rotation.y += obs.userData.rotSpeedY * dt;

      if (obs.userData.flashTimer > 0) {
        obs.userData.flashTimer -= dt;
        if (obs.userData.flashTimer <= 0 && obs.material && obs.material.emissive) {
          obs.material.emissive.setHex(0x000000);
        }
      }

      if (shipGroup) {
        var shipDist = obs.position.distanceTo(shipGroup.position);
        if (shipDist < obs.userData.radius + 3.2) {
          createExplosionParticles(obs.position, 20);
          if (RTM.Audio) RTM.Audio.play('bang', 0.8);
          shakeCockpitCamera();

          if (RTM.Net) {
            var s = RTM.Net.getState();
            s.telemetry.hull = Math.max(0, (s.telemetry.hull != null ? s.telemetry.hull : 100) - 5);
            RTM.Net.emit('cockpit:obstacle:hit');
          }

          scene.remove(obs);
          activeObstacles.splice(k, 1);
          continue;
        }

        if (obs.position.z > shipGroup.position.z + 40) {
          scene.remove(obs);
          activeObstacles.splice(k, 1);
        }
      }
    }

    // 3. Shockwave Rings
    for (var r = shockwaveRings.length - 1; r >= 0; r--) {
      var ring = shockwaveRings[r];
      ring.scale.addScalar(ring.userData.scaleSpeed * dt);
      ring.userData.life -= dt;
      ring.material.opacity = Math.max(0, ring.userData.life / ring.userData.maxLife);
      if (ring.userData.life <= 0) {
        scene.remove(ring);
        shockwaveRings.splice(r, 1);
      }
    }

    // 4. Shattered Asteroid Fragments
    for (var f = asteroidFragments.length - 1; f >= 0; f--) {
      var frag = asteroidFragments[f];
      frag.position.x += frag.userData.vx * dt;
      frag.position.y += frag.userData.vy * dt;
      frag.position.z += frag.userData.vz * dt;
      frag.rotation.x += frag.userData.rotSpeed * dt;
      frag.userData.life -= dt;
      if (frag.userData.life <= 0) {
        scene.remove(frag);
        asteroidFragments.splice(f, 1);
      }
    }

    // 5. Explosion Particles
    for (var ep = explosionParticles.length - 1; ep >= 0; ep--) {
      var part = explosionParticles[ep];
      part.position.x += part.userData.vx * dt;
      part.position.y += part.userData.vy * dt;
      part.position.z += part.userData.vz * dt;
      part.userData.life -= dt;
      if (part.userData.life <= 0) {
        scene.remove(part);
        explosionParticles.splice(ep, 1);
      }
    }

    // 6. Camera Shake
    if (cameraShakeTime > 0 && camera) {
      cameraShakeTime -= dt;
      camera.position.x += (Math.random() - 0.5) * 1.6;
      camera.position.y += (Math.random() - 0.5) * 1.6;
    }
  }
```

---

## 4. Section 3: Lobby UI Layout & Visual Upgrades

### 4.1 `public/css/style.css` — Un-cramp Hangar Panel & 72px Preview Grid
In `public/css/style.css`, update lines 2010–2340:
1. Make `.hangar-panel` utilize widescreen viewport without clipping: `width: min(1440px, 97vw); height: min(880px, 94vh);`.
2. Expand the 2-column grid: `grid-template-columns: minmax(320px, 0.85fr) minmax(540px, 1.15fr);`.
3. Increase `.option-preview` to `72px x 72px` and image size to `64px x 64px`.
4. Add high-contrast glowing neon cyan borders (`border: 3px solid #38fedc; box-shadow: 0 0 18px rgba(56, 254, 220, 0.5);`) on `.mission-option.active`.

#### Exact CSS Edits in `public/css/style.css`:
```css
.hangar-panel {
  max-width: 1440px;
  width: min(1440px, 97vw);
  max-height: 94vh;
  height: min(880px, 94vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(20, 31, 47, 0.98), rgba(9, 13, 24, 0.98));
  border: 3px solid #2f425c;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
}

.hangar-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(540px, 1.15fr);
  gap: 20px;
  align-items: stretch;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: #38fedc #101a2a;
}

.mission-option {
  min-height: 126px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 12px 10px;
  text-align: center;
  font-family: 'Courier New', monospace;
  color: #b9c9dc;
  background: #111b2b;
  border: 3px solid #000;
  border-radius: 12px;
  box-shadow: 0 4px 0 #000;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.option-preview {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(56, 254, 220, 0.12), rgba(0, 0, 0, 0.65));
  border-radius: 10px;
  border: 2px solid rgba(56, 254, 220, 0.35);
  margin-bottom: 6px;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.5);
}

.option-preview img {
  max-width: 64px;
  max-height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.85));
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.mission-option:hover .option-preview img,
.mission-option.active .option-preview img {
  transform: scale(1.18);
}

.mission-option:hover {
  background: #18273c;
  transform: translateY(-2px);
  border-color: #38fedc;
}

.mission-option.active {
  background: linear-gradient(180deg, #184758, #0e2938);
  border-color: #38fedc;
  box-shadow: 0 4px 0 #000, 0 0 18px rgba(56, 254, 220, 0.5);
  transform: scale(1.02);
}
```

---

### 4.2 `public/index.html` — Duplicate Mass Bar Removal
In `public/index.html`, lines 171–183 contains an obsolete duplicate mass bar right below the modern `.vibe-meter-card`. Delete that duplicate block completely:

#### Delete from `public/index.html`:
```html
            <div class="mass-budget-bar" id="massBudgetBar">
              <div class="mb-segment mb-dry" id="mbDry"></div>
              <div class="mb-segment mb-payload" id="mbPayload"></div>
              <div class="mb-segment mb-food" id="mbFood"></div>
              <div class="mb-segment mb-o2" id="mbO2"></div>
              <div class="mb-segment mb-fuel" id="mbFuel"></div>
              <div class="mb-segment mb-crew" id="mbCrew"></div>
              <div class="mb-limit-line" id="mbLimit"></div>
            </div>
            <div class="mass-budget-readout">
              <span id="massTotal">0</span> / <span id="massMax">0</span> kg
              <span id="massOverloaded" class="overloaded-warn" style="display:none;">OVERWEIGHT</span>
            </div>
```
The `.vibe-meter-card` (lines 133–148) already renders the dynamic flight dynamics bar and total mass readout (`1100 / 1600 kg`).

---

## 5. Section 4: Verification & Smoke Testing Protocol

After applying the changes sequentially across the files:

1. **Syntax Validation**:
   Run `node --check` across all updated scripts:
   ```bash
   node --check server.js
   node --check public/js/tasks.js
   node --check public/js/ship.js
   node --check public/js/renderer.js
   node --check public/js/cockpit.js
   node --check public/js/audio.js
   node --check public/js/lobby.js
   ```
2. **Task Station Trigger Test**:
   - Start local server (`node server.js`).
   - Open browser, click "CREATE ROOM", select Falcon 9, and click "START MISSION".
   - Walk near any task station (`Electrical`, `O2 Greenhouse`, `Storage`, `Lab`, `Navigation`).
   - Verify floating prompt `"[PRESS E / USE] OPEN TASK: ..."` renders above player.
   - Press `E` or click `#btnUse` and confirm the mini-game canvas opens immediately.
3. **Mini-Game Mechanics**:
   - Water plants in Greenhouse until blooming and emitting $O_2$ bubbles. Confirm `+20% O2` notification.
   - Drag 4 colored cables with Bezier sag in Electrical. Confirm spark bursts and `+15% Fuel` notification.
   - Weld hull crack and clamp cargo straps in Storage. Confirm `+20% Hull & -15 kg Mass`.
   - Rotate satellite dish in Lab to match frequency sine wave. Confirm `+30 Science`.
   - Click 4 radar targets in Navigation. Confirm `+8% Progress` and autopilot lock.
4. **3D Flight & Fracture Physics**:
   - Take pilot seat (Press `P` or walk to chair in Navigation room).
   - Hold `Spacebar` or `Left Mouse` to fire dual wingtip lasers.
   - Confirm laser bolts travel in 3D direction matching ship crosshair.
   - Shoot incoming NASA asteroid: 1st hit causes knockback + orange flash; 2nd hit triggers shockwave ring + 3–4 tumbling fragments + 25 particles + NASA scan popup.
5. **Lobby Presentation**:
   - Verify 72x72px preview cards render cleanly without overflow or redundant bottom bars.
