import React, { useState, useEffect } from 'react';
import { Trophy, Grid, Shuffle, Info } from 'lucide-react';
import { socket } from '../socket';
import type { Room, Player } from '../types';

interface GridOrderProps {
  room?: Room;
  me?: Player;
  leaderboard: Record<string, number>;
}

type TileType = number | null; // null for the empty slot

export const GridOrder: React.FC<GridOrderProps> = ({ room, me, leaderboard }) => {
  const [gridSize, setGridSize] = useState(3);
  const [board, setBoard] = useState<TileType[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);

  // Initialize board for single-player OR sync with room data for multiplayer
  useEffect(() => {
    if (room && room.gameState === 'playing' && room.gameData && (room.gameData as any).board) {
      const b = (room.gameData as any).board as TileType[];
      setBoard(b);
      setGridSize(Math.sqrt(b.length));
      setIsActive(true);
      setMoves(0);
    } else if (!room) {
      // Single player initial state
      initializeGame(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    let interval: any;
    if (isActive && !isGameFinished) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isGameFinished]);

  const initializeGame = (size: number) => {
    const tiles: TileType[] = [];
    for (let i = 1; i < size * size; i++) tiles.push(i);
    tiles.push(null);

    // Shuffle board by making valid moves to ensure solvability
    let shuffled = [...tiles];
    let emptyIndex = size * size - 1;
    let movesToMake = size * size * 20;

    const getNeighbors = (index: number, s: number) => {
        const neighbors: number[] = [];
        const row = Math.floor(index / s);
        const col = index % s;
        if (row > 0) neighbors.push(index - s);
        if (row < s - 1) neighbors.push(index + s);
        if (col > 0) neighbors.push(index - 1);
        if (col < s - 1) neighbors.push(index + 1);
        return neighbors;
    };

    for (let i = 0; i < movesToMake; i++) {
      const neighbors = getNeighbors(emptyIndex, size);
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      [shuffled[emptyIndex], shuffled[randomNeighbor]] = [shuffled[randomNeighbor], shuffled[emptyIndex]];
      emptyIndex = randomNeighbor;
    }

    setBoard(shuffled);
    setGridSize(size);
    setMoves(0);
    setTime(0);
    setIsActive(true);
    setIsGameFinished(false);
    setShowWinModal(false);
  };

  const handleTileClick = (index: number) => {
    if (isGameFinished || !isActive) return;

    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyIndex = board.indexOf(null);
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    // Check if the clicked tile is adjacent to the empty slot
    const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      const newBoard = [...board];
      [newBoard[index], newBoard[emptyIndex]] = [newBoard[emptyIndex], newBoard[index]];
      setBoard(newBoard);
      setMoves((m) => m + 1);

      // Check for win condition
      if (checkWin(newBoard)) {
        handleWin();
      }
    }
  };

  const checkWin = (currentBoard: TileType[]) => {
    for (let i = 0; i < currentBoard.length - 1; i++) {
        if (currentBoard[i] !== i + 1) return false;
    }
    return currentBoard[currentBoard.length - 1] === null;
  };

  const handleWin = () => {
    setIsGameFinished(true);
    setIsActive(false);
    setShowWinModal(true);

    if (room && me) {
      // For multiplayer, notify server
      socket.emit('gridorder-win', { roomId: room.id, time, moves });
    } else if (me) {
      // Single player win (report score to leaderboard)
      socket.emit('gridorder-score', { score: moves, time, name: me.name, gridSize });
    }
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: 'var(--accent-glow)', padding: '0.4rem 1.5rem', borderRadius: '12px', border: '1px solid var(--accent)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 950, letterSpacing: '0.1em' }}>TIMER</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 950, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(time)}</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--accent)', opacity: 0.3 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 950, letterSpacing: '0.1em' }}>MOVES</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 950, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{moves}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '800px' }}>
        
        {/* Game Grid */}
      <div 
        className="card shadow-lg animate-scale-in"
        style={{
          flex: '1 1 320px',
          width: '100%',
          maxWidth: '500px',
          aspectRatio: '1',
          padding: gridSize > 5 ? '8px' : '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: gridSize > 5 ? '20px' : '32px',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {board.map((tile, index) => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          return (
          <div
            key={tile === null ? 'empty' : tile}
            style={{
               position: 'absolute',
               top: `${(row / gridSize) * 100}%`,
               left: `${(col / gridSize) * 100}%`,
               width: `${(1 / gridSize) * 100}%`,
               height: `${(1 / gridSize) * 100}%`,
               padding: gridSize > 5 ? '3px' : '6px',
               transition: 'top 0.2s cubic-bezier(0.4, 0, 0.2, 1), left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              onClick={() => handleTileClick(index)}
              className="grid-tile"
              style={{
                width: '100%',
                height: '100%',
                background: tile === null ? 'transparent' : 'var(--item-bg)',
                color: 'var(--text-primary)',
                borderRadius: gridSize > 5 ? '6px' : '10px',
                border: tile === null ? 'none' : '1px solid var(--item-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: gridSize > 5 ? '1.2rem' : gridSize > 4 ? '1.5rem' : '2.2rem',
                fontWeight: 950,
                cursor: tile === null ? 'default' : 'pointer',
                opacity: tile === null ? 0 : 1,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: tile === null ? 'none' : 'inset 0 -6px 0 rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.15)',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease',
              }}
            >
              {tile}
              {tile !== null && (
                  <div style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                      pointerEvents: 'none'
                  }} />
              )}
            </div>
          </div>
        )})}
        </div>
      </div>

      {/* Target Grid Guidance (Right Side) */}
      <div className="card shadow-soft animate-fade-in" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', 
          background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', 
          border: '1px solid var(--card-border)', width: '100%', maxWidth: '220px' 
      }}>
         <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>TARGET</span>
         <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gap: '4px', width: '100%', aspectRatio: '1' }}>
             {Array.from({ length: gridSize * gridSize }).map((_, i) => (
               <div key={i} style={{
                 background: i === gridSize * gridSize - 1 ? 'transparent' : 'var(--item-bg)',
                 border: i === gridSize * gridSize - 1 ? 'none' : '1px solid var(--item-border)',
                 borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 fontSize: gridSize > 5 ? '0.6rem' : '0.95rem', fontWeight: 950, color: 'var(--text-primary)',
                 boxShadow: i === gridSize * gridSize - 1 ? 'none' : 'inset 0 -2px 0 rgba(0,0,0,0.2)'
               }}>
                 {i === gridSize * gridSize - 1 ? '' : i + 1}
               </div>
             ))}
         </div>
         <p style={{ textAlign: 'center', margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click tiles to slide them into this exact order!</p>
      </div>

      <div className="card shadow-soft animate-fade-in" style={{ 
          display: 'flex', flexDirection: 'column', gap: '1rem', 
          background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', 
          border: '1px solid var(--card-border)', width: '100%', maxWidth: '220px' 
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Info size={14} color="var(--accent)" /> <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>RULES</span>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              'Match the target grid order.',
              'Slide tiles into empty slots.',
              'Move only horizontally/vertically.',
              'Minimize your total moves.'
            ].map((rule, i) => (
              <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', lineHeight: 1.3 }}>
                <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--accent)', marginTop: '0.4rem', flexShrink: 0 }} />
                {rule}
              </div>
            ))}
         </div>
      </div>
      
      </div> {/* End Flex Row Container */}

      {/* Controls */}
      {!room && (
        <div className="animate-fade-in" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[3, 4, 5, 6, 7].map(size => (
                <button 
                  key={size}
                  className={gridSize === size ? "btn btn-primary" : "btn btn-outline"}
                  onClick={() => initializeGame(size)}
                  style={{ minWidth: '70px', height: '54px', fontWeight: 950, borderRadius: '16px' }}
                >
                    <Grid size={18} /> {size}x{size}
                </button>
            ))}
            <button className="btn btn-outline" onClick={() => initializeGame(gridSize)} style={{ height: '54px', padding: '0 1.5rem', fontWeight: 950, borderRadius: '16px' }}>
                <Shuffle size={18} /> Reshuffle
            </button>
        </div>
      )}

      {/* Room specific info */}
      <div className="animate-fade-in" style={{ marginTop: '2rem', width: '100%', maxWidth: '500px' }}>
          {!room && me && leaderboard && leaderboard[me.name] !== undefined && (
             <div className="card" style={{ textAlign: 'center', padding: '1rem 1.5rem',  color: '#fbbf24', fontWeight: 950, fontSize: '1rem', borderRadius: '20px', background: 'var(--item-bg)', border: '1px solid #fbbf2433' }}>
                <Trophy size={18} style={{ marginRight: '8px' }} /> PERSONAL BEST: {leaderboard[me.name]} MOVES
             </div>
          )}
          
          {room && room.gameState === 'playing' && room.players.length > 1 && (
             <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 950, color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Live Opponents</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                     {room.players.filter(p => p.id !== me?.id).map(p => (
                        <div key={p.id} className="card shadow-soft" style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--item-bg)', borderRadius: '20px', border: '1px solid var(--item-border)' }}>
                           <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--text-primary)' }}>{p.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '8px', fontWeight: 800 }}>RACING...</div>
                        </div>
                     ))}
                  </div>
             </div>
          )}
      </div>
      
      {/* Scroll View End */}
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '2rem'
        }}>
          <div className="card animate-scale-in shadow-lg" style={{ 
            width: '100%', maxWidth: '420px', padding: '3.5rem 2.5rem', textAlign: 'center',
            background: 'var(--card-bg)', border: '2px solid var(--accent)', borderRadius: '32px'
          }}>
            <div style={{ 
                width: '96px', height: '96px', borderRadius: '50%', background: 'var(--accent-glow)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
                border: '1px solid var(--accent)'
            }}>
               <Trophy size={48} color="var(--accent)" />
            </div>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>GRID ORDERED!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
               Solved in <strong style={{color: 'var(--text-primary)'}}>{formatTime(time)}</strong><br/>
               Efficiency: <strong style={{color: 'var(--accent)'}}>{moves} moves</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => room ? window.location.reload() : initializeGame(gridSize)} style={{ width: '100%', height: '60px', fontWeight: 950, borderRadius: '18px', fontSize: '1.1rem' }}>
                   {room ? 'Back to Lobby' : 'Play Again'}
                </button>
                {!room && (
                    <button className="btn btn-link" onClick={() => window.location.reload()} style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>Back to Dashboard</button>
                )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .grid-tile:hover {
            transform: scale(1.02) translateY(-2px);
            background: var(--accent-glow) !important;
            border-color: var(--accent) !important;
            box-shadow: inset 0 -6px 0 rgba(0,0,0,0.35), 0 10px 20px rgba(0,0,0,0.25) !important;
        }
        .grid-tile:active {
            transform: scale(0.96) translateY(2px) !important;
            box-shadow: inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.15) !important;
        }
        .animate-scale-in {
            animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .shadow-soft {
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};
