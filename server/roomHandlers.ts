import { Server, Socket } from 'socket.io';
import { Player, Room, GameType } from './types';
import { generateRoomCode } from './gameLogic';
import { getRandomSentence } from './sentences';
import { generateCard } from './utils';
import { CreateRoomSchema, JoinRoomSchema } from './validation';

export interface AugmentedSocket extends Socket {
  playerName?: string;
  userId?: number;
  isGuest?: boolean;
}

export const rooms: Record<string, Room> = {};

export function getActiveRooms() {
  return Object.values(rooms)
    .filter(r => {
      if (r.gameState !== 'waiting' || !r.isPublic) return false;
      if ((r.type === 'chess' || r.type === 'sixteencoins' || r.type === 'archerstick') && r.players.length >= 2) return false;
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

export function broadcastActiveRooms(io: Server) {
  io.emit('active-rooms', getActiveRooms());
}

export function handleCreateRoom(socket: AugmentedSocket, io: Server, data: unknown, callback: (res: { success: boolean; roomId?: string; player?: Player; message?: string }) => void) {
  const result = CreateRoomSchema.safeParse(data);
  if (!result.success) return callback({ success: false, message: 'Invalid data' });

  const { playerName, type, isPublic, quizAmount, quizCategory, quizDifficulty, gridSize, memoryLevel, kakuroLevel } = result.data;
  let roomId = generateRoomCode();
  while (rooms[roomId]) roomId = generateRoomCode();

  const player: Player = { id: socket.id, name: playerName, card: type === 'bingo' ? generateCard() : null, completedLines: 0 };
  
  socket.playerName = playerName; // For flappy

  rooms[roomId] = {
    id: roomId,
    type: type as GameType,
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
              (type === 'quiz' ? { quizAmount: quizAmount || 10, quizCategory, quizDifficulty, questions: [], currentQ: 0, scores: {}, answers: {} } : 
              (type === 'gridorder' ? { gridSize: gridSize || 3 } : 
              (type === 'memory' ? { level: memoryLevel || 6 } :
              (type === 'sixteencoins' ? { coins: {}, readyCount: 0 } :
              (type === 'kakuro' ? { level: kakuroLevel || 1 } :
              (type === 'archerstick' ? { health: {}, playerPos: {}, arrows: [] } : null))))))),
    readyPlayers: [],
  };

  socket.join(roomId);
  callback({ success: true, roomId, player });
  io.to(roomId).emit('room-updated', rooms[roomId]);
  broadcastActiveRooms(io);
}

export function handleJoinRoom(socket: AugmentedSocket, io: Server, data: unknown, callback: (res: { success: boolean; roomId?: string; player?: Player; message?: string }) => void) {
  const result = JoinRoomSchema.safeParse(data);
  if (!result.success) return callback({ success: false, message: 'Invalid data' });

  const roomId = result.data.roomId.toUpperCase();
  const playerName = result.data.playerName;
  const room = rooms[roomId];

  if (!room) return callback({ success: false, message: 'Room not found' });
  if (room.gameState !== 'waiting') return callback({ success: false, message: 'Game already in progress' });

  if ((room.type === 'chess' || room.type === 'sixteencoins' || room.type === 'archerstick') && room.players.length >= 2) {
    return callback({ success: false, message: 'Room is full' });
  }
  const nameExists = room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (nameExists) return callback({ success: false, message: 'Player name already taken in this room' });

  const player: Player = { id: socket.id, name: playerName, card: null, completedLines: 0 };
  socket.playerName = playerName;
  room.players.push(player);
  socket.join(roomId);

  callback({ success: true, roomId, player });
  io.to(roomId).emit('room-updated', room);
  broadcastActiveRooms(io);
}
