import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Trophy, CheckCircle2, XCircle, Skull, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizProps {
  room: Room;
  me: Player;
}

const clampSize = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const decodeHTML = (html: string) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

export const Quiz: React.FC<QuizProps> = ({ room, me }) => {
  const [countdown, setCountdown] = useState<number | null>(3);
  const [now, setNow] = useState(Date.now());
  const questionStartRef = React.useRef<number>(Date.now());

  // Track local start time whenever a new question arrives
  useEffect(() => {
    if (room.gameState === 'playing' && !room.gameData?.showingResult) {
      questionStartRef.current = Date.now();
    }
  }, [(room.gameData as any)?.currentQ, room.gameState]);

  useEffect(() => {
    if (room.gameState === 'playing' && !room.gameData?.showingResult) {
      const interval = setInterval(() => setNow(Date.now()), 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.gameData?.showingResult, (room.gameData as any)?.currentQ]);

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
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    
    if (room.gameState === 'finished') {
      const interval: any = setInterval(function() {
        if (iWon) {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, zIndex: 2000, colors: ['#ec4899', '#3b82f6', '#fbbf24'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, zIndex: 2000, colors: ['#ec4899', '#3b82f6', '#fbbf24'] });
        } else {
          confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
          confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.5 }, zIndex: 2000, colors: ['#7f1d1d', '#450a0a', '#000000'], startVelocity: 45 });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.winner, room.winners, me.id]);

  const handleAnswer = (answer: string) => {
    const gd = room.gameData as Record<string, any>;
    if (room.gameState !== 'playing' || gd?.showingResult || gd?.answers?.[me.id]) return;
    socket.emit('quiz-answer', { roomId: room.id, answer });
  };

  if (room.gameState === 'starting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: 'clamp(0.5rem, 3vw, 2rem)', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--accent)', fontWeight: 950, letterSpacing: '0.1em' }}>GET READY</h1>
        <div style={{ fontSize: '7rem', fontWeight: 950, color: 'var(--text-primary)', textShadow: '0 0 40px var(--accent-glow)' }}>{countdown || 'LOADING...'}</div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 800, fontSize: '1.1rem', opacity: 0.8 }}>Fetching trivia questions...</p>
      </div>
    );
  }

  if (room.gameState === 'finished') {
    const winners = room.winners || (room.winner ? [room.winner] : []);
    const iWon = winners.some(w => w.id === me.id);
    const sortedPlayers = [...room.players].sort((a, b) => ((room.gameData?.scores as Record<string, number>)?.[b.id] || 0) - ((room.gameData?.scores as Record<string, number>)?.[a.id] || 0));

    return (
      <div className="immersive-screen" style={{ 
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
        zIndex: 1000, overflowY: 'auto', padding: '1rem'
      }}>
        {!iWon && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
            <div className="screen-flash" style={{ background: 'var(--error)', opacity: 0.1 }} />
          </div>
        )}
        <div className="card animate-zoom-in" style={{ 
          width: '100%', maxWidth: '580px', textAlign: 'center', 
          padding: 'clamp(1.5rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2.5rem)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2rem)',
          border: `3px solid ${iWon ? 'var(--accent)' : 'var(--error)'}`,
          boxShadow: iWon ? '0 0 60px var(--accent-glow)' : '0 0 60px var(--error-glow)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)', zIndex: 10,
          margin: 'auto'
        }}>
          <div style={{ animation: 'bounce 2s infinite ease-in-out' }}>
            {iWon ? <Trophy size={clampSize(window.innerWidth / 12, 60, 100)} color="#fbbf24" /> : <Skull size={clampSize(window.innerWidth / 12, 60, 90)} color="var(--error)" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h1 style={{ 
              margin: 0, fontWeight: 950, 
              fontSize: 'clamp(1.8rem, 8vw, 3rem)',
              color: iWon ? 'var(--accent)' : 'var(--error)',
              lineHeight: 1
            }}>
               {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 3vw, 1.15rem)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {iWon ? 'Trivia Master!' : 'Better luck next time!'}
            </p>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textAlign: 'left', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>LEADERBOARD</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedPlayers.map((p, idx) => {
                  const isCurrentMe = p.id === me.id;
                  const isWinner = idx === 0;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'clamp(0.75rem, 2vw, 1.1rem) clamp(1rem, 3vw, 1.5rem)', borderRadius: '16px',
                      background: isCurrentMe ? 'var(--accent-glow)' : 'var(--item-bg)',
                      border: `1px solid ${isCurrentMe ? 'var(--accent)' : (isWinner ? '#fbbf24' : 'var(--item-border)')}`,
                      animation: `slideLeft 0.4s ease-out ${idx * 0.1}s backwards`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', minWidth: 0 }}>
                         <span style={{ 
                            width: 'clamp(24px, 6vw, 32px)', height: 'clamp(24px, 6vw, 32px)', 
                            borderRadius: '50%', background: isWinner ? '#fbbf24' : 'var(--bg-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: 'clamp(0.7rem, 2vw, 1rem)', fontWeight: 900, color: isWinner ? '#000' : 'var(--text-primary)',
                            flexShrink: 0
                         }}>
                            {idx + 1}
                         </span>
                         <span style={{ 
                           fontSize: 'clamp(0.9rem, 3vw, 1.1rem)', 
                           fontWeight: isCurrentMe ? 950 : 800, 
                           color: isCurrentMe ? 'var(--accent)' : 'var(--text-primary)', 
                           display: 'flex', alignItems: 'center', gap: '0.4rem',
                           overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {p.name}
                            {(room.readyPlayers || []).includes(p.id) && (
                              <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', fontWeight: 950, padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>READY</span>
                            )}
                         </span>
                      </div>
                      <div style={{ fontSize: 'clamp(1rem, 3.5vw, 1.3rem)', fontWeight: 950, color: isWinner ? '#fbbf24' : 'var(--text-primary)', flexShrink: 0 }}>
                        {((room.gameData?.scores as Record<string, number>)?.[p.id] || 0)} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>PTS</span>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem', flexDirection: window.innerWidth < 480 ? 'column' : 'row' }}>
            <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })} style={{ flex: 2, height: 'clamp(55px, 12vw, 65px)', fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 950 }}>
              <RefreshCw size={18} /> PLAY AGAIN
            </button>
            <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ flex: 1, height: 'clamp(55px, 12vw, 65px)', fontWeight: 800, fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>EXIT</button>
          </div>
        </div>
      </div>
    );
  }

  if (!room.gameData?.questions) return <div>Loading...</div>;

  const gd = room.gameData as Record<string, any>;
  const question = gd.questions[gd.currentQ];
  const myAnswer = gd.answers[me.id];
  const correct = gd.showingResult ? question.correct_answer : null;
  const timeLimit = 15;
  const elapsed = gd.showingResult ? timeLimit : Math.min((now - questionStartRef.current) / 1000, timeLimit);
  const timeLeft = Math.max(timeLimit - elapsed, 0);

  return (
      <div style={{ padding: 'clamp(0.5rem, 2vw, 1.5rem) clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--accent)', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
               <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{gd.currentQ + 1}</span>
               <span style={{ opacity: 0.5, fontSize: '1.2rem' }}>/</span>
               <span style={{ opacity: 0.5, fontSize: '1.2rem' }}>{gd.questions.length}</span>
            </div>
          </div>
          <div style={{ background: 'var(--accent-glow)', padding: '0.5rem 1.25rem', borderRadius: '14px', border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 950, fontSize: '0.85rem' }}>
             ROUND {gd.currentQ + 1}
          </div>
        </div>

        <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', justifyContent: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '3.5rem 4rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '24px' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 900, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <span>TIME REMAINING</span>
                  <span style={{ color: timeLeft < 5 ? 'var(--error)' : 'var(--accent)' }}>{Math.ceil(timeLeft)}s</span>
                </div>
                <div style={{ height: '8px', background: 'var(--item-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(timeLeft / timeLimit) * 100}%`, background: timeLeft < 5 ? 'var(--error)' : 'var(--accent)', transition: 'width 0.1s linear' }} />
                </div>
              </div>

              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: '2rem' }}>
                {decodeHTML(question.question)}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {question.options.map((opt: string, i: number) => {
                  const isSelected = myAnswer === opt;
                  const isCorrect = gd.showingResult && opt === correct;
                  let bg = 'var(--item-bg)';
                  let border = '1px solid var(--item-border)';
                  if (isSelected) { bg = 'var(--accent-glow)'; border = '1px solid var(--accent)'; }
                  if (gd.showingResult && isCorrect) { bg = 'var(--success-glow)'; border = '1px solid var(--success)'; }
                  if (gd.showingResult && isSelected && !isCorrect) { bg = 'var(--error-glow)'; border = '1px solid var(--error)'; }

                  return (
                    <button key={i} onClick={() => handleAnswer(opt)} disabled={!!myAnswer || gd.showingResult} style={{ padding: '1.5rem', borderRadius: '16px', background: bg, border: border, color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', opacity: gd.showingResult && !isCorrect && !isSelected ? 0.4 : 1 }}>
                      {decodeHTML(opt)}
                      {gd.showingResult && isCorrect && <CheckCircle2 color="var(--success)" />}
                      {gd.showingResult && isSelected && !isCorrect && <XCircle color="var(--error)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="dashboard-sidebar">
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Live Scores</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {room.players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--item-bg)', borderRadius: '10px', border: p.id === me.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name} {p.id === me.id && '(You)'}</span>
                    <span style={{ fontWeight: 950, color: 'var(--accent)' }}>{gd.scores[p.id] || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Quiz;
