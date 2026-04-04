import { Server, Socket } from 'socket.io';
import { rooms, broadcastActiveRooms } from './roomHandlers';
import { getLeaderboards, updatePlayerWin } from './leaderboard';
import { TypeProgressSchema, SixteenCoinsMoveSchema, FlappyScoreSchema, MemoryMatchSchema } from './validation';
import { getRandomSentence } from './sentences';
import { generateCard, countCompletedLines } from './utils';
import { generateRoomCode } from './gameLogic';

export const gameTimers: Record<string, NodeJS.Timeout> = {};

export async function handleStartGame(socket: Socket, io: Server, { roomId }: { roomId: string }) {
  const room = rooms[roomId];
  if (!room || room.hostId !== socket.id || room.gameState !== 'waiting') return;
  
  const minPlayers = (['flappy', 'kakuro', 'sudoku', 'quiz', 'typeracer', 'gridorder', 'memory'].includes(room.type)) ? 1 : 2;
  if (room.players.length < minPlayers) return;

  if (room.type === 'typeracer') {
    room.gameState = 'starting';
    room.gameData = getRandomSentence();
    room.players.forEach(p => { p.completedLines = 0; p.wpm = 0; });
    io.to(roomId).emit('game-started', room); 
    broadcastActiveRooms(io);

    setTimeout(() => {
      const r = rooms[roomId];
      if (r && r.gameState === 'starting') {
        r.gameState = 'playing';
        r.startTime = Date.now();
        io.to(roomId).emit('room-updated', r);
        broadcastActiveRooms(io);
      }
    }, 3500); 
  } else if (room.type === 'quiz') {
    room.gameState = 'starting';
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);

    try {
      const amount = (room.gameData as any)?.quizAmount || 10;
      const category = (room.gameData as any)?.quizCategory;
      const difficulty = (room.gameData as any)?.quizDifficulty;
      
      let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
      if (category) url += `&category=${category}`;
      if (difficulty && difficulty !== 'any') url += `&difficulty=${difficulty}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.response_code === 0) {
        const questions = data.results.map((q: any) => ({
          ...q,
          options: shuffleArray([...q.incorrect_answers, q.correct_answer])
        }));

        room.gameData = {
          ...(room.gameData as any),
          questions,
          currentQ: 0,
          scores: room.players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
          answers: {},
          showingResult: false,
          qStartTime: Date.now()
        };

        setTimeout(() => {
          const r = rooms[roomId];
          if (r && r.gameState === 'starting') {
            r.gameState = 'playing';
            r.startTime = Date.now();
            (r.gameData as any).qStartTime = Date.now();
            io.to(roomId).emit('room-updated', r);
            broadcastActiveRooms(io);
            // Round timer
            const { handleQuizRoundEnd } = require('./contestHandlers');
            gameTimers[roomId] = setTimeout(() => handleQuizRoundEnd(roomId, io), 15000);
          }
        }, 3500);
      } else {
        throw new Error('Failed to fetch questions');
      }
    } catch (err) {
      console.error('Quiz start error:', err);
      room.gameState = 'waiting';
      io.to(roomId).emit('room-error', { message: 'Failed to load quiz questions. Please try again.' });
      io.to(roomId).emit('room-updated', room);
    }
  } else if (room.type === 'kakuro') {
    room.gameState = 'playing';
    room.gameData = {
      ...(room.gameData as any),
      seed: Math.floor(Math.random() * 2147483647),
    };
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);
  } else if (room.type === 'gridorder') {
    room.gameState = 'playing';
    const size = (room.gameData as any)?.gridSize || 3;
    const tiles: (number | null)[] = [];
    for (let i = 1; i < size * size; i++) tiles.push(i);
    tiles.push(null);

    // Shuffle board by making valid moves to ensure solvability
    let shuffled = [...tiles];
    let emptyIndex = size * size - 1;
    let movesToMake = size * size * 20;

    const getNeighbors = (index: number, s: number) => {
        const neighbors: number[] = [];
        const row = Math.floor(index / s);
        const col = index % s;
        if (row > 0) neighbors.push(index - s);
        if (row < s - 1) neighbors.push(index + s);
        if (col > 0) neighbors.push(index - 1);
        if (col < s - 1) neighbors.push(index + 1);
        return neighbors;
    };

    for (let i = 0; i < movesToMake; i++) {
        const neighbors = getNeighbors(emptyIndex, size);
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        [shuffled[emptyIndex], shuffled[randomNeighbor]] = [shuffled[randomNeighbor], shuffled[emptyIndex]];
        emptyIndex = randomNeighbor;
    }

    room.gameData = {
      ...(room.gameData as any),
      board: shuffled,
    };
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);
  } else if (room.type === 'sixteencoins') {
    room.gameState = 'playing';
    const p1Id = room.players[0].id;
    const p2Id = room.players[1].id;
    const initialCoins: Record<string, string> = {
      "2,0": p1Id, "6,0": p1Id, "1,1": p1Id, "3,1": p1Id, "5,1": p1Id, "7,1": p1Id,
      "0,2": p1Id, "2,2": p1Id, "4,2": p1Id, "6,2": p1Id, "8,2": p1Id,
      "1,3": p1Id, "3,3": p1Id, "5,3": p1Id, "7,3": p1Id, "2,4": p1Id,
      "2,8": p2Id, "6,8": p2Id, "1,7": p2Id, "3,7": p2Id, "5,7": p2Id, "7,7": p2Id,
      "0,6": p2Id, "2,6": p2Id, "4,6": p2Id, "6,6": p2Id, "8,6": p2Id,
      "1,5": p2Id, "3,5": p2Id, "5,5": p2Id, "7,5": p2Id, "6,4": p2Id
    };
    room.gameData = { coins: initialCoins, readyCount: 2 };
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);
  } else if (room.type === 'jumprace') {
    room.gameState = 'playing';
    const p1Id = room.players[0].id;
    const p2Id = room.players[1].id;
    const board: Record<string, string> = {};
    // Player 1 (Bottom corner triangle)
    for (let i=0; i<4; i++) {
        for (let j=0; j<4-i; j++) {
            board[`${i},${j}`] = p1Id;
        }
    }
    // Player 2 (Top corner triangle)
    for (let i=0; i<4; i++) {
        for (let j=0; j<4-i; j++) {
            board[`${7-i},${7-j}`] = p2Id;
        }
    }
    room.gameData = { board, turnIndex: 0 };
    room.currentTurnIndex = 0;
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);
  } else if (room.type === 'memory') {
    room.gameState = 'starting';
    const level = (room.gameData as any)?.level || 6;
    const numPairs = Math.floor(level / 2);
    // There are 18 icons in the client
    const allIndices = Array.from({ length: 18 }, (_, i) => i);
    const selectedIcons = shuffleArray([...allIndices]).slice(0, numPairs);
    const board = shuffleArray([...selectedIcons, ...selectedIcons]);
    
    room.gameData = {
      ...(room.gameData as any),
      board,
      progress: room.players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
    };
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);

    setTimeout(() => {
      const r = rooms[roomId];
      if (r && r.gameState === 'starting') {
        r.gameState = 'playing';
        io.to(roomId).emit('room-updated', r);
        broadcastActiveRooms(io);
      }
    }, 3500);
  } else {
    // Basic start for other games
    room.players.forEach(p => { 
      if (room.type === 'bingo') p.card = generateCard(); 
      p.completedLines = 0;
    });
    room.gameState = 'playing';
    io.to(roomId).emit('game-started', room);
    broadcastActiveRooms(io);
  }
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function handleCallNumber(socket: Socket, io: Server, { roomId, number }: { roomId: string; number: number }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'bingo') return;

  const currentPlayer = room.players[room.currentTurnIndex];
  if (currentPlayer.id !== socket.id) return;
  if (number < 1 || number > 25) return;
  if (room.calledNumbers.includes(number)) return;

  room.calledNumbers.push(number);
  const calledSet = new Set<number>(room.calledNumbers);

  // Update EVERY player's completedLines so clients can highlight B-I-N-G-O letters
  room.players.forEach(p => {
    if (p.card) {
      p.completedLines = countCompletedLines(p.card, calledSet);
    }
  });

  const winners = room.players.filter(p => p.card && countCompletedLines(p.card, calledSet) >= 5);

  if (winners.length > 0) {
    const finalWinners = winners.some(w => w.id === socket.id) ? [winners.find(w => w.id === socket.id)!] : winners;
    room.gameState = 'finished';
    room.winner = finalWinners[0];
    room.winners = finalWinners;
    
    for (const w of finalWinners) await updatePlayerWin(w.name, 'bingo');
    const lb = await getLeaderboards();
    io.to(roomId).emit('game-over', { winner: room.winner, room });
    io.emit('leaderboard-updated', lb); 
    broadcastActiveRooms(io);
    return;
  }

  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  io.to(roomId).emit('number-called', { number, room });
}

export async function handleTypeProgress(socket: Socket, io: Server, data: unknown) {
  const res = TypeProgressSchema.safeParse(data);
  if (!res.success) return;

  const { roomId, charsTyped } = res.data;
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'typeracer' || !room.startTime) return;

  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  player.completedLines = charsTyped;
  const elapsedMinutes = (Date.now() - room.startTime) / 60000;
  if (elapsedMinutes > 0) {
    player.wpm = Math.round((charsTyped / 5) / elapsedMinutes);
  }

  const targetLength = (typeof room.gameData === 'string' ? room.gameData.length : 0);
  if (charsTyped >= targetLength && targetLength > 0) {
    room.gameState = 'finished';
    room.winner = player;
    
    const finalMinutes = (Date.now() - room.startTime) / 60000;
    player.wpm = Math.round((targetLength / 5) / (finalMinutes || 1));
    room.winners = [player];

    await updatePlayerWin(player.name, 'typeracer', player.wpm);
    const lb = await getLeaderboards();
    io.to(roomId).emit('game-over', { winner: player, room });
    io.emit('leaderboard-updated', lb);
    broadcastActiveRooms(io);
  } else {
    io.to(roomId).emit('room-updated', room);
  }
}
