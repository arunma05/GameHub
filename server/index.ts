import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { generateCard, countCompletedLines } from './utils';
import { RACER_SENTENCES, getRandomSentence } from './sentences';

const app = express();
app.use(cors());

const DB_PATH = path.join(process.cwd(), 'server/db.json');
const CLIENT_DIST = path.join(process.cwd(), 'client/dist');

// Initialize DB if doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ bingo: {}, typeracer: {}, chess: {}, flappy: {}, quiz: {}, cssbattle: [], sudoku: {}, sudokuSaves: {}, sixteencoins: {} }));
}

function getLeaderboards(): { bingo: Record<string, number>; typeracer: Record<string, number>; chess: Record<string, number>; quiz: Record<string, number>; sudoku: Record<string, number>; sixteencoins: Record<string, number>; flappy: { name: string; score: number }[]; cssbattle: { name: string; score: number; time: number }[] } {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    // Safety: ensure arrays
    let flappy = Array.isArray(db.flappy) ? db.flappy : [];
    let cssbattle = Array.isArray(db.cssbattle) ? db.cssbattle : [];

    return { 
      bingo: db.bingo || {}, 
      typeracer: db.typeracer || {},
      chess: db.chess || {},
      quiz: db.quiz || {},
      sudoku: db.sudoku || {},
      sixteencoins: db.sixteencoins || {},
      flappy: flappy,
      cssbattle: cssbattle
    };
  } catch (e) {
    return { bingo: {}, typeracer: {}, chess: {}, quiz: {}, sudoku: {}, sixteencoins: {}, flappy: [], cssbattle: [] };
  }
}

function updatePlayerWin(name: string, type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins', score?: number, time?: number) {
  const db = getLeaderboards();
  if (type === 'flappy' && score !== undefined) {
    db.flappy.push({ name, score });
    db.flappy.sort((a, b) => b.score - a.score);
    if (db.flappy.length > 100) db.flappy = db.flappy.slice(0, 100);
  } else if (type === 'cssbattle' && score !== undefined && time !== undefined) {
    db.cssbattle.push({ name, score, time });
    db.cssbattle.sort((a, b) => b.score === a.score ? a.time - b.time : b.score - a.score);
    if (db.cssbattle.length > 100) db.cssbattle = db.cssbattle.slice(0, 100);
  } else if (type !== 'flappy' && type !== 'cssbattle') {
    const game = db[type] as Record<string, number>;
    game[name] = (game[name] || 0) + 1;
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

interface Player {
  id: string;
  name: string;
  card: number[] | null; // 25 numbers (1-25) in grid order
  completedLines: number;
  wpm?: number;
}

interface Room {
  id: string;
  type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins';
  hostId: string;
  players: Player[];
  gameState: 'waiting' | 'starting' | 'playing' | 'finished';
  isPublic: boolean;
  calledNumbers: number[];       // for bingo
  currentTurnIndex: number;      // for bingo
  winner: Player | null; // Primary winner (the one who called or first in list)
  winners: Player[];   // All players who completed 5 lines this turn
  gameData?: any;      // typed text for racer
  startTime?: number;  // for WPM calculation
  readyPlayers?: string[]; // players who voted for play again
}

const rooms: Record<string, Room> = {};
const gameTimers: Record<string, NodeJS.Timeout> = {};

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getActiveRooms() {
  return Object.values(rooms)
    .filter(r => {
      if (r.gameState !== 'waiting' || !r.isPublic) return false;
      // Hide full chess and single-player rooms, or full 2-player strategy rooms
      if ((r.type === 'chess' || r.type === 'sixteencoins') && r.players.length >= 2) return false;
      return true;
    })
    .map(r => ({
      id: r.id,
      type: r.type,
      playerCount: r.players.length,
      hostName: r.players.find(p => p.id === r.hostId)?.name || 'Unknown',
      status: 'Open'
    }));
}

function broadcastActiveRooms() {
  io.emit('active-rooms', getActiveRooms());
}

io.on('connection', (socket: Socket) => {
  console.log('Connected:', socket.id);
  socket.emit('leaderboard-updated', getLeaderboards());
  socket.emit('active-rooms', getActiveRooms());

  /* ─── CREATE ROOM ─── */
  socket.on('create-room', ({ playerName, type, isPublic, quizAmount }: { playerName: string; type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins', isPublic?: boolean, quizAmount?: number }, callback: Function) => {
    let roomId = generateRoomCode();
    while (rooms[roomId]) roomId = generateRoomCode();

    const player: Player = { id: socket.id, name: playerName, card: type === 'bingo' ? generateCard() : null, completedLines: 0 };
    
    // Store name on socket for flappy score tracking
    (socket as any).playerName = playerName;

    rooms[roomId] = {
      id: roomId,
      type: type || 'bingo',
      hostId: socket.id,
      players: [player],
      gameState: 'waiting',
      isPublic: isPublic ?? true, 
      calledNumbers: [],
      currentTurnIndex: 0,
      winner: null,
      winners: [],
      gameData: type === 'typeracer' ? getRandomSentence() : 
                (type === 'chess' ? { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turnIndex: 0 } : 
                (type === 'quiz' ? { quizAmount: quizAmount || 10 } : 
                (type === 'sixteencoins' ? { coins: {}, readyCount: 0 } : null))),
      readyPlayers: [],
    };

    socket.join(roomId);
    callback({ success: true, roomId, player });
    io.to(roomId).emit('room-updated', rooms[roomId]);
    broadcastActiveRooms();
  });

  /* ─── JOIN ROOM ─── */
  socket.on('join-room', ({ roomId: raw, playerName }: { roomId: string; playerName: string }, callback: Function) => {
    const roomId = raw.toUpperCase();
    const room = rooms[roomId];

    if (!room) return callback({ success: false, message: 'Room not found' });
    if (room.gameState !== 'waiting') return callback({ success: false, message: 'Game already in progress' });

    // Chess and Sixteen Coins are strictly 1v1
    if ((room.type === 'chess' || room.type === 'sixteencoins') && room.players.length >= 2) {
      return callback({ success: false, message: 'Room is full' });
    }
    const nameExists = room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (nameExists) return callback({ success: false, message: 'Player name already taken in this room' });

    const player: Player = { id: socket.id, name: playerName, card: null, completedLines: 0 };
    (socket as any).playerName = playerName; // Store name for flappy score
    room.players.push(player);
    socket.join(roomId);

    callback({ success: true, roomId, player });
    io.to(roomId).emit('room-updated', room);
    broadcastActiveRooms();
  });

  /* ─── START GAME ─── */
  socket.on('start-game', ({ roomId }: { roomId: string }) => {
    console.log('Starting game in room:', roomId);
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id || room.gameState !== 'waiting') return;
    
    // Single player games can start with 1 player
    const minPlayers = room.type === 'flappy' ? 1 : 2;
    if (room.players.length < minPlayers) return;

    if (room.type === 'typeracer') {
      room.gameState = 'starting';
      room.gameData = getRandomSentence();
      room.players.forEach(p => { p.completedLines = 0; p.wpm = 0; });
      io.to(roomId).emit('game-started', room); 
      broadcastActiveRooms();

      setTimeout(() => {
        const r = rooms[roomId];
        if (r && r.gameState === 'starting') {
          r.gameState = 'playing';
          r.startTime = Date.now();
          io.to(roomId).emit('room-updated', r);
          broadcastActiveRooms();
        }
      }, 3500); 
    } else if (room.type === 'chess') {
      room.players.forEach(p => p.completedLines = 0);
      room.gameState = 'playing';
      room.gameData = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turnIndex: 0 };
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    } else if (room.type === 'quiz') {
      room.gameState = 'starting';
      io.to(roomId).emit('room-updated', room);
      broadcastActiveRooms();
      
      const fetchQuestions = () => {
        const amount = room.gameData?.quizAmount || 10;
        https.get(`https://opentdb.com/api.php?amount=${amount}&category=18&type=multiple`, (resp: any) => {
          let data = '';
          resp.on('data', (chunk: any) => data += chunk);
          resp.on('end', () => {
            const parsed = JSON.parse(data);
            if (parsed.response_code === 0 && parsed.results) {
              const questions = parsed.results.map((q: any) => {
                // Randomize options
                const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
                return { ...q, options };
              });
              
              room.gameData = {
                questions,
                currentQ: 0,
                answers: {}, // id -> option
                scores: {}, // id -> score
                showingResult: false
              };
              room.players.forEach(p => room.gameData!.scores[p.id] = 0);
              room.gameState = 'playing';
              room.gameData.qStartTime = Date.now();
              io.to(roomId).emit('game-started', room);
              broadcastActiveRooms();

              const startRoundTimer = () => {
                gameTimers[roomId] = setTimeout(() => {
                  handleRoundEnd(roomId);
                }, 15000);
              };
              startRoundTimer();
            }
          });
        }).on('error', (err: any) => console.log('API Error: ' + err.message));
      };
      
      fetchQuestions();
    } else if (room.type === 'sixteencoins') {
      room.gameState = 'playing';
      room.currentTurnIndex = 0; // P1 starts
      
      const initialCoins: Record<string, string> = {};
      const Q1 = [[2,0],[1,1],[3,1],[0,2],[2,2],[4,2],[1,3],[3,3],[2,4]];
      const Q2 = [[6,0],[5,1],[7,1],[4,2],[6,2],[8,2],[5,3],[7,3],[6,4]];
      const Q3 = [[2,8],[1,7],[3,7],[0,6],[2,6],[4,6],[1,5],[3,5],[2,4]];
      const Q4 = [[6,8],[5,7],[7,7],[4,6],[6,6],[8,6],[5,5],[7,5],[6,4]];
      
      const p1Nodes = [...Q1, ...Q2].filter(n => n[1] <= 3 || (n[0] === 2 && n[1] === 4));
      const p2Nodes = [...Q3, ...Q4].filter(n => n[1] >= 5 || (n[0] === 6 && n[1] === 4));

      p1Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[0].id; });
      p2Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[1].id; });
      
      room.gameData = { coins: initialCoins, readyCount: 2 };
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    } else {
      room.players.forEach(p => { 
        p.card = generateCard(); 
        p.completedLines = 0;
      });
      room.gameState = 'playing';
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    }
  });

  function handleRoundEnd(roomId: string) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'quiz') return;
    
    // If timer was active, clear it
    if (gameTimers[roomId]) {
        clearTimeout(gameTimers[roomId]);
        delete gameTimers[roomId];
    }
    
    // Evaluate scores
    const q = room.gameData.questions[room.gameData.currentQ];
    for (const p of room.players) {
      if (room.gameData.answers[p.id] === q.correct_answer) {
         room.gameData.scores[p.id] += 10;
      }
    }
    
    room.gameData.showingResult = true;
    io.to(roomId).emit('room-updated', room);
    
    // Wait 4 seconds, then next question or end
    setTimeout(() => {
      const r = rooms[roomId];
      if (!r || r.gameState !== 'playing') return;
      
      r.gameData.currentQ++;
      r.gameData.answers = {};
      r.gameData.showingResult = false;
      
      if (r.gameData.currentQ >= r.gameData.questions.length) {
         // Game Over
         r.gameState = 'finished';
         let max = -1;
         for (const p of r.players) {
            if (r.gameData.scores[p.id] > max) max = r.gameData.scores[p.id];
         }
         const winners = r.players.filter(p => r.gameData.scores[p.id] === max);
         r.winners = winners;
         r.winner = winners[0];
         winners.forEach(w => updatePlayerWin(w.name, 'quiz'));
         io.to(roomId).emit('game-over', { winner: r.winner, room: r });
         io.emit('leaderboard-updated', getLeaderboards());
         broadcastActiveRooms();
      } else {
         r.gameData.qStartTime = Date.now();
         io.to(roomId).emit('room-updated', r);
         gameTimers[roomId] = setTimeout(() => handleRoundEnd(roomId), 15000);
      }
    }, 4000);
  }

  /* ─── QUIZ: ANSWER ─── */
  socket.on('quiz-answer', ({ roomId, answer }: { roomId: string, answer: string }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'quiz' || room.gameData?.showingResult) return;
    
    // Only 1 answer per question
    if (room.gameData.answers[socket.id]) return;
    
    room.gameData.answers[socket.id] = answer;
    io.to(roomId).emit('room-updated', room);
    
    // If everyone answered, end round instantly
    if (Object.keys(room.gameData.answers).length >= room.players.length) {
       handleRoundEnd(roomId);
    }
  });

  const startGameReset = (room: Room) => {
    room.winner = null;
    room.winners = [];
    room.calledNumbers = [];
    room.currentTurnIndex = 0;
    room.readyPlayers = [];

    const roomId = room.id;

    if (room.type === 'typeracer') {
      room.gameState = 'starting';
      room.gameData = getRandomSentence();
      room.players.forEach(p => { p.completedLines = 0; p.wpm = 0; });
      io.to(roomId).emit('game-started', room); 
      broadcastActiveRooms();

      setTimeout(() => {
        const r = rooms[roomId];
        if (r && r.gameState === 'starting') {
          r.gameState = 'playing';
          r.startTime = Date.now();
          io.to(roomId).emit('room-updated', r);
          broadcastActiveRooms();
        }
      }, 3500); 
    } else if (room.type === 'chess') {
      room.players.forEach(p => p.completedLines = 0);
      room.gameState = 'playing';
      room.gameData = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turnIndex: 0 };
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    } else if (room.type === 'quiz') {
      room.gameState = 'starting';
      io.to(roomId).emit('room-updated', room);
      broadcastActiveRooms();
      
      const fetchQuestions = () => {
        const amount = room.gameData?.quizAmount || 10;
        https.get(`https://opentdb.com/api.php?amount=${amount}&category=18&type=multiple`, (resp: any) => {
          let data = '';
          resp.on('data', (chunk: any) => data += chunk);
          resp.on('end', () => {
            const parsed = JSON.parse(data);
            if (parsed.response_code === 0 && parsed.results) {
              const questions = parsed.results.map((q: any) => {
                const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
                return { ...q, options };
              });
              
              room.gameData = {
                questions,
                currentQ: 0,
                answers: {},
                scores: {},
                showingResult: false
              };
              room.players.forEach(p => room.gameData!.scores[p.id] = 0);
              room.gameState = 'playing';
              room.gameData.qStartTime = Date.now();
              io.to(roomId).emit('game-started', room);
              broadcastActiveRooms();

              const startRoundTimer = () => {
                gameTimers[roomId] = setTimeout(() => {
                  handleRoundEnd(roomId);
                }, 15000);
              };
              startRoundTimer();
            }
          });
        }).on('error', (err: any) => console.log('API Error: ' + err.message));
      };
      
      fetchQuestions();
    } else if (room.type === 'sixteencoins') {
      room.gameState = 'playing';
      room.currentTurnIndex = 0; // P1 starts
      
      const initialCoins: Record<string, string> = {};
      const Q1 = [[2,0],[1,1],[3,1],[0,2],[2,2],[4,2],[1,3],[3,3],[2,4]];
      const Q2 = [[6,0],[5,1],[7,1],[4,2],[6,2],[8,2],[5,3],[7,3],[6,4]];
      const Q3 = [[2,8],[1,7],[3,7],[0,6],[2,6],[4,6],[1,5],[3,5],[2,4]];
      const Q4 = [[6,8],[5,7],[7,7],[4,6],[6,6],[8,6],[5,5],[7,5],[6,4]];
      
      const p1Nodes = [...Q1, ...Q2].filter(n => n[1] <= 3 || (n[0] === 2 && n[1] === 4));
      const p2Nodes = [...Q3, ...Q4].filter(n => n[1] >= 5 || (n[0] === 6 && n[1] === 4));

      p1Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[0].id; });
      p2Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[1].id; });
      
      room.gameData = { coins: initialCoins, readyCount: 2 };
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    } else {
      room.players.forEach(p => { 
        p.card = generateCard(); 
        p.completedLines = 0;
      });
      room.gameState = 'playing';
      io.to(roomId).emit('game-started', room);
      broadcastActiveRooms();
    }
  };

  async function transitionToNewRoomLobby(room: Room) {
    let newRoomId = generateRoomCode();
    while (rooms[newRoomId]) newRoomId = generateRoomCode();

    const newRoom: Room = {
      id: newRoomId,
      type: room.type,
      hostId: room.hostId,
      players: room.players.map(p => ({ ...p, card: null, completedLines: 0, wpm: 0 })),
      gameState: 'waiting',
      isPublic: room.isPublic,
      calledNumbers: [],
      currentTurnIndex: 0,
      winner: null,
      winners: [],
      gameData: room.type === 'typeracer' ? getRandomSentence() : 
                (room.type === 'chess' ? { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turnIndex: 0 } : 
                (room.type === 'quiz' ? { quizAmount: room.gameData?.quizAmount || 10 } : 
                (room.type === 'sixteencoins' ? { coins: {}, readyCount: 0 } : null))),
      readyPlayers: [],
    };

    rooms[newRoomId] = newRoom;

    const socketsInRoom = await io.in(room.id).fetchSockets();
    for (const s of socketsInRoom) {
      s.leave(room.id);
      s.join(newRoomId);
    }

    delete rooms[room.id];

    io.to(newRoomId).emit('room-updated', newRoom);
    broadcastActiveRooms();
  }

  /* ─── RESET ROOM / PLAY AGAIN ─── */
  socket.on('play-again', async (data: { roomId?: string } = {}) => {
    let roomId = data?.roomId?.toUpperCase();
    let room = (roomId && rooms[roomId]) ? rooms[roomId] : Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    if (!room || room.gameState !== 'finished') return;

    if (!room.readyPlayers) room.readyPlayers = [];
    if (!room.readyPlayers.includes(socket.id)) {
      room.readyPlayers.push(socket.id);
    }
    
    // Auto-restart if all players are ready
    const allReady = room.players.every(p => room.readyPlayers?.includes(p.id));
    if (allReady) {
      await transitionToNewRoomLobby(room);
    } else {
      io.to(room.id).emit('room-updated', room);
    }
  });

  socket.on('reset-room', async (data: { roomId?: string } = {}) => {
    let roomId = data?.roomId?.toUpperCase();
    let room = (roomId && rooms[roomId]) ? rooms[roomId] : Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
    if (!room || room.hostId !== socket.id) return;
    await transitionToNewRoomLobby(room);
  });

  /* ─── CALL NUMBER (turn-based) ─── */
  socket.on('call-number', ({ roomId, number }: { roomId: string; number: number }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer.id !== socket.id) return;

    if (number < 1 || number > 25) return;
    if (room.calledNumbers.includes(number)) return;

    room.calledNumbers.push(number);
    const calledSet = new Set<number>(room.calledNumbers);

    const winners: Player[] = [];
    for (const player of room.players) {
      if (player.card) {
        player.completedLines = countCompletedLines(player.card, calledSet);
        if (player.completedLines >= 5) {
          winners.push(player);
        }
      }
    }

    if (winners.length > 0) {
      const clickerWinner = winners.find(w => w.id === socket.id);
      const finalWinners = clickerWinner ? [clickerWinner] : winners;
      const primaryWinner = finalWinners[0];

      finalWinners.forEach(w => updatePlayerWin(w.name, 'bingo'));
      const latestLeaderboard = getLeaderboards();

      room.gameState = 'finished';
      room.winner = primaryWinner;
      room.winners = finalWinners;
      
      io.to(roomId).emit('game-over', { winner: primaryWinner, room });
      io.emit('leaderboard-updated', latestLeaderboard); 
      broadcastActiveRooms();
      return;
    }

    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    io.to(roomId).emit('number-called', { number, room });
  });

  /* ─── TYPE RACER: PROGRESS ─── */
  socket.on('type-progress', ({ roomId, charsTyped }: { roomId: string; charsTyped: number }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'typeracer' || !room.startTime) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.completedLines = charsTyped;
    
    // Live WPM Calc
    const elapsedMinutes = (Date.now() - room.startTime) / 60000;
    if (elapsedMinutes > 0) {
      player.wpm = Math.round((charsTyped / 5) / elapsedMinutes);
    }

    const targetLength = (room.gameData || "").length;
    if (charsTyped >= targetLength) {
      room.gameState = 'finished';
      room.winner = player;
      
      // Calculate final WPM accurately
      const finalMinutes = (Date.now() - room.startTime) / 60000;
      player.wpm = Math.round((targetLength / 5) / finalMinutes);
      
      // Calculate WPM for everyone else who is still typing
      room.players.forEach(p => {
        if (p.id !== player.id && p.wpm === 0) {
           const mins = (Date.now() - (room.startTime || Date.now())) / 60000;
           p.wpm = Math.round((p.completedLines / 5) / (mins || 1));
        }
      });

      room.winners = [player];

      updatePlayerWin(player.name, 'typeracer');
      io.to(roomId).emit('game-over', { winner: player, room });
      io.emit('leaderboard-updated', getLeaderboards());
      broadcastActiveRooms();
    } else {
      io.to(roomId).emit('room-updated', room);
    }
  });

  /* ─── CHESS: MOVE ─── */
  socket.on('chess-move', ({ roomId, move }: { roomId: string; move: { fen: string, isGameOver: boolean, winnerId?: string | null } }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'chess') return;

    room.gameData.fen = move.fen;
    room.gameData.turnIndex = room.gameData.turnIndex === 0 ? 1 : 0;

    if (move.isGameOver) {
      room.gameState = 'finished';
      const winner = room.players.find(p => p.id === move.winnerId) || null;
      room.winner = winner;
      if (winner) {
        room.winners = [winner];
        updatePlayerWin(winner.name, 'chess');
      } else {
        room.winners = []; // Draw
      }
      io.to(roomId).emit('game-over', { winner: room.winner, room });
      io.emit('leaderboard-updated', getLeaderboards());
      broadcastActiveRooms();
    } else {
      io.to(roomId).emit('room-updated', room);
    }
  });

  /* ─── SIXTEEN COINS: MULTIPLAYER SYNC ─── */
  socket.on('sixteencoins-ready', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (!room || room.type !== 'sixteencoins') return;
    room.gameData.readyCount = (room.gameData.readyCount || 0) + 1;
    
    // Start game when 2 players are ready
    if (room.gameData.readyCount === 2 && room.players.length === 2) {
      if (room.gameState === 'waiting' || (room.gameState === 'playing' && Object.keys(room.gameData.coins || {}).length === 0)) {
        room.gameState = 'playing';
        room.currentTurnIndex = 0; // P1 (Host) starts
        
        // Initialize board for 2 players (16 coins each)
        const initialCoins: Record<string, string> = {};
        const Q1 = [[2,0],[1,1],[3,1],[0,2],[2,2],[4,2],[1,3],[3,3],[2,4]];
        const Q2 = [[6,0],[5,1],[7,1],[4,2],[6,2],[8,2],[5,3],[7,3],[6,4]];
        const Q3 = [[2,8],[1,7],[3,7],[0,6],[2,6],[4,6],[1,5],[3,5],[2,4]];
        const Q4 = [[6,8],[5,7],[7,7],[4,6],[6,6],[8,6],[5,5],[7,5],[6,4]];
        
        // All nodes in y <= 3 and the point (2,4) belong to Player 1
        const p1Nodes = [...Q1, ...Q2].filter(n => n[1] <= 3 || (n[0] === 2 && n[1] === 4));
        // All nodes in y >= 5 and the point (6,4) belong to Player 2
        const p2Nodes = [...Q3, ...Q4].filter(n => n[1] >= 5 || (n[0] === 6 && n[1] === 4));

        p1Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[0].id; });
        p2Nodes.forEach(([x,y]) => { initialCoins[`${x},${y}`] = room.players[1].id; });
        
        room.gameData.coins = initialCoins;
        io.to(roomId).emit('game-started', room);
        broadcastActiveRooms();
      }
    }
  });

  socket.on('sixteencoins-move', ({ roomId, coins }: { roomId: string, coins: Record<string, string> }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'sixteencoins') return;
    
    room.gameData.coins = coins;
    io.to(roomId).emit('room-updated', room);
    
    // Check win condition
    const remainingP1 = Object.values(coins).filter(id => id === room.players[0].id).length;
    const remainingP2 = Object.values(coins).filter(id => id === room.players[1].id).length;
    
    if (remainingP1 === 0 || remainingP2 === 0) {
      room.gameState = 'finished';
      const winner = remainingP1 === 0 ? room.players[1] : room.players[0];
      room.winner = winner;
      room.winners = [winner];
      updatePlayerWin(winner.name, 'sixteencoins');
      io.to(roomId).emit('game-over', { winner, room });
      io.emit('leaderboard-updated', getLeaderboards());
      broadcastActiveRooms();
    }
  });

  socket.on('sixteencoins-endturn', ({ roomId }: { roomId: string }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'playing' || room.type !== 'sixteencoins') return;
    room.currentTurnIndex = room.currentTurnIndex === 0 ? 1 : 0;
    io.to(roomId).emit('room-updated', room);
  });

  /* ─── FLAPPY: SCORE ─── */
  socket.on('flappy-score', ({ roomId, score, name }: { roomId?: string; score: number; name?: string }) => {
    let playerName: string | null = (socket as any).playerName || name || null;
    
    if (!playerName) {
        if (roomId && rooms[roomId]) {
            const player = rooms[roomId].players.find(p => p.id === socket.id);
            if (player) playerName = player.name;
        } else {
            // Fallback: look for this player in all rooms
            for (const rId in rooms) {
                const player = rooms[rId].players.find(p => p.id === socket.id);
                if (player) {
                    playerName = player.name;
                    break;
                }
            }
        }
    }

    if (playerName) {
        updatePlayerWin(playerName, 'flappy', score);
        io.emit('leaderboard-updated', getLeaderboards());
    }
  });

  /* ─── CSSBATTLE: SCORE ─── */
  socket.on('cssbattle-score', ({ name, match, time }: { name: string; match: number; time: number }) => {
    updatePlayerWin(name, 'cssbattle', match, time);
    io.emit('leaderboard-updated', getLeaderboards());
  });

  /* ─── SUDOKU SAVES & SCORE ─── */
  socket.on('sudoku-save', ({ name, state }: { name: string; state: any }) => {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const db = JSON.parse(data);
      if (!db.sudokuSaves) db.sudokuSaves = {};
      db.sudokuSaves[name] = state;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch(e) {}
  });

  socket.on('sudoku-load', ({ name }: { name: string }, callback: Function) => {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const db = JSON.parse(data);
      if (db.sudokuSaves && db.sudokuSaves[name]) {
        callback({ success: true, state: db.sudokuSaves[name] });
      } else {
        callback({ success: false });
      }
    } catch(e) {
      callback({ success: false });
    }
  });

  socket.on('sudoku-win', ({ name }: { name: string }) => {
    updatePlayerWin(name, 'sudoku');
    io.emit('leaderboard-updated', getLeaderboards());
    // Clear save on win
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const db = JSON.parse(data);
      if (db.sudokuSaves && db.sudokuSaves[name]) {
        delete db.sudokuSaves[name];
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      }
    } catch(e) {}
  });

  socket.on('get-leaderboards', () => {
    socket.emit('leaderboard-updated', getLeaderboards());
  });

  /* ─── DISCONNECT ─── */
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;

      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        delete rooms[roomId];
      } else {
        if (room.hostId === socket.id) room.hostId = room.players[0].id;
        if (room.currentTurnIndex >= room.players.length) {
          room.currentTurnIndex = 0;
        }
        io.to(roomId).emit('room-updated', room);
      }
    }
    broadcastActiveRooms();
  });
});

// Serve static files from the client/dist folder in Production
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('/*', (req, res) => {
    if (!req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Fun Arcade server on port ${PORT}`));
