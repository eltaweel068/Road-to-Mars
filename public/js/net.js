window.RTM = window.RTM || {};
window.RTM.Net = (function () {
  'use strict';

  var SERVER_EVENTS = [
    'server:ready', 'player:registered', 'player:unregistered', 'room:created', 'room:joined',
    'room:join:error', 'room:deleted', 'rooms:updated', 'player:joined',
    'player:left', 'room:updated', 'room:left', 'role:assigned', 'game:started',
    'game:notif', 'game:ended', 'game:error',
    'mission:configured', 'telemetry:updated', 'player:moved',
    'player:animation', 'player:killed', 'player:ejected', 'task:updated',
    'pilot:seat:locked', 'pilot:seat:unlocked', 'pilot:seat:updated',
    'pilot:thrust', 'moon:state', 'moon:nodes', 'moon:node-collected',
    'meeting:started', 'meeting:voted', 'meeting:ended', 'cargo:jettisoned',
    'room:message', 'state:snapshot', 'player:specialty',
    'emergency:started', 'emergency:cleared', 'cockpit:asteroid:alert',
    'mars:arrived'
  ];

  var EVENT_ALIASES = {
    'pilot:seat:request': 'pilot:seat:claim',
    'room:addBot': 'room:add-bot',
    'room:removeBot': 'room:remove-bot',
    'meeting:call': 'meeting:start',
    'room:sendMessage': 'room:send:message',
    'pilot:thrust:update': 'pilot:thrust'
  };

  var CREW_COLORS = ['#c51111', '#132ed1', '#117f2d', '#ed54ba', '#ef7d0e', '#f5f557'];
  var BOT_NAMES = ['Houston', 'Jebediah', 'Valentina', 'Buzz', 'Ripley'];
  var OFFLINE_LAUNCHERS = { electron: 1200, falcon9: 1600, sls: 2200 };
  var OFFLINE_PAYLOADS = {
    light: { mass: 70, science: 90 },
    medium: { mass: 190, science: 200 },
    heavy: { mass: 340, science: 380 }
  };
  var OFFLINE_CHEESE = [
    { x: 550, y: 550 }, { x: 1100, y: 550 }, { x: 1650, y: 550 }, { x: 2200, y: 550 },
    { x: 2750, y: 550 }, { x: 800, y: 1250 }, { x: 1600, y: 1250 }, { x: 2400, y: 1250 }
  ];
  var OFFLINE_ROCKS = [
    { x: 600, y: 1650 }, { x: 1600, y: 1650 }, { x: 2600, y: 1650 }, { x: 2750, y: 900 }
  ];

  var socket = null;
  var offlineMode = false;
  var playerId = null;
  var roomId = null;
  var bus = new EventTarget();
  var listeners = {};
  var offlineTimers = [];
  var offlineMeetingTimer = null;
  var offlineTaskCooldowns = {};

  var state = {
    phase: 'menu',
    scene: 'ship',
    room: null,
    players: {},
    telemetry: {
      fuel: 100, o2: 100, food: 100, science: 0, marsProgress: 0,
      maxMass: 1080, totalMass: 0, crewMass: 0, aliveCount: 0,
      ghostCount: 0, massPenalty: 1, starving: false, overloaded: false,
      hull: 100, autopilot: true, emergencyMode: null,
      water: 100, co2: 8, gyroDrift: 0, marsArrived: false
    },
    tasks: { progress: 0, completions: 0, byTask: {} },
    settings: { rocket: 'falcon9', sciencePayload: 'medium', foodMass: 160, o2Mass: 150, fuelMass: 250 },
    pilotSeat: { seatId: 'pilot', occupantId: null, playerId: null, locked: false },
    pilotThrust: { playerId: null, throttle: 0, heading: 0 },
    moon: { state: 'orbit', active: false, nodes: [] },
    meeting: null,
    lastMeetingResults: null,
    localRole: null,
    missionUpdatedBy: null,
    missionUpdatedByName: null
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function canonicalEvent(event) {
    return EVENT_ALIASES[event] || event;
  }

  function normalizeEmitPayload(rootEvent, data) {
    if (rootEvent === 'pilot:thrust:update') {
      var thrust = Object.assign({}, data || {});
      if (thrust.throttle == null) thrust.throttle = Number(thrust.thrust || 0);
      if (thrust.heading == null) thrust.heading = 0;
      return thrust;
    }
    if (rootEvent === 'room:sendMessage') {
      var chat = Object.assign({}, data || {});
      if (chat.message == null) chat.message = chat.text || '';
      return chat;
    }
    return data;
  }

  function dispatch(event, data) {
    var cbs = listeners[event];
    if (cbs) {
      for (var i = 0; i < cbs.length; i++) {
        try { cbs[i](data); } catch (e) { console.error('[Net] listener error on', event, e); }
      }
    }
    try {
      bus.dispatchEvent(new CustomEvent(event, { detail: data }));
    } catch (_) {}
  }

  function seatOccupant(source) {
    if (!source) return null;
    if (source.occupantId) return source.occupantId;
    if (source.playerId) return source.playerId;
    if (source.seat) return source.seat.occupantId || source.seat.playerId || null;
    return null;
  }

  function normalizePlayer(player) {
    if (!player) return player;
    var alive = player.isAlive != null ? player.isAlive !== false : player.alive !== false;
    player.alive = alive;
    player.isAlive = alive;
    if (player.ghost == null) player.ghost = !alive;
    if (player.direction == null) player.direction = player.d || 'right';
    if (player.d == null) player.d = player.direction;
    if (player.mass == null) player.mass = player.ghost ? 0 : 80;
    if (!player.specialty) player.specialty = 'crew';
    player.dead = player.ghost ? false : !alive;
    return player;
  }

  function normalizeSeat(seat) {
    var source = seat || {};
    var occupantId = seatOccupant(source);
    state.pilotSeat = Object.assign({}, source, {
      seatId: source.seatId || 'pilot',
      occupantId: occupantId,
      playerId: occupantId,
      locked: source.locked === true
    });
    var local = state.players[playerId];
    if (local) local.isPilot = occupantId === playerId;
  }

  function syncPlayerList(players) {
    if (!players) return;
    if (Array.isArray(players)) {
      var asObject = {};
      for (var i = 0; i < players.length; i++) {
        if (players[i] && players[i].id) asObject[players[i].id] = players[i];
      }
      players = asObject;
    }
    state.players = players;
    for (var id in state.players) {
      if (Object.prototype.hasOwnProperty.call(state.players, id)) {
        normalizePlayer(state.players[id]);
      }
    }
    if (state.localRole && state.players[playerId]) {
      state.players[playerId].role = state.localRole;
    }
  }

  function syncRoom(data) {
    var room = data && data.room;
    if (!room && data && data.id && data.players) room = data;
    if (room) {
      state.room = room;
      roomId = room.id || room.code || roomId;
      if (room.settings) state.settings = Object.assign({}, state.settings, room.settings);
      if (room.telemetry) Object.assign(state.telemetry, room.telemetry);
      if (room.tasks) state.tasks = Object.assign({}, state.tasks, room.tasks);
      if (room.pilotSeat) normalizeSeat(room.pilotSeat);
      if (room.pilotThrust) state.pilotThrust = Object.assign({}, state.pilotThrust, room.pilotThrust);
      if (room.moon) state.moon = Object.assign({}, state.moon, room.moon);
      if (room.scene) state.scene = room.scene;
      if (room.phase === 'lobby') state.phase = 'lobby';
    }
    var players = (data && data.room && data.room.players) ||
      (data && data.players) ||
      (room && room.players) ||
      state.players;
    syncPlayerList(players);
  }

  function setLocalRole(data) {
    var role = null;
    if (data && Object.prototype.hasOwnProperty.call(data, 'isImposter')) {
      role = data.isImposter === true ? 'impostor' : 'crewmate';
    } else if (data && data.role) {
      role = data.role === 'impostor' || data.role === 'imposter' ? 'impostor' : 'crewmate';
    }
    if (!role) return;
    state.localRole = role;
    if (state.players[playerId]) state.players[playerId].role = role;
  }

  function syncTasks(tasks) {
    if (!tasks) return;
    state.tasks = {
      progress: tasks.progress != null ? tasks.progress : state.tasks.progress,
      completions: tasks.completions != null ? tasks.completions : state.tasks.completions,
      byTask: Object.assign({}, state.tasks.byTask, tasks.byTask || {})
    };
  }

  function dispatchTelemetry() {
    dispatch('telemetry:updated', { telemetry: state.telemetry });
  }

  var offline = {
    registerPlayer: function (data) {
      playerId = uuid();
      state.players = {};
      state.players[playerId] = normalizePlayer({
        id: playerId,
        name: (data && data.name) || 'Crew',
        color: (data && data.color) || CREW_COLORS[0],
        x: 1350, y: 700, direction: 'right', d: 'right',
        moving: false, scene: 'ship', alive: true, ghost: false,
        mass: 80, role: null, isHost: true, isBot: false, isPilot: false
      });
      state.localRole = null;
      dispatch('player:registered', { playerId: playerId, name: state.players[playerId].name });
    },

    createRoom: function () {
      if (!state.players[playerId]) return;
      var settings = Object.assign({}, state.settings);
      var room = {
        id: 'OFFLINE',
        code: 'OFFLINE',
        hostId: playerId,
        phase: 'lobby',
        scene: 'ship',
        slots: 6,
        settings: settings,
        players: state.players,
        telemetry: state.telemetry,
        tasks: state.tasks,
        pilotSeat: state.pilotSeat,
        moon: state.moon,
        meeting: null
      };
      state.room = room;
      roomId = room.id;
      state.phase = 'lobby';
      state.scene = 'ship';
      state.meeting = null;
      state.moon = { state: 'orbit', active: false, nodes: [] };
      state.tasks = { progress: 0, completions: 0, byTask: {} };
      state.players[playerId].isHost = true;
      offline.recompute();
      dispatch('room:created', { roomId: room.id, room: room });
      dispatch('room:joined', { roomId: room.id, room: room, player: state.players[playerId], started: false, you: playerId });
    },

    joinRoom: function () {
      if (!state.room) {
        dispatch('room:join:error', {
          code: 'offline_mode',
          message: 'Cannot join room in offline mode. Please open the game using the host\'s server URL (e.g. http://' + (location.hostname || 'YOUR_IP') + ':3000).'
        });
        return;
      }
      dispatch('room:joined', {
        roomId: state.room.id,
        room: state.room,
        player: state.players[playerId],
        started: state.room.phase !== 'lobby',
        you: playerId
      });
    },

    leaveRoom: function () {
      offline.clearTimers();
      state.room = null;
      roomId = null;
      state.phase = 'lobby';
      state.meeting = null;
      dispatch('room:left', {});
    },

    addBot: function () {
      if (!state.room) return;
      var ids = Object.keys(state.players);
      if (ids.length >= 6) return;
      var bots = ids.filter(function (id) { return state.players[id].isBot; });
      var botId = 'bot-' + uuid().slice(0, 8);
      var name = BOT_NAMES[bots.length] || 'Bot' + (bots.length + 1);
      state.players[botId] = normalizePlayer({
        id: botId, name: name, color: CREW_COLORS[(ids.length) % CREW_COLORS.length],
        x: 1300 + (ids.length * 35), y: 700, direction: 'right', d: 'right',
        moving: false, scene: 'ship', alive: true, ghost: false,
        mass: 80, role: 'crewmate', isHost: false, isBot: true, isPilot: false
      });
      state.room.players = state.players;
      offline.recompute();
      dispatch('player:joined', { player: state.players[botId], room: state.room });
      dispatch('room:updated', state.room);
      dispatchTelemetry();
    },

    removeBot: function (data) {
      if (!state.room) return;
      var removeId = data && (data.botId || data.playerId);
      if (!removeId || !state.players[removeId] || !state.players[removeId].isBot) {
        var bots = Object.keys(state.players).filter(function (id) { return state.players[id].isBot; });
        removeId = bots[bots.length - 1];
      }
      if (!removeId) return;
      var removed = state.players[removeId];
      delete state.players[removeId];
      offline.recompute();
      dispatch('player:left', { playerId: removeId, name: removed.name, room: state.room });
      dispatch('room:updated', state.room);
      dispatchTelemetry();
    },

    setSpecialty: function (data) {
      var local = state.players[playerId];
      if (!local) return;
      var specialty = data && data.specialty;
      if (!specialty) return;
      local.specialty = specialty;
      dispatch('player:specialty', {
        playerId: playerId,
        player: local,
        specialty: specialty
      });
      dispatch('room:updated', state.room);
    },
    recompute: function () {
      var ids = Object.keys(state.players);
      var alive = 0;
      for (var i = 0; i < ids.length; i++) {
        if (state.players[ids[i]].alive) alive++;
      }
      var t = state.telemetry;
      var payload = OFFLINE_PAYLOADS[state.settings.sciencePayload] || OFFLINE_PAYLOADS.medium;
      t.maxMass = OFFLINE_LAUNCHERS[state.settings.rocket] || 1080;
      t.payloadMass = payload.mass;
      t.foodMass = Number(state.settings.foodMass) || 0;
      t.o2Mass = Number(state.settings.o2Mass) || 0;
      t.fuelMass = Math.max(50, Math.min(400, Number(state.settings.fuelMass) || 250));
      t.aliveCount = alive;
      t.crewMass = alive * 80;
      t.ghostCount = ids.length - alive;
      t.totalMass = 270 + t.payloadMass + t.foodMass + t.o2Mass + t.fuelMass + t.crewMass;
      t.overloaded = t.totalMass > t.maxMass;
      t.massPenalty = t.overloaded ? t.totalMass / t.maxMass : 1;
      t.starving = t.food <= 0;
    },

    configureMission: function (data) {
      if (!state.room) return;
      var rocket = data.rocket || data.launcher || state.settings.rocket;
      var sciencePayload = data.sciencePayload || data.payload || state.settings.sciencePayload;
      if (!OFFLINE_LAUNCHERS[rocket]) rocket = 'falcon9';
      if (!OFFLINE_PAYLOADS[sciencePayload]) sciencePayload = 'medium';
      state.settings = {
        rocket: rocket,
        sciencePayload: sciencePayload,
        foodMass: Math.max(0, Math.min(500, Number(data.foodMass != null ? data.foodMass : state.settings.foodMass) || 0)),
        o2Mass: Math.max(0, Math.min(500, Number(data.o2Mass != null ? data.o2Mass : state.settings.o2Mass) || 0)),
        fuelMass: Math.max(50, Math.min(400, Number(data.fuelMass != null ? data.fuelMass : state.settings.fuelMass) || 250))
      };
      state.room.settings = state.settings;
      state.telemetry.launcher = rocket;
      state.telemetry.foodMass = state.settings.foodMass;
      state.telemetry.o2Mass = state.settings.o2Mass;
      state.telemetry.fuelMass = state.settings.fuelMass;
      state.telemetry.food = state.settings.foodMass > 0 ? 100 : 0;
      state.telemetry.o2 = state.settings.o2Mass > 0 ? 100 : 0;
      state.telemetry.science = OFFLINE_PAYLOADS[sciencePayload].science;
      state.missionUpdatedBy = playerId;
      state.missionUpdatedByName = (state.players[playerId] && state.players[playerId].name) || 'Crew';
      offline.recompute();
      dispatch('mission:configured', {
        settings: state.settings,
        telemetry: state.telemetry,
        by: playerId,
        byName: state.missionUpdatedByName
      });
      dispatchTelemetry();
      dispatch('room:updated', state.room);
    },

    startGame: function (data) {
      if (!state.room) return;
      if (data && data.fillBots === true) {
        while (Object.keys(state.players).length < 6) offline.addBot();
      }
      var ids = Object.keys(state.players);
      if (ids.length < 1) return;
      var i;
      for (i = 0; i < ids.length; i++) {
        var player = state.players[ids[i]];
        player.alive = true;
        player.isAlive = true;
        player.ghost = false;
        player.mass = 80;
        player.role = 'crewmate';
        player.dead = false;
        player.scene = 'ship';
        player.x = 1350 + (i % 3) * 60;
        player.y = 700 + Math.floor(i / 3) * 80;
        player.direction = 'right';
        player.d = 'right';
        player.moving = false;
        player.isPilot = false;
        player.isHost = player.id === state.room.hostId;
      }
      state.localRole = 'crewmate';
      state.room.phase = 'playing';
      state.room.scene = 'ship';
      state.phase = 'roleReveal';
      state.scene = 'ship';
      state.meeting = null;
      state.lastMeetingResults = null;
      state.tasks = { progress: 0, completions: 0, byTask: {} };
      state.pilotSeat = { seatId: 'pilot', occupantId: null, playerId: null, locked: false };
      state.pilotThrust = { playerId: null, throttle: 0, heading: 0 };
      state.moon = { state: 'orbit', active: false, nodes: [] };
      state.telemetry.fuel = 100;
      state.telemetry.fuelMass = Math.max(50, Math.min(400, Number(state.settings.fuelMass) || 250));
      state.telemetry.o2 = state.settings.o2Mass > 0 ? 100 : 0;
      state.telemetry.food = state.settings.foodMass > 0 ? 100 : 0;
      state.telemetry.science = (OFFLINE_PAYLOADS[state.settings.sciencePayload] || OFFLINE_PAYLOADS.medium).science;
      state.telemetry.marsProgress = 0;
      state.telemetry.starving = state.telemetry.food <= 0;
      offline.recompute();
      dispatch('role:assigned', { isImposter: state.localRole === 'impostor', role: state.localRole });
      setTimeout(function () {
        if (!state.room) return;
        state.phase = 'playing';
        dispatch('game:started', {
          room: state.room,
          players: state.players,
          telemetry: state.telemetry,
          tasks: state.tasks,
          moon: state.moon,
          pilotSeat: state.pilotSeat,
          settings: state.settings
        });
        offline.startTelemetryLoop();
        offline.startBotMovement();
      }, 3000);
    },

    startTelemetryLoop: function () {
      var timer = setInterval(function () {
        if (state.phase !== 'playing') return;
        var t = state.telemetry;
        offline.recompute();
        var penalty = Math.max(1, t.massPenalty);
        var aliveCount = Math.max(0, t.aliveCount != null ? t.aliveCount : 1);
        t.o2 = Math.max(0, t.o2 - 0.015 * aliveCount);
        t.food = Math.max(0, t.food - 0.015 * aliveCount);
        t.fuel = Math.max(0, t.fuel - 0.08 * penalty);
        t.water = Math.min(100, Math.max(0, (t.water != null ? t.water : 100) - 0.018 * aliveCount));
        t.co2   = Math.min(100, Math.max(0, (t.co2 != null ? t.co2 : 8) + 0.035 * aliveCount));
        if (t.co2 > 75) {
          t.o2 = Math.max(0, t.o2 - 0.02);
        }
        t.marsProgress = Math.min(100, t.marsProgress + 1.4 / penalty);
        t.starving = t.food <= 0;
        dispatchTelemetry();
        offline.checkWin();
      }, 1000);
      offlineTimers.push(timer);
    },

    startBotMovement: function () {
      var timer = setInterval(function () {
        if (state.phase !== 'playing') return;
        var ids = Object.keys(state.players);
        for (var i = 0; i < ids.length; i++) {
          var bot = state.players[ids[i]];
          if (!bot.isBot || !bot.alive) continue;
          bot.x = Math.max(50, Math.min(3150, bot.x + (Math.random() - 0.5) * 40));
          bot.y = Math.max(50, Math.min(1950, bot.y + (Math.random() - 0.5) * 40));
          bot.direction = Math.random() > 0.5 ? 'right' : 'left';
          bot.d = bot.direction;
          bot.moving = true;
          dispatch('player:moved', {
            playerId: bot.id, x: bot.x, y: bot.y, d: bot.direction,
            direction: bot.direction, moving: true, ghost: bot.ghost, scene: bot.scene
          });
        }
      }, 800);
      offlineTimers.push(timer);
    },

    movePlayer: function (data) {
      var local = state.players[playerId];
      if (!local || state.phase !== 'playing' || !local.alive) return;
      local.x = data.x;
      local.y = data.y;
      if (data.direction || data.d) {
        local.direction = data.direction || data.d;
        local.d = local.direction;
      }
      local.moving = data.moving !== false;
      local.scene = state.scene;
      dispatch('player:moved', {
        playerId: playerId, x: local.x, y: local.y, d: local.d,
        direction: local.direction, moving: local.moving,
        ghost: local.ghost, scene: local.scene, seq: data.seq || 0
      });
    },

    claimPilotSeat: function () {
      var local = state.players[playerId];
      if (!local || !local.alive || state.phase !== 'playing') return;
      if (state.pilotSeat.occupantId && state.pilotSeat.occupantId !== playerId) return;
      state.pilotSeat.occupantId = playerId;
      state.pilotSeat.playerId = playerId;
      state.pilotSeat.locked = true;
      local.isPilot = true;
      state.pilotThrust = { playerId: playerId, throttle: 0, heading: 0 };
      dispatch('pilot:seat:locked', { seatId: 'pilot', occupantId: playerId, playerId: playerId, locked: true });
      dispatch('pilot:seat:updated', { seat: state.pilotSeat });
    },

    releasePilotSeat: function () {
      var local = state.players[playerId];
      if (local) local.isPilot = false;
      state.pilotSeat = { seatId: 'pilot', occupantId: null, playerId: null, locked: false };
      state.pilotThrust = { playerId: null, throttle: 0, heading: 0 };
      dispatch('pilot:seat:unlocked', { seatId: 'pilot', occupantId: null, locked: false });
      dispatch('pilot:seat:updated', { seat: state.pilotSeat });
    },

    thrust: function (data) {
      if (!state.pilotSeat.occupantId || state.pilotSeat.occupantId !== playerId) return;
      state.pilotThrust = {
        playerId: playerId,
        throttle: Math.max(0, Math.min(1, Number(data.throttle) || 0)),
        heading: Number(data.heading) || 0
      };
      dispatch('pilot:thrust', {
        playerId: playerId,
        throttle: state.pilotThrust.throttle,
        heading: state.pilotThrust.heading
      });
    },

    landMoon: function () {
      var local = state.players[playerId];
      if (!local || !local.alive || state.phase !== 'playing' || state.moon.state !== 'orbit') return;
      if (state.pilotSeat.occupantId !== playerId && state.room.hostId !== playerId) return;
      state.telemetry.fuel = Math.max(0, state.telemetry.fuel - 10);
      state.telemetry.o2 = Math.max(0, state.telemetry.o2 - 12);
      state.moon.state = 'descending';
      dispatch('moon:state', { moon: state.moon, scene: 'ship', telemetry: state.telemetry });
      dispatchTelemetry();
      setTimeout(function () {
        state.moon.state = 'landed';
        state.moon.active = true;
        state.moon.nodes = offline.makeMoonNodes();
        state.scene = 'moon';
        state.room.scene = 'moon';
        var ids = Object.keys(state.players);
        for (var i = 0; i < ids.length; i++) state.players[ids[i]].scene = 'moon';
        state.room.moon = state.moon;
        dispatch('moon:state', { moon: state.moon, scene: 'moon', telemetry: state.telemetry });
        dispatch('moon:nodes', { nodes: state.moon.nodes });
      }, 1000);
    },

    departMoon: function () {
      var local = state.players[playerId];
      if (!local || !local.alive || state.phase !== 'playing' || state.moon.state !== 'landed') return;
      if (state.pilotSeat.occupantId !== playerId && state.room.hostId !== playerId) return;
      state.moon.state = 'ascending';
      dispatch('moon:state', { moon: state.moon, scene: 'moon', telemetry: state.telemetry });
      setTimeout(function () {
        state.moon.state = 'orbit';
        state.moon.active = false;
        state.scene = 'ship';
        state.room.scene = 'ship';
        var ids = Object.keys(state.players);
        for (var i = 0; i < ids.length; i++) state.players[ids[i]].scene = 'ship';
        state.room.moon = state.moon;
        dispatch('moon:state', { moon: state.moon, scene: 'ship', telemetry: state.telemetry });
      }, 1000);
    },

    makeMoonNodes: function () {
      var nodes = [];
      for (var i = 0; i < OFFLINE_CHEESE.length; i++) {
        nodes.push({ id: 'cheese-' + (i + 1), type: 'cheese', x: OFFLINE_CHEESE[i].x, y: OFFLINE_CHEESE[i].y, collected: false });
      }
      for (var r = 0; r < OFFLINE_ROCKS.length; r++) {
        nodes.push({ id: 'rock-' + (r + 1), type: 'rock', x: OFFLINE_ROCKS[r].x, y: OFFLINE_ROCKS[r].y, collected: false });
      }
      return nodes;
    },

    collectMoonNode: function (data, type) {
      var local = state.players[playerId];
      if (!local || !local.alive || state.moon.state !== 'landed') return;
      var nodeId = data && data.nodeId;
      var node = null;
      for (var i = 0; i < state.moon.nodes.length; i++) {
        if (state.moon.nodes[i].id === nodeId) node = state.moon.nodes[i];
      }
      if (!node || node.type !== type || node.collected) return;
      node.collected = true;
      node.collectedBy = playerId;
      if (type === 'cheese') {
        state.telemetry.food = Math.min(100, state.telemetry.food + 18);
        state.telemetry.science += 15;
        state.telemetry.foodMass += 25;
      } else {
        state.telemetry.science += 20;
      }
      offline.recompute();
      dispatch('moon:node-collected', { playerId: playerId, node: node, telemetry: state.telemetry });
      dispatchTelemetry();
    },

    killPlayer: function (data) {
      var local = state.players[playerId];
      if (!local || !local.alive || state.phase !== 'playing' || local.role !== 'impostor') return;
      var target = state.players[data && (data.targetId || data.playerId)];
      if (!target || !target.alive || target.role === 'impostor') return;
      var distance = Math.hypot(local.x - target.x, local.y - target.y);
      if (distance > 80) return;
      target.alive = false;
      target.isAlive = false;
      target.ghost = true;
      target.dead = false;
      target.mass = 0;
      offline.recompute();
      dispatch('player:killed', {
        playerId: target.id, killerId: playerId, x: target.x, y: target.y,
        color: target.color, ghost: true, mass: 0
      });
      dispatchTelemetry();
      offline.checkWin();
    },

    callMeeting: function () {
      var local = state.players[playerId];
      if (!local || !local.alive || state.phase !== 'playing') return;
      state.phase = 'meeting';
      state.meeting = {
        id: 'meeting-offline',
        callerId: playerId,
        startedAt: Date.now(),
        endsAt: Date.now() + 60000,
        votes: {},
        jettisons: {},
        players: Object.keys(state.players).filter(function (id) { return state.players[id].alive; })
      };
      dispatch('meeting:started', {
        meetingId: state.meeting.id,
        callerId: playerId,
        endsAt: state.meeting.endsAt,
        votesRequired: state.meeting.players.length,
        players: state.players,
        telemetry: state.telemetry
      });
      offlineMeetingTimer = setTimeout(function () {
        offline.resolveMeeting('timeout');
      }, 60000);
      offlineTimers.push(offlineMeetingTimer);
      setTimeout(function () {
        var alive = state.meeting ? state.meeting.players.filter(function (id) { return id !== playerId; }) : [];
        for (var i = 0; i < alive.length; i++) {
          if (!state.meeting) return;
          var candidates = state.meeting.players.slice();
          var pick = candidates[Math.floor(Math.random() * candidates.length)];
          if (Math.random() < 0.2) pick = null;
          offline.vote({ targetId: pick, voterId: alive[i], byBot: true });
        }
      }, 3000);
    },

    vote: function (data) {
      if (!state.meeting) return;
      var voterId = data.voterId || playerId;
      var voter = state.players[voterId];
      if (!voter || !voter.alive) return;
      var targetId = data.targetId != null ? data.targetId : (data.target != null ? data.target : null);
      if (targetId === 'skip') targetId = null;
      state.meeting.votes[voterId] = targetId;
      var votesCast = 0;
      for (var i = 0; i < state.meeting.players.length; i++) {
        if (Object.prototype.hasOwnProperty.call(state.meeting.votes, state.meeting.players[i])) votesCast++;
      }
      dispatch('meeting:voted', {
        voterId: voterId,
        callerId: voterId,
        targetId: targetId,
        votedForId: targetId,
        byBot: !!data.byBot,
        votesCast: votesCast,
        votesRequired: state.meeting.players.length
      });
      if (votesCast >= state.meeting.players.length) {
        setTimeout(function () { offline.resolveMeeting('all-voted'); }, 500);
      }
    },

    resolveMeeting: function (forcedBy) {
      if (!state.meeting) return;
      var meeting = state.meeting;
      var counts = {};
      var skipCount = 0;
      var voterIds = Object.keys(meeting.votes);
      for (var i = 0; i < voterIds.length; i++) {
        var targetId = meeting.votes[voterIds[i]];
        if (targetId == null) {
          skipCount++;
        } else if (state.players[targetId] && state.players[targetId].alive) {
          counts[targetId] = (counts[targetId] || 0) + 1;
        } else {
          skipCount++;
        }
      }
      var max = skipCount;
      for (var id in counts) {
        if (counts[id] > max) max = counts[id];
      }
      var winners = [];
      for (var playerKey in counts) {
        if (counts[playerKey] === max && max > 0) winners.push(playerKey);
      }
      if (skipCount === max && max > 0) winners.push('skip');
      var ejectedId = null;
      var tie = winners.length > 1;
      var skipped = false;
      if (winners.length === 1) {
        if (winners[0] === 'skip') skipped = true;
        else ejectedId = winners[0];
      } else if (winners.length === 0) {
        skipped = true;
      }
      var ejected = ejectedId ? state.players[ejectedId] : null;
      var wasImpostor = false;
      if (ejected) {
        ejected.alive = false;
        ejected.isAlive = false;
        ejected.ghost = true;
        ejected.dead = false;
        ejected.mass = 0;
        wasImpostor = ejected.role === 'impostor';
        dispatch('player:ejected', {
          playerId: ejected.id, name: ejected.name, color: ejected.color,
          ghost: true, mass: 0, wasImpostor: wasImpostor
        });
      }
      var results = {
        ejectedId: ejectedId,
        ejectedPlayer: ejected,
        tie: tie,
        skipped: skipped,
        noVotes: voterIds.length === 0,
        counts: counts,
        skipCount: skipCount,
        votes: meeting.votes,
        forcedBy: forcedBy || null
      };
      state.lastMeetingResults = results;
      state.meeting = null;
      state.phase = 'playing';
      state.room.meeting = null;
      offline.recompute();
      dispatch('meeting:ended', { results: results, telemetry: state.telemetry });
      offline.checkWin();
    },

    jettison: function (type) {
      if (!state.meeting || state.phase !== 'meeting') return;
      var local = state.players[playerId];
      if (!local || !local.alive || local.role === 'impostor') return;
      if (state.meeting.jettisons[type]) return;
      state.meeting.jettisons[type] = true;
      if (type === 'food') {
        state.telemetry.foodMass = Math.max(0, state.telemetry.foodMass - 75);
        state.telemetry.food = 0;
        state.telemetry.starving = true;
      } else if (type === 'payload') {
        state.telemetry.payloadMass = Math.max(0, state.telemetry.payloadMass - 75);
      } else {
        return;
      }
      offline.recompute();
      dispatch('cargo:jettisoned', {
        playerId: playerId, type: type, amount: 75, telemetry: state.telemetry
      });
      dispatchTelemetry();
    },

    completeTask: function (data) {
      var local = state.players[playerId];
      var taskId = data && data.taskId;
      if (!local || !local.alive || state.phase !== 'playing' || !taskId) return;
      var key = playerId + ':' + taskId;
      var current = Date.now();
      if (offlineTaskCooldowns[key] && current - offlineTaskCooldowns[key] < 8000) return;
      offlineTaskCooldowns[key] = current;
      var t = state.telemetry;
      if (taskId === 'wires') {
        t.fuel = Math.min(100, Math.max(0, t.fuel + 15));
      } else if (taskId === 'o2_filter') {
        t.food = Math.min(100, Math.max(0, t.food + 22));
        t.o2 = Math.min(100, Math.max(0, t.o2 + 18));
        t.co2 = Math.min(100, Math.max(0, (t.co2 != null ? t.co2 : 10) - 18));
        t.water = Math.min(100, Math.max(10, (t.water != null ? t.water : 100) - 8));
        t.starving = false;
      } else if (taskId === 'water_recycle') {
        t.water = Math.min(100, Math.max(0, (t.water != null ? t.water : 100) + 30));
      } else if (taskId === 'co2_scrubber') {
        t.co2 = Math.min(100, Math.max(4, (t.co2 != null ? t.co2 : 10) - 45));
        t.o2 = Math.min(100, Math.max(0, t.o2 + 18));
      } else if (taskId === 'fuel_synth') {
        t.fuel = Math.min(100, Math.max(0, t.fuel + 28));
        t.co2 = Math.min(100, Math.max(4, (t.co2 != null ? t.co2 : 10) - 15));
      } else if (taskId === 'nav') {
        t.gyroDrift = 0;
        t.marsProgress = Math.min(100, Math.max(0, t.marsProgress + 8));
        t.autopilot = true;
      } else if (taskId === 'cargo') {
        t.hull = 100;
        t.fuel = 100;
        t.payloadMass = Math.max(0, t.payloadMass - 15);
      } else if (taskId === 'science') {
        t.science += 30;
      } else if (taskId === 'cheese_grill') {
        t.food = Math.min(100, Math.max(0, t.food + 18));
        t.starving = false;
      } else if (taskId === 'reactor_cool') {
        t.fuel = Math.min(100, Math.max(0, t.fuel + 18));
      } else if (taskId === 'shields_prime') {
        t.hull = Math.min(100, Math.max(0, (t.hull != null ? t.hull : 100) + 22));
      } else if (taskId === 'engine_align') {
        t.marsProgress = Math.min(100, Math.max(0, t.marsProgress + 10));
        t.fuel = Math.min(100, Math.max(0, t.fuel + 6));
      } else if (taskId === 'medbay_scan') {
        t.o2 = Math.min(100, Math.max(0, t.o2 + 15));
        t.science += 25;
      } else return;
      state.tasks.progress = Math.min(100, state.tasks.progress + 10);
      state.tasks.completions += 1;
      state.tasks.byTask[taskId] = (state.tasks.byTask[taskId] || 0) + 1;
      offline.recompute();
      dispatch('task:updated', {
        taskId: taskId,
        playerId: playerId,
        tasks: state.tasks,
        telemetry: state.telemetry
      });
      dispatchTelemetry();
    },

    sendMessage: function (data) {
      var local = state.players[playerId];
      if (!local) return;
      dispatch('room:message', {
        playerId: playerId,
        name: local.name,
        message: data && (data.message != null ? data.message : data.text) || ''
      });
    },

    checkWin: function () {
      if (state.phase === 'debrief') return;
      var alive = Object.keys(state.players).filter(function (id) { return state.players[id].alive; });
      if (alive.length === 0) {
        offline.endGame('lost', 'all-crew-lost');
        return;
      }
      if (state.telemetry.marsProgress >= 100 && !state.marsArrived) {
        state.marsArrived = true;
        state.telemetry.marsArrived = true;
        dispatch('mars:arrived', {
          message: '🪐 Spacecraft has successfully reached Mars orbit! You may continue tasks and free flight!',
          telemetry: state.telemetry
        });
      }
    },

    endGame: function (winner, reason) {
      if (state.phase === 'debrief') return;
      state.phase = 'debrief';
      if (state.room) state.room.phase = 'ended';
      offline.clearTimers();
      dispatch('game:ended', {
        winner: winner,
        reason: reason,
        players: state.players,
        telemetry: state.telemetry,
        tasks: state.tasks,
        moon: state.moon
      });
    },

    clearTimers: function () {
      for (var i = 0; i < offlineTimers.length; i++) {
        clearInterval(offlineTimers[i]);
        clearTimeout(offlineTimers[i]);
      }
      offlineTimers = [];
      offlineMeetingTimer = null;
    },

    handleEmit: function (event, data) {
      switch (event) {
        case 'player:register': offline.registerPlayer(data); break;
        case 'room:create': offline.createRoom(data); break;
        case 'room:join': offline.joinRoom(data); break;
        case 'room:leave': offline.leaveRoom(); break;
        case 'room:add-bot': offline.addBot(); break;
        case 'room:remove-bot': offline.removeBot(data); break;
        case 'player:specialty': offline.setSpecialty(data); break;
        case 'mission:configure': offline.configureMission(data); break;
        case 'game:start': offline.startGame(data); break;
        case 'player:move': offline.movePlayer(data); break;
        case 'player:animation': dispatch('player:animation', { playerId: playerId, state: data && data.state }); break;
        case 'pilot:seat:claim': offline.claimPilotSeat(); break;
        case 'pilot:seat:release': offline.releasePilotSeat(); break;
        case 'pilot:thrust': offline.thrust(data); break;
        case 'moon:land': offline.landMoon(); break;
        case 'moon:depart': offline.departMoon(); break;
        case 'moon:collect-cheese': offline.collectMoonNode(data, 'cheese'); break;
        case 'moon:collect-sample': offline.collectMoonNode(data, 'rock'); break;
        case 'player:kill': offline.killPlayer(data); break;
        case 'meeting:start': offline.callMeeting(data); break;
        case 'meeting:vote': offline.vote(data); break;
        case 'meeting:end': offline.resolveMeeting('host'); break;
        case 'task:complete': offline.completeTask(data); break;
        case 'cargo:jettison': offline.jettison(data && data.type); break;
        case 'cockpit:obstacle:cleared':
          if (state.phase === 'playing') {
            state.telemetry.science = (state.telemetry.science || 0) + 10;
            state.telemetry.marsProgress = Math.min(100, Math.max(0, (state.telemetry.marsProgress || 0) + 2));
            offline.recompute();
            dispatchTelemetry();
          }
          break;
        case 'cockpit:obstacle:hit':
          if (state.phase === 'playing') {
            state.telemetry.hull = Math.min(100, Math.max(0, (state.telemetry.hull != null ? state.telemetry.hull : 100) - 6));
            state.telemetry.gyroDrift = Math.min(100, Math.max(0, (state.telemetry.gyroDrift || 0) + 18));
            offline.recompute();
            dispatchTelemetry();
            offline.checkWin();
          }
          break;
        case 'cockpit:gyro:calibrated':
          if (state.phase === 'playing') {
            state.telemetry.gyroDrift = 0;
            offline.recompute();
            dispatchTelemetry();
          }
          break;
        case 'cockpit:fuel:synth':
          if (state.phase === 'playing') {
            state.telemetry.fuel = Math.min(100, Math.max(0, (state.telemetry.fuel || 0) + 18));
            offline.recompute();
            dispatchTelemetry();
          }
          break;
        case 'cockpit:wave:cleared':
          if (state.phase === 'playing') {
            state.telemetry.autopilot = true;
            state.telemetry.marsProgress = Math.min(100, Math.max(0, (state.telemetry.marsProgress || 0) + 10));
            offline.recompute();
            dispatchTelemetry();
            offline.checkWin();
          }
          break;
        case 'room:send:message': offline.sendMessage(data); break;
        case 'state:request': dispatch('state:snapshot', { roomId: roomId, room: state.room }); break;
        default: console.log('[Net:offline] unhandled emit:', event, data);
      }
    }
  };

  function goOffline() {
    if (offlineMode) return;
    offlineMode = true;
    socket = null;
    dispatch('server:ready', { online: false, offline: true });
  }

  function init() {
    if (typeof io !== 'undefined') {
      try {
        var url = location.protocol === 'file:' ? 'http://localhost:3000' : location.origin;
        socket = io(url, {
          timeout: 4000,
          reconnectionAttempts: 2,
          reconnectionDelay: 1000
        });

        var connected = false;
        var connectTimer = setTimeout(function () {
          if (!connected) {
            socket.disconnect();
            goOffline();
          }
        }, 4000);

        socket.on('connect', function () {
          connected = true;
          clearTimeout(connectTimer);
          offlineMode = false;
          dispatch('server:ready', { online: true });
        });

        socket.on('connect_error', function () {
          if (!connected) {
            clearTimeout(connectTimer);
            socket.disconnect();
            goOffline();
          }
        });

        socket.on('disconnect', function () {
          if (!offlineMode) dispatch('game:notif', { message: 'Connection lost', type: 'error' });
        });

        for (var i = 0; i < SERVER_EVENTS.length; i++) {
          (function (evt) {
            socket.on(evt, function (data) {
              updateStateFromEvent(evt, data);
              dispatch(evt, data);
            });
          })(SERVER_EVENTS[i]);
        }
      } catch (e) {
        goOffline();
      }
    } else {
      goOffline();
    }
  }

  function updateStateFromEvent(event, data) {
    switch (event) {
      case 'player:registered':
        playerId = (data && data.playerId) || playerId;
        break;
      case 'room:created':
      case 'room:joined':
        if (data && data.you) playerId = data.you;
        syncRoom(data);
        state.phase = data && data.started ? 'playing' : 'lobby';
        if (state.room && state.room.phase) {
          if (state.room.phase === 'lobby') state.phase = 'lobby';
          else if (state.room.phase === 'playing') state.phase = 'playing';
        }
        break;
      case 'room:updated':
      case 'state:snapshot':
        syncRoom(data);
        if (state.room && state.room.phase === 'lobby') state.phase = 'lobby';
        break;
      case 'role:assigned':
        setLocalRole(data);
        state.phase = 'roleReveal';
        break;
      case 'game:started':
        syncRoom(data);
        syncTasks(data && data.tasks);
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        if (data && data.moon) state.moon = Object.assign({}, state.moon, data.moon);
        if (data && data.pilotSeat) normalizeSeat(data.pilotSeat);
        if (data && data.settings) state.settings = Object.assign({}, state.settings, data.settings);
        if (data && data.scene) state.scene = data.scene;
        state.phase = 'playing';
        if (state.localRole && state.players[playerId]) state.players[playerId].role = state.localRole;
        break;
      case 'player:joined':
        if (data && data.player) {
          state.players[data.player.id] = normalizePlayer(data.player);
        } else {
          syncRoom(data);
        }
        break;
      case 'player:specialty':
        if (data && data.playerId) {
          var specialtyPlayer = state.players[data.playerId];
          if (specialtyPlayer) {
            specialtyPlayer.specialty = data.specialty || (data.player && data.player.specialty) || specialtyPlayer.specialty;
          } else if (data.player) {
            state.players[data.playerId] = normalizePlayer(data.player);
          }
        }
        break;
      case 'player:left':
        if (data && data.playerId) delete state.players[data.playerId];
        break;
      case 'player:moved':
        if (data && data.playerId && state.players[data.playerId]) {
          var moved = state.players[data.playerId];
          moved.x = data.x;
          moved.y = data.y;
          moved.direction = data.direction || data.d;
          moved.d = data.d || data.direction;
          moved.moving = data.moving === true;
          moved.ghost = data.ghost === true || moved.ghost === true;
          moved.scene = data.scene || moved.scene;
        }
        break;
      case 'player:killed':
      case 'player:ejected':
        if (data && data.playerId && state.players[data.playerId]) {
          var dead = state.players[data.playerId];
          dead.alive = false;
          dead.isAlive = false;
          dead.ghost = true;
          dead.dead = false;
          dead.mass = 0;
        }
        break;
      case 'telemetry:updated':
        Object.assign(state.telemetry, (data && data.telemetry) || data || {});
        break;
      case 'mission:configured':
        if (data && data.settings) state.settings = Object.assign({}, state.settings, data.settings);
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        if (state.room && data && data.settings) state.room.settings = Object.assign({}, state.room.settings, data.settings);
        state.missionUpdatedBy = (data && data.by) || null;
        state.missionUpdatedByName = (data && (data.byName || (state.players[data.by] && state.players[data.by].name))) || null;
        break;
      case 'task:updated':
        syncTasks(data && data.tasks);
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        break;
      case 'pilot:seat:locked':
        normalizeSeat((data && data.seat) || data || {});
        state.pilotSeat.locked = true;
        if (state.players[playerId]) state.players[playerId].isPilot = state.pilotSeat.occupantId === playerId;
        if (state.pilotSeat.occupantId === playerId && window.RTM && window.RTM.Cockpit && window.RTM.Cockpit._pendingAutoOpen) {
          window.RTM.Cockpit._pendingAutoOpen = false;
          if (!window.RTM.Cockpit.isOpen()) window.RTM.Cockpit.show();
        }
        break;
      case 'pilot:seat:unlocked':
        state.pilotSeat.locked = false;
        state.pilotSeat.occupantId = null;
        state.pilotSeat.playerId = null;
        if (state.players[playerId]) state.players[playerId].isPilot = false;
        break;
      case 'pilot:seat:updated':
        normalizeSeat((data && data.seat) || data);
        if (state.pilotSeat.occupantId === playerId && window.RTM && window.RTM.Cockpit && window.RTM.Cockpit._pendingAutoOpen) {
          window.RTM.Cockpit._pendingAutoOpen = false;
          if (!window.RTM.Cockpit.isOpen()) window.RTM.Cockpit.show();
        }
        break;
      case 'pilot:thrust':
        state.pilotThrust = Object.assign({}, state.pilotThrust, data || {});
        break;
      case 'meeting:started':
        state.phase = 'meeting';
        state.meeting = (data && data.meeting) || {
          id: data && data.meetingId,
          callerId: data && data.callerId,
          startedAt: data && data.startedAt,
          endsAt: data && data.endsAt,
          votes: {},
          votesRequired: data && data.votesRequired
        };
        if (data && data.players) syncPlayerList(data.players);
        break;
      case 'meeting:voted':
        if (state.meeting) {
          state.meeting.votes = state.meeting.votes || {};
          state.meeting.votes[data && (data.voterId || data.callerId)] = data && (data.targetId != null ? data.targetId : data.votedForId);
        }
        break;
      case 'meeting:ended':
        state.phase = (state.room && state.room.phase === 'ended') ? 'debrief' : 'playing';
        state.meeting = null;
        state.lastMeetingResults = data && data.results;
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        break;
      case 'moon:state':
        state.moon = Object.assign({}, state.moon, (data && data.moon) || data || {});
        state.moon.active = state.moon.state === 'landed';
        state.scene = (data && data.scene) || (state.moon.state === 'landed' ? 'moon' : 'ship');
        break;
      case 'moon:nodes':
        if (data && data.nodes) state.moon.nodes = data.nodes;
        break;
      case 'moon:node-collected':
        if (data && data.node && state.moon.nodes) {
          for (var n = 0; n < state.moon.nodes.length; n++) {
            if (state.moon.nodes[n].id === data.node.id) state.moon.nodes[n] = Object.assign({}, state.moon.nodes[n], data.node);
          }
        }
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        break;
      case 'cargo:jettisoned':
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        break;
      case 'emergency:started':
        if (state.telemetry) {
          state.telemetry.emergencyMode = {
            type: data && data.type,
            endsAt: data && data.endsAt,
            duration: (data && data.duration) || 60
          };
        }
        break;
      case 'emergency:cleared':
        if (state.telemetry) {
          state.telemetry.emergencyMode = null;
        }
        break;
      case 'cockpit:asteroid:alert':
        if (state.telemetry) {
          state.telemetry.autopilot = false;
        }
        break;
      case 'mars:arrived':
        state.marsArrived = true;
        if (state.telemetry) {
          state.telemetry.marsArrived = true;
          if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        }
        break;
      case 'game:ended':
        state.phase = 'debrief';
        if (data && data.players) syncPlayerList(data.players);
        if (data && data.telemetry) Object.assign(state.telemetry, data.telemetry);
        if (data && data.tasks) syncTasks(data.tasks);
        if (data && data.moon) state.moon = Object.assign({}, state.moon, data.moon);
        break;
      case 'room:left':
        state.room = null;
        state.players = {};
        state.phase = 'lobby';
        state.scene = 'ship';
        state.meeting = null;
        roomId = null;
        break;
      case 'player:unregistered':
        if (state.players[playerId]) delete state.players[playerId];
        break;
    }
  }

  function emit(event, data) {
    var canonical = canonicalEvent(event);
    var payload = normalizeEmitPayload(event, data);
    if (offlineMode) {
      offline.handleEmit(canonical, payload);
    } else if (socket && socket.connected) {
      if (payload === undefined) socket.emit(canonical);
      else socket.emit(canonical, payload);
    } else {
      console.warn('[Net] Cannot emit — not connected. Event:', canonical);
    }
  }

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
  }

  function getState() {
    return {
      phase: state.phase,
      scene: state.scene,
      room: state.room,
      players: state.players,
      telemetry: state.telemetry,
      tasks: state.tasks,
      settings: state.settings,
      pilotSeat: state.pilotSeat,
      pilotThrust: state.pilotThrust,
      moon: state.moon,
      meeting: state.meeting,
      lastMeetingResults: state.lastMeetingResults,
      localRole: state.localRole,
      missionUpdatedBy: state.missionUpdatedBy,
      missionUpdatedByName: state.missionUpdatedByName
    };
  }

  function isHost() {
    if (offlineMode) return true;
    if (!state.room) return true;
    if (state.room.hostId && state.room.hostId === playerId) return true;

    var player = state.players[playerId];
    if (player && player.isHost) return true;

    var humanIds = Object.keys(state.players).filter(function(id) {
      return !state.players[id].isBot;
    });
    if (humanIds.length > 0 && humanIds[0] === playerId) return true;

    return false;
  }

  function isImpostor() {
    var player = state.players[playerId];
    return !!((player && player.role === 'impostor') || state.localRole === 'impostor');
  }

  function isAlive() {
    var player = state.players[playerId];
    return player ? player.alive !== false && player.isAlive !== false : true;
  }

  function isGhost() {
    var player = state.players[playerId];
    return player ? player.ghost === true : false;
  }

  function isPilot() {
    var seat = state.pilotSeat || {};
    return seat.locked === true && (seat.occupantId === playerId || seat.playerId === playerId);
  }

  var api = {
    init: init,
    bus: bus,
    emit: emit,
    on: on,
    off: off,
    getState: getState,
    isHost: isHost,
    isImpostor: isImpostor,
    isAlive: isAlive,
    isGhost: isGhost,
    isPilot: isPilot,
    isOffline: function () { return offlineMode || !socket || !socket.connected; },
    setScene: function (scene) { state.scene = scene; },
    setPhase: function (phase) { state.phase = phase; }
  };

  Object.defineProperty(api, 'socket', { get: function () { return socket; }, enumerable: true });
  Object.defineProperty(api, 'offlineMode', { get: function () { return offlineMode; }, enumerable: true });
  Object.defineProperty(api, 'playerId', { get: function () { return playerId; }, enumerable: true });
  Object.defineProperty(api, 'roomId', { get: function () { return roomId; }, enumerable: true });

  return api;
})();
