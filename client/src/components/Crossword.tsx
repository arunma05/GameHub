import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { Player } from '../types';
import { ArrowLeft, Brain, Trophy, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CrosswordProps {
  me?: Player;
  onBack: () => void;
}

interface Cell {
  char: string; // The correct character
  input: string; // User input character
  isBlack: boolean;
  number?: number;
  across?: number; // Clue ID
  down?: number; // Clue ID
}

interface Clue {
  id: number;
  number: number;
  direction: 'across' | 'down';
  answer: string;
  clue: string;
  row: number;
  col: number;
}

interface Puzzle {
  id: number;
  name: string;
  difficulty: string;
  grid: string[][]; // Empty strings for black cells
  clues: Clue[];
}

const PUZZLES: Puzzle[] = [
  {
    id: 1,
    name: "Web Fundamentals",
    difficulty: "Easy",
    grid: [
      ['R', 'E', 'A', 'C', 'T'],
      ['', '', 'P', '', ''],
      ['C', 'L', 'O', 'U', 'D'],
      ['', '', 'S', '', 'O'],
      ['', 'H', 'T', 'M', 'L']
    ],
    clues: [
      { id: 1, number: 1, direction: 'across', answer: 'REACT', clue: 'Popular JavaScript library for building UIs', row: 0, col: 0 },
      { id: 2, number: 2, direction: 'across', answer: 'CLOUD', clue: 'On-demand delivery of compute/storage over the internet', row: 2, col: 0 },
      { id: 3, number: 3, direction: 'across', answer: 'HTML', clue: 'Standard markup language for documents designed to be displayed in a web browser', row: 4, col: 1 },
      { id: 4, number: 1, direction: 'down', answer: 'APIS', clue: 'Application Programming Interfaces (plural)', row: 0, col: 2 },
      { id: 5, number: 4, direction: 'down', answer: 'DOM', clue: 'Document Object Model', row: 2, col: 4 }
    ]
  },
  {
    id: 2,
    name: "Modern Infrastructure",
    difficulty: "Medium",
    grid: [
      ['D', 'O', 'C', 'K', 'E', 'R', ''],
      ['', '', 'A', '', 'D', '', ''],
      ['L', 'I', 'N', 'U', 'X', '', ''],
      ['', '', 'A', '', '', '', 'N'],
      ['S', 'E', 'R', 'V', 'E', 'R', 'O'],
      ['', '', 'Y', '', '', '', 'D'],
      ['', '', '', '', 'B', 'I', 'E']
    ],
    clues: [
      { id: 1, number: 1, direction: 'across', answer: 'DOCKER', clue: 'Platform to build, share, and run containerized applications', row: 0, col: 0 },
      { id: 2, number: 2, direction: 'across', answer: 'LINUX', clue: 'Open-source kernel used in most servers', row: 2, col: 0 },
      { id: 3, number: 3, direction: 'across', answer: 'SERVER', clue: 'Computer or program that provides services to other programs', row: 4, col: 0 },
      { id: 4, number: 4, direction: 'across', answer: 'BITS', clue: 'Smallest units of data in computing', row: 6, col: 4 },
      { id: 5, number: 1, direction: 'down', answer: 'CANARY', clue: 'A release strategy that rolls out changes to a small subset of users', row: 0, col: 2 },
      { id: 6, number: 5, direction: 'down', answer: 'NODE', clue: 'Single point in a network or runtime', row: 3, col: 6 },
      { id: 7, number: 6, direction: 'down', answer: 'EDGE', clue: 'Deploying compute closer to the user', row: 0, col: 4 }
    ]
  },
  {
    id: 3,
    name: "AI & Data",
    difficulty: "Hard",
    grid: [
      ['P', 'Y', 'T', 'O', 'R', 'C', 'H'],
      ['', 'O', '', '', '', '', ''],
      ['A', 'G', 'I', 'L', 'E', '', 'S'],
      ['', 'A', '', '', '', '', 'Q'],
      ['', 'S', 'C', 'A', 'L', 'A', 'L'],
      ['', '', '', '', '', '', ''],
      ['T', 'E', 'N', 'S', 'O', 'R', '']
    ],
    clues: [
      { id: 1, number: 1, direction: 'across', answer: 'PYTORCH', clue: 'Open source machine learning framework based on the Torch library', row: 0, col: 0 },
      { id: 2, number: 2, direction: 'across', answer: 'AGILE', clue: 'Iterative approach to software development', row: 2, col: 0 },
      { id: 3, number: 3, direction: 'across', answer: 'SCALA', clue: 'A general-purpose programming language that provides support for both functional and OO programming', row: 4, col: 1 },
      { id: 4, number: 4, direction: 'across', answer: 'TENSOR', clue: 'An algebraic object that describes a multilinear relationship (used in AI)', row: 6, col: 0 },
      { id: 5, number: 5, direction: 'down', answer: 'GPU', clue: 'Graphics Processing Unit', row: 0, col: 0 },
      { id: 6, number: 6, direction: 'down', answer: 'SHELL', clue: 'Command-line interpreter', row: 0, col: 4 },
      { id: 7, number: 7, direction: 'down', answer: 'SQL', clue: 'Language used for managing relational databases', row: 2, col: 6 }
    ]
  },
  {
    id: 4,
    name: "The Software Stack",
    difficulty: "Medium",
    grid: [
      ['N', 'O', 'D', 'E', 'J', 'S', ''],
      ['', '', 'E', '', '', '', ''],
      ['', 'G', 'I', 'T', 'H', 'U', 'B'],
      ['', '', 'F', '', '', '', ''],
      ['A', 'N', 'G', 'U', 'L', 'A', 'R'],
      ['', '', '', '', '', '', ''],
      ['S', 'W', 'I', 'F', 'T', '', '']
    ],
    clues: [
      { id: 1, number: 1, direction: 'across', answer: 'NODEJS', clue: 'JavaScript runtime built on Chrome\'s V8', row: 0, col: 0 },
      { id: 2, number: 2, direction: 'across', answer: 'GITHUB', clue: 'Cloud-based service for version control and collaboration', row: 2, col: 1 },
      { id: 3, number: 3, direction: 'across', answer: 'ANGULAR', clue: 'Web application framework led by the Angular Team at Google', row: 4, col: 0 },
      { id: 4, number: 4, direction: 'across', answer: 'SWIFT', clue: 'Powerful and intuitive programming language for iOS/macOS', row: 6, col: 0 },
      { id: 5, number: 5, direction: 'down', answer: 'DEBUG', clue: 'Process of finding and resolving bugs', row: 0, col: 2 },
      { id: 6, number: 6, direction: 'down', answer: 'RUST', clue: 'Language empowering everyone to build reliable and efficient software', row: 4, col: 6 },
      { id: 7, number: 7, direction: 'down', answer: 'API', clue: 'Application Programming Interface', row: 2, col: 1 }
    ]
  }
];

export const Crossword: React.FC<CrosswordProps> = ({ me, onBack }) => {
  const [puzzle, setPuzzle] = useState<Puzzle>(PUZZLES[0]);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
  const [mode, setMode] = useState<'across' | 'down'>('across');
  const [isWon, setIsWon] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});
  const [playerName, setPlayerName] = useState(() => me?.name || localStorage.getItem('arcade_player_name') || '');
  const [showNameDialog, setShowNameDialog] = useState(!playerName);

  const initPuzzle = useCallback((p: Puzzle) => {
    const newBoard: Cell[][] = p.grid.map((row) => row.map((char) => ({
      char: char.toUpperCase(),
      input: '',
      isBlack: char === '',
    })));

    // Assign clue IDs and numbers
    p.clues.forEach(clue => {
      const { row, col, answer, direction, number } = clue;
      newBoard[row][col].number = number;
      for (let i = 0; i < answer.length; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        if (newBoard[r] && newBoard[r][c]) {
          if (direction === 'across') newBoard[r][c].across = clue.id;
          else newBoard[r][c].down = clue.id;
        }
      }
    });

    setBoard(newBoard);
    setPuzzle(p);
    setSelectedCell(null);
    setIsWon(false);
    setTimeElapsed(0);
  }, []);

  useEffect(() => {
    initPuzzle(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]);
    socket.on('crossword-leaderboard', (data) => setLeaderboard(data));
    socket.emit('get-crossword-leaderboard');
    return () => { socket.off('crossword-leaderboard'); };
  }, [initPuzzle]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWon) setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  const checkWin = (currentBoard: Cell[][]) => {
    const everyMatch = currentBoard.every(row =>
      row.every(cell => cell.isBlack || cell.input.toUpperCase() === cell.char)
    );
    if (everyMatch) {
      setIsWon(true);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      socket.emit('crossword-win', { name: playerName, score: 100, time: timeElapsed });
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem('arcade_player_name', playerName.trim());
      setShowNameDialog(false);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (board[r][c].isBlack) return;
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setMode(prev => prev === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || isWon) return;
    const { r, c } = selectedCell;

    if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
      const newBoard = [...board.map(row => [...row])];
      newBoard[r][c].input = e.key.toUpperCase();
      setBoard(newBoard);
      checkWin(newBoard);

      // Move to next cell
      let nextR = r, nextC = c;
      if (mode === 'across') nextC++;
      else nextR++;

      if (nextR < board.length && nextC < board[0].length && !board[nextR][nextC].isBlack) {
        setSelectedCell({ r: nextR, c: nextC });
      }
    } else if (e.key === 'Backspace') {
      const newBoard = [...board.map(row => [...row])];
      if (newBoard[r][c].input === '') {
        let prevR = r, prevC = c;
        if (mode === 'across') prevC--;
        else prevR--;
        if (prevR >= 0 && prevC >= 0 && !board[prevR][prevC].isBlack) {
          newBoard[prevR][prevC].input = '';
          setSelectedCell({ r: prevR, c: prevC });
        }
      } else {
        newBoard[r][c].input = '';
      }
      setBoard(newBoard);
    } else if (e.key.startsWith('Arrow')) {
      let nextR = r, nextC = c;
      if (e.key === 'ArrowUp') nextR--;
      if (e.key === 'ArrowDown') nextR++;
      if (e.key === 'ArrowLeft') nextC--;
      if (e.key === 'ArrowRight') nextC++;

      if (nextR >= 0 && nextR < board.length && nextC >= 0 && nextC < board[0].length && !board[nextR][nextC].isBlack) {
        setSelectedCell({ r: nextR, c: nextC });
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getActiveClue = () => {
    if (!selectedCell) return null;
    const cell = board[selectedCell.r][selectedCell.c];
    const clueId = mode === 'across' ? cell.across : cell.down;
    return puzzle.clues.find(c => c.id === clueId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }} onKeyDown={handleKeyDown} tabIndex={0}>
      <header style={{ padding: '0.85rem 1.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="btn btn-outline" style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 950, fontSize: '1.2rem', letterSpacing: '0.05em' }}>
            <RefreshCw size={20} color="var(--accent)" /> CROSS-TECH
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TIMER</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 950, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeElapsed)}</div>
          </div>
        </div>
      </header>

      {showNameDialog ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
          <form onSubmit={handleNameSubmit} className="card" style={{ padding: '3rem', maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--accent-glow)' }}>
            <Brain size={48} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, marginBottom: '1.5rem' }}>IDENTIFY YOURSELF</h2>
            <div className="input-group">
              <label className="input-label">PLAYER NAME</label>
              <input
                autoFocus
                className="input-field"
                placeholder="e.g. CodeWizard"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1rem' }} disabled={!playerName.trim()}>
              Start Solving
            </button>
            <button type="button" onClick={onBack} className="btn btn-link" style={{ marginTop: '1rem', opacity: 0.7 }}>
              Maybe Later
            </button>
          </form>
        </div>
      ) : (
        <main style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1 }}>
          <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: 0 }}>
              {isWon ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)', borderRadius: '24px', width: '100%', maxWidth: '500px' }}>
                  <CheckCircle size={56} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                  <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 950 }}>COMPLETED!</h2>
                  <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Fixed in {formatTime(timeElapsed)}</p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={() => initPuzzle(PUZZLES[Math.floor(Math.random() * PUZZLES.length)])} style={{ background: 'var(--success)', border: 'none', fontWeight: 950, padding: '1rem 2rem' }}>
                      NEXT LEVEL
                    </button>
                    <button className="btn btn-outline" onClick={onBack}>LOBBY</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Active Clue display for mobile */}
                  <div className="card" style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--accent-glow)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', fontWeight: 950, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                      {getActiveClue() ? `${getActiveClue()?.number}${getActiveClue()?.direction === 'across' ? 'A' : 'D'}` : '?'}
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1rem', flex: 1 }}>
                      {getActiveClue()?.clue || 'Select a cell to see clue'}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${puzzle.grid[0].length}, 1fr)`,
                    gap: '2px',
                    background: 'var(--item-border)',
                    padding: '4px',
                    borderRadius: '12px',
                    width: 'min(100%, 500px)',
                    aspectRatio: '1'
                  }}>
                    {board.map((row, r) => row.map((cell, c) => (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        style={{
                          position: 'relative',
                          background: cell.isBlack ? 'var(--bg-primary)' : (selectedCell?.r === r && selectedCell?.c === c ? 'var(--accent)' : 'var(--card-bg)'),
                          borderRadius: '4px',
                          cursor: cell.isBlack ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'clamp(1rem, 4vw, 1.5rem)',
                          fontWeight: 950,
                          color: selectedCell?.r === r && selectedCell?.c === c ? 'white' : 'var(--text-primary)',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {!cell.isBlack && (
                          <>
                            {cell.number && <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '0.6rem', opacity: 0.6 }}>{cell.number}</span>}
                            {cell.input}
                          </>
                        )}
                      </div>
                    )))}
                  </div>
                </>
              )}
            </div>

            <div className="dashboard-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <Layers size={18} color="var(--accent)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Select Level</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {PUZZLES.map(p => (
                      <button
                        key={p.id}
                        onClick={() => initPuzzle(p)}
                        className="btn"
                        style={{
                          padding: '0.8rem',
                          justifyContent: 'flex-start',
                          background: puzzle.id === p.id ? 'var(--accent-glow)' : 'var(--item-bg)',
                          border: `1px solid ${puzzle.id === p.id ? 'var(--accent)' : 'transparent'}`,
                          color: puzzle.id === p.id ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 950, fontSize: '0.9rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{p.difficulty} • {p.clues.length} clues</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                    <Trophy size={20} color="#fbbf24" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Champions</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(leaderboard).sort((a, b) => a[1] - b[1]).slice(0, 5).map(([name, time], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: i < 3 ? 'var(--accent-glow)' : 'var(--item-bg)', borderRadius: '12px', border: i < 3 ? '1px solid var(--accent)' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 950, fontSize: '0.75rem' }}>#{i + 1}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{name}</span>
                        </div>
                        <span style={{ color: 'var(--success)', fontWeight: 950 }}>{formatTime(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default Crossword;
