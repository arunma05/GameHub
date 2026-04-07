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

/*
 * 4 corner bases — each is a 10-cell right-triangle.
 * Index = player slot (0-3). Opposite pairs: 0↔3, 1↔2.
 */
const buildTriangle = (cornerX: number, cornerY: number): string[] => {
  const dx = cornerX === 0 ? 1 : -1;
  const dy = cornerY === 0 ? 1 : -1;
  const cells: string[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4 - i; j++)
      cells.push(`${cornerX + dx * i},${cornerY + dy * j}`);
  return cells;
};

const CORNER_BASES = [
  buildTriangle(0, 0), // slot 0 — top-left
  buildTriangle(7, 0), // slot 1 — top-right
  buildTriangle(0, 7), // slot 2 — bottom-left
  buildTriangle(7, 7), // slot 3 — bottom-right
];
const OPPOSITE = [3, 2, 1, 0];
const SLOT_COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b'];

// 2D board: rotate so each player's corner is at the BOTTOM POINT of the diamond.
// Slot 0 (TL): 180 + 45 = 225, Slot 1 (TR): 90 + 45 = 135, Slot 2 (BL): 270 + 45 = 315, Slot 3 (BR): 0 + 45 = 45
const BOARD_ROTATIONS = [225, 135, 315, 45];

const nodes: { x: number; y: number }[] = [];
for (let i = 0; i < GRID_SIZE; i++)
  for (let j = 0; j < GRID_SIZE; j++)
    nodes.push({ x: i, y: j });

// ── 3D sub-components ──────────────────────────────────────────────────────────

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

const Piece3D: React.FC<{ color: string; isSelected: boolean }> = ({ color, isSelected }) => (
  <group>
    {isSelected && (
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.6} />
      </mesh>
    )}
    <PiecePiece3D color={color} />
  </group>
);

const BoardBase3D: React.FC = () => (
  <group position={[0, -0.2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[8.5, 0.4, 8.5]} />
      <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.3} />
    </mesh>
    <group position={[0, 0.201, 0]}>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`h-${i}`} position={[0, 0, i - 4]}>
          <boxGeometry args={[8, 0.01, 0.06]} />
          <meshBasicMaterial color="#475569" />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`v-${i}`} position={[i - 4, 0, 0]}>
          <boxGeometry args={[0.06, 0.01, 8]} />
          <meshBasicMaterial color="#475569" />
        </mesh>
      ))}
    </group>
  </group>
);

const Node3D: React.FC<{
  x: number; y: number;
  onClick: () => void;
  isPossible: boolean;
  baseColor?: string;
}> = ({ x, y, onClick, isPossible, baseColor }) => (
  <mesh
    position={[x - 3.5, 0.02, y - 3.5]}
    receiveShadow
    onClick={(e) => { e.stopPropagation(); onClick(); }}
  >
    <boxGeometry args={[0.8, 0.02, 0.8]} />
    <meshStandardMaterial
      color={isPossible ? '#22d3ee' : ((x + y) % 2 === 0 ? '#1e293b' : '#0f172a')}
      transparent={isPossible}
      opacity={isPossible ? 0.6 : 1}
    />
    {baseColor && (
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.16, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.7} />
      </mesh>
    )}
  </mesh>
);

const AnimatedPiece3D: React.FC<{
  targetX: number; targetY: number;
  color: string; isSelected: boolean;
  onClick: () => void;
}> = ({ targetX, targetY, color, isSelected, onClick }) => {
  const meshRef = useRef<any>(null);
  const targetPos = new Vector3(targetX - 3.5, 0.02, targetY - 3.5);

  useFrame(() => {
    if (meshRef.current) meshRef.current.position.lerp(targetPos, 0.1);
  });

  return (
    <group
      ref={meshRef}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Piece3D color={color} isSelected={isSelected} />
    </group>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const JumpRaceComponent: React.FC<JumpRaceProps> = ({ room, me }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [lastJumpFrom, setLastJumpFrom] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  const gameData = room.gameData as any;
  const board: Record<string, string> = gameData?.board || {};
  const isMyTurn = room.players[room.currentTurnIndex]?.id === me.id;

  // Map player IDs → slot index (0-3)
  const playerSlot: Record<string, number> = {};
  room.players.forEach((p, i) => { playerSlot[p.id] = i; });

  const mySlot = playerSlot[me.id] ?? 0;
  const numPlayers = room.players.length;
  const boardDeg = BOARD_ROTATIONS[mySlot];

  // Stable piece IDs for 3D animations
  const pieceIdsRef = useRef<Record<string, string>>({});
  const nextPieceId = useRef(0);
  const prevBoardRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = prevBoardRef.current;
    const current = board;
    const movedFrom = Object.keys(prev).filter(k => !current[k]);
    const movedTo = Object.keys(current).filter(k => !prev[k]);
    if (movedFrom.length === 1 && movedTo.length === 1) {
      const id = pieceIdsRef.current[movedFrom[0]];
      pieceIdsRef.current[movedTo[0]] = id;
      delete pieceIdsRef.current[movedFrom[0]];
    } else {
      Object.keys(current).forEach(k => {
        if (!pieceIdsRef.current[k]) pieceIdsRef.current[k] = `piece_${nextPieceId.current++}`;
      });
      Object.keys(pieceIdsRef.current).forEach(k => {
        if (!current[k]) delete pieceIdsRef.current[k];
      });
    }
    prevBoardRef.current = { ...board };
  }, [board]);

  const handleNodeClick = (key: string) => {
    if (!isMyTurn || room.gameState !== 'playing') return;
    if (board[key] === me.id) {
      if (lastJumpFrom && key !== lastJumpFrom) return;
      setSelected(key);
      calculateMoves(key, lastJumpFrom !== null);
    } else if (selected && possibleMoves.includes(key)) {
      movePiece(selected, key);
    } else {
      setSelected(null);
      setPossibleMoves([]);
    }
  };

  const calculateMoves = (pos: string, jumpOnly: boolean) => {
    const [x, y] = pos.split(',').map(Number);
    const moves: string[] = [];
    if (!jumpOnly) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const tx = x + dx, ty = y + dy;
          if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && !board[`${tx},${ty}`])
            moves.push(`${tx},${ty}`);
        }
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const mx = x + dx, my = y + dy;
        const tx = x + 2 * dx, ty = y + 2 * dy;
        if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE)
          if (board[`${mx},${my}`] && !board[`${tx},${ty}`]) moves.push(`${tx},${ty}`);
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
      const nextJumps: string[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const mx = tx + dx, my = ty + dy;
          const trx = tx + 2 * dx, tryy = ty + 2 * dy;
          if (trx >= 0 && trx < GRID_SIZE && tryy >= 0 && tryy < GRID_SIZE)
            if (newBoard[`${mx},${my}`] && !newBoard[`${trx},${tryy}`]) nextJumps.push(`${trx},${tryy}`);
        }
      }
      setPossibleMoves(nextJumps);
      if (nextJumps.length === 0) endTurn();
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

  const getProgress = (playerId: string, slotIdx: number) =>
    CORNER_BASES[OPPOSITE[slotIdx]].filter(pos => board[pos] === playerId).length;

  const getCellBg = (x: number, y: number): string => {
    const key = `${x},${y}`;
    for (let s = 0; s < numPlayers; s++)
      if (CORNER_BASES[s].includes(key)) return SLOT_COLORS[s] + '22';
    return (x + y) % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'transparent';
  };

  const getCellGoalStroke = (x: number, y: number): string | null => {
    const key = `${x},${y}`;
    for (let s = 0; s < numPlayers; s++)
      if (CORNER_BASES[OPPOSITE[s]].includes(key)) return SLOT_COLORS[s];
    return null;
  };

  const PAD = 50;
  const CELL = 62.5;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-primary)' }}>
      <div className="dashboard-layout" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '1.5rem' }}>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* ── Waiting ── */}
          {room.gameState === 'waiting' && (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
              <Users size={64} color="var(--accent)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 950, fontSize: '2rem', marginBottom: '0.5rem' }}>Waiting for Players</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Jump Race supports <strong>2 – 4 players</strong>. Share the room code and start when ready!
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                {room.players.length} / 4 players joined
              </p>
              <div className="loader" style={{ margin: '0 auto' }}></div>
            </div>
          )}

          {/* ── Finished ── */}
          {room.gameState === 'finished' && (
            <div className="card" style={{
              padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)',
              border: `3px solid ${room.winner?.id === me.id ? 'var(--success)' : 'var(--error)'}`,
              boxShadow: `0 0 60px ${room.winner?.id === me.id ? 'var(--success-glow)' : 'var(--error-glow)'}`
            }}>
              <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>{room.winner?.id === me.id ? '🏁' : '🏳️'}</div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '3.5rem', fontWeight: 950, marginBottom: '0.5rem' }}>
                {room.winner?.id === me.id ? 'VICTORY!' : 'DEFEATED'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.4rem', marginBottom: '3rem' }}>
                {room.winner?.name} completed the race!
              </p>
              <button className="btn btn-primary" onClick={() => socket.emit('play-again', { roomId: room.id })}
                style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 950 }}>Rematch</button>
            </div>
          )}

          {/* ── Playing ── */}
          {room.gameState === 'playing' && (
            <div className="card" style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '1.25rem', background: 'var(--card-bg)',
              border: '1px solid var(--item-border)', borderRadius: '24px',
              position: 'relative'
            }}>

              {/* Turn indicator + view toggle */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.9rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: SLOT_COLORS[playerSlot[room.players[room.currentTurnIndex]?.id] ?? 0],
                    boxShadow: `0 0 8px ${SLOT_COLORS[playerSlot[room.players[room.currentTurnIndex]?.id] ?? 0]}`
                  }} />
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {room.players[room.currentTurnIndex]?.name}'s Turn
                    {isMyTurn ? ' · Your move!' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', background: 'var(--item-bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--item-border)' }}>
                  {(['2d', '3d'] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)} style={{
                      padding: '0.35rem 0.9rem', borderRadius: '7px', border: 'none',
                      background: viewMode === m ? 'var(--accent)' : 'transparent',
                      color: viewMode === m ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase'
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* ── 2D Board ── */}
              {viewMode === '2d' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  {/* Outer: sized to the diamond bounding box (board × √2) */}
                  <div style={{
                    width: '100%',
                    maxWidth: 'min(75vw, 540px)',
                    aspectRatio: '1/1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* Inner: square at 70.7% width that rotates 45-deg into the outer's corners */}
                    <div style={{
                      width: '70.7%',
                      aspectRatio: '1/1',
                      transform: `rotate(${boardDeg}deg)`,
                      transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                      <svg width="100%" height="100%" viewBox="0 0 600 600" style={{ display: 'block' }}>
                        <defs>
                          <filter id="jrglow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                          </filter>
                        </defs>

                        {/* Cells */}
                        {nodes.map(({ x, y }) => {
                          const bg = getCellBg(x, y);
                          const gs = getCellGoalStroke(x, y);
                          return (
                            <g key={`bg-${x}-${y}`}>
                              <rect x={PAD + x * CELL} y={PAD + y * CELL} width={CELL} height={CELL} fill={bg} />
                              {gs && (
                                <rect
                                  x={PAD + x * CELL + 3} y={PAD + y * CELL + 3}
                                  width={CELL - 6} height={CELL - 6}
                                  fill="none" stroke={gs} strokeWidth="2.5"
                                  strokeDasharray="5,3" rx="4" opacity="0.6"
                                />
                              )}
                            </g>
                          );
                        })}

                        {/* Grid */}
                        {Array.from({ length: 9 }).map((_, i) => (
                          <line key={`lh-${i}`} x1={PAD} y1={PAD + i * CELL} x2={PAD + 8 * CELL} y2={PAD + i * CELL}
                            stroke="var(--text-secondary)" strokeWidth="1" opacity="0.35" />
                        ))}
                        {Array.from({ length: 9 }).map((_, i) => (
                          <line key={`lv-${i}`} x1={PAD + i * CELL} y1={PAD} x2={PAD + i * CELL} y2={PAD + 8 * CELL}
                            stroke="var(--text-secondary)" strokeWidth="1" opacity="0.35" />
                        ))}
                        <rect x={PAD} y={PAD} width={8 * CELL} height={8 * CELL}
                          fill="none" stroke="var(--text-primary)" strokeWidth="2" opacity="0.5" rx="2" />

                        {/* Interaction + Pieces */}
                        {nodes.map(({ x, y }) => {
                          const key = `${x},${y}`;
                          const ownerId = board[key];
                          const isSelected = selected === key;
                          const isPossible = possibleMoves.includes(key);
                          const cx = PAD + x * CELL + CELL / 2;
                          const cy = PAD + y * CELL + CELL / 2;
                          const slot = ownerId ? (playerSlot[ownerId] ?? 0) : 0;
                          const color = SLOT_COLORS[slot];
                          return (
                            <g key={key} onClick={() => handleNodeClick(key)} style={{ cursor: isMyTurn ? 'pointer' : 'default' }}>
                              <rect x={PAD + x * CELL} y={PAD + y * CELL} width={CELL} height={CELL} fill="transparent" />
                              {isPossible && !ownerId && (
                                <circle cx={cx} cy={cy} r={10} fill="var(--accent)" opacity="0.5" filter="url(#jrglow)" />
                              )}
                              {ownerId && (
                                <>
                                  <circle
                                    cx={cx} cy={cy} r={20}
                                    fill={color}
                                    stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.25)'}
                                    strokeWidth={isSelected ? 3.5 : 1.5}
                                    filter="url(#jrglow)"
                                    style={{ transition: 'all 0.25s ease' }}
                                  />
                                  {isSelected && (
                                    <circle cx={cx} cy={cy} r={24} fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" strokeDasharray="4,3" />
                                  )}
                                </>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3D Board ── */}
              {viewMode === '3d' && (
                <div style={{ width: '100%', height: 'min(70vw, 480px)', minHeight: '280px', cursor: 'grab' }}>
                  <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[0, 8, 8]} fov={50} />
                    <ambientLight intensity={0.6} />
                    <pointLight position={[5, 10, 5]} intensity={1} castShadow />
                    <spotLight position={[-5, 10, -5]} intensity={0.5} />

                    <BoardBase3D />
                    {nodes.map(({ x, y }) => {
                      const key = `${x},${y}`;
                      let goalColor: string | undefined;
                      for (let s = 0; s < numPlayers; s++) {
                        if (CORNER_BASES[OPPOSITE[s]].includes(key)) { goalColor = SLOT_COLORS[s]; break; }
                      }
                      return (
                        <Node3D
                          key={key} x={x} y={y}
                          onClick={() => handleNodeClick(key)}
                          isPossible={possibleMoves.includes(key)}
                          baseColor={goalColor}
                        />
                      );
                    })}
                    {Object.entries(board).map(([key, ownerId]) => {
                      const [x, y] = key.split(',').map(Number);
                      const slot = playerSlot[ownerId] ?? 0;
                      const pieceId = pieceIdsRef.current[key];
                      return (
                        <AnimatedPiece3D
                          key={pieceId || key}
                          targetX={x} targetY={y}
                          color={SLOT_COLORS[slot]}
                          isSelected={selected === key}
                          onClick={() => handleNodeClick(key)}
                        />
                      );
                    })}
                    <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} minDistance={6} maxDistance={14} />
                  </Canvas>
                </div>
              )}

              {/* Action Bar */}
              {isMyTurn && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={endTurn}
                    style={{ padding: '0.7rem 2rem', fontWeight: 900, borderRadius: '14px', opacity: lastJumpFrom ? 1 : 0.75, fontSize: '0.9rem' }}
                  >
                    {lastJumpFrom ? 'Finish Turn' : 'Skip Turn'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="dashboard-sidebar">
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>

            {/* Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Race Progress</span>
              {room.players.map((p) => {
                const slot = playerSlot[p.id] ?? 0;
                const prog = getProgress(p.id, slot);
                const pct = (prog / 10) * 100;
                const isMe = p.id === me.id;
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SLOT_COLORS[slot] }} />
                        <span style={{ fontWeight: isMe ? 900 : 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {p.name}{isMe ? ' (You)' : ''}
                        </span>
                      </div>
                      <span style={{ fontWeight: 900, color: SLOT_COLORS[slot], fontSize: '0.85rem' }}>{prog}/10</span>
                    </div>
                    <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--item-border)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: SLOT_COLORS[slot], transition: 'width 0.6s ease-out', borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

            {/* Players */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Players</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {room.players.map((p) => {
                  const slot = playerSlot[p.id] ?? 0;
                  const isMe = p.id === me.id;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--item-bg)', borderRadius: '10px', border: `1px solid ${SLOT_COLORS[slot]}44` }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: SLOT_COLORS[slot], flexShrink: 0, boxShadow: isMe ? `0 0 8px ${SLOT_COLORS[slot]}` : 'none' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: isMe ? 900 : 700, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {isMe && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: SLOT_COLORS[slot], background: SLOT_COLORS[slot] + '22', borderRadius: '6px', padding: '1px 6px' }}>YOU</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

            {/* Rules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={15} color="var(--accent)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Rules</span>
              </div>
              {[
                'Move all 10 pieces to the opposite corner.',
                'Step to any adjacent empty cell (8 directions).',
                'Jump over any piece to an empty cell beyond it.',
                'Chain multiple jumps in one turn.',
                'After a jump you must continue jumping or end turn.',
                '2–4 players supported.'
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: '0.45rem', flexShrink: 0 }} />
                  <span>{rule}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default JumpRaceComponent;
