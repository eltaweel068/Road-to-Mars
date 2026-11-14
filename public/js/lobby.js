window.RTM = window.RTM || {};
window.RTM.Lobby = (function () {
  'use strict';

  var ROCKETS = [
    { id: 'electron', name: 'ELECTRON', maxMass: 1200, thrustKN: 224, exhaust: 3200, twrBase: 1.62, tag: 'High Agility' },
    { id: 'falcon9', name: 'FALCON 9', maxMass: 1600, thrustKN: 7607, exhaust: 3400, twrBase: 1.46, tag: 'Balanced Heavy Lift' },
    { id: 'sls', name: 'SLS BLOCK 1B', maxMass: 2200, thrustKN: 39100, exhaust: 3600, twrBase: 1.32, tag: 'Super Heavy Lift' }
  ];
  var PAYLOADS = [
    { id: 'light', name: 'LIGHT SPECTROMETER', mass: 70, science: 90 },
    { id: 'medium', name: 'MARS ROVER LAB', mass: 190, science: 200 },
    { id: 'heavy', name: 'NUCLEAR DEEP DRILL', mass: 340, science: 380 }
  ];
  var SPECIALTIES = {
    pilot: { label: 'ASTRONAUT', short: 'CREW', hat: '✈' }
  };
  var ROCKET_MASS = { electron: 1200, falcon9: 1600, sls: 2200 };
  var PAYLOAD_MASS = { light: 70, medium: 190, heavy: 340 };
  var COLORS = ['#c51111', '#132ed1', '#117f2d', '#ed54ba', '#ef7d0e', '#f5f557'];
  var DRY_MASS = 270;

  var els = {};
  var registerSent = false;
  var registered = false;
  var createSent = false;
  var configTimer = null;
  var joinTimer = null;
  var selectedRocket = 'falcon9';
  var selectedPayload = 'medium';
  var localSpecialty = 'pilot';
  var specialtySent = false;
  var localConfigPending = false;
  var configPendingTimer = null;

  function cache() {
    els.lobby = document.getElementById('lobbyScreen');
    els.roomCode = document.getElementById('roomCode');
    els.crewCount = document.getElementById('crewCount');
    els.playerGrid = document.getElementById('playerGrid');
    els.specialtyPicker = document.getElementById('specialtyPicker');
    els.rocketTabs = document.getElementById('rocketTabs');
    els.payloadTabs = document.getElementById('payloadTabs');
    els.foodSlider = document.getElementById('foodSlider');
    els.o2Slider = document.getElementById('o2Slider');
    els.fuelSlider = document.getElementById('fuelSlider');
    els.foodVal = document.getElementById('foodVal');
    els.o2Val = document.getElementById('o2Val');
    els.fuelVal = document.getElementById('fuelVal');
    els.foodDuration = document.getElementById('foodDuration');
    els.o2Duration = document.getElementById('o2Duration');
    els.fuelDuration = document.getElementById('fuelDuration');
    els.massBudgetBar = document.getElementById('massBudgetBar');
    els.mbDry = document.getElementById('mbDry');
    els.mbPayload = document.getElementById('mbPayload');
    els.mbFood = document.getElementById('mbFood');
    els.mbO2 = document.getElementById('mbO2');
    els.mbFuel = document.getElementById('mbFuel');
    els.mbCrew = document.getElementById('mbCrew');
    els.mbLimit = document.getElementById('mbLimit');
    els.massTotal = document.getElementById('massTotal');
    els.massMax = document.getElementById('massMax');
    els.massOverloaded = document.getElementById('massOverloaded');
    els.deltaVValue = document.getElementById('deltaVValue');
    els.twrValue = document.getElementById('twrValue');
    els.travelValue = document.getElementById('travelValue');
    els.configByValue = document.getElementById('configByValue');
    els.missionWarning = document.getElementById('missionWarning');
    els.addBotBtn = document.getElementById('addBotBtn');
    els.removeBotBtn = document.getElementById('removeBotBtn');
    els.startBtn = document.getElementById('startBtn');
  }

  function rocketInfo(id) {
    for (var i = 0; i < ROCKETS.length; i++) if (ROCKETS[i].id === id) return ROCKETS[i];
    return ROCKETS[1];
  }

  function payloadInfo(id) {
    for (var i = 0; i < PAYLOADS.length; i++) if (PAYLOADS[i].id === id) return PAYLOADS[i];
    return PAYLOADS[1];
  }

  function setActiveOption(container, id, attribute) {
    if (!container) return;
    var buttons = container.querySelectorAll('.mission-option');
    for (var i = 0; i < buttons.length; i++) {
      var value = buttons[i].getAttribute(attribute);
      var match = attribute === 'data-rocket'
        ? ROCKETS[Number(value)] && ROCKETS[Number(value)].id === id
        : PAYLOADS[Number(value)] && PAYLOADS[Number(value)].id === id;
      buttons[i].classList.toggle('active', !!match);
    }
  }

  function sliderValue(slider, fallback) {
    return slider ? Number(slider.value) : fallback;
  }

  function currentFood() {
    return sliderValue(els.foodSlider, 160);
  }

  function currentO2() {
    return sliderValue(els.o2Slider, 150);
  }

  function currentFuel() {
    return sliderValue(els.fuelSlider, 250);
  }

  function configure() {
    if (!registered) {
      localConfigPending = false;
      return;
    }
    var gameState = RTM.Net.getState();
    if (!gameState.room || gameState.phase !== 'lobby') {
      localConfigPending = false;
      return;
    }
    clearTimeout(configPendingTimer);
    configPendingTimer = setTimeout(function () {
      localConfigPending = false;
    }, 1600);
    RTM.Net.emit('mission:configure', {
      rocket: selectedRocket,
      sciencePayload: selectedPayload,
      foodMass: currentFood(),
      o2Mass: currentO2(),
      fuelMass: currentFuel()
    });
  }

  function scheduleConfigure() {
    localConfigPending = true;
    renderEngineering();
    clearTimeout(configTimer);
    configTimer = setTimeout(configure, 120);
  }

  function commitRemoteConfig() {
    localConfigPending = false;
    clearTimeout(configPendingTimer);
  }

  function updateSupplyLabels() {
    var food = currentFood();
    var o2 = currentO2();
    var fuel = currentFuel();
    if (els.foodVal) els.foodVal.textContent = food + ' kg';
    if (els.o2Val) els.o2Val.textContent = o2 + ' kg';
    if (els.fuelVal) els.fuelVal.textContent = fuel + ' kg';
    var foodSeconds = Math.round((food / 160) * 139);
    var o2Seconds = Math.round((o2 / 150) * 119);
    if (els.foodDuration) {
      els.foodDuration.textContent = '6-crew reserve: ' + foodSeconds + ' sec · ' + (foodSeconds / 60).toFixed(1) + ' game-days';
    }
    if (els.o2Duration) {
      els.o2Duration.textContent = 'O2 reserve: ' + o2Seconds + ' sec · ' + (o2 >= 50 ? 'Moon EVA ready' : 'Moon EVA limited');
    }
    if (els.fuelDuration) {
      els.fuelDuration.textContent = 'Δv reserve: ' + fuel + ' kg propellant';
    }
  }

  function syncControlsFromRoom(room, telemetry) {
    if (localConfigPending) {
      updateSupplyLabels();
      return;
    }
    var settings = (room && room.settings) || {};
    var rocket = settings.rocket || (telemetry && telemetry.launcher) || selectedRocket;
    var payload = settings.sciencePayload || selectedPayload;
    selectedRocket = rocketInfo(rocket).id;
    selectedPayload = payloadInfo(payload).id;
    setActiveOption(els.rocketTabs, selectedRocket, 'data-rocket');
    setActiveOption(els.payloadTabs, selectedPayload, 'data-payload');
    if (els.foodSlider && settings.foodMass != null && document.activeElement !== els.foodSlider) {
      els.foodSlider.value = settings.foodMass;
    }
    if (els.o2Slider && settings.o2Mass != null && document.activeElement !== els.o2Slider) {
      els.o2Slider.value = settings.o2Mass;
    }
    if (els.fuelSlider && settings.fuelMass != null && document.activeElement !== els.fuelSlider) {
      els.fuelSlider.value = settings.fuelMass;
    }
    updateSupplyLabels();
  }

  function massBreakdown() {
    var gameState = RTM.Net ? RTM.Net.getState() : null;
    var players = (gameState && gameState.players) || {};
    var crewMass = Object.keys(players).length * 80;
    var payload = payloadInfo(selectedPayload);
    var rocket = rocketInfo(selectedRocket);
    var food = currentFood();
    var o2 = currentO2();
    var fuel = currentFuel();
    var total = DRY_MASS + payload.mass + food + o2 + fuel + crewMass;
    return {
      rocket: rocket,
      payload: payload,
      dry: DRY_MASS,
      payloadMass: payload.mass,
      food: food,
      o2: o2,
      fuel: fuel,
      crew: crewMass,
      total: total,
      max: rocket.maxMass
    };
  }

  function renderEngineering() {
    updateSupplyLabels();
    var mass = massBreakdown();
    var overBy = Math.max(0, mass.total - mass.max);
    var penaltyPct = Math.round((mass.total / mass.max - 1) * 100);
    var effectiveMax = Math.max(mass.max, mass.total);
    var segments = [
      [els.mbDry, mass.dry],
      [els.mbPayload, mass.payloadMass],
      [els.mbFood, mass.food],
      [els.mbO2, mass.o2],
      [els.mbFuel, mass.fuel],
      [els.mbCrew, mass.crew]
    ];
    for (var i = 0; i < segments.length; i++) {
      if (segments[i][0]) {
        segments[i][0].style.width = Math.max(0, (segments[i][1] / effectiveMax) * 100) + '%';
      }
    }
    if (els.mbLimit) els.mbLimit.style.left = Math.max(0, Math.min(100, (mass.max / effectiveMax) * 100)) + '%';
    if (els.massTotal) els.massTotal.textContent = Math.round(mass.total);
    if (els.massMax) els.massMax.textContent = Math.round(mass.max);
    if (els.massOverloaded) els.massOverloaded.style.display = overBy > 0 ? 'inline' : 'none';
    if (els.massBudgetBar) els.massBudgetBar.classList.toggle('overloaded', overBy > 0);

    var finalMass = Math.max(1, mass.total - mass.fuel);
    var deltaV = mass.rocket.exhaust * Math.log(mass.total / finalMass);
    var twr = mass.rocket.twrBase * (mass.max / mass.total);
    var travelDays = Math.round(210 * Math.sqrt(mass.total / mass.max) * Math.pow(250 / Math.max(50, mass.fuel), 0.35));
    travelDays = Math.max(150, Math.min(720, travelDays));
    if (els.deltaVValue) els.deltaVValue.textContent = Math.round(deltaV).toLocaleString() + ' m/s';
    if (els.twrValue) els.twrValue.textContent = twr.toFixed(2) + ' TWR';
    if (els.travelValue) els.travelValue.textContent = travelDays + ' days';

    var gameState = RTM.Net ? RTM.Net.getState() : {};
    var byName = (gameState && gameState.missionUpdatedByName) ||
      (gameState && gameState.room && gameState.room.players && gameState.room.players[gameState.room.hostId] && gameState.room.players[gameState.room.hostId].name) ||
      'Launch crew';
    if (els.configByValue) els.configByValue.textContent = byName;

    if (els.missionWarning) {
      if (overBy > 0) {
        els.missionWarning.style.display = 'block';
        els.missionWarning.textContent = 'WARNING: Overweight by ' + Math.round(overBy) +
          ' kg! Fuel burn will increase by ' + Math.max(1, penaltyPct) +
          '% — you will have to jettison cargo or sacrifice a crewmate!';
      } else {
        els.missionWarning.style.display = 'none';
        els.missionWarning.textContent = '';
      }
    }

    if (RTM.Net && RTM.Net.getState().room) {
      var state = RTM.Net.getState();
      var telemetry = state.telemetry || {};
      telemetry.totalMass = mass.total;
      telemetry.maxMass = mass.max;
      telemetry.massPenalty = overBy > 0 ? mass.total / mass.max : 1;
    }
  }

  function specialtyMeta(id) {
    return SPECIALTIES[id] || { label: 'UNASSIGNED', short: 'CREW', hat: '·' };
  }

  var lobbyAnimTick = 0;
  var lobbyLoopId = null;

  function drawLobbySlotBean(canvas, player, animTick) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!player) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      if (window.RTM && window.RTM.Renderer && window.RTM.Renderer.drawCrewmate) {
        window.RTM.Renderer.drawCrewmate(ctx, 50, 70, '#384160', {
          direction: 'right',
          moving: false,
          hat: null,
          dead: false,
          ghost: false
        });
      }
      ctx.fillStyle = '#8395b8';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', 52, 63);
      ctx.restore();
      return;
    }

    var bounceY = Math.sin((animTick || 0) * 0.08) * 3;
    if (window.RTM && window.RTM.Renderer && window.RTM.Renderer.drawCrewmate) {
      window.RTM.Renderer.drawCrewmate(ctx, 50, 70 + bounceY, player.color || '#c51111', {
        direction: 'right',
        moving: true,
        animFrame: Math.floor((animTick || 0) * 0.1),
        hat: player.specialty || player.hat || 'pilot',
        dead: false,
        ghost: false
      });
    }
  }

  function wireWelcomeAndHangar() {
    var nameInput = document.getElementById('welcomePlayerName');
    var createBtn = document.getElementById('welcomeCreateRoomBtn');
    var codeInput = document.getElementById('welcomeRoomCodeInput');
    var joinBtn = document.getElementById('welcomeJoinRoomBtn');
    var archiveBtn = document.getElementById('welcomeNasaArchiveBtn');
    var leaveBtn = document.getElementById('hangarLeaveRoomBtn');
    var copyBtn = document.getElementById('copyRoomCodeBtn');
    var colorPicker = document.getElementById('welcomeColorPicker');
    var beanCanvas = document.getElementById('welcomeCrewmateCanvas');

    var storedName = '';
    var storedColor = COLORS[0];
    try {
      storedName = localStorage.getItem('rtm-player-name') || '';
      storedColor = localStorage.getItem('rtm-player-color') || COLORS[0];
    } catch (_) {}
    if (!storedName) {
      storedName = 'Astronaut-' + Math.floor(Math.random() * 900 + 100);
      try { localStorage.setItem('rtm-player-name', storedName); } catch (_) {}
    }

    function updateWelcomeBean() {
      if (beanCanvas) {
        drawLobbySlotBean(beanCanvas, { color: storedColor, specialty: 'pilot' }, lobbyAnimTick);
      }
    }

    if (nameInput) {
      nameInput.value = storedName;
      nameInput.addEventListener('input', function () {
        storedName = nameInput.value.trim() || 'Astronaut';
        try { localStorage.setItem('rtm-player-name', storedName); } catch (_) {}
        RTM.Net.emit('player:register', { name: storedName, color: storedColor });
      });
    }

    if (colorPicker) {
      colorPicker.innerHTML = '';
      COLORS.forEach(function (c) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'welcome-color-dot' + (c === storedColor ? ' active' : '');
        dot.style.background = c;
        dot.title = 'Choose Suit Color';
        dot.addEventListener('click', function () {
          storedColor = c;
          try { localStorage.setItem('rtm-player-color', c); } catch (_) {}
          var dots = colorPicker.querySelectorAll('.welcome-color-dot');
          dots.forEach(function (d) { d.classList.toggle('active', d.style.background === c); });
          updateWelcomeBean();
          RTM.Net.emit('player:register', { name: storedName, color: storedColor });
        });
        colorPicker.appendChild(dot);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', function () {
        var name = (nameInput ? nameInput.value.trim() : '') || storedName || 'Commander';
        RTM.Net.emit('player:register', { name: name, color: storedColor });
        createSent = true;
        RTM.Net.emit('room:create', {});
      });
    }

    if (joinBtn && codeInput) {
      joinBtn.addEventListener('click', function () {
        var code = codeInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code || code.length < 4) {
          alert('Please enter a valid 4 to 6 character Room Code!');
          return;
        }
        if (RTM.Net && RTM.Net.isOffline && RTM.Net.isOffline()) {
          alert('⚠️ You are currently in OFFLINE mode!\n\nTo play multiplayer with your friend, make sure you open the game via your browser using the host’s server link (e.g. http://192.168.1.14:3000), not as a local file.');
          return;
        }
        var name = (nameInput ? nameInput.value.trim() : '') || storedName || 'Explorer';
        RTM.Net.emit('player:register', { name: name, color: storedColor });
        RTM.Net.emit('room:join', { roomId: code });
      });
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') joinBtn.click();
      });
    }

    var serverNetworkUrl = '';
    var lanDisplay = document.getElementById('welcomeLanDisplay');
    if (lanDisplay) {
      if (location.protocol === 'file:') {
        lanDisplay.textContent = 'file:/// (Offline Mode)';
      } else {
        lanDisplay.textContent = location.origin;
        fetch('/api/server-info')
          .then(function (r) { return r.json(); })
          .then(function (info) {
            if (info && info.networkUrl) {
              serverNetworkUrl = info.networkUrl;
              lanDisplay.textContent = info.networkUrl;
              var lanHint = document.getElementById('lanInviteHint');
              if (lanHint && RTM.Net && RTM.Net.getState().room) {
                var code = RTM.Net.getState().room.code || RTM.Net.getState().room.id || '';
                if (code) {
                  lanHint.innerHTML = 'Direct Invite: <span style="color:#38fedc;font-family:monospace;cursor:pointer;" title="Click to copy">' + serverNetworkUrl + '/?room=' + code + '</span>';
                }
              }
            }
          })
          .catch(function () {});
      }
    }

    if (archiveBtn) {
      archiveBtn.addEventListener('click', function () {
        if (RTM.NasaArchive && RTM.NasaArchive.open) {
          RTM.NasaArchive.open();
        }
      });
    }

    if (leaveBtn) {
      leaveBtn.addEventListener('click', function () {
        RTM.Net.emit('room:leave', {});
        createSent = false;
        var st = RTM.Net.getState();
        st.room = null;
        st.phase = 'lobby';
        if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var room = RTM.Net.getState().room;
        var code = room ? (room.code || room.id || '') : '';
        if (!code) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () {
            copyBtn.textContent = 'COPIED! ✅';
            if (RTM.HUD && RTM.HUD.showNotification) {
              RTM.HUD.showNotification('Room code ' + code + ' copied to clipboard!', 'success');
            }
            setTimeout(function () {
              copyBtn.textContent = '📋 CODE';
            }, 2000);
          });
        }
      });
    }

    var copyLinkBtn = document.getElementById('copyInviteLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', function () {
        var room = RTM.Net.getState().room;
        var code = room ? (room.code || room.id || '') : '';
        if (!code) return;
        var hostOrigin = location.origin;
        if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && serverNetworkUrl) {
          hostOrigin = serverNetworkUrl;
        }
        var inviteUrl = hostOrigin + '/?room=' + code;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inviteUrl).then(function () {
            copyLinkBtn.textContent = 'LINK COPIED! ✅';
            if (RTM.HUD && RTM.HUD.showNotification) {
              RTM.HUD.showNotification('🔗 Direct invite link copied: ' + inviteUrl + ' (Send to your friend!)', 'success', 7000);
            }
            setTimeout(function () {
              copyLinkBtn.textContent = '🔗 LINK';
            }, 2500);
          });
        }
      });
    }
  }

  function updateVibeMeter(telemetry) {
    var fill = document.getElementById('vibeFill');
    var badge = document.getElementById('vibeStatusBadge');
    var totalLabel = document.getElementById('vibeTotalLabel');
    var foodLabel = document.getElementById('vibeFoodLabel');
    var o2Label = document.getElementById('vibeO2Label');
    if (!fill || !badge) return;

    telemetry = telemetry || (RTM.Net ? RTM.Net.getState().telemetry : {}) || {};
    var maxMass = telemetry.maxMass || 1600;
    var totalMass = telemetry.totalMass || 1100;
    var ratio = totalMass / maxMass;
    var percent = Math.min(100, Math.round(ratio * 100));
    fill.style.width = percent + '%';

    if (totalLabel) totalLabel.textContent = Math.round(totalMass) + ' / ' + Math.round(maxMass) + ' kg';
    if (foodLabel) foodLabel.textContent = Math.round(telemetry.foodMass != null ? telemetry.foodMass : currentFood()) + ' kg';
    if (o2Label) o2Label.textContent = Math.round(telemetry.o2Mass != null ? telemetry.o2Mass : currentO2()) + ' kg';

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

  function fillSlot(player, isLocal) {
    var slot = document.createElement('div');
    slot.className = 'player-slot' + (player ? '' : ' empty') + (isLocal ? ' you' : '');

    var canvas = document.createElement('canvas');
    canvas.className = 'slot-crewmate-canvas';
    canvas.width = 100;
    canvas.height = 110;
    slot.appendChild(canvas);
    drawLobbySlotBean(canvas, player, lobbyAnimTick);

    var name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = player ? (player.name || 'Crew') : 'EMPTY';
    slot.appendChild(name);

    if (player) {
      var meta = specialtyMeta(player.specialty);
      var specialty = document.createElement('span');
      specialty.className = 'slot-specialty';
      specialty.textContent = meta.short;
      slot.appendChild(specialty);

      var tags = [];
      if (isLocal) tags.push('YOU');
      if (player.isHost) tags.push('HOST');
      if (player.isBot) tags.push('BOT');
      if (tags.length > 0) {
        var tag = document.createElement('span');
        tag.className = 'slot-label';
        tag.textContent = tags.join(' · ');
        slot.appendChild(tag);
      }

      if (isLocal) {
        var hatPicker = document.createElement('div');
        hatPicker.className = 'slot-hat-picker';
        var hats = [
          { id: 'pilot', icon: '👨‍✈️', title: 'Pilot' },
          { id: 'chef', icon: '🧀', title: 'Cheese Master' },
          { id: 'o2', icon: '🌱', title: 'O2 Green' },
          { id: 'scientist', icon: '🥽', title: 'Scientist' },
          { id: 'hard_hat', icon: '⛑️', title: 'Engineer' }
        ];
        hats.forEach(function (h) {
          var btn = document.createElement('button');
          btn.className = 'hat-btn';
          btn.type = 'button';
          btn.setAttribute('data-hat', h.id);
          btn.title = h.title;
          btn.textContent = h.icon;
          btn.onclick = function (e) {
            e.stopPropagation();
            chooseSpecialty(h.id);
          };
          hatPicker.appendChild(btn);
        });
        slot.appendChild(hatPicker);
      }
    } else {
      var emptyLabel = document.createElement('span');
      emptyLabel.className = 'slot-label';
      emptyLabel.textContent = 'WAITING FOR CREW';
      slot.appendChild(emptyLabel);
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
    if (els.crewCount) els.crewCount.textContent = list.length + ' / 6';
    var local = players[RTM.Net.playerId];
    if (local && local.specialty && SPECIALTIES[local.specialty]) {
      localSpecialty = local.specialty;
    }
    if (local && local.specialty === 'crew' && !specialtySent) {
      specialtySent = true;
      RTM.Net.emit('player:specialty', { specialty: localSpecialty || 'pilot' });
    }
  }

  function renderSpecialtyPicker() {
    if (!els.specialtyPicker) return;
    var buttons = els.specialtyPicker.querySelectorAll('.specialty-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('active', buttons[i].getAttribute('data-specialty') === localSpecialty);
    }
  }

  function render() {
    var gameState = RTM.Net ? RTM.Net.getState() : null;
    if (!gameState) return;
    var room = gameState.room;
    var code = room ? (room.code || room.id || '????') : '????';
    if (els.roomCode) els.roomCode.textContent = code;
    var lanHint = document.getElementById('lanInviteHint');
    if (lanHint) {
      if (room && code !== '????') {
        var hostOrigin = ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && serverNetworkUrl) ? serverNetworkUrl : location.origin;
        var inviteUrl = hostOrigin + '/?room=' + code;
        lanHint.innerHTML = 'Direct Invite: <span style="color:#38fedc;font-family:monospace;cursor:pointer;" title="Click to copy">' + inviteUrl + '</span>';
        lanHint.onclick = function () {
          var copyLinkBtn = document.getElementById('copyInviteLinkBtn');
          if (copyLinkBtn) copyLinkBtn.click();
        };
      } else {
        lanHint.textContent = '';
      }
    }
    syncControlsFromRoom(room, gameState.telemetry);
    renderPlayers();
    renderEngineering();
    updateVibeMeter(gameState.telemetry);
    var host = RTM.Net.isHost();
    if (els.startBtn) {
      els.startBtn.disabled = !host;
      els.startBtn.className = host ? 'au-btn au-btn-green au-btn-pulse lobby-start-btn' : 'au-btn au-btn-gray lobby-start-btn';
      els.startBtn.innerHTML = host ? '🚀 LAUNCH EXPEDITION' : '⏳ WAITING FOR CAPTAIN';
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
      var codeInput = document.getElementById('welcomeRoomCodeInput');
      if (codeInput) codeInput.value = code;
      if (RTM.HUD && RTM.HUD.showNotification) {
        RTM.HUD.showNotification('Auto-joining room ' + code + ' from link...', 'info', 4000);
      }
      RTM.Net.emit('room:join', { roomId: code });
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
    RTM.Net.emit('game:start', { fillBots: false });
  }

  function chooseSpecialty(specialty) {
    if (!SPECIALTIES[specialty]) return;
    localSpecialty = specialty;
    specialtySent = true;
    renderSpecialtyPicker();
    RTM.Net.emit('player:specialty', { specialty: specialty });
  }

  function init() {
    cache();
    wireWelcomeAndHangar();

    if (!lobbyLoopId) {
      function lobbyAnimLoop() {
        lobbyAnimTick++;
        var welcomeCanvas = document.getElementById('welcomeCrewmateCanvas');
        if (welcomeCanvas && welcomeCanvas.offsetParent !== null) {
          var storedColor = COLORS[0];
          try { storedColor = localStorage.getItem('rtm-player-color') || COLORS[0]; } catch (_) {}
          drawLobbySlotBean(welcomeCanvas, { color: storedColor, specialty: 'pilot' }, lobbyAnimTick);
        }
        if (els.playerGrid) {
          var canvases = els.playerGrid.querySelectorAll('.slot-crewmate-canvas');
          var gameState = RTM.Net ? RTM.Net.getState() : {};
          var players = gameState.players || {};
          var list = Object.keys(players).map(function (id) { return players[id]; });
          list.sort(function (a, b) {
            if (a.id === RTM.Net.playerId) return -1;
            if (b.id === RTM.Net.playerId) return 1;
            return 0;
          });
          for (var c = 0; c < canvases.length; c++) {
            drawLobbySlotBean(canvases[c], list[c] || null, lobbyAnimTick);
          }
        }
        lobbyLoopId = requestAnimationFrame(lobbyAnimLoop);
      }
      lobbyLoopId = requestAnimationFrame(lobbyAnimLoop);
    }
    if (els.rocketTabs) {
      els.rocketTabs.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-rocket]');
        if (!button) return;
        var info = ROCKETS[Number(button.getAttribute('data-rocket'))];
        if (!info) return;
        selectedRocket = info.id;
        setActiveOption(els.rocketTabs, selectedRocket, 'data-rocket');
        scheduleConfigure();
      });
    }
    if (els.payloadTabs) {
      els.payloadTabs.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-payload]');
        if (!button) return;
        var info = PAYLOADS[Number(button.getAttribute('data-payload'))];
        if (!info) return;
        selectedPayload = info.id;
        setActiveOption(els.payloadTabs, selectedPayload, 'data-payload');
        scheduleConfigure();
      });
    }
    [els.foodSlider, els.o2Slider, els.fuelSlider].forEach(function (slider) {
      if (!slider) return;
      slider.addEventListener('input', function () {
        scheduleConfigure();
      });
    });
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
    RTM.Net.on('room:join:error', function (err) {
      clearTimeout(joinTimer);
      var msg = (err && err.message) || 'Room not found. Please verify the 6-character room code!';
      if (RTM.HUD && RTM.HUD.showNotification) {
        RTM.HUD.showNotification('❌ ' + msg, 'error', 7000);
      }
      alert('⚠️ Could not join room: ' + msg + '\n\nMake sure your commander created the room on this server, and check that the 6-letter room code is typed correctly.');
      var codeInput = document.getElementById('welcomeRoomCodeInput');
      if (codeInput) {
        codeInput.focus();
        codeInput.select();
      }
    });
    RTM.Net.on('room:updated', render);
    RTM.Net.on('state:snapshot', render);
    RTM.Net.on('player:joined', render);
    RTM.Net.on('player:left', render);
    RTM.Net.on('player:specialty', render);
    RTM.Net.on('telemetry:updated', function () {
      renderEngineering();
    });
    RTM.Net.on('mission:configured', function () {
      commitRemoteConfig();
      render();
    });
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
