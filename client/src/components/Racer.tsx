import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Player, Room } from '../types';
import { Trophy, Timer, Car, RefreshCw, Skull, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RacerProps {
  room: Room;
  me: Player;
}

export const Racer: React.FC<RacerProps> = ({ room, me }) => {
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const clampSize = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const targetText = (room.gameData as unknown as string) || "";
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (room.gameState === 'playing') {
      inputRef.current?.focus();
    }
  }, [room.gameState]);

  useEffect(() => {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    if (room.gameState === 'finished') {
      const interval: any = setInterval(function () {
        if (iWon) {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 2000 });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 2000 });
        } else {
          confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, colors: ['#7f1d1d', '#000'] });
          confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.5 }, colors: ['#7f1d1d', '#000'] });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.winner, room.winners, me.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (room.gameState !== 'playing') return;
    const val = e.target.value;
    let correctCount = 0;
    while (correctCount < val.length && val[correctCount] === targetText[correctCount]) {
      correctCount++;
    }
    if (val.length - correctCount > 15) return;
    setInput(val);
    socket.emit('type-progress', { roomId: room.id, charsTyped: correctCount });
  };

  const targetLength = targetText.length || 1;

  if (room.gameState === 'finished') {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    const sortedPlayers = [...room.players].sort((a, b) => {
      const aDone = a.completedLines >= targetLength;
      const bDone = b.completedLines >= targetLength;
      if (aDone && bDone) return (b.wpm || 0) - (a.wpm || 0);
      return b.completedLines - a.completedLines;
    });

    return (
      <div className="immersive-screen" style={{ 
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'var(--bg-primary)',
        zIndex: 2000, overflowY: 'auto', padding: 'clamp(1rem, 5vw, 4rem) 1rem'
      }}>
        {!iWon && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
            <div className="screen-flash" style={{ background: 'var(--error)', opacity: 0.1 }} />
          </div>
        )}
        <div className="card animate-fade-in" style={{
          width: 'min(100%, 650px)', textAlign: 'center', padding: 'clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 3vw, 2rem)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2rem)',
          border: `3px solid ${iWon ? 'var(--success)' : 'var(--error)'}`,
          boxShadow: iWon ? '0 0 60px var(--success-glow)' : '0 0 60px var(--error-glow)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)', zIndex: 10,
          margin: '0 auto'
        }}>
          {iWon ? <Trophy size={clampSize(window.innerWidth / 10, 60, 100)} color="#fbbf24" /> : <Skull size={clampSize(window.innerWidth / 10, 60, 90)} color="var(--error)" />}
          <div>
            <h1 style={{ fontWeight: 950, fontSize: 'clamp(1.8rem, 8vw, 3rem)', margin: 0, color: iWon ? 'var(--success)' : 'var(--error)', lineHeight: 1.1 }}>
               {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', fontWeight: 700, marginTop: '0.5rem' }}>
              {iWon ? 'ARENA CHAMPION!' : 'STAGE OVERWHELMED!'}
            </p>
          </div>

          <div style={{ width: '100%' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {sortedPlayers.map((p, idx) => {
                  const isCurrentMe = p.id === me.id;
                  const isWinner = idx === 0;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(1rem, 3vw, 1.5rem)', borderRadius: '16px',
                      background: isCurrentMe ? 'var(--accent-glow)' : 'var(--item-bg)',
                      border: `1px solid ${isCurrentMe ? 'var(--accent)' : (isWinner ? '#fbbf24' : 'var(--item-border)')}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', flex: 1, overflow: 'hidden' }}>
                         <span style={{ 
                            minWidth: '28px', height: '28px', borderRadius: '50%', background: isWinner ? '#fbbf24' : 'var(--bg-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, color: isWinner ? '#000' : 'var(--text-primary)'
                         }}>
                            {idx + 1}
                         </span>
                         <span style={{ 
                           fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)', fontWeight: isCurrentMe ? 900 : 800, 
                           color: isCurrentMe ? 'var(--accent)' : 'var(--text-primary)', 
                           display: 'flex', alignItems: 'center', gap: '0.4rem',
                           overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                         }}>
                            {p.name}
                            {(room.readyPlayers || []).includes(p.id) && (
                              <span style={{ flexShrink: 0, background: 'var(--success)', color: 'white', fontSize: '0.55rem', fontWeight: 950, padding: '2px 6px', borderRadius: '8px' }}>RDY</span>
                            )}
                         </span>
                      </div>
                      <div style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)', fontWeight: 950, color: isWinner ? '#fbbf24' : 'var(--text-primary)', marginLeft: '1rem' }}>
                        {p.wpm || 0} <small style={{ fontSize: '0.6rem', opacity: 0.6 }}>WPM</small>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            width: '100%',
            flexDirection: window.innerWidth < 500 ? 'column' : 'row'
          }}>
            <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })} style={{ flex: 2, height: 'clamp(60px, 10vw, 75px)', fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)', fontWeight: 950 }}>
              <RefreshCw size={22} /> PLAY AGAIN
            </button>
            <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ flex: 1, height: 'clamp(60px, 10vw, 75px)', fontWeight: 800 }}>EXIT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* COUNTDOWN OVERLAY */}
      {countdown !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}>
          <div style={{ fontSize: '15rem', fontWeight: 950, color: 'var(--accent)', animation: 'ping 1s infinite' }}>{countdown}</div>
        </div>
      )}

      <div style={{ padding: 'clamp(1rem, 3vw, 2.5rem)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Speed Stats Indicator */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '2.5rem', 
          width: '100%',
          maxWidth: '1600px'
        }}>
          <div style={{ 
              padding: '1rem 2.5rem', 
              background: 'var(--item-bg)', 
              border: `1px solid var(--item-border)`, 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '2rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              transition: 'all 0.4s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>CURRENT VELOCITY</span>
                <span style={{ fontWeight: 950, color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                   {room.players.find(p => p.id === me.id)?.wpm || 0} <small style={{ fontSize: '0.7rem', opacity: 0.7 }}>WPM</small>
                </span>
              </div>
            </div>
            <div style={{ width: '1px', height: '30px', background: 'var(--item-border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>STAGE PROGRESS</span>
              <span style={{ fontWeight: 950, color: 'var(--success)', fontSize: '1.2rem' }}>
                 {Math.round(((room.players.find(p => p.id === me.id)?.completedLines || 0) / targetLength) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Race Track */}
          <div className="card" style={{ padding: 'clamp(1rem, 2vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--item-border)', borderRadius: '24px' }}>
            {room.players.map(p => {
              const progress = ((p.completedLines || 0) / targetLength) * 100;
              const isMe = p.id === me.id;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 1.5vw, 1.5rem)' }}>
                  <div style={{ width: 'clamp(60px, 15vw, 110px)', fontSize: '0.75rem', fontWeight: 900, textAlign: 'right', color: isMe ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ flex: 1, height: 'clamp(8px, 1.5vw, 14px)', background: 'var(--item-bg)', borderRadius: '7px', position: 'relative', border: '1px solid var(--item-border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ position: 'absolute', left: `${progress}%`, top: '-18px', transform: 'translateX(-50%)', transition: 'left 0.4s cubic-bezier(0.23, 1, 0.32, 1)', zIndex: 5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ padding: '2px 8px', background: isMe ? 'var(--accent)' : 'var(--card-bg)', color: isMe ? 'white' : 'var(--text-secondary)', fontSize: '0.6rem', fontWeight: 950, borderRadius: '6px', marginBottom: '4px', border: '1px solid var(--item-border)', boxShadow: `0 4px 10px ${isMe ? 'var(--accent-glow)' : 'transparent'}` }}>
                            {p.wpm || 0}
                          </div>
                          <Car size={clampSize(progress, 20, 28)} color={isMe ? 'var(--accent)' : 'var(--text-secondary)'} fill={isMe ? 'var(--accent)' : 'none'} style={{ filter: isMe ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none' }} />
                        </div>
                      </div>
                      <div style={{ width: `${progress}%`, height: '100%', background: isMe ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'rgba(148, 163, 184, 0.2)', borderRadius: '7px', transition: 'width 0.4s ease', opacity: isMe ? 1 : 0.6, boxShadow: isMe ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Typing Canvas */}
          <div className="card" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '32px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.8rem)', lineHeight: '1.5', textAlign: 'left', fontWeight: 500, letterSpacing: '0.01em', minHeight: '100px', color: 'var(--text-primary)' }}>
              {(() => {
                let correctCount = 0;
                while (correctCount < input.length && input[correctCount] === targetText[correctCount]) correctCount++;
                const hasError = input.length > correctCount;
                return (
                  <div style={{ opacity: countdown !== null ? 0.3 : 1, transition: 'opacity 0.3s ease' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 950, textShadow: '0 0 15px var(--success-glow)' }}>{targetText.slice(0, correctCount)}</span>
                    {hasError && <span style={{ color: 'var(--error)', backgroundColor: 'var(--error-glow)', borderRadius: '4px', padding: '0 2px', fontWeight: 950 }}>{targetText.slice(correctCount, input.length)}</span>}
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.35 }}>{targetText.slice(input.length)}</span>
                  </div>
                );
              })()}
            </div>
            <input 
              ref={inputRef} 
              className="input-field" 
              spellCheck={false} 
              autoComplete="off" 
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              disabled={room.gameState !== 'playing'}
              value={input} 
              onChange={handleChange}
              placeholder={room.gameState === 'starting' ? "GET READY..." : "TYPE TO DRIVE!"}
              style={{ 
                width: '100%', 
                fontSize: 'clamp(1rem, 3.5vw, 1.7rem)', 
                padding: 'clamp(1.2rem, 3vw, 2.2rem)', 
                textAlign: 'center', 
                height: 'clamp(70px, 12vw, 110px)', 
                borderRadius: '18px', 
                background: 'var(--item-bg)', 
                border: '2px solid var(--item-border)', 
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Racer;
