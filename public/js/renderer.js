// ============================================================
//  Road to Mars — 2D Canvas Renderer (Upgraded 10-Room Layout)
//  Sets window.RTM.Renderer
// ============================================================
(function () {
  'use strict';

  window.RTM = window.RTM || {};

  // ── World Constants ─────────────────────────────────────────
  const WORLD_W = 3200;
  const WORLD_H = 2000;

  // 10-Room Layout Stations
  const TASK_STATIONS = {
    wires:     { x: 850,  y: 1350, room: 'Electrical' },
    o2_filter: { x: 2250, y: 450,  room: 'O2' },
    nav:       { x: 2640, y: 1040, room: 'Navigation' },
    cargo:     { x: 1500, y: 1450, room: 'Storage' },
    science:   { x: 850,  y: 450,  room: 'Lab' },
  };

  const EMERGENCY_BUTTON = { x: 1400, y: 800 };
  const PILOT_CHAIR      = { x: 2850, y: 950 };

  const MOON_CHEESE_NODES = [
    { x: 550, y: 550 },
    { x: 1100, y: 550 },
    { x: 1650, y: 550 },
    { x: 2200, y: 550 },
    { x: 2750, y: 550 },
    { x: 800, y: 1250 },
    { x: 1600, y: 1250 },
    { x: 2400, y: 1250 },
  ];

  const MOON_ROCK_NODES = [
    { x: 600, y: 1650 },
    { x: 1600, y: 1650 },
    { x: 2600, y: 1650 },
    { x: 2750, y: 900 },
  ];

  // 10-Room Wall Boundaries with Corridors & Open Doorways
  const WALLS = [
    // Outer Ship Hull
    { x: 40, y: 40, w: WORLD_W - 80, h: 24 },
    { x: 40, y: WORLD_H - 64, w: WORLD_W - 80, h: 24 },
    { x: 40, y: 40, w: 24, h: WORLD_H - 80 },
    { x: WORLD_W - 64, y: 40, w: 24, h: WORLD_H - 80 },

    // Cafeteria Walls (Center 1160 to 1640, 600 to 1000) - doors at N, S, E, W
    { x: 1160, y: 600, w: 180, h: 18 }, // Top Left
    { x: 1460, y: 600, w: 180, h: 18 }, // Top Right (Door at 1340-1460)
    { x: 1160, y: 1000, w: 180, h: 18 }, // Bottom Left
    { x: 1460, y: 1000, w: 180, h: 18 }, // Bottom Right (Door at 1340-1460)
    { x: 1160, y: 600, w: 18, h: 140 }, // West Top
    { x: 1160, y: 860, w: 18, h: 140 }, // West Bottom (Door at 740-860)
    { x: 1640, y: 600, w: 18, h: 140 }, // East Top
    { x: 1640, y: 860, w: 18, h: 140 }, // East Bottom (Door at 740-860)

    // Navigation Room (2520 to 2980, 750 to 1150) - door at West
    { x: 2520, y: 750, w: 460, h: 18 },
    { x: 2520, y: 1150, w: 460, h: 18 },
    { x: 2980, y: 750, w: 18, h: 418 },
    { x: 2520, y: 750, w: 18, h: 140 },
    { x: 2520, y: 1010, w: 18, h: 140 }, // Door at 890-1010

    // O2 & Greenhouse (2050 to 2450, 280 to 620) - door at South
    { x: 2050, y: 280, w: 400, h: 18 },
    { x: 2050, y: 280, w: 18, h: 340 },
    { x: 2450, y: 280, w: 18, h: 340 },
    { x: 2050, y: 620, w: 140, h: 18 },
    { x: 2310, y: 620, w: 140, h: 18 }, // Door at 2190-2310

    // Weapons & Shields (2150 to 2550, 1280 to 1620) - door at North
    { x: 2150, y: 1620, w: 400, h: 18 },
    { x: 2150, y: 1280, w: 18, h: 340 },
    { x: 2550, y: 1280, w: 18, h: 340 },
    { x: 2150, y: 1280, w: 140, h: 18 },
    { x: 2410, y: 1280, w: 140, h: 18 }, // Door at 2290-2410

    // Storage & Cargo Airlock (1250 to 1750, 1250 to 1650) - doors at North and East
    { x: 1250, y: 1650, w: 500, h: 18 },
    { x: 1250, y: 1250, w: 18, h: 400 },
    { x: 1750, y: 1250, w: 18, h: 140 },
    { x: 1750, y: 1510, w: 18, h: 140 }, // East Door
    { x: 1250, y: 1250, w: 180, h: 18 },
    { x: 1570, y: 1250, w: 180, h: 18 }, // North Door

    // Electrical (650 to 1050, 1180 to 1520) - door at East
    { x: 650, y: 1180, w: 400, h: 18 },
    { x: 650, y: 1520, w: 400, h: 18 },
    { x: 650, y: 1180, w: 18, h: 340 },
    { x: 1050, y: 1180, w: 18, h: 120 },
    { x: 1050, y: 1400, w: 18, h: 120 }, // Door at 1300-1400

    // Science & Lab (650 to 1050, 280 to 620) - door at East
    { x: 650, y: 280, w: 400, h: 18 },
    { x: 650, y: 620, w: 400, h: 18 },
    { x: 650, y: 280, w: 18, h: 340 },
    { x: 1050, y: 280, w: 18, h: 120 },
    { x: 1050, y: 500, w: 18, h: 120 }, // Door at 400-500

    // Upper Reactor (120 to 480, 420 to 760) - door at East
    { x: 120, y: 420, w: 360, h: 18 },
    { x: 120, y: 760, w: 360, h: 18 },
    { x: 120, y: 420, w: 18, h: 340 },
    { x: 480, y: 420, w: 18, h: 120 },
    { x: 480, y: 640, w: 18, h: 120 }, // Door at 540-640

    // Lower Reactor (120 to 480, 1140 to 1480) - door at East
    { x: 120, y: 1140, w: 360, h: 18 },
    { x: 120, y: 1480, w: 360, h: 18 },
    { x: 120, y: 1140, w: 18, h: 340 },
    { x: 480, y: 1140, w: 18, h: 120 },
    { x: 480, y: 1360, w: 18, h: 120 }, // Door at 1260-1360

    // Security & Comms (450 to 750, 820 to 1080) - doors at West and East
    { x: 450, y: 820, w: 300, h: 18 },
    { x: 450, y: 1080, w: 300, h: 18 },
    { x: 450, y: 820, w: 18, h: 80 },
    { x: 450, y: 1000, w: 18, h: 80 }, // West Door
    { x: 750, y: 820, w: 18, h: 80 },
    { x: 750, y: 1000, w: 18, h: 80 }, // East Door
  ];

  // Moon craters
  const MOON_CRATERS = (function () {
    const list = [];
    let s = 42;
    function r() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (let i = 0; i < 28; i++) {
      list.push({
        x: r() * WORLD_W,
        y: WORLD_H * 0.38 + r() * (WORLD_H * 0.58),
        radius: 25 + r() * 95,
      });
    }
    return list;
  })();

  // Stars for moon sky
  const MOON_STARS = (function () {
    const list = [];
    let s = 99;
    function r() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (let i = 0; i < 180; i++) {
      list.push({
        x: r() * WORLD_W,
        y: r() * (WORLD_H * 0.36),
        radius: 1 + r() * 2.5,
        alpha: 0.3 + r() * 0.7,
      });
    }
    return list;
  })();

  // ── Preloaded Real Workspace Sprites ─────────────────────────
  const SPRITES = {};
  const SPRITE_DEFS = {
    deskScreen:   '/assets/kenney_space-kit/Isometric/desk_computerScreen_SE.png',
    deskCorner:   '/assets/kenney_space-kit/Isometric/desk_computerCorner_SE.png',
    generator:    '/assets/kenney_space-kit/Isometric/machine_generatorLarge_SE.png',
    barrel:       '/assets/kenney_space-kit/Isometric/machine_barrelLarge_SE.png',
    wireless:     '/assets/kenney_space-kit/Isometric/machine_wireless_SE.png',
    satellite:    '/assets/kenney_space-kit/Isometric/satelliteDish_detailed_SE.png',
    barrelsRail:  '/assets/kenney_space-kit/Isometric/barrels_rail_SE.png',
    chair:        '/assets/kenney_space-kit/Isometric/desk_chair_SE.png',
    chairArms:    '/assets/kenney_space-kit/Isometric/desk_chairArms_SE.png',
    desk:         '/assets/kenney_space-kit/Isometric/desk_computer_SE.png',
    rover:        '/assets/kenney_space-kit/Isometric/rover_SE.png',
    craterLarge:  '/assets/kenney_space-kit/Isometric/craterLarge_SE.png',
    craterSmall:  '/assets/kenney_space-kit/Isometric/crater_SE.png',
    crystals:     '/assets/kenney_space-kit/Isometric/rock_crystalsLargeA_SE.png',
    astronaut:    '/assets/kenney_space-kit/Isometric/astronautA_SE.png',
  };

  function trimSprite(img) {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return img;
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext('2d', { willReadFrequently: true });
    sourceCtx.drawImage(img, 0, 0);
    let pixels;
    try {
      pixels = sourceCtx.getImageData(0, 0, width, height).data;
    } catch (_) {
      return img;
    }
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return img;
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const cropped = document.createElement('canvas');
    cropped.width = maxX - minX + 1;
    cropped.height = maxY - minY + 1;
    cropped.getContext('2d').drawImage(
      source,
      minX, minY, cropped.width, cropped.height,
      0, 0, cropped.width, cropped.height
    );
    return cropped;
  }

  (function preloadSprites() {
    for (let key in SPRITE_DEFS) {
      const img = new Image();
      img.onload = function () {
        SPRITES[key] = trimSprite(img);
      };
      img.onerror = function () {
        console.warn('[Renderer] Sprite failed to load:', SPRITE_DEFS[key]);
      };
      img.src = SPRITE_DEFS[key];
      SPRITES[key] = img;
    }
  })();

  function drawSprite(ctx, key, x, y, w, h) {
    const img = SPRITES[key];
    const iw = img && (img.naturalWidth || img.width);
    const ih = img && (img.naturalHeight || img.height);
    if (!iw || !ih) return false;
    const sw = w || iw;
    const sh = h || ih;
    ctx.drawImage(img, x - sw / 2, y - sh / 2, sw, sh);
    return true;
  }

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx;
  let canvasW = window.innerWidth, canvasH = window.innerHeight;
  let currentScene = 'ship';
  let localPlayerId = null;
  let latestGameState = null;
  let animTime = 0;
  let minimapOpen = false;

  const camera = { x: 1400, y: 800, zoom: 1.35 };

  // ── Helpers ────────────────────────────────────────────────
  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function updateCamera(targetX, targetY) {
    camera.x = lerp(camera.x, targetX, 0.08);
    camera.y = lerp(camera.y, targetY, 0.08);
  }

  function worldToScreen(wx, wy) {
    const sx = (wx - camera.x) * camera.zoom + canvasW / 2;
    const sy = (wy - camera.y) * camera.zoom + canvasH / 2;
    return { x: sx, y: sy };
  }

  function screenToWorld(sx, sy) {
    const wx = (sx - canvasW / 2) / camera.zoom + camera.x;
    const wy = (sy - canvasH / 2) / camera.zoom + camera.y;
    return { x: wx, y: wy };
  }

  function handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvasW = w;
    canvasH = h;
    // Authentic Among Us close follow zoom
    camera.zoom = 1.35 * Math.min(1.0, Math.max(0.75, w / 1400));
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Proximity Checks ───────────────────────────────────────
  function isInNavigationRoom(x, y) {
    return x >= 2500 && x <= 3020 && y >= 720 && y <= 1180;
  }

  function isNearPilotChair(px, py) {
    return dist(px, py, PILOT_CHAIR.x, PILOT_CHAIR.y) < 140;
  }

  function isNearEmergencyButton(px, py) {
    return dist(px, py, EMERGENCY_BUTTON.x, EMERGENCY_BUTTON.y) < 130;
  }

  function getTaskStationAt(px, py) {
    const threshold = 110;
    for (const [id, station] of Object.entries(TASK_STATIONS)) {
      if (dist(px, py, station.x, station.y) < threshold) {
        return { id: id, x: station.x, y: station.y, room: station.room };
      }
    }
    return null;
  }

  function getPlayerAtScreen(sx, sy, players, maxDist) {
    maxDist = maxDist || 45;
    const world = screenToWorld(sx, sy);
    for (const [id, p] of Object.entries(players)) {
      if (!p.alive || p.ghost) continue;
      if (dist(world.x, world.y, p.x, p.y) < maxDist) {
        return { id: id, player: p };
      }
    }
    return null;
  }

  // ── Crewmate Bean Drawing (Authentic Style) ─────────────────
  function drawCrewmate(ctx, x, y, color, options) {
    options = options || {};
    const dir    = options.direction || 'right';
    const dead   = !!options.dead;
    const ghost  = !!options.ghost;
    const moving = !!options.moving;

    ctx.save();
    ctx.translate(x, y);
    if (dir === 'left') ctx.scale(-1, 1);

    if (ghost) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -18, 18, Math.PI, 0);
      ctx.lineTo(18, 10);
      ctx.quadraticCurveTo(8, 22 + Math.sin(animTime * 6) * 4, 0, 14);
      ctx.quadraticCurveTo(-8, 22 - Math.sin(animTime * 6) * 4, -18, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = '#72e7ff';
      ctx.beginPath();
      ctx.ellipse(8, -16, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (dead) {
      // Dead Body: half bean with white bone sticking out
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 4, 18, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bone
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, -16, 6, 20);
      ctx.strokeRect(-3, -16, 6, 20);
      ctx.beginPath();
      ctx.arc(-4, -16, 4, 0, Math.PI * 2);
      ctx.arc(4, -16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const bw = 32, bh = 42;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';

    // Backpack
    ctx.fillStyle = color;
    roundRect(ctx, -bw / 2 - 8, -bh / 2 + 10, 10, bh * 0.55, 4);
    ctx.fill();
    ctx.stroke();

    // Body Capsule
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, bh / 2);
    ctx.lineTo(-bw / 2, -bh / 2 + 14);
    ctx.quadraticCurveTo(-bw / 2, -bh / 2 - 4, -bw / 2 + 14, -bh / 2 - 8);
    ctx.lineTo(bw / 2 - 14, -bh / 2 - 8);
    ctx.quadraticCurveTo(bw / 2, -bh / 2 - 4, bw / 2, -bh / 2 + 14);
    ctx.lineTo(bw / 2, bh / 2);
    ctx.quadraticCurveTo(bw / 2, bh / 2 + 6, bw / 2 - 6, bh / 2 + 2);
    ctx.lineTo(-bw / 2 + 6, bh / 2 + 2);
    ctx.quadraticCurveTo(-bw / 2, bh / 2 + 6, -bw / 2, bh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Legs animation
    const legOffset = moving ? Math.sin(animTime * 14) * 4 : 0;
    ctx.fillRect(-12, bh / 2, 8, 10 + legOffset);
    ctx.strokeRect(-12, bh / 2, 8, 10 + legOffset);
    ctx.fillRect(4, bh / 2, 8, 10 - legOffset);
    ctx.strokeRect(4, bh / 2, 8, 10 - legOffset);

    // Visor
    ctx.fillStyle = '#72e7ff';
    ctx.beginPath();
    ctx.ellipse(bw / 2 - 8, -bh / 2 + 12, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular Visor Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(bw / 2 - 6, -bh / 2 + 10, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Ship Map Drawing (10-Room Layout) ───────────────────────
  function drawShipMap(ctx) {
    // Outer Cosmic Space Background
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Parallax background starfield outside hull
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 90; i++) {
      const sx = (i * 37 + animTime * 4) % WORLD_W;
      const sy = (i * 61) % WORLD_H;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship Floor Plate Base
    ctx.fillStyle = '#3c4052';
    ctx.fillRect(50, 50, WORLD_W - 100, WORLD_H - 100);

    // Metallic Corridor Grid Pattern
    ctx.strokeStyle = '#474c60';
    ctx.lineWidth = 1;
    for (let x = 60; x < WORLD_W - 60; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, WORLD_H - 60);
      ctx.stroke();
    }
    for (let y = 60; y < WORLD_H - 60; y += 60) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(WORLD_W - 60, y);
      ctx.stroke();
    }

    // ── 1. Cafeteria (Central Hub 1160 to 1640, 600 to 1000) ──
    _drawRoom(ctx, 1160, 600, 480, 400, '#4f556b', 'CAFETERIA');
    // Top observation glass viewport
    ctx.fillStyle = 'rgba(114, 231, 255, 0.25)';
    ctx.fillRect(1240, 606, 320, 16);

    // Large Emergency Button Table (1400, 800)
    ctx.fillStyle = '#687087';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(EMERGENCY_BUTTON.x, EMERGENCY_BUTTON.y, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red Emergency Button
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(EMERGENCY_BUTTON.x, EMERGENCY_BUTTON.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tables and mess-hall seating
    _drawPropTable(ctx, 1240, 720, 80, 40);
    _drawPropTable(ctx, 1480, 720, 80, 40);
    _drawPropTable(ctx, 1240, 880, 80, 40);
    _drawPropTable(ctx, 1480, 880, 80, 40);
    drawSprite(ctx, 'chair', 1220, 745, 42, 42);
    drawSprite(ctx, 'chair', 1335, 745, 42, 42);
    drawSprite(ctx, 'chairArms', 1500, 745, 44, 44);
    drawSprite(ctx, 'chair', 1220, 905, 42, 42);
    drawSprite(ctx, 'chairArms', 1335, 905, 44, 44);
    drawSprite(ctx, 'chair', 1500, 905, 42, 42);
    // Vending / food-service machines
    drawSprite(ctx, 'barrel', 1190, 660, 54, 54);
    drawSprite(ctx, 'wireless', 1580, 660, 52, 52);
    drawSprite(ctx, 'generator', 1580, 940, 54, 54);

    // ── 2. Navigation / Cockpit (2520 to 2980, 750 to 1150) ──
    _drawRoom(ctx, 2520, 750, 460, 400, '#3f4f66', 'NAVIGATION');
    // Star Viewports at front nose
    ctx.fillStyle = 'rgba(56, 254, 220, 0.35)';
    ctx.fillRect(2960, 820, 16, 260);

    // Pilot Chair (2850, 950)
    ctx.fillStyle = '#22223b';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    roundRect(ctx, PILOT_CHAIR.x - 24, PILOT_CHAIR.y - 28, 48, 56, 8);
    ctx.fill();
    ctx.stroke();
    // Headrest & armrests
    ctx.fillStyle = '#132ed1';
    roundRect(ctx, PILOT_CHAIR.x - 16, PILOT_CHAIR.y - 34, 32, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Pilot seating and navigation consoles
    drawSprite(ctx, 'chairArms', PILOT_CHAIR.x, PILOT_CHAIR.y, 58, 58);
    drawSprite(ctx, 'deskScreen', TASK_STATIONS.nav.x, TASK_STATIONS.nav.y, 72, 72);
    drawSprite(ctx, 'desk', 2600, 900, 64, 64);
    drawSprite(ctx, 'satellite', 2930, 800, 76, 76);

    // ── 3. O2 & Greenhouse (2050 to 2450, 280 to 620) ──
    _drawRoom(ctx, 2050, 280, 400, 340, '#384d43', 'O2 & GREENHOUSE');
    // Biosphere plant domes
    ctx.fillStyle = 'rgba(78, 205, 120, 0.3)';
    ctx.strokeStyle = '#117f2d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(2150, 400, 42, 0, Math.PI * 2);
    ctx.arc(2350, 400, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // O2 Scrubber Task Console
    _drawTaskStation(ctx, TASK_STATIONS.o2_filter.x, TASK_STATIONS.o2_filter.y, '#2ecc71', 'O2 FILTER');

    // ── 4. Weapons & Shields (2150 to 2550, 1280 to 1620) ──
    _drawRoom(ctx, 2150, 1280, 400, 340, '#4d3838', 'WEAPONS & SHIELDS');
    drawSprite(ctx, 'deskScreen', 2350, 1420, 72, 72);
    drawSprite(ctx, 'satellite', 2460, 1500, 76, 76);
    drawSprite(ctx, 'generator', 2240, 1500, 70, 70);

    // ── 5. Storage & Cargo Airlock (1250 to 1750, 1250 to 1650) ──
    _drawRoom(ctx, 1250, 1250, 500, 400, '#594d3b', 'STORAGE & AIRLOCK');
    // Hazard Stripes on Airlock Hatch
    _drawHazardStripes(ctx, 1420, 1600, 160, 34);
    // Cargo Task & Crates
    _drawTaskStation(ctx, TASK_STATIONS.cargo.x, TASK_STATIONS.cargo.y, '#e67e22', 'CARGO');
    drawSprite(ctx, 'barrel', 1340, 1380, 58, 58);
    drawSprite(ctx, 'barrel', 1650, 1380, 58, 58);
    drawSprite(ctx, 'barrelsRail', 1600, 1550, 96, 72);
    drawSprite(ctx, 'rover', 1370, 1570, 82, 82);

    // ── 6. Electrical (650 to 1050, 1180 to 1520) ──
    _drawRoom(ctx, 650, 1180, 400, 340, '#4a4836', 'ELECTRICAL');
    drawSprite(ctx, 'generator', 760, 1320, 82, 82);
    drawSprite(ctx, 'wireless', 950, 1320, 68, 68);
    drawSprite(ctx, 'barrelsRail', 900, 1450, 88, 66);
    _drawTaskStation(ctx, TASK_STATIONS.wires.x, TASK_STATIONS.wires.y, '#f1c40f', 'WIRES');

    // ── 7. Science & MedBay Lab (650 to 1050, 280 to 620) ──
    _drawRoom(ctx, 650, 280, 400, 340, '#384654', 'MEDBAY LAB');
    drawSprite(ctx, 'deskCorner', 780, 420, 76, 76);
    drawSprite(ctx, 'deskScreen', 950, 420, 72, 72);
    drawSprite(ctx, 'chair', 780, 500, 42, 42);
    drawSprite(ctx, 'chairArms', 950, 500, 44, 44);
    _drawTaskStation(ctx, TASK_STATIONS.science.x, TASK_STATIONS.science.y, '#9b59b6', 'SCANNER');

    // ── 8. Upper Reactor (120 to 480, 420 to 760) ──
    _drawRoom(ctx, 120, 420, 360, 340, '#30304a', 'UPPER REACTOR');
    _drawPulsingCore(ctx, 280, 580, '#38fedc');
    drawSprite(ctx, 'generator', 190, 680, 72, 72);
    drawSprite(ctx, 'barrel', 390, 680, 52, 52);

    // ── 9. Lower Reactor (120 to 480, 1140 to 1480) ──
    _drawRoom(ctx, 120, 1140, 360, 340, '#30304a', 'LOWER REACTOR');
    _drawPulsingCore(ctx, 280, 1300, '#38fedc');
    drawSprite(ctx, 'generator', 190, 1400, 72, 72);
    drawSprite(ctx, 'barrel', 390, 1400, 52, 52);

    // ── 10. Security & Comms (450 to 750, 820 to 1080) ──
    _drawRoom(ctx, 450, 820, 300, 260, '#3a3a48', 'SECURITY');
    drawSprite(ctx, 'desk', 600, 950, 70, 70);
    drawSprite(ctx, 'deskScreen', 520, 1010, 64, 64);
    drawSprite(ctx, 'chair', 680, 1010, 42, 42);

    // Draw Corridors Connecting Doors
    ctx.fillStyle = '#44495e';
    // Center Spine (Security -> Cafeteria -> Navigation)
    ctx.fillRect(750, 900, 410, 100);
    ctx.fillRect(1640, 870, 880, 100);
    // North Spine
    ctx.fillRect(1050, 450, 290, 80);
    ctx.fillRect(1440, 520, 80, 80);
    ctx.fillRect(1640, 450, 410, 80);
    // South Spine
    ctx.fillRect(1050, 1320, 200, 80);
    ctx.fillRect(1750, 1420, 400, 80);
    ctx.fillRect(1460, 1000, 80, 250);
    // Left Reactor Spine
    ctx.fillRect(480, 560, 80, 780);

    // Draw All Bulkhead Walls with Thick Comic Outlines
    ctx.fillStyle = '#1c1e28';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    WALLS.forEach(function (w) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    });
  }

  function _drawRoom(ctx, x, y, w, h, floorColor, label) {
    ctx.fillStyle = floorColor;
    ctx.fillRect(x, y, w, h);

    // Label with Among Us chunky typography
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 42);
  }

  function _drawPropTable(ctx, x, y, w, h) {
    ctx.fillStyle = '#2c3140';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
  }

  function _drawHazardStripes(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#000';
    for (let i = 0; i < w; i += 24) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + 12, y);
      ctx.lineTo(x + i, y + h);
      ctx.lineTo(x + i - 12, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function _drawPulsingCore(ctx, x, y, glowColor) {
    ctx.save();
    const pulse = 1.0 + Math.sin(animTime * 5) * 0.15;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x, y, 28 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  function _drawTaskStation(ctx, x, y, color, label) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    roundRect(ctx, x - 18, y - 18, 36, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y);

    if (label) {
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(label, x, y + 22);
    }
  }

  // ── Moon Map Drawing (Upgraded Surface & Sprites) ───────────
  function drawMoonMap(ctx, gameState) {
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Stars
    MOON_STARS.forEach(function (st) {
      ctx.fillStyle = 'rgba(255, 255, 255, ' + st.alpha + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Earth in the Lunar Sky
    const earthX = WORLD_W * 0.72, earthY = 210;
    ctx.fillStyle = '#2266bb';
    ctx.beginPath();
    ctx.arc(earthX, earthY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38fedc';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Lunar Ground
    const groundY = WORLD_H * 0.24;
    ctx.fillStyle = '#7a7d88';
    ctx.fillRect(0, groundY, WORLD_W, WORLD_H - groundY);

    // Horizon line
    ctx.strokeStyle = '#5a5d66';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(WORLD_W, groundY);
    ctx.stroke();

    // Preloaded Craters & Sprites
    drawSprite(ctx, 'rover', 1600, 900, 96, 96);
    drawSprite(ctx, 'astronaut', 1500, 920, 64, 64);
    drawSprite(ctx, 'craterLarge', 700, 800, 160, 160);
    drawSprite(ctx, 'craterLarge', 2200, 950, 180, 180);
    drawSprite(ctx, 'craterSmall', 1200, 1100, 90, 90);
    drawSprite(ctx, 'craterSmall', 2600, 1200, 90, 90);

    // Craters list
    MOON_CRATERS.forEach(function (cr) {
      ctx.fillStyle = '#656770';
      ctx.strokeStyle = '#4a4c52';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Cheese Wheels & Moon Rocks
    const collected = (gameState && gameState.moonCollected) || {};
    MOON_CHEESE_NODES.forEach(function (node, i) {
      const isCollected = collected['cheese_' + i];
      _drawCheeseWheel(ctx, node.x, node.y, isCollected);
    });

    MOON_ROCK_NODES.forEach(function (node, i) {
      const isCollected = collected['rock_' + i];
      _drawMoonRock(ctx, node.x, node.y, isCollected);
    });
  }

  function _drawCheeseWheel(ctx, x, y, collected) {
    ctx.save();
    if (collected) {
      ctx.globalAlpha = 0.25;
    } else {
      // Golden Halo
      const glow = ctx.createRadialGradient(x, y, 10, x, y, 38);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cheese Wheel Body
    ctx.fillStyle = '#f5c518';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cheese Holes
    ctx.fillStyle = '#d4a10d';
    [{ dx: -6, dy: -3, r: 3 }, { dx: 6, dy: 1, r: 2.5 }, { dx: 0, dy: 4, r: 3 }].forEach(function (h) {
      ctx.beginPath();
      ctx.arc(x + h.dx, y + h.dy, h.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROMY CHEESE', x, y - 22);
    ctx.restore();
  }

  function _drawMoonRock(ctx, x, y, collected) {
    ctx.save();
    if (collected) ctx.globalAlpha = 0.25;
    drawSprite(ctx, 'crystals', x, y, 54, 54);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CORE SAMPLE', x, y - 26);
    ctx.restore();
  }

  // ── Fog of War ─────────────────────────────────────────────
  function drawFog(ctx, playerX, playerY, visionRadius, isGhost) {
    if (isGhost) return;
    const screen = worldToScreen(playerX, playerY);
    const innerR = visionRadius * camera.zoom * 0.45;
    const outerR = visionRadius * camera.zoom;

    const fogGrad = ctx.createRadialGradient(screen.x, screen.y, innerR, screen.x, screen.y, outerR);
    fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0.94)');

    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Vignette Effects ───────────────────────────────────────
  function drawHypoxiaVignette(ctx, o2) {
    if (o2 >= 35) return;
    const intensity = 1 - (o2 / 35);
    const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.25, canvasW / 2, canvasH / 2, canvasW * 0.55);
    grad.addColorStop(0, 'rgba(180, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(180, 0, 0, ' + (intensity * 0.8) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  function drawStarvationVignette(ctx) {
    const pulse = 0.5 + Math.sin(animTime * 4) * 0.3;
    const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasW * 0.3, canvasW / 2, canvasH / 2, canvasW * 0.6);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(40, 20, 0, ' + (pulse * 0.75) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Minimap Blueprint Overlay (Toggle with M or Map Button) ─
  function toggleMinimap() {
    minimapOpen = !minimapOpen;
  }

  function drawMinimap(ctx, gameState, localP) {
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 40;
    const mapW = Math.min(canvasW - pad * 2, 940);
    const mapH = Math.min(canvasH - pad * 2, 600);
    const mapX = (canvasW - mapW) / 2;
    const mapY = (canvasH - mapH) / 2;

    // Semi-transparent dark tablet background
    ctx.fillStyle = 'rgba(14, 22, 34, 0.92)';
    ctx.strokeStyle = '#38fedc';
    ctx.lineWidth = 5;
    roundRect(ctx, mapX, mapY, mapW, mapH, 16);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#38fedc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPACECRAFT SCHEMATIC & MINIMAP [M TO CLOSE]', mapX + mapW / 2, mapY + 34);

    const scale = Math.min((mapW - 80) / WORLD_W, (mapH - 110) / WORLD_H);
    const originX = mapX + (mapW - WORLD_W * scale) / 2;
    const originY = mapY + 64 + (mapH - 84 - WORLD_H * scale) / 2;

    // Draw scaled room boxes
    const rooms = [
      { name: 'CAFETERIA', x: 1160, y: 600, w: 480, h: 400, color: '#4f556b' },
      { name: 'NAV', x: 2520, y: 750, w: 460, h: 400, color: '#3f4f66' },
      { name: 'O2', x: 2050, y: 280, w: 400, h: 340, color: '#384d43' },
      { name: 'WEAPONS', x: 2150, y: 1280, w: 400, h: 340, color: '#4d3838' },
      { name: 'STORAGE', x: 1250, y: 1250, w: 500, h: 400, color: '#594d3b' },
      { name: 'ELECTRICAL', x: 650, y: 1180, w: 400, h: 340, color: '#4a4836' },
      { name: 'LAB', x: 650, y: 280, w: 400, h: 340, color: '#384654' },
      { name: 'UPPER REACTOR', x: 120, y: 420, w: 360, h: 340, color: '#30304a' },
      { name: 'LOWER REACTOR', x: 120, y: 1140, w: 360, h: 340, color: '#30304a' },
      { name: 'SECURITY', x: 450, y: 820, w: 300, h: 260, color: '#3a3a48' },
    ];

    rooms.forEach(function (r) {
      const rx = originX + r.x * scale;
      const ry = originY + r.y * scale;
      const rw = r.w * scale;
      const rh = r.h * scale;

      ctx.fillStyle = r.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, rx + rw / 2, ry + rh / 2);
    });

    // Task indicators
    for (const [id, st] of Object.entries(TASK_STATIONS)) {
      const tx = originX + st.x * scale;
      const ty = originY + st.y * scale;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Local Player Indicator
    if (localP) {
      const px = originX + localP.x * scale;
      const py = originY + localP.y * scale;
      const pulse = 1.0 + Math.sin(animTime * 8) * 0.3;

      ctx.fillStyle = localP.color || '#38fedc';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38fedc';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('YOU', px, py - 14);
    }

    ctx.restore();
  }

  // ── Main Render ────────────────────────────────────────────
  function render(gameState) {
    latestGameState = gameState;
    if (!ctx) return;

    animTime += 0.016;
    const state = gameState || {};
    const players = state.players || {};
    const bodies  = state.bodies || [];
    const localP  = localPlayerId ? players[localPlayerId] : null;

    if (localP) {
      updateCamera(localP.x, localP.y);
    }

    const isGhost = localP ? !!localP.ghost : false;
    const o2 = (state.resources && state.resources.o2 != null) ? state.resources.o2 : 100;
    const starving = (state.resources && state.resources.starving) || false;
    let visionRadius = 420;
    if (o2 < 35) visionRadius = 240;

    // Clear Canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.restore();

    // Camera World Transform
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    if (currentScene === 'moon') {
      drawMoonMap(ctx, state);
    } else {
      drawShipMap(ctx);
    }

    // Dead Bodies
    bodies.forEach(function (b) {
      if (!isGhost && localP && dist(localP.x, localP.y, b.x, b.y) > visionRadius) return;
      drawCrewmate(ctx, b.x, b.y, b.color || '#c51111', { dead: true, direction: 'right' });
    });

    // Remote Players
    for (const [id, p] of Object.entries(players)) {
      if (id === localPlayerId) continue;
      if (!p.alive && !isGhost) continue;
      if (p.scene && p.scene !== currentScene) continue;
      if (!isGhost && localP && dist(localP.x, localP.y, p.x, p.y) > visionRadius) continue;

      drawCrewmate(ctx, p.x, p.y, p.color || '#132ed1', {
        direction: p.direction || p.d || 'right',
        moving: !!p.moving,
        ghost: !!p.ghost,
        dead: !p.alive
      });

      // Name Tag
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(p.name || id, p.x, p.y - 36);
      ctx.fillText(p.name || id, p.x, p.y - 36);
    }

    // Local Player
    if (localP) {
      drawCrewmate(ctx, localP.x, localP.y, localP.color || '#c51111', {
        direction: localP.direction || localP.d || 'right',
        moving: !!localP.moving,
        ghost: isGhost,
        dead: !localP.alive
      });

      ctx.fillStyle = '#38fedc';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(localP.name || localPlayerId, localP.x, localP.y - 36);
      ctx.fillText(localP.name || localPlayerId, localP.x, localP.y - 36);
    }

    ctx.restore(); // End camera transform

    // Fog of War
    if (localP) {
      drawFog(ctx, localP.x, localP.y, visionRadius, isGhost);
    }

    // Vignettes
    if (o2 < 35) drawHypoxiaVignette(ctx, o2);
    if (starving) drawStarvationVignette(ctx);

    // Minimap Overlay
    if (minimapOpen) {
      drawMinimap(ctx, state, localP);
    }
  }

  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  function setScene(scene) {
    currentScene = scene;
  }

  function setLocalPlayer(id) {
    localPlayerId = id;
  }

  window.RTM.Renderer = {
    init: init,
    render: render,
    setScene: setScene,
    setLocalPlayer: setLocalPlayer,
    worldToScreen: worldToScreen,
    screenToWorld: screenToWorld,
    getPlayerAtScreen: getPlayerAtScreen,
    getTaskStationAt: getTaskStationAt,
    isNearEmergencyButton: isNearEmergencyButton,
    isNearPilotChair: isNearPilotChair,
    isInNavigationRoom: isInNavigationRoom,
    toggleMinimap: toggleMinimap,
    isMinimapOpen: function () { return minimapOpen; },
    drawCrewmate: drawCrewmate,
    camera: camera,
    TASK_STATIONS: TASK_STATIONS,
    EMERGENCY_BUTTON: EMERGENCY_BUTTON,
    PILOT_CHAIR: PILOT_CHAIR,
    WALLS: WALLS,
    MOON_CHEESE_NODES: MOON_CHEESE_NODES,
    MOON_ROCK_NODES: MOON_ROCK_NODES,
    WORLD_W: WORLD_W,
    WORLD_H: WORLD_H,
  };

})();
