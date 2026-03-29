import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import type { Player, Room } from '../types';
import { Trophy, RefreshCw, Zap, TrendingUp, Play, X } from 'lucide-react';

interface FlappyProps {
  room: Room | null;
  me: Player | null;
  onRoomJoined: (me: Player) => void;
  leaderboard: { name: string; score: number }[];
}

const GRAVITY = 0.18;
const JUMP = -4.5;
const BASE_SPEED = 3.2;
const BASE_GAP = 180;
const PIPE_WIDTH = 60;
const BIRD_SIZE = 34;
const KM_SPEED_INC = 0.5;
const KM_GAP_DEC = 10;
const MIN_GAP = 120;

export const Flappy: React.FC<FlappyProps> = ({ room, me: _me, onRoomJoined, leaderboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('flappy_highscore') || 0));
  const [isGameOver, setIsGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [nameInput, setNameInput] = useState(_me?.name || '');
  const [isJoining, setIsJoining] = useState(false);
  
  // Sync isStarted with room state to prevent reset on remount
  useEffect(() => {
    if (room?.gameState === 'playing' || room?.gameState === 'starting') {
      setIsStarted(true);
      if (gameState.current) {
        gameState.current.active = true;
      }
    }
  }, [room?.gameState]);

  
  // Game state refs for the loop
  const gameState = useRef({
    birdY: 300,
    birdV: 0,
    pipes: [] as { x: number; top: number; gap: number; passed: boolean }[],
    frameCount: 0,
    score: 0,
    level: 1,
    active: true,
    isFlying: false // New: wait for first flap
  });

  const requestRef = useRef<number>(null);
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const resetGame = () => {
    gameState.current = {
      birdY: 300,
      birdV: 0,
      pipes: [],
      frameCount: 0,
      score: 0,
      level: 1,
      active: true,
      isFlying: false
    };
    setScore(0);
    setIsGameOver(false);
    setIsStarted(false);
  };

  const jump = () => {
    if (!isStarted) {
      setIsStarted(true);
      return; 
    }
    if (gameState.current.active) {
      gameState.current.isFlying = true; // Start physics on flap
      gameState.current.birdV = JUMP;
    }
  };

  const handleStartRequest = () => {
    if (!nameInput.trim() || isJoining) return;
    
    if (room && _me) {
        setIsStarted(true);
        return;
    }

    setIsJoining(true);
    socket.emit('create-room', { playerName: nameInput.trim(), type: 'flappy', isPublic: false }, (res: any) => {
      if (res.success && res.player) {
        onRoomJoined(res.player);
        socket.emit('start-game', { roomId: res.roomId });
        setIsJoining(false);
        setIsStarted(true);
        // Do NOT set isFlying yet
        gameState.current.active = true;
        gameState.current.birdY = 300;
        gameState.current.birdV = 0;
      } else {
        setIsJoining(false);
      }
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isStarted]);

  useEffect(() => {
    socket.emit('get-leaderboards');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      if (!isStarted) {
         drawIntro(ctx, canvas);
         requestRef.current = requestAnimationFrame(loop);
         return;
      }

      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    const update = () => {
      if (!gameState.current.active) return;
      if (!gameState.current.isFlying) return; // Wait for first click

      const gs = gameState.current;
      
      // Calculate Difficulty based on 10KM intervals
      const currentLevel = Math.floor(gs.score / 10000) + 1;
      const currentSpeed = BASE_SPEED + (currentLevel - 1) * KM_SPEED_INC;
      const currentGap = Math.max(MIN_GAP, BASE_GAP - (currentLevel - 1) * KM_GAP_DEC);
      
      gs.level = currentLevel;
      gs.birdV += GRAVITY;
      gs.birdY += gs.birdV;

      // Distance score (increment by speed each frame)
      gs.score += currentSpeed;
      setScore(Math.floor(gs.score));

      // Pipe generation
      gs.frameCount++;
      const pipeSpawnRate = Math.max(50, 90 - (currentLevel - 1) * 5); // Faster spawn as level increases
      if (gs.frameCount % pipeSpawnRate === 0) {
        const top = Math.random() * (canvas.height - currentGap - 150) + 50;
        gs.pipes.push({ x: canvas.width, top, gap: currentGap, passed: false });
      }

      // Pipe movement and collision
      for (let i = gs.pipes.length - 1; i >= 0; i--) {
        const p = gs.pipes[i];
        p.x -= currentSpeed;

        // Collision
        const birdLeft = 100 - BIRD_SIZE/2 + 5;
        const birdRight = 100 + BIRD_SIZE/2 - 5;
        const birdTop = gs.birdY - BIRD_SIZE/2 + 5;
        const birdBottom = gs.birdY + BIRD_SIZE/2 - 5;

        // Collision check
        if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
          if (birdTop < p.top || birdBottom > p.top + p.gap) {
            gameOver();
          }
        }

        // Remove offscreen
        if (p.x + PIPE_WIDTH < 0) {
          gs.pipes.splice(i, 1);
        }
      }

      // Floor/Ceiling collision
      if (gs.birdY + BIRD_SIZE/2 > canvas.height || gs.birdY - BIRD_SIZE/2 < 0) {
        gameOver();
      }
    };

    const gameOver = () => {
      gameState.current.active = false;
      setIsGameOver(true);
      if (gameState.current.score > highScore) {
        setHighScore(gameState.current.score);
        localStorage.setItem('flappy_highscore', String(gameState.current.score));
      }
      
      const currentRoomId = roomRef.current?.id;
      const playerName = _me?.name || nameInput;
      // Store name on socket for flappy score tracking
      (socket as any).playerName = playerName;
      if (currentRoomId) {
        socket.emit('flappy-score', { roomId: currentRoomId, score: gameState.current.score, name: playerName });
      } else {
        socket.emit('flappy-score', { score: gameState.current.score, name: playerName });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient
      const bgGrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const isLightTheme = document.body.getAttribute('data-theme') === 'light';
      bgGrade.addColorStop(0, isLightTheme ? '#bae6fd' : '#0f172a');
      bgGrade.addColorStop(1, isLightTheme ? '#e0f2fe' : '#1e293b');
      ctx.fillStyle = bgGrade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield/Cloud pattern
      ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)';
      for(let i=0; i<canvas.width; i+=40) {
          for(let j=0; j<canvas.height; j+=40) {
              ctx.beginPath();
              ctx.arc(i + (j%30), j + (i%20), 1, 0, Math.PI*2);
              ctx.fill();
          }
      }

      const gs = gameState.current;

      // Draw Pipes
      gs.pipes.forEach(p => {
        const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        pipeGrad.addColorStop(0, '#10b981');
        pipeGrad.addColorStop(0.5, '#34d399');
        pipeGrad.addColorStop(1, '#059669');

        ctx.fillStyle = pipeGrad;
        
        // Draw top pipe with rounded cap
        ctx.beginPath();
        ctx.roundRect(p.x, -50, PIPE_WIDTH, p.top + 50, [0, 0, 8, 8]);
        ctx.fill();
        
        // Draw bottom pipe with rounded cap
        ctx.beginPath();
        ctx.roundRect(p.x, p.top + p.gap, PIPE_WIDTH, canvas.height - (p.top + p.gap) + 50, [8, 8, 0, 0]);
        ctx.fill();
      });

      // Draw Bird
      ctx.save();
      ctx.translate(100, gs.birdY);
      const rotation = Math.min(Math.PI/4, Math.max(-Math.PI/4, gs.birdV * 0.1));
      ctx.rotate(rotation);

      // Body
      const birdGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, BIRD_SIZE/2);
      birdGrad.addColorStop(0, '#fbbf24');
      birdGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE/2, 0, Math.PI*2);
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(8, -5, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(10, -5, 3, 0, Math.PI*2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-10, 2, 12, 8, -Math.PI/6, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    };

    const drawIntro = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        const bgGrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const isLightTheme = document.body.getAttribute('data-theme') === 'light';
        bgGrade.addColorStop(0, isLightTheme ? '#bae6fd' : '#0f172a');
        bgGrade.addColorStop(1, isLightTheme ? '#e0f2fe' : '#1e293b');
        ctx.fillStyle = bgGrade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stars/Clouds
        ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)';
        for(let i=0; i<canvas.width; i+=40) {
            for(let j=0; j<canvas.height; j+=40) {
                ctx.beginPath();
                ctx.arc(i + (j%30), j + (i%20), 1, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // DRAW STATIC BIRD FOR PREVIEW
        ctx.save();
        ctx.translate(100, 300);
        
        // Body
        const birdGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, BIRD_SIZE/2);
        birdGrad.addColorStop(0, '#fbbf24');
        birdGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = birdGrad;
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE/2, 0, Math.PI*2);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI*2);
        ctx.fill();

        // Wing
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(-10, 2, 12, 8, -Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    };

    loop();
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isStarted, highScore]);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      minHeight: '100vh', width: '100vw', background: 'var(--bg-primary)', padding: '2rem' 
    }}>
      
      {/* Header Stats & Exit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', gap: '2rem', 
          padding: '0.75rem 2rem', background: 'var(--item-bg)', 
          borderRadius: '50px', border: '1px solid var(--item-border)', 
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{(score / 1000).toFixed(2)} KM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--success)' }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '1rem', fontWeight: 950 }}>LVL {gameState.current.level}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', opacity: 0.8 }}>
            <Trophy size={18} color="#fbbf24" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{(highScore / 1000).toFixed(2)} KM</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            width: '45px', height: '45px', borderRadius: '50%', border: '1px solid var(--item-border)',
            background: 'var(--error-glow)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--error)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--error-glow)'}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>
        
        {/* Game Area */}
        <div style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', border: '6px solid var(--card-border)', maxWidth: '100%', boxShadow: 'var(--card-shadow)' }}>
          <canvas 
            ref={canvasRef} 
            width={450} 
            height={650} 
            onClick={jump}
            style={{ display: 'block', maxWidth: '100%', height: 'auto', touchAction: 'none', cursor: !isStarted || isGameOver ? 'default' : 'pointer' }}
          />

          {!isStarted && (
            <div style={{ 
              position: 'absolute', inset: 0, 
              background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '2.5rem', padding: '2rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.2em', marginBottom: '0.5rem' }}>BIRD PILOT</div>
                {_me ? (
                  <h1 style={{ fontSize: '3rem', fontWeight: 950, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{_me.name}</h1>
                ) : (
                  <div className="input-group">
                    <input 
                      className="input-field" 
                      placeholder="ENTER YOUR NAME..." 
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      style={{ fontSize: '1.4rem', padding: '1.25rem', textAlign: 'center', width: '280px' }}
                      maxLength={15}
                    />
                  </div>
                )}
              </div>

              <button 
                  className="btn btn-primary" 
                  onClick={handleStartRequest} 
                  disabled={!nameInput.trim() || isJoining}
                  style={{ width: '240px', height: '70px', fontSize: '1.4rem', fontWeight: 900, borderRadius: '20px', boxShadow: '0 0 40px rgba(59,130,246,0.3)', opacity: !nameInput.trim() || isJoining ? 0.6 : 1 }}
              >
                {isJoining ? '...' : <><Play size={24} fill="currentColor" /> START GAME</>}
              </button>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.15em' }}>MOUSE CLICK TO FLY</div>
            </div>
          )}

          {isGameOver && (
            <div style={{ 
              position: 'absolute', inset: 0, 
              background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '2rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <TrendingUp size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '3.5rem', fontWeight: 950, margin: 0, color: 'var(--text-primary)' }}>CRASHED!</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 900 }}>You flew a distance of {(score / 1000).toFixed(2)} KM</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', width: '80%' }}>
                <button className="btn btn-primary" onClick={resetGame} style={{ flex: 1, height: '60px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={20} /> TRY AGAIN
                </button>
                <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ flex: 1, height: '60px', fontWeight: 700 }}>
                  EXIT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Leaderboard Box */}
        <div style={{ 
          width: '320px', padding: '2rem', 
          background: 'var(--card-bg)', backdropFilter: 'blur(10px)',
          borderRadius: '32px', border: '1px solid var(--item-border)',
          alignSelf: 'stretch', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
            <Trophy color="#fbbf24" size={24} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.1em' }}>TOP FLYERS</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto' }}>
            {[...leaderboard]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((entry, i) => (
                    <div key={`${entry.name}-${i}`} style={{ 
                        display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', 
                        background: i < 3 ? 'var(--accent-glow)' : 'var(--item-bg)', 
                        borderRadius: '12px', fontSize: '0.9rem',
                        border: '1px solid var(--item-border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ 
                                color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : 'var(--text-secondary)', 
                                fontWeight: 900, fontSize: '0.8rem', width: '1.5rem'
                            }}>
                                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                            </span>
                            <span style={{ color: i < 3 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i < 3 ? 950 : 700 }}>{entry.name}</span>
                        </div>
                        <span style={{ color: i < 3 ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 900 }}>{(entry.score / 1000).toFixed(2)} KM</span>
                    </div>
                ))
            }
            {leaderboard.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '2rem' }}>Be the first to fly!</div>
            )}
          </div>
        </div>

      </div>

      <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.2em' }}>
        SPACEBAR TO JUMP · CLICK TO PLAY
      </p>
    </div>
  );
};

export default Flappy;
