import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Paintbrush, Trophy, CheckCircle, ArrowLeft, Target, Eye, Code } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  const targetIframeRef = useRef<HTMLIFrameElement>(null);
  const outputIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateMatch = async () => {
    if (!isPlaying || elapsed < 1) return;
    const targetBody = targetIframeRef.current?.contentDocument?.body;
    const outputBody = outputIframeRef.current?.contentDocument?.body;

    if (!targetBody || !outputBody || targetBody.innerHTML.trim() === '') return;

    try {
      const tCanvas = await toCanvas(targetBody, { width: TARGET_WIDTH, height: TARGET_HEIGHT, backgroundColor: '#fff' });
      const oCanvas = await toCanvas(outputBody, { width: TARGET_WIDTH, height: TARGET_HEIGHT, backgroundColor: '#fff' });

      const tCtx = tCanvas.getContext('2d');
      const oCtx = oCanvas.getContext('2d');
      if (!tCtx || !oCtx) return;

      const targetData = tCtx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      const outputData = oCtx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      let isEmpty = true;
      for (let i = 0; i < targetData.data.length; i += 16) {
        const r = targetData.data[i];
        const g = targetData.data[i + 1];
        const b = targetData.data[i + 2];
        const a = targetData.data[i + 3];
        if (a > 0 && !(r === 255 && g === 255 && b === 255)) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) return;

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
        <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}>
          <Paintbrush size={60} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 950, fontSize: '2.5rem' }}>CSS BATTLE</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', fontWeight: 700 }}>
            Replicate the target shape using only HTML and CSS.
          </p>

          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pick a Challenge</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {LEVELS.map((lvl, index) => (
                <div
                  key={lvl.id}
                  onClick={() => setSelectedLevel(index)}
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: selectedLevel === index ? 'var(--accent-glow)' : 'var(--item-bg)',
                    border: `1px solid ${selectedLevel === index ? 'var(--accent)' : 'var(--item-border)'}`,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    textAlign: 'center',
                    transform: selectedLevel === index ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: selectedLevel === index ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 900, marginBottom: '0.4rem' }}>{lvl.id}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{lvl.name}</div>
                </div>
              ))}
            </div>
          </div>

          {!me && (
            <input
              className="input-field"
              placeholder="YOUR NAME"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 800 }}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleStart} style={{ height: '60px', fontSize: '1.2rem', fontWeight: 950 }} disabled={!me && !playerName.trim()}>
              ENTER BATTLE
            </button>
            <button className="btn btn-outline" onClick={onBack} style={{ height: '50px', fontWeight: 800 }}>
              EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-mobile-padding" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', width: '100%', padding: 0, margin: 0 }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '0.65rem 0.75rem' : '0.65rem clamp(1rem, 4vw, 1.5rem)', background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => { setIsPlaying(false); onBack(); }} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', padding: 0 }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 950, fontSize: '1rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            <Paintbrush size={18} color="var(--accent)" /> CSS BATTLE
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.05em' }}>MATCH</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 950, color: matchPercent === 100 ? 'var(--success)' : (matchPercent > 90 ? '#fbbf24' : 'var(--text-primary)') }}>
              {matchPercent}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.05em' }}>TIME</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--accent)' }}>
              {formatTime(elapsed)}
            </div>
          </div>
        </div>
      </div>

      <div className="no-mobile-padding" style={{ padding: isMobile ? '0' : 'clamp(0px, 2vw, 1.5rem)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', width: '100%', margin: 0 }}>
        <div className="dashboard-layout no-mobile-padding" style={{ maxWidth: isMobile ? '100%' : '1440px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', gap: isMobile ? '0' : 'clamp(1rem, 3vw, 3rem)' }}>

          {/* Main Area: Editors */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            {matchPercent === 100 && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'var(--success-glow)', border: '2px solid var(--success)', borderRadius: '24px' }}>
                <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                <h2 style={{ color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '2.2rem', fontWeight: 950 }}>100% MATCH!</h2>
                <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Time: {formatTime(elapsed)}</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={handleStart} style={{ padding: '0.8rem 2rem', fontWeight: 950, background: 'var(--success)', border: 'none' }}>RETRY SPEEDRUN</button>
                  <button className="btn btn-outline" onClick={() => setIsPlaying(false)}>NEW CHALLENGE</button>
                </div>
              </div>
            )}

            <div className="card card-mobile-full" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e1e1e', border: '1px solid #333', borderRadius: '24px', minHeight: '60vh', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', background: '#252526', borderBottom: '1px solid #333' }}>
                <Code size={16} color="#4ade80" />
                <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 800, letterSpacing: '0.1em' }}>HTML EDITOR</span>
              </div>
              <textarea
                value={userHtml}
                onChange={e => setUserHtml(e.target.value)}
                disabled={matchPercent === 100}
                spellCheck={false}
                style={{ flex: 2, background: 'transparent', color: '#d4d4d4', padding: '1rem 0.5rem', border: 'none', resize: 'none', fontFamily: 'monospace', fontSize: '0.95rem', outline: 'none', lineHeight: '1.6' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', background: '#252526', borderBottom: '1px solid #333', borderTop: '1px solid #333' }}>
                <Code size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 800, letterSpacing: '0.1em' }}>CSS EDITOR</span>
              </div>
              <textarea
                value={userCss}
                onChange={e => setUserCss(e.target.value)}
                disabled={matchPercent === 100}
                spellCheck={false}
                style={{ flex: 3, background: 'transparent', color: '#d4d4d4', padding: '1rem 0.5rem', border: 'none', resize: 'none', fontFamily: 'monospace', fontSize: '0.95rem', outline: 'none', lineHeight: '1.6' }}
              />
            </div>
          </div>

          {/* Sidebar: Preview and Leaderboard */}
          <div className="dashboard-sidebar" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div className="card" style={{ padding: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <Target size={18} color="var(--accent)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Target Match</span>
                </div>
                <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--item-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <iframe ref={targetIframeRef} srcDoc={targetSrcDoc} title="Target" style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT, border: 'none', pointerEvents: 'none', transform: 'scale(1)', flexShrink: 0 }} />
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <Eye size={18} color="var(--success)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Your Result</span>
                </div>
                <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--item-border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <iframe ref={outputIframeRef} srcDoc={outputSrcDoc} title="Output" style={{ width: TARGET_WIDTH, height: TARGET_HEIGHT, border: 'none', pointerEvents: 'none', transform: 'scale(1)', flexShrink: 0 }} />
                </div>

                {/* Color Palette in Sidebar */}
                <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {activeLevel.colors.map(c => (
                    <div
                      key={c}
                      onClick={() => navigator.clipboard.writeText(c)}
                      style={{ width: '30px', height: '30px', borderRadius: '8px', background: c, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      title="Copy Hex"
                    />
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', border: '1px solid var(--item-border)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', justifyContent: 'center' }}>
                  <Trophy size={20} color="#fbbf24" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hall of Fame</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {leaderboard?.length > 0 ? leaderboard.slice(0, 8).map((l, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: i < 3 ? 'var(--accent-glow)' : 'var(--item-bg)', borderRadius: '12px', border: i < 3 ? '1px solid var(--accent)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ color: i === 0 ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 950, fontSize: '0.75rem' }}>#{i + 1}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>{l.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 950, fontSize: '0.85rem' }}>{l.score}%</span>
                        <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>•</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>{formatTime(l.time)}</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', border: '2px dashed var(--item-border)', borderRadius: '12px' }}>No entries yet</div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CssBattle;
