import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Users } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';

interface SixteenCoinsProps {
  room: Room;
  me: Player;
}

const SCALE = 60;
const OFFSET = 40;

const REAL_NODES = [
  { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 2, y: 4 },
  { x: 6, y: 0 }, { x: 5, y: 1 }, { x: 7, y: 1 }, { x: 4, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 3 }, { x: 7, y: 3 }, { x: 6, y: 4 },
  { x: 2, y: 8 }, { x: 1, y: 7 }, { x: 3, y: 7 }, { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 4 },
  { x: 6, y: 8 }, { x: 5, y: 7 }, { x: 7, y: 7 }, { x: 4, y: 6 }, { x: 6, y: 6 }, { x: 8, y: 6 }, { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 4 },
  { x: 4, y: 4 }
];

const uniqueNodes = Array.from(new Set(REAL_NODES.map(n => `${n.x},${n.y}`))).map(s => {
  const [x, y] = s.split(',').map(Number);
  return { x, y };
});

const ADJACENCY: Record<string, string[]> = {};
const addEdge = (a: string, b: string) => {
  if (!ADJACENCY[a]) ADJACENCY[a] = [];
  if (!ADJACENCY[b]) ADJACENCY[b] = [];
  if (!ADJACENCY[a].includes(b)) ADJACENCY[a].push(b);
  if (!ADJACENCY[b].includes(a)) ADJACENCY[b].push(a);
};

[[2, 2], [6, 2], [2, 6], [6, 6]].forEach(([cx, cy]) => {
  const pts = {
    t: `${cx},${cy - 2}`, b: `${cx},${cy + 2}`, l: `${cx - 2},${cy}`, r: `${cx + 2},${cy}`,
    tl: `${cx - 1},${cy - 1}`, tr: `${cx + 1},${cy - 1}`, bl: `${cx - 1},${cy + 1}`, br: `${cx + 1},${cy + 1}`,
    c: `${cx},${cy}`
  };
  addEdge(pts.t, pts.tr); addEdge(pts.tr, pts.r); addEdge(pts.r, pts.br); addEdge(pts.br, pts.b);
  addEdge(pts.b, pts.bl); addEdge(pts.bl, pts.l); addEdge(pts.l, pts.tl); addEdge(pts.tl, pts.t);
  addEdge(pts.l, pts.c); addEdge(pts.c, pts.r); addEdge(pts.t, pts.c); addEdge(pts.c, pts.b);
  addEdge(pts.tl, pts.c); addEdge(pts.c, pts.br); addEdge(pts.tr, pts.c); addEdge(pts.c, pts.bl);
});
const hubPoints = ["4,2", "4,6", "2,4", "6,4", "3,3", "5,3", "3,5", "5,5"];
hubPoints.forEach(p => addEdge("4,4", p));

const CoinPiece3D: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <mesh castShadow position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.35, 0.35, 0.12, 40]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.121, 0]}>
      <cylinderGeometry args={[0.31, 0.31, 0.02, 40]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.05} metalness={1.0} />
    </mesh>
  </group>
);

const Coin3D: React.FC<{ color: string; isSelected: boolean; isPossible: boolean }> = ({ color, isSelected, isPossible }) => (
  <group>
    {isSelected && (
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.55, 32]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.6} />
      </mesh>
    )}
    <CoinPiece3D color={color} />
    {isPossible && (
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </mesh>
    )}
  </group>
);

const BoardBase3D: React.FC = () => (
  <group position={[0, -0.2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[9.8, 0.4, 9.8]} />
      <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.4} />
    </mesh>
    <mesh position={[0, 0.201, 0]} receiveShadow>
      <boxGeometry args={[9.4, 0.015, 9.4]} />
      <meshStandardMaterial color="#71717a" roughness={0.4} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0.202, 0]}>
      <boxGeometry args={[9.6, 0.005, 9.6]} />
      <meshStandardMaterial color="#3f3f46" metalness={1.0} roughness={0.05} />
    </mesh>
  </group>
);

const Node3D: React.FC<{ x: number; y: number; onClick: () => void; isPossible: boolean }> = ({ x, y, onClick, isPossible }) => (
  <mesh
    position={[x - 4, 0.015, y - 4]}
    receiveShadow
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    onPointerOver={(e) => { if (isPossible) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
  >
    <cylinderGeometry args={[0.15, 0.15, 0.01, 16]} />
    <meshStandardMaterial color={isPossible ? "#22d3ee" : "#cbd5e1"} transparent opacity={isPossible ? 0.8 : 0.5} />
  </mesh>
);

const AnimatedCoin3D: React.FC<{ targetX: number; targetY: number; color: string; isSelected: boolean; onClick: () => void; interactive: boolean }> = ({ targetX, targetY, color, isSelected, onClick, interactive }) => {
  const meshRef = useRef<any>(null);
  const targetPos = new Vector3(targetX - 4, 0.01, targetY - 4);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(targetPos);
    }
  }, [targetPos]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos, 0.08);
    }
  });

  return (
    <group
      ref={meshRef}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { if (interactive) { e.stopPropagation(); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Coin3D color={color} isSelected={isSelected} isPossible={false} />
    </group>
  );
};

const RemovedCoin3D: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => {
  const meshRef = useRef<any>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.multiplyScalar(1.02);
      meshRef.current.position.y += 0.01;
      if (meshRef.current.material) {
        meshRef.current.material.opacity -= 0.02;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[x - 4, 0.01, y - 4]}>
      <cylinderGeometry args={[0.35, 0.35, 0.12, 32]} />
      <meshStandardMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};

const LastMoveLine3D: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  const [fx, fy] = from.split(',').map(Number);
  const [tx, ty] = to.split(',').map(Number);
  const length = Math.sqrt(Math.pow(tx - fx, 2) + Math.pow(ty - fy, 2));
  const angle = -Math.atan2(ty - fy, tx - fx);

  return (
    <group position={[0, 0.015, 0]}>
      <mesh position={[(tx + fx) / 2 - 4, 0, (ty + fy) / 2 - 4]} rotation={[0, angle, 0]}>
        <boxGeometry args={[length, 0.006, 0.1]} />
        <meshStandardMaterial color="#6366f1" transparent opacity={0.6} emissive="#6366f1" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
};

const BoardLines3D: React.FC = () => {
  const lines: [number, number, number, number, number, number][] = [];
  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    lines.push([x1 - 4, 0.005, y1 - 4, x2 - 4, 0.005, y2 - 4]);
  };

  addLine(2, 0, 0, 2); addLine(0, 2, 2, 4); addLine(2, 4, 4, 2); addLine(4, 2, 2, 0);
  addLine(2, 0, 2, 4); addLine(0, 2, 4, 2); addLine(1, 1, 3, 3); addLine(3, 1, 1, 3);
  addLine(6, 0, 4, 2); addLine(4, 2, 6, 4); addLine(6, 4, 8, 2); addLine(8, 2, 6, 0);
  addLine(6, 0, 6, 4); addLine(4, 2, 8, 2); addLine(5, 1, 7, 3); addLine(7, 1, 5, 3);
  addLine(2, 8, 0, 6); addLine(0, 6, 2, 4); addLine(2, 4, 4, 6); addLine(4, 6, 2, 8);
  addLine(2, 8, 2, 4); addLine(0, 6, 4, 6); addLine(1, 7, 3, 5); addLine(3, 7, 1, 5);
  addLine(6, 8, 4, 6); addLine(4, 6, 6, 4); addLine(6, 4, 8, 6); addLine(8, 6, 6, 8);
  addLine(6, 8, 6, 4); addLine(4, 6, 8, 6); addLine(5, 7, 7, 5); addLine(7, 7, 5, 5);
  addLine(2, 4, 6, 4); addLine(4, 2, 4, 6); addLine(2, 2, 6, 6); addLine(2, 6, 6, 2);

  return (
    <group position={[0, 0.01, 0]}>
      {lines.map((l, i) => (
        <mesh key={i} position={[(l[0] + l[3]) / 2, 0, (l[2] + l[5]) / 2]}
          rotation={[0, -Math.atan2(l[5] - l[2], l[3] - l[0]), 0]}>
          <boxGeometry args={[Math.sqrt(Math.pow(l[3] - l[0], 2) + Math.pow(l[5] - l[2], 2)), 0.005, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
};

export const SixteenCoins: React.FC<SixteenCoinsProps> = ({ room, me }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [hasJumpedInTurn, setHasJumpedInTurn] = useState(false);
  const [boardRotation, setBoardRotation] = useState(room.players[1]?.id === me.id ? 0 : 180);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [lastMovePositions, setLastMovePositions] = useState<{ from: string, to: string } | null>(null);
  const [removedCoins, setRemovedCoins] = useState<string[]>([]);
  const [p1Color] = useState('#ffff00');
  const [p2Color] = useState('#00ff00');

  const gameData = room.gameData as any;
  const coins = gameData?.coins || {};
  const p1Id = room.players[0]?.id;
  const p2Id = room.players[1]?.id;
  const isMyTurn = room.players[room.currentTurnIndex]?.id === me.id;

  const coinIdsRef = useRef<Record<string, string>>({});
  const nextCoinId = useRef(0);
  const prevCoinsRef = useRef<Record<string, string>>({});
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const prev = prevCoinsRef.current;
    if (!hasInitializedRef.current || Object.keys(prev).length === 0) {
      Object.keys(coins).forEach(k => { coinIdsRef.current[k] = `coin_${nextCoinId.current++}`; });
      hasInitializedRef.current = true;
    } else {
      const fromList = Object.keys(prev).filter(k => !coins[k]);
      const toList = Object.keys(coins).filter(k => !prev[k]);

      if (toList.length === 1) {
        const target = toList[0];
        const owner = coins[target];
        const from = fromList.find(f => prev[f] === owner);
        if (from) {
          setLastMovePositions({ from, to: target });
        }
        const capturedCoins = fromList.filter(f => f !== from);
        if (capturedCoins.length > 0) {
          setRemovedCoins((prevRem) => [...prevRem, ...capturedCoins]);
          setTimeout(() => {
            setRemovedCoins((prevRem) => prevRem.filter(c => !capturedCoins.includes(c)));
          }, 2000);
        }
      }

      // Maintain IDs for animation
      if (toList.length === 1) {
        const target = toList[0];
        const owner = coins[target];
        const from = fromList.find(fKey => prev[fKey] === owner);
        if (from) {
          coinIdsRef.current[target] = coinIdsRef.current[from];
          delete coinIdsRef.current[from];
        }
      }
      toList.forEach(k => {
        if (!coinIdsRef.current[k]) coinIdsRef.current[k] = `coin_${nextCoinId.current++}`;
      });
      fromList.forEach(k => {
        if (!coins[k]) delete coinIdsRef.current[k];
      });
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  // Reset highlight when game status changes to waiting or finished
  useEffect(() => {
    if (room.gameState !== 'playing') {
      setLastMovePositions(null);
      setRemovedCoins([]);
      hasInitializedRef.current = false;
    }
  }, [room.gameState, room.id]);

  const handleNodeClick = (key: string) => {
    if (!isMyTurn) return;
    if (coins[key] === me.id) {
      if (hasJumpedInTurn) return;
      setSelected(key);
      calculateMoves(key, coins, hasJumpedInTurn);
    } else if (selected && possibleMoves.includes(key)) {
      movePiece(selected, key);
    }
  };

  const calculateMoves = React.useCallback((key: string, currentCoins: Record<string, string> = coins, hasJumped: boolean = hasJumpedInTurn) => {
    const neighbors = ADJACENCY[key] || [];
    const moves: string[] = [];
    if (!hasJumped) {
      neighbors.forEach(neighborKey => {
        if (!currentCoins[neighborKey]) moves.push(neighborKey);
      });
    }
    neighbors.forEach(midKey => {
      const owner = currentCoins[midKey];
      if (owner) {
        const [ax, ay] = key.split(',').map(Number);
        const [mx, my] = midKey.split(',').map(Number);
        const tx = mx + (mx - ax);
        const ty = my + (my - ay);
        const targetKey = `${tx},${ty}`;
        if (uniqueNodes.some(n => n.x === tx && n.y === ty) && !currentCoins[targetKey]) {
          const midNeighbors = ADJACENCY[midKey] || [];
          if (midNeighbors.includes(targetKey)) moves.push(targetKey);
        }
      }
    });
    setPossibleMoves(moves);
    return moves;
  }, [coins, hasJumpedInTurn]);

  const movePiece = (from: string, to: string) => {
    const newCoins = { ...coins };
    delete newCoins[from];
    newCoins[to] = me.id;
    const neighbors = ADJACENCY[from] || [];
    const isStep = neighbors.includes(to);
    if (!isStep) {
      const [fx, fy] = from.split(',').map(Number);
      const [tx, ty] = to.split(',').map(Number);
      const midX = (fx + tx) / 2;
      const midY = (fy + ty) / 2;
      const midKey = `${midX},${midY}`;
      if (coins[midKey] !== me.id) {
        delete newCoins[midKey];
      }
      socket.emit('sixteencoins-move', { roomId: room.id, coins: newCoins });
      const nextJumpMoves = calculateMoves(to, newCoins, true);
      if (nextJumpMoves.length === 0) {
        endTurn();
      } else {
        setSelected(to);
        setHasJumpedInTurn(true);
      }
    } else {
      socket.emit('sixteencoins-move', { roomId: room.id, coins: newCoins });
      endTurn();
    }
  };

  useEffect(() => {
    if (selected && hasJumpedInTurn) calculateMoves(selected, coins, hasJumpedInTurn);
  }, [coins, selected, hasJumpedInTurn, calculateMoves]);



  const endTurn = () => {
    socket.emit('sixteencoins-endturn', { roomId: room.id });
    setSelected(null);
    setPossibleMoves([]);
    setHasJumpedInTurn(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>

      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1 }}>
        <div className="dashboard-layout" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            {room.gameState === 'waiting' ? (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
                <Users size={64} color="var(--accent)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                <h2 style={{ color: 'var(--text-primary)', fontWeight: 950, fontSize: '2rem', marginBottom: '1rem' }}>Waiting for Opponent</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '300px' }}>The game will begin once a second player joins and both are ready.</p>
                <button className="btn btn-primary" onClick={() => socket.emit('sixteencoins-ready', { roomId: room.id })} style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 900 }}>I'm Ready!</button>
              </div>
            ) : room.gameState === 'finished' ? (
              <div className="card" style={{
                padding: '4rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'var(--card-bg)',
                border: `3px solid ${room.winner?.id === me.id ? 'var(--success)' : 'var(--error)'}`,
                boxShadow: `0 0 60px ${room.winner?.id === me.id ? 'var(--success-glow)' : 'var(--error-glow)'}`
              }}>
                <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>
                  {room.winner?.id === me.id ? '🏆' : '💀'}
                </div>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '3.5rem', marginBottom: '0.5rem', fontWeight: 950 }}>
                  {room.winner?.id === me.id ? 'VICTORY' : 'DEFEAT'}
                </h1>
                <div style={{ marginBottom: '3rem' }}>
                  <div style={{ color: room.winner?.id === me.id ? 'var(--success)' : 'var(--error)', fontSize: '1.6rem', fontWeight: 900 }}>
                    {room.winner?.name} conquered the board
                  </div>
                  {(room.readyPlayers || []).some(id => id !== me.id) && (
                    <div style={{ background: 'var(--success-glow)', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 950, padding: '6px 16px', borderRadius: '20px', display: 'inline-block', marginTop: '1rem', border: '1px solid var(--success)' }}>OPPONENT READY</div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', width: '100%', maxWidth: '400px' }}>
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
                    style={{ height: '70px', fontSize: '1.4rem', fontWeight: 950 }}
                  >
                    {room.hostId === me.id
                      ? (room.players.length === 1 || room.players.every(p => p.id === room.hostId || (room.readyPlayers || []).includes(p.id)) ? 'Start Rematch' : 'Waiting...')
                      : ((room.readyPlayers || []).includes(me.id) ? 'Ready!' : 'Play Again')}
                  </button>
                  <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ height: '70px', fontWeight: 800 }}>Exit</button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', background: 'var(--item-bg)', border: '1px solid var(--item-border)', borderRadius: '24px', minHeight: '650px' }}>
                {viewMode === '2d' ? (
                  <div style={{
                    position: 'relative', width: 'min(85vw, 550px)', aspectRatio: '1/1',
                    transform: `rotate(${boardRotation}deg)`,
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <svg width="100%" height="100%" viewBox="0 0 600 600">
                      <g stroke="var(--item-border)" strokeWidth="3" opacity="0.6">
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 0 * SCALE} x2={OFFSET + 0 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 0 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 4 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 0 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 0 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 0 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 1 * SCALE} y1={OFFSET + 1 * SCALE} x2={OFFSET + 3 * SCALE} y2={OFFSET + 3 * SCALE} />
                        <line x1={OFFSET + 3 * SCALE} y1={OFFSET + 1 * SCALE} x2={OFFSET + 1 * SCALE} y2={OFFSET + 3 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 0 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 4 * SCALE} x2={OFFSET + 8 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 8 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 0 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 0 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 8 * SCALE} y2={OFFSET + 2 * SCALE} />
                        <line x1={OFFSET + 5 * SCALE} y1={OFFSET + 1 * SCALE} x2={OFFSET + 7 * SCALE} y2={OFFSET + 3 * SCALE} />
                        <line x1={OFFSET + 7 * SCALE} y1={OFFSET + 1 * SCALE} x2={OFFSET + 5 * SCALE} y2={OFFSET + 3 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 8 * SCALE} x2={OFFSET + 0 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 0 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 4 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 8 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 8 * SCALE} x2={OFFSET + 2 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 0 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 1 * SCALE} y1={OFFSET + 7 * SCALE} x2={OFFSET + 3 * SCALE} y2={OFFSET + 5 * SCALE} />
                        <line x1={OFFSET + 3 * SCALE} y1={OFFSET + 7 * SCALE} x2={OFFSET + 1 * SCALE} y2={OFFSET + 5 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 8 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 4 * SCALE} x2={OFFSET + 8 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 8 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 8 * SCALE} />
                        <line x1={OFFSET + 6 * SCALE} y1={OFFSET + 8 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 8 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 5 * SCALE} y1={OFFSET + 7 * SCALE} x2={OFFSET + 7 * SCALE} y2={OFFSET + 5 * SCALE} />
                        <line x1={OFFSET + 7 * SCALE} y1={OFFSET + 7 * SCALE} x2={OFFSET + 5 * SCALE} y2={OFFSET + 5 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 4 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 4 * SCALE} />
                        <line x1={OFFSET + 4 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 4 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 2 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 6 * SCALE} />
                        <line x1={OFFSET + 2 * SCALE} y1={OFFSET + 6 * SCALE} x2={OFFSET + 6 * SCALE} y2={OFFSET + 2 * SCALE} />
                      </g>
                      {lastMovePositions && (
                        <line
                          x1={OFFSET + Number(lastMovePositions.from.split(',')[0]) * SCALE}
                          y1={OFFSET + Number(lastMovePositions.from.split(',')[1]) * SCALE}
                          x2={OFFSET + Number(lastMovePositions.to.split(',')[0]) * SCALE}
                          y2={OFFSET + Number(lastMovePositions.to.split(',')[1]) * SCALE}
                          stroke="var(--accent)" strokeWidth="6" strokeDasharray="8 4" opacity="0.4"
                        />
                      )}
                      {uniqueNodes.map(node => {
                        const key = `${node.x},${node.y}`;
                        const ownerId = coins[key];
                        const isSelected = selected === key;
                        const isPossible = possibleMoves.includes(key);
                        const cx = OFFSET + node.x * SCALE;
                        const cy = OFFSET + node.y * SCALE;
                        return (
                          <g key={key} onClick={() => handleNodeClick(key)} style={{ cursor: 'pointer' }}>
                            <circle cx={cx} cy={cy} r={8} fill="var(--bg-primary)" stroke="var(--item-border)" strokeWidth="2" />
                            {isPossible && <circle cx={cx} cy={cy} r={14} fill="var(--accent-glow)" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 2" />}
                            {ownerId && (
                              <g style={{
                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                transformOrigin: `${cx}px ${cy}px`,
                              }}>
                                <circle
                                  cx={cx} cy={cy} r={22}
                                  fill={ownerId === p1Id ? p1Color : (ownerId === p2Id ? p2Color : '#94a3b8')}
                                  stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.1)'}
                                  strokeWidth="2.5"
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '600px' }}>
                    <Canvas shadows gl={{ antialias: true }}>
                      <PerspectiveCamera makeDefault position={[0, 10, 10]} fov={50} />
                      <ambientLight intensity={0.6} />
                      <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />

                      <group rotation={[0, boardRotation * (Math.PI / 180), 0]}>
                        <BoardBase3D />
                        <BoardLines3D />
                        {uniqueNodes.map(node => {
                          const key = `${node.x},${node.y}`;
                          const isPossible = possibleMoves.includes(key);
                          return (
                            <Node3D key={key} x={node.x} y={node.y} onClick={() => handleNodeClick(key)} isPossible={isPossible} />
                          );
                        })}
                        {Object.entries(coins).map(([key, ownerId]) => {
                          const [x, y] = key.split(',').map(Number);
                          const isSelected = selected === key;
                          const color = (ownerId as string) === p1Id ? p1Color : ((ownerId as string) === p2Id ? p2Color : '#94a3b8');
                          const interactive = isMyTurn && ownerId === me.id;
                          const coinId = coinIdsRef.current[key];
                          return (
                            <AnimatedCoin3D
                              key={coinId || key}
                              targetX={x} targetY={y}
                              color={color}
                              isSelected={isSelected}
                              interactive={interactive}
                              onClick={() => handleNodeClick(key)}
                            />
                          );
                        })}
                        {lastMovePositions && <LastMoveLine3D from={lastMovePositions.from} to={lastMovePositions.to} />}
                        {removedCoins.map(key => {
                          const [x, y] = key.split(',').map(Number);
                          return <RemovedCoin3D key={`rem-${key}`} x={x} y={y} color="#ef4444" />;
                        })}
                      </group>
                      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={15} />
                    </Canvas>
                  </div>
                )}

              </div>
            )}
            {/* END TURN / WAITING — below the board */}
            {room.gameState === 'playing' && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
                {isMyTurn ? (
                  <button className="btn btn-primary" onClick={endTurn} disabled={!hasJumpedInTurn} style={{ padding: '0.75rem 2.5rem', fontWeight: 950, minWidth: '160px' }}>END TURN</button>
                ) : (
                  <div style={{ color: 'var(--text-primary)', background: 'var(--card-bg)', border: '1px solid var(--item-border)', padding: '0.6rem 1.5rem', borderRadius: '25px', fontWeight: 800 }}>WAITING...</div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="dashboard-sidebar">
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Players</span>
                {room.players.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '12px',
                    background: room.currentTurnIndex === i ? 'var(--accent-glow)' : 'var(--item-bg)',
                    border: `1px solid ${room.currentTurnIndex === i ? 'var(--accent)' : 'var(--item-border)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: i === 0 ? p1Color : p2Color }} />
                      <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {Object.values(coins).filter(id => id === p.id).length}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--item-border)', opacity: 0.3 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Settings</span>

                <div style={{ display: 'flex', background: 'var(--item-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
                  <button onClick={() => setViewMode('2d')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: viewMode === '2d' ? 'var(--accent)' : 'transparent', color: viewMode === '2d' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem' }}>2D</button>
                  <button onClick={() => setViewMode('3d')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: viewMode === '3d' ? 'var(--accent)' : 'transparent', color: viewMode === '3d' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem' }}>3D</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Rotation</span>
                  <input type="range" min="0" max="360" value={boardRotation} onChange={(e) => setBoardRotation(Number(e.target.value))} style={{ width: '100%', height: '6px', accentColor: 'var(--accent)' }} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeOutScale {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
