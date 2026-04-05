import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCcw, Info, MousePointer2, Circle, Square, Hexagon, Triangle, Star, Heart, Trophy } from 'lucide-react';

interface ShapeMeProps {
  onGameEnd?: (score: number) => void;
  isDark?: boolean;
}

type ShapeType = 'circle' | 'square' | 'hexagon' | 'triangle' | 'star' | 'heart';

interface BestScores {
    circle: number;
    square: number;
    hexagon: number;
    triangle: number;
    star: number;
    heart: number;
}

// ──────────────────────────────────────────────
// GEOMETRY HELPERS
// ──────────────────────────────────────────────

/** Minimum distance from point (px,py) to line segment (x1,y1)→(x2,y2) */
const pointToSegmentDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

/** Minimum distance from point to any edge of a polygon defined by vertices */
const pointToPolygonDist = (px: number, py: number, verts: {x:number,y:number}[]) => {
  let min = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    min = Math.min(min, pointToSegmentDist(px, py, verts[i].x, verts[i].y, verts[j].x, verts[j].y));
  }
  return min;
};

/** Generate N evenly-spaced vertices of a regular polygon centred at (cx,cy) with circumradius R */
const polygonVerts = (cx: number, cy: number, R: number, sides: number, rotOffset = 0) =>
  Array.from({ length: sides }, (_, i) => {
    const a = (2 * Math.PI * i) / sides + rotOffset;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

/** Sample N evenly-spaced points along the perimeter of a polygon */
const samplePolygon = (verts: {x:number,y:number}[], n: number) => {
  const pts: {x:number,y:number}[] = [];
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    for (let t = 0; t < n / verts.length; t++) {
      const u = t / (n / verts.length);
      pts.push({ x: verts[i].x * (1 - u) + verts[j].x * u, y: verts[i].y * (1 - u) + verts[j].y * u });
    }
  }
  return pts;
};

/** Sample N evenly-spaced points along a circle */
const sampleCircle = (cx: number, cy: number, R: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

/** Star vertices: alternating outer/inner radii */
const starVerts = (cx: number, cy: number, outerR: number, innerR: number, points = 5) => {
  const verts: {x:number,y:number}[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return verts;
};

// ──────────────────────────────────────────────
// ACCURACY ENGINE
// ──────────────────────────────────────────────

/**
 * Compute the mean point-to-outline distance and convert to a 0–100 precision score.
 * @param pts       - raw drawn points
 * @param outline   - sample points along the ideal shape perimeter
 * @param R         - characteristic size (used for normalisation)
 * @param tolerance - fraction of R below which error is essentially 0 (accounts for 1 px line width)
 * @param falloff   - how steeply the score penalises distance; higher = harsher
 */
const precisionScore = (
  pts: {x:number,y:number}[],
  outlineSamples: {x:number,y:number}[],
  R: number,
  falloff = 3.5
) => {
  // For each drawn point, find distance to nearest outline sample
  const dists = pts.map(p => {
    let min = Infinity;
    for (const s of outlineSamples) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < min) min = d;
    }
    return min;
  });
  const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  const normError = avgDist / (R || 1);
  return Math.max(0, 100 * (1 - Math.min(1, normError * falloff)));
};

/**
 * Compute coverage: what fraction of the ideal outline has been traced?
 * @param pts          - raw drawn points
 * @param outlineSamples - sample points along the ideal shape perimeter
 * @param R            - characteristic size
 * @param threshold    - fraction of R within which a sample is "covered"
 */
const coverageScore = (
  pts: {x:number,y:number}[],
  outlineSamples: {x:number,y:number}[],
  R: number,
  threshold = 0.12
) => {
  const thresh = R * threshold;
  let covered = 0;
  for (const s of outlineSamples) {
    for (const p of pts) {
      if (Math.hypot(p.x - s.x, p.y - s.y) < thresh) { covered++; break; }
    }
  }
  return covered / outlineSamples.length;
};

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────

export const ShapeMeComponent: React.FC<ShapeMeProps> = ({ onGameEnd, isDark = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('circle');
  const [gameStatus, setGameStatus] = useState<'idle' | 'drawing' | 'evaluated'>('idle');
  const [bestScores, setBestScores] = useState<BestScores>(() => {
    const saved = localStorage.getItem('shapeme_best');
    return saved ? JSON.parse(saved) : { circle: 0, square: 0, hexagon: 0, triangle: 0, star: 0, heart: 0 };
  });

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameStatus === 'evaluated') return;
    setIsDrawing(true);
    setGameStatus('drawing');
    setLiveAccuracy(null);
    const pos = getPos(e);
    setPoints([pos]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const newPoints = [...points, pos];
    setPoints(newPoints);

    // Live accuracy update (throttled for performance)
    if (newPoints.length > 15 && newPoints.length % 6 === 0) {
      setLiveAccuracy(Math.round(computeAccuracy(newPoints, selectedShape, false)));
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isDark ? '#ffffff' : '#3b82f6';
      ctx.shadowBlur = 2;
      ctx.shadowColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(59,130,246,0.3)';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  /**
   * Core accuracy function.
   * 1. Finds centroid & mean-radius of drawn pts (scale-invariant reference frame)
   * 2. Builds ideal shape in that same reference frame
   * 3. Computes precision (how close points are to ideal outline)
   * 4. Computes coverage (how much of the ideal outline was traced)
   * 5. Final = precision * coverage^0.6  (coverage penalised less steeply)
   */
  const computeAccuracy = (pts: {x:number,y:number}[], shape: ShapeType, checkCoverage: boolean): number => {
    if (pts.length < 8) return 0;
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    // ── Step 1: Centroid ──
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    // ── Step 2: Characteristic radius (circumscribed circle radius ≈ max dist from centroid) ──
    // We use the 90th-percentile radius to ignore stray outlier points
    const radii = pts.map(p => Math.hypot(p.x - cx, p.y - cy)).sort((a, b) => a - b);
    const R = radii[Math.floor(radii.length * 0.90)] || 1;

    // Minimum size guard: must be at least 8% of canvas
    const minR = Math.min(canvas.width, canvas.height) * 0.08;
    const sizePenalty = R < minR ? R / minR : 1;

    // ── Step 3: Build ideal shape outline sample ──
    const SAMPLES = 200; // more samples = more accurate coverage check
    let outlineVerts: {x:number,y:number}[] = [];

    // For square: use the inradius (half-side) = R/√2 so corners align with R
    if (shape === 'circle') {
      outlineVerts = sampleCircle(cx, cy, R, SAMPLES);
    } else if (shape === 'square') {
      const halfSide = R / Math.SQRT2;
      const sq = [
        { x: cx - halfSide, y: cy - halfSide },
        { x: cx + halfSide, y: cy - halfSide },
        { x: cx + halfSide, y: cy + halfSide },
        { x: cx - halfSide, y: cy + halfSide },
      ];
      outlineVerts = samplePolygon(sq, SAMPLES);
    } else if (shape === 'triangle') {
      outlineVerts = samplePolygon(polygonVerts(cx, cy, R, 3, -Math.PI / 2), SAMPLES);
    } else if (shape === 'hexagon') {
      outlineVerts = samplePolygon(polygonVerts(cx, cy, R, 6, 0), SAMPLES);
    } else if (shape === 'star') {
      const sv = starVerts(cx, cy, R, R * 0.4, 5);
      outlineVerts = samplePolygon(sv, SAMPLES);
    } else if (shape === 'heart') {
      // Parametric heart curve, scaled to radius R
      outlineVerts = Array.from({ length: SAMPLES }, (_, i) => {
        const t = (2 * Math.PI * i) / SAMPLES;
        // Standard heart parametric
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        // scale: max extent of hx is 16, hy is ~12. use 16 as normaliser
        return { x: cx + (hx / 16) * R, y: cy + (hy / 14) * R };
      });
    }

    // ── Step 4: Precision & Coverage ──
    const precision = precisionScore(pts, outlineVerts, R);
    
    let coverage = 1;
    if (checkCoverage) {
      coverage = coverageScore(pts, outlineVerts, R);
    }

    const score = precision * Math.pow(coverage, 0.55) * sizePenalty;
    return Math.max(0, Math.min(100, score));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const finalAcc = Math.round(computeAccuracy(points, selectedShape, true));
    setAccuracy(finalAcc);
    setLiveAccuracy(null);
    setGameStatus('evaluated');

    if (finalAcc > bestScores[selectedShape]) {
      const newBests = { ...bestScores, [selectedShape]: finalAcc };
      setBestScores(newBests);
      localStorage.setItem('shapeme_best', JSON.stringify(newBests));
    }
    if (onGameEnd) onGameEnd(finalAcc);
  };

  const reset = () => {
    setPoints([]);
    setAccuracy(null);
    setLiveAccuracy(null);
    setGameStatus('idle');
    clearCanvas();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }, []);

  const getAccuracyColor = (acc: number | null) => {
    if (acc === null) return isDark ? '#ffffff' : '#3b82f6';
    if (acc >= 95) return '#10b981';
    if (acc >= 85) return '#22c55e';
    if (acc >= 70) return '#84cc16';
    if (acc >= 50) return '#eab308';
    return '#f43f5e';
  };

  const renderTargetPreview = () => {
    const color = getAccuracyColor(accuracy);
    const size = 120;
    return (
      <div style={{
        width: size, height: size, margin: '0 auto 1.5rem',
        background: 'var(--item-bg)', borderRadius: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${color}40`, position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.4s'
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {selectedShape === 'circle' && <circle cx="50" cy="50" r="45" stroke={color} strokeWidth="5" />}
          {selectedShape === 'square' && <rect x="10" y="10" width="80" height="80" stroke={color} strokeWidth="5" />}
          {selectedShape === 'triangle' && <path d="M50 8 L92 87 L8 87 Z" stroke={color} strokeWidth="5" />}
          {selectedShape === 'hexagon' && <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" stroke={color} strokeWidth="5" />}
          {selectedShape === 'star' && <path d="M50 5 L61 37 L95 37 L68 58 L79 90 L50 70 L21 90 L32 58 L5 37 L39 37 Z" stroke={color} strokeWidth="4" />}
          {selectedShape === 'heart' && <path d="M50 85 C20 65 5 45 5 30 C5 15 17 5 30 5 C40 5 48 12 50 16 C52 12 60 5 70 5 C83 5 95 15 95 30 C95 45 80 65 50 85 Z" stroke={color} strokeWidth="4" fill="none" />}
        </svg>
        <div style={{ position: 'absolute', bottom: '6px', fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>TARGET</div>
      </div>
    );
  };

  return (
    <div className="container reveal stagger-1" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: 'clamp(1rem, 5vw, 3rem)' }}>

        {renderTargetPreview()}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {([
            { id: 'circle' as const, icon: <Circle size={16} /> },
            { id: 'square' as const, icon: <Square size={16} /> },
            { id: 'triangle' as const, icon: <Triangle size={16} /> },
            { id: 'star' as const, icon: <Star size={16} /> },
            { id: 'heart' as const, icon: <Heart size={16} /> },
            { id: 'hexagon' as const, icon: <Hexagon size={16} /> },
          ]).map(shape => (
            <button
              key={shape.id}
              onClick={() => { setSelectedShape(shape.id); reset(); }}
              style={{
                padding: '0.6rem 0.8rem', borderRadius: '12px',
                background: selectedShape === shape.id ? (isDark ? '#fff' : '#3b82f6') : 'var(--item-bg)',
                color: selectedShape === shape.id ? (isDark ? '#000' : '#fff') : 'var(--text-primary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: selectedShape === shape.id ? `0 0 15px ${isDark ? '#fff' : '#3b82f6'}40` : 'none'
              }}
            >
              {shape.icon}
            </button>
          ))}
        </div>

        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1',
          maxHeight: '380px', maxWidth: '380px', margin: '0 auto',
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
          borderRadius: '24px', border: `3px solid ${accuracy !== null ? getAccuracyColor(accuracy) : 'var(--item-border)'}`,
          cursor: gameStatus === 'evaluated' ? 'default' : 'crosshair', overflow: 'hidden', touchAction: 'none',
          transition: 'border-color 0.4s'
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {(liveAccuracy !== null || accuracy !== null) && (
            <div style={{
              position: 'absolute', top: '20px', left: '20px',
              padding: '8px 16px', borderRadius: '12px',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
              color: getAccuracyColor(liveAccuracy ?? accuracy),
              fontWeight: 900, fontSize: '1.2rem',
              border: `1px solid ${getAccuracyColor(liveAccuracy ?? accuracy)}50`,
              zIndex: 10, transition: 'color 0.3s'
            }}>
              {liveAccuracy ?? accuracy}%
            </div>
          )}

          {gameStatus === 'idle' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: 'var(--text-secondary)', opacity: 0.3, textAlign: 'center'
            }}>
              <MousePointer2 size={32} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>Draw Here</div>
            </div>
          )}
        </div>

        <button
          onClick={reset}
          style={{
            marginTop: '1.5rem', padding: '0.8rem 2rem', borderRadius: '12px',
            background: 'var(--item-bg)', border: '1px solid var(--item-border)',
            color: 'var(--text-primary)', fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem auto 0'
          }}
        >
          <RefreshCcw size={16} /> CLEAR CANVAS
        </button>
      </div>

      {/* Personal Bests Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--item-border)', paddingBottom: '1rem' }}>
          <Trophy size={22} color="#fbbf24" />
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>Personal Bests</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {([
            { id: 'circle' as const, label: 'Perfect Circle', icon: <Circle size={18} /> },
            { id: 'square' as const, label: 'Sharp Square', icon: <Square size={18} /> },
            { id: 'triangle' as const, label: 'Clean Triangle', icon: <Triangle size={18} /> },
            { id: 'star' as const, label: 'Majestic Star', icon: <Star size={18} /> },
            { id: 'heart' as const, label: 'True Heart', icon: <Heart size={18} /> },
            { id: 'hexagon' as const, label: 'Royal Hexagon', icon: <Hexagon size={18} /> },
          ]).map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: selectedShape === item.id ? 'var(--accent)20' : 'var(--item-bg)',
              borderRadius: '16px', border: `1px solid ${selectedShape === item.id ? 'var(--accent)' : 'var(--item-border)'}`,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ color: bestScores[item.id] > 0 ? getAccuracyColor(bestScores[item.id]) : 'var(--text-secondary)' }}>
                  {item.icon}
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: selectedShape === item.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 950, color: getAccuracyColor(bestScores[item.id]) }}>
                {bestScores[item.id]}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', background: 'var(--item-bg)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Trace the <strong>entire</strong> outline for a high score. Precision + Coverage are both measured.
          </p>
        </div>
      </div>

      <style>{`
        .reveal { opacity: 0; animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes reveal { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
};
