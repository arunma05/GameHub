import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Brain, Trophy, CheckCircle2, XCircle, Skull, RefreshCw, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizProps {
  room: Room;
  me: Player;
}

const decodeHTML = (html: string) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

export const Quiz: React.FC<QuizProps> = ({ room, me }) => {
  const [countdown, setCountdown] = useState<number | null>(3);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (room.gameState === 'playing' && !room.gameData?.showingResult) {
      const interval = setInterval(() => setNow(Date.now()), 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.gameData?.showingResult, room.gameData?.currentQ]);

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
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'var(--bg-primary)',
        zIndex: 1000, overflowY: 'auto', padding: '5rem 0'
      }}>
        {!iWon && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
            <div className="screen-flash" style={{ background: 'var(--error)', opacity: 0.1 }} />
          </div>
        )}
        <div className="card animate-fade-in" style={{ 
          width: '100%', maxWidth: '650px', textAlign: 'center', padding: '3.5rem 2rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem',
          border: `3px solid ${iWon ? 'var(--accent)' : 'var(--error)'}`,
          boxShadow: iWon ? '0 0 60px var(--accent-glow)' : '0 0 60px var(--error-glow)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)', zIndex: 10
        }}>
          {iWon ? <Trophy size={100} color="#fbbf24" /> : <Skull size={90} color="var(--error)" />}
          <div>
            <h1 style={{ margin: 0, fontWeight: 950, color: iWon ? 'var(--accent)' : 'var(--error)' }}>
               {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {iWon ? 'TECH MASTER!' : 'OBLITERATED!'}
            </p>
          </div>
          <div style={{ width: '100%', padding: '0 1rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedPlayers.map((p, idx) => {
                  const isCurrentMe = p.id === me.id;
                  const isWinner = idx === 0;
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem', borderRadius: '16px',
                      background: isCurrentMe ? 'var(--accent-glow)' : 'var(--item-bg)',
                      border: `1px solid ${isCurrentMe ? 'var(--accent)' : (isWinner ? '#fbbf24' : 'var(--item-border)')}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <span style={{ 
                            width: '32px', height: '32px', borderRadius: '50%', background: isWinner ? '#fbbf24' : 'var(--bg-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: isWinner ? '#000' : 'var(--text-primary)'
                         }}>
                            {idx + 1}
                         </span>
                         <span style={{ fontSize: '1.2rem', fontWeight: isCurrentMe ? 900 : 800, color: isCurrentMe ? 'var(--accent)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {p.name} {isCurrentMe && '(You)'}
                            {(room.readyPlayers || []).includes(p.id) && (
                              <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.05em' }}>READY</span>
                            )}
                         </span>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 950, color: isWinner ? '#fbbf24' : 'var(--text-primary)' }}>
                        {((room.gameData?.scores as Record<string, number>)?.[p.id] || 0)} pts
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })} style={{ flex: 2, height: '70px', fontSize: '1.5rem', fontWeight: 950 }}>
              <RefreshCw size={24} /> PLAY AGAIN
            </button>
            <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ flex: 1, height: '70px', fontWeight: 800 }}>EXIT</button>
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
  const elapsed = gd.showingResult ? timeLimit : (gd.qStartTime ? Math.min((now - gd.qStartTime) / 1000, timeLimit) : 0);
  const timeLeft = Math.max(timeLimit - elapsed, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '1rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => window.location.reload()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', padding: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 950, fontSize: '1.2rem' }}>
            <Brain size={24} color="#ec4899" /> TECH QUIZ
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: '12px', fontWeight: 800, border: '1px solid var(--accent)' }}>
            {gd.currentQ + 1} / {gd.questions.length}
          </div>
        </div>
      </div>

      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
    </div>
  );
};

export default Quiz;
