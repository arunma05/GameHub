import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Brain, Trophy, CheckCircle2, XCircle, User, Users, Star, Skull } from 'lucide-react';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (room.gameState === 'playing' && !room.gameData?.showingResult) {
      const interval = setInterval(() => setNow(Date.now()), 100);
      return () => clearInterval(interval);
    }
  }, [room.gameState, room.gameData?.showingResult, room.gameData?.currentQ]);

  // Handle countdown when starting
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

  // Infinite Sprinkle (Winner) or Blast (Defeated)
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--accent)', fontWeight: 950, letterSpacing: '0.1em' }}>GET READY</h1>
        <div style={{ fontSize: '7rem', fontWeight: 950, color: 'var(--text-primary)', textShadow: '0 0 40px var(--accent-glow)' }}>{countdown || 'LOADING...'}</div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 800, fontSize: '1.1rem', opacity: 0.8 }}>Fetching fresh trivia from the digital abyss...</p>
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
        background: iWon ? 'var(--bg-primary)' : 'linear-gradient(135deg, #000 0%, #1a0505 100%)',
        zIndex: 1000, overflowY: 'auto', padding: '5rem 0'
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
          border: iWon ? '3px solid var(--accent)' : '3px solid #ef4444',
          boxShadow: iWon ? '0 0 60px var(--accent-glow)' : '0 0 60px rgba(239, 68, 68, 0.3)',
          background: 'var(--card-bg)', backdropFilter: 'blur(30px)', zIndex: 10
        }}>
          <div style={{ position: 'relative' }}>
            {iWon ? (
              <div style={{ position: 'relative' }}>
                <Trophy size={100} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.6))' }} />
                <Star size={40} color="#f59e0b" fill="#f59e0b" style={{ position: 'absolute', top: -10, right: -20, animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : (
              <Skull size={90} color="#ef4444" style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.5))' }} />
            )}
          </div>
          
          <div>
            <h1 className="responsive-title" style={{ 
                fontWeight: 950, 
                background: iWon ? 'linear-gradient(to bottom, var(--text-primary), var(--accent))' : 'linear-gradient(to bottom, var(--text-primary), #ef4444)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                margin: '0', letterSpacing: '0.1em'
            }}>
              {iWon ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {iWon ? 'You survived the tech gauntlet!' : 'Better luck next time!'}
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
                      border: `1px solid ${isCurrentMe ? 'var(--accent)' : (isWinner ? 'rgba(251,191,36,0.2)' : 'var(--item-border)')}`,
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
                              <span style={{ background: '#10b981', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.05em' }}>READY</span>
                            )}
                         </span>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: isWinner ? '#fbbf24' : 'white' }}>
                        {((room.gameData?.scores as Record<string, number>)?.[p.id] || 0)} pts
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
              disabled={room.hostId === me.id && room.players.length > 1 && !room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id)) && (room.readyPlayers || []).includes(me.id)}
              style={{ 
                flex: 2, height: '70px', fontSize: '1.5rem', fontWeight: 900,
                background: (room.hostId !== me.id && (room.readyPlayers || []).includes(me.id)) ? '#10b981' : 'linear-gradient(135deg, #ec4899, #be185d)',
                border: (room.hostId !== me.id && (room.readyPlayers || []).includes(me.id)) ? 'none' : undefined
              }}
            >
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

  // Active playing view
  if (!room.gameData?.questions) return <div>Loading...</div>;

  const gd = room.gameData as Record<string, any>;
  const questions = gd.questions;
  const currentQ = gd.currentQ;
  const answers = gd.answers;
  const showingResult = gd.showingResult;
  const scores = gd.scores;
  const qStartTime = gd.qStartTime;

  const question = questions[currentQ];
  const myAnswer = answers[me.id];
  const correct = showingResult ? question.correct_answer : null;
  const timeLimit = 15;
  const elapsed = showingResult ? timeLimit : (qStartTime ? Math.min((now - qStartTime) / 1000, timeLimit) : 0);
  const timeLeft = Math.max(timeLimit - elapsed, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0, fontSize: '2rem', color: '#ec4899', fontWeight: 900 }}>
          <Brain size={40} /> TECH QUIZ
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: '12px', fontWeight: 900, border: '1px solid var(--accent)' }}>
            Question {currentQ + 1} / {questions.length}
          </div>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--item-bg)', color: 'var(--text-secondary)', borderRadius: '12px', fontWeight: 800, border: '1px solid var(--item-border)' }}>
            Room: {room.id}
          </div>
        </div>
      </div>

      <div className="container responsive-flex" style={{ gap: '2rem', alignItems: 'stretch' }}>
        
        {/* Main Quiz Area */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2.5rem', background: 'var(--card-bg)', borderTop: '4px solid var(--accent)' }}>
            
            {/* Timer Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 900 }}>TIME REMAINING</div>
              <div style={{ color: timeLeft > 5 ? 'var(--accent)' : 'var(--error)', fontSize: '1.2rem', fontWeight: 950 }}>
                 {Math.ceil(timeLeft)}s
              </div>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'var(--item-bg)', borderRadius: '5px', marginBottom: '2rem', overflow: 'hidden', border: '1px solid var(--item-border)' }}>
               <div style={{ 
                 height: '100%', 
                 width: `${(timeLeft / timeLimit) * 100}%`,
                 background: timeLeft > 5 ? 'var(--accent)' : '#ef4444',
                 transition: 'width 0.1s linear, background 0.3s ease'
               }} />
            </div>

            <h2 style={{ fontSize: '1.8rem', lineHeight: 1.4, fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem' }}>
              {decodeHTML(question.question)}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {question.options.map((opt: string, i: number) => {
                const isSelected = myAnswer === opt;
                const isCorrect = showingResult && opt === correct;
                const isWrongSelected = showingResult && isSelected && !isCorrect;

                let bg = 'rgba(255,255,255,0.05)';
                let border = '2px solid rgba(255,255,255,0.1)';
                
                if (showingResult) {
                  if (isCorrect) {
                     bg = 'var(--success-glow)';
                     border = '2px solid var(--success)';
                  } else if (isWrongSelected) {
                     bg = 'var(--error-glow)';
                     border = '2px solid var(--error)';
                  } else if (isSelected) {
                     bg = 'var(--accent-glow)';
                     border = '2px solid var(--accent)';
                  }
                } else if (isSelected) {
                  bg = 'var(--accent-glow)';
                  border = '2px solid var(--accent)';
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!myAnswer || showingResult}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '16px',
                      background: bg,
                      border: border,
                      color: 'var(--text-primary)',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: myAnswer || showingResult ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: showingResult && !isCorrect && !isSelected ? 0.4 : 1
                    }}
                  >
                    <span>{decodeHTML(opt)}</span>
                    {showingResult && isCorrect && <CheckCircle2 color="#10b981" />}
                    {showingResult && isWrongSelected && <XCircle color="#ef4444" />}
                  </button>
                );
              })}
            </div>
            
            {showingResult && (
               <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 950, color: myAnswer === correct ? 'var(--success)' : 'var(--error)', animation: 'pulse 1s infinite' }}>
                  {myAnswer === correct ? '+10 POINTS!' : 'INCORRECT'}
               </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Users size={18} /> Players
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {room.players.map(p => {
                const hasAnswered = !!answers[p.id];
                return (
                  <div key={p.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <User size={16} color={p.id === me.id ? 'var(--accent)' : 'var(--text-secondary)'} />
                      <span style={{ fontWeight: p.id === me.id ? 900 : 500, color: p.id === me.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {hasAnswered && !showingResult && <CheckCircle2 size={16} color="#10b981" />}
                      <span style={{ fontWeight: 800, color: '#fbbf24' }}>{scores[p.id] || 0} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
