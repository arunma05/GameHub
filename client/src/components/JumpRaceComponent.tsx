import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Users, Info } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';

interface JumpRaceProps {
  room: Room;
  me: Player;
  isDark?: boolean;
}

const GRID_SIZE = 8;

// All 64 nodes of the 8x8 grid
const nodes: { x: number; y: number }[] = [];
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    nodes.push({ x: i, y: j });
  }
}

const P1_BASE = [
  "0,0", "0,1", "1,0", "0,2", "1,1", "2,0", "0,3", "1,2", "2,1", "3,0"
];
const P2_BASE = [
  "7,7", "7,6", "6,7", "7,5", "6,6", "5,7", "7,4", "6,5", "5,6", "4,7"
];

const PiecePiece3D: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <mesh castShadow position={[0, 0.1, 0]}>
      <cylinderGeometry args={[0.3, 0.3, 0.15, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[0.25, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.1} metalness={0.4} />
    </mesh>
  </group>
);

const Piece3D: React.FC<{ color: string; isSelected: boolean; isPossible: boolean }> = ({ color, isSelected, isPossible }) => (
  <group>
    {isSelected && (
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.6} />
      </mesh>
    )}
    <PiecePiece3D color={color} />
    {isPossible && (
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </mesh>
    )}
  </group>
);

const BoardBase3D: React.FC = () => (
  <group position={[0, -0.2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[8.5, 0.4, 8.5]} />
      <meshStandardMaterial color="#d1d5db" roughness={0.7} metalness={0.3} />
    </mesh>
    {/* Grid lines in 3D */}
    <group position={[0, 0.201, 0]}>
       {Array.from({length: 9}).map((_, i) => (
         <mesh key={`h-${i}`} position={[0, 0, i-4]}>
            <boxGeometry args={[8, 0.01, 0.05]} />
            <meshBasicMaterial color="rgba(0,0,0,0.1)" />
         </mesh>
       ))}
       {Array.from({length: 9}).map((_, i) => (
         <mesh key={`v-${i}`} position={[i-4, 0, 0]}>
            <boxGeometry args={[0.05, 0.01, 8]} />
            <meshBasicMaterial color="rgba(0,0,0,0.1)" />
         </mesh>
       ))}
    </group>
  </group>
);

const Node3D: React.FC<{ x: number; y: number; onClick: () => void; isPossible: boolean; ownerId?: string | null; baseColor?: string }> = ({ x, y, onClick, isPossible, ownerId, baseColor }) => (
  <mesh
    position={[x - 3.5, 0.02, y - 3.5]}
    receiveShadow
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    onPointerOver={(e) => { if (isPossible || ownerId) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
  >
    <boxGeometry args={[0.8, 0.02, 0.8]} />
    <meshStandardMaterial 
      color={isPossible ? "#22d3ee" : ((x+y)%2 === 0 ? "#1e293b" : "#0f172a")} 
      transparent={isPossible} 
      opacity={isPossible ? 0.6 : 1} 
    />
    {baseColor && (
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.16, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
      </mesh>
    )}
  </mesh>
);

const AnimatedPiece3D: React.FC<{ targetX: number; targetY: number; color: string; isSelected: boolean; onClick: () => void; interactive: boolean }> = ({ targetX, targetY, color, isSelected, onClick, interactive }) => {
  const meshRef = useRef<any>(null);
  const targetPos = new Vector3(targetX - 3.5, 0.02, targetY - 3.5);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos, 0.1);
    }
  });

  return (
    <group
      ref={meshRef}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { if (interactive) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Piece3D color={color} isSelected={isSelected} isPossible={false} />
    </group>
  );
};

export const JumpRaceComponent: React.FC<JumpRaceProps> = ({ room, me }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [lastJumpFrom, setLastJumpFrom] = useState<string | null>(null);
  const [boardRotation] = useState(room.players[1]?.id === me.id ? 0 : 180);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  
  const p1Color = '#ef4444'; // Red
  const p2Color = '#10b981'; // Green

  const gameData = room.gameData as any;
  const board = gameData?.board || {};
  const isMyTurn = room.players[room.currentTurnIndex]?.id === me.id;
  const p1Id = room.players[0]?.id;
  const p2Id = room.players[1]?.id;

  // Track piece IDs for stable 3D animations
  const pieceIdsRef = useRef<Record<string, string>>({});
  const nextPieceId = useRef(0);
  const prevBoardRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = prevBoardRef.current;
    const current = board;

    // Detect moves to maintain stable IDs
    const movedFrom = Object.keys(prev).filter(k => !current[k]);
    const movedTo = Object.keys(current).filter(k => !prev[k]);

    if (movedFrom.length === 1 && movedTo.length === 1) {
        const id = pieceIdsRef.current[movedFrom[0]];
        pieceIdsRef.current[movedTo[0]] = id;
        delete pieceIdsRef.current[movedFrom[0]];
    } else {
        // Full sync if multiple changes or first load
        Object.keys(current).forEach(k => {
            if (!pieceIdsRef.current[k]) pieceIdsRef.current[k] = `piece_${nextPieceId.current++}`;
        });
        Object.keys(pieceIdsRef.current).forEach(k => {
            if (!current[k]) delete pieceIdsRef.current[k];
        });
    }
    prevBoardRef.current = board;
  }, [board]);

  const handleNodeClick = (key: string) => {
    if (!isMyTurn) return;
    if (room.gameState !== 'playing') return;

    if (board[key] === me.id) {
      if (lastJumpFrom) {
          // If already jumping, only the current moving piece can be selected
          if (key !== lastJumpFrom) return;
      }
      setSelected(key);
      calculateMoves(key, lastJumpFrom !== null);
    } else if (selected && possibleMoves.includes(key)) {
      movePiece(selected, key);
    }
  };

  const calculateMoves = (pos: string, jumpOnly: boolean) => {
    const [x, y] = pos.split(',').map(Number);
    const moves: string[] = [];

    // Adjacent moves (only if not in the middle of a jump sequence)
    if (!jumpOnly) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
            const target = `${tx},${ty}`;
            if (!board[target]) moves.push(target);
          }
        }
      }
    }

    // Jump moves
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const midX = x + dx;
        const midY = y + dy;
        const targetX = x + 2 * dx;
        const targetY = y + 2 * dy;

        if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
          const midKey = `${midX},${midY}`;
          const targetKey = `${targetX},${targetY}`;
          if (board[midKey] && !board[targetKey]) {
            moves.push(targetKey);
          }
        }
      }
    }

    setPossibleMoves(moves);
  };

  const movePiece = (from: string, to: string) => {
    const [fx, fy] = from.split(',').map(Number);
    const [tx, ty] = to.split(',').map(Number);
    const isJump = Math.abs(tx - fx) === 2 || Math.abs(ty - fy) === 2;

    const newBoard = { ...board };
    delete newBoard[from];
    newBoard[to] = me.id;

    if (isJump) {
      setLastJumpFrom(to);
      setSelected(to);
      socket.emit('jumprace-move', { roomId: room.id, board: newBoard, lastJump: to });
      // Recalculate jumps from new position
      const nextJumps: string[] = [];
       for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const mx = tx + dx;
            const my = ty + dy;
            const trx = tx + 2 * dx;
            const tryy = ty + 2 * dy;
            if (trx >= 0 && trx < GRID_SIZE && tryy >= 0 && tryy < GRID_SIZE) {
              if (newBoard[`${mx},${my}`] && !newBoard[`${trx},${tryy}`]) nextJumps.push(`${trx},${tryy}`);
            }
          }
        }
      setPossibleMoves(nextJumps);
      if (nextJumps.length === 0) {
          endTurn();
      }
    } else {
      socket.emit('jumprace-move', { roomId: room.id, board: newBoard });
      endTurn();
    }
  };

  const endTurn = () => {
    socket.emit('jumprace-endturn', { roomId: room.id });
    setSelected(null);
    setPossibleMoves([]);
    setLastJumpFrom(null);
  };

  const p1TargetProgress = P2_BASE.filter(pos => board[pos] === p1Id).length;
  const p2TargetProgress = P1_BASE.filter(pos => board[pos] === p2Id).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-primary)' }}>
      <div className="dashboard-layout" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '2rem' }}>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
          {room.gameState === 'waiting' ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
              <Users size={64} color="var(--accent)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 950, fontSize: '2rem', marginBottom: '1rem' }}>Waiting for Opponent</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Invite a friend to race across the grid!</p>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          ) : room.gameState === 'finished' ? (
            <div className="card" style={{
              padding: '4rem 2rem', textAlign: 'center',
              background: 'var(--card-bg)',
              border: `3px solid ${room.winner?.id === me.id ? 'var(--success)' : 'var(--error)'}`,
              boxShadow: `0 0 60px ${room.winner?.id === me.id ? 'var(--success-glow)' : 'var(--error-glow)'}`
            }}>
              <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>{room.winner?.id === me.id ? '🏁' : '🏳️'}</div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '3.5rem', fontWeight: 950, marginBottom: '0.5rem' }}>{room.winner?.id === me.id ? 'VICTORY!' : 'DEFEATED'}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.4rem', marginBottom: '3rem' }}>{room.winner?.name} has completed the race!</p>
              <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })} style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 950 }}>Rematch</button>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '32px', minHeight: '650px', position: 'relative' }}>
              
              {/* Turn Indicator */}
              <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: room.currentTurnIndex === 0 ? p1Color : p2Color, boxShadow: `0 0 10px ${room.currentTurnIndex === 0 ? p1Color : p2Color}` }} />
                <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{room.players[room.currentTurnIndex]?.name}'s Turn</span>
              </div>

              {/* View Switcher Overlay */}
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', background: 'var(--item-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--item-border)', zIndex: 10 }}>
                <button onClick={() => setViewMode('2d')} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: viewMode === '2d' ? 'var(--accent)' : 'transparent', color: viewMode === '2d' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>2D</button>
                <button onClick={() => setViewMode('3d')} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: viewMode === '3d' ? 'var(--accent)' : 'transparent', color: viewMode === '3d' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>3D</button>
              </div>

              {viewMode === '2d' ? (
                <div style={{
                  position: 'relative', width: 'min(80vw, 550px)', aspectRatio: '1/1',
                  transform: `rotate(${boardRotation}deg)`,
                  transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '16px'
                }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 600">
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    


                    {nodes.map(node => {
                      const key = `${node.x},${node.y}`;
                      const ownerId = board[key];
                      const isSelected = selected === key;
                      const isPossible = possibleMoves.includes(key);
                      const cx = 50 + node.x * 62.5 + 31.25;
                      const cy = 50 + node.y * 62.5 + 31.25;

                      const isP1Base = P1_BASE.includes(key);
                      const isP2Base = P2_BASE.includes(key);

                      return (
                        <g key={key} onClick={() => handleNodeClick(key)} style={{ cursor: 'pointer' }}>
                          <rect x={cx-28} y={cy-28} width={56} height={56} fill="transparent" rx="8" />
                          {isPossible && <circle cx={cx} cy={cy} r={12} fill="var(--accent)" opacity="0.4" filter="url(#glow)" />}
                          {(isP1Base || isP2Base) && (
                            <circle 
                              cx={cx} cy={cy} r={10} 
                              fill="transparent" 
                              stroke={isP1Base ? p2Color : p1Color} 
                              strokeWidth="2.5" 
                              opacity="0.4" 
                            />
                          )}
                          {ownerId && (
                            <circle 
                              cx={cx} cy={cy} r={22} 
                              fill={ownerId === p1Id ? p1Color : p2Color} 
                              stroke={isSelected ? "#fff" : "rgba(0,0,0,0.2)"}
                              strokeWidth={isSelected ? 4 : 2}
                              style={{ transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)' }}
                              filter="url(#glow)"
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Board Grid - Drawn last to overlap highlights */}
                    {Array.from({length: 9}).map((_, i) => (
                      <line key={`lh-${i}`} x1="50" y1={50 + i * 62.5} x2="550" y2={50 + i * 62.5} stroke="var(--item-border)" strokeWidth="1.5" opacity="0.8" />
                    ))}
                    {Array.from({length: 9}).map((_, i) => (
                      <line key={`lv-${i}`} x1={50 + i * 62.5} y1="50" x2={50 + i * 62.5} y2="550" stroke="var(--item-border)" strokeWidth="1.5" opacity="0.8" />
                    ))}
                  </svg>
                </div>
              ) : (
                <div style={{ width: '100%', height: '600px', cursor: 'grab' }}>
                  <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[0, 8, 8]} fov={50} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[5, 10, 5]} intensity={1} castShadow />
                    <spotLight position={[-5, 10, -5]} intensity={0.5} />

                    <group rotation={[0, boardRotation * (Math.PI / 180), 0]}>
                      <BoardBase3D />
                      {nodes.map(node => {
                        const key = `${node.x},${node.y}`;
                        return (
                          <Node3D 
                            key={key} 
                            x={node.x} y={node.y} 
                            onClick={() => handleNodeClick(key)} 
                            isPossible={possibleMoves.includes(key)} 
                            ownerId={board[key]}
                            baseColor={P1_BASE.includes(key) ? p2Color : (P2_BASE.includes(key) ? p1Color : undefined)}
                          />
                        );
                      })}
                      {Object.entries(board).map(([key, ownerId]) => {
                        const [x, y] = key.split(',').map(Number);
                        const isSelected = selected === key;
                        const color = ownerId === p1Id ? p1Color : p2Color;
                        const interactive = isMyTurn && ownerId === me.id;
                        const pieceId = pieceIdsRef.current[key];
                        return (
                          <AnimatedPiece3D
                            key={pieceId || key}
                            targetX={x} targetY={y}
                            color={color}
                            isSelected={isSelected}
                            interactive={interactive}
                            onClick={() => handleNodeClick(key)}
                          />
                        );
                      })}
                    </group>
                    <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} minDistance={6} maxDistance={12} />
                  </Canvas>
                </div>
              )}

              {/* End Turn Button below board */}
              {isMyTurn && room.gameState === 'playing' && (
                <div style={{ marginTop: '2rem' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={endTurn} 
                    disabled={!lastJumpFrom}
                    style={{ padding: '0.8rem 2.5rem', fontWeight: 900, borderRadius: '16px', boxShadow: lastJumpFrom ? '0 10px 20px var(--accent-glow)' : 'none' }}
                  >
                    FINISH TURN
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
             
             {/* Progress Stats */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Race Progress</span>
                
                {room.players.map((p, i) => {
                  const targetProg = i === 0 ? p1TargetProgress : p2TargetProgress;
                  const percentage = (targetProg / 10) * 100;
                  return (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</span>
                        <span style={{ fontWeight: 900, color: i === 0 ? p1Color : p2Color }}>{targetProg}/10</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--item-border)' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, background: i === 0 ? p1Color : p2Color, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                  );
                })}
             </div>

             <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

             {/* Rules */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Race Rules</span>
                </div>
                {[
                  'Move all 10 coins to the opposite corner base.',
                  'Single move to any of the 8 adjacent empty cells.',
                  'Jump over any piece (yours or opponent\'s) to land in an empty cell.',
                  'Chain multiple jumps in a single turn.',
                  'If you jump, you can ONLY finish with more jumps or end turn.'
                ].map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: '0.45rem', flexShrink: 0 }} />
                    <span>{rule}</span>
                  </div>
                ))}
             </div>

             <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

             {/* Legend */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Board Compass</span>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: p1Color }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>P1 START</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: p2Color }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>P2 START</span>
                  </div>
               </div>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default JumpRaceComponent;
