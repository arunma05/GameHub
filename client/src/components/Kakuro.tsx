import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Trophy, CheckCircle, RotateCcw, HelpCircle, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Player, Room } from '../types';

interface KakuroProps {
  room: Room | null;
  me: Player | null;
  leaderboard: Record<string, number>;
}

type Cell =
  | { type: 'blocked' }
  | { type: 'hint'; h?: number; v?: number }
  | { type: 'entry'; value: string; solution: number };

interface Level {
  grid: (Cell | null)[][];
  id: number;
  difficulty: number | 'All';
}

function isValidKakuro(board: (Cell | null)[][]): boolean {
  for (let rIdx = 0; rIdx < board.length; rIdx++) {
    for (let cIdx = 0; cIdx < board[rIdx].length; cIdx++) {
      const cell = board[rIdx][cIdx];
      if (!cell || cell.type !== 'entry') continue;
      if (!cell.value) return false;
      
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
        if (segmentVals.length !== new Set(segmentVals).size) return false;
        if (hHint && sum !== hHint) return false;
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
        if (segmentVals.length !== new Set(segmentVals).size) return false;
        if (vHint && sum !== vHint) return false;
      }
    }
  }
  return true;
}

function generateKakuro(seed: number, forcedDifficulty: 'All' | number): Level {
  let t = seed;
  const random = () => {
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const diffPool = forcedDifficulty === 'All' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [forcedDifficulty];
  const difficulty = diffPool[Math.floor(random() * diffPool.length)] as number;

  let size = 6;
  let blockerCount = 4;
  
  if (difficulty === 1) { size = 5; blockerCount = 2; }
  else if (difficulty === 2) { size = 5; blockerCount = 3; }
  else if (difficulty === 3) { size = 6; blockerCount = 4; }
  else if (difficulty === 4) { size = 6; blockerCount = 6; }
  else if (difficulty === 5) { size = 7; blockerCount = 8; }
  else if (difficulty === 6) { size = 7; blockerCount = 10; }
  else if (difficulty === 7) { size = 8; blockerCount = 12; }
  else if (difficulty === 8) { size = 8; blockerCount = 16; }
  else if (difficulty === 9) { size = 9; blockerCount = 20; }
  else if (difficulty === 10) { size = 10; blockerCount = 28; }

  const grid: (Cell | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  
  for (let i = 0; i < size; i++) {
    grid[0][i] = { type: 'blocked' };
    grid[i][0] = { type: 'blocked' };
  }
  
  let blockersAdded = 0;
  let attempts = 0;
  while (blockersAdded < blockerCount && attempts < 100) {
    let r = Math.floor(random() * (size - 1)) + 1;
    let c = Math.floor(random() * (size - 1)) + 1;
    if (grid[r][c] === null) {
      grid[r][c] = { type: 'blocked' };
      blockersAdded++;
    }
    attempts++;
  }
  
  for (let r = 1; r < size; r++) {
    for (let c = 1; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = { type: 'entry', value: '', solution: 0 };
    }
  }
  
  const fillBoard = (r: number, c: number): boolean => {
    if (r >= size) return true;
    if (c >= size) return fillBoard(r + 1, 1);
    if (grid[r][c]?.type === 'blocked') return fillBoard(r, c + 1);
    
    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => random() - 0.5);
    for (let num of nums) {
      let hValid = true;
      for (let j = c - 1; j >= 0; j--) {
        const cell = grid[r][j];
        if (cell?.type === 'blocked' || cell?.type === 'hint') break;
        if (cell?.type === 'entry' && cell.solution === num) hValid = false;
      }
      if (!hValid) continue;
      
      let vValid = true;
      for (let i = r - 1; i >= 0; i--) {
        const cell = grid[i][c];
        if (cell?.type === 'blocked' || cell?.type === 'hint') break;
        if (cell?.type === 'entry' && cell.solution === num) vValid = false;
      }
      if (!vValid) continue;
      
      (grid[r][c] as any).solution = num;
      if (fillBoard(r, c + 1)) return true;
      (grid[r][c] as any).solution = 0;
    }
    return false;
  };

  if (!fillBoard(1, 1)) return generateKakuro(seed + 1, forcedDifficulty);

  for (let r = 1; r < size; r++) {
    for (let c = 1; c < size; c++) {
      if (grid[r][c]?.type === 'entry') {
        const left = grid[r][c - 1];
        if (left?.type === 'blocked' || left?.type === 'hint') {
          let sum = 0; let len = 0;
          for (let j = c; j < size; j++) {
            if (grid[r][j]?.type === 'entry') { sum += (grid[r][j] as any).solution; len++; }
            else break;
          }
          if (len > 0) {
            if (left?.type === 'blocked') grid[r][c - 1] = { type: 'hint' };
            (grid[r][c - 1] as any).h = sum;
          }
        }
        
        const top = grid[r - 1][c];
        if (top?.type === 'blocked' || top?.type === 'hint') {
          let sum = 0; let len = 0;
          for (let i = r; i < size; i++) {
            if (grid[i][c]?.type === 'entry') { sum += (grid[i][c] as any).solution; len++; }
            else break;
          }
          if (len > 0) {
            if (top?.type === 'blocked') grid[r - 1][c] = { type: 'hint' };
            (grid[r - 1][c] as any).v = sum;
          }
        }
      }
    }
  }

  let hasHints = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]?.type === 'hint') hasHints = true;
    }
  }
  if (!hasHints) return generateKakuro(seed + 2, forcedDifficulty);

  return { grid, difficulty, id: seed };
}

export const Kakuro: React.FC<KakuroProps> = ({ room, me, leaderboard }) => {
  const [board, setBoard] = useState<(Cell | null)[][]>(() => {
    if (room && room.gameData) {
      const seed = (room.gameData as any).seed || Math.floor(Math.random() * 2147483647);
      const level = (room.gameData as any).level || 1;
      return generateKakuro(seed, level).grid;
    }
    return generateKakuro(Math.floor(Math.random() * 2147483647), 1).grid;
  });
  const [isWon, setIsWon] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (room && room.gameState === 'playing' && room.gameData) {
      const seed = (room.gameData as any).seed || Math.floor(Math.random() * 2147483647);
      const level = (room.gameData as any).level || 1;
      setBoard(generateKakuro(seed, level).grid);
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsWon(false);
    }
  }, [room?.gameState, (room?.gameData as any)?.seed]);

  useEffect(() => {
    if (room?.gameState === 'playing' || !room) {
      const interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room?.gameState, startTime]);

  const startNewGame = () => {
    if (room) {
      socket.emit('start-game', { roomId: room.id });
    } else {
      setBoard(generateKakuro(Math.floor(Math.random() * 2147483647), 1).grid);
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsWon(false);
    }
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
    if (isValidKakuro(currentBoard)) {
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
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', zIndex: 10 }}>
        <div style={{ background: 'var(--accent-glow)', padding: '0.4rem 1.5rem', borderRadius: '12px', border: '1px solid var(--accent)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 950, letterSpacing: '0.1em' }}>TIMER</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeElapsed)}</div>
        </div>
      </div>

      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* Main Area: Puzzle */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', minWidth: 0 }}>
            {isWon ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)', borderRadius: '24px', width: '100%', maxWidth: '500px' }}>
                <CheckCircle size={56} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 950 }}>SOLVED!</h2>
                <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Final Time: {formatTime(timeElapsed)}</p>
                <button className="btn btn-primary" onClick={startNewGame} style={{ background: 'var(--success)', border: 'none', fontWeight: 950, padding: '1rem 2rem' }}>
                   <RotateCcw size={18} style={{ display: 'inline', marginRight: '0.5rem' }} /> PLAY AGAIN
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${board[0].length}, clamp(32px, calc((min(90vw, 600px) - ${board[0].length * 6}px) / ${board[0].length}), 60px))`,
                gridTemplateRows: `repeat(${board.length}, clamp(32px, calc((min(90vw, 600px) - ${board.length * 6}px) / ${board.length}), 60px))`,
                background: 'var(--item-bg)',
                padding: '8px',
                borderRadius: '24px',
                border: '1px solid var(--item-border)',
                boxShadow: 'var(--card-shadow)',
                gap: '4px',
                width: 'fit-content',
                margin: '0 auto'
              }}>
                {board.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    if (!cell || cell.type === 'blocked') {
                      return <div key={`${rIdx}-${cIdx}`} style={{ background: 'var(--bg-secondary)', borderRadius: '10px', opacity: 0.3 }} />;
                    }
                    if (cell.type === 'hint') {
                      const segmentData = cell.h ? (() => {
                        let s = 0; let filled = true;
                        for (let j = cIdx + 1; j < board[rIdx].length; j++) {
                          const next = board[rIdx][j];
                          if (!next || next.type !== 'entry') break;
                          if (!next.value) filled = false;
                          s += (parseInt(next.value) || 0);
                        }
                        return { sum: s, isFilled: filled };
                      })() : { sum: 0, isFilled: false };

                      const vSegmentData = cell.v ? (() => {
                        let s = 0; let filled = true;
                        for (let i = rIdx + 1; i < board.length; i++) {
                          const next = board[i][cIdx];
                          if (!next || next.type !== 'entry') break;
                          if (!next.value) filled = false;
                          s += (parseInt(next.value) || 0);
                        }
                        return { sum: s, isFilled: filled };
                      })() : { sum: 0, isFilled: false };

                      const hColor = cell.h ? (segmentData.isFilled && segmentData.sum === cell.h ? 'var(--success)' : segmentData.sum > cell.h ? 'var(--error)' : 'var(--text-primary)') : 'var(--text-primary)';
                      const vColor = cell.v ? (vSegmentData.isFilled && vSegmentData.sum === cell.v ? 'var(--success)' : vSegmentData.sum > cell.v ? 'var(--error)' : 'var(--text-secondary)') : 'var(--text-secondary)';

                      return (
                        <div key={`${rIdx}-${cIdx}`} style={{
                          background: 'var(--item-bg)',
                          borderRadius: '10px',
                          border: '1px solid var(--item-border)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top right, transparent 48%, var(--item-border) 48%, var(--item-border) 52%, transparent 52%)' }} />
                          {cell.v && <span style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: 'clamp(0.5rem, 1.8vw, 0.75rem)', color: vColor, fontWeight: 950 }}>{cell.v}</span>}
                          {cell.h && <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: 'clamp(0.5rem, 1.8vw, 0.75rem)', color: hColor, fontWeight: 950 }}>{cell.h}</span>}
                        </div>
                      );
                    }

                    const val = cell.value;
                    let isInvalid = false;
                    if (val) {
                      // Simple check for duplicates in segment
                      let hHintPos = -1;
                      for (let j = cIdx - 1; j >= 0; j--) {
                        if (board[rIdx][j]?.type === 'hint') { hHintPos = j; break; }
                        if (board[rIdx][j]?.type === 'blocked') break;
                      }
                      if (hHintPos !== -1) {
                        let segmentVals: string[] = [];
                        for (let j = hHintPos + 1; j < board[rIdx].length; j++) {
                          const next = board[rIdx][j];
                          if (!next || next.type !== 'entry') break;
                          if (next.value) segmentVals.push(next.value);
                        }
                        if (segmentVals.filter(v => v === val).length > 1) isInvalid = true;
                      }
                      let vHintPos = -1;
                      for (let i = rIdx - 1; i >= 0; i--) {
                        if (board[i][cIdx]?.type === 'hint') { vHintPos = i; break; }
                        if (board[i][cIdx]?.type === 'blocked') break;
                      }
                      if (vHintPos !== -1) {
                        let segmentVals: string[] = [];
                        for (let i = vHintPos + 1; i < board.length; i++) {
                          const next = board[i][cIdx];
                          if (!next || next.type !== 'entry') break;
                          if (next.value) segmentVals.push(next.value);
                        }
                        if (segmentVals.filter(v => v === val).length > 1) isInvalid = true;
                      }
                    }

                    return (
                      <input
                        key={`${rIdx}-${cIdx}`}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        style={{
                          width: '100%', height: '100%', textAlign: 'center', fontSize: 'clamp(0.7rem, 2.5vw, 1.3rem)', fontWeight: 950,
                          background: isInvalid ? 'var(--error-glow)' : 'var(--card-bg)',
                          color: isInvalid ? 'var(--error)' : 'var(--accent)',
                          border: isInvalid ? '2px solid var(--error)' : '1px solid var(--item-border)',
                          borderRadius: '10px', transition: 'all 0.1s', outline: 'none'
                        }}
                      />
                    );
                  })
                )}
              </div>
              </div>
            )}
          </div>

          {/* Sidebar: Stats and Leaderboard */}
          <div className="dashboard-sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Activity size={18} color="var(--accent)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase' }}>CHALLENGE</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>
                  {room?.gameData && (room.gameData as any).level === 'All' ? 'Random Difficulty' : `Level ${(room?.gameData as any)?.level || 1}`}
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)' }}>
                  <HelpCircle size={18} />
                  <span style={{ fontWeight: 950, fontSize: '0.85rem' }}>QUICK GUIDE</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  • Place digits <strong style={{ color: 'var(--text-primary)' }}>1-9</strong>.<br />
                  • Sum each run to match its clue.<br />
                  • No duplicate digits per run.
                </p>
              </div>

              <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
                   <Trophy size={20} color="#fbbf24" />
                   <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Masters</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(leaderboard).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, wins], i) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: i < 3 ? 'var(--accent-glow)' : 'var(--item-bg)', borderRadius: '12px', border: i < 3 ? '1px solid var(--accent)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 950, fontSize: '0.75rem' }}>#{i+1}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>{name}</span>
                      </div>
                      <span style={{ color: '#fbbf24', fontWeight: 950, fontSize: '0.85rem' }}>{wins}🏆</span>
                    </div>
                  ))}
                  {Object.entries(leaderboard).length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--item-border)', borderRadius: '12px', fontSize: '0.8rem' }}>No champions yet</div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Kakuro;
