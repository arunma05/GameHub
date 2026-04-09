import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { rooms, handleCreateRoom, handleJoinRoom, broadcastActiveRooms, getActiveRooms, AugmentedSocket } from './roomHandlers';
import { handleStartGame, handleCallNumber, handleTypeProgress } from './gameHandlers';
import { handleChessMove, handleSixteenCoinsMove, handleSudokuWin, handleKakuroWin, handleSudokuLoad, handleSudokuSave, handleGridOrderWin, handleGridOrderScore, handleSixteenCoinsEndTurn, handleSixteenCoinsReady, handleJumpRaceMove, handleJumpRaceEndTurn } from './puzzleHandlers';
import { handleQuizAnswer, handleFlappyScore, handleMemoryWin } from './contestHandlers';
import { handleRegister, handleLogin, handleGuestLogin, handleGetCaptcha, handleUpdateTheme } from './authHandlers';
import { getLeaderboards, updatePlayerWin } from './leaderboard';
import { generateRoomCode } from './gameLogic';
import { Room } from './types';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

// Keep-alive/Health check endpoint
app.get('/ping', (_req, res) => {
  res.status(200).send('pong');
});

const CLIENT_DIST = fs.existsSync(path.join(process.cwd(), 'client/dist'))
  ? path.join(process.cwd(), 'client/dist')
  : path.join(process.cwd(), '../client/dist');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket: AugmentedSocket) => {
  console.log('Connected:', socket.id);

  socket.on('sudoku-load', (data, callback) => handleSudokuLoad(socket, data, callback));
  socket.on('sudoku-save', (data) => handleSudokuSave(socket, data));

  socket.on('get-leaderboards', async () => socket.emit('leaderboard-updated', await getLeaderboards()));
  socket.on('create-room', (data, callback) => handleCreateRoom(socket, io, data, callback));
  socket.on('join-room', (data, callback) => handleJoinRoom(socket, io, data, callback));
  socket.on('start-game', (data) => handleStartGame(socket, io, data));
  socket.on('call-number', (data) => handleCallNumber(socket, io, data));
  socket.on('type-progress', (data) => handleTypeProgress(socket, io, data));
  socket.on('chess-move', (data) => handleChessMove(socket, io, data));
  socket.on('sixteencoins-move', (data) => handleSixteenCoinsMove(socket, io, data));
  socket.on('sixteencoins-endturn', (data) => handleSixteenCoinsEndTurn(socket, io, data));
  socket.on('sixteencoins-ready', (data) => handleSixteenCoinsReady(socket, io, data));
  socket.on('quiz-answer', (data) => handleQuizAnswer(socket, io, data));
  socket.on('flappy-score', (data) => handleFlappyScore(socket, io, data));
  socket.on('memory-win', (data) => handleMemoryWin(socket, io, data));
  socket.on('sudoku-win', (data) => handleSudokuWin(socket, io, data));
  socket.on('kakuro-win', (data) => handleKakuroWin(socket, io, data));
  socket.on('gridorder-win', (data) => handleGridOrderWin(socket, io, data));
  socket.on('gridorder-score', (data) => handleGridOrderScore(socket, io, data));
  socket.on('jumprace-move', (data) => handleJumpRaceMove(socket, io, data));
  socket.on('jumprace-endturn', (data) => handleJumpRaceEndTurn(socket, io, data));
  socket.on('update-room-settings', (data) => {
    const { roomId, settings } = data;
    const room = rooms[roomId];
    if (room && room.hostId === socket.id && room.gameState === 'waiting') {
      room.gameData = { ...(room.gameData as any), ...settings };
      io.to(roomId).emit('room-updated', room);
    }
  });

  socket.on('update-score', async ({ game, username, score, time, level }) => {
    await updatePlayerWin(username, game, score, time, level);
    io.emit('leaderboard-updated', await getLeaderboards());
  });

  // Explicit room leave — called when a player exits mid-game via the back button
  socket.on('leave-room', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (room) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          // No players left — cancel any running timers and the delete room
          const { gameTimers } = require('./gameHandlers');
          if (gameTimers[roomId]) { clearTimeout(gameTimers[roomId]); delete gameTimers[roomId]; }
          delete rooms[roomId];
        } else {
          // Transfer host if needed and notify remaining players
          if (room.hostId === socket.id) room.hostId = room.players[0].id;
          io.to(roomId).emit('room-updated', room);
        }
      }
    }
    // Remove socket from the socket.io room — stops all future room events reaching this client
    socket.leave(roomId);
    broadcastActiveRooms(io);
  });

  // Auth Handlers
  socket.on('get-captcha', (callback) => callback(handleGetCaptcha(socket)));
  socket.on('register', (data, callback) => handleRegister(socket, data, callback));
  socket.on('login', (data, callback) => handleLogin(socket, data, callback));
  socket.on('guest-login', (callback) => handleGuestLogin(socket, callback));
  socket.on('update-theme', (theme) => handleUpdateTheme(socket, theme));

  socket.on('play-again', async (data: { roomId?: string } = {}) => {
    let roomId = data?.roomId?.toUpperCase();
    let room = (roomId && rooms[roomId]) ? rooms[roomId] : Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    if (!room || room.gameState !== 'finished') return;

    if (!room.readyPlayers) room.readyPlayers = [];
    if (!room.readyPlayers.includes(socket.id)) room.readyPlayers.push(socket.id);

    if (room.players.every(p => room.readyPlayers?.includes(p.id))) {
      await transitionToNewRoomLobby(room);
    } else {
      io.to(room.id).emit('room-updated', room);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;
      room.players.splice(idx, 1);
      if (room.players.length === 0) delete rooms[roomId];
      else {
        if (room.hostId === socket.id) room.hostId = room.players[0].id;
        io.to(roomId).emit('room-updated', room);
      }
    }
    broadcastActiveRooms(io);
  });

  // 1. Perform async initializations WITHOUT blocking the main event registration
  (async () => {
    try {
      const initialLeaderboards = await getLeaderboards();
      socket.emit('leaderboard-updated', initialLeaderboards);
    } catch (err) {
      console.error('Initial leaderboard fetch failed:', err);
    }
    socket.emit('active-rooms', getActiveRooms());
  })();
});

async function transitionToNewRoomLobby(room: Room) {
  let newRoomId = generateRoomCode();
  while (rooms[newRoomId]) newRoomId = generateRoomCode();

  // Reset game-specific data for new lobby, preserving settings
  let resetGameData = room.gameData;
  if (room.type === 'quiz' && room.gameData && typeof room.gameData === 'object') {
    const qd = room.gameData as any;
    resetGameData = {
      quizAmount: qd.quizAmount || 10,
      quizCategory: qd.quizCategory,
      quizDifficulty: qd.quizDifficulty,
      questions: [],
      currentQ: 0,
      scores: {},
      answers: {},
      showingResult: false,
      roundEnding: false,
    };
  }

  const newRoom: Room = {
    ...room,
    id: newRoomId,
    gameState: 'waiting',
    winners: [],
    winner: null,
    readyPlayers: [],
    calledNumbers: [],
    currentTurnIndex: 0,
    gameData: resetGameData,
    players: room.players.map(p => ({ ...p, card: null, completedLines: 0 }))
  };
  rooms[newRoomId] = newRoom;
  const socketsInRoom = await io.in(room.id).fetchSockets();
  // Notify everyone in the old room about the new state BEFORE moving them
  io.to(room.id).emit('room-updated', newRoom);
  for (const s of socketsInRoom) {
    s.leave(room.id);
    s.join(newRoomId);
  }
  delete rooms[room.id];
  broadcastActiveRooms(io);
}

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^.*$/, (req, res) => { if (!req.path.startsWith('/socket.io')) res.sendFile(path.join(CLIENT_DIST, 'index.html')); });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Fun Arcade on port ${PORT}`));
