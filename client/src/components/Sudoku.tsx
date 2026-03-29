import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { getSudoku } from 'sudoku-gen';
import { Grid3X3, Trophy, CheckCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SudokuProps {
  leaderboard: Record<string, number>;
  onBack: () => void;
}

interface SaveState {
  puzzle: string;
  current: string;
  solution: string;
  timeElapsed: number;
}

export const Sudoku: React.FC<SudokuProps> = ({ leaderboard, onBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<'login' | 'resume-prompt' | 'playing' | 'won'>('login');
  
  const [board, setBoard] = useState<string[]>([]);
  const [initialBoard, setInitialBoard] = useState<string[]>([]);
  const [solution, setSolution] = useState<string>('');
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeSessionElapsed, setActiveSessionElapsed] = useState(0);
  const [startTime, setStartTime] = useState(0);
  
  const [savedState, setSavedState] = useState<SaveState | null>(null);

  // Sync Timer while playing
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setActiveSessionElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, startTime]);

  const displayTime = timeElapsed + activeSessionElapsed;

  const handleLogin = () => {
    if (!playerName.trim()) return;
    socket.emit('sudoku-load', { name: playerName }, (res: { success: boolean, state?: SaveState }) => {
      if (res.success && res.state) {
        setSavedState(res.state);
        setGameState('resume-prompt');
      } else {
        startNewGame();
      }
    });
  };

  const startNewGame = () => {
    const puzzle = getSudoku('easy');
    setInitialBoard(puzzle.puzzle.split(''));
    setBoard(puzzle.puzzle.split(''));
    setSolution(puzzle.solution);
    setTimeElapsed(0);
    setActiveSessionElapsed(0);
    setStartTime(Date.now());
    setGameState('playing');
    saveDraft(puzzle.puzzle, puzzle.puzzle, puzzle.solution, 0);
  };

  const resumeGame = () => {
    if (!savedState) return;
    setInitialBoard(savedState.puzzle.split(''));
    setBoard(savedState.current.split(''));
    setSolution(savedState.solution);
    setTimeElapsed(savedState.timeElapsed || 0);
    setActiveSessionElapsed(0);
    setStartTime(Date.now());
    setGameState('playing');
  };

  const saveDraft = (init: string, curr: string, sol: string, time: number) => {
    socket.emit('sudoku-save', { 
      name: playerName, 
      state: { puzzle: init, current: curr, solution: sol, timeElapsed: time } 
    });
  };

  const handleChange = (index: number, val: string) => {
    if (initialBoard[index] !== '-') return;
    if (!/^[1-9]?$/.test(val)) return;

    const newBoard = [...board];
    newBoard[index] = val === '' ? '-' : val;
    setBoard(newBoard);

    // Auto save
    saveDraft(initialBoard.join(''), newBoard.join(''), solution, timeElapsed + activeSessionElapsed);

    // Check win
    const currentString = newBoard.join('');
    if (!currentString.includes('-') && currentString === solution) {
      handleWin();
    }
  };

  const handleWin = () => {
    setGameState('won');
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    socket.emit('sudoku-win', { name: playerName });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (gameState === 'login') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <Grid3X3 size={60} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <h1 className="responsive-title" style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>SUDOKU</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Enter your name to start a new game or resume a saved one.
          </p>
          <input 
            className="input-field" 
            placeholder="Enter your name" 
            value={playerName} 
            onChange={e => setPlayerName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center' }}
          />
          <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%', background: 'var(--accent)', border: 'none', color: 'white' }} disabled={!playerName.trim()}>
            Play Sudoku
          </button>
          <button className="btn btn-outline" onClick={onBack} style={{ width: '100%', marginTop: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'resume-prompt') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Welcome Back, {playerName}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            We found an incomplete Sudoku game saved under your name (Time: {formatTime(savedState?.timeElapsed || 0)}). Would you like to resume?
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={startNewGame} style={{ flex: 1 }}>
              Start New Game
            </button>
            <button className="btn btn-primary" onClick={resumeGame} style={{ flex: 1, background: 'var(--accent)', border: 'none', color: 'white' }}>
              Resume Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => {
            // Save current time before quitting
            if (gameState === 'playing') {
              saveDraft(initialBoard.join(''), board.join(''), solution, timeElapsed + activeSessionElapsed);
            }
            onBack();
          }} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
            ← Quit
          </button>
          <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}>
            <Grid3X3 /> Sudoku
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TIME ELAPSED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>
            {formatTime(displayTime)}
          </div>
        </div>
      </div>

      <div className="mobile-column" style={{ flex: 1, display: 'flex', gap: '2rem', padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', justifyContent: 'center', alignItems: 'center' }}>

        
        {/* Play Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '600px' }}>
          {gameState === 'won' ? (
            <div className="card animate-fade-in" style={{ padding: '3rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)', width: '100%', marginBottom: '2rem' }}>
              <CheckCircle size={60} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
              <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 950 }}>Puzzle Solved!</h2>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>You completed it in <strong>{formatTime(displayTime)}</strong>.</p>
              <button className="btn btn-primary" onClick={startNewGame} style={{ padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 950, background: 'var(--success)', border: 'none' }}>
                <RotateCcw size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Play Again
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              background: 'var(--item-border)',
              padding: '4px',
              borderRadius: '8px',
              border: '2px solid var(--item-border)',
              width: 'min(100%, 500px)',
              aspectRatio: '1',
              gap: '1px'
            }}>
              {board.map((cell, idx) => {
                const row = Math.floor(idx / 9);
                const col = idx % 9;
                const isGiven = initialBoard[idx] !== '-';
                
                // Add thicker borders around 3x3 blocks
                const borderRight = col % 3 === 2 && col !== 8 ? '2px solid var(--text-primary)' : '1px solid var(--item-border)';
                const borderBottom = row % 3 === 2 && row !== 8 ? '2px solid var(--text-primary)' : '1px solid var(--item-border)';

                return (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={cell === '-' ? '' : cell}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    disabled={isGiven || gameState !== 'playing'}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: isGiven ? 'var(--item-bg)' : 'var(--bg-secondary)',
                      color: isGiven ? 'var(--text-secondary)' : 'var(--accent)',
                      border: 'none',
                      borderRight,
                      borderBottom,
                      textAlign: 'center',
                      fontSize: 'clamp(1rem, 4vw, 1.5rem)',
                      fontWeight: isGiven ? 700 : 950,

                      outline: 'none',
                      cursor: isGiven ? 'default' : 'text'
                    }}
                    onFocus={e => !isGiven && (e.target.style.background = 'var(--accent-glow)')}
                    onBlur={e => !isGiven && (e.target.style.background = 'var(--bg-secondary)')}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard Column */}
        <div style={{ width: '100%', maxWidth: '350px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, justifyContent: 'center' }}>
             <Trophy size={18} color="#fbbf24" /> Sudoku Masters
          </h3>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
            {Object.entries(leaderboard || {}).length > 0 ? (
              Object.entries(leaderboard)
                .sort((a, b) => b[1] - a[1])
                .map(([name, wins], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: i % 2 === 0 ? 'var(--item-bg)' : 'transparent', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 900, minWidth: '20px' }}>#{i+1}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{name}</span>
                  </div>
                  <div style={{ color: 'var(--success)', fontWeight: 800 }}>
                    {wins} {wins === 1 ? 'win' : 'wins'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No masters yet. Solve a puzzle!</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
