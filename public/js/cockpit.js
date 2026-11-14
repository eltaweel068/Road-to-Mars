window.RTM = window.RTM || {};
window.RTM.Cockpit = (function () {
  'use strict';

  var root = null;
  var scene = null;
  var camera = null;
  var renderer = null;
  var composer = null;
  var rafId = null;
  var initialized = false;
  var built = false;
  var open = false;

  var shipGroup = null;
  var shipMesh = null;
  var thrusterPlumes = [];
  var navLights = [];
  var earthMesh = null;
  var moonMesh = null;
  var marsMesh = null;
  var marsMoonsGroup = null;
  var satellitePivot = null;
  var satelliteMesh = null;
  var roverMesh = null;
  var captureRing = null;
  var captureRing2 = null;
  var gateGroup = null;
  var gates = [];
  var trajectoryLine = null;
  var asteroidGroup = null;
  var starField = null;
  var nebulaLayers = [];
  var sunMesh = null;

  var els = {};
  var keysDown = {};
  var lastTime = 0;
  var lastThrustEmit = 0;
  var readoutTimer = 0;

  var yaw = 0;
  var pitch = 0;
  var manualRoll = 0;
  var autoRoll = 0;
  var mouseBank = 0;
  var throttle = 0;
  var boost = false;
  var cameraMode = 'chase';
  var baseFov = 65;
  var descentActive = false;
  var descentTimer = 0;
  var descentTarget = null;
  var captureTriggered = false;
  var hasFlown = false;

  var mouseActive = false;
  var pointerX = 0;
  var pointerY = 0;
  var pendingAutoOpen = false;

  var MODEL_BASE = '/assets/kenney_space-kit/Models/GLTF%20format/';
  var SHIP_URLS = [
    MODEL_BASE + 'craft_speederA.glb',
    MODEL_BASE + 'craft_cargoA.glb'
  ];

  var EARTH_POS = null;
  var MOON_POS = null;
  var MARS_POS = null;
  var MOON_RADIUS = 82;

  function initVectors() {
    if (!EARTH_POS) EARTH_POS = new THREE.Vector3(-680, -90, -1150);
    if (!MOON_POS) MOON_POS = new THREE.Vector3(430, 100, -880);
    if (!MARS_POS) MARS_POS = new THREE.Vector3(260, -90, -2650);
  }

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
    },
    {
      id: 'itokawa',
      name: 'Asteroid 25143 Itokawa',
      url: '/nasa-models/Asteroid 25143 Itokawa.stl',
      scale: 0.035,
      type: 'stl',
      fact: 'Contact binary rubble pile asteroid visited by JAXA Hayabusa.'
    }
  ];

  var nasaGeometryCache = {};
  var activeLasers = [];
  var activeMissiles = [];
  var lastMissileFireTime = 0;
  var MISSILE_COOLDOWN = 3000;
  var missileMaterial = null;
  var activeObstacles = [];
  var explosionParticles = [];
  var obstaclesClearedCount = 0;
  var laserMaterial = null;
  var cameraShakeTime = 0;
  var asteroidNoiseTexture = null;
  var asteroidThermalTexture = null;
  var lootOrbs = [];
  var spaceDust = null;
  var DUST_COUNT = 250;
  var nebulaSkybox = null;
  var cannonHeat = 280;

  function prepareRealisticAsteroidGeometry(geometry) {
    geometry.center();
    geometry.computeBoundingSphere();
    var r = (geometry.boundingSphere && geometry.boundingSphere.radius) || 1;
    var scale = 1 / r;
    geometry.scale(scale, scale, scale);

    var pos = geometry.attributes.position;
    var count = pos.count;
    var uvs = new Float32Array(count * 2);

    for (var i = 0; i < count; i++) {
      var vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      var len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      var nx = vx / len, ny = vy / len, nz = vz / len;

      // Spherical UV projection so bump/roughness maps wrap cleanly on NASA .stl scans
      var u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
      var v = 0.5 - Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI;
      uvs[i * 2] = u * 3.0;
      uvs[i * 2 + 1] = v * 3.0;

      // Micro-ridge rocky perturbation
      var crag = 1.0 + 0.06 * Math.sin(nx * 14.0 + ny * 9.0) * Math.cos(nz * 12.0);
      pos.setXYZ(i, vx * crag, vy * crag, vz * crag);
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
  }

  function createAsteroidMaterial(noiseTex, crackTex) {
    return new THREE.MeshStandardMaterial({
      color: 0x6e685f,
      roughness: 0.86,
      metalness: 0.24,
      bumpMap: noiseTex || null,
      bumpScale: 1.6,
      emissive: new THREE.Color(0xff3b00),
      emissiveMap: crackTex || noiseTex || null,
      emissiveIntensity: 0.0 // Ramps up to 2.5 as the asteroid takes laser hits!
    });
  }

  function getAsteroidMaterial(colorHex) {
    var loader = (typeof THREE.TextureLoader !== 'undefined') ? new THREE.TextureLoader() : null;
    if (loader && !asteroidNoiseTexture) {
      asteroidNoiseTexture = loader.load('/assets/kenney_planets/Parts/noise05.png');
      asteroidNoiseTexture.wrapS = THREE.RepeatWrapping;
      asteroidNoiseTexture.wrapT = THREE.RepeatWrapping;
      asteroidNoiseTexture.repeat.set(2.5, 2.5);
    }
    if (loader && !asteroidThermalTexture) {
      asteroidThermalTexture = loader.load('/assets/kenney_planets/Parts/noise02.png');
      asteroidThermalTexture.wrapS = THREE.RepeatWrapping;
      asteroidThermalTexture.wrapT = THREE.RepeatWrapping;
      asteroidThermalTexture.repeat.set(2.0, 2.0);
    }
    return createAsteroidMaterial(asteroidNoiseTexture, asteroidThermalTexture);
  }

  function createNebulaSkybox() {
    var geo = new THREE.SphereGeometry(4200, 32, 32);
    var mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: [
        'varying vec3 vWorldPos;',
        'void main() {',
        '  vWorldPos = position;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vWorldPos;',
        'uniform float uTime;',
        'float hash(vec3 p) {',
        '  p = fract(p * 0.3183099 + 0.1);',
        '  p *= 17.0;',
        '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
        '}',
        'float noise(vec3 x) {',
        '  vec3 i = floor(x); vec3 f = fract(x);',
        '  f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),',
        '                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),',
        '             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),',
        '                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);',
        '}',
        'void main() {',
        '  vec3 dir = normalize(vWorldPos);',
        '  float n1 = noise(dir * 3.5 + uTime * 0.01);',
        '  float n2 = noise(dir * 8.0 - uTime * 0.015);',
        '  float neb = smoothstep(0.38, 0.78, n1 * 0.65 + n2 * 0.35);',
        '  vec3 deepSpace = vec3(0.01, 0.015, 0.04);',
        '  vec3 colA = vec3(0.08, 0.28, 0.55);',
        '  vec3 colB = vec3(0.52, 0.12, 0.38);',
        '  vec3 col = mix(deepSpace, mix(colA, colB, n2), neb * 0.65);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    return new THREE.Mesh(geo, mat);
  }

  function createFresnelHalo(radius, hexColor) {
    var geo = new THREE.SphereGeometry(radius * 1.14, 32, 32);
    var mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: { uColor: { value: new THREE.Color(hexColor) } },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec3 vViewPosition;',
        'void main() {',
        '  vNormal = normalize(normalMatrix * normal);',
        '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
        '  vViewPosition = -mvPos.xyz;',
        '  gl_Position = projectionMatrix * mvPos;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'varying vec3 vViewPosition;',
        'uniform vec3 uColor;',
        'void main() {',
        '  vec3 viewDir = normalize(vViewPosition);',
        '  float rim = 1.0 - max(0.0, dot(viewDir, vNormal));',
        '  float glow = pow(rim, 3.2) * 1.35;',
        '  gl_FragColor = vec4(uColor, glow);',
        '}'
      ].join('\n')
    });
    return new THREE.Mesh(geo, mat);
  }

  function buildSpaceDust() {
    var geo = new THREE.BufferGeometry();
    var positions = new Float32Array(DUST_COUNT * 6);
    for (var i = 0; i < DUST_COUNT; i++) {
      var x = (Math.random() - 0.5) * 240;
      var y = (Math.random() - 0.5) * 140;
      var z = -Math.random() * 260;
      var len = 4.0;
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + len;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.LineBasicMaterial({
      color: 0x38fedc,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    spaceDust = new THREE.LineSegments(geo, mat);
    scene.add(spaceDust);
  }

  function updateSpaceDust(dt) {
    if (!spaceDust || !camera) return;
    var posAttr = spaceDust.geometry.getAttribute('position');
    var positions = posAttr.array;
    var speedMultiplier = boost ? 320 : (throttle > 0 ? 140 * throttle : 35);
    var streakLen = boost ? 26.0 : (throttle > 0 ? 9.0 * throttle : 3.5);

    for (var i = 0; i < DUST_COUNT; i++) {
      var idx = i * 6;
      positions[idx + 2] += speedMultiplier * dt;
      positions[idx + 5] = positions[idx + 2] + streakLen;

      if (positions[idx + 2] > camera.position.z + 10) {
        var rx = camera.position.x + (Math.random() - 0.5) * 220;
        var ry = camera.position.y + (Math.random() - 0.5) * 140;
        var rz = camera.position.z - 220 - Math.random() * 60;
        positions[idx] = rx;
        positions[idx + 1] = ry;
        positions[idx + 2] = rz;
        positions[idx + 3] = rx;
        positions[idx + 4] = ry;
        positions[idx + 5] = rz + streakLen;
      }
    }
    posAttr.needsUpdate = true;
  }

  function spawnFireballFlash(pos) {
    var flashLight = new THREE.PointLight(0xff6600, 8.0, 140);
    flashLight.position.copy(pos);
    scene.add(flashLight);
    var timer = 0.4;
    function fadeFlash() {
      timer -= 0.035;
      if (timer > 0) {
        flashLight.intensity = Math.max(0, (timer / 0.4) * 8.0);
        requestAnimationFrame(fadeFlash);
      } else {
        scene.remove(flashLight);
      }
    }
    fadeFlash();
  }

  function spawnLootOrbs(pos) {
    for (var i = 0; i < 2; i++) {
      var orbGeo = new THREE.SphereGeometry(1.2, 12, 12);
      var orbMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x38fedc : 0xf5f557
      });
      var orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6));
      orb.userData = {
        type: i === 0 ? 'science' : 'fuel',
        birthTime: performance.now(),
        initialPos: orb.position.clone(),
        duration: 800
      };
      scene.add(orb);
      lootOrbs.push(orb);
    }
  }

  function preloadNasaModels(onReady) {
    if (typeof THREE.STLLoader === 'undefined') {
      if (onReady) onReady();
      return;
    }
    var stlLoader = new THREE.STLLoader();
    var loadedCount = 0;

    NASA_MODELS.forEach(function (item) {
      stlLoader.load(item.url, function (geometry) {
        prepareRealisticAsteroidGeometry(geometry);
        nasaGeometryCache[item.id] = {
          geometry: geometry,
          meta: item
        };
        loadedCount++;
        if (loadedCount >= NASA_MODELS.length && onReady) onReady();
      }, undefined, function (err) {
        console.warn('NASA model load notice:', item.name, err);
        loadedCount++;
        if (loadedCount >= NASA_MODELS.length && onReady) onReady();
      });
    });
  }

  var lastLaserFireTime = 0;
  var LASER_FIRE_INTERVAL = 160;
  var pointerFiring = false;
  var shockwaveRings = [];
  var asteroidFragments = [];

  function fireLaserCannons() {
    if (!shipGroup || !open) return;
    var now = performance.now();
    if (now - lastLaserFireTime < LASER_FIRE_INTERVAL) return;
    lastLaserFireTime = now;
    cannonHeat = Math.min(850, cannonHeat + 25);

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

    // Auto-aim magnetic assist (within ~18 degrees cone)
    var aimDir = forwardDir.clone();
    var closestDist = 450;
    for (var a = 0; a < activeObstacles.length; a++) {
      var obst = activeObstacles[a];
      var toObst = obst.position.clone().sub(shipGroup.position);
      var dist = toObst.length();
      if (dist < closestDist) {
        var dirToObst = toObst.normalize();
        if (forwardDir.dot(dirToObst) > 0.94) {
          aimDir.lerp(dirToObst, 0.45).normalize();
          break;
        }
      }
    }

    var boltL = createLaserBolt(leftWorld, aimDir, shipGroup.quaternion);
    var boltR = createLaserBolt(rightWorld, aimDir, shipGroup.quaternion);

    scene.add(boltL);
    scene.add(boltR);
    activeLasers.push(boltL, boltR);

    // Camera subtle recoil
    if (camera) {
      camera.position.z += 0.25;
    }
  }

  function fireHomingMissile() {
    if (!shipGroup || !open) return;
    var now = performance.now();
    if (now - lastMissileFireTime < MISSILE_COOLDOWN) return;
    lastMissileFireTime = now;
    cannonHeat = Math.min(850, cannonHeat + 40);

    if (RTM.Audio) {
      if (!RTM.Audio.play('missile', 0.8)) {
        RTM.Audio.play('bang', 0.8);
      }
    }

    // Find best target ahead of ship
    var forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
    var shipPos = shipGroup.position;
    var bestTarget = null;
    var bestScore = -Infinity;

    for (var o = 0; o < activeObstacles.length; o++) {
      var obst = activeObstacles[o];
      var toObst = obst.position.clone().sub(shipPos);
      var dist = toObst.length();
      if (dist > 650 || dist < 10) continue;
      toObst.normalize();
      var dot = forwardDir.dot(toObst);
      if (dot > 0.35) {
        var score = dot * 1000 - dist;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = obst;
        }
      }
    }

    var geo = new THREE.CylinderGeometry(0.35, 0.45, 4.2, 8);
    geo.rotateX(Math.PI / 2);
    if (!missileMaterial) {
      missileMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xff4400,
        emissiveIntensity: 0.8
      });
    }
    var missile = new THREE.Mesh(geo, missileMaterial);
    var spawnLocal = new THREE.Vector3(0, -1.2, -3.0);
    var spawnWorld = spawnLocal.applyMatrix4(shipGroup.matrixWorld);
    missile.position.copy(spawnWorld);
    missile.quaternion.copy(shipGroup.quaternion);

    missile.userData = {
      target: bestTarget,
      velocity: forwardDir.clone().multiplyScalar(220),
      speed: 220,
      life: 5.0,
      trailTimer: 0
    };

    scene.add(missile);
    activeMissiles.push(missile);

    if (camera) {
      camera.position.z += 0.5;
    }
  }

  function createLaserBolt(pos, dir, quat) {
    var group = new THREE.Group();
    // Inner white plasma core
    var coreGeo = new THREE.CylinderGeometry(0.14, 0.14, 8.5, 8);
    coreGeo.rotateX(Math.PI / 2);
    var coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Outer additive cyan halo
    var haloGeo = new THREE.CylinderGeometry(0.36, 0.36, 9.2, 8);
    haloGeo.rotateX(Math.PI / 2);
    var haloMat = new THREE.MeshBasicMaterial({
      color: 0x38fedc,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    var haloMesh = new THREE.Mesh(haloGeo, haloMat);
    group.add(haloMesh);

    group.position.copy(pos);
    group.quaternion.copy(quat);
    group.userData = {
      velocity: dir.clone().multiplyScalar(440),
      distanceTraveled: 0
    };
    return group;
  }

  function spawnObstacleWave() {
    obstaclesClearedCount = 0;
    var asteroidKeys = Object.keys(nasaGeometryCache);
    var shipPos = shipGroup ? shipGroup.position : new THREE.Vector3();
    var shipQuat = shipGroup ? shipGroup.quaternion : new THREE.Quaternion();
    var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat).normalize();
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat).normalize();
    var up = new THREE.Vector3(0, 1, 0).applyQuaternion(shipQuat).normalize();

    for (var i = 0; i < 18; i++) {
      var isNasaAsteroid = i % 2 === 0 && asteroidKeys.length > 0;
      var mesh;
      var meta = null;

      if (isNasaAsteroid) {
        var key = asteroidKeys[i % asteroidKeys.length];
        var cached = nasaGeometryCache[key];
        var mat = getAsteroidMaterial(0x8c8985);
        mesh = new THREE.Mesh(cached.geometry, mat);
        mesh.scale.setScalar(cached.meta.scale * (1.5 + Math.random() * 0.8));
        meta = cached.meta;
      } else {
        var brickGeo = new THREE.BoxGeometry(6, 4, 3);
        var brickMat = new THREE.MeshStandardMaterial({
          color: 0xef7d0d,
          roughness: 0.4,
          metalness: 0.6
        });
        mesh = new THREE.Mesh(brickGeo, brickMat);
        meta = { name: 'Cosmic Space Debris', fact: 'Orbital booster stage fragment.' };
      }

      var distAhead = 180 + (i * 45);
      var lateral = (Math.random() - 0.5) * 80;
      var vertical = (Math.random() - 0.5) * 45;

      mesh.position.copy(shipPos)
        .addScaledVector(forward, distAhead)
        .addScaledVector(right, lateral)
        .addScaledVector(up, vertical);

      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        hp: 2,
        maxHp: 2,
        flashTimer: 0,
        rotSpeedX: (Math.random() - 0.5) * 1.5,
        rotSpeedY: (Math.random() - 0.5) * 1.5,
        radius: 4.5,
        meta: meta,
        velocity: forward.clone().multiplyScalar(-42)
      };

      scene.add(mesh);
      activeObstacles.push(mesh);
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

  function spawnContinuousAsteroids() {
    if (!open || !shipGroup) return;
    if (activeObstacles.length >= 24) return;

    var asteroidKeys = Object.keys(nasaGeometryCache);
    var isNasa = asteroidKeys.length > 0 && Math.random() > 0.4;
    var mesh, meta;

    if (isNasa) {
      var key = asteroidKeys[Math.floor(Math.random() * asteroidKeys.length)];
      var cached = nasaGeometryCache[key];
      var mat = getAsteroidMaterial(0x9a9892);
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

    var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(shipGroup.quaternion).normalize();
    var up = new THREE.Vector3(0, 1, 0).applyQuaternion(shipGroup.quaternion).normalize();

    var distAhead = 380 + Math.random() * 260;
    var lateral = (Math.random() - 0.5) * 220;
    var vertical = (Math.random() - 0.5) * 140;

    mesh.position.copy(shipGroup.position)
      .addScaledVector(forward, distAhead)
      .addScaledVector(right, lateral)
      .addScaledVector(up, vertical);

    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.userData = {
      hp: 2,
      maxHp: 2,
      radius: 5.5,
      rotSpeedX: (Math.random() - 0.5) * 1.8,
      rotSpeedY: (Math.random() - 0.5) * 1.8,
      meta: meta,
      flashTimer: 0,
      velocity: forward.clone().multiplyScalar(-42)
    };

    scene.add(mesh);
    activeObstacles.push(mesh);
  }

  function spawnShockwaveRing(pos) {
    var geo = new THREE.RingGeometry(1, 2.4, 32);
    var mat = new THREE.MeshBasicMaterial({
      color: 0x38fedc,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    var ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    if (camera) ring.lookAt(camera.position);
    ring.userData = { life: 0.45, maxLife: 0.45, currentScale: 1.0, maxScale: 22.0 };
    scene.add(ring);
    shockwaveRings.push(ring);
  }

  function spawnFragments(parentObst) {
    spawnFireballFlash(parentObst.position);
    spawnLootOrbs(parentObst.position);
    var radius = (parentObst.userData && parentObst.userData.radius) || 4.5;
    var count = 6 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var fragGeo = new THREE.DodecahedronGeometry(radius * 0.28, 1);
      var fragMat = new THREE.MeshStandardMaterial({
        color: 0x6e6860,
        roughness: 0.85,
        emissive: 0xff3b00,
        emissiveIntensity: 0.85
      });
      var frag = new THREE.Mesh(fragGeo, fragMat);
      frag.position.copy(parentObst.position);
      var dir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      var speed = 18 + Math.random() * 24; // 18..42
      frag.userData = {
        vx: dir.x * speed,
        vy: dir.y * speed,
        vz: dir.z * speed,
        rotSpeed: (Math.random() - 0.5) * 8.0,
        life: 3.5
      };
      scene.add(frag);
      asteroidFragments.push(frag);
    }
  }

  function shakeCockpitCamera() {
    cameraShakeTime = 0.35;
  }

  function showCockpitScanPopup(meta) {
    if (!meta) return;
    var popup = document.getElementById('cockpitScanPopup');
    if (!popup) return;
    popup.innerHTML = '<div class="cockpit-scan-title">🔍 ' + meta.name + '</div>' +
                      '<div class="cockpit-scan-fact">' + (meta.fact || '') + '</div>';
    popup.style.display = 'block';
    setTimeout(function () {
      if (popup) popup.style.display = 'none';
    }, 4000);
  }

  function restoreAutopilot() {
    if (RTM.Net) {
      var state = RTM.Net.getState();
      state.telemetry.autopilot = true;
      state.telemetry.marsProgress = Math.min(100, (state.telemetry.marsProgress || 0) + 10);
      RTM.Net.emit('cockpit:wave:cleared');
    }
    if (RTM.Audio) RTM.Audio.play('lockondone');

    var banner = document.getElementById('cockpitWaveBanner');
    if (banner) {
      banner.className = 'cockpit-banner banner-success';
      banner.innerHTML = '🎉 ASTEROID FIELD CLEARED! AUTOPILOT RESTORED (+10% PROGRESS)!';
      banner.style.display = 'block';
      setTimeout(function () { if (banner) banner.style.display = 'none'; }, 4000);
    }
  }

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

          if (obst.userData.hp > 0) {
            // First Hit: Knockback + Orange Flash + Sparks + Emissive crack ramp
            if (RTM.Audio) RTM.Audio.play('hit', 0.7);
            if (obst.material) {
              if (obst.material.emissive) {
                obst.material.emissive.setHex(0xff3b00);
              }
              obst.material.emissiveIntensity = 1.8 * (1 - obst.userData.hp / obst.userData.maxHp);
              obst.userData.flashTimer = 0.15;
            }
            obst.position.addScaledVector(laser.userData.velocity.clone().normalize(), 6.0);
            obst.userData.rotSpeedX *= 2.2;
            obst.userData.rotSpeedY *= 2.2;
            createExplosionParticles(laser.position, 10);
          } else if (obst.userData.hp <= 0) {
            // Shatter into fragments + shockwave + rewards
            if (RTM.Audio) {
              if (!RTM.Audio.play('explosion', 0.95)) {
                RTM.Audio.play('bang', 0.95);
              }
            }
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

            if (obst.parent) obst.parent.remove(obst);
            else scene.remove(obst);
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

    // 1b. Homing Space Missiles
    for (var m = activeMissiles.length - 1; m >= 0; m--) {
      var missile = activeMissiles[m];
      missile.userData.life -= dt;
      if (missile.userData.life <= 0) {
        scene.remove(missile);
        activeMissiles.splice(m, 1);
        continue;
      }

      var target = missile.userData.target;
      if (target && (target.parent || scene.children.indexOf(target) !== -1)) {
        var toTarget = target.position.clone().sub(missile.position).normalize();
        var currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(missile.quaternion);
        currentDir.lerp(toTarget, Math.min(1.0, dt * 6.0)).normalize();
        missile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), currentDir);
        missile.userData.velocity.copy(currentDir).multiplyScalar(missile.userData.speed);
      }

      var mStep = missile.userData.velocity.clone().multiplyScalar(dt);
      missile.position.add(mStep);

      missile.userData.trailTimer += dt;
      if (missile.userData.trailTimer > 0.04) {
        missile.userData.trailTimer = 0;
        createExplosionParticles(missile.position, 1);
      }

      var missileHit = false;
      for (var mo = activeObstacles.length - 1; mo >= 0; mo--) {
        var mObst = activeObstacles[mo];
        if (missile.position.distanceTo(mObst.position) < (mObst.userData.radius || 5.0) + 3.5) {
          if (RTM.Audio) {
            if (!RTM.Audio.play('explosion', 0.95)) {
              RTM.Audio.play('bang', 0.95);
            }
          }
          createExplosionParticles(mObst.position, 40);
          spawnShockwaveRing(mObst.position);
          spawnFragments(mObst);

          if (RTM.Net) {
            var sState = RTM.Net.getState();
            sState.telemetry.science = (sState.telemetry.science || 0) + 15;
            sState.telemetry.marsProgress = Math.min(100, (sState.telemetry.marsProgress || 0) + 3);
            RTM.Net.emit('cockpit:obstacle:cleared');
          }
          showCockpitScanPopup(mObst.userData.meta);

          if (mObst.parent) mObst.parent.remove(mObst);
          else scene.remove(mObst);
          activeObstacles.splice(mo, 1);
          obstaclesClearedCount++;
          if (obstaclesClearedCount >= 8) {
            restoreAutopilot();
          }

          scene.remove(missile);
          activeMissiles.splice(m, 1);
          missileHit = true;
          break;
        }
      }
      if (missileHit) continue;
    }

    // 1c. Mineral Science / Fuel Loot Orbs Tractor Beam
    for (var lo = lootOrbs.length - 1; lo >= 0; lo--) {
      var orb = lootOrbs[lo];
      var age = (performance.now() - orb.userData.birthTime) / 1000;
      if (shipGroup) {
        var toShipPos = shipGroup.position.clone();
        orb.position.lerp(toShipPos, Math.min(1.0, dt * 6.5));
        var orbDist = orb.position.distanceTo(shipGroup.position);
        if (orbDist < 5.0 || age > 2.5) {
          if (RTM.Audio) RTM.Audio.play('hit', 0.5);
          if (RTM.Net) {
            var st = RTM.Net.getState();
            if (orb.userData.type === 'science') {
              st.telemetry.science = (st.telemetry.science || 0) + 10;
            } else {
              st.telemetry.fuel = Math.min(100, (st.telemetry.fuel || 0) + 2);
            }
          }
          if (RTM.HUD && RTM.HUD.showNotification) {
            RTM.HUD.showNotification(orb.userData.type === 'science' ? '+10 SCIENCE EXTRACTED!' : '+2% REFUEL TRACTORED!', 'success');
          }
          scene.remove(orb);
          lootOrbs.splice(lo, 1);
          continue;
        }
      }
    }

    // 2. Continuous Spawning & Movement of Asteroids
    spawnContinuousAsteroids();

    for (var k = activeObstacles.length - 1; k >= 0; k--) {
      var obs = activeObstacles[k];
      var moveVel = obs.userData.velocity;
      if (moveVel) {
        obs.position.addScaledVector(moveVel, dt);
      } else if (shipGroup) {
        var toShip = shipGroup.position.clone().sub(obs.position).normalize();
        obs.position.addScaledVector(toShip, 42 * dt);
      } else {
        obs.position.z += 42 * dt;
      }
      obs.rotation.x += (obs.userData.rotSpeedX || 0.4) * dt;
      obs.rotation.y += (obs.userData.rotSpeedY || 0.4) * dt;

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
            s.telemetry.gyroDrift = Math.min(100, (s.telemetry.gyroDrift || 0) + 18);
            RTM.Net.emit('cockpit:obstacle:hit');
          }

          if (obs.parent) obs.parent.remove(obs);
          else scene.remove(obs);
          activeObstacles.splice(k, 1);
          continue;
        }

        var forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
        var toObs = obs.position.clone().sub(shipGroup.position);
        if (toObs.dot(forwardVec) < -40 || toObs.length() > 900) {
          if (obs.parent) obs.parent.remove(obs);
          else scene.remove(obs);
          activeObstacles.splice(k, 1);
        }
      }
    }

    // 3. Shockwave Rings
    for (var r = shockwaveRings.length - 1; r >= 0; r--) {
      var ring = shockwaveRings[r];
      ring.userData.life -= dt;
      var progress = 1.0 - Math.max(0, ring.userData.life / ring.userData.maxLife);
      var sc = ring.userData.currentScale + (ring.userData.maxScale - ring.userData.currentScale) * progress;
      ring.scale.set(sc, sc, sc);
      ring.material.opacity = Math.max(0, (1.0 - progress) * 0.95);
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function normalizeDeg(deg) {
    return ((deg + 180) % 360 + 360) % 360 - 180;
  }

  function makeGlowTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');
    var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.18, 'rgba(255,238,150,0.9)');
    g.addColorStop(0.45, 'rgba(255,150,50,0.35)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  function makeMoonTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#aaa8a2';
    ctx.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 900; i++) {
      var shade = 135 + Math.floor(Math.random() * 50);
      ctx.fillStyle = 'rgba(' + shade + ',' + shade + ',' + (shade - 4) + ',0.25)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 5);
    }
    for (var c = 0; c < 55; c++) {
      var x = Math.random() * 512;
      var y = Math.random() * 512;
      var r = 5 + Math.random() * 24;
      ctx.fillStyle = 'rgba(72,72,70,0.38)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(215,213,205,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }
    var texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  function createAtmosphere(radius, color, intensity) {
    var material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec3 vEye;',
        'void main() {',
        '  vNormal = normalize(normalMatrix * normal);',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vEye = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'uniform float uIntensity;',
        'varying vec3 vNormal;',
        'varying vec3 vEye;',
        'void main() {',
        '  float rim = pow(1.0 - max(dot(vNormal, vEye), 0.0), 3.0);',
        '  gl_FragColor = vec4(uColor, rim * uIntensity);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material);
    mesh.scale.setScalar(1.14);
    return mesh;
  }

  function createNebula(radius, colorA, colorB, opacity, spin) {
    var material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) }
      },
      vertexShader: [
        'varying vec3 vWorld;',
        'void main() {',
        '  vec4 world = modelMatrix * vec4(position, 1.0);',
        '  vWorld = world.xyz;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime;',
        'uniform float uOpacity;',
        'uniform vec3 uColorA;',
        'uniform vec3 uColorB;',
        'varying vec3 vWorld;',
        'float hash(vec3 p) {',
        '  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));',
        '  p *= 17.0;',
        '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
        '}',
        'float noise(vec3 x) {',
        '  vec3 i = floor(x);',
        '  vec3 f = fract(x);',
        '  f = f * f * (3.0 - 2.0 * f);',
        '  return mix(',
        '    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),',
        '    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),',
        '    f.z);',
        '}',
        'float fbm(vec3 p) {',
        '  float value = 0.0;',
        '  float amp = 0.5;',
        '  for (int i = 0; i < 5; i++) {',
        '    value += amp * noise(p);',
        '    p *= 2.03;',
        '    amp *= 0.5;',
        '  }',
        '  return value;',
        '}',
        'void main() {',
        '  vec3 dir = normalize(vWorld);',
        '  float n1 = fbm(dir * 3.0 + vec3(uTime * 0.002, 0.0, 0.0));',
        '  float n2 = fbm(dir * 6.0 + vec3(11.0, 17.0, 5.0) - vec3(0.0, uTime * 0.0015, 0.0));',
        '  float filament = pow(max(0.0, n1 * 0.8 + n2 * 0.6 - 0.62), 2.0);',
        '  vec3 color = mix(uColorA, uColorB, n1);',
        '  color += uColorB * filament * 1.8;',
        '  color += vec3(0.10, 0.28, 0.38) * pow(n2, 3.0);',
        '  float alpha = (0.04 + 0.35 * filament + 0.08 * n1) * uOpacity;',
        '  gl_FragColor = vec4(color, alpha);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), material);
    mesh.rotation.z = spin;
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return mesh;
  }

  function buildStars() {
    var count = 6000;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var sizes = new Float32Array(count);
    var phases = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      var radius = 6000 + Math.random() * 3600;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      var tint = Math.random();
      if (tint > 0.86) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.72; colors[i * 3 + 2] = 0.48;
      } else if (tint > 0.68) {
        colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.72; colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.93; colors[i * 3 + 2] = 1.0;
      }
      sizes[i] = 1.2 + Math.random() * 3.1;
      phases[i] = Math.random() * Math.PI * 2;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    var material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: [
        'uniform float uTime;',
        'uniform float uPixelRatio;',
        'attribute float aSize;',
        'attribute float aPhase;',
        'attribute vec3 aColor;',
        'varying vec3 vColor;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float twinkle = 0.72 + 0.28 * sin(uTime * 2.4 + aPhase);',
        '  gl_PointSize = aSize * twinkle * uPixelRatio * clamp(900.0 / max(700.0, -mv.z), 0.45, 2.2);',
        '  vColor = aColor;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vColor;',
        'void main() {',
        '  float d = length(gl_PointCoord - vec2(0.5));',
        '  if (d > 0.5) discard;',
        '  float alpha = smoothstep(0.5, 0.04, d);',
        '  gl_FragColor = vec4(vColor, alpha * 0.95);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    starField = new THREE.Points(geometry, material);
    starField.frustumCulled = false;
    scene.add(starField);
  }

  function normalizeModel(object, targetSize) {
    var box = new THREE.Box3().setFromObject(object);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    var span = Math.max(size.x, size.y, size.z) || 1;
    var scale = targetSize / span;
    var group = new THREE.Group();
    group.scale.setScalar(scale);
    group.add(object);
    return group;
  }

  function loadFirstModel(urls, onLoad, onFail) {
    if (typeof THREE.GLTFLoader === 'undefined') {
      onFail();
      return;
    }
    var index = 0;
    var loader = new THREE.GLTFLoader();
    function next() {
      if (index >= urls.length) {
        onFail();
        return;
      }
      var url = urls[index++];
      loader.load(url, function (gltf) {
        onLoad(gltf.scene || gltf.scenes[0]);
      }, undefined, next);
    }
    next();
  }

  function buildDom() {
    root = document.getElementById('cockpit3d');
    if (!root) return;
    root.innerHTML = [
      '<div class="cockpit-vignette"></div>',
      '<div id="cockpitLockonBox" style="display:none; position:absolute; pointer-events:none; border:2px solid #ff3344; width:48px; height:48px; transform:translate(-50%, -50%); border-radius:8px; box-shadow:0 0 14px rgba(255,51,68,0.7); z-index:12;">' +
      '  <div id="cockpitLockonText" style="position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:bold; color:#ff3344; white-space:nowrap; text-shadow:1px 1px 0 #000;">TARGET LOCK</div>' +
      '  <div id="cockpitLockonBar" style="position:absolute; bottom:-10px; left:0; width:100%; height:4px; background:#111; border:1px solid #000; border-radius:2px;"><div id="cockpitLockonFill" style="width:100%; height:100%; background:#50ef39;"></div></div>' +
      '</div>',
      '<div id="cockpitWaveBanner" class="cockpit-banner" style="display:none; position:absolute; top:78px; left:50%; transform:translateX(-50%); background:rgba(197,17,17,0.92); border:3px solid #000; padding:10px 22px; border-radius:10px; font-weight:bold; z-index:10;"></div>',
      '<div id="cockpitScanPopup" class="cockpit-scan-popup" style="display:none; position:absolute; top:140px; left:24px; max-width:320px; background:rgba(10,22,38,0.92); border:3px solid #38fedc; padding:10px 14px; border-radius:10px; z-index:10;"></div>',
      '<div id="cockpitGyroHud" class="cockpit-gyro-hud" title="Click or Press [Y] to Calibrate IMU Gyro">' +
      '  <div class="cockpit-gyro-header">' +
      '    <span>3-AXIS IMU GYRO</span>' +
      '    <span id="cockpitGyroDriftBadge" style="color:#50ef39;">DRIFT: 0%</span>' +
      '  </div>' +
      '  <canvas id="cockpitGyroCanvas" width="140" height="140"></canvas>' +
      '  <div id="cockpitGyroDriftWarn" style="display:none;">⚠️ GYRO DRIFT DETECTED — PRESS [Y] TO CALIBRATE IMU</div>' +
      '</div>',
      '<div class="cockpit-hud">',
      '  <div class="cockpit-top">',
      '    <div class="cockpit-badge">RTM FLIGHT DECK · 6-DOF</div>',
      '    <div class="cockpit-sensors-hud">' +
      '      <div id="cockpitProximity" class="cockpit-sensor-box" style="color:#38fedc;">📡 PROXIMITY: CLEAR</div>' +
      '      <div id="cockpitFuelFlowWrap" class="cockpit-sensor-box" style="color:#ffb703;">' +
      '        <span id="cockpitFuelFlow">⛽ FLOW: 0.0 L/s</span>' +
      '        <button id="btnEmergencyFuelSynth" class="au-btn au-btn-yellow btn-sensor-synth" title="Emergency Sabatier Fuel Synthesis [R]">[R] FUEL SYNTH (+18%)</button>' +
      '      </div>' +
      '      <div id="cockpitThermal" class="cockpit-sensor-box" style="color:#7fe7ff;">🌡 THERMAL: 280°C</div>' +
      '    </div>',
      '    <div id="cockpitMissileIndicator" style="background:#1d2133; border:2px solid #38fedc; border-radius:6px; padding:3px 10px; font-size:11px; font-weight:bold; color:#38fedc;">MISSILE: READY [R-CLICK / G]</div>',
      '    <div class="cockpit-orbital" id="cockpitOrbital">HOHMANN TRANSFER</div>',
      '  </div>',
      '  <div class="cockpit-crosshair" id="cockpitCrosshair">⌖</div>',
      '  <div class="cockpit-targets" id="cockpitTargets">',
      '    <div class="cockpit-target-box" id="targetMoon">',
      '      <span class="target-name">MOON · CAPTURE RING [L TO LAND]</span>',
      '      <span class="target-dist" id="distMoon">-- KM</span>',
      '    </div>',
      '    <div class="cockpit-target-box" id="targetMars">',
      '      <span class="target-name">MARS · DESTINATION</span>',
      '      <span class="target-dist" id="distMars">-- KM</span>',
      '    </div>',
      '    <div class="cockpit-target-box cockpit-gate-box">',
      '      <span class="target-name">TRAJECTORY GATES</span>',
      '      <span class="target-dist" id="cockpitGateValue">0 / 5</span>',
      '    </div>',
      '  </div>',
      '  <div class="cockpit-dashboard">',
      '    <div class="cockpit-readouts">',
      '      <div class="cockpit-readout"><span>HULL</span><strong id="cockpitHull">100%</strong></div>',
      '      <div class="cockpit-readout"><span>FUEL</span><strong id="cockpitFuel">100%</strong></div>',
      '      <div class="cockpit-readout"><span>O2</span><strong id="cockpitO2">100%</strong></div>',
      '      <div class="cockpit-readout"><span>VELOCITY</span><strong id="cockpitSpeedValue">0.0</strong></div>',
      '      <div class="cockpit-readout"><span>HEADING</span><strong id="cockpitHeadingValue">000°</strong></div>',
      '      <div class="cockpit-readout"><span>PITCH</span><strong id="cockpitPitchValue">0°</strong></div>',
      '      <div class="cockpit-readout"><span>ROLL</span><strong id="cockpitRollValue">0°</strong></div>',
      '      <div class="cockpit-readout"><span>THROTTLE</span><strong id="cockpitThrottleValue">0%</strong></div>',
      '      <div class="cockpit-readout"><span>CAMERA</span><strong id="cockpitCamMode">CHASE (C)</strong></div>',
      '      <div class="cockpit-navball-wrap"><canvas id="cockpitNavball" width="96" height="96"></canvas><span>NAVBALL</span></div>',
      '    </div>',
      '    <div class="cockpit-controls">',
      '      <label class="cockpit-slider-label">THROTTLE · SHIFT / CTRL · 1–5',
      '        <input type="range" id="cockpitThrottle" min="0" max="100" step="1" value="0">',
      '      </label>',
      '      <div class="cockpit-control-help">W/S PITCH · A/D YAW · Q/E ROLL<br>B AFTERBURNER · SPACE FIRE LASERS · C CAMERA · L LAND</div>',
      '    </div>',
      '    <div class="cockpit-buttons">',
      '      <button class="au-btn au-btn-blue" id="cockpitCameraBtn">CAM: CHASE (C)</button>',
      '      <button class="au-btn au-btn-yellow" id="cockpitLandBtn">LAND ON MOON (L)</button>',
      '      <button class="au-btn au-btn-gray" id="cockpitLeaveBtn">LEAVE CONTROLS (ESC)</button>',
      '    </div>',
      '    <div class="cockpit-status" id="cockpitStatus">Flight deck online. W/S pitch · A/D yaw · Q/E roll · SHIFT/CTRL throttle · B afterburner · SPACE fire lasers.</div>',
      '  </div>',
      '</div>'
    ].join('');

    els.orbital = document.getElementById('cockpitOrbital');
    els.hull = document.getElementById('cockpitHull');
    els.fuel = document.getElementById('cockpitFuel');
    els.o2 = document.getElementById('cockpitO2');
    els.speed = document.getElementById('cockpitSpeedValue');
    els.headingValue = document.getElementById('cockpitHeadingValue');
    els.pitchValue = document.getElementById('cockpitPitchValue');
    els.rollValue = document.getElementById('cockpitRollValue');
    els.throttleValue = document.getElementById('cockpitThrottleValue');
    els.camMode = document.getElementById('cockpitCamMode');
    els.throttle = document.getElementById('cockpitThrottle');
    els.cameraBtn = document.getElementById('cockpitCameraBtn');
    els.land = document.getElementById('cockpitLandBtn');
    els.leave = document.getElementById('cockpitLeaveBtn');
    els.status = document.getElementById('cockpitStatus');
    els.distMoon = document.getElementById('distMoon');
    els.distMars = document.getElementById('distMars');
    els.gateValue = document.getElementById('cockpitGateValue');
    els.navball = document.getElementById('cockpitNavball');
    els.gyroHud = document.getElementById('cockpitGyroHud');
    els.gyroCanvas = document.getElementById('cockpitGyroCanvas');
    els.gyroDriftBadge = document.getElementById('cockpitGyroDriftBadge');
    els.gyroDriftWarn = document.getElementById('cockpitGyroDriftWarn');
    els.proximity = document.getElementById('cockpitProximity');
    els.fuelFlow = document.getElementById('cockpitFuelFlow');
    els.btnEmergencyFuelSynth = document.getElementById('btnEmergencyFuelSynth');
    els.thermal = document.getElementById('cockpitThermal');

    if (els.gyroHud) {
      els.gyroHud.addEventListener('click', calibrateGyro);
    }
    if (els.btnEmergencyFuelSynth) {
      els.btnEmergencyFuelSynth.addEventListener('click', triggerEmergencyFuelSynth);
    }

    if (els.throttle) {
      els.throttle.addEventListener('input', function () {
        throttle = clamp(Number(els.throttle.value) / 100, 0, 1);
        updateThrottleLabels();
        sendThrust();
      });
    }
    if (els.cameraBtn) els.cameraBtn.addEventListener('click', toggleCameraMode);
    if (els.land) els.land.addEventListener('click', land);
    if (els.leave) els.leave.addEventListener('click', leaveSeat);
  }

  function calibrateGyro() {
    manualRoll = 0;
    autoRoll = 0;
    if (RTM.Net) {
      var s = RTM.Net.getState();
      if (s && s.telemetry) s.telemetry.gyroDrift = 0;
      RTM.Net.emit('cockpit:gyro:calibrated');
    }
    if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('lockon', 0.8);
    if (RTM.HUD && RTM.HUD.showNotification) {
      RTM.HUD.showNotification('🧭 3-AXIS GYROSCOPE & IMU CALIBRATED!', 'success', 3500);
    }
    if (els.gyroDriftBadge) {
      els.gyroDriftBadge.textContent = 'DRIFT: 0%';
      els.gyroDriftBadge.style.color = '#50ef39';
    }
    if (els.gyroDriftWarn) {
      els.gyroDriftWarn.style.display = 'none';
    }
  }

  function triggerEmergencyFuelSynth() {
    if (RTM.Net) {
      var s = RTM.Net.getState();
      if (s && s.telemetry) {
        s.telemetry.fuel = Math.min(100, (s.telemetry.fuel || 0) + 18);
      }
      RTM.Net.emit('cockpit:fuel:synth');
    }
    if (RTM.Audio && RTM.Audio.play) RTM.Audio.play('afterburner', 0.8);
    if (RTM.HUD && RTM.HUD.showNotification) {
      RTM.HUD.showNotification('⛽ EMERGENCY FUEL SYNTHESIZED (+18% FUEL)', 'success', 3500);
    }
  }

  function toggleCameraMode() {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    var label = cameraMode === 'chase' ? 'CHASE (C)' : 'COCKPIT (C)';
    if (els.cameraBtn) els.cameraBtn.textContent = 'CAM: ' + label;
    if (els.camMode) els.camMode.textContent = label;
    if (RTM.HUD) RTM.HUD.showNotification('Camera: ' + (cameraMode === 'chase' ? '3rd-Person Chase' : '1st-Person Cockpit'), 'info');
  }

  /* ── SCENE ─────────────────────────────────────────────────── */
  function buildScene() {
    if (built || !root) return;
    if (typeof THREE === 'undefined') {
      if (els.status) els.status.textContent = 'THREE.JS FAILED TO LOAD. Flight deck unavailable.';
      return;
    }
    built = true;
    initVectors();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010207);
    scene.fog = new THREE.FogExp2(0x010207, 0.000035);

    camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth / window.innerHeight, 0.1, 30000);
    camera.position.set(0, 8, 220);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      built = false;
      if (els.status) els.status.textContent = 'WEBGL INITIALIZATION FAILED. Flight deck unavailable.';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = 'cockpit-canvas';
    root.insertBefore(renderer.domElement, root.firstChild);
    bindPointerFlight(renderer.domElement);

    // HDRI Environment Reflections
    if (typeof THREE.RGBELoader !== 'undefined') {
      var rgbeLoader = new THREE.RGBELoader();
      rgbeLoader.load('/skyfall-assets/environment/sky-lighting.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        if (scene) scene.environment = texture;
      }, undefined, function (err) {
        console.warn('HDRI environment notice:', err);
      });
    }

    // EffectComposer + UnrealBloomPass Post-Processing
    if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
      try {
        composer = new THREE.EffectComposer(renderer);
        var renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        var bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          1.05,
          0.4,
          0.75
        );
        composer.addPass(bloomPass);
      } catch (err) {
        console.warn('Composer init error:', err);
        composer = null;
      }
    }

    scene.add(new THREE.AmbientLight(0x334466, 0.7));
    var sunLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    sunLight.position.set(1800, 900, -4200);
    scene.add(sunLight);
    var rimLight = new THREE.DirectionalLight(0x3288ff, 0.45);
    rimLight.position.set(-900, -200, 600);
    scene.add(rimLight);

    buildNebulaAndStars();
    buildSun();
    buildEarth();
    buildMoon();
    buildMars();
    buildTrajectory();
    buildShip();

    asteroidGroup = new THREE.Group();
    scene.add(asteroidGroup);
    buildAsteroids();
    buildSpaceDust();
  }

  function buildNebulaAndStars() {
    nebulaSkybox = createNebulaSkybox();
    scene.add(nebulaSkybox);
    var layerA = createNebula(13000, 0x090d20, 0x35105c, 0.85, 0.4);
    var layerB = createNebula(15500, 0x041428, 0x0b3850, 0.55, -0.8);
    scene.add(layerA);
    scene.add(layerB);
    nebulaLayers = [layerA, layerB];
    buildStars();
  }

  function buildSun() {
    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(210, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    );
    sunMesh.position.set(1800, 900, -4200);
    scene.add(sunMesh);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xffd27a,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glow.scale.set(1100, 1100, 1);
    sunMesh.add(glow);
  }

  function buildEarth() {
    var textureLoader = new THREE.TextureLoader();
    var earthTex = textureLoader.load(
      '/nasa-models/Earth (B).jpg',
      function (tex) { tex.encoding = THREE.sRGBEncoding; },
      undefined,
      function () {
        if (earthMesh && earthMesh.material) {
          earthMesh.material.map = textureLoader.load('/assets/kenney_planets/Planets/planet03.png');
          earthMesh.material.needsUpdate = true;
        }
      }
    );
    earthTex.encoding = THREE.sRGBEncoding;
    earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(170, 64, 48),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.92, metalness: 0.0 })
    );
    earthMesh.position.copy(EARTH_POS);
    earthMesh.add(createAtmosphere(170, 0x4c9dff, 0.95));
    earthMesh.add(createFresnelHalo(170, 0x4c9dff));
    scene.add(earthMesh);

    satellitePivot = new THREE.Group();
    satellitePivot.position.copy(EARTH_POS);
    satellitePivot.rotation.x = 0.35;
    scene.add(satellitePivot);
    loadFirstModel([MODEL_BASE + 'satelliteDish_detailed.glb'], function (model) {
      satelliteMesh = normalizeModel(model, 11);
      satelliteMesh.position.set(232, 44, 0);
      satelliteMesh.rotation.y = Math.PI / 2;
      satellitePivot.add(satelliteMesh);
    }, function () {
      satelliteMesh = new THREE.Group();
      var body = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.6, 5.2),
        new THREE.MeshStandardMaterial({ color: 0xc9d4df, metalness: 0.8, roughness: 0.3 })
      );
      satelliteMesh.add(body);
      var panelMat = new THREE.MeshStandardMaterial({ color: 0x234f9c, metalness: 0.4, roughness: 0.5 });
      var panelA = new THREE.Mesh(new THREE.BoxGeometry(7, 0.16, 2.6), panelMat);
      panelA.position.x = 5;
      satelliteMesh.add(panelA);
      var panelB = panelA.clone();
      panelB.position.x = -5;
      satelliteMesh.add(panelB);
      satelliteMesh.position.set(232, 44, 0);
      satellitePivot.add(satelliteMesh);
    });

    // Authentic NASA 3D Astronaut on EVA Spacewalk
    loadFirstModel(['/nasa-models/Astronaut.glb'], function (model) {
      var evaAstronaut = normalizeModel(model, 5.5);
      evaAstronaut.position.set(242, 52, 12);
      evaAstronaut.rotation.set(0.4, 0.8, -0.3);
      satellitePivot.add(evaAstronaut);
    });
  }

  function buildMoon() {
    var textureLoader = new THREE.TextureLoader();
    var texture = textureLoader.load(
      '/nasa-models/Apollo 11 - View of the Moon.jpg',
      function (tex) { tex.encoding = THREE.sRGBEncoding; },
      undefined,
      function () {
        if (moonMesh && moonMesh.material) {
          moonMesh.material.map = textureLoader.load('/assets/kenney_planets/Planets/planet04.png');
          moonMesh.material.needsUpdate = true;
        }
      }
    );
    texture.encoding = THREE.sRGBEncoding;
    var moonBump = makeMoonTexture();
    var moonMat = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: moonBump,
      bumpScale: 3.5,
      roughness: 1,
      metalness: 0
    });
    moonMesh = new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS, 64, 48), moonMat);
    moonMesh.position.copy(MOON_POS);
    moonMesh.add(createFresnelHalo(MOON_RADIUS, 0xd0e4ff));
    scene.add(moonMesh);
    addMoonCraters();

    captureRing = new THREE.Group();
    captureRing.position.copy(MOON_POS);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0x39ff88,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(152, 2.2, 8, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    captureRing.add(ring);
    var ringMat2 = ringMat.clone();
    ringMat2.opacity = 0.32;
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(164, 0.8, 6, 96), ringMat2);
    ring2.rotation.x = Math.PI / 2;
    captureRing.add(ring2);
    captureRing2 = ring2;
    scene.add(captureRing);

    loadFirstModel([MODEL_BASE + 'rover.glb'], function (model) {
      roverMesh = normalizeModel(model, 13);
      var dir = new THREE.Vector3(0, 0, 1);
      roverMesh.position.copy(MOON_POS).addScaledVector(dir, MOON_RADIUS + 3);
      roverMesh.rotation.y = Math.PI;
      scene.add(roverMesh);
    }, function () {});

    // Authentic NASA 3D Astronaut on the Lunar Surface
    loadFirstModel(['/nasa-models/Astronaut.glb', '/nasa-models/Z2 Spacesuit.glb'], function (model) {
      var moonAstronaut = normalizeModel(model, 6.0);
      var aDir = new THREE.Vector3(0.08, 0.05, 0.99).normalize();
      moonAstronaut.position.copy(MOON_POS).addScaledVector(aDir, MOON_RADIUS + 3);
      moonAstronaut.rotation.y = Math.PI * 0.8;
      scene.add(moonAstronaut);
    }, function () {});
  }

  function addMoonCraters() {
    var zAxis = new THREE.Vector3(0, 0, 1);
    var rimMaterial = new THREE.MeshBasicMaterial({
      color: 0x6d6a64,
      transparent: true,
      opacity: 0.45
    });
    var floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x55524d,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    for (var i = 0; i < 18; i++) {
      var dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      var radius = 4 + Math.random() * 13;
      var rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.16, 6, 24), rimMaterial);
      rim.quaternion.setFromUnitVectors(zAxis, dir);
      rim.position.copy(dir).multiplyScalar(MOON_RADIUS + 0.4);
      moonMesh.add(rim);
      var floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.82, 20), floorMaterial);
      floor.quaternion.copy(rim.quaternion);
      floor.position.copy(dir).multiplyScalar(MOON_RADIUS + 0.25);
      moonMesh.add(floor);
    }
  }

  function buildMars() {
    var textureLoader = new THREE.TextureLoader();
    var texture = textureLoader.load('/assets/kenney_planets/Planets/planet08.png');
    texture.encoding = THREE.sRGBEncoding;
    marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(145, 64, 48),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 })
    );
    marsMesh.position.copy(MARS_POS);
    marsMesh.add(createAtmosphere(145, 0xff5a32, 0.8));
    marsMesh.add(createFresnelHalo(145, 0xff5a32));
    scene.add(marsMesh);

    marsMoonsGroup = new THREE.Group();
    marsMoonsGroup.position.copy(MARS_POS);
    var phobos = new THREE.Mesh(
      new THREE.DodecahedronGeometry(13, 1),
      new THREE.MeshStandardMaterial({ color: 0x8b8177, roughness: 1 })
    );
    phobos.position.set(265, 24, 40);
    var deimos = new THREE.Mesh(
      new THREE.DodecahedronGeometry(8, 1),
      new THREE.MeshStandardMaterial({ color: 0x9d9388, roughness: 1 })
    );
    deimos.position.set(-390, -42, 130);
    marsMoonsGroup.add(phobos);
    marsMoonsGroup.add(deimos);
    scene.add(marsMoonsGroup);
  }

  function buildTrajectory() {
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 180),
      new THREE.Vector3(-100, 20, -200),
      new THREE.Vector3(180, 80, -620),
      new THREE.Vector3(430, 100, -880),
      new THREE.Vector3(400, 20, -1500),
      new THREE.Vector3(300, -40, -2150),
      new THREE.Vector3(260, -90, -2500)
    ]);
    var points = curve.getPoints(160);
    trajectoryLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x38fedc, transparent: true, opacity: 0.22 })
    );
    scene.add(trajectoryLine);

    gateGroup = new THREE.Group();
    scene.add(gateGroup);
    var names = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];
    var stops = [0.16, 0.32, 0.48, 0.64, 0.8];
    for (var i = 0; i < stops.length; i++) {
      var point = curve.getPoint(stops[i]);
      var tangent = curve.getTangent(stops[i]).normalize();
      var material = new THREE.MeshBasicMaterial({
        color: 0x38fedc,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(52, 2.4, 8, 56), material);
      ring.position.copy(point);
      ring.lookAt(point.clone().add(tangent));
      ring.userData = { index: i, name: names[i], passed: false, baseOpacity: 0.72 };
      gateGroup.add(ring);
      gates.push(ring);
    }
  }

  function buildShip() {
    shipGroup = new THREE.Group();
    shipGroup.rotation.order = 'YXZ';
    shipGroup.position.set(0, 0, 180);
    scene.add(shipGroup);
    loadFirstModel(SHIP_URLS, function (model) {
      var wrapper = new THREE.Group();
      wrapper.rotation.y = Math.PI;
      wrapper.add(normalizeModel(model, 20));
      shipMesh = wrapper;
      shipGroup.add(wrapper);
      attachThrusters();
      attachNavLights();
    }, function () {
      buildProceduralShip();
    });
  }

  function buildProceduralShip() {
    shipMesh = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 9.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a5878, metalness: 0.75, roughness: 0.28 })
    );
    body.rotation.x = -Math.PI / 2;
    shipMesh.add(body);
    var wing = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.4, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x232d45, metalness: 0.85, roughness: 0.3 })
    );
    wing.position.z = 1;
    shipMesh.add(wing);
    var glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38fedc,
        roughness: 0.08,
        transparent: true,
        opacity: 0.72
      })
    );
    glass.scale.set(0.8, 0.6, 1.8);
    glass.position.set(0, 0.9, -1.3);
    shipMesh.add(glass);
    shipGroup.add(shipMesh);
    attachThrusters();
    attachNavLights();
  }

  function attachThrusters() {
    thrusterPlumes = [];
    var plasmaTex = null;
    if (typeof THREE.TextureLoader !== 'undefined') {
      plasmaTex = new THREE.TextureLoader().load('/skyfall-assets/effects/afterburner-plasma.png');
    }
    var offsets = [new THREE.Vector3(-2.1, 0, 4.8), new THREE.Vector3(2.1, 0, 4.8)];
    offsets.forEach(function (offset, index) {
      var nozzle = new THREE.Group();
      nozzle.position.copy(offset);
      var outerMat = new THREE.MeshBasicMaterial({
        color: 0x38fedc,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var innerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var outer = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5.2, 16), outerMat);
      outer.rotation.x = -Math.PI / 2;
      outer.position.z = 2.5;
      var inner = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 12), innerMat);
      inner.rotation.x = -Math.PI / 2;
      inner.position.z = 1.6;
      nozzle.add(outer);
      nozzle.add(inner);

      var plasmaSprite = null;
      if (plasmaTex) {
        var pMat = new THREE.SpriteMaterial({
          map: plasmaTex,
          color: 0x38fedc,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        plasmaSprite = new THREE.Sprite(pMat);
        plasmaSprite.scale.set(2.4, 4.8, 1);
        plasmaSprite.position.set(0, 0, 3.2);
        nozzle.add(plasmaSprite);
      }

      shipGroup.add(nozzle);
      thrusterPlumes.push({
        nozzle: nozzle,
        outer: outer,
        inner: inner,
        plasma: plasmaSprite,
        phase: index * 2.1
      });
    });

    // Wingtip weapon pods with glowing laser emitters
    var podGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.2, 10);
    podGeo.rotateX(Math.PI / 2);
    var podMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, metalness: 0.8, roughness: 0.3 });
    [-4.6, 4.6].forEach(function (x) {
      var pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(x, -0.2, 0.8);
      var tipMat = new THREE.MeshBasicMaterial({ color: 0x38fedc });
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), tipMat);
      tip.position.set(0, 0, -1.6);
      pod.add(tip);
      shipGroup.add(pod);
    });
  }

  function attachNavLights() {
    navLights = [];
    var makeLight = function (x, color) {
      var material = new THREE.MeshBasicMaterial({ color: color });
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), material);
      lamp.position.set(x, 0.25, 2.5);
      shipGroup.add(lamp);
      navLights.push(lamp);
    };
    makeLight(-7.2, 0xff3040);
    makeLight(7.2, 0x28ff70);
  }

  function buildAsteroids() {
    var fallback = function () {
      var geometry = new THREE.DodecahedronGeometry(1, 1);
      var material = new THREE.MeshStandardMaterial({ color: 0x73717a, roughness: 0.95 });
      for (var i = 0; i < 65; i++) {
        var rock = new THREE.Mesh(geometry, material);
        rock.position.set(
          (Math.random() - 0.5) * 1700,
          (Math.random() - 0.5) * 620,
          -300 - Math.random() * 2100
        );
        var scale = 2.4 + Math.random() * 9;
        rock.scale.set(scale, scale * (0.65 + Math.random() * 0.5), scale);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.userData = {
          hp: 2,
          maxHp: 2,
          radius: 5.5,
          rotSpeedX: 0.4,
          rotSpeedY: 0.4,
          meta: { name: 'Main Belt Asteroid', fact: 'Silicate-iron planetesimal fragment.' },
          spin: 0.12 + Math.random() * 0.3,
          flashTimer: 0
        };
        asteroidGroup.add(rock);
        activeObstacles.push(rock);
      }
    };
    loadFirstModel([MODEL_BASE + 'meteor_detailed.glb', MODEL_BASE + 'rock_largeA.glb'], function (model) {
      var base = normalizeModel(model, 1);
      for (var i = 0; i < 65; i++) {
        var rock = base.clone();
        rock.position.set(
          (Math.random() - 0.5) * 1700,
          (Math.random() - 0.5) * 620,
          -300 - Math.random() * 2100
        );
        var scale = 3 + Math.random() * 11;
        rock.scale.multiplyScalar(scale);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        rock.userData = {
          hp: 2,
          maxHp: 2,
          radius: 5.5,
          rotSpeedX: 0.4,
          rotSpeedY: 0.4,
          meta: { name: 'Main Belt Asteroid', fact: 'Silicate-iron planetesimal fragment.' },
          spin: 0.12 + Math.random() * 0.3,
          flashTimer: 0
        };
        asteroidGroup.add(rock);
        activeObstacles.push(rock);
      }
    }, fallback);
  }

  /* ── CONTROLS ──────────────────────────────────────────────── */
  function updateThrottleLabels() {
    if (els.throttleValue) els.throttleValue.textContent = Math.round(throttle * 100) + '%';
    if (els.throttle) els.throttle.value = String(Math.round(throttle * 100));
  }

  function sendThrust() {
    if (!RTM.Net || !RTM.Net.isPilot()) return;
    var now = performance.now();
    if (now - lastThrustEmit < 90) return;
    lastThrustEmit = now;
    RTM.Net.emit('pilot:thrust', {
      throttle: clamp(throttle, 0, 1),
      heading: normalizeDeg((-yaw * 180) / Math.PI)
    });
  }

  function handleKeyboard(dt) {
    var yawInput = 0;
    var pitchInput = 0;
    if (keysDown.KeyA || keysDown.ArrowLeft) yawInput += 1;
    if (keysDown.KeyD || keysDown.ArrowRight) yawInput -= 1;
    if (keysDown.KeyW || keysDown.ArrowUp) pitchInput += 1;
    if (keysDown.KeyS || keysDown.ArrowDown) pitchInput -= 1;

    yaw += yawInput * 1.15 * dt;
    pitch = clamp(pitch + pitchInput * 0.95 * dt, -1.36, 1.36);

    var rollInput = 0;
    if (keysDown.KeyQ) rollInput += 1;
    if (keysDown.KeyE) rollInput -= 1;
    manualRoll += rollInput * 1.7 * dt;

    var bankTarget = -yawInput * 0.58 + mouseBank;
    autoRoll = lerp(autoRoll, bankTarget, Math.min(1, dt * 3.2));
    mouseBank *= Math.pow(0.035, dt);

    if (keysDown.ShiftLeft || keysDown.ShiftRight) {
      throttle = clamp(throttle + dt * 0.5, 0, 1);
    }
    if (keysDown.ControlLeft || keysDown.ControlRight) {
      throttle = clamp(throttle - dt * 0.62, 0, 1);
    }
    boost = !!(keysDown.KeyB);
    if (keysDown.KeyG) {
      fireHomingMissile();
    }

    updateThrottleLabels();
    if (yawInput || pitchInput || rollInput || boost || keysDown.ShiftLeft || keysDown.ShiftRight || keysDown.ControlLeft || keysDown.ControlRight) {
      sendThrust();
    }
  }

  function bindPointerFlight(element) {
    if (!element || element.dataset.flightPointerBound) return;
    element.dataset.flightPointerBound = '1';
    element.style.cursor = 'crosshair';
    element.addEventListener('pointerdown', function (event) {
      if (!open) return;
      if (event.button === 0) {
        pointerFiring = true;
        fireLaserCannons();
      } else if (event.button === 2) {
        event.preventDefault();
        fireHomingMissile();
      }
      mouseActive = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (element.setPointerCapture) {
        try { element.setPointerCapture(event.pointerId); } catch (_) {}
      }
    });
    element.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });
    element.addEventListener('pointermove', function (event) {
      if (!open || !mouseActive) return;
      var dx = event.clientX - pointerX;
      var dy = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      yaw -= dx * 0.004;
      pitch = clamp(pitch - dy * 0.003, -1.36, 1.36);
      mouseBank = clamp(-dx * 0.022, -0.65, 0.65);
      updateThrottleLabels();
      sendThrust();
    });
    window.addEventListener('pointerup', function () {
      mouseActive = false;
      pointerFiring = false;
    });
  }

  /* ── FLIGHT LOOP ───────────────────────────────────────────── */
  function animate(timestamp) {
    if (!open) return;
    rafId = requestAnimationFrame(animate);
    var dt = lastTime ? Math.min(0.09, (timestamp - lastTime) / 1000) : 0;
    lastTime = timestamp;
    if (!renderer || !scene || !camera || !shipGroup) return;

    handleKeyboard(dt);
    if (pointerFiring || keysDown.Space || keysDown.KeyF) {
      fireLaserCannons();
    }
    if (!descentActive) {
      updateShipFlight(dt);
    } else {
      updateDescent(dt);
    }
    updateCamera(dt);
    updateEnvironment(timestamp, dt);
    updateGates(timestamp, dt);
    updateCaptureRing(dt);
    updateLasersAndCollisions(dt);
    updateSpaceDust(dt);
    updateTargetLockon();
    readoutTimer += dt;
    if (readoutTimer > 0.08) {
      readoutTimer = 0;
      updateReadouts();
    }
    if (boost) {
      cannonHeat = Math.min(850, cannonHeat + 45 * dt);
    }
    cannonHeat = Math.max(280, cannonHeat - 65 * dt);
    drawNavball();
    drawGyroHud();
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  function updateShipFlight(dt) {
    var drift = 0;
    if (RTM.Net) {
      var st = RTM.Net.getState();
      if (st && st.telemetry && st.telemetry.gyroDrift != null) {
        drift = st.telemetry.gyroDrift;
      }
    }
    if (drift > 15) {
      yaw += (drift * 0.004) * dt;
      manualRoll += (drift * 0.002) * dt;
      if (els.gyroDriftWarn) els.gyroDriftWarn.style.display = 'block';
    } else {
      if (els.gyroDriftWarn) els.gyroDriftWarn.style.display = 'none';
    }
    if (els.gyroDriftBadge) {
      els.gyroDriftBadge.textContent = 'DRIFT: ' + Math.round(drift) + '%';
      els.gyroDriftBadge.style.color = drift > 15 ? '#ff3344' : '#50ef39';
    }

    shipGroup.rotation.set(pitch, yaw, manualRoll + autoRoll);
    var effectiveThrottle = Math.max(throttle, boost ? 0.42 : 0);
    var speed = effectiveThrottle * 150 * (boost ? 2.7 : 1);
    if (speed > 0.01) {
      var forward = new THREE.Vector3(0, 0, -1).applyEuler(shipGroup.rotation);
      shipGroup.position.addScaledVector(forward, speed * dt);
    }
    var limit = 5200;
    var p = shipGroup.position;
    if (p.x > limit || p.x < -limit) p.x = -Math.sign(p.x) * (limit - 2);
    if (p.y > limit || p.y < -limit) p.y = -Math.sign(p.y) * (limit - 2);
    if (p.z > limit || p.z < -limit) p.z = -Math.sign(p.z) * (limit - 2);

    var plumeScale = throttle > 0.03 || boost ? (throttle * (boost ? 2.5 : 1.15) + (boost ? 0.6 : 0.15)) : 0;
    thrusterPlumes.forEach(function (plume) {
      var flicker = 0.9 + Math.sin(performance.now() * 0.03 + plume.phase) * 0.12;
      plume.outer.scale.set(plumeScale * flicker, plumeScale * flicker, (boost ? 2.1 : 1.1) * flicker);
      plume.inner.scale.set(plumeScale * flicker, plumeScale * flicker, (boost ? 1.7 : 0.9) * flicker);
      plume.outer.material.color.setHex(boost ? 0xffb347 : 0x38fedc);
      if (plume.plasma) {
        var pScale = plumeScale * (boost ? 2.4 : 1.2) * flicker;
        plume.plasma.scale.set(pScale * 1.8, pScale * (boost ? 4.8 : 3.0), 1);
        plume.plasma.material.color.setHex(boost ? 0xffaa33 : 0x38fedc);
        plume.plasma.material.opacity = boost ? 0.98 : 0.82;
        plume.plasma.visible = plumeScale > 0.01;
      }
      plume.nozzle.visible = plumeScale > 0.01;
    });
    navLights.forEach(function (lamp, index) {
      lamp.material.opacity = 1;
      lamp.visible = Math.sin(performance.now() * 0.006 + index * Math.PI) > -0.15;
    });
  }

  function updateDescent(dt) {
    descentTimer -= dt;
    if (descentTarget) {
      shipGroup.position.lerp(descentTarget, Math.min(1, dt * 1.3));
      shipGroup.lookAt(MOON_POS);
      var wobble = 1 + Math.sin(performance.now() * 0.02) * 0.04;
      thrusterPlumes.forEach(function (plume) {
        plume.nozzle.visible = true;
        plume.outer.scale.set(0.5 * wobble, 0.5 * wobble, 1.4 * wobble);
        plume.inner.scale.set(0.3 * wobble, 0.3 * wobble, 1.0 * wobble);
        plume.outer.material.color.setHex(0x38fedc);
      });
    }
    if (els.status) {
      els.status.textContent = 'LUNAR DESCENT · ALTITUDE ' + Math.max(0, Math.round(descentTimer * 1800)) + ' M · RETRO BURN ACTIVE';
    }
    if (descentTimer <= 0) {
      descentActive = false;
      hide();
      if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
    }
  }

  function updateCamera(dt) {
    if (!shipGroup) return;
    var now = performance.now();
    var shake = boost ? 0.45 : 0;
    var shakeX = (Math.sin(now * 0.093) + Math.sin(now * 0.041)) * shake;
    var shakeY = (Math.cos(now * 0.077) + Math.sin(now * 0.033)) * shake;

    if (cameraMode === 'chase') {
      var offset = new THREE.Vector3(0, 7.5, 25).applyEuler(shipGroup.rotation);
      var target = shipGroup.position.clone().add(offset);
      camera.position.lerp(target, Math.min(1, dt * 4.5));
      var look = shipGroup.position.clone().add(new THREE.Vector3(0, 1.2, -22).applyEuler(shipGroup.rotation));
      camera.lookAt(look);
    } else {
      var cockpitPos = shipGroup.position.clone().add(new THREE.Vector3(0, 2.1, -0.8).applyEuler(shipGroup.rotation));
      camera.position.lerp(cockpitPos, Math.min(1, dt * 9));
      camera.quaternion.copy(shipGroup.quaternion);
    }
    camera.position.x += shakeX;
    camera.position.y += shakeY;

    var targetFov = baseFov + throttle * 6 + (boost ? 12 : 0);
    camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 4));
    camera.updateProjectionMatrix();
  }

  function updateEnvironment(timestamp, dt) {
    var time = timestamp * 0.001;
    if (nebulaSkybox && nebulaSkybox.material && nebulaSkybox.material.uniforms && nebulaSkybox.material.uniforms.uTime) {
      nebulaSkybox.material.uniforms.uTime.value = time;
    }
    nebulaLayers.forEach(function (layer) {
      layer.material.uniforms.uTime.value = time;
      layer.rotation.y += dt * 0.0009;
    });
    if (starField) {
      starField.material.uniforms.uTime.value = time;
      starField.rotation.y += dt * 0.0016;
      starField.rotation.x += dt * 0.0003;
    }
    if (earthMesh) earthMesh.rotation.y += dt * 0.01;
    if (moonMesh) moonMesh.rotation.y += dt * 0.018;
    if (marsMesh) marsMesh.rotation.y += dt * 0.014;
    if (satellitePivot) satellitePivot.rotation.y += dt * 0.16;
    if (marsMoonsGroup) marsMoonsGroup.rotation.y += dt * 0.025;
    if (roverMesh) roverMesh.rotation.y += Math.sin(time * 0.2) * dt * 0.01;
    if (asteroidGroup) {
      asteroidGroup.children.forEach(function (rock) {
        rock.rotation.x += (rock.userData.spin || 0.1) * dt;
        rock.rotation.y += (rock.userData.spin || 0.1) * 0.7 * dt;
      });
    }
    if (captureRing) {
      captureRing.rotation.y += dt * 0.11;
      var pulse = 0.62 + Math.sin(time * 2.1) * 0.18;
      captureRing.children.forEach(function (child) {
        child.material.opacity = pulse + (child === captureRing2 ? -0.28 : 0);
      });
    }
  }

  function updateGates(timestamp, dt) {
    gates.forEach(function (gate) {
      var data = gate.userData;
      gate.rotation.z += dt * (0.4 + data.index * 0.07);
      var pulse = 0.55 + Math.sin(timestamp * 0.002 + data.index) * 0.2;
      gate.material.opacity = data.passed ? 0.12 : pulse;
      if (!data.passed && shipGroup) {
        if (shipGroup.position.distanceTo(gate.position) < 62) {
          data.passed = true;
          gate.material.color.setHex(0x5dff8f);
          if (RTM.HUD) RTM.HUD.showNotification('TRAJECTORY GATE ' + data.name + ' CLEARED', 'success');
          var cleared = gates.filter(function (g) { return g.userData.passed; }).length;
          if (cleared === gates.length && RTM.HUD) {
            RTM.HUD.showNotification('ALL HOHMANN GATES CLEARED — MARS TRANSFER NOMINAL', 'success');
          }
        }
      }
    });
  }

  function updateCaptureRing(dt) {
    if (!captureRing || !shipGroup || !moonMesh) return;
    var state = RTM.Net ? RTM.Net.getState() : {};
    var moonState = (state.moon && state.moon.state) || 'orbit';
    var distance = shipGroup.position.distanceTo(MOON_POS);
    var canLand = moonState === 'orbit';
    captureRing.visible = canLand;
    if (canLand && !captureTriggered && distance < 205 && distance > MOON_RADIUS + 15) {
      captureTriggered = true;
      if (RTM.HUD) RTM.HUD.showNotification('LUNAR CAPTURE RING ENTERED — INITIATING DESCENT', 'success');
      land();
    }
    if (captureRing2) {
      captureRing2.material.color.setHex(distance < 230 ? 0xb6ff5c : 0x39ff88);
    }
  }

  function updateTargetLockon() {
    var lockonBox = document.getElementById('cockpitLockonBox');
    var lockonText = document.getElementById('cockpitLockonText');
    var lockonFill = document.getElementById('cockpitLockonFill');
    var missileInd = document.getElementById('cockpitMissileIndicator');

    var now = performance.now();
    if (missileInd) {
      if (now - lastMissileFireTime < MISSILE_COOLDOWN) {
        var remainSec = Math.ceil((MISSILE_COOLDOWN - (now - lastMissileFireTime)) / 1000);
        missileInd.style.color = '#f5f557';
        missileInd.style.borderColor = '#f5f557';
        missileInd.textContent = 'MISSILE: RELOADING (' + remainSec + 's)';
      } else {
        missileInd.style.color = '#38fedc';
        missileInd.style.borderColor = '#38fedc';
        missileInd.textContent = 'MISSILE: READY [R-CLICK / G]';
      }
    }

    if (!lockonBox || !camera || !shipGroup) return;

    var forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
    var bestTarget = null;
    var closestDist = 450;

    for (var i = 0; i < activeObstacles.length; i++) {
      var obst = activeObstacles[i];
      var toObst = obst.position.clone().sub(shipGroup.position);
      var dist = toObst.length();
      if (dist < closestDist) {
        var dir = toObst.clone().normalize();
        if (forwardDir.dot(dir) > 0.88) {
          closestDist = dist;
          bestTarget = obst;
        }
      }
    }

    if (bestTarget) {
      var proj = bestTarget.position.clone().project(camera);
      if (proj.z < 1.0) {
        var sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
        var sy = (-(proj.y * 0.5) + 0.5) * window.innerHeight;
        lockonBox.style.left = Math.round(sx) + 'px';
        lockonBox.style.top = Math.round(sy) + 'px';
        lockonBox.style.display = 'block';

        if (lockonText) {
          var name = (bestTarget.userData.meta && bestTarget.userData.meta.name) ? bestTarget.userData.meta.name : 'TARGET';
          lockonText.textContent = name + ' · ' + Math.round(closestDist) + 'm';
        }
        if (lockonFill) {
          var hp = bestTarget.userData.hp != null ? bestTarget.userData.hp : 2;
          var maxHp = bestTarget.userData.maxHp || 2;
          lockonFill.style.width = Math.round((hp / maxHp) * 100) + '%';
        }
        return;
      }
    }
    lockonBox.style.display = 'none';
  }

  function updateReadouts() {
    if (!RTM.Net) return;
    var gameState = RTM.Net.getState();
    var telemetry = gameState.telemetry || {};
    var moonState = (gameState.moon && gameState.moon.state) || 'orbit';
    var fuel = telemetry.fuel != null ? telemetry.fuel : 100;
    var o2 = telemetry.o2 != null ? telemetry.o2 : 100;
    var hull = telemetry.hull != null ? telemetry.hull : 100;

    if (els.fuel) els.fuel.textContent = Math.round(fuel) + '%';
    if (els.o2) els.o2.textContent = Math.round(o2) + '%';
    if (els.hull) els.hull.textContent = Math.round(hull) + '%';
    if (els.headingValue) els.headingValue.textContent = String((Math.round(normalizeDeg(-yaw * 180 / Math.PI)) + 180) % 360).padStart(3, '0') + '°';
    if (els.pitchValue) els.pitchValue.textContent = Math.round(pitch * 180 / Math.PI) + '°';
    if (els.rollValue) els.rollValue.textContent = Math.round(normalizeDeg((manualRoll + autoRoll) * 180 / Math.PI)) + '°';
    if (els.throttleValue) els.throttleValue.textContent = Math.round(throttle * 100) + '%';
    if (els.speed) {
      var effective = Math.max(throttle, boost ? 0.42 : 0);
      els.speed.textContent = (effective * 0.24 * (boost ? 2.7 : 1)).toFixed(1) + ' km/s';
    }
    if (els.gateValue) {
      var passed = gates.filter(function (gate) { return gate.userData.passed; }).length;
      els.gateValue.textContent = passed + ' / ' + gates.length;
    }
    if (els.orbital) {
      if (moonState === 'descending') els.orbital.textContent = 'LUNAR DESCENT IN PROGRESS';
      else if (moonState === 'landed') els.orbital.textContent = 'TOUCHDOWN · MOON BASE';
      else if (moonState === 'departing') els.orbital.textContent = 'LUNAR DEPARTURE BURN';
      else if (moonState === 'orbit' && shipGroup && shipGroup.position.distanceTo(MOON_POS) < 300) els.orbital.textContent = 'LUNAR CAPTURE WINDOW';
      else els.orbital.textContent = 'HOHMANN TRANSFER · 6-DOF';
    }
    if (els.distMoon && shipGroup) {
      els.distMoon.textContent = Math.round(shipGroup.position.distanceTo(MOON_POS) * 110).toLocaleString() + ' KM';
    }
    if (els.distMars && shipGroup) {
      els.distMars.textContent = Math.round(shipGroup.position.distanceTo(MARS_POS) * 75).toLocaleString() + ' KM';
    }
    if (els.land) {
      els.land.disabled = !(RTM.Net.isPilot() && moonState === 'orbit' && fuel >= 10 && o2 >= 12);
    }
    if (els.status && !descentActive) {
      var moonDistance = shipGroup ? shipGroup.position.distanceTo(MOON_POS) : Infinity;
      if (moonState === 'orbit' && moonDistance < 260) {
        els.status.textContent = 'LUNAR CAPTURE RING IN RANGE · L TO LAND OR FLY THROUGH THE GREEN RING';
      } else if (boost) {
        els.status.textContent = 'AFTERBURNER ACTIVE · HULL SHAKE WITHIN LIMITS';
      } else {
        els.status.textContent = 'W/S PITCH · A/D YAW · Q/E ROLL · SHIFT/CTRL THROTTLE · B AFTERBURNER · SPACE FIRE LASERS · 1–5 PRESET';
      }
    }

    // Flight sensor suite telemetry updates
    var minDist = Infinity;
    if (shipGroup && activeObstacles.length > 0) {
      var forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
      for (var oi = 0; oi < activeObstacles.length; oi++) {
        var toObs = activeObstacles[oi].position.clone().sub(shipGroup.position);
        var dist = toObs.length();
        if (toObs.clone().normalize().dot(forwardDir) > 0.25 && dist < minDist) {
          minDist = dist;
        }
      }
    }
    if (els.proximity) {
      if (minDist < 45) {
        els.proximity.textContent = '⚠️ IMPACT WARNING: ' + Math.round(minDist) + 'm';
        els.proximity.style.color = '#ff3344';
        els.proximity.style.borderColor = '#ff3344';
        els.proximity.style.boxShadow = '0 0 14px rgba(255, 51, 68, 0.85)';
      } else if (minDist < 120) {
        els.proximity.textContent = '📡 PROXIMITY: ' + Math.round(minDist) + 'm';
        els.proximity.style.color = '#ffb703';
        els.proximity.style.borderColor = '#ffb703';
        els.proximity.style.boxShadow = 'none';
      } else {
        els.proximity.textContent = '📡 PROXIMITY: CLEAR';
        els.proximity.style.color = '#38fedc';
        els.proximity.style.borderColor = '#2f3e55';
        els.proximity.style.boxShadow = 'none';
      }
    }

    if (els.fuelFlow) {
      var flowRate = (throttle * 4.2 + (boost ? 8.4 : 0)).toFixed(1);
      els.fuelFlow.textContent = '⛽ FLOW: ' + flowRate + ' L/s';
    }

    if (els.thermal) {
      var curTemp = Math.round(cannonHeat);
      els.thermal.textContent = '🌡 THERMAL: ' + curTemp + '°C';
      if (curTemp > 720) {
        els.thermal.style.color = '#ff3344';
        els.thermal.style.borderColor = '#ff3344';
      } else if (curTemp > 500) {
        els.thermal.style.color = '#ffb703';
        els.thermal.style.borderColor = '#ffb703';
      } else {
        els.thermal.style.color = '#7fe7ff';
        els.thermal.style.borderColor = '#2f3e55';
      }
    }
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
    var rollAngle = manualRoll + autoRoll;
    var horizon = clamp(pitch / 1.36, -1, 1) * radius * 0.62;

    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.clip();
    g.translate(cx, cy);
    g.rotate(-rollAngle);
    g.fillStyle = '#1e4f78';
    g.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2 + horizon);
    g.fillStyle = '#6b4b2e';
    g.fillRect(-radius * 2, horizon, radius * 4, radius * 2);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-radius, horizon);
    g.lineTo(radius, horizon);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 1;
    for (var i = -2; i <= 2; i++) {
      if (i === 0) continue;
      var y = horizon + i * radius * 0.2;
      var half = radius * (0.24 - Math.abs(i) * 0.035);
      g.beginPath();
      g.moveTo(-half, y);
      g.lineTo(half, y);
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
    g.fillText(String(Math.round(normalizeDeg(-yaw * 180 / Math.PI) + 180) % 360).padStart(3, '0') + '°', cx, cy + radius - 7);
  }

  function drawGyroHud() {
    if (!els.gyroCanvas) return;
    var canvas = els.gyroCanvas;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var r = 62;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Clip circular horizon ball
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.save();
    ctx.translate(cx, cy);
    var rollRad = -(manualRoll + autoRoll);
    ctx.rotate(rollRad);

    var pitchPx = Math.max(-50, Math.min(50, pitch * (180 / Math.PI) * 1.5));

    // Sky half
    var skyGrad = ctx.createLinearGradient(0, -r, 0, pitchPx);
    skyGrad.addColorStop(0, '#0a233b');
    skyGrad.addColorStop(1, '#1b4d75');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-w, -h, w * 2, h + pitchPx);

    // Ground half
    var gndGrad = ctx.createLinearGradient(0, pitchPx, 0, r);
    gndGrad.addColorStop(0, '#543011');
    gndGrad.addColorStop(1, '#241407');
    ctx.fillStyle = gndGrad;
    ctx.fillRect(-w, pitchPx, w * 2, h);

    // White Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchPx);
    ctx.lineTo(r, pitchPx);
    ctx.stroke();

    // Pitch ladder rungs (+/- 10, 20, 30 deg)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    [-30, -20, -10, 10, 20, 30].forEach(function (deg) {
      var dy = pitchPx - deg * 1.5;
      if (Math.abs(dy) < r - 8) {
        var len = deg % 20 === 0 ? 28 : 16;
        ctx.strokeStyle = deg > 0 ? '#38fedc' : '#f5f557';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-len / 2, dy);
        ctx.lineTo(len / 2, dy);
        ctx.stroke();
        ctx.fillText((deg > 0 ? '+' : '') + deg, len / 2 + 10, dy + 3);
      }
    });

    ctx.restore();

    // Aircraft fixed reticle (yellow wings & center dot)
    ctx.strokeStyle = '#f5f557';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left wing
    ctx.moveTo(cx - 36, cy);
    ctx.lineTo(cx - 14, cy);
    ctx.lineTo(cx - 14, cy + 6);
    // Right wing
    ctx.moveTo(cx + 36, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx + 14, cy + 6);
    ctx.stroke();

    // Center pip
    ctx.fillStyle = '#f5f557';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Glass reflection arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, -Math.PI * 0.7, -Math.PI * 0.15);
    ctx.stroke();

    ctx.restore(); // end clip

    // Outer bezel ring
    ctx.strokeStyle = '#38fedc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Heading indicator readout on top of gyro
    var hdg = Math.round(((yaw % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI));
    ctx.fillStyle = '#38fedc';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(hdg).padStart(3, '0') + '° HDG', cx, 16);

    // Pitch & roll degree text at bottom
    var pDeg = Math.round(pitch * 180 / Math.PI);
    var rDeg = Math.round((manualRoll + autoRoll) * 180 / Math.PI);
    ctx.fillStyle = '#b0b8cc';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('P:' + pDeg + '° R:' + rDeg + '°', cx, h - 8);
  }

  /* ── LIFECYCLE ─────────────────────────────────────────────── */
  function resetFlight() {
    yaw = 0;
    pitch = 0;
    manualRoll = 0;
    autoRoll = 0;
    mouseBank = 0;
    throttle = 0;
    boost = false;
    descentActive = false;
    descentTimer = 0;
    descentTarget = null;
    captureTriggered = false;
    gates.forEach(function (gate) {
      gate.userData.passed = false;
      gate.material.color.setHex(0x38fedc);
    });
    if (shipGroup) shipGroup.position.set(0, 0, 180);
    updateThrottleLabels();
  }

  function show() {
    if (!root || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing') return;
    if (!RTM.Net.isPilot()) {
      RTM.Net.emit('pilot:seat:claim');
    }

    buildScene();
    if (!built) return;
    open = true;
    root.classList.add('open');
    document.body.classList.add('cockpit-open');
    if (RTM.Ship) RTM.Ship.setActive(false);
    if (RTM.Moon) RTM.Moon.setActive(false);

    if (!hasFlown) {
      resetFlight();
      hasFlown = true;
    }
    var thrust = gameState.pilotThrust || {};
    var localThrust = thrust.playerId === RTM.Net.playerId ? thrust : null;
    if (localThrust) {
      throttle = clamp(Number(localThrust.throttle) || 0, 0, 1);
      yaw = -((Number(localThrust.heading) || 0) * Math.PI) / 180;
    }
    captureTriggered = false;
    updateThrottleLabels();
    updateReadouts();
    resize();

    lastTime = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);

    if (RTM.Net) {
      var s = RTM.Net.getState();
      if (s && s.telemetry && s.telemetry.autopilot === false && activeObstacles.length === 0) {
        spawnObstacleWave();
      }
    }

    if (RTM.HUD) RTM.HUD.showNotification('FLIGHT DECK ONLINE — W/S pitch · A/D yaw · Space/Click to fire lasers', 'info');
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
    if (!RTM.Net || !RTM.Net.isPilot()) return;
    var gameState = RTM.Net.getState();
    var moonState = (gameState.moon && gameState.moon.state) || 'orbit';
    if (moonState !== 'orbit') return;
    var telemetry = gameState.telemetry || {};
    if ((telemetry.fuel != null ? telemetry.fuel : 100) < 10 || (telemetry.o2 != null ? telemetry.o2 : 100) < 12) {
      if (RTM.HUD) RTM.HUD.showNotification('Not enough fuel or oxygen for lunar landing!', 'error');
      return;
    }
    if (shipGroup && moonMesh) {
      var approach = shipGroup.position.clone().sub(MOON_POS);
      if (approach.lengthSq() < 1) approach.set(0, 0, 1);
      approach.normalize();
      descentTarget = MOON_POS.clone().addScaledVector(approach, MOON_RADIUS + 8);
      descentTimer = 5.0;
    }
    descentActive = true;
    if (els.status) els.status.textContent = 'INITIATING LUNAR DESCENT SEQUENCE...';
    RTM.Net.emit('moon:land');
  }

  function resize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (starField && starField.material.uniforms.uPixelRatio) {
      starField.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
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
    } else if (event.key === 'y' || event.key === 'Y') {
      event.preventDefault();
      calibrateGyro();
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      triggerEmergencyFuelSynth();
    } else if (event.code === 'KeyF' || event.code === 'Space') {
      event.preventDefault();
      fireLaserCannons();
    } else if (event.code.indexOf('Arrow') === 0) {
      event.preventDefault();
    } else if (event.code.indexOf('Digit') === 0) {
      var preset = Number(event.code.slice(5));
      if (preset >= 1 && preset <= 5) {
        throttle = (preset - 1) / 4;
        updateThrottleLabels();
        sendThrust();
      }
    }
  }

  function onKeyUp(event) {
    keysDown[event.code] = false;
  }

  function seatOccupant(event) {
    var seat = event && (event.seat || event);
    return (seat && (seat.occupantId || seat.playerId)) ||
      (event && (event.occupantId || event.playerId)) || null;
  }

  function maybeAutoOpen(event) {
    if (!RTM.Net) return;
    var occupant = seatOccupant(event);
    if (occupant === RTM.Net.playerId) {
      if (pendingAutoOpen) {
        pendingAutoOpen = false;
        if (!open && RTM.Net.isPilot()) show();
      }
    } else if (open) {
      hide();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    buildDom();
    preloadNasaModels();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resize);
    window.addEventListener('blur', function () {
      keysDown = {};
      mouseActive = false;
      boost = false;
    });

    if (RTM.Net) {
      RTM.Net.on('cockpit:asteroid:alert', function () {
        if (open) {
          spawnObstacleWave();
          var banner = document.getElementById('cockpitWaveBanner');
          if (banner) {
            banner.className = 'cockpit-banner banner-danger';
            banner.innerHTML = '⚠️ ASTEROID FIELD DETECTED! DEFEND THE SHIP!';
            banner.style.display = 'block';
            setTimeout(function () { if (banner) banner.style.display = 'none'; }, 4000);
          }
        }
      });
      RTM.Net.on('pilot:seat:locked', maybeAutoOpen);
      RTM.Net.on('pilot:seat:updated', maybeAutoOpen);
      RTM.Net.on('pilot:seat:unlocked', function () {
        if (open) hide();
      });
      RTM.Net.on('moon:state', function (data) {
        var moon = (data && data.moon) || data || {};
        if (open) {
          updateReadouts();
          if (moon.state === 'landed') {
            if (RTM.HUD) RTM.HUD.showNotification('LUNAR TOUCHDOWN CONFIRMED — FLIGHT DECK SECURED', 'success');
            hide();
          }
        }
      });
      RTM.Net.on('meeting:started', hide);
      RTM.Net.on('game:ended', function () {
        resetFlight();
        hide();
      });
      RTM.Net.on('game:started', function () {
        resetFlight();
        hide();
      });
      RTM.Net.on('telemetry:updated', function () {
        if (open) updateReadouts();
      });
    }
  }

  var api = {
    init: init,
    show: show,
    hide: hide,
    isOpen: function () { return open; },
    toggleCameraMode: toggleCameraMode,
    land: land,
    leaveSeat: leaveSeat,
    update: updateReadouts
  };
  Object.defineProperty(api, '_pendingAutoOpen', {
    get: function () { return pendingAutoOpen; },
    set: function (value) { pendingAutoOpen = !!value; }
  });
  return api;
})();
