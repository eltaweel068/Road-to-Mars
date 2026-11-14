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
    glassDome:    '/assets/kenney_space-kit/Isometric/hangar_roundGlass_SE.png',
    pipeStraight: '/assets/kenney_space-kit/Isometric/pipe_straight_SE.png',
    pipeCorner:   '/assets/kenney_space-kit/Isometric/pipe_cornerRound_SE.png',
    trainCargo:   '/assets/kenney_space-kit/Isometric/monorail_trainCargo_SE.png',
    turretDouble: '/assets/kenney_space-kit/Isometric/turret_double_SE.png',
    rocketTop:    '/assets/kenney_space-kit/Isometric/rocket_topA_SE.png',
    rocketBase:   '/assets/kenney_space-kit/Isometric/rocket_baseA_SE.png',
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

  // ── Crewmate Specialty Hats ─────────────────────────────────
  function drawCrewHat(ctx, hat, bw, bh) {
    if (!hat || hat === 'crew') return;
    const top = -bh / 2 - 8;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    if (hat === 'pilot') {
      ctx.fillStyle = '#1b2a46';
      ctx.beginPath();
      ctx.ellipse(2, top + 5, 17, 9, 0, Math.PI, 0);
      ctx.lineTo(19, top + 9);
      ctx.lineTo(-14, top + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f5c542';
      roundRect(ctx, -13, top + 3, 27, 6, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#72e7ff';
      ctx.beginPath();
      ctx.arc(5, top + 6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat === 'o2' || hat === 'propulsion') {
      ctx.fillStyle = hat === 'o2' ? 'rgba(159, 239, 255, 0.35)' : 'rgba(239, 125, 13, 0.4)';
      ctx.beginPath();
      ctx.arc(2, top + 9, 19, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(21, top + 10);
      ctx.quadraticCurveTo(0, top - 5, -17, top + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = hat === 'o2' ? '#9fefff' : '#ffb45b';
      ctx.fillRect(-12, top + 8, 28, 3);
      ctx.strokeRect(-12, top + 8, 28, 3);
    } else if (hat === 'chef') {
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath();
      ctx.arc(-9, top + 4, 7, 0, Math.PI * 2);
      ctx.arc(2, top - 1, 8, 0, Math.PI * 2);
      ctx.arc(13, top + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-14, top + 4, 28, 8);
      ctx.stroke();
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(-14, top + 9, 28, 4);
      ctx.strokeRect(-14, top + 9, 28, 4);
    } else if (hat === 'scientist') {
      ctx.fillStyle = '#eef8ff';
      ctx.beginPath();
      ctx.ellipse(2, top + 7, 18, 8, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#71491e';
      ctx.fillRect(-16, top + 5, 36, 3);
      ctx.strokeRect(-16, top + 5, 36, 3);
      ctx.strokeStyle = '#72e7ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-4, top + 12, 4.5, Math.PI, 0);
      ctx.moveTo(1, top + 9);
      ctx.lineTo(4, top + 9);
      ctx.arc(8, top + 12, 4.5, Math.PI, 0);
      ctx.stroke();
    } else if (hat === 'electrical') {
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.ellipse(2, top + 8, 18, 7, 0, Math.PI, 0);
      ctx.lineTo(20, top + 11);
      ctx.lineTo(-16, top + 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38fedc';
      ctx.fillRect(-2, top - 2, 4, 8);
      ctx.strokeRect(-2, top - 2, 4, 8);
    }
    ctx.restore();
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

    // Specialty hat
    drawCrewHat(ctx, options.hat, bw, bh);

    ctx.restore();
  }

  // ── Ship Doors & Automatic Airlocks ──────────────────────────
  const SHIP_DOORS = [
    { id: 'cafe_w',  x: 1152, y: 780,  w: 16, h: 80,  vertical: true,  open: 0 },
    { id: 'cafe_e',  x: 1640, y: 780,  w: 16, h: 80,  vertical: true,  open: 0 },
    { id: 'cafe_n',  x: 1380, y: 592,  w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'cafe_s',  x: 1380, y: 1000, w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'nav_w',   x: 2512, y: 910,  w: 16, h: 80,  vertical: true,  open: 0 },
    { id: 'green_s', x: 2210, y: 620,  w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'weap_n',  x: 2310, y: 1272, w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'stor_n',  x: 1460, y: 1242, w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'elec_n',  x: 810,  y: 1172, w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'med_s',   x: 810,  y: 620,  w: 80, h: 16,  vertical: false, open: 0 },
    { id: 'reac_u',  x: 480,  y: 540,  w: 16, h: 100, vertical: true,  open: 0 },
    { id: 'reac_l',  x: 480,  y: 1260, w: 16, h: 100, vertical: true,  open: 0 },
    { id: 'sec_w',   x: 442,  y: 900,  w: 16, h: 100, vertical: true,  open: 0 },
    { id: 'sec_e',   x: 750,  y: 900,  w: 16, h: 100, vertical: true,  open: 0 },
  ];

  function drawSlidingDoors(ctx, players) {
    const playerList = players ? Object.values(players) : [];
    SHIP_DOORS.forEach(function (door) {
      const cx = door.x + door.w / 2;
      const cy = door.y + door.h / 2;
      let near = false;
      for (let i = 0; i < playerList.length; i++) {
        const p = playerList[i];
        if (p && dist(p.x, p.y, cx, cy) < 110) {
          near = true;
          break;
        }
      }
      door.open = near ? Math.min(1, door.open + 0.15) : Math.max(0, door.open - 0.08);

      // Frame
      ctx.fillStyle = '#10131a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(door.x, door.y, door.w, door.h);
      ctx.fillRect(door.x, door.y, door.w, door.h);

      // Indicator light
      ctx.fillStyle = door.open > 0.4 ? '#38fedc' : '#ef7d0d';
      if (door.vertical) {
        ctx.fillRect(door.x + 5, door.y - 6, 6, 5);
      } else {
        ctx.fillRect(door.x - 6, door.y + 5, 5, 6);
      }

      // Sliding leaves
      ctx.save();
      ctx.fillStyle = '#445168';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      if (door.vertical) {
        const halfH = door.h / 2;
        const slide = halfH * door.open * 0.85;
        // Top leaf
        ctx.fillRect(door.x + 2, door.y + 2 - slide, door.w - 4, halfH - 2);
        ctx.strokeRect(door.x + 2, door.y + 2 - slide, door.w - 4, halfH - 2);
        // Bottom leaf
        ctx.fillRect(door.x + 2, door.y + halfH + slide, door.w - 4, halfH - 2);
        ctx.strokeRect(door.x + 2, door.y + halfH + slide, door.w - 4, halfH - 2);
      } else {
        const halfW = door.w / 2;
        const slide = halfW * door.open * 0.85;
        // Left leaf
        ctx.fillRect(door.x + 2 - slide, door.y + 2, halfW - 2, door.h - 4);
        ctx.strokeRect(door.x + 2 - slide, door.y + 2, halfW - 2, door.h - 4);
        // Right leaf
        ctx.fillRect(door.x + halfW + slide, door.y + 2, halfW - 2, door.h - 4);
        ctx.strokeRect(door.x + halfW + slide, door.y + 2, halfW - 2, door.h - 4);
      }
      ctx.restore();
    });
  }

  // ── Exterior Spaceship Hull Silhouette & Thrusters ───────────
  function drawExteriorHullSilhouette(ctx) {
    ctx.save();

    // 1. Exterior Armored Hull Silhouette
    ctx.fillStyle = '#222534';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(3160, 930);
    ctx.lineTo(3240, 950);
    ctx.lineTo(3160, 970);
    ctx.lineTo(2980, 1180);
    ctx.lineTo(2560, 1680);
    ctx.lineTo(1760, 1720);
    ctx.lineTo(1240, 1720);
    ctx.lineTo(640, 1600);
    ctx.lineTo(110, 1540);
    ctx.lineTo(110, 380);
    ctx.lineTo(640, 200);
    ctx.lineTo(1240, 200);
    ctx.lineTo(1760, 200);
    ctx.lineTo(2560, 240);
    ctx.lineTo(2980, 720);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. High-Tech Forward Nose Cone & Sensor Dome
    var noseGrad = ctx.createLinearGradient(2980, 950, 3240, 950);
    noseGrad.addColorStop(0, '#2e3549');
    noseGrad.addColorStop(0.7, '#3d4660');
    noseGrad.addColorStop(1, '#1b202c');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(2980, 730);
    ctx.lineTo(3180, 900);
    ctx.lineTo(3240, 950);
    ctx.lineTo(3180, 1000);
    ctx.lineTo(2980, 1170);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forward radar & LiDAR array
    ctx.fillStyle = '#38fedc';
    ctx.shadowColor = '#38fedc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(3234, 950, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. North & South Solar Wings (Giant Gridded Arrays)
    // North Truss & Array (x: 1300..2100, y: 20..120)
    ctx.fillStyle = '#1c202d';
    ctx.fillRect(1660, 80, 80, 120);
    ctx.strokeRect(1660, 80, 80, 120);
    var nArrayGrad = ctx.createLinearGradient(1300, 20, 1300, 120);
    nArrayGrad.addColorStop(0, '#0c223c');
    nArrayGrad.addColorStop(1, '#14365f');
    ctx.fillStyle = nArrayGrad;
    ctx.fillRect(1300, 20, 800, 100);
    ctx.strokeRect(1300, 20, 800, 100);
    ctx.strokeStyle = '#2b78c9';
    ctx.lineWidth = 1;
    for (var sx = 1320; sx < 2100; sx += 40) {
      ctx.beginPath();
      ctx.moveTo(sx, 20);
      ctx.lineTo(sx, 120);
      ctx.stroke();
    }
    for (var sy = 40; sy < 120; sy += 25) {
      ctx.beginPath();
      ctx.moveTo(1300, sy);
      ctx.lineTo(2100, sy);
      ctx.stroke();
    }

    // South Truss & Array (x: 1300..2100, y: 1800..1900)
    ctx.fillStyle = '#1c202d';
    ctx.fillRect(1660, 1720, 80, 120);
    ctx.strokeRect(1660, 1720, 80, 120);
    var sArrayGrad = ctx.createLinearGradient(1300, 1800, 1300, 1900);
    sArrayGrad.addColorStop(0, '#14365f');
    sArrayGrad.addColorStop(1, '#0c223c');
    ctx.fillStyle = sArrayGrad;
    ctx.fillRect(1300, 1800, 800, 100);
    ctx.strokeRect(1300, 1800, 800, 100);
    ctx.strokeStyle = '#2b78c9';
    ctx.lineWidth = 1;
    for (var sx2 = 1320; sx2 < 2100; sx2 += 40) {
      ctx.beginPath();
      ctx.moveTo(sx2, 1800);
      ctx.lineTo(sx2, 1900);
      ctx.stroke();
    }
    for (var sy2 = 1825; sy2 < 1900; sy2 += 25) {
      ctx.beginPath();
      ctx.moveTo(1300, sy2);
      ctx.lineTo(2100, sy2);
      ctx.stroke();
    }

    // 4. Rear Engine Cowlings & 4 Massive Thruster Plumes
    var thrusterYs = [500, 700, 1220, 1420];
    thrusterYs.forEach(function (ty, index) {
      // Bell Nozzle
      ctx.fillStyle = '#1e222e';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, ty - 38);
      ctx.lineTo(40, ty - 50);
      ctx.lineTo(40, ty + 50);
      ctx.lineTo(120, ty + 38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nozzle interior glow
      ctx.fillStyle = '#155577';
      ctx.fillRect(40, ty - 45, 12, 90);

      // Spewing animated plasma thruster flames
      var flicker = Math.sin(animTime * 24 + index * 1.8);
      var flameLen = 140 + flicker * 28;
      var flameW = 44 + flicker * 6;

      // Outer plasma flame
      var outerGrad = ctx.createLinearGradient(40, ty, 40 - flameLen, ty);
      outerGrad.addColorStop(0, 'rgba(56, 254, 220, 0.9)');
      outerGrad.addColorStop(0.4, 'rgba(239, 125, 13, 0.7)');
      outerGrad.addColorStop(1, 'rgba(239, 125, 13, 0)');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.moveTo(40, ty - flameW);
      ctx.quadraticCurveTo(40 - flameLen * 0.4, ty - flameW * 0.8, 40 - flameLen, ty);
      ctx.quadraticCurveTo(40 - flameLen * 0.4, ty + flameW * 0.8, 40, ty + flameW);
      ctx.closePath();
      ctx.fill();

      // Inner white-hot core
      var innerLen = flameLen * 0.6;
      var innerW = flameW * 0.45;
      var innerGrad = ctx.createLinearGradient(40, ty, 40 - innerLen, ty);
      innerGrad.addColorStop(0, '#ffffff');
      innerGrad.addColorStop(0.6, 'rgba(56, 254, 220, 0.85)');
      innerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.moveTo(40, ty - innerW);
      ctx.lineTo(40 - innerLen, ty);
      ctx.lineTo(40, ty + innerW);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  // ── Ship Map Drawing (10-Room Layout) ───────────────────────
  function drawShipMap(ctx) {
    // Outer Cosmic Space Background
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Parallax background starfield outside hull
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 110; i++) {
      const sx = (i * 37 + animTime * 4) % WORLD_W;
      const sy = (i * 61) % WORLD_H;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. Draw Exterior Hull Silhouette & Solar Wings
    drawExteriorHullSilhouette(ctx);

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

    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(EMERGENCY_BUTTON.x, EMERGENCY_BUTTON.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    drawSprite(ctx, 'barrel', 1190, 660, 54, 54);
    drawSprite(ctx, 'barrel', 1400, 680, 52, 52);
    drawSprite(ctx, 'wireless', 1580, 660, 52, 52);
    drawSprite(ctx, 'generator', 1580, 940, 54, 54);

    // ── 2. Navigation / Cockpit (2520 to 2980, 750 to 1150) ──
    _drawRoom(ctx, 2520, 750, 460, 400, '#3f4f66', 'NAVIGATION');
    ctx.fillStyle = 'rgba(56, 254, 220, 0.35)';
    ctx.fillRect(2960, 820, 16, 260);

    // Pilot Chair (2850, 950)
    ctx.fillStyle = '#22223b';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    roundRect(ctx, PILOT_CHAIR.x - 24, PILOT_CHAIR.y - 28, 48, 56, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#132ed1';
    roundRect(ctx, PILOT_CHAIR.x - 16, PILOT_CHAIR.y - 34, 32, 12, 4);
    ctx.fill();
    ctx.stroke();

    drawSprite(ctx, 'chairArms', PILOT_CHAIR.x, PILOT_CHAIR.y, 58, 58);
    drawSprite(ctx, 'deskScreen', TASK_STATIONS.nav.x, TASK_STATIONS.nav.y, 72, 72);
    drawSprite(ctx, 'desk', 2600, 900, 64, 64);
    drawSprite(ctx, 'satellite', 2930, 800, 76, 76);

    // ── 3. O2 & Greenhouse (2050 to 2450, 280 to 620) ──
    _drawRoom(ctx, 2050, 280, 400, 340, '#384d43', 'O2 & GREENHOUSE');
    drawSprite(ctx, 'glassDome', 2150, 360, 96, 96);
    drawSprite(ctx, 'glassDome', 2350, 360, 96, 96);
    drawSprite(ctx, 'pipeStraight', 2250, 410, 64, 44);
    _drawTaskStation(ctx, TASK_STATIONS.o2_filter.x, TASK_STATIONS.o2_filter.y, '#2ecc71', 'O2 FILTER');

    // ── 4. Weapons & Shields (2150 to 2550, 1280 to 1620) ──
    _drawRoom(ctx, 2150, 1280, 400, 340, '#4d3838', 'WEAPONS & SHIELDS');
    drawSprite(ctx, 'turretDouble', 2350, 1340, 84, 84);
    drawSprite(ctx, 'deskScreen', 2350, 1460, 72, 72);
    drawSprite(ctx, 'satellite', 2460, 1500, 76, 76);
    drawSprite(ctx, 'generator', 2240, 1500, 70, 70);

    // ── 5. Storage & Cargo Airlock (1250 to 1750, 1250 to 1650) ──
    _drawRoom(ctx, 1250, 1250, 500, 400, '#594d3b', 'STORAGE & AIRLOCK');
    _drawHazardStripes(ctx, 1420, 1600, 160, 34);
    _drawTaskStation(ctx, TASK_STATIONS.cargo.x, TASK_STATIONS.cargo.y, '#e67e22', 'CARGO');
    drawSprite(ctx, 'barrel', 1340, 1380, 58, 58);
    drawSprite(ctx, 'barrel', 1650, 1380, 58, 58);
    drawSprite(ctx, 'trainCargo', 1520, 1420, 96, 68);
    drawSprite(ctx, 'rocketTop', 1660, 1310, 56, 56);
    drawSprite(ctx, 'barrelsRail', 1600, 1550, 96, 72);
    drawSprite(ctx, 'rover', 1370, 1570, 82, 82);

    // ── 6. Electrical (650 to 1050, 1180 to 1520) ──
    _drawRoom(ctx, 650, 1180, 400, 340, '#4a4836', 'ELECTRICAL');
    drawSprite(ctx, 'generator', 760, 1320, 82, 82);
    drawSprite(ctx, 'wireless', 950, 1320, 68, 68);
    drawSprite(ctx, 'pipeStraight', 760, 1220, 64, 44);
    drawSprite(ctx, 'pipeCorner', 840, 1220, 54, 54);
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
    drawSprite(ctx, 'pipeStraight', 280, 480, 64, 48);
    drawSprite(ctx, 'rocketBase', 190, 580, 68, 68);
    drawSprite(ctx, 'barrel', 390, 680, 52, 52);

    // ── 9. Lower Reactor (120 to 480, 1140 to 1480) ──
    _drawRoom(ctx, 120, 1140, 360, 340, '#30304a', 'LOWER REACTOR');
    _drawPulsingCore(ctx, 280, 1300, '#38fedc');
    drawSprite(ctx, 'generator', 190, 1400, 72, 72);
    drawSprite(ctx, 'rocketBase', 190, 1300, 68, 68);
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

    // Draw All Bulkhead Walls with 2.5D Beveled Shadows & Outlines
    WALLS.forEach(function (w) {
      // 2.5D front-face shadow
      ctx.fillStyle = '#141722';
      ctx.fillRect(w.x, w.y + Math.max(0, w.h - 8), w.w, Math.min(8, w.h));
      // 2.5D top lip / roof face
      ctx.fillStyle = '#2b3040';
      ctx.fillRect(w.x, w.y, w.w, Math.max(2, w.h - 8));
      // Comic black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      // Subtle top inner highlight
      ctx.strokeStyle = '#3d445c';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x + 1, w.y + 1, Math.max(0, w.w - 2), Math.max(0, w.h - 9));
    });

    // Draw Automatic Sliding Airlock Doors
    drawSlidingDoors(ctx, latestGameState ? latestGameState.players : null);
  }

  function _drawRoom(ctx, x, y, w, h, floorColor, label) {
    // Floor Base
    ctx.fillStyle = floorColor;
    ctx.fillRect(x, y, w, h);

    // Floor Tiles / Grating Pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (var gx = x + 30; gx < x + w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (var gy = y + 30; gy < y + h; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // Metallic Inner Trim Border
    ctx.strokeStyle = '#222634';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = '#4a536e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    ctx.restore();

    // Large Stenciled Floor Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.font = '900 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
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

  // ── Ambient Room Particles System ───────────────────────────
  const AMBIENT_PARTICLES = [];
  function updateAndDrawParticles(ctx, scene, players) {
    // 1. Greenhouse O2 bubbles
    if (scene !== 'moon' && Math.random() < 0.28 && AMBIENT_PARTICLES.length < 90) {
      AMBIENT_PARTICLES.push({
        type: 'bubble',
        x: 2090 + Math.random() * 320,
        y: 600,
        vy: -0.7 - Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 0.3,
        r: 2 + Math.random() * 3.5,
        alpha: 0.7,
        life: 1.0
      });
    }

    // 2. Electrical sparks
    if (scene !== 'moon' && Math.random() < 0.06 && AMBIENT_PARTICLES.length < 90) {
      for (var s = 0; s < 4; s++) {
        AMBIENT_PARTICLES.push({
          type: 'spark',
          x: 760 + (Math.random() - 0.5) * 50,
          y: 1320 + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 3.5,
          vy: (Math.random() - 0.5) * 3.5,
          r: 1.5 + Math.random() * 1.5,
          alpha: 1.0,
          life: 0.35 + Math.random() * 0.2
        });
      }
    }

    // 3. Moon walking dust puffs
    if (scene === 'moon' && players) {
      Object.values(players).forEach(function (p) {
        if (p.moving && Math.random() < 0.35 && AMBIENT_PARTICLES.length < 90) {
          AMBIENT_PARTICLES.push({
            type: 'dust',
            x: p.x + (Math.random() - 0.5) * 16,
            y: p.y + 18,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.3 - Math.random() * 0.4,
            r: 3 + Math.random() * 4,
            alpha: 0.45,
            life: 0.6
          });
        }
      });
    }

    // Update & draw particles
    for (var i = AMBIENT_PARTICLES.length - 1; i >= 0; i--) {
      var p = AMBIENT_PARTICLES[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        AMBIENT_PARTICLES.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.type === 'bubble') {
        ctx.fillStyle = 'rgba(78, 205, 120, 0.65)';
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.fillStyle = '#fff455';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = '#b0b5c0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Dynamic 2D Lighting (Additive Glow Pools) ───────────────
  function drawDynamicLighting(ctx, scene, gameState) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    if (scene !== 'moon') {
      // 1. Reactor cores: pulsing cyan
      var rCorePulse = 110 + Math.sin(animTime * 4) * 20;
      [ { x: 280, y: 580 }, { x: 280, y: 1300 } ].forEach(function (pos) {
        var grad = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, rCorePulse);
        grad.addColorStop(0, 'rgba(56, 254, 220, 0.45)');
        grad.addColorStop(0.5, 'rgba(19, 46, 209, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rCorePulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Greenhouse emerald green domes
      [ { x: 2150, y: 400 }, { x: 2350, y: 400 } ].forEach(function (pos) {
        var grad = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, 110);
        grad.addColorStop(0, 'rgba(46, 204, 113, 0.38)');
        grad.addColorStop(0.6, 'rgba(17, 127, 45, 0.15)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 110, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Navigation holo-console
      var navGrad = ctx.createRadialGradient(2850, 950, 10, 2850, 950, 140);
      navGrad.addColorStop(0, 'rgba(56, 180, 254, 0.38)');
      navGrad.addColorStop(0.7, 'rgba(56, 254, 220, 0.12)');
      navGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = navGrad;
      ctx.beginPath();
      ctx.arc(2850, 950, 140, 0, Math.PI * 2);
      ctx.fill();

      // 4. Cafeteria central table pool
      var cafeGrad = ctx.createRadialGradient(1400, 800, 15, 1400, 800, 160);
      cafeGrad.addColorStop(0, 'rgba(255, 235, 190, 0.24)');
      cafeGrad.addColorStop(0.7, 'rgba(239, 125, 13, 0.08)');
      cafeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cafeGrad;
      ctx.beginPath();
      ctx.arc(1400, 800, 160, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Lunar warm gold pools over cheese wheels
      if (gameState && gameState.cheeseWheels) {
        gameState.cheeseWheels.forEach(function (cw) {
          if (!cw.collected) {
            var g = ctx.createRadialGradient(cw.x, cw.y, 5, cw.x, cw.y, 75);
            g.addColorStop(0, 'rgba(245, 245, 87, 0.45)');
            g.addColorStop(0.6, 'rgba(239, 125, 13, 0.15)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cw.x, cw.y, 75, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
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
        dead: !p.alive,
        hat: p.specialty
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
        dead: !localP.alive,
        hat: localP.specialty
      });

      ctx.fillStyle = '#38fedc';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.strokeText(localP.name || localPlayerId, localP.x, localP.y - 36);
      ctx.fillText(localP.name || localPlayerId, localP.x, localP.y - 36);

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
    }

    // Ambient Room Particles (Greenhouse O2 bubbles, Electrical sparks, Lunar walking dust)
    updateAndDrawParticles(ctx, currentScene, players);

    // Dynamic 2D Lighting (Reactors, Greenhouse, Navigation holo-console, Cafeteria, Moon cheese)
    drawDynamicLighting(ctx, currentScene, state);

    ctx.restore(); // End camera transform

    // Fog of War
    if (localP) {
      drawFog(ctx, localP.x, localP.y, visionRadius, isGhost);
    }

    // Vignettes
    if (o2 < 35) drawHypoxiaVignette(ctx, o2);
    if (starving) drawStarvationVignette(ctx);

    // Waypoint Guide Arrows
    drawWaypointGuideArrows(ctx, localP, state);

    // Minimap Overlay
    if (minimapOpen) {
      drawMinimap(ctx, state, localP);
    }
  }

  // ── Active Objectives & Waypoint Guide Arrows ─────────────
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

  function drawWaypointGuideArrows(ctx, localPlayer, gameState) {
    if (!localPlayer || currentScene !== 'ship') return;
    var objectives = getActiveObjectives(gameState);
    if (!objectives || objectives.length === 0) return;

    var screenW = canvasW;
    var screenH = canvasH;
    var margin = 60;

    objectives.slice(0, 2).forEach(function (obj) {
      var targetScreen = worldToScreen(obj.x, obj.y);

      if (targetScreen.x > 100 && targetScreen.x < screenW - 100 &&
          targetScreen.y > 100 && targetScreen.y < screenH - 100) {
        return;
      }

      var centerX = screenW / 2;
      var centerY = screenH / 2;
      var dx = targetScreen.x - centerX;
      var dy = targetScreen.y - centerY;
      var angle = Math.atan2(dy, dx);

      var edgeX = centerX + Math.cos(angle) * (centerX - margin);
      var edgeY = centerY + Math.sin(angle) * (centerY - margin);
      edgeX = Math.max(margin, Math.min(screenW - margin, edgeX));
      edgeY = Math.max(margin, Math.min(screenH - margin, edgeY));

      var bounce = Math.sin(Date.now() * 0.008) * 8;
      edgeX += Math.cos(angle) * bounce;
      edgeY += Math.sin(angle) * bounce;

      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(angle);

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

      ctx.save();
      ctx.font = 'bold 13px "Courier New", monospace';
      var textWidth = ctx.measureText(obj.label).width;
      var badgeX = Math.max(10, Math.min(screenW - textWidth - 30, edgeX - textWidth / 2));
      var badgeY = edgeY > screenH / 2 ? edgeY - 26 : edgeY + 26;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX - 4, badgeY - 14, textWidth + 16, 22, 6);
      } else {
        ctx.rect(badgeX - 4, badgeY - 14, textWidth + 16, 22);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = obj.color;
      ctx.fillText(obj.label, badgeX + 4, badgeY + 2);
      ctx.restore();
    });
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
