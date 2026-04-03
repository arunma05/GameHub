import { z } from 'zod';

export const CreateRoomSchema = z.object({
  playerName: z.string().min(1).max(20),
  type: z.enum(['bingo', 'typeracer', 'chess', 'flappy', 'quiz', 'cssbattle', 'sudoku', 'sixteencoins', 'kakuro', 'gridorder', 'memory']),
  isPublic: z.boolean().optional(),
  quizAmount: z.number().min(5).max(50).optional(),
  quizCategory: z.number().optional(),
  quizDifficulty: z.string().optional(),
  gridSize: z.number().min(3).max(10).optional(),
  memoryLevel: z.number().min(4).max(36).optional(),
  kakuroLevel: z.union([z.number().min(1).max(10), z.literal('All')]).optional(),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().length(5),
  playerName: z.string().min(1).max(20),
});

export const TypeProgressSchema = z.object({
  roomId: z.string().length(5),
  charsTyped: z.number().min(0).max(5000),
});

export const SixteenCoinsMoveSchema = z.object({
  roomId: z.string().length(5),
  coins: z.record(z.string(), z.string()), // coordinate -> playerId
});

export const FlappyScoreSchema = z.object({
  roomId: z.string().length(5).optional(),
  score: z.number().min(0).max(100000),
  name: z.string().max(20).optional(),
});

export const MemoryMatchSchema = z.object({
  roomId: z.string().length(5),
  matches: z.number().min(0).max(50),
});

export const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().min(2).max(30),
  password: z.string().min(5),
  captchaResponse: z.number(),
});

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(5),
});
