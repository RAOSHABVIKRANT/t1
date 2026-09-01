const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// ---- Game room management ----
// rooms: Map<roomCode, { players: {X: ws|null, O: ws|null}, board: string[9], turn: 'X'|'O', scores: {X,O,draw}, spectators: Set<ws> }>
const rooms = new Map();

function freshBoard() {
  return Array(9).fill(null);
}

function createRoom(code) {
  const room = {
    code,
    players: { X: null, O: null },
    board: freshBoard(),
    turn: 'X',
    scores: { X: 0, O: 0, draw: 0 },
    spectators: new Set(),
    gameOver: false,
  };
  rooms.set(code, room);
  return room;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((c) => c)) return { winner: 'draw', line: null };
  return null;
}

function broadcastRoom(room) {
  const state = {
    type: 'state',
    board: room.board,
    turn: room.turn,
    scores: room.scores,
    gameOver: room.gameOver,
    hasX: !!room.players.X,
    hasO: !!room.players.O,
    spectators: room.spectators.size,
  };
  const payload = JSON.stringify(state);
  [room.players.X, room.players.O, ...room.spectators].forEach((client) => {
    if (client && client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      let code = (msg.room || '').trim().toUpperCase();
      let room;
      if (!code) {
        code = genCode();
        room = createRoom(code);
      } else {
        room = rooms.get(code) || createRoom(code);
      }

      let role = 'spectator';
      if (!room.players.X) {
        room.players.X = ws;
        role = 'X';
      } else if (!room.players.O) {
        room.players.O = ws;
        role = 'O';
      } else {
        room.spectators.add(ws);
      }

      ws.roomCode = code;
      ws.role = role;

      send(ws, { type: 'joined', room: code, role });
      broadcastRoom(room);
      return;
    }

    const room = rooms.get(ws.roomCode);
    if (!room) return;

    if (msg.type === 'move') {
      if (room.gameOver) return;
      if (ws.role !== room.turn) return;
      const idx = msg.index;
      if (typeof idx !== 'number' || idx < 0 || idx > 8) return;
      if (room.board[idx]) return;

      room.board[idx] = ws.role;
      const result = checkWinner(room.board);
      if (result) {
        room.gameOver = true;
        if (result.winner === 'draw') {
          room.scores.draw++;
        } else {
          room.scores[result.winner]++;
        }
        const payload = {
          type: 'gameOver',
          board: room.board,
          winner: result.winner,
          line: result.line,
          scores: room.scores,
        };
        [room.players.X, room.players.O, ...room.spectators].forEach((c) => send(c, payload));
      } else {
        room.turn = room.turn === 'X' ? 'O' : 'X';
        broadcastRoom(room);
      }
      return;
    }

    if (msg.type === 'restart') {
      room.board = freshBoard();
      room.turn = 'X';
      room.gameOver = false;
      broadcastRoom(room);
      return;
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    if (room.players.X === ws) room.players.X = null;
    else if (room.players.O === ws) room.players.O = null;
    else room.spectators.delete(ws);

    const stillOccupied = room.players.X || room.players.O || room.spectators.size;
    if (!stillOccupied) {
      rooms.delete(room.code);
    } else {
      broadcastRoom(room);
    }
  });
});

function getLocalIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log('\n🎮 Tic Tac Toe server running!\n');
  console.log(`   Local:   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`   Network: http://${ip}:${PORT}`));
  console.log('\nShare the "Network" link with the other player on your Wi-Fi/LAN.\n');
});
