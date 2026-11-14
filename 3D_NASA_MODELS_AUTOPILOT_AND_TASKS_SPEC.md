# Road to Mars: 3D NASA Models, Autopilot, & Survival Mini-Games Spec
## Blueprint 2: Real NASA 3D Integration, Arcade Flight Simulator, & Tactile HTML5 Mini-Games

> **Document Version:** 2.0.0  
> **Target Execution Agent:** Gemini Flash (Single-Threaded Implementation Model)  
> **Target Subsystems:** `server.js`, `public/index.html`, `public/js/cockpit.js`, `public/js/tasks.js`, `public/js/hud.js`, `public/css/style.css`

---

## 1. Executive Summary & Architecture Overview

This blueprint provides concrete code, math, and step-by-step implementation instructions for:
1. **Real NASA 3D Assets:** Mounting and rendering downloaded NASA 3D scans (`/nasa models`) directly inside Three.js using `STLLoader` and `GLTFLoader`.
2. **Arcade Autopilot & Asteroid Defense System (`cockpit.js`):** An exciting 3D mini-game where the ship's autopilot disengages, requiring a pilot to man the cockpit, dodge NASA asteroids and cosmic space bricks, and fire dual wing-mounted laser cannons to restore autopilot and gain science!
3. **Tactile HTML5 Canvas Mini-Games (`tasks.js`):** Replacing static UI buttons with 5 interactive, animated 2D Canvas mini-games (Watering Plants, Sparking Wires, Plasma Torch Hull Welding, Dish Alignment, and Radar Locking).

---

## 2. Pillar 3: Real NASA 3D Models & Educational Data Integration

### 2.1 File Inventory in `/home/meko/work/Game play/nasa models`

The files in `/home/meko/work/Game play/nasa models` represent authentic NASA assets downloaded from `science.nasa.gov/3d-resources/`:

| Filename | Format | File Size | Description & Real NASA Context | Three.js Loader |
| :--- | :--- | :--- | :--- | :--- |
| `Asteroid 101955 Bennu.stl` | STL | 2.45 MB | Carbonaceous near-Earth asteroid sampled by NASA's **OSIRIS-REx** mission in 2020. | `THREE.STLLoader` |
| `Asteroid 1620 Geographos.stl` | STL | 819 KB | Elongated Mars-crossing asteroid discovered in 1951, radar-mapped by Goldstone. | `THREE.STLLoader` |
| `Asteroid 216 Kleopatra.stl` | STL | 204 KB | High-albedo, metallic "dog-bone" shaped binary asteroid in the main belt. | `THREE.STLLoader` |
| `Asteroid 25143 Itokawa.stl` | STL | 10.0 MB | Rubble-pile asteroid with smooth dust plains, target of Hayabusa. | `THREE.STLLoader` |
| `Asteroid 4179 Toutatis.stl` | STL | 639 KB | Chaotic non-principal axis rotator near-Earth asteroid radar-imaged by NASA. | `THREE.STLLoader` |
| `Block Island.stl` | STL | 7.18 MB | Largest iron-nickel meteorite found on Mars by Mars Exploration Rover **Opportunity**. | `THREE.STLLoader` |
| `Apollo 14 - Landing Site.stl` | STL | 6.96 MB | High-resolution elevation mesh of the Fra Mauro lunar highlands. | `THREE.STLLoader` |
| `Curiosity Landing Site.stl` | STL | 2.75 MB | Gale Crater terrain mesh mapped by the Mars Reconnaissance Orbiter (MRO). | `THREE.STLLoader` |
| `Astronaut.glb` | GLTF/GLB | 762 KB | NASA EMU (Extravehicular Mobility Unit) Spacewalk suit model. | `THREE.GLTFLoader` |
| `Advanced Crew Escape Suit.glb` | GLTF/GLB | 858 KB | Orange "Pumpkin Suit" worn during Space Shuttle launch and ascent. | `THREE.GLTFLoader` |
| `Z2 Spacesuit.glb` | GLTF/GLB | 16.9 MB | NASA prototype planetary surface exploration suit for Mars missions. | `THREE.GLTFLoader` |
| `Earth (B).jpg` | JPEG | 2.51 MB | NASA Blue Marble Earth planetary texture map. | `THREE.TextureLoader` |
| `Apollo 11 - View of the Moon.jpg` | JPEG | 2.95 MB | Apollo 11 historical lunar terrain photography texture. | `THREE.TextureLoader` |

---

### 2.2 Express Static Server Mount (`server.js`)
To allow the browser to load these files with clean URLs, mount `/nasa-models`:

```javascript
// --- In server.js (around line 122) ---
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve game public directory
app.use(express.static(path.join(__dirname, "public")));

// === MOUNT AUTHENTIC NASA 3D MODELS DIRECTORY ===
app.use("/nasa-models", express.static(path.join(__dirname, "..", "nasa models")));
```

---

### 2.3 HTML Script Inclusions (`public/index.html`)
Three.js r128 requires `STLLoader.js` to parse `.stl` meshes. Update `index.html`:

```html
<!-- Inside public/index.html (Vendor libs section) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
```

---

### 2.4 NASA Mesh Catalog & Loader Routine (`public/js/cockpit.js`)

Implement this NASA model catalog and loading pipeline:

```javascript
// --- In public/js/cockpit.js ---
var NASA_MODELS = [
  {
    id: 'bennu',
    name: 'Asteroid 101955 Bennu',
    url: '/nasa-models/Asteroid 101955 Bennu.stl',
    scale: 0.045,
    type: 'stl',
    fact: 'Target of NASA OSIRIS-REx; ancient carbon-rich rubble pile.'
  },
  {
    id: 'toutatis',
    name: 'Asteroid 4179 Toutatis',
    url: '/nasa-models/Asteroid 4179 Toutatis.stl',
    scale: 0.05,
    type: 'stl',
    fact: 'Chaotic tumbler; 2 lobes connected by a narrow neck.'
  },
  {
    id: 'geographos',
    name: 'Asteroid 1620 Geographos',
    url: '/nasa-models/Asteroid 1620 Geographos.stl',
    scale: 0.06,
    type: 'stl',
    fact: 'Most elongated known body in the Solar System (4:1 ratio).'
  },
  {
    id: 'kleopatra',
    name: 'Asteroid 216 Kleopatra',
    url: '/nasa-models/Asteroid 216 Kleopatra.stl',
    scale: 0.035,
    type: 'stl',
    fact: 'Metallic dog-bone asteroid with two orbiting moons: Alexhelios and Cleoselene.'
  },
  {
    id: 'block_island',
    name: 'Martian Meteorite: Block Island',
    url: '/nasa-models/Block Island.stl',
    scale: 0.04,
    type: 'stl',
    fact: 'Largest iron meteorite found on Mars by rover Opportunity in 2009.'
  }
];

var nasaGeometryCache = {};

function preloadNasaModels(onReady) {
  var stlLoader = new THREE.STLLoader();
  var loadedCount = 0;

  NASA_MODELS.forEach(function(item) {
    stlLoader.load(item.url, function(geometry) {
      geometry.center(); // Center mesh pivot point
      geometry.computeVertexNormals();
      nasaGeometryCache[item.id] = {
        geometry: geometry,
        meta: item
      };
      loadedCount++;
      if (loadedCount >= NASA_MODELS.length && onReady) {
        onReady();
      }
    }, undefined, function(err) {
      console.warn('Failed to load NASA STL:', item.name, err);
      loadedCount++;
      if (loadedCount >= NASA_MODELS.length && onReady) onReady();
    });
  });
}
```

---

## 3. Pillar 4: Autopilot Disengagement, 3D Space Bricks, & Dual Laser Cannons

### 3.1 Autopilot Disengagement & Wave Cycle
During transit between Earth and Mars, the ship normally cruises comfortably under **Autopilot** (`telemetry.autopilot = true`). Every 75–90 seconds (or when an asteroid swarm triggers):
1. **Server or local timer triggers an Asteroid Encounter.**
2. Set `telemetry.autopilot = false`.
3. Broadcast alert: `"⚠️ ASTEROID FIELD DETECTED! AUTOPILOT OFFLINE — PILOT TO COCKPIT (PRESS P)!"`
4. Klaxon alarm sounds (`alert.ogg`).
5. On-screen waypoint arrow points directly to Cockpit Pilot Chair.
6. If no player takes the pilot controls within 10 seconds, random asteroid impacts inflict `telemetry.hull -= 5%` every 4 seconds.

---

### 3.2 Arcade-Smooth 3D Cockpit Steering & Physics (`cockpit.js`)
Provide silky-smooth arcade controls with auto-centering:

```javascript
// --- In public/js/cockpit.js: updateShipSteering(dt) ---
var shipVelocity = new THREE.Vector3(0, 0, -45); // Forward cruising speed
var shipTargetX = 0;
var shipTargetY = 0;
var currentBank = 0;

function handleCockpitInput(dt) {
  var turnSpeed = 45; // Units per second
  var maxOffset = 50; // Viewport boundaries

  // WASD or Arrow Keys
  if (keysDown['KeyA'] || keysDown['ArrowLeft'])  shipTargetX -= turnSpeed * dt;
  if (keysDown['KeyD'] || keysDown['ArrowRight']) shipTargetX += turnSpeed * dt;
  if (keysDown['KeyW'] || keysDown['ArrowUp'])    shipTargetY += turnSpeed * dt;
  if (keysDown['KeyS'] || keysDown['ArrowDown'])  shipTargetY -= turnSpeed * dt;

  // Mouse Steering (normalized -1 to 1)
  if (mouseActive) {
    shipTargetX += pointerX * turnSpeed * dt * 1.5;
    shipTargetY -= pointerY * turnSpeed * dt * 1.5;
  }

  // Clamp within flying corridor
  shipTargetX = Math.max(-maxOffset, Math.min(maxOffset, shipTargetX));
  shipTargetY = Math.max(-maxOffset * 0.6, Math.min(maxOffset * 0.6, shipTargetY));

  // Smooth interpolation (Lerp)
  if (shipMesh) {
    shipMesh.position.x += (shipTargetX - shipMesh.position.x) * 8 * dt;
    shipMesh.position.y += (shipTargetY - shipMesh.position.y) * 8 * dt;

    // Banking animation
    var targetBank = -(shipTargetX - shipMesh.position.x) * 0.04;
    currentBank += (targetBank - currentBank) * 6 * dt;
    shipMesh.rotation.z = currentBank;
    shipMesh.rotation.x = (shipTargetY - shipMesh.position.y) * 0.02;
  }
}
```

---

### 3.3 Dual Laser Cannons & Obstacle Destruction Pipeline

#### 3.3.1 Laser Bolt Spawner & Projectiles
```javascript
// --- In public/js/cockpit.js ---
var activeLasers = [];
var laserMaterial = new THREE.MeshBasicMaterial({ color: 0x38fedc }); // Bright cyan laser

function fireLaserCannons() {
  if (!shipMesh || !open) return;

  // Sound effect
  if (RTM.Audio) RTM.Audio.play('hit');

  var wingOffset = 3.5;
  var muzzleZ = shipMesh.position.z - 4;

  // Left wing bolt
  var boltL = createLaserBolt(shipMesh.position.x - wingOffset, shipMesh.position.y, muzzleZ);
  // Right wing bolt
  var boltR = createLaserBolt(shipMesh.position.x + wingOffset, shipMesh.position.y, muzzleZ);

  scene.add(boltL);
  scene.add(boltR);
  activeLasers.push(boltL, boltR);
}

function createLaserBolt(x, y, z) {
  var geo = new THREE.CylinderGeometry(0.18, 0.18, 5, 8);
  geo.rotateX(Math.PI / 2); // Point along forward Z
  var mesh = new THREE.Mesh(geo, laserMaterial);
  mesh.position.set(x, y, z);
  mesh.userData = { speed: 280, distanceTraveled: 0 };
  return mesh;
}
```

#### 3.3.2 Real NASA Asteroid & Space Brick Obstacle Spawning
```javascript
var activeObstacles = [];
var obstaclesClearedCount = 0;

function spawnObstacleWave() {
  obstaclesClearedCount = 0;
  
  // Mix of Real NASA Asteroids and Cosmic Space Bricks
  var asteroidKeys = Object.keys(nasaGeometryCache);

  for (var i = 0; i < 18; i++) {
    var isNasaAsteroid = i % 2 === 0 && asteroidKeys.length > 0;
    var mesh;
    var meta = null;

    if (isNasaAsteroid) {
      var key = asteroidKeys[i % asteroidKeys.length];
      var cached = nasaGeometryCache[key];
      var mat = new THREE.MeshStandardMaterial({
        color: 0x8c8985,
        roughness: 0.9,
        metalness: 0.1
      });
      mesh = new THREE.Mesh(cached.geometry, mat);
      mesh.scale.setScalar(cached.meta.scale * (1.5 + Math.random() * 0.8));
      meta = cached.meta;
    } else {
      // Cosmic Space Brick (Chunky geometric barrier)
      var brickGeo = new THREE.BoxGeometry(6, 4, 3);
      var brickMat = new THREE.MeshStandardMaterial({
        color: 0xef7d0d, // Industrial orange
        roughness: 0.4,
        metalness: 0.6
      });
      mesh = new THREE.Mesh(brickGeo, brickMat);
      meta = { name: 'Cosmic Space Debris', fact: 'Orbital booster stage fragment.' };
    }

    // Position in flight corridor ahead of ship
    mesh.position.set(
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 50,
      -150 - (i * 45) // Staggered along flight path
    );

    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.userData = {
      rotSpeedX: (Math.random() - 0.5) * 1.5,
      rotSpeedY: (Math.random() - 0.5) * 1.5,
      radius: 4.5,
      meta: meta
    };

    scene.add(mesh);
    activeObstacles.push(mesh);
  }
}
```

#### 3.3.3 Laser Collision, Shattering & Autopilot Restoration
```javascript
function updateLasersAndCollisions(dt) {
  // 1. Move Lasers forward
  for (var l = activeLasers.length - 1; l >= 0; l--) {
    var laser = activeLasers[l];
    laser.position.z -= laser.userData.speed * dt;
    laser.userData.distanceTraveled += laser.userData.speed * dt;

    if (laser.userData.distanceTraveled > 400) {
      scene.remove(laser);
      activeLasers.splice(l, 1);
      continue;
    }

    // Check hit against obstacles
    for (var o = activeObstacles.length - 1; o >= 0; o--) {
      var obst = activeObstacles[o];
      var dist = laser.position.distanceTo(obst.position);

      if (dist < obst.userData.radius + 1.5) {
        // HIT! SHATTER OBSTACLE!
        createExplosionParticles(obst.position);
        if (RTM.Audio) RTM.Audio.play('bang');

        // Award Science Points & Toast
        if (RTM.Net) {
          var state = RTM.Net.getState();
          state.telemetry.science += 10;
        }
        showCockpitScanPopup(obst.userData.meta);

        // Remove from scene
        scene.remove(obst);
        activeObstacles.splice(o, 1);
        scene.remove(laser);
        activeLasers.splice(l, 1);

        obstaclesClearedCount++;

        // Victory Condition: 8 obstacles cleared
        if (obstaclesClearedCount >= 8) {
          restoreAutopilot();
        }
        break;
      }
    }
  }

  // 2. Move Obstacles toward ship & check collision with ship
  for (var k = activeObstacles.length - 1; k >= 0; k--) {
    var obs = activeObstacles[k];
    obs.position.z += 30 * dt; // Approaching speed
    obs.rotation.x += obs.userData.rotSpeedX * dt;
    obs.rotation.y += obs.userData.rotSpeedY * dt;

    if (shipMesh) {
      var shipDist = obs.position.distanceTo(shipMesh.position);
      if (shipDist < obs.userData.radius + 2.5) {
        // SHIP COLLISION!
        createExplosionParticles(obs.position);
        if (RTM.Audio) RTM.Audio.play('bang');
        shakeCockpitCamera();

        // Hull Damage Penalty
        if (RTM.Net) {
          var s = RTM.Net.getState();
          s.telemetry.hull = Math.max(0, s.telemetry.hull - 8);
        }

        scene.remove(obs);
        activeObstacles.splice(k, 1);
        continue;
      }
    }

    // Remove if past camera
    if (obs.position.z > 20) {
      scene.remove(obs);
      activeObstacles.splice(k, 1);
    }
  }
}

function restoreAutopilot() {
  if (RTM.Net) {
    var state = RTM.Net.getState();
    state.telemetry.autopilot = true;
    state.telemetry.marsProgress = Math.min(100, state.telemetry.marsProgress + 10);
  }
  if (RTM.Audio) RTM.Audio.play('lockondone');

  var banner = document.getElementById('cockpitWaveBanner');
  if (banner) {
    banner.className = 'cockpit-banner banner-success';
    banner.innerHTML = '🎉 ASTEROID FIELD CLEARED! AUTOPILOT RESTORED (+10% PROGRESS)!';
    banner.style.display = 'block';
    setTimeout(function() { banner.style.display = 'none'; }, 4000);
  }
}
```

---

## 4. Pillar 5: Tactile HTML5 Canvas Survival Mini-Games (`tasks.js`)

Replace the old button-based minigames with **5 tactile, mouse-interactive 2D Canvas games** rendered directly inside `<canvas id="taskCanvas" width="540" height="380">`.

---

### 4.1 Task 1: Greenhouse — Water the Space Plants (`o2_filter`)
*Goal: Pour water particles over 4 wilted potted alien space-plants until they sprout green leaves, bloom Martian flowers, and release oxygen bubbles (+20% O2).*

```javascript
// --- In public/js/tasks.js: initGreenhouseTask() ---
function runGreenhouseGame(canvas, onComplete) {
  var ctx = canvas.getContext('2d');
  var plants = [
    { x: 80,  waterLevel: 0, bloomed: false, label: 'Alocasia-X' },
    { x: 190, waterLevel: 0, bloomed: false, label: 'Fern-Mars' },
    { x: 300, waterLevel: 0, bloomed: false, label: 'Chlorophytum' },
    { x: 410, waterLevel: 0, bloomed: false, label: 'Sprout-V' }
  ];

  var waterDrops = [];
  var isPouring = false;
  var mousePos = { x: 270, y: 80 };

  canvas.onmousedown = function(e) { isPouring = true; updateMouse(e); };
  window.onmouseup = function() { isPouring = false; };
  canvas.onmousemove = updateMouse;

  function updateMouse(e) {
    var rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }

  function loop() {
    ctx.fillStyle = '#18241d'; // Greenhouse dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Spawn water droplets from watering nozzle
    if (isPouring) {
      for (var i = 0; i < 3; i++) {
        waterDrops.push({
          x: mousePos.x + (Math.random() - 0.5) * 12,
          y: mousePos.y + 15,
          vy: 6 + Math.random() * 4
        });
      }
    }

    // Update & draw water droplets
    ctx.fillStyle = '#38fedc';
    for (var d = waterDrops.length - 1; d >= 0; d--) {
      var drop = waterDrops[d];
      drop.y += drop.vy;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Check collision with plant pots (y: 280 to 340)
      plants.forEach(function(plant) {
        if (Math.abs(drop.x - plant.x - 30) < 35 && drop.y >= 290 && drop.y <= 330) {
          plant.waterLevel = Math.min(100, plant.waterLevel + 1.2);
          if (plant.waterLevel >= 100) plant.bloomed = true;
        }
      });

      if (drop.y > canvas.height) waterDrops.splice(d, 1);
    }

    // Draw 4 Plant Pots & Plants
    var allBloomed = true;
    plants.forEach(function(plant) {
      if (!plant.bloomed) allBloomed = false;

      // Pot
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(plant.x, 290, 60, 50);

      // Growth stem & leaves
      var growth = plant.waterLevel / 100;
      var plantColor = plant.bloomed ? '#50ef39' : '#887744'; // Green vs wilted
      ctx.strokeStyle = plantColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(plant.x + 30, 290);
      ctx.lineTo(plant.x + 30, 290 - growth * 90);
      ctx.stroke();

      // Leaves
      if (growth > 0.3) {
        ctx.fillStyle = plantColor;
        ctx.beginPath();
        ctx.ellipse(plant.x + 15, 290 - growth * 60, 14 * growth, 7 * growth, -0.5, 0, Math.PI * 2);
        ctx.ellipse(plant.x + 45, 290 - growth * 70, 14 * growth, 7 * growth, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Oxygen bubble when fully bloomed
      if (plant.bloomed) {
        ctx.strokeStyle = '#38fedc';
        ctx.lineWidth = 2;
        var bubbleY = 290 - 110 - (Date.now() * 0.05 + plant.x) % 50;
        ctx.beginPath();
        ctx.arc(plant.x + 30, bubbleY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw Watering Can Head
    ctx.fillStyle = '#556677';
    ctx.fillRect(mousePos.x - 20, mousePos.y - 10, 40, 20);

    if (allBloomed) {
      ctx.fillStyle = '#50ef39';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🌱 GREENHOUSE THRIVING! (+20% O2)', canvas.width / 2, 40);
      setTimeout(onComplete, 900);
      return;
    }

    requestAnimationFrame(loop);
  }
  loop();
}
```

---

### 4.2 Task 2: Electrical — Sparking Wires (`wires`)
*Goal: Drag 4 colored rubber cables from left terminals to matching right terminals with realistic cable sagging and electric spark bursts (+15% Fuel & Power).*

```javascript
// --- In public/js/tasks.js: runWiresGame() ---
function runWiresGame(canvas, onComplete) {
  var ctx = canvas.getContext('2d');
  var colors = ['#c51111', '#132ed1', '#f5f557', '#117f2d']; // Red, Blue, Yellow, Green
  var leftTerminals = [
    { y: 80,  color: colors[0], connected: -1 },
    { y: 150, color: colors[1], connected: -1 },
    { y: 220, color: colors[2], connected: -1 },
    { y: 290, color: colors[3], connected: -1 }
  ];
  // Shuffle right terminals
  var rightY = [150, 80, 290, 220];
  var rightTerminals = colors.map(function(col, idx) {
    return { y: rightY[idx], color: col };
  });

  var draggingWire = -1;
  var mousePos = { x: 0, y: 0 };
  var sparks = [];

  canvas.onmousedown = function(e) {
    updateMouse(e);
    leftTerminals.forEach(function(term, idx) {
      if (Math.hypot(mousePos.x - 50, mousePos.y - term.y) < 25 && term.connected === -1) {
        draggingWire = idx;
      }
    });
  };

  window.onmouseup = function() {
    if (draggingWire !== -1) {
      // Check if dropped near matching right terminal
      var targetCol = leftTerminals[draggingWire].color;
      rightTerminals.forEach(function(rTerm, rIdx) {
        if (rTerm.color === targetCol && Math.hypot(mousePos.x - 490, mousePos.y - rTerm.y) < 30) {
          leftTerminals[draggingWire].connected = rIdx;
          // Spawn electric sparks!
          for (var s = 0; s < 15; s++) {
            sparks.push({
              x: 490, y: rTerm.y,
              vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
              life: 20
            });
          }
          if (RTM.Audio) RTM.Audio.play('hit');
        }
      });
      draggingWire = -1;
    }
  };

  canvas.onmousemove = updateMouse;

  function updateMouse(e) {
    var rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }

  function loop() {
    ctx.fillStyle = '#22252e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Left and Right Sockets
    leftTerminals.forEach(function(term) {
      ctx.fillStyle = term.color;
      ctx.beginPath();
      ctx.arc(50, term.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    rightTerminals.forEach(function(term) {
      ctx.fillStyle = term.color;
      ctx.beginPath();
      ctx.arc(490, term.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw Connected Wires with Catenary Sag
    var connectedCount = 0;
    leftTerminals.forEach(function(term, idx) {
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

    // Draw Sparks
    for (var sp = sparks.length - 1; sp >= 0; sp--) {
      var spark = sparks[sp];
      spark.x += spark.vx; spark.y += spark.vy; spark.life--;
      ctx.fillStyle = '#f5f557';
      ctx.fillRect(spark.x, spark.y, 3, 3);
      if (spark.life <= 0) sparks.splice(sp, 1);
    }

    if (connectedCount === 4) {
      ctx.fillStyle = '#50ef39';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ POWER BUS RESTORED! (+15% FUEL)', canvas.width / 2, 40);
      setTimeout(onComplete, 800);
      return;
    }

    requestAnimationFrame(loop);
  }
  loop();
}
```

---

### 4.3 Task 3: Storage & Hull — Plasma Torch Welder (`cargo`)
*Goal: Drag glowing cyan plasma torch over a jagged hull breach to weld it shut (+20% Hull) and pull a lever to eject ballast (-15 kg Mass).*

```javascript
// --- In public/js/tasks.js: runHullWelderGame() ---
function runHullWelderGame(canvas, onComplete) {
  var ctx = canvas.getContext('2d');
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

  canvas.onmousedown = function(e) { isWelding = true; updateTorch(e); };
  window.onmouseup = function() { isWelding = false; };
  canvas.onmousemove = updateTorch;

  function updateTorch(e) {
    var rect = canvas.getBoundingClientRect();
    torchPos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    torchPos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }

  function loop() {
    ctx.fillStyle = '#1c1e28'; // Titanium hull dark metal
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Unwelded Crack (Glowing fiery orange breach)
    ctx.strokeStyle = '#ef7d0d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    crackPoints.forEach(function(pt, idx) {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Weld points near torch
    var weldedCount = 0;
    crackPoints.forEach(function(pt) {
      if (isWelding && Math.hypot(torchPos.x - pt.x, torchPos.y - pt.y) < 25) {
        pt.welded = true;
        // Spawn molten welding sparks
        sparks.push({
          x: pt.x, y: pt.y,
          vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
          color: Math.random() > 0.5 ? '#38fedc' : '#ffffff',
          life: 15
        });
      }
      if (pt.welded) weldedCount++;
    });

    // Draw Welded Seam (Shiny silver bead)
    ctx.strokeStyle = '#d6e0f0';
    ctx.lineWidth = 8;
    crackPoints.forEach(function(pt) {
      if (pt.welded) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw Sparks
    for (var sp = sparks.length - 1; sp >= 0; sp--) {
      var s = sparks[sp];
      s.x += s.vx; s.y += s.vy; s.life--;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, 3, 3);
      if (s.life <= 0) sparks.splice(sp, 1);
    }

    // Draw Plasma Torch Tip
    ctx.fillStyle = isWelding ? '#38fedc' : '#778899';
    ctx.beginPath();
    ctx.arc(torchPos.x, torchPos.y, 8, 0, Math.PI * 2);
    ctx.fill();

    var progress = weldedCount / crackPoints.length;
    if (progress >= 0.95) {
      ctx.fillStyle = '#50ef39';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ HULL INTEGRITY RESTORED! (+20% HULL)', canvas.width / 2, 40);
      setTimeout(onComplete, 800);
      return;
    }

    requestAnimationFrame(loop);
  }
  loop();
}
```

---

### 4.4 Task 4: Comms & Satellite — Rotating Deep Space Dish (`science`)
*Goal: Rotate a NASA satellite dish to align with the Mars Deep Space Network carrier signal (+30 Science).*

```javascript
// --- In public/js/tasks.js: runCommsDishGame() ---
function runCommsDishGame(canvas, onComplete) {
  var ctx = canvas.getContext('2d');
  var targetAngle = Math.PI * 0.75; // Target heading
  var currentAngle = Math.PI * 0.2;
  var isDragging = false;

  canvas.onmousedown = function() { isDragging = true; };
  window.onmouseup = function() { isDragging = false; };
  canvas.onmousemove = function(e) {
    if (!isDragging) return;
    var rect = canvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var my = (e.clientY - rect.top) * (canvas.height / rect.height);
    currentAngle = Math.atan2(my - 220, mx - 270);
  };

  function loop() {
    ctx.fillStyle = '#0c1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var diff = Math.abs(currentAngle - targetAngle);
    var signalStrength = Math.max(0, 1 - diff / (Math.PI * 0.5));

    // Draw Signal Strength Bar
    ctx.fillStyle = '#333344';
    ctx.fillRect(100, 40, 340, 24);
    ctx.fillStyle = signalStrength > 0.92 ? '#50ef39' : '#f5f557';
    ctx.fillRect(100, 40, 340 * signalStrength, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIGNAL LOCK: ' + Math.round(signalStrength * 100) + '%', canvas.width / 2, 58);

    // Draw Dish Base & Pedestal
    ctx.fillStyle = '#445566';
    ctx.fillRect(250, 220, 40, 80);

    // Draw Rotating Dish Arc
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

    if (signalStrength > 0.95) {
      ctx.fillStyle = '#50ef39';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📡 DSN LINK ESTABLISHED! (+30 SCIENCE)', canvas.width / 2, 350);
      setTimeout(onComplete, 800);
      return;
    }

    requestAnimationFrame(loop);
  }
  loop();
}
```

---

### 4.5 Task 5: Navigation — Radar Asteroid Lock (`nav`)
*Goal: Click 3 blips on a sweeping green phosphor radar screen to calibrate flight vectors (+5% Mars Progress & restores `autopilot = true`).*

```javascript
// --- In public/js/tasks.js: runRadarLockGame() ---
function runRadarLockGame(canvas, onComplete) {
  var ctx = canvas.getContext('2d');
  var radarAngle = 0;
  var targets = [
    { x: 200, y: 150, locked: false },
    { x: 340, y: 180, locked: false },
    { x: 250, y: 280, locked: false }
  ];

  canvas.onclick = function(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var my = (e.clientY - rect.top) * (canvas.height / rect.height);

    targets.forEach(function(t) {
      if (Math.hypot(mx - t.x, my - t.y) < 25) {
        t.locked = true;
        if (RTM.Audio) RTM.Audio.play('hit');
      }
    });
  };

  function loop() {
    ctx.fillStyle = '#06180c'; // Phosphor green dark screen
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Radar Circular Grid
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    [60, 110, 160].forEach(function(r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Radar Sweeper Beam
    radarAngle += 0.04;
    ctx.strokeStyle = '#50ef39';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radarAngle) * 170, cy + Math.sin(radarAngle) * 170);
    ctx.stroke();

    // Draw Targets
    var lockedCount = 0;
    targets.forEach(function(t) {
      ctx.fillStyle = t.locked ? '#50ef39' : '#f5f557';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.locked ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();

      if (t.locked) {
        lockedCount++;
        ctx.strokeStyle = '#50ef39';
        ctx.strokeRect(t.x - 14, t.y - 14, 28, 28);
      }
    });

    if (lockedCount === 3) {
      ctx.fillStyle = '#50ef39';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🧭 VECTOR LOCKED! (+5% PROGRESS)', canvas.width / 2, 40);
      setTimeout(onComplete, 800);
      return;
    }

    requestAnimationFrame(loop);
  }
  loop();
}
```

---

## 5. Execution Checklist for Gemini Flash

1. **`server.js`**: Add Express static mount `app.use("/nasa-models", express.static(path.join(__dirname, "..", "nasa models")));`.
2. **`public/index.html`**: Include `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>`.
3. **`public/js/cockpit.js`**:
   - Add `NASA_MODELS` definition and `preloadNasaModels()`.
   - Implement `spawnObstacleWave()`, `fireLaserCannons()`, `updateLasersAndCollisions()`.
   - Wire `W/S/A/D`, mouse movement, and `Spacebar`/`Left-Click`/`F` firing.
   - Implement `restoreAutopilot()` to clear waves, reward +10% Mars Progress, and award science.
4. **`public/js/tasks.js`**:
   - Replace old text button tasks with the 5 interactive Canvas mini-games (`runGreenhouseGame`, `runWiresGame`, `runHullWelderGame`, `runCommsDishGame`, `runRadarLockGame`).
   - Wire task completion events to emit `task:complete` to the server and update local telemetry.
5. **`public/css/style.css`**: Add styles for `#cockpitWaveBanner`, `#taskCanvas`, and target HUD popups.
