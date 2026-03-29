import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Chess as ChessJS } from 'chess.js';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Trophy, ArrowLeft } from 'lucide-react';

interface ChessProps {
  room: Room;
  me: Player;
}

// Unicode chess piece symbols
const PIECE_SYMBOLS: Record<string, string> = {
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔',
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// ─────────────────────────────────────────────
//  Individual 3D piece shapes
// ─────────────────────────────────────────────
type PieceMeshProps = { col: string; rough?: number; metal?: number };

const Mat: React.FC<PieceMeshProps> = ({ col, rough = 0.04, metal = 0.65 }) => (
  <meshStandardMaterial color={col} roughness={rough} metalness={metal} />
);

// Pawn — base groove ring + tapered stem + polished head
const Pawn3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Wide base disc */}
    <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.32, 0.35, 0.08, 32]} /><Mat col={col} /></mesh>

    {/* Tapered stem */}
    <mesh position={[0, 0.26, 0]} castShadow><cylinderGeometry args={[0.13, 0.25, 0.32, 28]} /><Mat col={col} /></mesh>

    {/* Polished head */}
    <mesh position={[0, 0.54, 0]} castShadow><sphereGeometry args={[0.15, 32, 32]} /><Mat col={col} rough={0.03} metal={0.72} /></mesh>
  </group>
);

// Rook — layered tower with detailed battlements + portcullis slots
const Rook3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Base disc */}
    <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.33, 0.36, 0.08, 32]} /><Mat col={col} /></mesh>

    {/* Main body */}
    <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.24, 0.30, 0.58, 28]} /><Mat col={col} /></mesh>

    {/* Flared rim */}
    <mesh position={[0, 0.69, 0]} castShadow><cylinderGeometry args={[0.30, 0.24, 0.08, 32]} /><Mat col={col} /></mesh>
    <mesh position={[0, 0.73, 0]} castShadow><cylinderGeometry args={[0.30, 0.30, 0.03, 32]} /><Mat col={col} /></mesh>
    {/* Four wide merlons */}
    {[0, 1, 2, 3].map(i => {
      const a = (i * Math.PI) / 2;
      return (
        <mesh key={i} position={[Math.cos(a) * 0.21, 0.85, Math.sin(a) * 0.21]} castShadow>
          <boxGeometry args={[0.15, 0.24, 0.15]} />
          <Mat col={col} />
        </mesh>
      );
    })}
    {/* Four diagonal corner nubs */}
    {[0, 1, 2, 3].map(i => {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      return (
        <mesh key={`c${i}`} position={[Math.cos(a) * 0.22, 0.76, Math.sin(a) * 0.22]} castShadow>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <Mat col={col} rough={0.03} metal={0.72} />
        </mesh>
      );
    })}
  </group>
);

// Knight — body + neck + snout + ears + mane ridge
const Knight3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Base disc */}
    <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.30, 0.33, 0.08, 32]} /><Mat col={col} /></mesh>

    {/* Body */}
    <mesh position={[0, 0.37, 0]} castShadow><cylinderGeometry args={[0.18, 0.27, 0.56, 28]} /><Mat col={col} /></mesh>

    {/* Neck angled forward */}
    <mesh position={[0.04, 0.74, 0.01]} rotation={[0, 0, -0.25]} castShadow>
      <boxGeometry args={[0.22, 0.30, 0.28]} />
      <Mat col={col} />
    </mesh>
    {/* Snout */}
    <mesh position={[0.23, 0.62, 0]} castShadow>
      <boxGeometry args={[0.20, 0.16, 0.24]} />
      <Mat col={col} rough={0.03} metal={0.68} />
    </mesh>
    {/* Left ear */}
    <mesh position={[0.05, 0.92, 0.08]} rotation={[0.1, 0, 0.15]} castShadow>
      <boxGeometry args={[0.07, 0.13, 0.06]} />
      <Mat col={col} rough={0.03} metal={0.7} />
    </mesh>
    {/* Right ear */}
    <mesh position={[0.05, 0.92, -0.08]} rotation={[-0.1, 0, 0.15]} castShadow>
      <boxGeometry args={[0.07, 0.13, 0.06]} />
      <Mat col={col} rough={0.03} metal={0.7} />
    </mesh>
    {/* Mane ridge along the back of the neck */}
    <mesh position={[-0.05, 0.79, 0]} rotation={[0, 0, 0.12]} castShadow>
      <boxGeometry args={[0.08, 0.30, 0.20]} />
      <Mat col={col} rough={0.03} metal={0.7} />
    </mesh>
  </group>
);

// Bishop — tapered shaft + sharp tall mitre spike
const Bishop3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Base disc */}
    <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.29, 0.32, 0.08, 32]} /><Mat col={col} /></mesh>

    {/* Tapered shaft */}
    <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.12, 0.23, 0.66, 28]} /><Mat col={col} /></mesh>

    {/* Small round top ball */}
    <mesh position={[0, 0.84, 0]} castShadow><sphereGeometry args={[0.10, 24, 24]} /><Mat col={col} rough={0.03} metal={0.72} /></mesh>
  </group>
);

// Queen — tall hourglass body + orb + crown ring
const Queen3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Base disc */}
    <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.35, 0.38, 0.08, 32]} /><Mat col={col} /></mesh>

    {/* Waist taper in — extra tall */}
    <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.155, 0.30, 0.68, 28]} /><Mat col={col} /></mesh>

    {/* Upper flare — raised higher */}
    <mesh position={[0, 0.88, 0]} castShadow><cylinderGeometry args={[0.22, 0.155, 0.30, 28]} /><Mat col={col} /></mesh>

    {/* Crown ring — sits on top of body */}
    <mesh position={[0, 1.06, 0]} castShadow>
      <torusGeometry args={[0.18, 0.045, 12, 32]} />
      <Mat col={col} rough={0.03} metal={0.75} />
    </mesh>

    {/* Centre orb — nestled inside the ring */}
    <mesh position={[0, 1.06, 0]} castShadow>
      <sphereGeometry args={[0.10, 24, 24]} />
      <Mat col={col} rough={0.03} metal={0.75} />
    </mesh>
  </group>
);

// King — stepped base + waist + radiating shoulders + cross
const King3D: React.FC<{ col: string }> = ({ col }) => (
  <group>
    {/* Patterned base — 3-tier stepped pedestal */}
    <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.42, 0.44, 0.04, 32]} /><Mat col={col} /></mesh>
    <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.37, 0.42, 0.04, 32]} /><Mat col={col} rough={0.03} metal={0.7} /></mesh>
    <mesh position={[0, 0.10, 0]} castShadow><cylinderGeometry args={[0.39, 0.37, 0.04, 8]} /><Mat col={col} /></mesh>

    {/* Lower body — tapers inward to waist */}
    <mesh position={[0, 0.40, 0]} castShadow><cylinderGeometry args={[0.20, 0.35, 0.60, 28]} /><Mat col={col} /></mesh>

    {/* Upper body — flares back outward from waist */}
    <mesh position={[0, 0.80, 0]} castShadow><cylinderGeometry args={[0.32, 0.20, 0.40, 28]} /><Mat col={col} /></mesh>

    {/* Radiating shoulder disc */}
    <mesh position={[0, 1.02, 0]} castShadow><cylinderGeometry args={[0.38, 0.32, 0.06, 32]} /><Mat col={col} rough={0.03} metal={0.7} /></mesh>

    {/* Cross vertical */}
    <mesh position={[0, 1.28, 0]} castShadow>
      <boxGeometry args={[0.095, 0.44, 0.095]} />
      <Mat col={col} rough={0.03} metal={0.75} />
    </mesh>
    {/* Cross horizontal */}
    <mesh position={[0, 1.38, 0]} castShadow>
      <boxGeometry args={[0.32, 0.095, 0.095]} />
      <Mat col={col} rough={0.03} metal={0.75} />
    </mesh>
  </group>
);

function renderPiece3D(type: string, isWhite: boolean) {
  const col = isWhite ? '#f5efe0' : '#8B6F5E';
  switch (type.toLowerCase()) {
    case 'p': return <Pawn3D col={col} />;
    case 'r': return <Rook3D col={col} />;
    case 'n': return <Knight3D col={col} />;
    case 'b': return <Bishop3D col={col} />;
    case 'q': return <Queen3D col={col} />;
    case 'k': return <King3D col={col} />;
    default:  return null;
  }
}

// ─────────────────────────────────────────────
//  Captured pieces sidebar
// ─────────────────────────────────────────────
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CAPTURED_SYMBOLS: Record<string, string> = {
  p: '\u265f', r: '\u265c', n: '\u265e', b: '\u265d', q: '\u265b', k: '\u265a',
};

const CapturedSidebar: React.FC<{
  pieces: string[];
  isWhitePieces: boolean;  // true = showing white pieces (captured by black)
  advantage: number;
  label: string;
}> = ({ pieces, isWhitePieces, advantage, label }) => {
  const sorted = [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '3px', padding: '8px 4px',
      background: 'var(--item-bg)',
      borderRadius: '10px',
      border: '1px solid var(--item-border)',
      minWidth: '36px', width: '44px',
      minHeight: '80px',
    }}>
      {/* Rotated label */}
      <div style={{
        fontSize: '0.5rem', color: 'var(--text-secondary)', fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        marginBottom: '4px', whiteSpace: 'nowrap',
      }}>{label}</div>
      {/* Piece symbols */}
      {sorted.map((p, i) => (
        <span key={i} style={{
          fontSize: '1.1rem', lineHeight: 1,
          color: isWhitePieces ? '#f5efe0' : '#8B6F5E',
          textShadow: isWhitePieces
            ? '0 1px 4px rgba(0,0,0,0.9)'
            : '0 1px 4px rgba(0,0,0,0.5)',
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))',
        }}>{CAPTURED_SYMBOLS[p]}</span>
      ))}
      {/* Advantage badge */}
      {advantage > 0 && (
        <span style={{
          fontSize: '0.72rem', fontWeight: 900,
          color: 'var(--success)', marginLeft: '4px',
          letterSpacing: '0.03em',
        }}>+{advantage}</span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
//  2D Board
// ─────────────────────────────────────────────
const Board2D: React.FC<{
  chess: ChessJS;
  onMove: (from: string, to: string) => void;
  flipped: boolean;
}> = ({ chess, onMove, flipped }) => {
  const [sel, setSel] = useState<string | null>(null);
  const [valid, setValid] = useState<string[]>([]);

  const handleClick = (sq: string) => {
    if (sel) {
      if (sq === sel) {
        setSel(null); setValid([]);
      } else if (valid.includes(sq)) {
        onMove(sel, sq); setSel(null); setValid([]);
      } else {
        const p = chess.get(sq as Parameters<typeof chess.get>[0]);
        if (p && p.color === chess.turn()) {
          setSel(sq);
          setValid(chess.moves({ square: sq as Parameters<typeof chess.get>[0], verbose: true }).map((m) => m.to));
        } else { setSel(null); setValid([]); }
      }
    } else {
      const p = chess.get(sq as Parameters<typeof chess.get>[0]);
      if (p && p.color === chess.turn()) {
        setSel(sq);
        setValid(chess.moves({ square: sq as Parameters<typeof chess.get>[0], verbose: true }).map((m) => m.to));
      }
    }
  };

  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : FILES;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        border: '6px solid #3d2b1f',
        borderRadius: '6px',
        boxShadow: '0 0 0 2px #7c5c3e, var(--card-shadow)',
        width: 'min(78vh, 78vw)',
        height: 'min(78vh, 78vw)',
        overflow: 'hidden',
      }}>
        {ranks.flatMap((rank, ri) =>
          files.map((file, fi) => {
            const sq = `${file}${rank}`;
            const piece = chess.get(sq as Parameters<typeof chess.get>[0]);
            const isLight = (rank + FILES.indexOf(file)) % 2 === 1;
            const isSel = sq === sel;
            const isValid = valid.includes(sq);

            let bg = isLight ? '#f0d9b5' : '#b58863';
            if (isSel) bg = isLight ? '#f6f669' : '#baca2b';
            else if (isValid && !piece) bg = isLight ? '#cdd26a88' : '#aaa23a88';

            const pieceKey = piece
              ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type)
              : null;

            return (
              <div
                key={sq}
                onClick={() => handleClick(sq)}
                style={{
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.12s',
                }}
              >
                {/* Rank label */}
                {fi === 0 && (
                  <span style={{
                    position: 'absolute', top: 2, left: 3,
                    fontSize: 'clamp(0.4rem, 1.2vmin, 0.65rem)',
                    fontWeight: 700, lineHeight: 1,
                    color: isLight ? '#b58863' : '#f0d9b5',
                    pointerEvents: 'none',
                  }}>{rank}</span>
                )}
                {/* File label */}
                {ri === 7 && (
                  <span style={{
                    position: 'absolute', bottom: 2, right: 3,
                    fontSize: 'clamp(0.4rem, 1.2vmin, 0.65rem)',
                    fontWeight: 700, lineHeight: 1,
                    color: isLight ? '#b58863' : '#f0d9b5',
                    pointerEvents: 'none',
                  }}>{file}</span>
                )}
                {/* Valid move dot */}
                {isValid && !piece && (
                  <div style={{
                    width: '28%', height: '28%',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.22)',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Capture ring */}
                {isValid && !!piece && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    border: '5px solid rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Piece symbol */}
                {piece && (
                  <span style={{
                    fontSize: 'clamp(1rem, 7vmin, 3.2rem)',
                    lineHeight: 1,
                    color: piece.color === 'w' ? '#fdf6e3' : '#3d4f63',
                    textShadow: piece.color === 'w'
                      ? '0 0 3px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8), 0 0 12px rgba(255,255,255,0.3)'
                      : '0 0 3px rgba(255,255,255,0.6), 0 2px 5px rgba(255,255,255,0.4), 0 -1px 2px rgba(255,255,255,0.3)',
                    filter: isSel ? 'drop-shadow(0 0 8px rgba(250,220,50,0.95))' : undefined,
                    transition: 'filter 0.15s',
                    pointerEvents: 'none',
                  }}>
                    {PIECE_SYMBOLS[pieceKey!]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  3D Board
// ─────────────────────────────────────────────
const Board3D: React.FC<{
  chess: ChessJS;
  onMove: (from: string, to: string) => void;
  flipped: boolean;
}> = ({ chess, onMove, flipped }) => {
  const [sel, setSel] = useState<string | null>(null);
  const [valid, setValid] = useState<string[]>([]);

  const handleClick = (sq: string) => {
    if (sel) {
      if (sq === sel) { setSel(null); setValid([]); }
      else if (valid.includes(sq)) { onMove(sel, sq); setSel(null); setValid([]); }
      else {
        const p = chess.get(sq as Parameters<typeof chess.get>[0]);
        if (p && p.color === chess.turn()) {
          setSel(sq);
          setValid(chess.moves({ square: sq as Parameters<typeof chess.get>[0], verbose: true }).map(m => m.to));
        } else { setSel(null); setValid([]); }
      }
    } else {
      const p = chess.get(sq as Parameters<typeof chess.get>[0]);
      if (p && p.color === chess.turn()) {
        setSel(sq);
        setValid(chess.moves({ square: sq as Parameters<typeof chess.get>[0], verbose: true }).map(m => m.to));
      }
    }
  };

  const squares: React.ReactNode[] = [];

  for (let rank = 8; rank >= 1; rank--) {
    for (let fi = 0; fi < 8; fi++) {
      const file = FILES[fi];
      const sq = `${file}${rank}`;
      const piece = chess.get(sq as Parameters<typeof chess.get>[0]);

      const dispFi = flipped ? 7 - fi : fi;
      const dispRank = flipped ? 9 - rank : rank;
      const x = dispFi - 3.5;
      const z = 3.5 - (dispRank - 1);

      const isLight = (rank + fi) % 2 === 1;
      const isSel = sq === sel;
      const isValid = valid.includes(sq);

      let tileColor = isLight ? '#f0d9b5' : '#b58863';
      if (isSel) tileColor = '#f6f669';
      else if (isValid) tileColor = isLight ? '#cdd26a' : '#aaa23a';

      squares.push(
        <group key={sq} position={[x, 0, z]}>
          {/* Tile */}
          <mesh
            receiveShadow
            onClick={(e) => { e.stopPropagation(); handleClick(sq); }}
          >
            <boxGeometry args={[1, 0.14, 1]} />
            <meshStandardMaterial color={tileColor} roughness={0.8} />
          </mesh>

          {/* Valid move indicator */}
          {isValid && !piece && (
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
              <meshStandardMaterial color="#5a9a2a" transparent opacity={0.75} />
            </mesh>
          )}
          {isValid && piece && (
            <mesh position={[0, 0.08, 0]}>
              <torusGeometry args={[0.42, 0.06, 8, 32]} />
              <meshStandardMaterial color="#5a9a2a" transparent opacity={0.75} />
            </mesh>
          )}

          {/* Piece */}
          {piece && (
            <group
              position={[0, 0.07, 0]}
              onClick={(e) => { e.stopPropagation(); handleClick(sq); }}
            >
              {renderPiece3D(piece.type, piece.color === 'w')}
              {/* Selection glow ring at base */}
              {isSel && (
                <mesh position={[0, 0.04, 0]}>
                  <torusGeometry args={[0.40, 0.055, 8, 32]} />
                  <meshStandardMaterial color="#f6d42a" emissive="#f6d42a" emissiveIntensity={0.9} />
                </mesh>
              )}
            </group>
          )}
        </group>
      );
    }
  }

  return (
    <group>
      {squares}
      {/* Board surround */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[9.2, 0.18, 9.2]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ─────────────────────────────────────────────
//  Main Chess component
// ─────────────────────────────────────────────
const Chess: React.FC<ChessProps> = ({ room, me }) => {
  const [chess] = useState(new ChessJS());
  const [, setFen] = useState(chess.fen());
  const [boardView, setBoardView] = useState<'2d' | '3d'>('2d');

  useEffect(() => {
    if (room.gameData?.fen) {
      chess.load(room.gameData.fen as string);
      setFen(chess.fen());
    }
  }, [room.gameData?.fen, chess]);

  const opponent = room.players.find(p => p.id !== me.id);
  const amIWhite = room.players[0].id === me.id;
  const myColor = amIWhite ? 'w' : 'b';
  const isMyTurn = chess.turn() === myColor && room.gameState === 'playing';

  // Compute captured pieces by comparing current board to starting counts.
  const START_COUNTS: Record<string, number> = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
  const onBoard: Record<string, Record<string, number>> = {
    w: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
    b: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 },
  };
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq) onBoard[sq.color][sq.type]++;
    }
  }
  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];
  for (const t of ['p','r','n','b','q'] as const) {
    for (let i = 0; i < START_COUNTS[t] - onBoard['w'][t]; i++) whiteCaptured.push(t);
    for (let i = 0; i < START_COUNTS[t] - onBoard['b'][t]; i++) blackCaptured.push(t);
  }
  const capturedByWhite = blackCaptured;
  const capturedByBlack = whiteCaptured;
  const scoreWhite = capturedByWhite.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const scoreBlack = capturedByBlack.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const advWhite = scoreWhite - scoreBlack;
  const myCaptured    = amIWhite ? capturedByWhite : capturedByBlack;
  const theirCaptured = amIWhite ? capturedByBlack : capturedByWhite;
  const myAdv    = amIWhite ? Math.max(0, advWhite)  : Math.max(0, -advWhite);
  const theirAdv = amIWhite ? Math.max(0, -advWhite) : Math.max(0, advWhite);

  const handleMove = (from: string, to: string) => {
    if (!isMyTurn) return;
    try {
      const mv = chess.move({ from, to, promotion: 'q' });
      if (mv) {
        setFen(chess.fen());
        const isGameOver = chess.isGameOver();
        socket.emit('chess-move', {
          roomId: room.id,
          move: {
            fen: chess.fen(),
            isGameOver,
            winnerId: isGameOver && chess.isCheckmate() ? me.id : null,
          },
        });
      }
    } catch (e) {
      console.log('Invalid move', e);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '0.85rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
        background: 'var(--item-bg)',
        borderBottom: '1px solid var(--item-border)',
        flexShrink: 0,
      }}>
        <button
          className="btn btn-outline"
          onClick={() => window.location.reload()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={15} /> Exit
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>♟ CHESS</h2>
          <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '0.75rem' }}>{room.id}</span>
        </div>

        <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* 2D / 3D toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--item-bg)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px',
            border: '1px solid var(--item-border)'
          }}>
            {(['2d', '3d'] as const).map(v => (
              <button
                key={v}
                onClick={() => setBoardView(v)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  letterSpacing: '0.05em',
                  background: boardView === v ? 'var(--accent)' : 'transparent',
                  color: boardView === v ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.18s ease',
                }}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ color: 'var(--text-primary)', fontWeight: 900, textAlign: 'right', fontSize: '0.9rem' }}>
            <div>
              {me.name}
              <span style={{ color: 'var(--accent)', marginLeft: '0.4em' }}>
                ({amIWhite ? '♙ White' : '♟ Black'})
              </span>
            </div>
            {opponent && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.8 }}>vs {opponent.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Turn indicator ── */}
      {room.gameState === 'playing' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0', flexShrink: 0 }}>
          <div style={{
            padding: '0.45rem 1.5rem',
            background: 'var(--item-bg)',
            borderRadius: '25px',
            border: `2px solid ${isMyTurn ? 'var(--success)' : 'var(--item-border)'}`,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <span style={{ color: isMyTurn ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 950, fontSize: '0.85rem', letterSpacing: '0.1em' }}>
              {isMyTurn
                ? '✓ YOUR TURN'
                : opponent?.name
                  ? `⏳ ${opponent.name.toUpperCase()}'S TURN`
                  : 'WAITING FOR OPPONENT'}
            </span>
          </div>
        </div>
      )}

      {/* ── Board area ── */}
      <div className="mobile-column" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: '8px', padding: '6px' }}>


        {/* LEFT sidebar — pieces opponent captured from me */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CapturedSidebar
            pieces={theirCaptured}
            isWhitePieces={amIWhite}
            advantage={theirAdv}
            label={`${(opponent?.name ?? 'Opp').slice(0, 6)} took`}
          />
        </div>


        {/* CENTER — board + winner banner */}
        <div style={{ flex: 2, position: 'relative', minHeight: 'min(80vw, 80vh)', maxHeight: '100%' }}>


          {/* Game over banner */}
          {room.gameState === 'finished' && (() => {
            const won = room.winner?.id === me.id;
            const draw = !room.winner;
            const color = won ? 'var(--success)' : draw ? 'var(--text-secondary)' : 'var(--error)';
            const bannerLabel = won ? '🎉 YOU WON!' : draw ? '🤝 DRAW!' : `🏆 ${room.winner?.name} WINS!`;
            return (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(12px)',
                border: `2px solid ${color}`,
                borderRadius: '50px',
                padding: '0.6rem 1.5rem',
                boxShadow: 'var(--card-shadow)',
                animation: 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <Trophy size={22} color={color} />
                <span style={{ color, fontWeight: 950, fontSize: '1rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {bannerLabel}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
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
                    style={{ padding: '0.35rem 1.2rem', fontSize: '0.85rem', borderRadius: '20px', marginLeft: '0.4rem', background: 'var(--accent)', border: 'none', fontWeight: 950 }}
                  >
                    {(() => {
                      if (room.hostId !== me.id) {
                        return (room.readyPlayers || []).includes(me.id) ? 'Ready!' : 'Rematch';
                      }
                      const opponent = room.players.find(p => p.id !== room.hostId);
                      const opponentReady = opponent && (room.readyPlayers || []).includes(opponent.id);
                      if (!opponent || opponentReady) return 'Start Rematch';
                      return `Waiting for ${opponent.name}...`;
                    })()}
                  </button>
                  {(room.readyPlayers || []).some(id => id !== me.id) && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 950, textAlign: 'center', marginTop: '2px' }}>OPPONENT READY</div>
                  )}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => window.location.reload()}
                  style={{ padding: '0.3rem 0.9rem', fontSize: '0.78rem', borderRadius: '20px', marginLeft: '0.4rem' }}
                >
                  Exit
                </button>
              </div>
            );
          })()}

          {boardView === '2d' ? (
            <Board2D chess={chess} onMove={handleMove} flipped={!amIWhite} />
          ) : (
            <Canvas shadows camera={{ position: [0, 11, amIWhite ? 11 : -11], fov: 42 }}>
              <ambientLight intensity={0.4} />
              <directionalLight
                castShadow
                position={[6, 16, 8]}
                intensity={1.8}
                shadow-mapSize={[2048, 2048]}
              />
              <pointLight position={[-6, 12, -6]} intensity={1.2} color="#ffffff" />
              <pointLight position={[6, 10,  6]} intensity={1.0} color="#fffbe8" />
              <pointLight position={[ 0, 14,  0]} intensity={0.8} color="#e8f0ff" />
              <pointLight position={[-5,  4, 10]} intensity={0.6} color="#a78bfa" />
              <OrbitControls
                enablePan={false}
                maxPolarAngle={Math.PI / 2.15}
                minDistance={5}
                maxDistance={22}
              />
              <group position={[0, -0.5, 0]}>
                <Board3D chess={chess} onMove={handleMove} flipped={!amIWhite} />
              </group>
            </Canvas>
          )}
        </div>

        {/* RIGHT sidebar — pieces I captured from opponent */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 }}>
          <CapturedSidebar
            pieces={myCaptured}
            isWhitePieces={!amIWhite}
            advantage={myAdv}
            label="You took"
          />
        </div>

      </div>
    </div>
  );
};

export default Chess;
