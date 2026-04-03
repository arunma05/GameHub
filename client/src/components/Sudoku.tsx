import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { getSudoku } from 'sudoku-gen';
import { Grid3X3, Trophy, CheckCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SudokuProps {
  leaderboard: Record<string, number>;
}

interface SaveState {
  puzzle: string;
  current: string;
  solution: string;
  timeElapsed: number;
}

export const Sudoku: React.FC<SudokuProps> = ({ leaderboard }) => {
  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved).name : '';
  });
  const [gameState, setGameState] = useState<'login' | 'resume-prompt' | 'playing' | 'won'>('login');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');

  const [board, setBoard] = useState<string[]>([]);
  const [initialBoard, setInitialBoard] = useState<string[]>([]);
  const [solution, setSolution] = useState<string>('');

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeSessionElapsed, setActiveSessionElapsed] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const [savedState, setSavedState] = useState<SaveState | null>(null);

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
    const puzzle = getSudoku(difficulty);
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

    saveDraft(initialBoard.join(''), newBoard.join(''), solution, timeElapsed + activeSessionElapsed);

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <Grid3X3 size={60} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 950 }}>SUDOKU</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>Classic 9x9 physical puzzle challenge.</p>
          {!playerName && (
            <input className="input-field" placeholder="YOUR NAME" value={playerName} onChange={e => setPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', marginBottom: '1rem', textAlign: 'center' }} />
          )}
          <div style={{ marginBottom: '2rem' }}>
            <label className="input-label" style={{ fontSize: '0.8rem', textAlign: 'center', display: 'block', marginBottom: '1rem' }}>SELECT DIFFICULTY</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {(['easy', 'medium', 'hard', 'expert'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: '1.15rem 1rem',
                    borderRadius: '16px',
                    border: '2px solid',
                    borderColor: difficulty === d ? 'var(--accent)' : 'var(--item-border)',
                    background: difficulty === d ? 'var(--accent-glow)' : 'var(--item-bg)',
                    color: difficulty === d ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: difficulty === d ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
                    transform: difficulty === d ? 'scale(1.02)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${difficulty === d ? 'var(--accent)' : 'var(--text-secondary)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {difficulty === d && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                    )}
                  </div>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleLogin} 
            style={{ width: '100%', height: '64px', fontWeight: 950, fontSize: '1.1rem', borderRadius: '18px' }} 
            disabled={!playerName.trim()}
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'resume-prompt') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Welcome Back!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>We found a saved game. Resume or start fresh?</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={startNewGame} style={{ flex: 1, height: '50px' }}>NEW GAME</button>
            <button className="btn btn-primary" onClick={resumeGame} style={{ flex: 1, height: '50px' }}>RESUME</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', zIndex: 10 }}>
        <div style={{ textAlign: 'center', background: 'var(--accent-glow)', padding: '0.4rem 1.5rem', borderRadius: '12px', border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 950, letterSpacing: '0.1em' }}>TIMER</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(displayTime)}</div>
        </div>
      </div>

      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', minWidth: 0 }}>
            {gameState === 'won' ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)', borderRadius: '24px', width: '100%', maxWidth: '500px' }}>
                <CheckCircle size={56} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 950 }}>SOLVED!</h2>
                <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Time: {formatTime(displayTime)}</p>
                <button className="btn btn-primary" onClick={startNewGame} style={{ background: 'var(--success)', border: 'none', fontWeight: 950, padding: '1rem 2rem' }}>
                   <RotateCcw size={18} style={{ display: 'inline', marginRight: '0.5rem' }} /> PLAY AGAIN
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                background: 'var(--item-border)',
                padding: '4px',
                borderRadius: '16px',
                border: '2px solid var(--item-border)',
                width: 'min(100%, 500px)',
                aspectRatio: '1',
                gap: '1px'
              }}>
                {board.map((cell, idx) => {
                  const row = Math.floor(idx / 9);
                  const col = idx % 9;
                  const isGiven = initialBoard[idx] !== '-';
                  const borderRight = col % 3 === 2 && col !== 8 ? '2px solid var(--text-primary)' : '1px solid var(--item-border)';
                  const borderBottom = row % 3 === 2 && row !== 8 ? '2px solid var(--text-primary)' : '1px solid var(--item-border)';
                  return (
                    <input key={idx} type="text" maxLength={1} value={cell === '-' ? '' : cell}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      disabled={isGiven || gameState !== 'playing'}
                      style={{
                        width: '100%', height: '100%', background: isGiven ? 'var(--item-bg)' : 'var(--card-bg)',
                        color: isGiven ? 'var(--text-secondary)' : 'var(--accent)',
                        border: 'none', borderRight, borderBottom, textAlign: 'center',
                        fontSize: 'clamp(1rem, 4.5vw, 1.4rem)', fontWeight: isGiven ? 700 : 950, outline: 'none'
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                   <Trophy size={20} color="#fbbf24" />
                   <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sudoku Masters</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(leaderboard || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, wins], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: i < 3 ? 'var(--accent-glow)' : 'var(--item-bg)', borderRadius: '12px', border: i < 3 ? '1px solid var(--accent)' : '1px solid transparent' }}>
                       <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                         <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 950, fontSize: '0.75rem' }}>#{i+1}</span>
                         <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{name}</span>
                       </div>
                       <span style={{ color: 'var(--success)', fontWeight: 950 }}>{wins}🏆</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Sudoku;
