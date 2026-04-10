import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCcw, Info, MousePointer2, Trophy } from 'lucide-react';

interface MirrorDrawProps {
  onGameEnd?: (shape: string, score: number, time: number) => void;
  isDark?: boolean;
}

type ShapeType = 'infinity' | 'scurve' | 'lightning' | 'omega';

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

  if (shape === 'infinity') {
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

// Calculate distance between two points
const dist = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

// Resample points to have uniform distribution
const resample = (pts: {x:number, y:number}[], n: number) => {
  if (pts.length < 2) return Array(n).fill(pts[0] || {x:0, y:0});
  
  const res: {x:number, y:number}[] = [pts[0]];
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) totalLen += dist(pts[i-1], pts[i]);
  
  const interval = totalLen / (n - 1);
  let d = 0;
  
  for (let i = 1; i < pts.length; i++) {
    const segmentLen = dist(pts[i-1], pts[i]);
    if (segmentLen === 0) continue;

    while (d + segmentLen >= interval) {
      const t = (interval - d) / segmentLen;
      const newPt = {
        x: pts[i-1].x + t * (pts[i].x - pts[i-1].x),
        y: pts[i-1].y + t * (pts[i].y - pts[i-1].y)
      };
      res.push(newPt);
      d = 0;
      // Effectively "start" a new segment from the new point
      // To correctly handle multiple intervals within one long segment:
      // In a more robust version we'd loop, but simple t-offset works too
      // For simplicity, let's just use a more standard resampling logic:
      break; 
    }
    d += segmentLen;
  }

  // Fallback if loop missed points or precision issues
  while (res.length < n) res.push(pts[pts.length - 1]);
  return res.slice(0, n);
};

// Slightly more robust linear resampling
const resampleLinear = (pts: {x:number, y:number}[], n: number) => {
    if (pts.length < 2) return Array(n).fill(pts[0] || {x:0, y:0});
    
    // Calculate cumulative distances
    const cumDist = [0];
    for (let i = 1; i < pts.length; i++) {
        cumDist.push(cumDist[i-1] + dist(pts[i-1], pts[i]));
    }
    
    const totalLen = cumDist[cumDist.length - 1];
    const res: {x:number, y:number}[] = [];
    
    for (let i = 0; i < n; i++) {
        const targetDist = (i / (n - 1)) * totalLen;
        
        // Find segment
        let segmentIdx = cumDist.findIndex(d => d >= targetDist);
        if (segmentIdx === -1) segmentIdx = cumDist.length - 1;
        if (segmentIdx === 0) {
            res.push({...pts[0]});
        } else {
            const d1 = cumDist[segmentIdx - 1];
            const d2 = cumDist[segmentIdx];
            const t = (targetDist - d1) / (d2 - d1 || 1);
            res.push({
                x: pts[segmentIdx-1].x + t * (pts[segmentIdx].x - pts[segmentIdx-1].x),
                y: pts[segmentIdx-1].y + t * (pts[segmentIdx].y - pts[segmentIdx-1].y)
            });
        }
    }
    return res;
};

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────

export const MirrorDraw: React.FC<MirrorDrawProps> = ({ onGameEnd, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>('infinity');
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
    if (pos.x < canvasRef.current!.width * 0.48) return;

    setPoints(prev => [...prev, pos]);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = lineColor;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const computeAccuracy = (pts: {x:number,y:number}[], shape: ShapeType): number => {
    if (pts.length < 5) return 0;
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const midX = canvas.width / 2;
    const fullW = midX; 
    const fullH = canvas.height;

    // Flip user points for mapping
    const flippedPts = pts.map(p => ({ x: midX - (p.x - midX), y: p.y }));
    
    // Resample user points for consistent density
    const resampledUser = resampleLinear(flippedPts, 150);

    // Get reference outline points
    const SAMPLES = 150;
    const normalizedOutline = getPatternPoints(shape, SAMPLES);
    const outline = normalizedOutline.map(p => ({
       x: (p.x / 100) * fullW,
       y: (p.y / 100) * fullH
    }));

    // Check Both Directions (Forward and Backward) to handle drawing in any order
    const calculateError = (pA: {x:number,y:number}[], pB: {x:number,y:number}[]) => {
        let err = 0;
        for (let i = 0; i < SAMPLES; i++) {
            err += dist(pA[i], pB[i]);
        }
        return err / SAMPLES;
    };

    const errorForward = calculateError(resampledUser, outline);
    const errorBackward = calculateError([...resampledUser].reverse(), outline);
    
    const avgError = Math.min(errorForward, errorBackward);
    const diag = Math.hypot(fullW, fullH);
    
    // More generous scoring threshold (0.18 instead of 0.08)
    const score = Math.max(0, 100 * (1 - (avgError / (diag * 0.18))));
    
    // Path length penalty
    let userLen = 0;
    for(let i=1; i<pts.length; i++) userLen += dist(pts[i-1], pts[i]);
    let targetLen = 0;
    for(let i=1; i<outline.length; i++) targetLen += dist(outline[i-1], outline[i]);
    
    const lenRatio = Math.min(userLen, targetLen) / Math.max(userLen, targetLen);
    const finalScore = score * Math.pow(lenRatio, 0.2);
    
    return Math.round(finalScore);
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

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // We don't scale context here because getPos already handles rect-to-canvas mapping
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Explicit line colors as requested
  const lineColor = isDark ? '#ffffff' : '#000000';

  const getAccuracyColor = (acc: number | null) => {
    if (acc === null) return 'var(--accent)';
    if (acc >= 95) return '#10b981';
    if (acc >= 85) return '#22c55e';
    if (acc >= 70) return '#84cc16';
    if (acc >= 50) return '#eab308';
    return '#f43f5e';
  };

  return (
    <div className="container animate-fade-in" style={{ 
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem' 
    }}>
      
      <style>{`
        .mirrordraw-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
        }
        .shape-buttons {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 4px;
            max-width: 100%;
            -webkit-overflow-scrolling: touch;
        }
        .shape-buttons::-webkit-scrollbar { height: 4px; }
        .shape-buttons::-webkit-scrollbar-thumb { background: var(--item-border); borderRadius: 4px; }
        
        .mirrordraw-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        
        @media (max-width: 768px) {
            .mirrordraw-header { flex-direction: column; align-items: stretch; }
            .mirrordraw-grid { grid-template-columns: 1fr; }
            .accuracy-display { order: -1; align-items: center !important; }
        }
      `}</style>

      <div className="card mirrordraw-header">
        <div className="shape-buttons">
          {(['infinity', 'scurve', 'lightning', 'omega'] as const).map(shape => (
            <button
              key={shape}
              onClick={() => { setSelectedShape(shape); reset(); }}
              style={{
                flex: '0 0 auto', height: '45px', padding: '0 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
           {accuracy !== null && (
             <div className="accuracy-display" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
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
           <button onClick={reset} className="btn" style={{ background: 'var(--item-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <RefreshCcw size={16} /> RESET
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '-0.5rem' }}>
        <div style={{ background: 'var(--accent-glow)', padding: '0.4rem 0.8rem', borderRadius: '8px 8px 0 0', color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.1em', border: '1px solid var(--glass-border)', borderBottom: 'none', textAlign: 'center' }}>PATTERN PORTION</div>
        <div style={{ background: 'var(--accent-glow)', padding: '0.4rem 0.8rem', borderRadius: '8px 8px 0 0', color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.1em', border: '1px solid var(--glass-border)', borderBottom: 'none', textAlign: 'center' }}>DRAW MIRROR REFLECTION</div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative', width: '100%', minHeight: '400px', height: '55vh', maxHeight: '650px', borderRadius: '24px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
        
        <div style={{ position: 'absolute', left: '50%', top: '0', height: '100%', width: '1px', background: 'var(--accent)', opacity: 0.3, zIndex: 5 }} />

        <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
           <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" preserveAspectRatio="none" style={{ opacity: 0.8 }}>
              {selectedShape === 'infinity' && <path d="M100 50 C60 10 20 10 20 50 C20 90 60 90 100 50" stroke={lineColor} strokeWidth="1.5" />}
              {selectedShape === 'scurve' && <path d="M100 10 C50 10 0 40 50 50 C100 60 50 90 100 90" stroke={lineColor} strokeWidth="1.5" />}
              {selectedShape === 'lightning' && <path d="M100 10 L40 45 L70 45 L10 90" stroke={lineColor} strokeWidth="1.5" />}
              {selectedShape === 'omega' && <path d="M100 80 L70 80 Q20 80 20 50 Q20 20 50 20 Q80 20 80 50 Q80 65 100 65" stroke={lineColor} strokeWidth="1.5" />}
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
             <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>DRAW HERE</div>
          </div>
        )}
      </div>

      <div className="mirrordraw-grid">
         <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fbbf2415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={28} color="#fbbf24" />
            </div>
            <div>
               <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BEST SYMMETRY</div>
               <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--text-primary)' }}>{bestScore}% Match</div>
            </div>
         </div>
         <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Info size={20} color="var(--accent)" />
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
               Draw the <strong>horizontal reflection</strong> of the shape. Match both the scale and the position.
            </p>
         </div>
      </div>

    </div>
  );
};
