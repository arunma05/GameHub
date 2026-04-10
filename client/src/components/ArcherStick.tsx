import React, { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { RefreshCcw, Info, MousePointer2, Trophy, Heart } from 'lucide-react';

interface ArcherStickProps {
  room: Room;
  me: Player;
  isDark?: boolean;
}

interface ArcherStickData {
    health: Record<string, number>;
    playerPos: Record<string, { x: number; y: number; dir: number }>;
    arrows: { x: number; y: number; vx: number; vy: number; ownerId: string }[];
}

interface LocalArrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  angle: number;
  isDead: boolean;
}

export const ArcherStick: React.FC<ArcherStickProps> = ({ room, me, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localArrows, setLocalArrows] = useState<LocalArrow[]>([]);
  const [aim, setAim] = useState<{ angle: number; power: number } | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  
  const g = room.gameData as any as ArcherStickData;
  const players = room.players;
  const opponent = players.find(p => p.id !== me.id);
  
  const myPos = g?.playerPos?.[me.id];
  const oppPos = (opponent && g?.playerPos) ? g.playerPos[opponent.id] : null;

  const myHealth = g?.health?.[me.id] ?? 10;
  const oppHealth = (opponent && g?.health) ? g.health[opponent.id] : 10;

  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  const gravity = 0.15;

  const drawStickman = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dir: number, health: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 50, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x, y - 10);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.stroke();

    // Arms (holding bow)
    const armX = x + 15 * dir;
    ctx.beginPath();
    ctx.moveTo(x, y - 35);
    ctx.lineTo(armX, y - 25);
    ctx.stroke();

    // Bow
    ctx.save();
    ctx.translate(armX, y - 25);
    ctx.scale(dir, 1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    // String
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-Math.PI * 0.4) * 20, Math.sin(-Math.PI * 0.4) * 20);
    ctx.lineTo(Math.cos(Math.PI * 0.4) * 20, Math.sin(Math.PI * 0.4) * 20);
    ctx.stroke();
    ctx.restore();

    // Health Bar
    const barW = 40;
    ctx.fillStyle = '#333';
    ctx.fillRect(x - barW/2, y - 75, barW, 4);
    ctx.fillStyle = health > 4 ? '#10b981' : '#f43f5e';
    ctx.fillRect(x - barW/2, y - 75, (health / 10) * barW, 4);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, arrow: LocalArrow) => {
    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);
    ctx.strokeStyle = isDark ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(10, -3);
    ctx.moveTo(15, 0);
    ctx.lineTo(10, 3);
    ctx.stroke();
    ctx.restore();
  };

  const update = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const delta = (time - lastTimeRef.current) / 16; // Normalized to 60fps
      
      setLocalArrows(prev => {
        let hitDetected = false;
        const next = prev.map(a => {
          if (a.isDead) return a;
          const nextA = { ...a, x: a.x + a.vx * delta, y: a.y + a.vy * delta };
          nextA.vy += gravity * delta;
          nextA.angle = Math.atan2(nextA.vy, nextA.vx);

          // Check hit
          if (oppPos && a.ownerId === me.id) {
            const d = Math.hypot(nextA.x - oppPos.x, nextA.y - (oppPos.y - 25)); // Target mid body
            if (d < 25) {
              nextA.isDead = true;
              if (!hitDetected) {
                socket.emit('archerstick-hit', { roomId: room.id, targetId: opponent!.id });
                hitDetected = true;
              }
            }
          }

          // Check floor
          if (nextA.y > 450) nextA.isDead = true;
          // Check walls
          if (nextA.x < 0 || nextA.x > 800) nextA.isDead = true;

          return nextA;
        });
        return next.filter(a => !a.isDead);
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  }, [me.id, oppPos, room.id, opponent]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    const handleShot = (data: { x: number, y: number, angle: number, ownerId: string }) => {
        if (data.ownerId === me.id) return;
        const v = 8; // Constant for now or use data.v
        const vx = Math.cos(data.angle) * v;
        const vy = Math.sin(data.angle) * v;
        setLocalArrows(prev => [...prev, { ...data, vx, vy, isDead: false }]);
    };
    socket.on('archer-shot', handleShot);
    return () => { socket.off('archer-shot', handleShot); };
  }, [me.id]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (room.gameState !== 'playing') return;
    setIsCharging(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCharging || !myPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Scale for canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const dx = canvasX - myPos.x;
    const dy = canvasY - myPos.y;
    const angle = Math.atan2(dy, dx);
    const power = Math.min(Math.hypot(dx, dy) / 10, 15);
    setAim({ angle, power });
  };

  const handleMouseUp = () => {
    if (!isCharging || !aim || !myPos) {
        setIsCharging(false);
        setAim(null);
        return;
    }
    
    const v = aim.power;
    const vx = Math.cos(aim.angle) * v;
    const vy = Math.sin(aim.angle) * v;
    
    const newArrow = { x: myPos.x, y: myPos.y, vx, vy, ownerId: me.id, angle: aim.angle, isDead: false };
    setLocalArrows(prev => [...prev, newArrow]);
    
    socket.emit('archerstick-action', { 
        roomId: room.id, 
        type: 'shoot', 
        x: myPos.x, 
        y: myPos.y, 
        angle: aim.angle,
        v: aim.power
    });

    setIsCharging(false);
    setAim(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.strokeStyle = isDark ? '#333' : '#eee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 450);
    ctx.lineTo(800, 450);
    ctx.stroke();

    // Draw players
    const p1Color = '#3b82f6'; // Bright Blue
    const p2Color = '#f43f5e'; // Bright Rose
    
    if (myPos) drawStickman(ctx, myPos.x, myPos.y, p1Color, myPos.dir, myHealth);
    if (oppPos && opponent) drawStickman(ctx, oppPos.x, oppPos.y, p2Color, oppPos.dir, oppHealth);

    // Draw aim line
    if (aim && myPos) {
       ctx.strokeStyle = 'var(--accent)';
       ctx.setLineDash([5, 5]);
       ctx.beginPath();
       ctx.moveTo(myPos.x, myPos.y - 25);
       ctx.lineTo(myPos.x + Math.cos(aim.angle) * aim.power * 10, myPos.y - 25 + Math.sin(aim.angle) * aim.power * 10);
       ctx.stroke();
       ctx.setLineDash([]);
    }

    // Draw arrows
    localArrows.forEach(a => drawArrow(ctx, a));

  }, [localArrows, aim, myPos, oppPos, myHealth, oppHealth, isDark, me.id, opponent]);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>P1</div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{me.name}</div>
                <div style={{ display: 'flex', gap: '2px' }}>
                   {Array.from({length: 10}).map((_, i) => (
                      <Heart key={i} size={14} fill={i < myHealth ? '#3b82f6' : 'none'} color={i < myHealth ? '#3b82f6' : 'var(--text-secondary)'} />
                   ))}
                </div>
              </div>
           </div>
           <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-secondary)', opacity: 0.3 }}>VS</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>{opponent?.name || 'Waiting...'}</div>
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
                   {Array.from({length: 10}).map((_, i) => (
                      <Heart key={i} size={14} fill={i < oppHealth ? '#f43f5e' : 'none'} color={i < oppHealth ? '#f43f5e' : 'var(--text-secondary)'} />
                   ))}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f43f5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>P2</div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="card" style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
               MULTIPLAYER Archer Stick
            </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative', width: '100%', background: isDark ? '#0a0a0c' : '#f8fafc', borderRadius: '24px', border: '1px solid var(--item-border)' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ width: '100%', height: 'auto', cursor: 'crosshair', touchAction: 'none' }}
        />

        {room.gameState === 'finished' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
             <div className="card animate-scale-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px', border: '2px solid var(--accent)' }}>
                <Trophy size={64} color="var(--accent)" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px var(--accent-glow))' }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '0.5rem' }}>
                    {room.winner?.id === me.id ? 'VICTORY!' : 'DEFEATED'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '2rem' }}>
                    {room.winner?.name} has won the duel.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                        className="btn btn-primary btn-lg" 
                        onClick={() => socket.emit('play-again', { roomId: room.id })}
                        style={{ width: '100%', fontWeight: 800 }}
                    >
                        <RefreshCcw size={20} /> Play Again
                    </button>
                    {room.readyPlayers?.includes(me.id) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>
                           Waiting for opponent...
                        </div>
                    )}
                </div>
             </div>
          </div>
        )}

        {room.gameState === 'waiting' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
             <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem' }}>Waiting for opponent...</h3>
                <p>Archer Stick is a 2-player game.</p>
             </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
         <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <MousePointer2 size={20} color="var(--accent)" />
            </div>
            <div>
               <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CONTROLS</div>
               <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Drag to Aim & Shoot</div>
            </div>
         </div>
         <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Info size={20} color="var(--accent)" />
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
               Hit your opponent <strong>10 times</strong> to win. Watch the arrow's trajectory!
            </p>
         </div>
      </div>

    </div>
  );
};
