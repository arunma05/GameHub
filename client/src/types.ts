export interface PublicRoom {
  id: string;
  type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro';
  playerCount: number;
  hostName: string;
}

export interface Player {
  id: string;
  name: string;
  card: number[] | null; // 25 numbers (1-25)
  completedLines: number;
  wpm?: number;
  score?: number; // for flappy bird and quiz
}

export interface Room {
  id: string;
  type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro';
  hostId: string;
  players: Player[];
  gameState: 'waiting' | 'starting' | 'playing' | 'finished';
  isPublic: boolean;
  calledNumbers: number[];       // for bingo
  currentTurnIndex: number;      // for bingo
  winner: Player | null;
  winners: Player[] | undefined;
  gameData?: Record<string, unknown>; // sentences for typeracer, etc.
  startTime?: number;            // timestamp for WPM calculation
  readyPlayers?: string[];          // players ready for next game
}

export interface GameState {
  room: Room | null;
  me: Player | null;
  error: string | null;
  leaderboards: {
    bingo: Record<string, number>;
    typeracer: Record<string, number>;
    chess: Record<string, number>;
    quiz: Record<string, number>;
    sudoku: Record<string, number>;
    kakuro: Record<string, number>;
    sixteencoins: Record<string, number>;
    flappy: { name: string; score: number }[];
    cssbattle: { name: string; score: number; time: number }[];
  };
}
