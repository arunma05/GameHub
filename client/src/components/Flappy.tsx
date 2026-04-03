import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import type { Player, Room } from '../types';
import { Trophy, RefreshCw, TrendingUp, Play, Activity, ArrowLeft } from 'lucide-react';

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
  const [playerName] = useState(() => {
    if (_me?.name) return _me.name;
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved).name : 'PILOT';
  });
  const [isJoining, setIsJoining] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (room?.gameState === 'playing' || room?.gameState === 'starting') {
      setIsStarted(true);
      if (gameState.current) {
        gameState.current.active = true;
      }
    }
  }, [room?.gameState]);

  const gameState = useRef({
    birdY: 300,
    birdV: 0,
    pipes: [] as { x: number; top: number; gap: number; passed: boolean }[],
    frameCount: 0,
    score: 0,
    level: 1,
    active: true,
    isFlying: false
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
      gameState.current.isFlying = true;
      gameState.current.birdV = JUMP;
    }
  };

  const handleStartRequest = () => {
    if (isJoining) return;
    if (room && _me) {
      setIsStarted(true);
      return;
    }
    setIsJoining(true);
    socket.emit('create-room', { playerName: playerName, type: 'flappy', isPublic: false }, (res: any) => {
      if (res.success && res.player) {
        onRoomJoined(res.player);
        socket.emit('start-game', { roomId: res.roomId });
        setIsJoining(false);
        setIsStarted(true);
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
      if (!gameState.current.isFlying) return;
      const gs = gameState.current;
      const currentLevel = Math.floor(gs.score / 5000) + 1;
      const currentSpeed = BASE_SPEED + (currentLevel - 1) * KM_SPEED_INC;
      const currentGap = Math.max(MIN_GAP, BASE_GAP - (currentLevel - 1) * KM_GAP_DEC);
      gs.level = currentLevel;
      gs.birdV += GRAVITY;
      gs.birdY += gs.birdV;
      gs.score += currentSpeed;
      setScore(Math.floor(gs.score));
      gs.frameCount++;
      const pipeSpawnRate = Math.max(50, 90 - (currentLevel - 1) * 5);
      if (gs.frameCount % pipeSpawnRate === 0) {
        const top = Math.random() * (canvas.height - currentGap - 150) + 50;
        gs.pipes.push({ x: canvas.width, top, gap: currentGap, passed: false });
      }
      for (let i = gs.pipes.length - 1; i >= 0; i--) {
        const p = gs.pipes[i];
        p.x -= currentSpeed;
        const birdLeft = 100 - BIRD_SIZE / 2 + 5;
        const birdRight = 100 + BIRD_SIZE / 2 - 5;
        const birdTop = gs.birdY - BIRD_SIZE / 2 + 5;
        const birdBottom = gs.birdY + BIRD_SIZE / 2 - 5;
        if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
          if (birdTop < p.top || birdBottom > p.top + p.gap) {
            gameOver();
          }
        }
        if (p.x + PIPE_WIDTH < 0) {
          gs.pipes.splice(i, 1);
        }
      }
      if (gs.birdY + BIRD_SIZE / 2 > canvas.height || gs.birdY - BIRD_SIZE / 2 < 0) {
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
      const playerNameCurrent = _me?.name || playerName;
      (socket as any).playerName = playerNameCurrent;
      if (currentRoomId) {
        socket.emit('flappy-score', { roomId: currentRoomId, score: gameState.current.score, name: playerNameCurrent });
      } else {
        socket.emit('flappy-score', { score: gameState.current.score, name: playerNameCurrent });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bgGrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const isLightTheme = document.body.getAttribute('data-theme') === 'light';
      bgGrade.addColorStop(0, isLightTheme ? '#bae6fd' : '#0f172a');
      bgGrade.addColorStop(1, isLightTheme ? '#e0f2fe' : '#1e293b');
      ctx.fillStyle = bgGrade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)';
      for (let i = 0; i < canvas.width; i += 40) {
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.beginPath();
          ctx.arc(i + (j % 30), j + (i % 20), 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const gs = gameState.current;
      gs.pipes.forEach(p => {
        const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        pipeGrad.addColorStop(0, '#10b981');
        pipeGrad.addColorStop(0.5, '#34d399');
        pipeGrad.addColorStop(1, '#059669');
        ctx.fillStyle = pipeGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, -50, PIPE_WIDTH, p.top + 50, [0, 0, 8, 8]);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(p.x, p.top + p.gap, PIPE_WIDTH, canvas.height - (p.top + p.gap) + 50, [8, 8, 0, 0]);
        ctx.fill();
      });
      ctx.save();
      ctx.translate(100, gs.birdY);
      const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, gs.birdV * 0.1));
      ctx.rotate(rotation);

      // Tail (Oval)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(-BIRD_SIZE / 2 - 2, 0, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (The 'Round' Shape)
      const birdGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, BIRD_SIZE / 2);
      birdGrad.addColorStop(0, '#fbbf24');
      birdGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2 + 2, BIRD_SIZE / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing (Animated)
      const wingMotion = Math.sin(gs.frameCount * 0.25) * 12;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-8, 3, 15, Math.max(2, 11 + wingMotion), 0, 0, Math.PI * 2);
      ctx.fill();

      // Beak (Red)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(BIRD_SIZE / 2 - 2, -2);
      ctx.lineTo(BIRD_SIZE / 2 + 10, 2);
      ctx.lineTo(BIRD_SIZE / 2 - 2, 6);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(8, -6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(10, -6, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawIntro = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bgGrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const isLightTheme = document.body.getAttribute('data-theme') === 'light';
      bgGrade.addColorStop(0, isLightTheme ? '#bae6fd' : '#0f172a');
      bgGrade.addColorStop(1, isLightTheme ? '#e0f2fe' : '#1e293b');
      ctx.fillStyle = bgGrade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)';
      for (let i = 0; i < canvas.width; i += 40) {
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.beginPath();
          ctx.arc(i + (j % 30), j + (i % 20), 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.translate(100, 300);

      // Tail (Oval)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(-BIRD_SIZE / 2 - 2, 0, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const birdGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, BIRD_SIZE / 2);
      birdGrad.addColorStop(0, '#fbbf24');
      birdGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2 + 2, BIRD_SIZE / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-8, 3, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(BIRD_SIZE / 2 - 2, -2);
      ctx.lineTo(BIRD_SIZE / 2 + 10, 2);
      ctx.lineTo(BIRD_SIZE / 2 - 2, 6);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(8, -6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(10, -6, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    loop();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isStarted, highScore]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '0.86rem', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: 'var(--accent-glow)', padding: '0.5rem 1.5rem', borderRadius: '12px', border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontWeight: 900, fontSize: '0.85rem' }}>
            <Activity size={14} color="var(--accent)" />
            <span>{(score / 1000).toFixed(2)} KM</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--accent)', opacity: 0.3 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 900, fontSize: '0.85rem' }}>
            <TrendingUp size={14} />
            <span>LVL {gameState.current.level}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 clamp(1rem, 3vw, 2rem) 2rem clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            <div style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', border: '6px solid #334155', maxWidth: '100%', boxShadow: 'var(--card-shadow)', background: '#000' }}>
              <canvas
                ref={canvasRef}
                width={450}
                height={650}
                onClick={jump}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', touchAction: 'none', cursor: !isStarted || isGameOver ? 'default' : 'pointer', margin: '0 auto' }}
              />

              {!isStarted && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '2.5rem', padding: '2rem', zIndex: 100
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.2em', marginBottom: '0.5rem' }}>BIRD PILOT</div>
                    <h1 style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: 950, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', textAlign: 'center' }}>{playerName}</h1>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleStartRequest}
                    disabled={isJoining}
                    style={{ width: '240px', height: '70px', fontSize: '1.4rem', fontWeight: 900, borderRadius: '20px', boxShadow: '0 0 40px rgba(59,130,246,0.3)', opacity: isJoining ? 0.6 : 1 }}
                  >
                    {isJoining ? '...' : <><Play size={24} fill="currentColor" /> START GAME</>}
                  </button>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.15em' }}>CLICK OR SPACE TO FLY</div>
                </div>
              )}

              {isGameOver && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '2rem', zIndex: 100
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <TrendingUp size={64} color="var(--error)" style={{ marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 950, margin: 0, color: 'var(--text-primary)' }}>CRASHED!</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 900 }}>Distance: {(score / 1000).toFixed(2)} KM</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', width: '80%', maxWidth: '400px' }}>
                    <button className="btn btn-primary" onClick={resetGame} style={{ flex: 1, height: '60px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={20} /> TRY AGAIN
                    </button>
                    <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ width: '60px', height: '60px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', flexShrink: 0 }}>
                      <ArrowLeft size={22} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-sidebar">
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                  <Trophy color="#fbbf24" size={24} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>TOP FLYERS</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {[...leaderboard]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map((entry, i) => (
                      <div key={`${entry.name}-${i}`} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.4rem 0.5rem',
                        borderRadius: '8px',
                        background: i < 3 ? 'var(--accent-glow)' : 'transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 950, fontSize: '0.8rem', width: '1.5rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: i < 3 ? 800 : 600, fontSize: '0.85rem' }}>{entry.name}</span>
                        </div>
                        <span style={{ color: i < 3 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 800, fontSize: '0.8rem' }}>{(entry.score / 1000).toFixed(2)} KM</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--accent-glow)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)' }}>
                  <TrendingUp size={20} />
                  <span style={{ fontWeight: 950, fontSize: '1rem' }}>PERSONAL BEST</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{(highScore / 1000).toFixed(2)} <span style={{ fontSize: '1rem', opacity: 0.6 }}>KM</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flappy;
