window.RTM = window.RTM || {};
window.RTM.Main = (function () {
  'use strict';

  var initialized = false;
  var revealActive = false;
  var revealTimer = null;
  var currentRole = null;
  var els = {};

  function cache() {
    els.canvas = document.getElementById('gameCanvas');
    els.lobby = document.getElementById('lobbyScreen');
    els.roleReveal = document.getElementById('roleReveal');
    els.shhh = document.getElementById('shhhText');
    els.roleText = document.getElementById('roleText');
    els.taskBar = document.getElementById('taskBar');
    els.clipboard = document.getElementById('telemetryClipboard');
    els.actions = document.getElementById('actionButtons');
    els.meeting = document.getElementById('meetingTablet');
    els.ejection = document.getElementById('ejectionScreen');
    els.debrief = document.getElementById('debriefScreen');
  }

  function setDisplay(element, visible, value) {
    if (!element) return;
    element.style.display = visible ? (value || 'flex') : 'none';
  }

  function gameplayHudVisible(visible) {
    setDisplay(els.taskBar, visible, 'block');
    setDisplay(els.clipboard, visible, 'block');
    setDisplay(els.actions, visible, 'flex');
  }

  function ejectionVisible() {
    return !!(els.ejection && els.ejection.style.display !== 'none' && els.ejection.style.display !== '');
  }

  function hideRoleReveal() {
    revealActive = false;
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    setDisplay(els.roleReveal, false);
  }

  function showRoleReveal(role) {
    if (!els.roleReveal) return;
    currentRole = 'crewmate';
    revealActive = true;
    gameplayHudVisible(false);
    if (RTM.Ship) RTM.Ship.setActive(false);
    if (RTM.Moon) RTM.Moon.setActive(false);
    if (RTM.Meeting) RTM.Meeting.hide();
    if (RTM.Tasks) RTM.Tasks.close();
    setDisplay(els.lobby, false);
    setDisplay(els.roleReveal, true);
    if (els.shhh) els.shhh.textContent = '🚀 ROAD TO MARS';
    if (els.roleText) {
      els.roleText.textContent = 'LAUNCHING EXPEDITION TO MARS!';
      els.roleText.className = 'role-text crewmate';
      els.roleText.style.animation = 'none';
      void els.roleText.offsetWidth;
      els.roleText.style.animation = '';
    }
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(function () {
      revealTimer = null;
      hideRoleReveal();
      refreshGameplay();
    }, 2000);
  }

  function refreshGameplay() {
    if (!RTM.Net || !initialized) return;
    var gameState = RTM.Net.getState();
    var phase = gameState.phase;
    if (revealActive) {
      if (RTM.Ship) RTM.Ship.setActive(false);
      if (RTM.Moon) RTM.Moon.setActive(false);
      return;
    }
    if (phase === 'lobby' || phase === 'menu') {
      setDisplay(els.lobby, true);
      setDisplay(els.roleReveal, false);
      setDisplay(els.meeting, false);
      gameplayHudVisible(false);
      if (RTM.Ship) RTM.Ship.setActive(false);
      if (RTM.Moon) RTM.Moon.setActive(false);
      return;
    }
    setDisplay(els.lobby, false);
    if (phase === 'meeting') {
      gameplayHudVisible(false);
      if (RTM.Ship) RTM.Ship.setActive(false);
      if (RTM.Moon) RTM.Moon.setActive(false);
      if (RTM.Meeting && !RTM.Meeting.isOpen()) RTM.Meeting.show();
      return;
    }
    if (phase === 'debrief') {
      gameplayHudVisible(false);
      setDisplay(els.meeting, false);
      if (RTM.Ship) RTM.Ship.setActive(false);
      if (RTM.Moon) RTM.Moon.setActive(false);
      return;
    }
    if (phase === 'roleReveal') {
      if (!revealActive) {
        var storedRole = (RTM.Net.getState().localRole === 'impostor' || RTM.Net.isImpostor()) ? 'impostor' : 'crewmate';
        showRoleReveal(storedRole);
      }
      return;
    }
    if (phase === 'playing') {
      setDisplay(els.meeting, false);
      if (RTM.Meeting && RTM.Meeting.isOpen()) RTM.Meeting.hide();
      if (ejectionVisible()) {
        gameplayHudVisible(false);
        if (RTM.Ship) RTM.Ship.setActive(false);
        if (RTM.Moon) RTM.Moon.setActive(false);
        return;
      }
      if (RTM.Cockpit && RTM.Cockpit.isOpen()) {
        if (RTM.Ship) RTM.Ship.setActive(false);
        if (RTM.Moon) RTM.Moon.setActive(false);
        return;
      }
      gameplayHudVisible(true);
      var moonLanded = gameState.scene === 'moon' && gameState.moon && gameState.moon.state === 'landed';
      if (moonLanded) {
        if (RTM.Ship) RTM.Ship.setActive(false);
        if (RTM.Moon) RTM.Moon.setActive(true);
      } else {
        if (RTM.Moon) RTM.Moon.setActive(false);
        if (RTM.Ship) RTM.Ship.setActive(true);
      }
    }
  }

  function onRoleAssigned(data) {
    showRoleReveal('crewmate');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    cache();
    if (RTM.Renderer && els.canvas) RTM.Renderer.init(els.canvas);
    if (RTM.HUD) RTM.HUD.init();
    if (RTM.Ship) RTM.Ship.init();
    if (RTM.Moon) RTM.Moon.init();
    if (RTM.Cockpit) RTM.Cockpit.init();
    if (RTM.Meeting) RTM.Meeting.init();
    if (RTM.Tasks) RTM.Tasks.init();
    if (RTM.Debrief) RTM.Debrief.init();
    if (RTM.Lobby) RTM.Lobby.init();
    if (RTM.Audio) RTM.Audio.init();
    if (RTM.NasaArchive) RTM.NasaArchive.init();

    if (RTM.Net) {
      RTM.Net.on('role:assigned', onRoleAssigned);
      RTM.Net.on('game:started', function () {
        if (RTM.Cockpit) RTM.Cockpit.hide();
        refreshGameplay();
      });
      RTM.Net.on('game:ended', function () {
        hideRoleReveal();
        if (RTM.Ship) RTM.Ship.setActive(false);
        if (RTM.Moon) RTM.Moon.setActive(false);
        if (RTM.Cockpit) RTM.Cockpit.hide();
        gameplayHudVisible(false);
        setDisplay(els.meeting, false);
        refreshGameplay();
      });
      RTM.Net.on('meeting:started', function () {
        if (RTM.Tasks) RTM.Tasks.close();
        refreshGameplay();
      });
      RTM.Net.on('meeting:ended', refreshGameplay);
      RTM.Net.on('room:created', refreshGameplay);
      RTM.Net.on('room:joined', refreshGameplay);
      RTM.Net.on('room:left', function () {
        hideRoleReveal();
        refreshGameplay();
      });
      RTM.Net.on('moon:state', function () {
        setTimeout(refreshGameplay, 0);
      });
      RTM.Net.on('player:killed', function (data) {
        if (data && data.playerId === RTM.Net.playerId) refreshGameplay();
      });
      RTM.Net.on('game:error', function (data) {
        if (RTM.HUD && data && data.message) RTM.HUD.showNotification(data.message, 'error');
      });
      RTM.Net.on('server:ready', function () {
        setTimeout(refreshGameplay, 0);
      });
      RTM.Net.on('pilot:seat:updated', function () {
        if (!revealActive) refreshGameplay();
      });
      RTM.Net.init();
    }
    refreshGameplay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    refreshGameplay: refreshGameplay,
    route: refreshGameplay,
    getRole: function () { return currentRole; },
    isRoleRevealActive: function () { return revealActive; }
  };
})();
