export interface Player {
  id: string;
  name: string;
  card: number[] | null;
  completedLines: number;
  wpm?: number;
}

export type GameType = 
  | 'bingo' 
  | 'typeracer' 
  | 'chess' 
  | 'flappy' 
  | 'quiz' 
  | 'cssbattle' 
  | 'sudoku' 
  | 'sixteencoins' 
  | 'kakuro' 
  | 'gridorder' 
  | 'memory'
  | 'jumprace';

export type GameState = 'waiting' | 'starting' | 'playing' | 'finished';

export interface ChessData {
  fen: string;
  turnIndex: number;
}

export interface QuizData {
  questions: any[]; 
  currentQ: number;
  scores: Record<string, number>;
  answers: Record<string, string>;
  showingResult?: boolean;
  qStartTime?: number;
  quizAmount: number;
  quizCategory?: number;
  quizDifficulty?: string;
}

export interface SixteenCoinsData {
  coins: Record<string, string>;
  readyCount: number;
}

export interface JumpRaceData {
    board: Record<string, string>;
    turnIndex: number;
    lastJump?: string;
}

export type GameData = string | ChessData | QuizData | SixteenCoinsData | JumpRaceData | { gridSize: number } | { level: number | 'All' } | null;

export interface Room {
  id: string;
  type: GameType;
  hostId: string;
  players: Player[];
  gameState: GameState;
  isPublic: boolean;
  calledNumbers: number[];
  currentTurnIndex: number;
  winner: Player | null;
  winners: Player[];
  gameData?: GameData;
  startTime?: number;
  readyPlayers?: string[];
}

export interface LeaderboardEntry {
  name: string;
  score?: number;
  wpm?: number;
  time?: number;
  moves?: number;
}

export interface Leaderboards {
  bingo: Record<string, number>;
  typeracer: LeaderboardEntry[];
  chess: Record<string, number>;
  quiz: Record<string, number>;
  sudoku: Record<string, number>;
  kakuro: Record<string, number>;
  sixteencoins: Record<string, number>;
  gridorder: Record<string, { bestTimes: LeaderboardEntry[]; bestMoves: LeaderboardEntry[] }>;
  memory: Record<string, LeaderboardEntry[]>;
  flappy: LeaderboardEntry[];
  cssbattle: Record<string, LeaderboardEntry[]>;
  jumprace: Record<string, number>;
}
