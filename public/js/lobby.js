window.RTM = window.RTM || {};
window.RTM.Lobby = (function () {
  'use strict';

  var ROCKETS = ['electron', 'falcon9', 'sls'];
  var PAYLOADS = ['light', 'medium', 'heavy'];
  var ROCKET_MASS = { electron: 900, falcon9: 1080, sls: 1280 };
  var PAYLOAD_MASS = { light: 70, medium: 190, heavy: 340 };
  var COLORS = ['#c51111', '#132ed1', '#117f2d', '#ed54ba', '#ef7d0e', '#f5f557'];

  var els = {};
  var registerSent = false;
  var registered = false;
  var createSent = false;
  var configTimer = null;
  var joinTimer = null;

  function cache() {
    els.lobby = document.getElementById('lobbyScreen');
    els.roomCode = document.getElementById('roomCode');
    els.playerGrid = document.getElementById('playerGrid');
    els.rocketTabs = document.getElementById('rocketTabs');
    els.payloadTabs = document.getElementById('payloadTabs');
    els.foodSlider = document.getElementById('foodSlider');
    els.o2Slider = document.getElementById('o2Slider');
    els.foodVal = document.getElementById('foodVal');
    els.o2Val = document.getElementById('o2Val');
    els.massBudgetBar = document.getElementById('massBudgetBar');
    els.mbDry = document.getElementById('mbDry');
    els.mbPayload = document.getElementById('mbPayload');
    els.mbFood = document.getElementById('mbFood');
    els.mbO2 = document.getElementById('mbO2');
    els.mbCrew = document.getElementById('mbCrew');
    els.mbLimit = document.getElementById('mbLimit');
    els.massTotal = document.getElementById('massTotal');
    els.massMax = document.getElementById('massMax');
    els.massOverloaded = document.getElementById('massOverloaded');
    els.addBotBtn = document.getElementById('addBotBtn');
    els.removeBotBtn = document.getElementById('removeBotBtn');
    els.startBtn = document.getElementById('startBtn');
  }

  function setActiveTab(container, index) {
    if (!container) return;
    var buttons = container.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('active', i === index);
    }
  }

  function activeTabIndex(container, fallback) {
    if (!container) return fallback;
    var buttons = container.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].classList.contains('active')) return i;
    }
    return fallback;
  }

  function currentRocket() {
    return ROCKETS[activeTabIndex(els.rocketTabs, 1)] || 'falcon9';
  }

  function currentPayload() {
    return PAYLOADS[activeTabIndex(els.payloadTabs, 1)] || 'medium';
  }

  function configure() {
    if (!registered) return;
    var gameState = RTM.Net.getState();
    if (!gameState.room || gameState.phase !== 'lobby') return;
    RTM.Net.emit('mission:configure', {
      rocket: currentRocket(),
      sciencePayload: currentPayload(),
      foodMass: Number(els.foodSlider ? els.foodSlider.value : 0),
      o2Mass: Number(els.o2Slider ? els.o2Slider.value : 0)
    });
  }

  function scheduleConfigure() {
    renderMass();
    clearTimeout(configTimer);
    configTimer = setTimeout(configure, 120);
  }

  function syncControls(room, telemetry) {
    var settings = room && room.settings ? room.settings : {};
    var rocket = settings.rocket || (telemetry && telemetry.launcher) || 'falcon9';
    var payload = settings.sciencePayload || 'medium';
    var rocketIndex = ROCKETS.indexOf(rocket);
    var payloadIndex = PAYLOADS.indexOf(payload);
    setActiveTab(els.rocketTabs, rocketIndex < 0 ? 1 : rocketIndex);
    setActiveTab(els.payloadTabs, payloadIndex < 0 ? 1 : payloadIndex);
    if (els.foodSlider && settings.foodMass != null && document.activeElement !== els.foodSlider) {
      els.foodSlider.value = settings.foodMass;
    }
    if (els.o2Slider && settings.o2Mass != null && document.activeElement !== els.o2Slider) {
      els.o2Slider.value = settings.o2Mass;
    }
    if (els.foodVal && els.foodSlider) els.foodVal.textContent = els.foodSlider.value + ' kg';
    if (els.o2Val && els.o2Slider) els.o2Val.textContent = els.o2Slider.value + ' kg';
  }

  function renderMass() {
    var gameState = RTM.Net ? RTM.Net.getState() : null;
    var room = gameState && gameState.room;
    var telemetry = (gameState && gameState.telemetry) || {};
    var settings = (room && room.settings) || (gameState && gameState.settings) || {};
    var rocket = currentRocket();
    var payload = currentPayload();
    var foodMass = Number(els.foodSlider ? els.foodSlider.value : settings.foodMass || 0);
    var o2Mass = Number(els.o2Slider ? els.o2Slider.value : settings.o2Mass || 0);
    var maxMass = ROCKET_MASS[rocket] || telemetry.maxMass || 1080;
    var payloadMass = PAYLOAD_MASS[payload] != null ? PAYLOAD_MASS[payload] : telemetry.payloadMass || 0;
    var players = 0;
    if (gameState && gameState.players) players = Object.keys(gameState.players).length;
    var crewMass = telemetry.crewMass != null && telemetry.crewMass > 0 ? telemetry.crewMass : players * 80;
    var dryMass = telemetry.dryMass || 270;
    var total = dryMass + payloadMass + foodMass + o2Mass + crewMass;
    var segments = [
      [els.mbDry, dryMass],
      [els.mbPayload, payloadMass],
      [els.mbFood, foodMass],
      [els.mbO2, o2Mass],
      [els.mbCrew, crewMass]
    ];
    for (var i = 0; i < segments.length; i++) {
      if (segments[i][0]) segments[i][0].style.width = Math.max(0, (segments[i][1] / maxMass) * 100) + '%';
    }
    if (els.mbLimit) els.mbLimit.style.left = 'calc(100% - 3px)';
    if (els.massTotal) els.massTotal.textContent = Math.round(total);
    if (els.massMax) els.massMax.textContent = Math.round(maxMass);
    if (els.massOverloaded) els.massOverloaded.style.display = total > maxMass ? 'inline' : 'none';
    if (els.massBudgetBar) els.massBudgetBar.classList.toggle('overloaded', total > maxMass);
  }

  function fillSlot(player, isLocal) {
    var slot = document.createElement('div');
    slot.className = 'player-slot' + (player ? '' : ' empty') + (isLocal ? ' you' : '');
    if (!player) {
      var empty = document.createElement('span');
      empty.className = 'slot-label';
      empty.textContent = 'EMPTY';
      slot.appendChild(empty);
      return slot;
    }
    var swatch = document.createElement('span');
    swatch.className = 'slot-color';
    swatch.style.background = player.color || '#888';
    var name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = player.name || 'Crew';
    var tags = [];
    if (isLocal) tags.push('YOU');
    if (player.isHost) tags.push('HOST');
    if (player.isBot) tags.push('BOT');
    if (tags.length) {
      var tag = document.createElement('span');
      tag.className = 'slot-label';
      tag.textContent = tags.join(' · ');
      slot.appendChild(swatch);
      slot.appendChild(name);
      slot.appendChild(tag);
    } else {
      slot.appendChild(swatch);
      slot.appendChild(name);
    }
    return slot;
  }

  function renderPlayers() {
    if (!els.playerGrid) return;
    var gameState = RTM.Net.getState();
    var players = gameState.players || {};
    var list = Object.keys(players).map(function (id) { return players[id]; });
    list.sort(function (a, b) {
      if (a.id === RTM.Net.playerId) return -1;
      if (b.id === RTM.Net.playerId) return 1;
      if (a.isHost && !b.isHost) return -1;
      if (b.isHost && !a.isHost) return 1;
      return 0;
    });
    els.playerGrid.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var player = list[i] || null;
      els.playerGrid.appendChild(fillSlot(player, !!player && player.id === RTM.Net.playerId));
    }
  }

  function render() {
    var gameState = RTM.Net ? RTM.Net.getState() : null;
    if (!gameState) return;
    var room = gameState.room;
    if (els.roomCode) els.roomCode.textContent = room ? (room.code || room.id || '????') : '????';
    renderPlayers();
    syncControls(room, gameState.telemetry);
    renderMass();
    var host = RTM.Net.isHost();
    if (els.addBotBtn) els.addBotBtn.disabled = !host;
    if (els.removeBotBtn) els.removeBotBtn.disabled = !host;
    if (els.startBtn) {
      els.startBtn.disabled = !host;
      els.startBtn.textContent = host ? 'START MISSION' : 'WAITING FOR HOST';
    }
  }

  function register() {
    if (registerSent) return;
    registerSent = true;
    var name = '';
    try { name = localStorage.getItem('rtm-player-name') || ''; } catch (_) {}
    if (!name) {
      name = 'Crew-' + Math.floor(100 + Math.random() * 900);
      try { localStorage.setItem('rtm-player-name', name); } catch (_) {}
    }
    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    RTM.Net.emit('player:register', { name: name, color: color });
  }

  function createRoom() {
    if (createSent) return;
    createSent = true;
    RTM.Net.emit('room:create', {});
  }

  function onRegistered() {
    registered = true;
    if (RTM.Net.getState().room) return;
    var params = new URLSearchParams(location.search);
    var code = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length >= 4) {
      RTM.Net.emit('room:join', { roomId: code });
      clearTimeout(joinTimer);
      joinTimer = setTimeout(function () {
        if (!RTM.Net.getState().room) createRoom();
      }, 1400);
    } else {
      createRoom();
    }
  }

  function addBot() {
    if (!RTM.Net.isHost()) {
      if (RTM.HUD) RTM.HUD.showNotification('Only the host can add bots.', 'error');
      return;
    }
    RTM.Net.emit('room:add-bot');
  }

  function removeBot() {
    if (!RTM.Net.isHost()) {
      if (RTM.HUD) RTM.HUD.showNotification('Only the host can remove bots.', 'error');
      return;
    }
    var players = RTM.Net.getState().players || {};
    var bots = Object.keys(players).filter(function (id) { return players[id].isBot; });
    if (!bots.length) {
      if (RTM.HUD) RTM.HUD.showNotification('No bots to remove.', 'info');
      return;
    }
    RTM.Net.emit('room:remove-bot', { botId: bots[bots.length - 1] });
  }

  function startGame() {
    if (!RTM.Net.isHost()) {
      if (RTM.HUD) RTM.HUD.showNotification('Only the host can start the mission.', 'error');
      return;
    }
    RTM.Net.emit('game:start', { fillBots: true });
  }

  function init() {
    cache();
    if (els.rocketTabs) {
      els.rocketTabs.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-rocket]');
        if (!button) return;
        setActiveTab(els.rocketTabs, Number(button.getAttribute('data-rocket')));
        scheduleConfigure();
      });
    }
    if (els.payloadTabs) {
      els.payloadTabs.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-payload]');
        if (!button) return;
        setActiveTab(els.payloadTabs, Number(button.getAttribute('data-payload')));
        scheduleConfigure();
      });
    }
    if (els.foodSlider) {
      els.foodSlider.addEventListener('input', function () {
        if (els.foodVal) els.foodVal.textContent = els.foodSlider.value + ' kg';
        scheduleConfigure();
      });
    }
    if (els.o2Slider) {
      els.o2Slider.addEventListener('input', function () {
        if (els.o2Val) els.o2Val.textContent = els.o2Slider.value + ' kg';
        scheduleConfigure();
      });
    }
    if (els.addBotBtn) els.addBotBtn.addEventListener('click', addBot);
    if (els.removeBotBtn) els.removeBotBtn.addEventListener('click', removeBot);
    if (els.startBtn) els.startBtn.addEventListener('click', startGame);

    RTM.Net.on('server:ready', function () {
      if (!registered) register();
    });
    RTM.Net.on('player:registered', onRegistered);
    RTM.Net.on('room:created', render);
    RTM.Net.on('room:joined', function () {
      clearTimeout(joinTimer);
      render();
    });
    RTM.Net.on('room:join:error', function () {
      if (!RTM.Net.getState().room) createRoom();
    });
    RTM.Net.on('room:updated', render);
    RTM.Net.on('state:snapshot', render);
    RTM.Net.on('player:joined', render);
    RTM.Net.on('player:left', render);
    RTM.Net.on('telemetry:updated', renderMass);
    RTM.Net.on('mission:configured', render);
    RTM.Net.on('game:started', render);

    if (RTM.Net.offlineMode || (RTM.Net.socket && RTM.Net.socket.connected)) {
      if (!registered) register();
    }
    render();
  }

  return {
    init: init,
    render: render,
    addBot: addBot,
    removeBot: removeBot,
    startGame: startGame
  };
})();
