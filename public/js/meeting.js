window.RTM = window.RTM || {};
window.RTM.Meeting = (function () {
  'use strict';

  var els = {};
  var open = false;
  var timerId = null;
  var endsAt = 0;
  var selectedTarget = null;
  var jettisoned = {};
  var meetingId = null;
  var ejectTimer = null;

  function cache() {
    els.screen = document.getElementById('meetingTablet');
    els.timer = document.getElementById('meetingTimer');
    els.voteGrid = document.getElementById('voteGrid');
    els.chatMessages = document.getElementById('chatMessages');
    els.chatInput = document.getElementById('chatInput');
    els.chatSend = document.getElementById('chatSend');
    els.skipVote = document.getElementById('skipVoteBtn');
    els.jettison = document.getElementById('jettisonBtn');
    els.ejection = document.getElementById('ejectionScreen');
    els.ejectionCrewmate = document.getElementById('ejectionCrewmate');
    els.ejectionText = document.getElementById('ejectionText');
  }

  function localPlayer() {
    if (!RTM.Net) return null;
    return RTM.Net.getState().players[RTM.Net.playerId] || null;
  }

  function ensureStatusBar() {
    if (!els.screen || document.getElementById('meetingStatus')) return;
    var status = document.createElement('div');
    status.id = 'meetingStatus';
    status.className = 'meeting-status';
    status.textContent = 'VOTES 0 / 0';
    var grid = document.getElementById('voteGrid');
    if (grid && grid.parentNode) grid.parentNode.insertBefore(status, grid.nextSibling);
  }

  function updateStatus(votesCast, votesRequired) {
    ensureStatusBar();
    var status = document.getElementById('meetingStatus');
    if (!status) return;
    status.textContent = 'VOTES ' + (votesCast || 0) + ' / ' + (votesRequired || 0);
  }

  function show(data) {
    if (!els.screen || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    var meeting = (data && data.meeting) || gameState.meeting || {};
    var currentEndsAt = (data && data.endsAt) || meeting.endsAt || (gameState.room && gameState.room.meeting && gameState.room.meeting.endsAt);
    if (!currentEndsAt) return;
    var nextId = (data && data.meetingId) || meeting.id || 'meeting';
    if (meetingId !== nextId) {
      meetingId = nextId;
      selectedTarget = null;
      jettisoned = {};
      if (els.chatMessages) els.chatMessages.innerHTML = '';
    }
    endsAt = currentEndsAt;
    open = true;
    els.screen.style.display = 'flex';
    renderVoteCards(data && data.players);
    ensureStatusBar();
    updateStatus(0, (data && data.votesRequired) || meeting.votesRequired || 0);
    updateJettisonButton();
    updateTimer();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(updateTimer, 200);
    if (RTM.HUD) RTM.HUD.updateButtons({ canReport: false, nearStation: false, nearCrewmate: false });
  }

  function hide() {
    open = false;
    if (els.screen) els.screen.style.display = 'none';
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    var menu = document.querySelector('.jettison-menu');
    if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
  }

  function updateTimer() {
    if (!open) return;
    var remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (els.timer) els.timer.textContent = String(remaining);
    if (remaining <= 0 && timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function renderVoteCards(players) {
    if (!els.voteGrid || !RTM.Net) return;
    var gameState = RTM.Net.getState();
    var list = players || gameState.players || {};
    var ids = Object.keys(list);
    ids.sort(function (a, b) {
      if (a === RTM.Net.playerId) return -1;
      if (b === RTM.Net.playerId) return 1;
      return String(list[a].name || '').localeCompare(String(list[b].name || ''));
    });
    els.voteGrid.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var id = ids[i];
      var player = id ? list[id] : null;
      var card = document.createElement('div');
      card.className = 'vote-card';
      if (!player) {
        card.classList.add('vote-card-empty');
        var empty = document.createElement('span');
        empty.className = 'vote-card-name';
        empty.textContent = 'NO CREW';
        card.appendChild(empty);
        els.voteGrid.appendChild(card);
        continue;
      }
      card.setAttribute('data-player-id', player.id);
      if (player.alive === false || player.isAlive === false) card.classList.add('vote-card-dead');
      var icon = document.createElement('div');
      icon.className = 'vote-card-icon';
      icon.style.background = player.color || '#888';
      var visor = document.createElement('div');
      visor.className = 'vote-card-visor';
      icon.appendChild(visor);
      var name = document.createElement('span');
      name.className = 'vote-card-name';
      name.textContent = (player.name || 'Crew') + (player.id === RTM.Net.playerId ? ' (YOU)' : '');
      var voteBtn = document.createElement('button');
      voteBtn.className = 'au-btn vote-btn';
      voteBtn.textContent = 'VOTE';
      voteBtn.disabled = !RTM.Net.isAlive() || player.alive === false || player.isAlive === false;
      voteBtn.addEventListener('click', function (targetId) {
        return function () { castVote(targetId); };
      }(player.id));
      var stamp = document.createElement('div');
      stamp.className = 'vote-stamp';
      stamp.textContent = 'VOTED';
      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(voteBtn);
      card.appendChild(stamp);
      els.voteGrid.appendChild(card);
    }
  }

  function castVote(targetId) {
    if (!RTM.Net || !RTM.Net.isAlive()) return;
    selectedTarget = targetId;
    RTM.Net.emit('meeting:vote', { targetId: targetId });
    markVote(RTM.Net.playerId, targetId);
  }

  function markVote(voterId, targetId) {
    var cards = els.voteGrid ? els.voteGrid.querySelectorAll('.vote-card') : [];
    for (var i = 0; i < cards.length; i++) {
      var stamp = cards[i].querySelector('.vote-stamp');
      if (stamp) stamp.classList.remove('visible');
    }
    if (targetId == null) {
      if (els.skipVote) els.skipVote.classList.add('vote-selected');
      return;
    }
    var card = els.voteGrid ? els.voteGrid.querySelector('.vote-card[data-player-id="' + targetId + '"]') : null;
    if (card) {
      var stamp = card.querySelector('.vote-stamp');
      if (stamp) {
        stamp.textContent = voterId === RTM.Net.playerId ? 'YOUR VOTE' : 'VOTED';
        stamp.classList.add('visible');
      }
    }
  }

  function skipVote() {
    if (!RTM.Net || !RTM.Net.isAlive()) return;
    selectedTarget = null;
    RTM.Net.emit('meeting:vote', { targetId: null });
    markVote(RTM.Net.playerId, null);
  }

  function updateJettisonButton() {
    if (!els.jettison) return;
    var both = jettisoned.food && jettisoned.payload;
    els.jettison.disabled = !RTM.Net.isAlive() || both;
    els.jettison.style.opacity = both ? '0.45' : '1';
  }

  function openJettisonMenu() {
    if (!els.jettison || !els.screen || !RTM.Net.isAlive()) return;
    var existing = document.querySelector('.jettison-menu');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var menu = document.createElement('div');
    menu.className = 'jettison-menu';
    var title = document.createElement('div');
    title.className = 'jettison-menu-title';
    title.textContent = 'JETTISON CARGO';
    var food = document.createElement('button');
    food.className = 'au-btn au-btn-gray';
    food.textContent = 'FOOD';
    food.disabled = !!jettisoned.food;
    food.addEventListener('click', function () { jettison('food'); });
    var payload = document.createElement('button');
    payload.className = 'au-btn au-btn-gray';
    payload.textContent = 'PAYLOAD';
    payload.disabled = !!jettisoned.payload;
    payload.addEventListener('click', function () { jettison('payload'); });
    var cancel = document.createElement('button');
    cancel.className = 'au-btn';
    cancel.textContent = 'CANCEL';
    cancel.addEventListener('click', function () {
      if (menu.parentNode) menu.parentNode.removeChild(menu);
    });
    menu.appendChild(title);
    menu.appendChild(food);
    menu.appendChild(payload);
    menu.appendChild(cancel);
    els.screen.appendChild(menu);
  }

  function jettison(type) {
    if (!RTM.Net || !RTM.Net.isAlive() || jettisoned[type]) return;
    jettisoned[type] = true;
    RTM.Net.emit('cargo:jettison', { type: type });
    var menu = document.querySelector('.jettison-menu');
    if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
    updateJettisonButton();
  }

  function sendChat() {
    if (!RTM.Net || !els.chatInput) return;
    var message = els.chatInput.value.trim();
    if (!message) return;
    RTM.Net.emit('room:send:message', { message: message, text: message });
    els.chatInput.value = '';
  }

  function appendChat(data) {
    if (!els.chatMessages || !data || !data.message) return;
    var row = document.createElement('div');
    row.className = 'chat-msg';
    var name = document.createElement('span');
    name.className = 'chat-msg-name';
    name.textContent = (data.name || 'Crew') + ': ';
    var text = document.createElement('span');
    text.textContent = data.message;
    var gameState = RTM.Net ? RTM.Net.getState() : null;
    var player = gameState && data.playerId ? gameState.players[data.playerId] : null;
    if (player && player.color) name.style.color = player.color;
    row.appendChild(name);
    row.appendChild(text);
    els.chatMessages.appendChild(row);
    while (els.chatMessages.children.length > 100) {
      els.chatMessages.removeChild(els.chatMessages.firstChild);
    }
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function showEjection(results) {
    if (!results || !results.ejectedPlayer) return;
    var player = results.ejectedPlayer;
    if (els.ejectionCrewmate) {
      els.ejectionCrewmate.style.background = player.color || '#c51111';
      els.ejectionCrewmate.style.animation = 'none';
      void els.ejectionCrewmate.offsetWidth;
      els.ejectionCrewmate.style.animation = '';
    }
    if (els.ejectionText) {
      els.ejectionText.innerHTML = '';
      var name = document.createElement('span');
      name.textContent = player.name || 'CREWMATE';
      var verdict = document.createElement('span');
      verdict.className = 'was-not-impostor';
      verdict.textContent = ' WAS EJECTED INTO DEEP SPACE (-80 KG MASS)';
      els.ejectionText.appendChild(name);
      els.ejectionText.appendChild(verdict);
    }
    if (els.ejection) els.ejection.style.display = 'flex';
    if (ejectTimer) clearTimeout(ejectTimer);
    ejectTimer = setTimeout(function () {
      if (els.ejection) els.ejection.style.display = 'none';
      if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
    }, 3400);
  }

  function onMeetingEnded(data) {
    hide();
    var results = (data && data.results) || (RTM.Net.getState().lastMeetingResults);
    if (!results) return;
    if (results.ejectedPlayer) {
      showEjection(results);
    } else if (results.tie) {
      if (RTM.HUD) RTM.HUD.showNotification('The vote was tied. No one was ejected.', 'info');
    } else if (results.skipped || results.noVotes) {
      if (RTM.HUD) RTM.HUD.showNotification('No one was ejected.', 'info');
    }
    if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
  }

  function callMeeting() {
    if (!RTM.Net) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || !RTM.Net.isAlive()) return;
    var lastEnd = gameState.room && gameState.room.lastMeetingEndAt ? gameState.room.lastMeetingEndAt : 0;
    if (Date.now() - lastEnd < 15000) {
      if (RTM.HUD) RTM.HUD.showNotification('Emergency meeting cooldown is active.', 'info');
      return;
    }
    RTM.Net.emit('meeting:start');
  }

  function init() {
    cache();
    ensureStatusBar();
    if (els.skipVote) els.skipVote.addEventListener('click', skipVote);
    if (els.jettison) els.jettison.addEventListener('click', openJettisonMenu);
    if (els.chatSend) els.chatSend.addEventListener('click', sendChat);
    if (els.chatInput) {
      els.chatInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          sendChat();
        }
      });
    }
    if (RTM.Net) {
      RTM.Net.on('meeting:started', show);
      RTM.Net.on('meeting:voted', function (data) {
        if (!open || !data) return;
        updateStatus(data.votesCast, data.votesRequired);
        if (data.voterId === RTM.Net.playerId) markVote(data.voterId, data.targetId);
      });
      RTM.Net.on('meeting:ended', onMeetingEnded);
      RTM.Net.on('room:message', appendChat);
      RTM.Net.on('cargo:jettisoned', function (data) {
        if (data && data.type) jettisoned[data.type] = true;
        updateJettisonButton();
      });
      RTM.Net.on('game:started', function () {
        jettisoned = {};
        selectedTarget = null;
        meetingId = null;
        if (els.chatMessages) els.chatMessages.innerHTML = '';
      });
      RTM.Net.on('game:ended', hide);
      RTM.Net.on('room:left', hide);
    }
  }

  return {
    init: init,
    show: show,
    hide: hide,
    callMeeting: callMeeting,
    isOpen: function () { return open; },
    getSelectedVote: function () { return selectedTarget; }
  };
})();
