import { Server, Socket } from 'socket.io';
import { rooms, broadcastActiveRooms } from './roomHandlers';
import { getLeaderboards, updatePlayerWin } from './leaderboard';
import { SixteenCoinsMoveSchema } from './validation';
import { ChessData, SixteenCoinsData } from './types';

export interface ChessMove {
  fen: string;
  isGameOver: boolean;
  winnerId?: string | null;
}

export async function handleChessMove(socket: Socket, io: Server, { roomId, move }: { roomId: string, move: ChessMove }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'chess') return;
  
  // Basic move sync (validation should be more robust in a production chess app)
  const gameData = room.gameData as ChessData;
  if (gameData && typeof gameData === 'object' && 'fen' in gameData) {
    gameData.fen = move.fen;
    gameData.turnIndex = gameData.turnIndex === 0 ? 1 : 0;
  }

  if (move.isGameOver) {
    room.gameState = 'finished';
    const winner = room.players.find(p => p.id === move.winnerId) || null;
    room.winner = winner;
    if (winner) {
      room.winners = [winner];
      await updatePlayerWin(winner.name, 'chess');
    }
    const lb = await getLeaderboards();
    io.to(roomId).emit('game-over', { winner: room.winner, room });
    io.emit('leaderboard-updated', lb);
    broadcastActiveRooms(io);
  } else {
    io.to(roomId).emit('room-updated', room);
  }
}

export async function handleSixteenCoinsMove(socket: Socket, io: Server, data: unknown) {
  const res = SixteenCoinsMoveSchema.safeParse(data);
  if (!res.success) return;

  const { roomId, coins } = res.data;
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'sixteencoins') return;

  // Validation: Check if move is legal (simplified)
  const gameData = room.gameData as SixteenCoinsData;
  if (gameData && typeof gameData === 'object' && 'coins' in gameData) {
    gameData.coins = coins;
  }
  io.to(roomId).emit('room-updated', room);
  
  const p1Id = room.players[0].id;
  const p2Id = room.players[1].id;
  const remP1 = Object.values(coins).filter(id => id === p1Id).length;
  const remP2 = Object.values(coins).filter(id => id === p2Id).length;
  
  if (remP1 === 0 || remP2 === 0) {
    room.gameState = 'finished';
    const winner = remP1 === 0 ? room.players[1] : room.players[0];
    room.winner = winner;
    room.winners = [winner];
    await updatePlayerWin(winner.name, 'sixteencoins');
    const lb = await getLeaderboards();
    io.to(roomId).emit('game-over', { winner, room });
    io.emit('leaderboard-updated', lb);
    broadcastActiveRooms(io);
  }
}

export async function handleSudokuWin(socket: Socket, io: Server, { name }: { name: string }) {
  await updatePlayerWin(name, 'sudoku');
  const lb = await getLeaderboards();
  io.emit('leaderboard-updated', lb);
}

const sudokuDrafts = new Map<string, any>();

export function handleSudokuSave(socket: Socket, { name, state }: { name: string, state: any }) {
  sudokuDrafts.set(name, state);
}

export function handleSudokuLoad(socket: Socket, { name }: { name: string }, callback: (res: any) => void) {
  const state = sudokuDrafts.get(name);
  if (state) callback({ success: true, state });
  else callback({ success: false });
}

export async function handleKakuroWin(socket: Socket, io: Server, { name, roomId }: { name: string, roomId?: string }) {
  await updatePlayerWin(name, 'kakuro');
  const lb = await getLeaderboards();
  io.emit('leaderboard-updated', lb);
  if (roomId && rooms[roomId]) {
    const room = rooms[roomId];
    if (room.players.find(p => p.name === name)) {
      room.gameState = 'finished';
      room.winner = room.players[0];
      room.winners = [room.players[0]];
      io.to(roomId).emit('game-over', { winner: room.winner, room });
      broadcastActiveRooms(io);
    }
  }
}

export async function handleGridOrderScore(socket: Socket, io: Server, { score, time, name, gridSize }: { score: number, time: number, name: string, gridSize: number }) {
  await updatePlayerWin(name, 'gridorder', score, time, gridSize);
  const lb = await getLeaderboards();
  io.emit('leaderboard-updated', lb);
}

export async function handleGridOrderWin(socket: Socket, io: Server, { roomId, time, moves }: { roomId: string, time: number, moves: number }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'gridorder') return;

  const player = room.players.find(p => p.id === socket.id);
  if (player) {
    room.gameState = 'finished';
    room.winner = player;
    room.winners = [player];
    
    // gridSize is stored in room.gameData
    const gridSize = (room.gameData as any)?.gridSize || 3;
    await updatePlayerWin(player.name, 'gridorder', moves, time, gridSize);
    
    const lb = await getLeaderboards();
    io.to(roomId).emit('game-over', { winner: player, room });
    io.emit('leaderboard-updated', lb);
    broadcastActiveRooms(io);
  }
}

export async function handleSixteenCoinsEndTurn(socket: Socket, io: Server, { roomId }: { roomId: string }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'sixteencoins') return;

  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
  io.to(roomId).emit('room-updated', room);
}

export async function handleSixteenCoinsReady(socket: Socket, io: Server, { roomId }: { roomId: string }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'waiting' || room.type !== 'sixteencoins') return;

  if (!room.readyPlayers) room.readyPlayers = [];
  if (!room.readyPlayers.includes(socket.id)) {
    room.readyPlayers.push(socket.id);
  }

  if (room.readyPlayers.length >= 2) {
    const { handleStartGame } = require('./gameHandlers');
    await handleStartGame(socket, io, { roomId });
  } else {
    io.to(roomId).emit('room-updated', room);
  }
}
