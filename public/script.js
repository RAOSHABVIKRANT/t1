(() => {
  const lobby = document.getElementById('lobby');
  const shareScreen = document.getElementById('share');
  const gameScreen = document.getElementById('game');

  const createBtn = document.getElementById('createBtn');
  const joinForm = document.getElementById('joinForm');
  const roomInput = document.getElementById('roomInput');
  const lobbyStatus = document.getElementById('lobbyStatus');

  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const shareLink = document.getElementById('shareLink');
  const copyBtn = document.getElementById('copyBtn');
  const backFromShare = document.getElementById('backFromShare');

  const gameRoomCode = document.getElementById('gameRoomCode');
  const connStatus = document.getElementById('connStatus');
  const connText = document.getElementById('connText');
  const badgeX = document.getElementById('badgeX');
  const badgeO = document.getElementById('badgeO');
  const turnBanner = document.getElementById('turnBanner');
  const boardEl = document.getElementById('board');
  const cells = Array.from(document.querySelectorAll('.cell'));
  const winLineSvg = document.querySelector('.win-line');
  const scoreX = document.getElementById('scoreX');
  const scoreO = document.getElementById('scoreO');
  const scoreDraw = document.getElementById('scoreDraw');
  const restartBtn = document.getElementById('restartBtn');
  const leaveBtn = document.getElementById('leaveBtn');

  const overlay = document.getElementById('overlay');
  const overlayIcon = document.getElementById('overlayIcon');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySub = document.getElementById('overlaySub');
  const overlayRestart = document.getElementById('overlayRestart');

  const toastEl = document.getElementById('toast');

  let ws = null;
  let myRole = null;
  let myRoom = null;
  let pendingJoinCode = null;

  const CENTERS = [
    [50, 50], [150, 50], [250, 50],
    [50, 150], [150, 150], [250, 150],
    [50, 250], [150, 250], [250, 250],
  ];

  function showScreen(el) {
    [lobby, shareScreen, gameScreen].forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  function toast(msg, ms = 2600) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.add('hidden'), ms);
  }

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  function connect(onOpenCb) {
    ws = new WebSocket(wsUrl());
    ws.addEventListener('open', () => {
      connStatus.classList.remove('offline');
      connText.textContent = 'Connected';
      if (onOpenCb) onOpenCb();
    });
    ws.addEventListener('close', () => {
      connStatus.classList.add('offline');
      connText.textContent = 'Disconnected';
      toast('Connection lost. Trying to reconnect…');
      setTimeout(() => connect(() => {
        if (myRoom) ws.send(JSON.stringify({ type: 'join', room: myRoom }));
      }), 1500);
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      handleMessage(msg);
    });
  }

  function handleMessage(msg) {
    if (msg.type === 'joined') {
      myRole = msg.role;
      myRoom = msg.room;
      gameRoomCode.textContent = myRoom;
      roomCodeDisplay.textContent = myRoom;
      const url = `${location.origin}?room=${myRoom}`;
      shareLink.value = url;

      if (myRole === 'spectator') {
        toast("Room is full — you're spectating.");
        showScreen(gameScreen);
      } else if (myRole === 'X') {
        // Likely the host — wait on the share screen until state confirms an opponent.
        showScreen(shareScreen);
      } else {
        showScreen(gameScreen);
      }
      return;
    }

    if (msg.type === 'state') {
      renderState(msg);
      if (state_bothPresent(msg)) {
        showScreen(gameScreen);
      }
      return;
    }

    if (msg.type === 'gameOver') {
      renderBoard(msg.board);
      updateScores(msg.scores);
      if (msg.line) highlightLine(msg.line);
      showOverlay(msg.winner);
      return;
    }
  }

  function state_bothPresent(state) {
    return state.hasX && state.hasO;
  }

  function renderState(state) {
    renderBoard(state.board);
    updateScores(state.scores);
    clearLine();

    badgeX.classList.toggle('active', state.turn === 'X' && !state.gameOver);
    badgeO.classList.toggle('active', state.turn === 'O' && !state.gameOver);

    if (!state.hasX || !state.hasO) {
      turnBanner.textContent = 'Waiting for opponent to join…';
    } else if (myRole === 'spectator') {
      turnBanner.textContent = `${state.turn}'s turn`;
    } else if (state.turn === myRole) {
      turnBanner.textContent = 'Your turn';
    } else {
      turnBanner.textContent = "Opponent's turn";
    }

    const canPlay = myRole === state.turn && state.hasX && state.hasO && !state.gameOver;
    cells.forEach((cell, i) => {
      cell.disabled = !canPlay || !!state.board[i];
    });
  }

  function renderBoard(board) {
    board.forEach((val, i) => {
      const cell = cells[i];
      const had = cell.textContent;
      if (val && !had) {
        cell.textContent = val === 'X' ? '✕' : '◯';
        cell.classList.remove('x', 'o');
        cell.classList.add(val.toLowerCase(), 'pop');
        setTimeout(() => cell.classList.remove('pop'), 250);
      } else if (!val) {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'win');
      }
    });
  }

  function updateScores(scores) {
    scoreX.textContent = scores.X;
    scoreO.textContent = scores.O;
    scoreDraw.textContent = scores.draw;
  }

  function highlightLine(line) {
    line.forEach((i) => cells[i].classList.add('win'));
    const [a, , c] = line;
    const [x1, y1] = CENTERS[a];
    const [x2, y2] = CENTERS[c];
    winLineSvg.innerHTML = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }

  function clearLine() {
    winLineSvg.innerHTML = '';
    cells.forEach((c) => c.classList.remove('win'));
  }

  function showOverlay(winner) {
    cells.forEach((c) => (c.disabled = true));
    if (winner === 'draw') {
      overlayIcon.textContent = '🤝';
      overlayTitle.textContent = "It's a draw!";
      overlaySub.textContent = 'Well matched.';
    } else if (myRole === winner) {
      overlayIcon.textContent = '🎉';
      overlayTitle.textContent = 'You win!';
      overlaySub.textContent = 'Nice moves.';
    } else if (myRole === 'spectator') {
      overlayIcon.textContent = '🏁';
      overlayTitle.textContent = `${winner} wins!`;
      overlaySub.textContent = 'Good game.';
    } else {
      overlayIcon.textContent = '😅';
      overlayTitle.textContent = 'You lost!';
      overlaySub.textContent = "Rematch? You've got this.";
    }
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // ---- Cell clicks ----
  cells.forEach((cell) => {
    cell.addEventListener('click', () => {
      if (cell.disabled || !ws || ws.readyState !== WebSocket.OPEN) return;
      const idx = Number(cell.dataset.idx);
      ws.send(JSON.stringify({ type: 'move', index: idx }));
    });
  });

  function requestRestart() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'restart' }));
    }
    hideOverlay();
  }
  restartBtn.addEventListener('click', requestRestart);
  overlayRestart.addEventListener('click', requestRestart);

  leaveBtn.addEventListener('click', () => {
    if (ws) ws.close(1000, 'left');
    location.href = location.origin;
  });

  // ---- Lobby actions ----
  createBtn.addEventListener('click', () => {
    lobbyStatus.textContent = 'Creating room…';
    connect(() => {
      ws.send(JSON.stringify({ type: 'join', room: '' }));
    });
  });

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = roomInput.value.trim().toUpperCase();
    if (!code) return;
    lobbyStatus.textContent = 'Joining…';
    connect(() => {
      ws.send(JSON.stringify({ type: 'join', room: code }));
    });
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareLink.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    } catch {
      shareLink.select();
      document.execCommand('copy');
    }
  });

  backFromShare.addEventListener('click', () => {
    if (ws) ws.close();
    showScreen(lobby);
  });

  // Auto-join if ?room=CODE is in the URL
  const params = new URLSearchParams(location.search);
  const roomFromUrl = params.get('room');
  if (roomFromUrl) {
    roomInput.value = roomFromUrl.toUpperCase();
    lobbyStatus.textContent = `Joining room ${roomFromUrl.toUpperCase()}…`;
    connect(() => {
      ws.send(JSON.stringify({ type: 'join', room: roomFromUrl.toUpperCase() }));
    });
  }

})();
