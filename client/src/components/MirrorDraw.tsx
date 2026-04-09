import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCcw, Info, MousePointer2, Trophy } from 'lucide-react';

interface MirrorDrawProps {
  onGameEnd?: (shape: string, score: number, time: number) => void;
  isDark?: boolean;
}

type ShapeType = 'zigzag' | 'infinity' | 'scurve' | 'lightning' | 'omega';

// ──────────────────────────────────────────────
// GEOMETRY HELPERS (Updated for Single Stroke)
// ──────────────────────────────────────────────

// Returns points in 0-100 normalized space
const getBezierPoint = (t: number, p0: {x:number,y:number}, p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}) => {
  const cx = 3 * (p1.x - p0.x);
  const bx = 3 * (p2.x - p1.x) - cx;
  const ax = p3.x - p0.x - cx - bx;
  const cy = 3 * (p1.y - p0.y);
  const by = 3 * (p2.y - p1.y) - cy;
  const ay = p3.y - p0.y - cy - by;
  return {
    x: ax * t ** 3 + bx * t ** 2 + cx * t + p0.x,
    y: ay * t ** 3 + by * t ** 2 + cy * t + p0.y
  };
};

const getPatternPoints = (shape: ShapeType, n: number) => {
  const pts: {x:number,y:number}[] = [];
  const stepsPerSeg = Math.floor(n / 2) || 1;

  if (shape === 'zigzag') {
    const p = [{x:100,y:10}, {x:50,y:25}, {x:100,y:40}, {x:50,y:55}, {x:100,y:70}, {x:50,y:85}, {x:100,y:95}];
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = 0; j < stepsPerSeg; j++) {
        const t = j / stepsPerSeg;
        pts.push({ x: p[i].x * (1 - t) + p[i+1].x * t, y: p[i].y * (1 - t) + p[i+1].y * t });
      }
    }
  } else if (shape === 'infinity') {
    const p0={x:100,y:50}, p1={x:60,y:10}, p2={x:20,y:10}, p3={x:20,y:50};
    const p4={x:20,y:50}, p5={x:20,y:90}, p6={x:60,y:90}, p7={x:100,y:50};
    for(let i=0; i<n/2; i++) pts.push(getBezierPoint(i/(n/2), p0, p1, p2, p3));
    for(let i=0; i<n/2; i++) pts.push(getBezierPoint(i/(n/2), p4, p5, p6, p7));
  } else if (shape === 'scurve') {
    const p0={x:100,y:10}, p1={x:50,y:10}, p2={x:0,y:40}, p3={x:50,y:50};
    const p4={x:50,y:50}, p5={x:100,y:60}, p6={x:50,y:90}, p7={x:100,y:90};
    for(let i=0; i<n/2; i++) pts.push(getBezierPoint(i/(n/2), p0, p1, p2, p3));
    for(let i=0; i<n/2; i++) pts.push(getBezierPoint(i/(n/2), p4, p5, p6, p7));
  } else if (shape === 'lightning') {
    const p = [{x:100,y:10}, {x:40,y:45}, {x:70,y:45}, {x:10,y:90}];
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = 0; j < (n/3); j++) {
        const t = j / (n/3);
        pts.push({ x: p[i].x * (1 - t) + p[i+1].x * t, y: p[i].y * (1 - t) + p[i+1].y * t });
      }
    }
  } else if (shape === 'omega') {
    // Approx omega with a multi-segment line for scoring
    const p = [{x:100,y:80}, {x:70,y:80}, {x:40,y:80}, {x:20,y:65}, {x:20,y:50}, {x:20,y:35}, {x:50,y:20}, {x:80,y:35}, {x:80,y:50}, {x:85,y:65}, {x:100,y:65}];
    for (let i = 0; i < p.length - 1; i++) {
      for (let j = 0; j < (n/10); j++) {
        const t = j / (n/10);
        pts.push({ x: p[i].x * (1 - t) + p[i+1].x * t, y: p[i].y * (1 - t) + p[i+1].y * t });
      }
    }
  }
  return pts;
};

const precisionScore = (pts: {x:number,y:number}[], outlineSamples: {x:number,y:number}[], size: number) => {
  const dists = pts.map(p => {
    let min = Infinity;
    for (const s of outlineSamples) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < min) min = d;
    }
    return min;
  });
  const avgDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  const normError = avgDist / (size || 1);
  return Math.max(0, 100 * (1 - Math.min(1, normError * 2.2)));
};

const coverageScore = (pts: {x:number,y:number}[], outlineSamples: {x:number,y:number}[], size: number) => {
  const thresh = size * 0.25;
  let covered = 0;
  for (const s of outlineSamples) {
    for (const p of pts) {
      if (Math.hypot(p.x - s.x, p.y - s.y) < thresh) { covered++; break; }
    }
  }
  return Math.min(1, (covered / outlineSamples.length) * 1.5);
};

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────

export const MirrorDraw: React.FC<MirrorDrawProps> = ({ onGameEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('zigzag');
  const [gameStatus, setGameStatus] = useState<'idle' | 'drawing' | 'evaluated'>('idle');
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('mirrordraw_best');
    return saved ? parseInt(saved) : 0;
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
    const pos = getPos(e);
    // User can only draw on the RIGHT side
    if (pos.x < canvasRef.current!.width * 0.48) return; 

    setIsDrawing(true);
    setGameStatus('drawing');
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
    // User can only draw on the RIGHT side
    if (pos.x < canvasRef.current!.width * 0.48) return;

    const newPoints = [...points, pos];
    setPoints(newPoints);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'var(--accent)';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const computeAccuracy = (pts: {x:number,y:number}[], shape: ShapeType): number => {
    if (pts.length < 5) return 0;
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const midX = canvas.width / 2;
    const fullW = midX; // Scaling for 0-100 logic
    const fullH = canvas.height;

    // ── Step 1: Flip points horizontally to the LEFT side ──
    const flippedPts = pts.map(p => ({ x: midX - (p.x - midX), y: p.y }));

    // ── Step 2: Sample scaled pattern points ──
    const SAMPLES = 150;
    const normalizedOutline = getPatternPoints(shape, SAMPLES);
    const outline = normalizedOutline.map(p => ({
       x: (p.x / 100) * fullW,
       y: (p.y / 100) * fullH
    }));

    const precision = precisionScore(flippedPts, outline, fullW * 0.4);
    const coverage = coverageScore(flippedPts, outline, fullW * 0.4);

    return Math.round(precision * Math.pow(coverage, 0.4));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const time = Math.floor((Date.now() - startTime) / 1000);
    const finalAcc = computeAccuracy(points, selectedShape);
    setAccuracy(finalAcc);
    setTimeTaken(time);
    setGameStatus('evaluated');

    if (finalAcc > bestScore) {
      setBestScore(finalAcc);
      localStorage.setItem('mirrordraw_best', finalAcc.toString());
    }
    if (onGameEnd) onGameEnd(selectedShape, finalAcc, time);
  };

  const reset = () => {
    setPoints([]);
    setAccuracy(null);
    setTimeTaken(null);
    setStartTime(Date.now());
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
    if (acc === null) return 'var(--accent)';
    if (acc >= 95) return '#10b981';
    if (acc >= 85) return '#22c55e';
    if (acc >= 70) return '#84cc16';
    if (acc >= 50) return '#eab308';
    return '#f43f5e';
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['zigzag', 'infinity', 'scurve', 'lightning', 'omega'] as const).map(shape => (
            <button
              key={shape}
              onClick={() => { setSelectedShape(shape); reset(); }}
              style={{
                width: 'auto', height: '45px', padding: '0 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selectedShape === shape ? 'var(--accent)' : 'var(--item-bg)',
                color: selectedShape === shape ? '#fff' : 'var(--text-primary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              {shape.replace('-', ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
           {accuracy !== null && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
               <div style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', background: `${getAccuracyColor(accuracy)}15`, border: `1px solid ${getAccuracyColor(accuracy)}`, color: getAccuracyColor(accuracy), fontWeight: 950, fontSize: '1.2rem' }}>
                 {accuracy}% SYMMETRY
               </div>
               {timeTaken !== null && (
                 <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
                   Drawn in {timeTaken} seconds
                 </div>
               )}
             </div>
           )}
           <button onClick={reset} className="btn" style={{ background: 'var(--item-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCcw size={16} /> RESET
           </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: '500px' }}>
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', padding: '0.5rem 1rem', borderRadius: '10px', color: '#fff', fontSize: '0.7rem', fontWeight: 900, zIndex: 10, letterSpacing: '0.1em' }}>PATTERN PORTION</div>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', padding: '0.5rem 1rem', borderRadius: '10px', color: '#fff', fontSize: '0.7rem', fontWeight: 900, zIndex: 10, letterSpacing: '0.1em' }}>COMPLETE SYMMETRY</div>
        
        {/* Mirror Line */}
        <div style={{ position: 'absolute', left: '50%', top: '0', height: '100%', width: '1px', background: 'var(--accent)', opacity: 0.3, zIndex: 5 }} />

        {/* Reference pattern on the left - anchored to the mirror line */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
           <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none" style={{ opacity: 0.8 }}>
              {selectedShape === 'zigzag' && <path d="M100 10 L50 25 L100 40 L50 55 L100 70 L50 85 L100 95" stroke="var(--text-primary)" strokeWidth="1.5" />}
              {selectedShape === 'infinity' && <path d="M100 50 C60 10 20 10 20 50 C20 90 60 90 100 50" stroke="var(--text-primary)" strokeWidth="1.5" />}
              {selectedShape === 'scurve' && <path d="M100 10 C50 10 0 40 50 50 C100 60 50 90 100 90" stroke="var(--text-primary)" strokeWidth="1.5" />}
              {selectedShape === 'lightning' && <path d="M100 10 L40 45 L70 45 L10 90" stroke="var(--text-primary)" strokeWidth="1.5" />}
              {selectedShape === 'omega' && <path d="M100 80 L70 80 Q20 80 20 50 Q20 20 50 20 Q80 20 80 50 Q80 65 100 65" stroke="var(--text-primary)" strokeWidth="1.5" />}
           </svg>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', cursor: 'crosshair', touchAction: 'none' }}
        />

        {gameStatus === 'idle' && (
          <div style={{ position: 'absolute', top: '50%', right: '15%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)', opacity: 0.4, textAlign: 'center' }}>
             <MousePointer2 size={32} style={{ marginBottom: '10px' }} />
             <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>MIRROR IT HERE</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
         <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Trophy size={32} color="#fbbf24" />
            <div>
               <div style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BEST SYMMETRY</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-primary)' }}>{bestScore}% Match</div>
            </div>
         </div>
         <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Info size={24} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5 }}>
               Draw the <strong>horizontal reflection</strong> of the shape. Match both the scale and the position relative to the mirror line.
            </p>
         </div>
      </div>

    </div>
  );
};
