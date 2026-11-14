window.RTM = window.RTM || {};
window.RTM.Cockpit = (function () {
  'use strict';

  var root = null;
  var scene = null;
  var camera = null;
  var renderer = null;
  var rafId = null;

  // 3D Objects
  var shipGroup = null;
  var shipMesh = null;
  var thrusterPlumes = [];
  var sunMesh = null;
  var earthMesh = null;
  var moonMesh = null;
  var marsMesh = null;
  var starField = null;
  var trajectoryLine = null;
  var asteroidGroup = null;
  var satelliteMesh = null;

  // State
  var open = false;
  var built = false;
  var els = {};
  var lastTime = 0;
  var cameraMode = 'chase'; // 'chase' or 'cockpit'
  var throttle = 0;
  var heading = 0;
  var pitch = 0;
  var roll = 0;
  var boost = false;
  var descentActive = false;
  var descentTimer = 0;
  var keysDown = {};
  var mouseActive = false;
  var pointerX = 0;
  var pointerY = 0;
  var lastThrustEmit = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ────────────────────────────────────────────────────────────
   *  DOM HUD
   * ──────────────────────────────────────────────────────────── */
  function buildDom() {
    root = document.getElementById('cockpit3d');
    if (!root) return;
    root.innerHTML = [
      '<div class="cockpit-vignette"></div>',
      '<div class="cockpit-hud">',
      '  <div class="cockpit-top">',
      '    <div class="cockpit-badge">3D SPACE FLIGHT SIMULATOR</div>',
      '    <div class="cockpit-orbital" id="cockpitOrbital">ORBITAL CRUISE</div>',
      '  </div>',
      '  <div class="cockpit-crosshair" id="cockpitCrosshair">+</div>',
      '  <div class="cockpit-targets" id="cockpitTargets">',
      '    <div class="cockpit-target-box" id="targetMoon">',
      '      <span class="target-name">MOON [L TO LAND]</span>',
      '      <span class="target-dist" id="distMoon">38,400 KM</span>',
      '    </div>',
      '    <div class="cockpit-target-box" id="targetMars">',
      '      <span class="target-name">MARS (DESTINATION)</span>',
      '      <span class="target-dist" id="distMars">142,500 KM</span>',
      '    </div>',
      '  </div>',
      '  <div class="cockpit-dashboard">',
      '    <div class="cockpit-readouts">',
      '      <div class="cockpit-readout"><span>FUEL</span><strong id="cockpitFuel">100%</strong></div>',
      '      <div class="cockpit-readout"><span>O2</span><strong id="cockpitO2">100%</strong></div>',
      '      <div class="cockpit-readout"><span>HEADING</span><strong id="cockpitHeadingValue">0°</strong></div>',
      '      <div class="cockpit-readout"><span>THROTTLE</span><strong id="cockpitThrottleValue">0%</strong></div>',
      '      <div class="cockpit-readout"><span>CAMERA</span><strong id="cockpitCamMode">CHASE (C)</strong></div>',
      '      <div class="cockpit-navball-wrap"><canvas id="cockpitNavball" width="96" height="96"></canvas><span>NAVBALL</span></div>',
      '    </div>',
      '    <div class="cockpit-controls">',
      '      <label class="cockpit-slider-label">THROTTLE (W/S)',
      '        <input type="range" id="cockpitThrottle" min="0" max="1" step="0.05" value="0">',
      '      </label>',
      '      <label class="cockpit-slider-label">HEADING (A/D)',
      '        <input type="range" id="cockpitHeading" min="-180" max="180" step="1" value="0">',
      '      </label>',
      '    </div>',
      '    <div class="cockpit-buttons">',
      '      <button class="au-btn au-btn-blue" id="cockpitCameraBtn">CAM: CHASE (C)</button>',
      '      <button class="au-btn au-btn-yellow" id="cockpitLandBtn">LAND ON MOON (L)</button>',
      '      <button class="au-btn au-btn-gray" id="cockpitLeaveBtn">LEAVE CONTROLS (ESC)</button>',
      '    </div>',
      '    <div class="cockpit-status" id="cockpitStatus">Flight controls active. Press W/S for Throttle, A/D to Steer, C for Camera.</div>',
      '  </div>',
      '</div>'
    ].join('');

    els.orbital = document.getElementById('cockpitOrbital');
    els.fuel = document.getElementById('cockpitFuel');
    els.o2 = document.getElementById('cockpitO2');
    els.headingValue = document.getElementById('cockpitHeadingValue');
    els.throttleValue = document.getElementById('cockpitThrottleValue');
    els.camMode = document.getElementById('cockpitCamMode');
    els.throttle = document.getElementById('cockpitThrottle');
    els.heading = document.getElementById('cockpitHeading');
    els.cameraBtn = document.getElementById('cockpitCameraBtn');
    els.land = document.getElementById('cockpitLandBtn');
    els.leave = document.getElementById('cockpitLeaveBtn');
    els.status = document.getElementById('cockpitStatus');
    els.distMoon = document.getElementById('distMoon');
    els.distMars = document.getElementById('distMars');
    els.navball = document.getElementById('cockpitNavball');

    if (els.throttle) {
      els.throttle.addEventListener('input', function () {
        throttle = Number(els.throttle.value) || 0;
        updateThrottleLabels();
        sendThrust();
      });
    }
    if (els.heading) {
      els.heading.addEventListener('input', function () {
        heading = Number(els.heading.value) || 0;
        updateThrottleLabels();
        sendThrust();
      });
    }
    if (els.cameraBtn) els.cameraBtn.addEventListener('click', toggleCameraMode);
    if (els.land) els.land.addEventListener('click', land);
    if (els.leave) els.leave.addEventListener('click', leaveSeat);
  }

  function toggleCameraMode() {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    if (els.cameraBtn) els.cameraBtn.textContent = 'CAM: ' + (cameraMode === 'chase' ? 'CHASE (C)' : 'COCKPIT (C)');
    if (els.camMode) els.camMode.textContent = (cameraMode === 'chase' ? 'CHASE (C)' : 'COCKPIT (C)');
    if (RTM.HUD) RTM.HUD.showNotification('Camera: ' + (cameraMode === 'chase' ? '3rd-Person Chase Cam' : '1st-Person Cockpit View'), 'info');
  }

  /* ────────────────────────────────────────────────────────────
   *  3D SCENE CONSTRUCTION
   * ──────────────────────────────────────────────────────────── */
  function buildScene() {
    if (built || typeof THREE === 'undefined' || !root) return;
    built = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    scene.fog = new THREE.FogExp2(0x010206, 0.00012);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 8000);
    camera.position.set(0, 8, 22);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = 'cockpit-canvas';
    root.insertBefore(renderer.domElement, root.firstChild);
    bindPointerFlight(renderer.domElement);

    // 1. Lighting
    var ambient = new THREE.AmbientLight(0x223355, 0.6);
    scene.add(ambient);

    var sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(1200, 600, -2500);
    scene.add(sunLight);

    // 2. Stars
    var starGeo = new THREE.BufferGeometry();
    var starCount = 3500;
    var starPos = new Float32Array(starCount * 3);
    var starColors = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount; i++) {
      var r = 1000 + Math.random() * 3000;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);

      var tint = Math.random();
      if (tint > 0.8) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 0.6; // warm
      } else if (tint > 0.6) {
        starColors[i * 3] = 0.6; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0; // blue
      } else {
        starColors[i * 3] = 0.95; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    var starMat = new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.9 });
    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 3. Glowing Sun
    var sunGeo = new THREE.SphereGeometry(180, 32, 32);
    var sunMat = new THREE.MeshBasicMaterial({ color: 0xffea78 });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(1400, 700, -3200);
    scene.add(sunMesh);

    // Sun Corona Halo
    var coronaGeo = new THREE.SphereGeometry(240, 32, 32);
    var coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    var coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunMesh.add(coronaMesh);

    // 4. Earth (orbital origin)
    var textureLoader = new THREE.TextureLoader();
    var earthTex = textureLoader.load('/assets/kenney_planets/Planets/planet03.png');
    earthTex.encoding = THREE.sRGBEncoding;
    var earthGeo = new THREE.SphereGeometry(170, 64, 48);
    var earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(-680, -90, -1150);
    scene.add(earthMesh);

    // 5. Moon with workspace texture
    var moonTex = textureLoader.load('/assets/kenney_planets/Planets/planet04.png');
    moonTex.encoding = THREE.sRGBEncoding;
    var moonGeo = new THREE.SphereGeometry(82, 56, 40);
    var moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      color: 0xffffff,
      roughness: 1,
      metalness: 0
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(430, 100, -880);
    scene.add(moonMesh);

    // 6. Mars (red destination) with workspace texture
    var marsTex = textureLoader.load('/assets/kenney_planets/Planets/planet08.png');
    marsTex.encoding = THREE.sRGBEncoding;
    var marsGeo = new THREE.SphereGeometry(145, 56, 40);
    var marsMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0
    });
    marsMesh = new THREE.Mesh(marsGeo, marsMat);
    marsMesh.position.set(260, -90, -2650);
    scene.add(marsMesh);

    // 7. Orbital Trajectory Ribbon
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-680, -90, -1150), // Earth
      new THREE.Vector3(-220, -20, -980),
      new THREE.Vector3(430, 100, -880),   // Moon approach
      new THREE.Vector3(360, 20, -1500),
      new THREE.Vector3(300, -30, -2200),
      new THREE.Vector3(260, -90, -2650)   // Mars
    ]);
    var points = curve.getPoints(120);
    var trajGeo = new THREE.BufferGeometry().setFromPoints(points);
    var trajMat = new THREE.LineBasicMaterial({
      color: 0x38fedc,
      transparent: true,
      opacity: 0.65,
      linewidth: 2
    });
    trajectoryLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajectoryLine);

    // 8. Player Spaceship Group
    shipGroup = new THREE.Group();
    shipGroup.position.set(0, 0, 0);
    scene.add(shipGroup);

    buildSpaceshipMesh();

    // 9. Asteroids Field
    asteroidGroup = new THREE.Group();
    scene.add(asteroidGroup);
    buildAsteroids();
  }

  /* ────────────────────────────────────────────────────────────
   *  SPACESHIP & THRUSTERS
   * ──────────────────────────────────────────────────────────── */
  function buildSpaceshipMesh() {
    var loader = (typeof THREE.GLTFLoader !== 'undefined') ? new THREE.GLTFLoader() : null;
    var modelUrl = '/assets/kenney_space-kit/Models/GLTF%20format/craft_cargoA.glb';

    if (loader) {
      loader.load(modelUrl, function (gltf) {
        var model = gltf.scene;
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        var span = Math.max(size.x, size.y, size.z) || 1;
        var scale = 18 / span;
        shipMesh = new THREE.Group();
        shipMesh.rotation.y = Math.PI; // Face forward along -Z
        shipMesh.scale.setScalar(scale);
        shipMesh.add(model);
        shipGroup.add(shipMesh);
        attachThrusterPlumes();
      }, undefined, function () {
        // Fallback to procedural ship
        buildProceduralShip();
      });
    } else {
      buildProceduralShip();
    }
  }

  function buildProceduralShip() {
    var bodyGeo = new THREE.ConeGeometry(2.4, 9, 8);
    bodyGeo.rotateX(Math.PI / 2);
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d3d5c, metalness: 0.8, roughness: 0.2 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);

    var wingGeo = new THREE.BoxGeometry(10, 0.4, 3.5);
    var wingMat = new THREE.MeshStandardMaterial({ color: 0x22223b, metalness: 0.9, roughness: 0.3 });
    var wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, -0.2, 1);
    body.add(wings);

    var cockpitGeo = new THREE.SphereGeometry(1.2, 16, 16);
    cockpitGeo.scale(0.8, 0.6, 1.8);
    var cockpitMat = new THREE.MeshStandardMaterial({ color: 0x38fedc, roughness: 0.1, transparent: true, opacity: 0.75 });
    var cockpitGlass = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpitGlass.position.set(0, 0.9, -1.2);
    body.add(cockpitGlass);

    shipMesh = body;
    shipGroup.add(shipMesh);
    attachThrusterPlumes();
  }

  function attachThrusterPlumes() {
    thrusterPlumes = [];
    var nozzleOffsets = [
      new THREE.Vector3(-1.6, 0.2, 4.2),
      new THREE.Vector3(1.6, 0.2, 4.2)
    ];

    nozzleOffsets.forEach(function (offset) {
      var plumeGeo = new THREE.ConeGeometry(0.75, 4.5, 16);
      plumeGeo.rotateX(-Math.PI / 2);
      plumeGeo.translate(0, 0, 2.25);
      var plumeMat = new THREE.MeshBasicMaterial({
        color: 0x38fedc,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      var plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.copy(offset);
      shipGroup.add(plume);
      thrusterPlumes.push(plume);
    });
  }

  function buildAsteroids() {
    var loader = (typeof THREE.GLTFLoader !== 'undefined') ? new THREE.GLTFLoader() : null;
    var rockUrl = '/assets/kenney_space-kit/Models/GLTF%20format/rock_largeA.glb';

    function addProceduralAsteroids() {
      var rockGeo = new THREE.DodecahedronGeometry(12, 1);
      var rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6e7a, roughness: 0.9, metalness: 0.1 });
      for (var i = 0; i < 35; i++) {
        var rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(
          (Math.random() - 0.5) * 800,
          (Math.random() - 0.5) * 400,
          -300 - Math.random() * 2000
        );
        var s = 0.6 + Math.random() * 1.8;
        rock.scale.set(s, s, s);
        rock.userData = {
          rotX: (Math.random() - 0.5) * 0.02,
          rotY: (Math.random() - 0.5) * 0.02
        };
        asteroidGroup.add(rock);
      }
    }

    if (loader) {
      loader.load(rockUrl, function (gltf) {
        var baseRock = gltf.scene;
        for (var i = 0; i < 35; i++) {
          var rock = baseRock.clone();
          rock.position.set(
            (Math.random() - 0.5) * 800,
            (Math.random() - 0.5) * 400,
            -300 - Math.random() * 2000
          );
          var s = 6.0 + Math.random() * 16.0;
          rock.scale.set(s, s, s);
          rock.userData = {
            rotX: (Math.random() - 0.5) * 0.02,
            rotY: (Math.random() - 0.5) * 0.02
          };
          asteroidGroup.add(rock);
        }
      }, undefined, function () {
        addProceduralAsteroids();
      });
    } else {
      addProceduralAsteroids();
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  CONTROLS & PHYSICS SYNC
   * ──────────────────────────────────────────────────────────── */
  function updateThrottleLabels() {
    if (els.throttleValue) els.throttleValue.textContent = Math.round(throttle * 100) + '%';
    if (els.headingValue) els.headingValue.textContent = Math.round(heading) + '°';
    if (els.throttle) els.throttle.value = String(throttle);
    if (els.heading) els.heading.value = String(heading);
  }

  function sendThrust() {
    if (!RTM.Net || !RTM.Net.isPilot()) return;
    var now = performance.now();
    if (now - lastThrustEmit < 90) return; // throttle network emits
    lastThrustEmit = now;
    RTM.Net.emit('pilot:thrust', {
      throttle: clamp(throttle, 0, 1),
      heading: clamp(heading, -180, 180)
    });
  }

  function updateReadouts() {
    if (!RTM.Net) return;
    var gameState = RTM.Net.getState();
    var telemetry = gameState.telemetry || {};
    var moonState = (gameState.moon && gameState.moon.state) || 'orbit';

    if (els.fuel) els.fuel.textContent = Math.round(telemetry.fuel != null ? telemetry.fuel : 100) + '%';
    if (els.o2) els.o2.textContent = Math.round(telemetry.o2 != null ? telemetry.o2 : 100) + '%';
    if (els.orbital) {
      if (moonState === 'descending') els.orbital.textContent = 'LUNAR DESCENT IN PROGRESS';
      else if (moonState === 'landed') els.orbital.textContent = 'TOUCHDOWN: MOON BASE';
      else els.orbital.textContent = 'MARS HOHMANN TRANSFER';
    }

    // Dynamic distance calculation
    if (shipGroup && moonMesh && els.distMoon) {
      var dMoon = Math.round(shipGroup.position.distanceTo(moonMesh.position) * 110);
      els.distMoon.textContent = dMoon.toLocaleString() + ' KM';
    }
    if (shipGroup && marsMesh && els.distMars) {
      var dMars = Math.round(shipGroup.position.distanceTo(marsMesh.position) * 75);
      els.distMars.textContent = dMars.toLocaleString() + ' KM';
    }

    if (els.land) {
      var canLand = RTM.Net.isPilot() && moonState === 'orbit' && telemetry.fuel >= 10 && telemetry.o2 >= 12;
      els.land.disabled = !canLand;
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  ANIMATION & RENDER LOOP
   * ──────────────────────────────────────────────────────────── */
  function animate(timestamp) {
    rafId = requestAnimationFrame(animate);
    var dt = lastTime ? Math.min(0.1, (timestamp - lastTime) / 1000) : 0;
    lastTime = timestamp;
    if (!open || !renderer || !scene || !camera) return;

    // Handle Keyboard Inputs
    handleKeyboardInput(dt);

    // Ship Flight Dynamics
    var headingRad = (heading * Math.PI) / 180;
    var targetYaw = -headingRad;
    var targetPitch = pitch * 0.35;
    var bankTarget = 0;
    if (keysDown['KeyA'] || keysDown['ArrowLeft']) bankTarget += 0.5;
    if (keysDown['KeyD'] || keysDown['ArrowRight']) bankTarget -= 0.5;
    roll = lerp(roll, bankTarget, Math.min(1, dt * 4));

    if (shipGroup) {
      shipGroup.rotation.y = lerp(shipGroup.rotation.y, targetYaw, 0.08);
      shipGroup.rotation.x = lerp(shipGroup.rotation.x, targetPitch, 0.08);
      shipGroup.rotation.z = lerp(shipGroup.rotation.z, roll, 0.08);

      // Advance ship along velocity
      var speedMultiplier = boost ? 2.4 : 1.0;
      var forwardSpeed = throttle * 65 * speedMultiplier * dt;
      var fwd = new THREE.Vector3(0, 0, -1).applyEuler(shipGroup.rotation);
      shipGroup.position.addScaledVector(fwd, forwardSpeed);

      // Animate thruster plumes
      var plumeScale = (throttle > 0.05 ? (throttle * (boost ? 2.2 : 1.2)) : 0.08);
      thrusterPlumes.forEach(function (plume, idx) {
        var flameNoise = 1.0 + Math.sin(timestamp * 0.03 + idx) * 0.18;
        plume.scale.set(plumeScale * flameNoise, plumeScale * flameNoise, plumeScale * (boost ? 2.5 : 1.5) * flameNoise);
        plume.material.color.setHex(boost ? 0xffaa33 : 0x38fedc);
        plume.visible = throttle > 0.02 || boost;
      });
    }

    // Camera Placement
    if (shipGroup) {
      if (cameraMode === 'chase') {
        // Mode 1: 3rd-Person Chase Cam
        var chaseOffset = new THREE.Vector3(0, 6.5, 20).applyEuler(shipGroup.rotation);
        var targetCamPos = shipGroup.position.clone().add(chaseOffset);
        camera.position.lerp(targetCamPos, 0.08);

        var lookTarget = shipGroup.position.clone().add(new THREE.Vector3(0, 1.5, -15).applyEuler(shipGroup.rotation));
        camera.lookAt(lookTarget);
      } else {
        // Mode 2: 1st-Person Cockpit HUD POV
        var cockpitPos = shipGroup.position.clone().add(new THREE.Vector3(0, 1.6, -1.2).applyEuler(shipGroup.rotation));
        camera.position.copy(cockpitPos);
        camera.rotation.copy(shipGroup.rotation);
      }
    }

    // Celestial Bodies Rotation & Motion
    if (starField) starField.rotation.y += dt * 0.002;
    if (moonMesh) moonMesh.rotation.y += dt * 0.015;
    if (marsMesh) marsMesh.rotation.y += dt * 0.012;
    if (earthMesh) earthMesh.rotation.y += dt * 0.008;

    // Asteroids tumbling
    if (asteroidGroup) {
      asteroidGroup.children.forEach(function (rock) {
        if (rock.userData) {
          rock.rotation.x += rock.userData.rotX || 0.005;
          rock.rotation.y += rock.userData.rotY || 0.005;
        }
      });
    }

    // Handle Descent Animation
    if (descentActive) {
      descentTimer -= dt;
      if (shipGroup && moonMesh) {
        shipGroup.position.lerp(moonMesh.position, 0.025);
        if (els.status) {
          els.status.textContent = 'DESCENT TRAJECTORY LOCKED: ALTITUDE ' + Math.max(0, Math.round(descentTimer * 2000)) + 'm';
        }
      }
      if (descentTimer <= 0) {
        descentActive = false;
        hide();
        if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
      }
    }

    updateReadouts();
    drawNavball();
    renderer.render(scene, camera);
  }

  function handleKeyboardInput(dt) {
    var changed = false;
    if (keysDown['KeyW'] || keysDown['ArrowUp']) {
      throttle = clamp(throttle + dt * 0.6, 0, 1);
      pitch = clamp(pitch - dt * 2.0, -1, 1);
      changed = true;
    } else if (keysDown['KeyS'] || keysDown['ArrowDown']) {
      throttle = clamp(throttle - dt * 0.6, 0, 1);
      pitch = clamp(pitch + dt * 2.0, -1, 1);
      changed = true;
    } else {
      pitch = lerp(pitch, 0, dt * 4);
    }

    if (keysDown['KeyA'] || keysDown['ArrowLeft']) {
      heading = clamp(heading - dt * 65, -180, 180);
      changed = true;
    } else if (keysDown['KeyD'] || keysDown['ArrowRight']) {
      heading = clamp(heading + dt * 65, -180, 180);
      changed = true;
    }

    boost = !!(keysDown['Space'] || keysDown['ShiftLeft'] || keysDown['ShiftRight']);

    if (changed) {
      updateThrottleLabels();
      sendThrust();
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  LIFECYCLE & EVENTS
   * ──────────────────────────────────────────────────────────── */
  function show() {
    if (!root || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing') return;
    if (!RTM.Net.isPilot() && !RTM.Net.isHost()) {
      if (RTM.HUD) RTM.HUD.showNotification('Only the pilot or host can access the flight console.', 'error');
      return;
    }

    buildScene();
    open = true;
    root.classList.add('open');
    document.body.classList.add('cockpit-open');
    if (RTM.Ship) RTM.Ship.setActive(false);
    if (RTM.Moon) RTM.Moon.setActive(false);

    var thrust = gameState.pilotThrust || {};
    var localThrust = thrust.playerId === RTM.Net.playerId ? thrust : { throttle: 0, heading: 0 };
    throttle = Number(localThrust.throttle) || 0;
    heading = Number(localThrust.heading) || 0;
    updateThrottleLabels();
    updateReadouts();
    resize();

    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);

    if (RTM.HUD) RTM.HUD.showNotification('3D Space Flight Controls Active! Use W/S for Throttle, A/D to Steer, C for Camera.', 'info');
  }

  function hide() {
    if (!open) return;
    open = false;
    if (root) root.classList.remove('open');
    document.body.classList.remove('cockpit-open');
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
  }

  function leaveSeat() {
    if (!RTM.Net) return;
    if (RTM.Net.isPilot()) RTM.Net.emit('pilot:seat:release');
    hide();
  }

  function land() {
    if (!RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.moon && gameState.moon.state !== 'orbit') return;
    if (gameState.telemetry.fuel < 10 || gameState.telemetry.o2 < 12) {
      if (RTM.HUD) RTM.HUD.showNotification('Not enough fuel or oxygen for lunar landing!', 'error');
      return;
    }
    descentActive = true;
    descentTimer = 5.0; // 5-second descent animation
    if (els.status) els.status.textContent = 'INITIATING 3D LUNAR DESCENT SEQUENCE...';
    RTM.Net.emit('moon:land');
  }

  function resize() {
    if (!renderer || !camera) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function bindPointerFlight(element) {
    if (!element || element.dataset.flightPointerBound) return;
    element.dataset.flightPointerBound = '1';
    element.addEventListener('pointerdown', function (event) {
      if (!open) return;
      mouseActive = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (element.setPointerCapture) {
        try { element.setPointerCapture(event.pointerId); } catch (_) {}
      }
    });
    element.addEventListener('pointermove', function (event) {
      if (!open || !mouseActive) return;
      var dx = event.clientX - pointerX;
      var dy = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      heading = clamp(heading + dx * 0.18, -180, 180);
      pitch = clamp(pitch + dy * 0.006, -1, 1);
      updateThrottleLabels();
      sendThrust();
    });
    window.addEventListener('pointerup', function () {
      mouseActive = false;
    });
  }

  function drawNavball() {
    if (!els.navball) return;
    var canvas = els.navball;
    var g = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var radius = Math.min(w, h) / 2 - 5;
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.clip();

    g.translate(cx, cy);
    g.rotate(-roll);
    var horizon = pitch * radius * 0.65;
    g.fillStyle = '#1e4f78';
    g.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2 + horizon);
    g.fillStyle = '#6b4b2e';
    g.fillRect(-radius * 2, horizon, radius * 4, radius * 2);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-radius, horizon);
    g.lineTo(radius, horizon);
    g.stroke();

    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1;
    for (var i = -2; i <= 2; i++) {
      if (i === 0) continue;
      var py = horizon + i * radius * 0.2;
      var half = radius * (0.24 - Math.abs(i) * 0.035);
      g.beginPath();
      g.moveTo(-half, py);
      g.lineTo(half, py);
      g.stroke();
    }
    g.restore();

    g.strokeStyle = '#38fedc';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.stroke();

    g.strokeStyle = '#f5f557';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - 10, cy);
    g.lineTo(cx - 3, cy);
    g.moveTo(cx + 3, cy);
    g.lineTo(cx + 10, cy);
    g.moveTo(cx, cy - 3);
    g.lineTo(cx, cy + 3);
    g.stroke();

    g.fillStyle = '#9fefff';
    g.font = 'bold 10px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(Math.round(heading)).padStart(3, '0') + '°', cx, cy + radius - 7);
  }

  function onKeyDown(event) {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;
    keysDown[event.code] = true;

    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      leaveSeat();
    } else if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      toggleCameraMode();
    } else if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      land();
    }
  }

  function onKeyUp(event) {
    keysDown[event.code] = false;
  }

  function init() {
    buildDom();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resize);

    if (RTM.Net) {
      RTM.Net.on('moon:state', function (data) {
        if (open) {
          updateReadouts();
          if (data && data.state === 'landed') {
            hide();
          }
        }
      });
      RTM.Net.on('meeting:started', hide);
      RTM.Net.on('game:ended', hide);
      RTM.Net.on('pilot:seat:unlocked', function () {
        if (open && !RTM.Net.isHost()) hide();
        else updateReadouts();
      });
      RTM.Net.on('pilot:seat:updated', function () {
        if (open && !RTM.Net.isPilot() && !RTM.Net.isHost()) hide();
        else updateReadouts();
      });
      RTM.Net.on('telemetry:updated', function () {
        if (open) updateReadouts();
      });
    }
  }

  return {
    init: init,
    show: show,
    hide: hide,
    isOpen: function () { return open; },
    toggleCameraMode: toggleCameraMode,
    land: land,
    leaveSeat: leaveSeat,
    update: updateReadouts,
    _pendingAutoOpen: false
  };
})();
