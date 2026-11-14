# Road to Mars: Gameplay & UI Overhaul Specification
## Blueprint 1: Pacing, "Live the Vibe" Emergency Mechanics & Cartoon UI/UX Overhaul

> **Document Version:** 2.0.0  
> **Target Execution Agent:** Gemini Flash (Single-Threaded Implementation Model)  
> **Target Subsystems:** `server.js`, `public/js/net.js`, `public/js/lobby.js`, `public/js/hud.js`, `public/js/renderer.js`, `public/css/style.css`, `public/index.html`

---

## 1. Executive Summary & Design Vision

### 1.1 The "Live the Vibe" Co-Op Philosophy
"Road to Mars" is fundamentally an **action-comedy space exploration simulator** inspired by *Among Us*, *Overcooked*, and *Kerbal Space Program*. Players should laugh with friends, explore the sprawling `3200x2000` spacecraft interior, steer in the 3D cockpit, and solve emergencies together.

**Previous Problem:** The baseline telemetry loop drained `o2`, `food`, and `fuel` so quickly that games frequently ended in an unceremonious game over after 90–120 seconds. Players felt overwhelmed, lost on the large map, and punished rather than entertained.

**The Solution:**
1. **5x Slower Baseline Drain Rates:** Crew members have plenty of breathing room to explore rooms, chat, customize, and pilot.
2. **No Instant Game-Overs (60s Emergency Reserve Mode):** Reaching `0%` in any life-support metric does NOT trigger defeat. It triggers an adrenaline-pumping, dramatic **Emergency Reserve Klaxon** with flashing warning lights, a 60-second clutch countdown, and bright directional waypoint arrows guiding players directly to the recovery station.
3. **Playful, Colorful Cartoon UI:** Eradicate dark, drab terminal screens. Introduce bright, chunky cel-shaded cards, animated 2D Canvas Crewmate beans in the lobby, one-click room code creation/joining, and on-screen directional guide arrows.

---

## 2. Pillar 1: Relaxed Resource Drain & Emergency Reserve Mode

### 2.1 Authoritative Telemetry Schema Update (`server.js` & `net.js`)
Add the following new fields to `room.telemetry`:

```javascript
// New and updated telemetry fields in createTelemetry()
{
  // Existing fields...
  launcher: launcher,
  maxMass: LAUNCHERS[launcher] ?? LAUNCHERS.falcon9,
  dryMass: 270,
  payloadMass: payload.mass,
  foodMass: foodMass,
  o2Mass: o2Mass,
  fuelMass: fuelMass,
  o2: o2Mass > 0 ? 100 : 0,
  food: foodMass > 0 ? 100 : 0,
  fuel: 100,
  science: payload.science,
  marsProgress: 0,
  starving: false,
  overloaded: false,
  totalMass: 0,
  crewMass: 0,
  aliveCount: 0,
  ghostCount: 0,
  massPenalty: 1,

  // === NEW PILLAR 1 & PILLAR 4 FIELDS ===
  hull: 100,             // Ship Hull Integrity (0..100)
  autopilot: true,        // When true, ship auto-navigates. Set to false when asteroid field strikes!
  emergencyMode: null     // null OR { type: 'o2'|'food'|'fuel'|'hull', endsAt: timestamp, duration: 60 }
}
```

### 2.2 Rebalanced 1 Hz Telemetry Tick Math (`server.js`)
Replace the punishing drain formulas inside `function telemetryTick(room)` with the forgiving 5x relaxed rates:

```javascript
// --- In server.js: telemetryTick(room) ---
// OLD:
// telemetry.o2 = clamp(telemetry.o2 - 0.14 * aliveCount, 0, 100);
// telemetry.food = clamp(telemetry.food - 0.12 * aliveCount, 0, 100);
// telemetry.fuel = clamp(telemetry.fuel - 0.55 * penalty, 0, 100);

// NEW (5x More Forgiving, Fun Co-op Pacing):
const o2Drain = 0.03 * aliveCount;
const foodDrain = 0.025 * aliveCount;
const fuelDrain = 0.10 * penalty;

telemetry.o2 = clamp(telemetry.o2 - o2Drain, 0, 100);
telemetry.food = clamp(telemetry.food - foodDrain, 0, 100);
telemetry.fuel = clamp(telemetry.fuel - fuelDrain, 0, 100);
telemetry.starving = telemetry.food <= 0;

// Progressive Hull Wear if unmaintained or overloaded
if (telemetry.overloaded) {
  telemetry.hull = clamp(telemetry.hull - 0.05 * penalty, 0, 100);
}
```

### 2.3 The 60-Second Emergency Reserve State Machine
Instead of immediately calling `endGame(room, "imposters", "life-support-failure")`, implement the **Emergency Reserve System**:

```javascript
// --- In server.js & net.js: Emergency Mode Detection ---
function checkEmergencyState(room) {
  const telemetry = room.telemetry;
  const current = now();

  // Identify any zeroed out resource
  let emergencyType = null;
  if (telemetry.o2 <= 0) emergencyType = 'o2';
  else if (telemetry.fuel <= 0) emergencyType = 'fuel';
  else if (telemetry.hull <= 0) emergencyType = 'hull';
  else if (telemetry.food <= 0 && !telemetry.emergencyMode) {
    // Food allows extended starvation; only trigger emergency after prolonged starvation (e.g. 90s)
  }

  if (emergencyType) {
    if (!telemetry.emergencyMode) {
      // ENTER EMERGENCY RESERVE MODE!
      telemetry.emergencyMode = {
        type: emergencyType,
        startedAt: current,
        endsAt: current + 60000, // 60 seconds grace period
        duration: 60
      };
      
      io.to(room.id).emit('emergency:started', {
        roomId: room.id,
        type: emergencyType,
        endsAt: telemetry.emergencyMode.endsAt,
        duration: 60,
        serverTime: current
      });
      
      io.to(room.id).emit('game:notif', {
        message: `⚠️ EMERGENCY RESERVE ENGAGED: 60s TO RESTORE ${emergencyType.toUpperCase()}!`,
        level: 'critical'
      });
    } else {
      // Check if 60s grace countdown has expired
      if (current >= telemetry.emergencyMode.endsAt) {
        // Only now is the mission lost
        return { winner: 'imposters', reason: `emergency-${emergencyType}-depleted` };
      }
    }
  } else {
    // If the resource was restored above 0, CANCEL EMERGENCY MODE!
    if (telemetry.emergencyMode) {
      const recoveredType = telemetry.emergencyMode.type;
      telemetry.emergencyMode = null;
      
      io.to(room.id).emit('emergency:cleared', {
        roomId: room.id,
        recoveredType: recoveredType,
        serverTime: current
      });
      
      io.to(room.id).emit('game:notif', {
        message: `🎉 CLUTCH SAVE! ${recoveredType.toUpperCase()} RESTORED TO SAFE LEVELS!`,
        level: 'success'
      });
    }
  }
  return null;
}
```

### 2.4 Updated Win/Loss Checker (`server.js`)
Update `computeWin(room)`:
```javascript
function computeWin(room) {
  if (!room.startedAt || room.phase === "ended") return null;
  const alive = [...room.players.values()].filter((player) => player.isAlive);
  const aliveImposters = alive.filter((player) => player.isImposter);
  const aliveCrew = alive.filter((player) => !player.isImposter);

  // Check emergency reserve expiry
  const emergencyLoss = checkEmergencyState(room);
  if (emergencyLoss) return emergencyLoss;

  if (aliveImposters.length === 0) {
    return { winner: "crew", reason: "imposters-eliminated" };
  }
  if (aliveCrew.length === 0) {
    return { winner: "imposters", reason: "crew-eliminated" };
  }
  if (aliveImposters.length >= aliveCrew.length) {
    return { winner: "imposters", reason: "imposter-parity" };
  }
  if (room.telemetry.marsProgress >= 100) {
    return { winner: "crew", reason: "mars-arrival" };
  }
  return null;
}
```

---

## 3. Pillar 2: Playful, Colorful, Accessible Cartoon UI/UX

### 3.1 Host Detection Bug Fix (`public/js/net.js` & `public/js/lobby.js`)
**Problem:** Solo players creating a room frequently saw `WAITING FOR HOST` disabled on the start button because `net.js` verified `state.room.hostId === playerId` before socket IDs reconciled.

**Fix in `public/js/net.js`:**
```javascript
function isHost() {
  if (offlineMode) return true; // Solo offline player is ALWAYS host!
  if (!state.room) return true;
  if (state.room.hostId && state.room.hostId === playerId) return true;
  
  // Check player record
  var player = state.players[playerId];
  if (player && player.isHost) return true;
  
  // If local player is slot 0 or only human in room, grant host
  var humanIds = Object.keys(state.players).filter(function(id) {
    return !state.players[id].isBot;
  });
  if (humanIds.length > 0 && humanIds[0] === playerId) return true;
  
  return false;
}
```

**Fix in `public/js/lobby.js`:**
```javascript
function updateLobbyUI() {
  var host = RTM.Net.isHost();
  if (els.addBotBtn) {
    els.addBotBtn.disabled = false; // Always clickable
    els.addBotBtn.style.opacity = '1';
  }
  if (els.startBtn) {
    els.startBtn.disabled = !host;
    els.startBtn.className = host ? 'au-btn au-btn-green au-btn-pulse' : 'au-btn au-btn-gray';
    els.startBtn.innerHTML = host ? '🚀 LAUNCH EXPEDITION' : '⏳ WAITING FOR CAPTAIN';
  }
}
```

---

### 3.2 Top Bar: Instant Join & Create Room (`public/index.html` & `public/js/lobby.js`)
Add a clean, bold top bar to `#lobbyScreen`:

```html
<!-- Insert at the very top of #lobbyScreen inside .lobby-panel -->
<div class="lobby-quick-join-bar">
  <div class="quick-join-left">
    <label class="quick-label">CREW IDENTITY</label>
    <input type="text" id="quickPlayerName" class="au-input au-input-name" maxlength="15" placeholder="Enter Call-sign (e.g. Major Tom)">
  </div>
  <div class="quick-join-center">
    <button id="quickCreateRoomBtn" class="au-btn au-btn-green">
      <span class="btn-icon">➕</span> CREATE ROOM
    </button>
  </div>
  <div class="quick-join-right">
    <input type="text" id="quickRoomCodeInput" class="au-input au-input-code" maxlength="6" placeholder="ROOM CODE">
    <button id="quickJoinRoomBtn" class="au-btn au-btn-blue">
      <span class="btn-icon">🚪</span> JOIN BY CODE
    </button>
  </div>
</div>
```

**Event Wiring in `lobby.js`:**
```javascript
function wireQuickJoinBar() {
  var nameInput = document.getElementById('quickPlayerName');
  var createBtn = document.getElementById('quickCreateRoomBtn');
  var codeInput = document.getElementById('quickRoomCodeInput');
  var joinBtn = document.getElementById('quickJoinRoomBtn');

  if (nameInput) {
    nameInput.value = localStorage.getItem('rtm-player-name') || 'Astronaut-' + Math.floor(Math.random() * 900 + 100);
    nameInput.addEventListener('input', function() {
      localStorage.setItem('rtm-player-name', nameInput.value.trim());
      RTM.Net.emit('player:register', { name: nameInput.value.trim(), color: localColor });
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', function() {
      var name = (nameInput ? nameInput.value.trim() : '') || 'Captain';
      RTM.Net.emit('player:register', { name: name, color: localColor });
      RTM.Net.emit('room:create', {});
    });
  }

  if (joinBtn && codeInput) {
    joinBtn.addEventListener('click', function() {
      var code = codeInput.value.trim().toUpperCase();
      if (code.length >= 4) {
        var name = (nameInput ? nameInput.value.trim() : '') || 'Explorer';
        RTM.Net.emit('player:register', { name: name, color: localColor });
        RTM.Net.emit('room:join', { roomId: code });
      } else {
        alert('Please enter a valid 4 to 6 character Room Code!');
      }
    });
  }
}
```

---

### 3.3 Animated 2D Canvas Crewmate Beans in 6 Lobby Slots
Replace the empty dark gray boxes with interactive Canvas elements where players see their bean, can click color circles to change color, and click hat icons to switch hats!

```html
<!-- Inside .player-grid in index.html -->
<div class="player-slot slot-active" data-slot="0">
  <canvas class="slot-crewmate-canvas" width="120" height="130"></canvas>
  <div class="slot-info">
    <span class="slot-name">Player 1</span>
    <span class="slot-role-badge">PILOT</span>
  </div>
  <div class="slot-hat-picker">
    <button class="hat-btn" data-hat="pilot" title="Pilot Cap">👨‍✈️</button>
    <button class="hat-btn" data-hat="chef" title="Cheese Wedge">🧀</button>
    <button class="hat-btn" data-hat="o2" title="Oxygen Leaf">🌱</button>
    <button class="hat-btn" data-hat="scientist" title="Goggles">🥽</button>
    <button class="hat-btn" data-hat="hard_hat" title="Hard Hat">⛑️</button>
  </div>
</div>
```

**Drawing Procedure for Lobby Slots (`public/js/lobby.js`):**
```javascript
function drawLobbySlotBean(canvas, player, animTick) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!player) {
    // Draw cute silhouette bean waiting for friend
    ctx.globalAlpha = 0.3;
    RTM.Renderer.drawCrewmate(ctx, 60, 85, '#555566', {
      direction: 'right',
      moving: false,
      hat: null,
      dead: false,
      ghost: false
    });
    ctx.globalAlpha = 1.0;
    return;
  }

  // Draw fully animated colorful bean with bouncing idle
  var bounceY = Math.sin(animTick * 0.08) * 3;
  RTM.Renderer.drawCrewmate(ctx, 60, 85 + bounceY, player.color || '#c51111', {
    direction: 'right',
    moving: true,
    animFrame: Math.floor(animTick * 0.1),
    hat: player.specialty || player.hat || 'pilot',
    dead: false,
    ghost: false
  });
}
```

---

### 3.4 Cartoon Mission Vibe Meter (`lobby.js` & `style.css`)
Replace plain numeric sliders with vibrant cartoon cards and an animated **"Mission Vibe Meter"**:

```html
<!-- Mission Vibe Meter Container in #lobbyScreen -->
<div class="vibe-meter-card">
  <div class="vibe-header">
    <span class="vibe-title">🚀 EXPEDITION FLIGHT DYNAMICS</span>
    <span id="vibeStatusBadge" class="vibe-badge vibe-easy">CALM CRUISE</span>
  </div>
  <div class="vibe-bar-track">
    <div id="vibeFill" class="vibe-bar-fill" style="width: 35%;"></div>
    <div class="vibe-marker marker-falcon9" style="left: 65%;">FALCON 9 CAP</div>
    <div class="vibe-marker marker-sls" style="left: 85%;">SLS CAP</div>
  </div>
  <div class="vibe-stats-row">
    <div class="vibe-stat"><span>🧀 FOOD MASS:</span> <strong id="vibeFoodLabel">160 kg</strong></div>
    <div class="vibe-stat"><span>🫧 O2 RESERVE:</span> <strong id="vibeO2Label">150 kg</strong></div>
    <div class="vibe-stat"><span>⚖️ TOTAL MASS:</span> <strong id="vibeTotalLabel">880 / 1080 kg</strong></div>
  </div>
</div>
```

**Dynamic Color & Badge Logic in `lobby.js`:**
```javascript
function updateVibeMeter(telemetry) {
  var fill = document.getElementById('vibeFill');
  var badge = document.getElementById('vibeStatusBadge');
  var totalLabel = document.getElementById('vibeTotalLabel');
  if (!fill || !badge) return;

  var ratio = (telemetry.totalMass || 880) / (telemetry.maxMass || 1080);
  var percent = Math.min(100, Math.round(ratio * 100));
  fill.style.width = percent + '%';

  if (ratio > 1.0) {
    badge.className = 'vibe-badge vibe-overweight';
    badge.textContent = '🔥 DANGEROUS OVERWEIGHT (+50% Fuel Burn)';
    fill.style.background = '#c51111';
  } else if (ratio > 0.85) {
    badge.className = 'vibe-badge vibe-heavy';
    badge.textContent = '⚡ HEAVY CARGO (Fast Mars Velocity)';
    fill.style.background = '#ef7d0d';
  } else {
    badge.className = 'vibe-badge vibe-easy';
    badge.textContent = '✨ SMOOTH CRUISE (High Fuel Efficiency)';
    fill.style.background = '#117f2d';
  }
}
```

---

### 3.5 In-Game On-Screen Waypoint Guide Arrows (`renderer.js` & `hud.js`)
On a `3200x2000` spacecraft map, players should never feel lost. When an emergency happens, a task is ready, or asteroids appear, draw **bouncing cartoon directional guide arrows** clamped around the viewport boundary pointing directly to the objective!

#### 3.5.1 Waypoint Data Provider
```javascript
// --- In public/js/renderer.js: Active Objectives ---
function getActiveObjectives(gameState) {
  var objectives = [];
  var telemetry = gameState.telemetry || {};

  // 1. Oxygen Emergency or Low O2 (< 35%)
  if (telemetry.o2 < 35 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'o2')) {
    objectives.push({
      id: 'o2_emergency',
      x: 2250, y: 450, // Greenhouse / O2 Station
      label: '🌱 WATER PLANTS IN GREENHOUSE (O2 LOW!)',
      color: '#38fedc',
      priority: 10
    });
  }

  // 2. Asteroids / Autopilot Disengaged
  if (telemetry.autopilot === false) {
    objectives.push({
      id: 'pilot_cockpit',
      x: 2750, y: 950, // Navigation Cockpit Chair
      label: '🕹️ TAKE PILOT CONTROLS (ASTEROIDS AHEAD!)',
      color: '#f5f557',
      priority: 9
    });
  }

  // 3. Fuel or Electrical Emergency
  if (telemetry.fuel < 30 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'fuel')) {
    objectives.push({
      id: 'electrical_wires',
      x: 850, y: 1350, // Electrical
      label: '⚡ FIX WIRES IN ELECTRICAL (FUEL CRITICAL!)',
      color: '#ef7d0d',
      priority: 8
    });
  }

  // 4. Hull Breach (< 40% Hull)
  if (telemetry.hull < 40 || (telemetry.emergencyMode && telemetry.emergencyMode.type === 'hull')) {
    objectives.push({
      id: 'hull_repair',
      x: 1600, y: 1550, // Storage & Hull Welding
      label: '🛠️ WELD HULL BREACH IN STORAGE',
      color: '#c51111',
      priority: 9
    });
  }

  // 5. Moon Landed (Romy Cheese EVA)
  if (gameState.scene === 'moon' && gameState.moon && gameState.moon.state === 'landed') {
    objectives.push({
      id: 'moon_cheese',
      x: 1650, y: 550, // Primary cheese node
      label: '🌕 COLLECT ROMY CHEESE (+18% FOOD)!',
      color: '#f5f557',
      priority: 7
    });
  }

  return objectives.sort(function(a, b) { return b.priority - a.priority; });
}
```

#### 3.5.2 Clamped Viewport Screen-Edge Arrow Math
```javascript
// --- In public/js/renderer.js: drawWaypointGuideArrows() ---
function drawWaypointGuideArrows(ctx, localPlayer, gameState) {
  if (!localPlayer || gameState.scene !== 'ship') return;
  var objectives = getActiveObjectives(gameState);
  if (objectives.length === 0) return;

  var screenW = ctx.canvas.width;
  var screenH = ctx.canvas.height;
  var margin = 60; // Distance from screen edges

  objectives.slice(0, 2).forEach(function(obj) { // Draw up to 2 active objectives
    // Target position in screen coordinates
    var targetScreen = worldToScreen(obj.x, obj.y);

    // If target is already comfortably visible on screen, skip arrow
    if (targetScreen.x > 100 && targetScreen.x < screenW - 100 &&
        targetScreen.y > 100 && targetScreen.y < screenH - 100) {
      return;
    }

    // Compute angle from screen center to target
    var centerX = screenW / 2;
    var centerY = screenH / 2;
    var dx = targetScreen.x - centerX;
    var dy = targetScreen.y - centerY;
    var angle = Math.atan2(dy, dx);

    // Clamp arrow position along the rectangular border
    var edgeX = centerX + Math.cos(angle) * (centerX - margin);
    var edgeY = centerY + Math.sin(angle) * (centerY - margin);
    edgeX = Math.max(margin, Math.min(screenW - margin, edgeX));
    edgeY = Math.max(margin, Math.min(screenH - margin, edgeY));

    // Bouncing oscillation along arrow vector
    var bounce = Math.sin(Date.now() * 0.008) * 8;
    edgeX += Math.cos(angle) * bounce;
    edgeY += Math.sin(angle) * bounce;

    // Draw chunky cartoon arrow
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);

    // Arrow body
    ctx.fillStyle = obj.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-24, -6);
    ctx.lineTo(-24, 6);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Draw text pill next to arrow
    ctx.save();
    ctx.font = 'bold 14px "Comic Sans MS", "Chalkboard", sans-serif';
    var textWidth = ctx.measureText(obj.label).width;
    var badgeX = Math.max(10, Math.min(screenW - textWidth - 30, edgeX - textWidth / 2));
    var badgeY = edgeY > screenH / 2 ? edgeY - 26 : edgeY + 26;

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(badgeX - 4, badgeY - 16, textWidth + 18, 26, 8);
    ctx.fill();

    ctx.fillStyle = obj.color;
    ctx.fillText(obj.label, badgeX + 4, badgeY + 2);
    ctx.restore();
  });
}
```

---

## 4. CSS Styling Rules & Themes (`public/css/style.css`)

Add these vibrant Among Us / Overcooked style declarations:

```css
/* Quick Join Top Bar */
.lobby-quick-join-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #252839;
  border: 4px solid #000;
  border-radius: 16px;
  padding: 12px 20px;
  margin-bottom: 20px;
  box-shadow: 0 6px 0 #000;
  gap: 15px;
}

.au-input {
  background: #151722;
  border: 3px solid #000;
  border-radius: 10px;
  color: #fff;
  font-family: inherit;
  font-size: 16px;
  font-weight: bold;
  padding: 10px 14px;
  outline: none;
  box-shadow: inset 0 3px 0 #000;
}

.au-input:focus {
  border-color: #38fedc;
}

/* Slot Canvas & Hat Picker */
.slot-crewmate-canvas {
  width: 100px;
  height: 110px;
  display: block;
  margin: 0 auto;
}

.slot-hat-picker {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.hat-btn {
  background: #3c4054;
  border: 2px solid #000;
  border-radius: 8px;
  font-size: 16px;
  padding: 4px 6px;
  cursor: pointer;
  transition: transform 0.1s;
}

.hat-btn:hover {
  transform: scale(1.2);
  background: #f5f557;
}

/* Vibe Meter */
.vibe-meter-card {
  background: #202330;
  border: 4px solid #000;
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: 0 5px 0 #000;
  margin: 16px 0;
}

.vibe-bar-track {
  position: relative;
  height: 24px;
  background: #0f1118;
  border: 3px solid #000;
  border-radius: 12px;
  overflow: hidden;
  margin: 10px 0;
}

.vibe-bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.3s ease, background 0.3s ease;
}

.vibe-badge {
  font-weight: 900;
  font-size: 14px;
  padding: 4px 10px;
  border: 2px solid #000;
  border-radius: 8px;
  box-shadow: 0 3px 0 #000;
}
.vibe-easy { background: #50ef39; color: #000; }
.vibe-heavy { background: #ef7d0d; color: #fff; }
.vibe-overweight { background: #c51111; color: #fff; animation: pulse 0.8s infinite; }

/* Klaxon & Emergency Reserve Overlays */
@keyframes emergencyFlash {
  0% { background: rgba(197, 17, 17, 0.0); }
  50% { background: rgba(197, 17, 17, 0.35); }
  100% { background: rgba(197, 17, 17, 0.0); }
}

.emergency-reserve-active {
  animation: emergencyFlash 1s infinite;
  pointer-events: none;
}
```

---

## 5. Execution Checklist for Gemini Flash

1. **`server.js`**: Update `createTelemetry()` with `hull: 100` and `autopilot: true`.
2. **`server.js`**: Scale drain rates in `telemetryTick()` by 5x (`o2: 0.03`, `food: 0.025`, `fuel: 0.10`).
3. **`server.js`**: Add `checkEmergencyState()` and wire it into `computeWin()`.
4. **`public/js/net.js`**: Replicate telemetry fields and 5x drain logic in offline loop; update `isHost()` to always return `true` for solo/offline hosts.
5. **`public/index.html`**: Insert Quick Join Bar and update Crew Manifest slot templates.
6. **`public/js/lobby.js`**: Implement `wireQuickJoinBar()`, `drawLobbySlotBean()`, and `updateVibeMeter()`.
7. **`public/js/renderer.js`**: Add `drawWaypointGuideArrows()` into the main 2D render loop.
8. **`public/css/style.css`**: Append the Among Us / Overcooked cartoon styles.
