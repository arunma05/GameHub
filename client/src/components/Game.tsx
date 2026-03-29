import React, { useEffect } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Check, Star, Skull, RefreshCw } from 'lucide-react';

interface GameProps {
  room: Room;
  me: Player;
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

  // Infinite Sprinkle (Winner) or Blast (Defeated)
  useEffect(() => {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);

    if (room.gameState === 'finished') {
      const interval: any = setInterval(function() {
        if (iWon) {
          // Winner Sprinkle
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 2000, colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 2000, colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'] });
        } else {
          // Defeated Blast (Fire/Smoke)
          confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
          confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.winner, room.winners, me.id]);

  const handleCellClick = (num: number) => {
    if (!isMyTurn || room.gameState !== 'playing') return;
    if (calledSet.has(num)) return; // already called
    socket.emit('call-number', { roomId: room.id, number: num });
  };

  const bingoLetters = ['B', 'I', 'N', 'G', 'O'];

  // ── WINNER SCREEN ──────────────────────────────────────────────────────
  if (room.gameState === 'finished') {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    
    return (
      <div className="immersive-screen" style={{ 
        position: 'fixed', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'flex-start', // Allow scrolling from the top
        justifyContent: 'center',
        background: iWon ? 'var(--bg-primary)' : 'linear-gradient(135deg, #000 0%, #1a0505 100%)',
        zIndex: 1000,
        overflowY: 'auto',
        overflowX: 'hidden', // Disable horizontal scroll
        padding: '5rem 0' // Generous padding for scrolling
      }}>
        {/* Intense Bombing Effect for Losers */}
        {!iWon && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
            <div className="screen-flash" />
            <div className="blood-vignette" />
            <div className="bomb-explosion center" />
            <div className="bomb-explosion left" />
            <div className="bomb-explosion right" />
            <div className="bomb-explosion top-left" />
            <div className="bomb-explosion top-right" />
          </div>
        )}

        <div className="card animate-fade-in" style={{
          textAlign: 'center', width: '100%', maxWidth: '620px',
          padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem',
          zIndex: 10,
          border: iWon ? '3px solid var(--success)' : '3px solid var(--error)',
          boxShadow: iWon ? '0 0 70px var(--success-glow)' : '0 0 70px var(--error-glow)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)'
        }}>
          <div style={{ position: 'relative' }}>
             {iWon ? (
               <div style={{ position: 'relative' }}>
                 <Trophy size={110} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.8))' }} />
                 <Star size={40} color="#f59e0b" fill="#f59e0b" style={{ position: 'absolute', top: -15, right: -25, animation: 'pulse 1.5s infinite' }} />
               </div>
             ) : (
               <Skull size={100} color="#ef4444" style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.5))' }} />
             )}
          </div>
          
          <div>
            <h1 className="responsive-title" style={{ 
              margin: 0, fontWeight: 950, letterSpacing: '0.1em',
              background: iWon ? 'linear-gradient(to bottom, #fff, #10b981)' : 'linear-gradient(to bottom, #fff, #ef4444)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              textShadow: iWon ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)'
            }}>
              {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 700 }}>
              {iWon ? 'BINGO CHAMPION!' : 'YOUR BOARD HAS BEEN OBLITERATED!'}
            </p>
          </div>

          <div style={{ padding: '1.5rem 3rem', background: 'var(--item-bg)', borderRadius: '20px', border: '1px solid var(--item-border)' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900 }}>Master Winner</p>
             <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)' }}>
                 {winners.map(w => w.name).join(' & ')}
             </div>
          </div>

          <div style={{ width: '100%', padding: '0 1rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...room.players].sort((a,b) => b.completedLines - a.completedLines).map((p, idx) => {
                  const isCurrentMe = p.id === me.id;
                  const isWinner = (room.winners || []).some(w => w.id === p.id);
                  const isReady = (room.readyPlayers || []).includes(p.id);
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', borderRadius: '16px',
                      background: isCurrentMe ? 'var(--accent-glow)' : 'var(--item-bg)',
                      border: `1px solid ${isCurrentMe ? 'rgba(59,130,246,0.3)' : (isWinner ? 'rgba(16,185,129,0.3)' : 'rgba(148, 163, 184, 0.1)')}`,
                      animation: isReady ? 'none' : 'pulse 2s infinite'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ 
                             width: '28px', height: '28px', borderRadius: '50%', background: isWinner ? 'var(--success)' : 'var(--bg-secondary)',
                             display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, color: isWinner ? 'white' : 'var(--text-secondary)'
                          }}>
                             {idx + 1}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: isCurrentMe ? 900 : 700, color: isCurrentMe ? 'var(--accent)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             {p.name} {isCurrentMe && '(You)'}
                             {isReady && <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', fontWeight: 950, padding: '2px 8px', borderRadius: '8px', letterSpacing: '0.05em' }}>READY</span>}
                          </span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isWinner ? '#10b981' : 'var(--text-secondary)' }}>
                        {p.completedLines} LNS
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '1rem' }}>
             {bingoLetters.map((l, i) => {
               const active = iWon || (currentMe.completedLines || 0) > i;
               return (
                <div key={i} style={{
                    width: '60px', height: '60px', borderRadius: '18px', 
                    background: active ? 'var(--success)' : 'var(--item-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', fontWeight: 950, color: active ? 'white' : 'var(--text-secondary)',
                    boxShadow: active ? 'var(--success-glow)' : 'none',
                    opacity: active ? 1 : 0.4,
                    border: active ? 'none' : '1px solid var(--item-border)',
                    transform: active ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {l}
                </div>
               );
             })}
          </div>

          <div style={{ width: '100%', maxWidth: '300px' }}>
            <h3 style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
              Final Grid
            </h3>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px',
              padding: '15px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {myCard.map((num, idx) => {
                const called = calledSet.has(num);
                return (
                  <div key={idx} style={{
                    aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 950, borderRadius: '10px',
                    background: called ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: called ? 'white' : 'var(--text-secondary)',
                    boxShadow: called ? 'var(--accent-glow)' : 'none'
                  }}>
                     {num}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (room.hostId === me.id) {
                  const othersReady = room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id));
                  if (othersReady) {
                    socket.emit('reset-room', { roomId: room.id });
                  } else {
                    socket.emit('play-again', { roomId: room.id });
                  }
                } else {
                  socket.emit('play-again', { roomId: room.id });
                }
              }} 
              disabled={room.hostId === me.id && room.players.length > 1 && !room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id)) && (room.readyPlayers || []).includes(me.id)}
              style={{ 
                flex: 2, height: '70px', fontSize: '1.5rem', fontWeight: 950,
                background: (room.hostId !== me.id && (room.readyPlayers || []).includes(me.id)) ? '#10b981' : undefined,
                border: (room.hostId !== me.id && (room.readyPlayers || []).includes(me.id)) ? 'none' : undefined
              }}
            >
              <RefreshCw size={32} style={{ animation: (room.readyPlayers || []).includes(me.id) ? 'spin 2s linear infinite' : 'none' }} /> 
              {(() => {
                const isHost = room.hostId === me.id;
                const iAmReady = (room.readyPlayers || []).includes(me.id);
                const othersReady = room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id));
                
                if (!isHost) {
                  return iAmReady ? 'Ready!' : 'Play Again';
                }
                
                if (room.players.length === 1 || othersReady) return 'Start New Game';
                const missing = room.players.find(p => p.id !== room.hostId && !(room.readyPlayers || []).includes(p.id));
                return missing ? `Waiting for ${missing.name}...` : 'Starting...';
              })()}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => window.location.reload()} 
              style={{ flex: 1, height: '70px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-secondary)' }}
            >
              Exit
            </button>
          </div>
        </div>
        
        <style>{`
          .screen-flash { position: fixed; inset: 0; background: #991b1b; opacity: 0; animation: horror-flash 0.6s ease-out forwards; z-index: 998; }
          .blood-vignette { position: fixed; inset: 0; background: radial-gradient(circle, transparent 40%, #7f1d1d 100%); opacity: 0; animation: vignette-pulse 1s ease-out forwards; z-index: 997; pointer-events: none; }
          .bomb-explosion { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, #7f1d1d 0%, #000 70%, transparent 90%); border-radius: 50%; opacity: 0; filter: blur(50px); pointer-events: none; }
          .bomb-explosion.center { left: 50%; top: 50%; transform: translate(-50%, -50%); animation: horror-explode 1.5s ease-out forwards; }
          .bomb-explosion.left { left: 0%; bottom: 0%; transform: translate(-50%, 50%); animation: horror-explode 1.2s ease-out 0.1s forwards; }
          .bomb-explosion.right { right: 0%; bottom: 0%; transform: translate(50%, 50%); animation: horror-explode 1.2s ease-out 0.2s forwards; }
          .bomb-explosion.top-left { left: 0%; top: 0%; transform: translate(-50%, -50%); animation: horror-explode 1.2s ease-out 0.3s forwards; }
          .bomb-explosion.top-right { right: 0%; top: 0%; transform: translate(50%, -50%); animation: horror-explode 1.2s ease-out 0.4s forwards; }
          
          @keyframes horror-flash { 0% { opacity: 0; } 5% { opacity: 0.8; } 100% { opacity: 0; } }
          @keyframes vignette-pulse { 0% { opacity: 0; } 20% { opacity: 0.8; } 100% { opacity: 0.5; } }
          @keyframes horror-explode { 0% { transform: scale(0.1) translate(var(--tw-translate-x), var(--tw-translate-y)); opacity: 0; } 20% { opacity: 1; transform: scale(1) translate(var(--tw-translate-x), var(--tw-translate-y)); } 100% { transform: scale(6) translate(var(--tw-translate-x), var(--tw-translate-y)); opacity: 0; } }
          @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
          
          @keyframes nightmare-shake {
            0% { transform: translate(0, 0); }
            10% { transform: translate(-15px, 15px); }
            20% { transform: translate(15px, -15px); }
            30% { transform: translate(-20px, 0); }
            100% { transform: translate(0, 0); }
          }
          ${!iWon ? '.immersive-screen { animation: nightmare-shake 0.3s ease-in-out infinite alternate; }' : ''}
        `}</style>
      </div>
    );
  }

  // ── GAME SCREEN ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100vh', overflowY: 'auto' }}>

      {/* Modern Top Header */}
      <div style={{
        background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--item-border)',
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            BINGO
          </h1>
          <div style={{ padding: '0.35rem 1rem', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, border: '1px solid var(--accent-glow)' }}>
            ROOM: {room.id}
          </div>
        </div>

        {/* Turn Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 1.5rem',
          background: isMyTurn ? 'var(--success-glow)' : 'var(--item-bg)',
          border: `1px solid ${isMyTurn ? 'var(--success)' : 'var(--item-border)'}`,
          borderRadius: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {isMyTurn ? <Check size={20} color="var(--success)" /> : <Clock size={20} color="var(--text-secondary)" />}
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: isMyTurn ? 'var(--success)' : 'var(--text-secondary)' }}>
            {isMyTurn ? "Your turn! Choose a number." : `${currentPlayer?.name}'s turn...`}
          </span>
        </div>
      </div>

      {/* Main Game Content */}
      <div className="mobile-column" style={{
        flex: 1, display: 'flex', gap: '2rem', padding: '1rem',
        overflow: 'auto', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap'
      }}>


        {/* ── BINGO Progress Headers (Classic Row of 5) ── */}
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {bingoLetters.map((l, i) => {
              const active = linesCompleted > i;
              return (
                <div key={l} style={{
                  flex: 1, height: 'clamp(45px, 12vw, 80px)', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 900,
                  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  background: active 
                    ? 'linear-gradient(135deg, #10b981, #059669)' 
                    : 'var(--item-bg)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  border: `2px solid ${active ? 'var(--success)' : 'var(--item-border)'}`,
                  boxShadow: active ? '0 8px 25px rgba(16, 185, 129, 0.4)' : 'none',
                  transform: active ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {l}
                  {active && (
                    <div style={{ position: 'absolute', bottom: 5, width: '30%', height: '3px', background: 'white', borderRadius: '2px' }} />
                  )}
                </div>
              );
            })}
          </div>


          {/* ── Main Grid ── */}
          <div className="card" style={{ padding: '10px', background: 'var(--item-bg)', borderRadius: '20px', border: '1px solid var(--item-border)' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px',
              padding: '10px'
            }}>
              {myCard.map((num, idx) => {
                const called = calledSet.has(num);
                const clickable = isMyTurn && !called && room.gameState === 'playing';
                return (
                  <div
                    key={idx}
                    onClick={() => handleCellClick(num)}
                    style={{
                      aspectRatio: '1/1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(1rem, 4vw, 1.6rem)', fontWeight: 800, borderRadius: 'clamp(6px, 1.5vw, 12px)',
                      cursor: clickable ? 'pointer' : 'default',

                      userSelect: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: called
                        ? 'linear-gradient(135deg, var(--accent), var(--accent))'
                        : clickable
                          ? 'var(--accent-glow)'
                          : 'var(--card-bg)',
                      border: called
                        ? '2px solid var(--accent)'
                        : clickable
                          ? '2px solid var(--accent)'
                          : '2px solid var(--item-border)',
                      color: called ? 'white' : 'var(--text-secondary)',
                      boxShadow: called ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none',
                      transform: called ? 'scale(0.96)' : 'scale(1)',
                      position: 'relative'
                    }}
                  >
                     {called && (
                       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '80%', height: '80%', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                       </div>
                     )}
                     {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar: Info & Last Called ── */}
        <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Last Number Called Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Last Called
            </h3>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: lastCalled ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: 900, color: lastCalled ? 'white' : 'var(--text-secondary)',
              boxShadow: lastCalled ? '0 10px 30px rgba(245, 158, 11, 0.3)' : 'none',
              border: lastCalled ? 'none' : '2px dashed var(--item-border)'
            }}>
              {lastCalled || '-'}
            </div>
          </div>

          {/* Opponents Status Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
             <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               Live Status
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {room.players.map(p => {
                   const isCurrent = p.id === currentPlayer?.id;
                   return (
                     <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px',
                        background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isCurrent ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                        transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.3s ease'
                     }}>
                        <div style={{ flex: 1 }}>
                           <div style={{ fontSize: '1rem', fontWeight: isCurrent ? 800 : 500, color: p.id === me.id ? '#60a5fa' : 'white' }}>
                              {p.name} {p.id === me.id && '(You)'}
                           </div>
                        </div>
                        {isCurrent && (
                          <span style={{ 
                            width: '12px', height: '12px', background: '#3b82f6', 
                            borderRadius: '50%', display: 'block', 
                            animation: 'pulse 1.5s infinite',
                            boxShadow: '0 0 10px #3b82f6'
                          }}></span>
                        )}
                     </div>
                   )
                })}
             </div>
          </div>

        </div>

      </div>

      <style>{`
        .card {
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1);
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        .animate-pulse {
           animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};
