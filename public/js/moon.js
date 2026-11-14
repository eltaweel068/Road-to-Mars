window.RTM = window.RTM || {};
window.RTM.Moon = (function () {
  'use strict';

  var SPEED = 320;
  var STARVE_SPEED = 192;
  var STEP = 1 / 60;
  var COLLECT_RANGE = 110;
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
  var collected = {};
  var nearNode = null;
  var pendingNodeId = null;
  var pendingTimer = null;
  var killTarget = null;

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

  function markNode(node) {
    if (!node || !node.id) return;
    var match = String(node.id).match(/-(\d+)$/);
    if (!match) return;
    var index = Math.max(0, Number(match[1]) - 1);
    collected[(node.type === 'cheese' ? 'cheese_' : 'rock_') + index] = true;
  }

  function rebuildCollected(nodes) {
    collected = {};
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].collected) markNode(nodes[i]);
    }
  }

  function syncLocalFromState(player) {
    if (!player) return;
    if (!initialized) {
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
      localX = clamp(localX + dx * speed * dt, 20, RTM.Renderer.WORLD_W - 20);
      localY = clamp(localY + dy * speed * dt, 20, RTM.Renderer.WORLD_H - 20);
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
    player.scene = 'moon';
    var moved = Math.abs(localX - previousX) > 0.01 || Math.abs(localY - previousY) > 0.01;
    if (moved || localMoving !== wasMoving || localDirection !== previousDirection) {
      emitMove(localMoving);
    }
  }

  function nearestNode(gameState, player) {
    nearNode = null;
    if (!player || !player.alive) return;
    var nodes = (gameState.moon && gameState.moon.nodes) || [];
    var best = COLLECT_RANGE;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.collected || node.id === pendingNodeId) continue;
      var distance = Math.hypot(localX - node.x, localY - node.y);
      if (distance <= best) {
        best = distance;
        nearNode = node;
      }
    }
  }

  function computeNearby(gameState, player) {
    nearestNode(gameState, player);
    killTarget = null;
    var near = {
      nearStation: !!nearNode,
      nearMoonItem: !!nearNode,
      nearPilotChair: false,
      nearEmergencyButton: false,
      nearCrewmate: false,
      canReport: !!player && player.alive,
      meetingCooldown: false,
      canLandMoon: false,
      canDepartMoon: false
    };
    if (!player || !player.alive) return near;
    var lastEnd = gameState.room && gameState.room.lastMeetingEndAt ? gameState.room.lastMeetingEndAt : 0;
    near.meetingCooldown = Date.now() - lastEnd < 15000;
    if (RTM.Net.isImpostor()) {
      var ids = Object.keys(gameState.players);
      var closest = KILL_RANGE;
      for (var i = 0; i < ids.length; i++) {
        var other = gameState.players[ids[i]];
        if (other.id === player.id || !other.alive || other.role === 'impostor') continue;
        if (other.scene && other.scene !== 'moon') continue;
        var distance = Math.hypot(localX - other.x, localY - other.y);
        if (distance <= closest) {
          closest = distance;
          killTarget = other;
          near.nearCrewmate = true;
        }
      }
    }
    if ((RTM.Net.isPilot() || RTM.Net.isHost()) && gameState.moon && gameState.moon.state === 'landed') {
      near.canDepartMoon = true;
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
    return Object.assign({}, gameState, {
      players: players,
      bodies: [],
      resources: {
        o2: gameState.telemetry.o2,
        food: gameState.telemetry.food,
        fuel: gameState.telemetry.fuel,
        starving: gameState.telemetry.starving
      },
      moonCollected: collected
    });
  }

  function render(gameState, player) {
    if (!RTM.Renderer) return;
    RTM.Renderer.setLocalPlayer(RTM.Net.playerId);
    RTM.Renderer.setScene('moon');
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
    if (gameState.phase !== 'playing' || gameState.scene !== 'moon' || gameState.moon.state !== 'landed') return;
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
        if (gameState && player && gameState.phase === 'playing' && gameState.scene === 'moon' && gameState.moon.state === 'landed') {
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
      if (RTM.Meeting && RTM.Meeting.callMeeting) RTM.Meeting.callMeeting();
      return;
    }
    if (key === 'q') {
      event.preventDefault();
      kill();
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(key) >= 0) {
      event.preventDefault();
      keys[key] = true;
    }
  }

  function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
  }

  function useAction() {
    if (!active || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || gameState.scene !== 'moon' || gameState.moon.state !== 'landed') return;
    var player = localPlayer();
    if (!player || !player.alive) return;
    if (!nearNode) nearestNode(gameState, player);
    if (!nearNode) return;
    var node = nearNode;
    pendingNodeId = node.id;
    nearNode = null;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(function () {
      if (pendingNodeId === node.id) pendingNodeId = null;
    }, 1500);
    if (node.type === 'cheese') {
      RTM.Net.emit('moon:collect-cheese', { nodeId: node.id });
    } else {
      RTM.Net.emit('moon:collect-sample', { nodeId: node.id });
    }
  }

  function kill() {
    if (!active || !RTM.Net || !RTM.Net.isImpostor() || !killTarget) return;
    RTM.Net.emit('player:kill', { targetId: killTarget.id });
    killTarget = null;
  }

  function depart() {
    if (!active || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.moon.state !== 'landed') return;
    if (!RTM.Net.isPilot() && !RTM.Net.isHost()) return;
    RTM.Net.emit('moon:depart');
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
      RTM.Net.on('moon:nodes', function (data) {
        rebuildCollected(data && data.nodes);
      });
      RTM.Net.on('moon:state', function (data) {
        if (data && data.moon && data.moon.nodes) rebuildCollected(data.moon.nodes);
        initialized = false;
        remotePositions = {};
      });
      RTM.Net.on('moon:node-collected', function (data) {
        if (data && data.node) {
          if (data.node.id === pendingNodeId) {
            pendingNodeId = null;
            if (pendingTimer) {
              clearTimeout(pendingTimer);
              pendingTimer = null;
            }
          }
          markNode(data.node);
        }
      });
      RTM.Net.on('game:error', function () {
        pendingNodeId = null;
      });
      RTM.Net.on('game:started', function () {
        collected = {};
        pendingNodeId = null;
        remotePositions = {};
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
    depart: depart,
    getCollected: function () { return collected; },
    getPosition: function () { return { x: localX, y: localY }; }
  };
})();
