import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Trophy, CheckCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Player, Room } from '../types';

interface KakuroProps {
  room: Room | null;
  me: Player | null;
  leaderboard: Record<string, number>;
  onBack: () => void;
}

type Cell = 
  | { type: 'blocked' } 
  | { type: 'hint'; h?: number; v?: number } 
  | { type: 'entry'; value: string; solution: number };

interface Level {
  grid: (Cell | null)[][];
  id: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    grid: [
      [{ type: 'blocked' }, { type: 'hint', v: 4 }, { type: 'hint', v: 3 }, { type: 'blocked' }, { type: 'hint', v: 12 }, { type: 'hint', v: 10 }],
      [{ type: 'hint', h: 4 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 1 }, { type: 'hint', h: 11 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 4 }],
      [{ type: 'hint', h: 3 }, { type: 'entry', value: '', solution: 1 }, { type: 'entry', value: '', solution: 2 }, { type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 4 }, { type: 'entry', value: '', solution: 6 }],
      [{ type: 'blocked' }, { type: 'hint', v: 10 }, { type: 'hint', v: 8 }, { type: 'hint', h: 7 }, { type: 'entry', value: '', solution: 5 }, { type: 'entry', value: '', solution: 2 }],
      [{ type: 'hint', h: 11 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 5 }, { type: 'entry', value: '', solution: 2 }, { type: 'entry', value: '', solution: 1 }, { type: 'blocked' }],
      [{ type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 3 }, { type: 'blocked' }, { type: 'blocked' }, { type: 'blocked' }]
    ]
  },
  {
    id: 2,
    grid: [
      [{ type: 'blocked' }, { type: 'hint', v: 11 }, { type: 'hint', v: 16 }, { type: 'blocked' }, { type: 'hint', v: 4 }, { type: 'hint', v: 7 }],
      [{ type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 2 }, { type: 'entry', value: '', solution: 8 }, { type: 'hint', h: 3 }, { type: 'entry', value: '', solution: 1 }, { type: 'entry', value: '', solution: 2 }],
      [{ type: 'hint', h: 17 }, { type: 'entry', value: '', solution: 9 }, { type: 'entry', value: '', solution: 8 }, { type: 'hint', h: 8 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 5 }],
      [{ type: 'blocked' }, { type: 'hint', v: 4 }, { type: 'hint', v: 8 }, { type: 'hint', h: 7 }, { type: 'entry', value: '', solution: 6 }, { type: 'entry', value: '', solution: 1 }],
      [{ type: 'hint', h: 12 }, { type: 'entry', value: '', solution: 1 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 5 }, { type: 'entry', value: '', solution: 3 }, { type: 'blocked' }],
      [{ type: 'hint', h: 11 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 8 }, { type: 'blocked' }, { type: 'blocked' }, { type: 'blocked' }]
    ]
  },
  {
    id: 3,
    grid: [
      [{ type: 'blocked' }, { type: 'hint', v: 17 }, { type: 'hint', v: 10 }, { type: 'blocked' }, { type: 'hint', v: 23 }, { type: 'hint', v: 11 }],
      [{ type: 'hint', h: 16 }, { type: 'entry', value: '', solution: 9 }, { type: 'entry', value: '', solution: 7 }, { type: 'hint', h: 24 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 9 }],
      [{ type: 'hint', h: 11 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 3 }, { type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 2 }],
      [{ type: 'blocked' }, { type: 'hint', v: 12 }, { type: 'hint', v: 7 }, { type: 'hint', h: 14 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 1 }],
      [{ type: 'hint', h: 22 }, { type: 'entry', value: '', solution: 4 }, { type: 'entry', value: '', solution: 2 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 9 }, { type: 'blocked' }],
      [{ type: 'hint', h: 15 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 5 }, { type: 'blocked' }, { type: 'blocked' }, { type: 'blocked' }]
    ]
  },
  {
    id: 4,
    grid: [
      [{ type: 'blocked' }, { type: 'hint', v: 3 }, { type: 'hint', v: 15 }, { type: 'blocked' }, { type: 'hint', v: 10 }, { type: 'hint', v: 14 }],
      [{ type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 1 }, { type: 'entry', value: '', solution: 9 }, { type: 'hint', h: 12 }, { type: 'entry', value: '', solution: 4 }, { type: 'entry', value: '', solution: 8 }],
      [{ type: 'hint', h: 8 }, { type: 'entry', value: '', solution: 2 }, { type: 'entry', value: '', solution: 6 }, { type: 'hint', h: 12 }, { type: 'entry', value: '', solution: 6 }, { type: 'entry', value: '', solution: 6 }],
      [{ type: 'blocked' }, { type: 'hint', v: 24 }, { type: 'hint', v: 11 }, { type: 'hint', h: 14 }, { type: 'entry', value: '', solution: 9 }, { type: 'entry', value: '', solution: 5 }],
      [{ type: 'hint', h: 21 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 5 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 1 }, { type: 'blocked' }],
      [{ type: 'hint', h: 12 }, { type: 'entry', value: '', solution: 8 }, { type: 'entry', value: '', solution: 4 }, { type: 'blocked' }, { type: 'blocked' }, { type: 'blocked' }]
    ]
  },
  {
    id: 5,
    grid: [
      [{ type: 'blocked' }, { type: 'hint', v: 12 }, { type: 'hint', v: 23 }, { type: 'blocked' }, { type: 'hint', v: 11 }, { type: 'hint', v: 30 }],
      [{ type: 'hint', h: 15 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 8 }, { type: 'hint', h: 29 }, { type: 'entry', value: '', solution: 4 }, { type: 'entry', value: '', solution: 9 }],
      [{ type: 'hint', h: 20 }, { type: 'entry', value: '', solution: 5 }, { type: 'entry', value: '', solution: 6 }, { type: 'hint', h: 12 }, { type: 'entry', value: '', solution: 7 }, { type: 'entry', value: '', solution: 8 }],
      [{ type: 'blocked' }, { type: 'hint', v: 4 }, { type: 'hint', v: 17 }, { type: 'hint', h: 25 }, { type: 'entry', value: '', solution: 9 }, { type: 'entry', value: '', solution: 8 }],
      [{ type: 'hint', h: 28 }, { type: 'entry', value: '', solution: 3 }, { type: 'entry', value: '', solution: 9 }, { type: 'entry', value: '', solution: 6 }, { type: 'entry', value: '', solution: 5 }, { type: 'blocked' }],
      [{ type: 'hint', h: 10 }, { type: 'entry', value: '', solution: 1 }, { type: 'entry', value: '', solution: 2 }, { type: 'blocked' }, { type: 'blocked' }, { type: 'blocked' }]
    ]
  }
];

export const Kakuro: React.FC<KakuroProps> = ({ room, me, leaderboard, onBack }) => {
  const [board, setBoard] = useState<(Cell | null)[][]>(() => {
    const randomLevel = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    return JSON.parse(JSON.stringify(randomLevel.grid));
  });
  const [isWon, setIsWon] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (room && room.gameState === 'playing') {
      const idx = (room as any).gameData?.level ?? Math.floor(Math.random() * LEVELS.length);
      const level = LEVELS[idx % LEVELS.length];
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsWon(false);
      setBoard(JSON.parse(JSON.stringify(level.grid)));
    }
  }, [room?.gameState]);

  useEffect(() => {
    if (room?.gameState === 'playing' || !room) {
      const interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room?.gameState, startTime]);

  const startNewGame = () => {
    const randomLevel = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    setBoard(JSON.parse(JSON.stringify(randomLevel.grid)));
    setStartTime(Date.now());
    setTimeElapsed(0);
    setIsWon(false);
  };

  const handleCellChange = (r: number, c: number, val: string) => {
    if (!/^[1-9]?$/.test(val)) return;
    const newBoard = [...board.map(row => [...row])];
    const cell = newBoard[r][c];
    if (cell && cell.type === 'entry') {
      cell.value = val;
      setBoard(newBoard);
      checkWin(newBoard);
    }
  };

  const checkWin = (currentBoard: (Cell | null)[][]) => {
    let allCorrect = true;
    currentBoard.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.type === 'entry') {
          if (parseInt(cell.value) !== cell.solution) {
            allCorrect = false;
          }
        }
      });
    });

    if (allCorrect) {
      setIsWon(true);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      if (room) {
        socket.emit('kakuro-win', { roomId: room.id, name: me?.name });
      } else {
        socket.emit('kakuro-win', { name: me?.name });
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      overflowY: 'auto', 
      background: 'radial-gradient(circle at top left, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
      color: 'var(--text-primary)',
      position: 'relative'
    }}>
      <style>{`
        .kakuro-container {
          display: flex;
          padding: 1.5rem 2.5rem;
          gap: 2rem;
          flex: 1;
          justify-content: center;
          align-items: flex-start;
          flex-direction: row;
        }
        .puzzle-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1;
        }
        .kakuro-grid {
          display: grid;
          --cell-size: 60px;
          grid-template-columns: repeat(${board[0].length}, var(--cell-size));
          grid-template-rows: repeat(${board.length}, var(--cell-size));
          background: var(--item-bg);
          padding: 12px;
          border-radius: 20px;
          border: 1px solid var(--item-border);
          boxShadow: var(--card-shadow);
          backdrop-filter: blur(8px);
          gap: 4px;
        }
        .kakuro-cell {
          width: var(--cell-size);
          height: var(--cell-size);
        }
        .kakuro-sidebar {
          width: 300px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          z-index: 1;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .kakuro-container {
            flex-direction: column;
            align-items: center;
            padding: 1rem;
          }
          .kakuro-sidebar {
            width: 100%;
            max-width: 500px;
          }
        }
        @media (max-width: 600px) {
          .kakuro-grid {
            --cell-size: calc(88vw / ${board[0].length});
            padding: 8px;
            border-radius: 16px;
          }
           .kakuro-header {
             padding: 0.75rem 1rem !important;
          }
        }
        @media (max-height: 700px) {
           .kakuro-grid {
             --cell-size: 50px;
           }
        }
      `}</style>

      {/* Header */}
      <div className="kakuro-header" style={{ 
        padding: '1.25rem 2.5rem', 
        background: 'var(--card-bg)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--item-border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onBack} 
            className="btn"
            style={{ 
              background: 'var(--item-bg)', 
              border: '1px solid var(--item-border)',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="kakuro-title" style={{ 
              margin: 0, 
              fontSize: '1.4rem',
              background: 'linear-gradient(to right, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900,
              letterSpacing: '-0.02em'
            }}>
              KAKURO MASTER
            </h2>
            {room && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>ROOM: {room.id}</span>}
          </div>
        </div>
        
        <div style={{ 
          background: 'rgba(99, 102, 241, 0.1)', 
          padding: '0.5rem 1rem', 
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TIMER</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 950, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeElapsed)}</div>
        </div>
      </div>

      <div className="kakuro-container">
        {/* Background Decoration */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px', background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'var(--success)', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Puzzle Area */}
        <div className="puzzle-wrapper">
          {isWon ? (
            <div className="animate-fade-in" style={{ 
              padding: '2.5rem', 
              textAlign: 'center', 
              background: 'rgba(16, 185, 129, 0.1)', 
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.2)',
              width: '100%',
              maxWidth: '500px'
            }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                <CheckCircle size={60} color="#10b981" />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#10b981', filter: 'blur(30px)', opacity: 0.3, zIndex: -1 }} />
              </div>
              <h1 style={{ color: 'var(--success)', fontSize: '2.5rem', fontWeight: 950, margin: 0 }}>Solved!</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)', opacity: 0.8, marginTop: '0.5rem' }}>Final Time: <span style={{ fontWeight: 800 }}>{formatTime(timeElapsed)}</span></p>
              <button 
                className="btn" 
                onClick={startNewGame} 
                style={{ 
                  marginTop: '2rem',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 800,
                  background: 'linear-gradient(to right, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  margin: '2rem auto 0 auto'
                }}
              >
                <RotateCcw size={20} /> Play Again
              </button>
            </div>
          ) : (
            <div className="kakuro-grid">
              {board.map((row, rIdx) => 
                row.map((cell, cIdx) => {
                  if (!cell || cell.type === 'blocked') {
                    return <div key={`${rIdx}-${cIdx}`} className="kakuro-cell" style={{ 
                      background: 'var(--item-bg)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--item-border)',
                      opacity: 1
                    }} />;
                  }
                  if (cell.type === 'hint') {
                    const segmentData = cell.h ? (() => {
                      let s = 0;
                      let filled = true;
                      for (let j = cIdx + 1; j < board[rIdx].length; j++) {
                        const next = board[rIdx][j];
                        if (!next || next.type !== 'entry') break;
                        const val = parseInt(next.value) || 0;
                        if (!next.value) filled = false;
                        s += val;
                      }
                      return { sum: s, isFilled: filled };
                    })() : { sum: 0, isFilled: false };

                    const vSegmentData = cell.v ? (() => {
                      let s = 0;
                      let filled = true;
                      for (let i = rIdx + 1; i < board.length; i++) {
                        const next = board[i][cIdx];
                        if (!next || next.type !== 'entry') break;
                        const val = parseInt(next.value) || 0;
                        if (!next.value) filled = false;
                        s += val;
                      }
                      return { sum: s, isFilled: filled };
                    })() : { sum: 0, isFilled: false };

                    const hColor = cell.h ? (segmentData.isFilled && segmentData.sum === cell.h ? 'var(--success)' : segmentData.sum > cell.h ? 'var(--error)' : 'var(--text-primary)') : 'var(--text-primary)';
                    const vColor = cell.v ? (vSegmentData.isFilled && vSegmentData.sum === cell.v ? 'var(--success)' : vSegmentData.sum > cell.v ? 'var(--error)' : 'var(--text-secondary)') : 'var(--text-secondary)';

                    return (
                      <div key={`${rIdx}-${cIdx}`} className="kakuro-cell" style={{ 
                        background: 'var(--item-bg)', 
                        borderRadius: '8px',
                        border: '1px solid var(--item-border)', 
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'linear-gradient(to top right, transparent 48%, var(--text-secondary) 48%, var(--text-secondary) 52%, transparent 52%)',
                          opacity: 0.4
                        }} />
                        {cell.v && (
                          <span className="hint-text" style={{ 
                            position: 'absolute', bottom: '6px', left: '8px', fontSize: '15px', 
                            color: vColor, fontWeight: 950,
                            textShadow: (vColor.includes('var(--success)') || vColor.includes('var(--error)')) ? `0 0 10px ${vColor}aa` : 'none'
                          }}>{cell.v}</span>
                        )}
                        {cell.h && (
                          <span className="hint-text" style={{ 
                            position: 'absolute', top: '6px', right: '8px', fontSize: '15px', 
                            color: hColor, fontWeight: 950,
                            textShadow: (hColor.includes('var(--success)') || hColor.includes('var(--error)')) ? `0 0 10px ${hColor}aa` : 'none'
                          }}>{cell.h}</span>
                        )}
                      </div>
                    );
                  }

                  const isInvalid = (() => {
                    if (cell.type !== 'entry' || !cell.value) return false;
                    const val = cell.value;
                    let hHintPos = -1;
                    for (let j = cIdx - 1; j >= 0; j--) {
                      if (board[rIdx][j]?.type === 'hint') { hHintPos = j; break; }
                      if (board[rIdx][j]?.type === 'blocked') break;
                    }
                    if (hHintPos !== -1) {
                      let segmentVals: string[] = [];
                      let sum = 0;
                      const hHint = (board[rIdx][hHintPos] as any).h;
                      for (let j = hHintPos + 1; j < board[rIdx].length; j++) {
                        const next = board[rIdx][j];
                        if (!next || next.type !== 'entry') break;
                        if (next.value) { segmentVals.push(next.value); sum += parseInt(next.value); }
                      }
                      if (segmentVals.filter(v => v === val).length > 1) return true;
                      if (hHint && sum > hHint) return true;
                    }
                    let vHintPos = -1;
                    for (let i = rIdx - 1; i >= 0; i--) {
                      if (board[i][cIdx]?.type === 'hint') { vHintPos = i; break; }
                      if (board[i][cIdx]?.type === 'blocked') break;
                    }
                    if (vHintPos !== -1) {
                      let segmentVals: string[] = [];
                      let sum = 0;
                      const vHint = (board[vHintPos][cIdx] as any).v;
                      for (let i = vHintPos + 1; i < board.length; i++) {
                        const next = board[i][cIdx];
                        if (!next || next.type !== 'entry') break;
                        if (next.value) { segmentVals.push(next.value); sum += parseInt(next.value); }
                      }
                      if (segmentVals.filter(v => v === val).length > 1) return true;
                      if (vHint && sum > vHint) return true;
                    }
                    return false;
                  })();

                  return (
                    <input
                      key={`${rIdx}-${cIdx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={cell.value}
                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                      className="kakuro-input"
                      style={{
                        width: '100%',
                        height: '100%',
                        textAlign: 'center',
                        fontSize: '24px',
                        fontWeight: 900,
                        background: isInvalid ? 'var(--error-glow)' : 'var(--card-bg)',
                        color: isInvalid ? 'var(--error)' : 'var(--text-primary)',
                        border: isInvalid ? '2px solid var(--error)' : '1px solid var(--item-border)',
                        borderRadius: '12px',
                        outline: 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isInvalid ? '0 0 15px var(--error-glow)' : 'inset 0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onFocus={e => e.target.style.transform = 'scale(1.05)'}
                      onBlur={e => e.target.style.transform = 'scale(1)'}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="kakuro-sidebar">
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--card-bg)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800 }}>
              <div style={{ width: '6px', height: '14px', background: 'var(--error)', borderRadius: '3px' }} /> Rules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • Digits <strong style={{color:'var(--text-primary)'}}>1-9</strong> only. No duplicates.<br/>
                • Sum must match clue. Errors glow <strong style={{color:'var(--error)'}}>red</strong>.
              </p>
            </div>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--card-bg)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800 }}>
              <Trophy size={20} color="#fbbf24" /> Rankings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(leaderboard).sort((a,b) => b[1] - a[1]).slice(0,3).map(([name, wins], i) => (
                <div key={name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.75rem 1rem', 
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 900 }}>{i+1}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{name}</span>
                  </div>
                  <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 900 }}>{wins}🏆</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
