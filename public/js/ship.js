window.RTM = window.RTM || {};
window.RTM.Ship = (function () {
  'use strict';

  var SPEED = 320;
  var STARVE_SPEED = 192;
  var RADIUS = 16;
  var STEP = 1 / 60;
  var KILL_RANGE = 80;

  var active = false;
  var initialized = false;
  var localX = 1350;
  var localY = 700;
  var localDirection = 'right';
  var localMoving = false;
  var seq = 0;
  var keys = {};
  var accumulator = 0;
  var lastTime = 0;
  var rafId = null;
  var remotePositions = {};
  var killTarget = null;
  var lastMeetingEndAt = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isTyping(event) {
    var target = event.target;
    if (!target) return false;
    var tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  }

  function localPlayer() {
    if (!RTM.Net) return null;
    var gameState = RTM.Net.getState();
    return gameState.players[RTM.Net.playerId] || null;
  }

  function collides(x, y) {
    var walls = RTM.Renderer.WALLS || [];
    for (var i = 0; i < walls.length; i++) {
      var wall = walls[i];
      var closestX = clamp(x, wall.x, wall.x + wall.w);
      var closestY = clamp(y, wall.y, wall.y + wall.h);
      var dx = x - closestX;
      var dy = y - closestY;
      if (dx * dx + dy * dy < RADIUS * RADIUS) return true;
    }
    return false;
  }

  function syncLocalFromState(player) {
    if (!player) return;
    if (!initialized || player.scene !== 'ship') {
      localX = Number(player.x) || 1350;
      localY = Number(player.y) || 700;
      localDirection = player.direction || player.d || 'right';
      initialized = true;
      return;
    }
    if (Math.hypot(player.x - localX, player.y - localY) > 120) {
      localX = Number(player.x) || localX;
      localY = Number(player.y) || localY;
    }
  }

  function emitMove(moving) {
    if (!RTM.Net) return;
    seq++;
    RTM.Net.emit('player:move', {
      x: Math.round(localX * 100) / 100,
      y: Math.round(localY * 100) / 100,
      d: localDirection,
      direction: localDirection,
      moving: moving,
      seq: seq
    });
  }

  function stepMovement(dt, gameState, player) {
    var dx = 0;
    var dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;

    var wasMoving = localMoving;
    var previousX = localX;
    var previousY = localY;
    var previousDirection = localDirection;
    var speed = player.ghost ? SPEED : (gameState.telemetry.starving ? STARVE_SPEED : SPEED);

    if (dx !== 0 || dy !== 0) {
      var length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      var nextX = clamp(localX + dx * speed * dt, 20, RTM.Renderer.WORLD_W - 20);
      var nextY = clamp(localY + dy * speed * dt, 20, RTM.Renderer.WORLD_H - 20);
      if (player.ghost) {
        localX = nextX;
        localY = nextY;
      } else {
        if (!collides(nextX, localY)) localX = nextX;
        if (!collides(localX, nextY)) localY = nextY;
      }
      if (Math.abs(dx) > 0.01) localDirection = dx < 0 ? 'left' : 'right';
      localMoving = true;
    } else {
      localMoving = false;
    }

    player.x = localX;
    player.y = localY;
    player.direction = localDirection;
    player.d = localDirection;
    player.moving = localMoving;
    player.scene = 'ship';

    var moved = Math.abs(localX - previousX) > 0.01 || Math.abs(localY - previousY) > 0.01;
    if (moved || localMoving !== wasMoving || localDirection !== previousDirection) {
      emitMove(localMoving);
    }
  }

  function computeNearby(gameState, player) {
    var near = {
      nearStation: false,
      nearPilotChair: false,
      nearEmergencyButton: false,
      nearCrewmate: false,
      canReport: false,
      meetingCooldown: false,
      canLandMoon: false,
      canDepartMoon: false,
      station: null
    };
    killTarget = null;
    if (!player || !player.alive) return near;
    near.canReport = true;
    if (RTM.Renderer.getTaskStationAt) {
      near.station = RTM.Renderer.getTaskStationAt(localX, localY);
      near.nearStation = !!near.station;
    }
    near.nearPilotChair = RTM.Renderer.isNearPilotChair(localX, localY) ||
      (RTM.Renderer.isInNavigationRoom && RTM.Renderer.isInNavigationRoom(localX, localY));
    near.nearEmergencyButton = RTM.Renderer.isNearEmergencyButton(localX, localY);
    var lastEnd = gameState.room && gameState.room.lastMeetingEndAt ? gameState.room.lastMeetingEndAt : lastMeetingEndAt;
    near.meetingCooldown = Date.now() - lastEnd < 15000;
    var canCommand = RTM.Net.isPilot() || RTM.Net.isHost();
    if (canCommand && gameState.moon && gameState.moon.state === 'orbit') {
      near.canLandMoon = gameState.telemetry.fuel >= 10 && gameState.telemetry.o2 >= 12;
    }
    return near;
  }

  function buildRenderState(gameState) {
    var players = {};
    var ids = Object.keys(gameState.players);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var source = gameState.players[id];
      var copy = Object.assign({}, source);
      if (id !== RTM.Net.playerId) {
        var target = remotePositions[id];
        if (!target) {
          target = { x: source.x, y: source.y };
          remotePositions[id] = target;
        }
        if (Math.hypot(target.x - source.x, target.y - source.y) > 300) {
          target.x = source.x;
          target.y = source.y;
        } else {
          target.x += (source.x - target.x) * 0.22;
          target.y += (source.y - target.y) * 0.22;
        }
        copy.x = target.x;
        copy.y = target.y;
      } else {
        copy.x = localX;
        copy.y = localY;
        copy.direction = localDirection;
        copy.d = localDirection;
        copy.moving = localMoving;
      }
      players[id] = copy;
    }
    var moonCollected = RTM.Moon && RTM.Moon.getCollected ? RTM.Moon.getCollected() : {};
    return Object.assign({}, gameState, {
      players: players,
      bodies: [],
      resources: {
        o2: gameState.telemetry.o2,
        food: gameState.telemetry.food,
        fuel: gameState.telemetry.fuel,
        starving: gameState.telemetry.starving
      },
      moonCollected: moonCollected
    });
  }

  function render(gameState, player) {
    if (!RTM.Renderer) return;
    RTM.Renderer.setLocalPlayer(RTM.Net.playerId);
    RTM.Renderer.setScene('ship');
    RTM.Renderer.render(buildRenderState(gameState));
    if (RTM.HUD && RTM.HUD.updateButtons) {
      RTM.HUD.updateButtons(computeNearby(gameState, player));
    }
  }

  function update(dt) {
    if (!active || !RTM.Net) return;
    if (RTM.Tasks && RTM.Tasks.isOpen && RTM.Tasks.isOpen()) return;
    if (RTM.Cockpit && RTM.Cockpit.isOpen && RTM.Cockpit.isOpen()) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || gameState.scene !== 'ship') return;
    var player = localPlayer();
    if (!player) return;
    syncLocalFromState(player);
    stepMovement(dt, gameState, player);
    render(gameState, player);
  }

  function loop(timestamp) {
    rafId = requestAnimationFrame(loop);
    var dt = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;
    if (active) {
      accumulator += dt;
      var steps = 0;
      while (accumulator >= STEP && steps < 5) {
        update(STEP);
        accumulator -= STEP;
        steps++;
      }
      if (steps === 0) {
        var gameState = RTM.Net ? RTM.Net.getState() : null;
        var player = localPlayer();
        if (gameState && player && gameState.phase === 'playing' && gameState.scene === 'ship') {
          render(gameState, player);
        }
      }
    } else {
      accumulator = 0;
    }
  }

  function onKeyDown(event) {
    if (!active || isTyping(event)) return;
    var key = event.key.toLowerCase();
    if (key === 'e' || key === ' ') {
      event.preventDefault();
      useAction();
      return;
    }
    if (key === 'r') {
      event.preventDefault();
      callMeeting();
      return;
    }
    if (key === 'p') {
      event.preventDefault();
      if (RTM.HUD && RTM.HUD.claimAndEnterPilot) {
        RTM.HUD.claimAndEnterPilot();
      } else if (RTM.Cockpit && RTM.Cockpit.show) {
        if (RTM.Net) RTM.Net.emit('pilot:seat:claim');
        RTM.Cockpit.show();
      }
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(key) >= 0) {
      event.preventDefault();
      keys[key] = true;
    }
  }

  function onKeyUp(event) {
    var key = event.key.toLowerCase();
    keys[key] = false;
  }

  function useAction() {
    if (!active || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || gameState.scene !== 'ship') return;
    var player = localPlayer();
    if (!player || !player.alive) return;
    var station = RTM.Renderer.getTaskStationAt(localX, localY);
    if (station) {
      if (RTM.Tasks && RTM.Tasks.open) RTM.Tasks.open(station.id || station);
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

  function kill() {
    if (!active || !RTM.Net || !RTM.Net.isImpostor()) return;
    if (!killTarget) return;
    RTM.Net.emit('player:kill', { targetId: killTarget.id });
    killTarget = null;
  }

  function callMeeting() {
    if (!active || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || !RTM.Net.isAlive()) return;
    var lastEnd = gameState.room && gameState.room.lastMeetingEndAt ? gameState.room.lastMeetingEndAt : lastMeetingEndAt;
    if (Date.now() - lastEnd < 15000) {
      if (RTM.HUD) RTM.HUD.showNotification('Emergency meeting cooldown is active.', 'info');
      return;
    }
    RTM.Net.emit('meeting:start');
  }

  function setActive(value) {
    active = !!value;
    if (!active) {
      keys = {};
      localMoving = false;
      accumulator = 0;
    } else {
      initialized = false;
    }
  }

  function init() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    if (RTM.Net) {
      RTM.Net.on('meeting:ended', function () {
        lastMeetingEndAt = Date.now();
      });
      RTM.Net.on('game:started', function () {
        initialized = false;
        remotePositions = {};
      });
      RTM.Net.on('moon:state', function () {
        initialized = false;
      });
    }
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  return {
    init: init,
    setActive: setActive,
    isActive: function () { return active; },
    useAction: useAction,
    kill: kill,
    callMeeting: callMeeting,
    getPosition: function () { return { x: localX, y: localY }; }
  };
})();
