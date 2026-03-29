import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Player, Room } from '../types';
import { Trophy, Timer, Car, RefreshCw, Zap, Star, Skull, Activity, ListOrdered } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RacerProps {
  room: Room;
  me: Player;
}

export const Racer: React.FC<RacerProps> = ({ room, me }) => {
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const targetText = (room.gameData as unknown as string) || "";
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Countdown when state is 'starting'
  useEffect(() => {
    if (room.gameState === 'starting') {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [room.gameState]);

  // Focus input when game starts
  useEffect(() => {
    if (room.gameState === 'playing') {
      inputRef.current?.focus();
    }
  }, [room.gameState]);

  // Infinite Sprinkle (Winner) or Blast (Defeated)
  useEffect(() => {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    
    if (room.gameState === 'finished') {
      const interval: any = setInterval(function() {
        if (iWon) {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 2000, colors: ['#10b981', '#60a5fa', '#fbbf24'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 2000, colors: ['#10b981', '#60a5fa', '#fbbf24'] });
        } else {
          confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
          confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.winner, room.winners, me.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (room.gameState !== 'playing') return;
    const val = e.target.value;
    if (targetText.startsWith(val)) {
      setInput(val);
      socket.emit('type-progress', { roomId: room.id, charsTyped: val.length });
    }
  };

  const winners = room.winners || (room.winner ? [room.winner] : []);
  const iWon = winners.some(w => w.id === me.id);
  const targetLength = targetText.length || 1;

  if (room.gameState === 'finished') {
    const sortedPlayers = [...room.players].sort((a, b) => {
      const aDone = a.completedLines >= targetLength;
      const bDone = b.completedLines >= targetLength;
      if (aDone && bDone) return (b.wpm || 0) - (a.wpm || 0);
      return b.completedLines - a.completedLines;
    });

    return (
      <div className="immersive-screen" style={{ 
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: iWon ? 'var(--bg-primary)' : 'linear-gradient(135deg, #000 0%, #1a0505 100%)',
        zIndex: 1000, overflowY: 'auto', overflowX: 'hidden', padding: '5rem 0'
      }}>
        {!iWon && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
            <div className="screen-flash" />
            <div className="blood-vignette" />
          </div>
        )}

        <div className="card animate-fade-in" style={{ 
          width: '100%', maxWidth: '650px', textAlign: 'center', padding: '3.5rem 2rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem',
          border: iWon ? '3px solid var(--success)' : '3px solid var(--error)',
          boxShadow: iWon ? '0 0 60px var(--success-glow)' : '0 0 60px var(--error-glow)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)',
          zIndex: 10
        }}>
          <div style={{ position: 'relative' }}>
            {iWon ? (
              <div style={{ position: 'relative' }}>
                <Trophy size={100} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.6))' }} />
                <Star size={40} color="#f59e0b" fill="#f59e0b" style={{ position: 'absolute', top: -10, right: -20, animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : (
              <Skull size={90} color="var(--error)" style={{ filter: 'drop-shadow(0 0 30px var(--error-glow))' }} />
            )}
          </div>
          
          <div>
            <h1 className="responsive-title" style={{ 
                fontWeight: 950, 
                background: iWon ? 'linear-gradient(to bottom, var(--text-primary), var(--success))' : 'linear-gradient(to bottom, var(--text-primary), var(--error))',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                margin: '0', letterSpacing: '0.1em'
            }}>
              {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            {iWon && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '0.5rem 1.5rem', background: 'var(--success-glow)', borderRadius: '30px', color: 'var(--success)', fontWeight: 900, fontSize: '1.5rem', border: '1px solid var(--success)' }}>
                  {room.winner?.wpm || 0} WPM
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '100%', padding: '0 1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <ListOrdered size={20} /> Race Standings
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedPlayers.map((p, idx) => {
                  const isCurrentMe = p.id === me.id;
                  const isWinner = idx === 0;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem', borderRadius: '16px',
                      background: isCurrentMe ? 'var(--accent-glow)' : 'var(--item-bg)',
                      border: `1px solid ${isCurrentMe ? 'var(--accent)' : (isWinner ? 'rgba(251,191,36,0.2)' : 'var(--item-border)')}`,
                      transform: isWinner ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <span style={{ 
                            width: '32px', height: '32px', borderRadius: '50%', background: isWinner ? '#fbbf24' : 'var(--bg-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: isWinner ? '#000' : 'var(--text-secondary)'
                         }}>
                            {idx + 1}
                         </span>
                         <span style={{ fontSize: '1.2rem', fontWeight: isCurrentMe ? 950 : 800, color: isCurrentMe ? 'var(--accent)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {p.name} {isCurrentMe && '(You)'}
                            {(room.readyPlayers || []).includes(p.id) && (
                              <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.05em' }}>READY</span>
                            )}
                         </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                         <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: isWinner ? '#fbbf24' : 'var(--text-primary)' }}>{p.wpm || 0}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>WPM</div>
                         </div>
                         <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--item-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            {p.completedLines >= targetLength ? <Zap size={20} fill="var(--success)" color="var(--success)" /> : <Activity size={20} />}
                         </div>
                      </div>
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
              disabled={room.hostId === me.id && (room.players.length > 1 && !(room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id)))) && (room.readyPlayers || []).includes(me.id)}
              style={{ flex: 2, height: '70px', fontSize: '1.5rem', fontWeight: 900 }}
            >
              <RefreshCw size={28} style={{ animation: (room.readyPlayers || []).includes(me.id) ? 'spin 2s linear infinite' : 'none' }} /> 
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
          @keyframes horror-flash { 0% { opacity: 0; } 5% { opacity: 0.8; } 100% { opacity: 0; } }
          @keyframes vignette-pulse { 0% { opacity: 0; } 20% { opacity: 0.8; } 100% { opacity: 0.5; } }
          @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem', overflowY: 'auto', position: 'relative', background: 'var(--bg-primary)' }}>
      
      {/* COUNTDOWN OVERLAY */}
      {countdown !== null && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 2000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)'
        }}>
           <div style={{ fontSize: '15rem', fontWeight: 900, color: '#3b82f6', textShadow: '0 0 50px rgba(59,130,246,0.5)', animation: 'countdown-ping 1s infinite' }}>
              {countdown}
           </div>
           <div style={{ position: 'absolute', bottom: '20%', fontSize: '2rem', fontWeight: 800, color: 'white', letterSpacing: '0.2em' }}>
              READY?
           </div>
           <style>{`
             @keyframes countdown-ping {
               0% { transform: scale(0.8); opacity: 0; }
               20% { opacity: 1; }
               100% { transform: scale(1.5); opacity: 0; }
             }
           `}</style>
        </div>
      )}

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
        
        {/* Race Track Header */}
        <div className="card" style={{ padding: '2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '1rem', margin: 0, color: 'var(--accent)' }}>
                <Timer size={48} color="var(--accent)" /> 
                ARENA RACER
              </h1>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ padding: '0.6rem 1.2rem', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: '30px', fontSize: '1rem', fontWeight: 900, border: '1px solid var(--accent)' }}>
                  ROOM: {room.id}
                </div>
              </div>
           </div>

           {/* Progress Bars (Cars) */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', margin: '2rem 1.5rem' }}>
              {room.players.map(p => {
                const progress = ((p.completedLines || 0) / targetLength) * 100;
                const isMe = p.id === me.id;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 2rem)', width: '100%' }}>
                    <div style={{ 
                      width: 'clamp(100px, 25vw, 200px)', flexShrink: 0, textAlign: 'right',
                      fontSize: '1rem', color: isMe ? 'var(--accent)' : 'var(--text-secondary)', 
                      fontWeight: isMe ? 950 : 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.8rem', whiteSpace: 'nowrap'
                    }}>
                       {isMe ? <Zap size={18} fill="var(--accent)" /> : null} 
                       <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                       <div style={{ padding: '2px 8px', background: 'var(--item-bg)', borderRadius: '6px', fontSize: '0.8rem', minWidth: '45px', textAlign: 'center', color: 'var(--text-primary)' }}>
                         {p.wpm || 0}
                       </div>
                    </div>

                    <div style={{ position: 'relative', flex: 1, height: '10px', background: 'var(--item-bg)', borderRadius: '5px', border: '1px solid var(--item-border)' }}>
                       <div style={{ 
                         position: 'absolute', left: `${Math.min(progress, 98)}%`, top: '-4px', transform: 'translateY(-100%)',
                         color: isMe ? 'var(--accent)' : 'var(--text-secondary)', transition: 'left 0.4s cubic-bezier(0.23, 1, 0.32, 1)', zIndex: 10
                       }}>
                          <Car size={24} fill={isMe ? "var(--accent)" : "currentColor"} />
                       </div>
                       <div style={{ 
                         width: `${progress}%`, height: '100%', 
                         background: isMe ? 'linear-gradient(90deg, transparent 0%, var(--accent) 100%)' : 'var(--item-border)', 
                         borderRadius: '5px', transition: 'width 0.4s ease' 
                       }} />
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Typing Area */}
        <div className="card" style={{ padding: '4rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '3rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', backdropFilter: 'blur(20px)' }}>
           <div style={{ fontSize: '1.8rem', lineHeight: '1.8', position: 'relative', letterSpacing: '0.02em', textAlign: 'left', minHeight: '220px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--success)', fontWeight: 950, textDecoration: 'underline decoration-thickness-2' }}>
                {input}
              </span>
              <span style={{ color: 'var(--text-secondary)', opacity: 0.3, fontWeight: 500 }}>
                {targetText.slice(input.length)}
              </span>
           </div>

           <div style={{ position: 'relative', width: '100%' }}>
              <input 
                ref={inputRef}
                className="input-field"
                spellCheck={false}
                autoComplete="off"
                disabled={room.gameState !== 'playing'}
                style={{ 
                  width: '100%', fontSize: '1.8rem', padding: '2.5rem', textAlign: 'center', 
                  background: room.gameState === 'playing' ? 'var(--item-bg)' : 'var(--bg-secondary)', 
                  borderColor: room.gameState === 'playing' ? 'var(--accent)' : 'var(--item-border)',
                  boxShadow: room.gameState === 'playing' ? '0 0 50px var(--accent-glow) inset, 0 8px 32px rgba(0,0,0,0.05)' : 'none',
                  opacity: room.gameState === 'starting' ? 0.3 : 1, transition: 'all 0.3s ease', boxSizing: 'border-box',
                  color: 'var(--text-primary)', fontWeight: 950
                }}
                value={input}
                onChange={handleChange}
                onPaste={e => e.preventDefault()}
                onDrop={e => e.preventDefault()}
                onContextMenu={e => e.preventDefault()}
                placeholder={room.gameState === 'starting' ? "Wait for the light..." : "TYPE AS FAST AS POSSIBLE!"}
              />
           </div>
        </div>
      </div>
    </div>
  );
};
