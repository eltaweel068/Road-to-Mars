window.RTM = window.RTM || {};
window.RTM.Tasks = (function () {
  'use strict';

  var TASKS = {
    wires: { title: 'ELECTRICAL WIRING', eyebrow: 'ELECTRICAL', instruction: 'Match each colored wire to its correct socket.' },
    o2_filter: { title: 'O2 FILTER PURGE', eyebrow: 'LIFE SUPPORT', instruction: 'Rotate every valve to the marked direction.' },
    nav: { title: 'NAVIGATION ALIGNMENT', eyebrow: 'NAVIGATION', instruction: 'Match the flight computer heading.' },
    cargo: { title: 'CARGO SECUREMENT', eyebrow: 'STORAGE', instruction: 'Lock every cargo crate with a magnetic clamp.' },
    science: { title: 'SPECTROMETER SCAN', eyebrow: 'SCIENCE LAB', instruction: 'Repeat the sample sequence shown by the scanner.' }
  };

  var WIRE_COLORS = [
    { name: 'RED', value: '#c51111' },
    { name: 'BLUE', value: '#132ed1' },
    { name: 'YELLOW', value: '#f5f557' },
    { name: 'GREEN', value: '#117f2d' }
  ];

  var SAMPLE_LABELS = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA'];

  var TASK_REWARDS = {
    wires: '⚡ WIRES FIXED: +8% FUEL & POWER!',
    o2_filter: '🫧 O2 SCRUBBED: +12% OXYGEN!',
    nav: '🧭 NAV LOCKED: +3% MARS PROGRESS!',
    cargo: '⚖️ CARGO SECURED: -15 KG MASS!',
    science: '🔬 SCIENCE DATA: +25 RESEARCH!'
  };

  var els = {};
  var currentTask = null;
  var open = false;
  var completed = false;
  var closeTimer = null;
  var stateCleanup = null;

  function cache() {
    els.overlay = document.getElementById('taskOverlay');
    els.content = document.getElementById('taskContent');
    els.close = document.getElementById('taskClose');
  }

  function isTyping(event) {
    var target = event.target;
    if (!target) return false;
    var tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  }

  function openTask(taskId) {
    if (!TASKS[taskId] || !RTM.Net || !els.overlay || !els.content) return;
    var gameState = RTM.Net.getState();
    if (gameState.phase !== 'playing' || !RTM.Net.isAlive()) return;
    if (open) close();
    currentTask = taskId;
    completed = false;
    open = true;
    els.overlay.style.display = 'flex';
    document.body.classList.add('task-open');
    cleanupState();
    buildTask(taskId);
  }

  function close() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    cleanupState();
    open = false;
    currentTask = null;
    completed = false;
    if (els.overlay) els.overlay.style.display = 'none';
    if (els.content) els.content.innerHTML = '';
    document.body.classList.remove('task-open');
    if (RTM.Main && RTM.Main.refreshGameplay) RTM.Main.refreshGameplay();
  }

  function cleanupState() {
    if (typeof stateCleanup === 'function') {
      stateCleanup();
      stateCleanup = null;
    }
  }

  function shell(taskId) {
    var meta = TASKS[taskId];
    els.content.innerHTML = [
      '<div class="task-header">',
      '  <span class="task-eyebrow">' + meta.eyebrow + '</span>',
      '  <h3 class="task-title">' + meta.title + '</h3>',
      '</div>',
      '<p class="task-instruction">' + meta.instruction + '</p>',
      '<div class="task-stage"></div>',
      '<div class="task-feedback" id="taskFeedback"></div>'
    ].join('');
    return els.content.querySelector('.task-stage');
  }

  function feedback(message, type) {
    var element = document.getElementById('taskFeedback');
    if (!element) return;
    element.textContent = message;
    element.className = 'task-feedback' + (type ? ' task-feedback-' + type : '');
  }

  function finish() {
    if (completed || !currentTask) return;
    completed = true;
    feedback('TASK COMPLETE', 'success');
    RTM.Net.emit('task:complete', { taskId: currentTask });
    if (RTM.HUD && RTM.HUD.showNotification) {
      RTM.HUD.showNotification(TASK_REWARDS[currentTask] || 'TASK COMPLETE!', 'success', 'engineering');
    }
    closeTimer = setTimeout(function () {
      closeTimer = null;
      close();
    }, 850);
  }

  function button(label, className) {
    var element = document.createElement('button');
    element.className = 'au-btn ' + (className || '');
    element.textContent = label;
    return element;
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function buildWires(stage) {
    var leftOrder = [0, 1, 2, 3];
    var rightOrder = shuffle(leftOrder);
    var selected = null;
    var solved = 0;
    var board = document.createElement('div');
    board.className = 'wires-board';
    var leftColumn = document.createElement('div');
    leftColumn.className = 'wires-column';
    var rightColumn = document.createElement('div');
    rightColumn.className = 'wires-column';

    function wireNode(colorIndex, side) {
      var node = document.createElement('button');
      node.className = 'wire-node';
      node.type = 'button';
      node.style.setProperty('--wire-color', WIRE_COLORS[colorIndex].value);
      var circle = document.createElement('span');
      circle.className = 'wire-circle';
      circle.style.background = WIRE_COLORS[colorIndex].value;
      var label = document.createElement('span');
      label.className = 'wire-label';
      label.textContent = WIRE_COLORS[colorIndex].name;
      node.appendChild(circle);
      node.appendChild(label);
      node.setAttribute('data-color', String(colorIndex));
      node.setAttribute('data-side', side);
      return node;
    }

    leftOrder.forEach(function (colorIndex) {
      var node = wireNode(colorIndex, 'left');
      node.addEventListener('click', function () {
        if (node.disabled || completed) return;
        selected = colorIndex;
        var nodes = leftColumn.querySelectorAll('.wire-node');
        for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('wire-selected');
        node.classList.add('wire-selected');
        feedback('Now choose the matching socket on the right.', 'info');
      });
      leftColumn.appendChild(node);
    });

    rightOrder.forEach(function (colorIndex) {
      var node = wireNode(colorIndex, 'right');
      node.addEventListener('click', function () {
        if (node.disabled || completed) return;
        if (selected === null) {
          feedback('Choose a wire on the left first.', 'error');
          return;
        }
        if (selected === colorIndex) {
          var leftNode = leftColumn.querySelector('.wire-node[data-color="' + colorIndex + '"]');
          leftNode.disabled = true;
          node.disabled = true;
          leftNode.classList.add('wire-solved');
          node.classList.add('wire-solved');
          selected = null;
          solved++;
          feedback('Connection established. ' + solved + ' / 4', 'success');
          if (solved === 4) finish();
        } else {
          selected = null;
          feedback('Wrong socket. Try again.', 'error');
          var nodes = leftColumn.querySelectorAll('.wire-node');
          for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('wire-selected');
        }
      });
      rightColumn.appendChild(node);
    });

    board.appendChild(leftColumn);
    var center = document.createElement('div');
    center.className = 'wires-center';
    center.textContent = 'MATCH';
    board.appendChild(center);
    board.appendChild(rightColumn);
    stage.appendChild(board);
  }

  function buildO2(stage) {
    var valves = [];
    var board = document.createElement('div');
    board.className = 'valve-board';
    for (var i = 0; i < 4; i++) {
      (function (index) {
        var target = Math.floor(Math.random() * 4);
        var current = (target + 1 + Math.floor(Math.random() * 3)) % 4;
        var card = document.createElement('div');
        card.className = 'valve-card';
        var name = document.createElement('div');
        name.className = 'valve-name';
        name.textContent = 'FILTER ' + (index + 1);
        var targetMark = document.createElement('div');
        targetMark.className = 'valve-target';
        targetMark.textContent = 'TARGET ' + (target * 90) + '°';
        var valve = document.createElement('button');
        valve.className = 'valve-dial';
        valve.type = 'button';
        var arrow = document.createElement('span');
        arrow.className = 'valve-arrow';
        arrow.textContent = '↑';
        valve.appendChild(arrow);
        var valveState = { target: target, current: current, element: valve, card: card, arrow: arrow };
        valves.push(valveState);
        function render() {
          arrow.style.transform = 'rotate(' + (valveState.current * 90) + 'deg)';
          card.classList.toggle('valve-aligned', valveState.current === valveState.target);
        }
        valve.addEventListener('click', function () {
          if (completed) return;
          valveState.current = (valveState.current + 1) % 4;
          render();
          var aligned = valves.filter(function (entry) { return entry.current === entry.target; }).length;
          feedback('Filters aligned: ' + aligned + ' / 4', aligned === 4 ? 'success' : 'info');
          if (aligned === 4) finish();
        });
        render();
        card.appendChild(name);
        card.appendChild(targetMark);
        card.appendChild(valve);
        board.appendChild(card);
      })(i);
    }
    stage.appendChild(board);
  }

  function buildNav(stage) {
    var target = Math.round(-160 + Math.random() * 320);
    var panel = document.createElement('div');
    panel.className = 'nav-panel';
    var targetRow = document.createElement('div');
    targetRow.className = 'nav-target';
    targetRow.innerHTML = '<span>REQUIRED HEADING</span><strong>' + target + '°</strong>';
    var current = document.createElement('div');
    current.className = 'nav-current';
    var readout = document.createElement('strong');
    readout.textContent = '0°';
    current.appendChild(document.createTextNode('CURRENT '));
    current.appendChild(readout);
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-180';
    slider.max = '180';
    slider.value = '0';
    slider.className = 'au-slider nav-slider';
    var confirm = button('ENGAGE', 'au-btn-blue');
    slider.addEventListener('input', function () {
      if (completed) return;
      readout.textContent = slider.value + '°';
      var difference = Math.abs(Number(slider.value) - target);
      feedback(Math.abs(difference) <= 4 ? 'Alignment lock acquired. Engage.' : 'Correction needed: ' + Math.round(difference) + '°', Math.abs(difference) <= 4 ? 'success' : 'info');
    });
    confirm.addEventListener('click', function () {
      if (completed) return;
      var difference = Math.abs(Number(slider.value) - target);
      if (difference <= 4) finish();
      else feedback('Heading outside tolerance by ' + Math.round(difference) + '°.', 'error');
    });
    panel.appendChild(targetRow);
    panel.appendChild(current);
    panel.appendChild(slider);
    panel.appendChild(confirm);
    stage.appendChild(panel);
  }

  function buildCargo(stage) {
    var board = document.createElement('div');
    board.className = 'cargo-board';
    var secured = 0;
    for (var i = 0; i < 5; i++) {
      (function (index) {
        var crate = document.createElement('button');
        crate.className = 'cargo-crate';
        crate.type = 'button';
        var number = document.createElement('span');
        number.className = 'cargo-number';
        number.textContent = String(index + 1);
        var clamp = document.createElement('span');
        clamp.className = 'cargo-clamp';
        clamp.textContent = 'CLAMP';
        crate.appendChild(number);
        crate.appendChild(clamp);
        crate.addEventListener('click', function () {
          if (completed || crate.classList.contains('cargo-secured')) return;
          crate.classList.add('cargo-secured');
          clamp.textContent = 'LOCKED';
          secured++;
          feedback('Cargo clamps locked: ' + secured + ' / 5', secured === 5 ? 'success' : 'info');
          if (secured === 5) finish();
        });
        board.appendChild(crate);
      })(i);
    }
    stage.appendChild(board);
  }

  function buildScience(stage) {
    var sequence = shuffle([0, 1, 2, 3]).slice(0, 4);
    var progress = 0;
    var panel = document.createElement('div');
    panel.className = 'science-panel';
    var sequenceRow = document.createElement('div');
    sequenceRow.className = 'science-sequence';
    sequence.forEach(function (index) {
      var sample = document.createElement('span');
      sample.className = 'science-code';
      sample.textContent = SAMPLE_LABELS[index].charAt(0);
      sequenceRow.appendChild(sample);
    });
    var instruction = document.createElement('div');
    instruction.className = 'science-progress';
    instruction.textContent = 'SEQUENCE 0 / 4';
    var buttonRow = document.createElement('div');
    buttonRow.className = 'science-buttons';
    [0, 1, 2, 3, 4].forEach(function (index) {
      var sample = button(SAMPLE_LABELS[index], 'au-btn-gray science-sample');
      sample.addEventListener('click', function () {
        if (completed) return;
        if (index === sequence[progress]) {
          progress++;
          instruction.textContent = 'SEQUENCE ' + progress + ' / 4';
          feedback('Sample accepted.', 'success');
          if (progress === 4) finish();
        } else {
          progress = 0;
          instruction.textContent = 'SEQUENCE 0 / 4';
          feedback('Incorrect sample. Sequence reset.', 'error');
        }
      });
      buttonRow.appendChild(sample);
    });
    panel.appendChild(sequenceRow);
    panel.appendChild(instruction);
    panel.appendChild(buttonRow);
    stage.appendChild(panel);
  }

  function buildTask(taskId) {
    var stage = shell(taskId);
    if (taskId === 'wires') buildWires(stage);
    else if (taskId === 'o2_filter') buildO2(stage);
    else if (taskId === 'nav') buildNav(stage);
    else if (taskId === 'cargo') buildCargo(stage);
    else if (taskId === 'science') buildScience(stage);
  }

  function onKeyDown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function init() {
    cache();
    if (els.close) els.close.addEventListener('click', close);
    window.addEventListener('keydown', onKeyDown);
    if (RTM.Net) {
      RTM.Net.on('meeting:started', close);
      RTM.Net.on('game:ended', close);
      RTM.Net.on('room:left', close);
      RTM.Net.on('player:killed', function (data) {
        if (data && data.playerId === RTM.Net.playerId) close();
      });
    }
  }

  return {
    init: init,
    open: openTask,
    close: close,
    isOpen: function () { return open; },
    currentTask: function () { return currentTask; }
  };
})();
