import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Paintbrush, Trophy, CheckCircle, RotateCcw } from 'lucide-react';
import pixelmatch from 'pixelmatch';
import confetti from 'canvas-confetti';
import { toCanvas } from 'html-to-image';

interface CssBattleProps {
  room: Room | null;
  me: Player | null;
  leaderboard: { name: string; score: number; time: number }[];
  onBack: () => void;
}

const LEVELS = [
  {
    id: 1,
    name: "Classic Overlap",
    html: `<div class="circle"></div>\n<div class="box"></div>`,
    css: `body {
  background: #1e1e1e;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.circle {
  width: 150px;
  height: 150px;
  background: #f43f5e;
  border-radius: 50%;
  position: absolute;
}
.box {
  width: 100px;
  height: 100px;
  background: #3b82f6;
  position: absolute;
  transform: rotate(45deg);
}`,
    colors: ['#1e1e1e', '#f43f5e', '#3b82f6']
  },
  {
    id: 2,
    name: "Concentric",
    html: `<div class="ring-1"></div>\n<div class="ring-2"></div>\n<div class="ring-3"></div>`,
    css: `body {
  background: #0f172a;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.ring-1 {
  width: 200px; height: 200px;
  background: #10b981;
  border-radius: 50%;
  position: absolute;
}
.ring-2 {
  width: 130px; height: 130px;
  background: #fbbf24;
  border-radius: 50%;
  position: absolute;
}
.ring-3 {
  width: 60px; height: 60px;
  background: #f43f5e;
  border-radius: 50%;
  position: absolute;
}`,
    colors: ['#0f172a', '#10b981', '#fbbf24', '#f43f5e']
  },
  {
    id: 3,
    name: "Pyramid",
    html: `<div class="triangle"></div>\n<div class="base"></div>`,
    css: `body {
  background: #f8fafc;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.triangle {
  width: 0;
  height: 0;
  border-left: 80px solid transparent;
  border-right: 80px solid transparent;
  border-bottom: 120px solid #8b5cf6;
}
.base {
  width: 160px;
  height: 40px;
  background: #3b82f6;
}`,
    colors: ['#f8fafc', '#8b5cf6', '#3b82f6']
  },
  {
    id: 4,
    name: "Pillars",
    html: `<div class="pillar p1"></div>\n<div class="pillar p2"></div>\n<div class="pillar p3"></div>`,
    css: `body {
  background: #1e293b;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
  padding-bottom: 50px;
}
.pillar {
  width: 40px;
  background: #ec4899;
}
.p1 { height: 100px; }
.p2 { height: 160px; }
.p3 { height: 120px; }`,
    colors: ['#1e293b', '#ec4899']
  },
  {
    id: 5,
    name: "Intersection",
    html: `<div class="h-bar"></div>\n<div class="v-bar"></div>`,
    css: `body {
  background: #020617;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.h-bar {
  width: 200px;
  height: 50px;
  background: #14b8a6;
  position: absolute;
}
.v-bar {
  width: 50px;
  height: 200px;
  background: #f59e0b;
  position: absolute;
  mix-blend-mode: screen;
}`,
    colors: ['#020617', '#14b8a6', '#f59e0b']
  }
];

const TARGET_WIDTH = 400;
const TARGET_HEIGHT = 300;

export const CssBattle: React.FC<CssBattleProps> = ({ me, leaderboard, onBack }) => {
  const [userHtml, setUserHtml] = useState('<div class="circle"></div>');
  const [userCss, setUserCss] = useState('body {\n  background: #1e1e1e;\n}\n.circle {\n  width: 100px;\n  height: 100px;\n  background: red;\n}');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [matchPercent, setMatchPercent] = useState(0);
  const [playerName, setPlayerName] = useState('');
  
  const targetIframeRef = useRef<HTMLIFrameElement>(null);
  const outputIframeRef = useRef<HTMLIFrameElement>(null);

  const calculateMatch = async () => {
    if (!isPlaying) return;
    const targetBody = targetIframeRef.current?.contentDocument?.body;
    const outputBody = outputIframeRef.current?.contentDocument?.body;
    
    if (!targetBody || !outputBody) return;

    try {
      const tCanvas = await toCanvas(targetBody, { width: TARGET_WIDTH, height: TARGET_HEIGHT, backgroundColor: '#fff', style: { margin: '0', padding: '0' } });
      const oCanvas = await toCanvas(outputBody, { width: TARGET_WIDTH, height: TARGET_HEIGHT, backgroundColor: '#fff', style: { margin: '0', padding: '0' } });

      const tCtx = tCanvas.getContext('2d');
      const oCtx = oCanvas.getContext('2d');
      if (!tCtx || !oCtx) return;

      const targetData = tCtx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      const outputData = oCtx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = TARGET_WIDTH;
      diffCanvas.height = TARGET_HEIGHT;
      const diffCtx = diffCanvas.getContext('2d')!;
      const diffData = diffCtx.createImageData(TARGET_WIDTH, TARGET_HEIGHT);

      const numDiffPixels = pixelmatch(
        targetData.data, outputData.data, diffData.data,
        TARGET_WIDTH, TARGET_HEIGHT, { threshold: 0.1 }
      );

      const totalPixels = TARGET_WIDTH * TARGET_HEIGHT;
      const match = 100 - (numDiffPixels / totalPixels) * 100;
      setMatchPercent(parseFloat(match.toFixed(2)));

      if (match === 100 && isPlaying) {
        setIsPlaying(false);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        if (me) {
          socket.emit('cssbattle-score', { name: me.name, match: 100, time: elapsed });
        } else if (playerName) {
          socket.emit('cssbattle-score', { name: playerName, match: 100, time: elapsed });
        }
      }
    } catch (e) {
      console.error('html-to-image calculation failed:', e);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      const timeout = setTimeout(calculateMatch, 500);
      return () => clearTimeout(timeout);
    }
  }, [userHtml, userCss, isPlaying]);

  useEffect(() => {
    if (isPlaying && matchPercent !== 100) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, startTime, matchPercent]);

  const activeLevel = LEVELS[selectedLevel];
  const targetSrcDoc = `<!DOCTYPE html><html><head><style>body{width:${TARGET_WIDTH}px;height:${TARGET_HEIGHT}px;margin:0;padding:0;overflow:hidden;background:#fff;}${activeLevel.css}</style></head><body>${activeLevel.html}</body></html>`;
  const outputSrcDoc = `<!DOCTYPE html><html><head><style>body{width:${TARGET_WIDTH}px;height:${TARGET_HEIGHT}px;margin:0;padding:0;overflow:hidden;background:#fff;}${userCss}</style></head><body>${userHtml}</body></html>`;

  const handleStart = () => {
    if (!me && !playerName.trim()) return;
    setIsPlaying(true);
    setStartTime(Date.now());
    setElapsed(0);
    setUserHtml(activeLevel.html);
    setUserCss(`body {\n  background: ${activeLevel.colors[0] || '#111'};\n}`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isPlaying && matchPercent !== 100) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <Paintbrush size={60} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <h1 className="responsive-title" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 950 }}>CSS BATTLE</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 700 }}>
            Replicate the target shape using only HTML and CSS. Achieve 100% match to log your time.
          </p>

          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>SELECT LEVEL:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {LEVELS.map((lvl, index) => (
                <div 
                  key={lvl.id}
                  onClick={() => setSelectedLevel(index)}
                  style={{
                    padding: '0.8rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: selectedLevel === index ? 'var(--accent-glow)' : 'var(--item-bg)',
                    border: selectedLevel === index ? '2px solid var(--accent)' : '1px solid var(--item-border)',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: selectedLevel === index ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 800, marginBottom: '0.2rem' }}>LEVEL {lvl.id}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{lvl.name}</div>
                </div>
              ))}
            </div>
          </div>

          {!me && (
            <input 
              className="input-field" 
              placeholder="Enter your name" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)} 
              style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center' }}
            />
          )}

          <button className="btn btn-primary" onClick={handleStart} style={{ width: '100%', background: 'var(--accent)', border: 'none', fontWeight: 900 }} disabled={!me && !playerName.trim()}>
            Start Challenge
          </button>
          <button className="btn btn-outline" onClick={onBack} style={{ width: '100%', marginTop: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <div style={{ padding: '1.5rem 2rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => { setIsPlaying(false); onBack(); }} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
            ← Quit
          </button>
          <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 950 }}>
            <Paintbrush /> CSS BATTLE
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800 }}>MATCH</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: matchPercent === 100 ? 'var(--success)' : (matchPercent > 90 ? '#fbbf24' : 'var(--text-primary)') }}>
              {matchPercent}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TIME</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>
              {formatTime(elapsed)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editors */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--item-border)' }}>
          {/* Color Palette */}
          <div style={{ padding: '1rem', background: 'var(--item-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 800 }}>TARGET COLORS:</div>
             <div style={{ display: 'flex', gap: '0.8rem' }}>
                {activeLevel.colors.map(c => (
                   <div 
                     key={c}
                     onClick={() => navigator.clipboard.writeText(c)}
                     title={`Click to copy ${c}`}
                     style={{ 
                       width: '28px', height: '28px', borderRadius: '50%', background: c, 
                       cursor: 'pointer', border: '1px solid var(--item-border)',
                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.1s'
                     }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                   />
                ))}
             </div>
             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto', opacity: 0.6 }}>Click to copy</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--item-border)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.8rem' }}>HTML</div>
            <textarea 
              value={userHtml}
              onChange={e => setUserHtml(e.target.value)}
              disabled={matchPercent === 100}
              spellCheck={false}
              style={{ flex: 1, background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', border: 'none', resize: 'none', fontFamily: 'monospace', fontSize: '1.1rem', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderTop: '2px solid var(--item-border)' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--item-border)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.8rem' }}>CSS</div>
            <textarea 
              value={userCss}
              onChange={e => setUserCss(e.target.value)}
              disabled={matchPercent === 100}
              spellCheck={false}
              style={{ flex: 1, background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', border: 'none', resize: 'none', fontFamily: 'monospace', fontSize: '1.1rem', outline: 'none' }}
            />
          </div>
        </div>

        {/* Visuals */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem', gap: '2rem' }}>
          
          {matchPercent === 100 && (
            <div className="card animate-fade-in" style={{ padding: '2rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)' }}>
              <CheckCircle size={50} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
              <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 950 }}>Perfect Match!</h2>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>You completed the shape in <strong>{formatTime(elapsed)}</strong>.</p>
              <button className="btn btn-primary" onClick={handleStart} style={{ padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 950, background: 'var(--success)', border: 'none' }}>
                <RotateCcw size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Try to beat your time!
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div>
              <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 800 }}>TARGET</div>
              <iframe ref={targetIframeRef} srcDoc={targetSrcDoc} title="Target" style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT, border: 'none', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: '#fff' }} />
            </div>
            <div>
              <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 800 }}>YOUR OUTPUT</div>
              <iframe ref={outputIframeRef} srcDoc={outputSrcDoc} title="Output" style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT, border: 'none', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', background: '#fff' }} />
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}>
               <Trophy size={18} color="#fbbf24" /> Leaderboard (Top 15)
            </h3>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
              {leaderboard?.length > 0 ? leaderboard.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: i % 2 === 0 ? 'var(--item-bg)' : 'transparent', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 900, minWidth: '20px' }}>#{i+1}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{l.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    <span style={{ color: 'var(--success)' }}>{l.score}%</span>
                    <span>{formatTime(l.time)}</span>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No times posted yet. Be the first!</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
