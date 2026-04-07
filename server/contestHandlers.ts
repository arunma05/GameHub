import { Server, Socket } from 'socket.io';
import { rooms, broadcastActiveRooms, AugmentedSocket } from './roomHandlers';
import { getLeaderboards, updatePlayerWin } from './leaderboard';
import { FlappyScoreSchema } from './validation';
import { gameTimers } from './gameHandlers';
import { QuizData } from './types';

export async function handleQuizAnswer(socket: Socket, io: Server, { roomId, answer }: { roomId: string, answer: string }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'quiz') return;
  const gameData = room.gameData as QuizData;
  if (!gameData || gameData.showingResult || gameData.roundEnding) return;
  if (gameData.answers[socket.id]) return;
  
  gameData.answers[socket.id] = answer;
  io.to(roomId).emit('room-updated', room);
  // All players have answered — end the round early
  if (Object.keys(gameData.answers).length >= room.players.length) {
    gameData.roundEnding = true;
    handleQuizRoundEnd(roomId, io);
  }
}

export function handleQuizRoundEnd(roomId: string, io: Server) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'quiz') return;
  const gameData = room.gameData as QuizData;
  if (!gameData) return;

  // Guard: if already processing this round's end, bail out (prevents double-call from timer + all-answered)
  if (gameData.showingResult) return;

  // Mark as ending and cancel the pending timer
  gameData.roundEnding = true;
  if (gameTimers[roomId]) { clearTimeout(gameTimers[roomId]); delete gameTimers[roomId]; }

  const q = gameData.questions[gameData.currentQ];
  room.players.forEach(p => {
    if (gameData.answers[p.id] === q.correct_answer) {
      gameData.scores[p.id] = (gameData.scores[p.id] || 0) + 10;
    }
  });

  gameData.showingResult = true;
  io.to(roomId).emit('room-updated', room);

  setTimeout(async () => {
    const r = rooms[roomId];
    if (!r || r.gameState !== 'playing' || r.type !== 'quiz') return;
    const gData = r.gameData as QuizData;
    if (!gData) return;
    gData.currentQ++;
    gData.answers = {};
    gData.showingResult = false;
    gData.roundEnding = false;

    if (gData.currentQ >= gData.questions.length) {
      r.gameState = 'finished';
      const scores = gData.scores as Record<string, number>;
      const max = Math.max(...Object.values(scores));
      r.winners = r.players.filter(p => scores[p.id] === max);
      r.winner = r.winners[0];
      for (const w of r.winners) await updatePlayerWin(w.name, 'quiz');
      const lb = await getLeaderboards();
      io.to(roomId).emit('game-over', { winner: r.winner, room: r });
      io.emit('leaderboard-updated', lb);
      broadcastActiveRooms(io);
    } else {
      gData.qStartTime = Date.now();
      io.to(roomId).emit('room-updated', r);
      gameTimers[roomId] = setTimeout(() => handleQuizRoundEnd(roomId, io), 15000);
    }
  }, 4000);
}

export async function handleFlappyScore(socket: AugmentedSocket, io: Server, data: unknown) {
  const res = FlappyScoreSchema.safeParse(data);
  if (!res.success) return;
  const { score, name } = res.data;
  const playerName = socket.playerName || name;
  if (playerName) {
    await updatePlayerWin(playerName, 'flappy', score);
    const lb = await getLeaderboards();
    io.emit('leaderboard-updated', lb);
  }
}

export async function handleMemoryWin(socket: Socket, io: Server, { roomId, time }: { roomId: string, time: number }) {
  const room = rooms[roomId];
  if (!room || room.gameState !== 'playing' || room.type !== 'memory') return;
  const player = room.players.find(p => p.id === socket.id);
  if (!player || !room.gameData || typeof room.gameData !== 'object' || !('level' in room.gameData)) return;

  room.gameState = 'finished';
  room.winner = player;
  room.winners = [player];
  await updatePlayerWin(player.name, 'memory', undefined, time, room.gameData.level);
  const lb = await getLeaderboards();
  io.to(roomId).emit('game-over', { winner: player, room });
  io.emit('leaderboard-updated', lb);
  broadcastActiveRooms(io);
}
