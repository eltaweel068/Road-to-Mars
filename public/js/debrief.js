window.RTM = window.RTM || {};
window.RTM.Debrief = (function () {
  'use strict';

  var REASONS = {
    'life-support-failure': 'Life support failed. Oxygen or fuel reserves were depleted.',
    'imposters-eliminated': 'Every impostor was eliminated.',
    'crew-eliminated': 'The crew was eliminated.',
    'imposter-parity': 'The impostors reached parity with the crew.',
    'mars-arrival': 'The crew completed the voyage to Mars.'
  };

  var els = {};
  var open = false;

  function cache() {
    els.screen = document.getElementById('debriefScreen');
    els.outcome = document.getElementById('debriefOutcome');
    els.stats = document.getElementById('debriefStats');
    els.playAgain = document.getElementById('playAgainBtn');
    els.continuePlaying = document.getElementById('continuePlayingBtn');
  }

  function makeStat(label, value) {
    var card = document.createElement('div');
    card.className = 'stat-card';
    var labelEl = document.createElement('div');
    labelEl.className = 'stat-card-label';
    labelEl.textContent = label;
    var valueEl = document.createElement('div');
    valueEl.className = 'stat-card-value';
    valueEl.textContent = value;
    card.appendChild(labelEl);
    card.appendChild(valueEl);
    return card;
  }

  function ensureReason() {
    if (!els.screen || document.getElementById('debriefReason')) return;
    var reason = document.createElement('p');
    reason.id = 'debriefReason';
    reason.className = 'debrief-reason';
    if (els.outcome && els.outcome.parentNode) {
      els.outcome.parentNode.insertBefore(reason, els.outcome.nextSibling);
    }
  }

  function ensureRoster() {
    if (!els.screen || document.getElementById('debriefRoster')) return;
    var roster = document.createElement('div');
    roster.id = 'debriefRoster';
    roster.className = 'debrief-roster';
    if (els.stats && els.stats.parentNode) {
      els.stats.parentNode.insertBefore(roster, els.stats.nextSibling);
    }
  }

  function show(data) {
    if (!els.screen || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    var payload = data || {};
    var winner = payload.winner || (gameState.room && gameState.room.winner) || 'crew';
    var reason = payload.reason || 'unknown';
    var players = payload.players || gameState.players || {};
    var localId = RTM.Net.playerId;
    var local = players[localId] || gameState.players[localId] || null;
    var localImpostor = local ? (local.isImposter === true || local.role === 'impostor') : RTM.Net.isImpostor();
    var localWon = (winner === 'imposters' && localImpostor) || (winner === 'crew' && !localImpostor);
    var telemetry = payload.telemetry || gameState.telemetry || {};
    var tasks = payload.tasks || gameState.tasks || {};
    var moon = payload.moon || gameState.moon || {};
    var nodes = moon.nodes || [];
    var collected = nodes.filter(function (node) { return node.collected; }).length;
    var totalNodes = nodes.length || 10;
    var playerIds = Object.keys(players);
    var alive = playerIds.filter(function (id) { return players[id].isAlive !== false && players[id].alive !== false; }).length;

    open = true;
    els.screen.style.display = 'flex';
    if (els.outcome) {
      els.outcome.textContent = localWon ? 'VICTORY' : 'DEFEAT';
      els.outcome.className = 'debrief-outcome ' + (localWon ? 'victory' : 'defeat');
    }
    ensureReason();
    var reasonEl = document.getElementById('debriefReason');
    if (reasonEl) {
      reasonEl.textContent = REASONS[reason] || 'The mission has ended.';
    }
    if (els.stats) {
      els.stats.innerHTML = '';
      els.stats.appendChild(makeStat('TASKS', (tasks.completions || 0) + ' / ' + Math.round(tasks.progress || 0) + '%'));
      els.stats.appendChild(makeStat('SURVIVORS', alive + ' / ' + playerIds.length));
      els.stats.appendChild(makeStat('SCIENCE', String(telemetry.science || 0)));
      els.stats.appendChild(makeStat('MARS PROGRESS', Math.round(telemetry.marsProgress || 0) + '%'));
      els.stats.appendChild(makeStat('SHIP MASS', Math.round(telemetry.totalMass || 0) + ' kg'));
      els.stats.appendChild(makeStat('MOON SAMPLES', collected + ' / ' + totalNodes));
    }
    ensureRoster();
    var roster = document.getElementById('debriefRoster');
    if (roster) {
      roster.innerHTML = '';
      playerIds.forEach(function (id) {
        var player = players[id];
        var chip = document.createElement('div');
        chip.className = 'debrief-player';
        if (player.isImposter === true || player.role === 'impostor') chip.classList.add('debrief-impostor');
        if (player.isAlive === false || player.alive === false) chip.classList.add('debrief-dead');
        var color = document.createElement('span');
        color.className = 'debrief-player-color';
        color.style.background = player.color || '#888';
        var name = document.createElement('span');
        name.textContent = player.name || 'Crew';
        chip.appendChild(color);
        chip.appendChild(name);
        if (player.isImposter === true || player.role === 'impostor') {
          var role = document.createElement('span');
          role.className = 'debrief-player-role';
          role.textContent = 'IMPOSTOR';
          chip.appendChild(role);
        }
        roster.appendChild(chip);
      });
    }
    if (els.playAgain) {
      els.playAgain.disabled = false;
      els.playAgain.textContent = RTM.Net.isHost() ? 'PLAY AGAIN' : 'NEW MISSION';
    }
    if (RTM.HUD) RTM.HUD.updateButtons({ canReport: false, nearStation: false, nearCrewmate: false });
  }

  function hide() {
    open = false;
    if (els.screen) els.screen.style.display = 'none';
  }

  function playAgain() {
    if (els.playAgain) {
      els.playAgain.disabled = true;
      els.playAgain.textContent = 'RELOADING...';
    }
    setTimeout(function () {
      window.location.reload();
    }, 250);
  }

  function init() {
    cache();
    ensureReason();
    ensureRoster();
    if (els.playAgain) els.playAgain.addEventListener('click', playAgain);
    if (els.continuePlaying) {
      els.continuePlaying.addEventListener('click', function () {
        hide();
        if (RTM.Net) {
          var state = RTM.Net.getState();
          state.phase = 'playing';
        }
        if (RTM.HUD && RTM.HUD.updateButtons) {
          RTM.HUD.updateButtons({ canReport: true, nearStation: false, nearCrewmate: false });
        }
      });
    }
    if (RTM.Net) {
      RTM.Net.on('game:ended', show);
      RTM.Net.on('game:started', hide);
      RTM.Net.on('room:left', hide);
    }
  }

  return {
    init: init,
    show: show,
    hide: hide,
    isOpen: function () { return open; }
  };
})();
