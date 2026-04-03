import React, { useEffect } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Skull, ArrowLeft, Target } from 'lucide-react';

interface GameProps {
  room: Room;
  me: Player;
  onBack?: () => void;
}

export const Game: React.FC<GameProps> = ({ room, me }) => {
  const currentMe = room.players.find(p => p.id === me.id) || me;
  const myCard = currentMe.card ?? [];
  const calledSet = new Set<number>(room.calledNumbers);
  const currentPlayer = room.players[room.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === me.id;
  const linesCompleted = currentMe.completedLines || 0;

  const lastCalled = room.calledNumbers.length > 0
    ? room.calledNumbers[room.calledNumbers.length - 1]
    : null;

  useEffect(() => {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    if (room.gameState === 'finished') {
      const interval: any = setInterval(function() {
        if (iWon) {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 2000 });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 2000 });
        } else {
          confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, colors: ['#7f1d1d', '#111'] });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.winner, room.winners, me.id]);

  const handleCellClick = (num: number) => {
    if (!isMyTurn || room.gameState !== 'playing') return;
    if (calledSet.has(num)) return;
    socket.emit('call-number', { roomId: room.id, number: num });
  };

  const bingoLetters = ['B', 'I', 'N', 'G', 'O'];

  if (room.gameState === 'finished') {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    return (
      <div className="immersive-screen" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 1000, padding: '2rem' }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '550px', textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', border: `2px solid ${iWon ? 'var(--success)' : 'var(--error)'}`, boxShadow: iWon ? '0 0 60px var(--success-glow)' : '0 0 60px var(--error-glow)' }}>
          {iWon ? <Trophy size={100} color="#fbbf24" /> : <Skull size={100} color="var(--error)" />}
          <div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 950, color: iWon ? 'var(--success)' : 'var(--error)', margin: 0 }}>{iWon ? 'VICTORY' : 'DEFEAT'}</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>{iWon ? 'THE ARENA IS YOURS!' : 'BETTER LUCK NEXT ROUND'}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center', margin: '0.5rem 0' }}>
            {room.players.map(p => {
              const isReady = room.readyPlayers?.includes(p.id);
              return (
                <div key={p.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', 
                  background: isReady ? 'var(--success-glow)' : 'var(--item-bg)', 
                  borderRadius: '12px', border: `1px solid ${isReady ? 'var(--success)' : 'var(--item-border)'}`,
                  color: isReady ? 'var(--success)' : 'var(--text-secondary)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isReady ? 'var(--success)' : 'var(--text-secondary)' }} />
                  <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>{p.name} {isReady ? 'READY' : ''}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            {room.readyPlayers?.includes(me.id) ? (
              <div className="btn btn-primary" style={{ flex: 2, height: '70px', fontSize: '1.4rem', fontWeight: 950, cursor: 'default', opacity: 0.8 }}>
                {room.readyPlayers.length < room.players.length ? 'WAITING FOR OTHERS...' : 'ALL READY!'}
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })} style={{ flex: 2, height: '70px', fontSize: '1.4rem', fontWeight: 950 }}>
                PLAY AGAIN
              </button>
            )}
            <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ flex: 1, height: '70px' }}>
              <ArrowLeft size={24} />
            </button>
          </div>
          {room.hostId === me.id && room.readyPlayers && room.readyPlayers.length > 0 && room.readyPlayers.length < room.players.length && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800 }}>WAITING FOR {room.players.length - room.readyPlayers.length} MORE PLAYERS...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--bg-primary)', overflow: 'visible' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(1rem, 3vw, 2.5rem)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Turn Indicator (Full Width) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '2.5rem', 
          width: '100%',
          maxWidth: '1300px'
        }}>
          <div style={{ 
              padding: '1rem 2.5rem', 
              background: isMyTurn ? 'var(--success-glow)' : 'var(--item-bg)', 
              border: `1px solid ${isMyTurn ? 'var(--success)' : 'var(--item-border)'}`, 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              boxShadow: isMyTurn ? '0 10px 40px var(--success-glow)' : 'none',
              transition: 'all 0.4s ease'
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isMyTurn ? 'var(--success)' : 'var(--text-secondary)', animation: isMyTurn ? 'pulse 1.5s infinite' : 'none' }} />
            <span style={{ fontWeight: 950, color: isMyTurn ? 'var(--success)' : 'var(--text-primary)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              {isMyTurn ? 'YOUR SIGNAL' : `${currentPlayer?.name}'S SIGNAL`}
            </span>
          </div>
        </div>

        <div className="bingo-gameplay-container" style={{ 
            maxWidth: '1400px', 
            width: '100%', 
            display: 'grid',
            gridTemplateColumns: 'minmax(250px, 1fr) auto minmax(250px, 1fr)',
            gap: '3rem',
            alignItems: 'start',
            justifyContent: 'center'
        }}>
          
          {/* Left Sidebar - Radar */}
          <div className="bingo-sidebar-left" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem', borderRadius: '32px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                   <Target size={18} /> <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>RADAR STATUS</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {room.players.map(p => {
                      const active = p.id === currentPlayer?.id;
                      return (
                        <div key={p.id} style={{ 
                          display: 'flex', justifyContent: 'space-between', padding: '1rem', 
                          background: active ? 'var(--accent-glow)' : 'var(--item-bg)', 
                          borderRadius: '16px', border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? 'var(--accent)' : 'var(--item-border)' }} />
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.name}</span>
                          </div>
                          {active && <span style={{ background: 'var(--accent)', color: 'white', fontSize: '0.6rem', fontWeight: 950, padding: '3px 8px', borderRadius: '20px' }}>ACTIVE</span>}
                        </div>
                      );
                    })}
                 </div>
              </div>
          </div>

          {/* Center Area - Grid */}
          <div className="bingo-main-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            
            {/* Letters Header */}
            <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 12px)', width: '100%', justifyContent: 'center' }}>
              {bingoLetters.map((l, i) => {
                const active = linesCompleted > i;
                return (
                  <div key={l} style={{ 
                    width: 'clamp(55px, 9vw, 85px)', height: 'clamp(55px, 9vw, 85px)', 
                    borderRadius: 'clamp(12px, 2vw, 24px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(1.2rem, 3.5vw, 2rem)', fontWeight: 950,
                    background: active ? 'var(--success)' : 'var(--card-bg)',
                    color: active ? 'white' : 'var(--text-secondary)',
                    border: `3px solid ${active ? 'var(--success)' : 'var(--item-border)'}`,
                    boxShadow: active ? '0 0 35px var(--success-glow)' : 'none',
                    transform: active ? 'translateY(-6px)' : 'none',
                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}>
                    {l}
                  </div>
                );
              })}
            </div>

            {/* Grid */}
            <div style={{ 
              position: 'relative', 
              padding: '1rem', 
              background: 'var(--item-bg)', 
              borderRadius: '40px', 
              border: '1px solid var(--item-border)', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
               <div style={{ 
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(5, 1fr)', 
                 gap: 'clamp(8px, 1.5vw, 12px)',
                 opacity: isMyTurn ? 1 : 0.6,
                 transition: 'all 0.4s ease'
               }}>
                 {myCard.map((num, idx) => {
                   const called = calledSet.has(num);
                   const canClick = isMyTurn && !called && room.gameState === 'playing';
                   return (
                     <button 
                        key={idx} 
                        onClick={() => handleCellClick(num)} 
                        disabled={!canClick}
                        className={`bingo-cell-modern ${called ? 'called' : ''}`}
                        style={{
                          width: 'clamp(55px, 9vw, 85px)',
                          aspectRatio: '1',
                          borderRadius: 'clamp(12px, 2vw, 24px)',
                          background: called ? 'var(--accent)' : 'var(--card-bg)',
                          border: `2px solid ${called ? 'transparent' : 'var(--item-border)'}`,
                          color: called ? 'white' : (isMyTurn ? 'var(--text-primary)' : 'var(--text-secondary)'),
                          fontSize: 'clamp(1.2rem, 3.5vw, 2rem)',
                          fontWeight: 950,
                          cursor: canClick ? 'pointer' : 'default',
                          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: called ? '0 12px 24px var(--accent-glow)' : 'none',
                          outline: 'none',
                          opacity: called ? 1 : (isMyTurn ? 1 : 0.5)
                        }}
                     >
                       {num}
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>

          {/* Right Sidebar - Last Signal */}
          <div className="bingo-sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '32px' }}>
                 <p style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.6, letterSpacing: '0.15em', marginBottom: '1.5rem' }}>LAST SIGNAL</p>
                 <div style={{ 
                   width: '150px', height: '150px', borderRadius: '50%', margin: '0 auto',
                   background: lastCalled ? 'var(--accent-glow)' : 'var(--item-bg)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   fontSize: '5rem', fontWeight: 950, color: lastCalled ? 'var(--accent)' : 'var(--text-secondary)',
                   border: lastCalled ? '3px solid var(--accent)' : '3px dashed var(--item-border)',
                   animation: lastCalled ? 'pulse-accent 2s infinite' : 'none'
                 }}>
                   {lastCalled || '-'}
                 </div>
              </div>
          </div>

        </div>
      </div>

      <style>{`
        .bingo-cell-modern:hover:not(:disabled) {
          transform: scale(1.08) translateY(-5px);
          border-color: var(--accent);
          box-shadow: 0 15px 30px var(--accent-glow);
          background: var(--accent-glow) !important;
        }
        .bingo-cell-modern.called {
          animation: pop-cell 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes pop-cell {
          0% { transform: scale(0.8); rotate: -10deg; }
          100% { transform: scale(1); rotate: 0; }
        }
        @keyframes pulse-accent {
          0% { box-shadow: 0 0 0 0 var(--accent-glow); transform: scale(1); }
          70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); transform: scale(1); }
        }
        @media (min-width: 1025px) {
          .bingo-main-area {
            flex: 0 1 auto !important;
          }
          .dashboard-layout {
            justify-content: center !important;
            gap: 5rem !important;
          }
        }
        @media (max-width: 1024px) {
          .dashboard-layout {
            align-items: center !important;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Game;
