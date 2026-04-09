import React, { useState } from 'react';
import { Target, RefreshCcw, Trophy, CheckCircle2 } from 'lucide-react';

interface ColorMatcherProps {
  onGameEnd?: (score: number, time: number) => void;
  isDark?: boolean;
}

const generateRandomColor = () => ({
  r: Math.floor(Math.random() * 256),
  g: Math.floor(Math.random() * 256),
  b: Math.floor(Math.random() * 256)
});

export const ColorMatcher: React.FC<ColorMatcherProps> = ({ onGameEnd }) => {
  const [targetColor, setTargetColor] = useState(generateRandomColor());
  const [userColor, setUserColor] = useState({ r: 128, g: 128, b: 128 });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('colormatcher_best');
    return saved ? parseInt(saved) : 0;
  });
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'evaluated'>('playing');
  const [startTime, setStartTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState<number | null>(null);

  const calculateAccuracy = (target: typeof targetColor, user: typeof userColor) => {
    const rDist = Math.abs(target.r - user.r);
    const gDist = Math.abs(target.g - user.g);
    const bDist = Math.abs(target.b - user.b);
    const maxDist = 255 * 3;
    const totalDist = rDist + gDist + bDist;
    // Exponential fallback for more "perceived" accuracy feel
    const linearAcc = 1 - totalDist / maxDist;
    return Math.round(Math.pow(linearAcc, 2) * 100);
  };

  const handleMatch = () => {
    const acc = calculateAccuracy(targetColor, userColor);
    const time = Math.floor((Date.now() - startTime) / 1000);
    setAccuracy(acc);
    setTimeTaken(time);
    setGameState('evaluated');
    
    if (acc > bestScore) {
      setBestScore(acc);
      localStorage.setItem('colormatcher_best', acc.toString());
    }
    
    if (onGameEnd) onGameEnd(acc, time);
  };

  const nextRound = () => {
    setTargetColor(generateRandomColor());
    setRound(r => r + 1);
    setAccuracy(null);
    setTimeTaken(null);
    setStartTime(Date.now());
    setGameState('playing');
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 98) return '#10b981';
    if (acc >= 90) return '#34d399';
    if (acc >= 80) return '#fbbf24';
    if (acc >= 60) return '#f59e0b';
    return '#f43f5e';
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Responsive Wrapper */}
      <div 
        className="game-responsive-wrapper"
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: '2rem' 
        }}
      >
        
        {/* Main Interface */}
        <div className="card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', flex: '1 1 600px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%', maxWidth: '500px' }}>
            {/* Target Color Square */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ 
                width: '100%', aspectRatio: '1', borderRadius: '24px',
                background: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
                boxShadow: `0 20px 40px rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.25)`,
                border: '4px solid var(--card-bg)'
              }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target</span>
            </div>

            {/* User Color Square */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ 
                width: '100%', aspectRatio: '1', borderRadius: '24px',
                background: `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})`,
                boxShadow: `0 20px 40px rgba(${userColor.r}, ${userColor.g}, ${userColor.b}, 0.25)`,
                border: '4px solid var(--card-bg)',
                transition: 'background 0.1s'
              }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Match</span>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
            {(['r', 'g', 'b'] as const).map(channel => (
              <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ width: '20px', fontWeight: 950, fontSize: '1.2rem', color: channel === 'r' ? '#f43f5e' : channel === 'g' ? '#10b981' : '#3b82f6', textTransform: 'uppercase' }}>{channel}</span>
                <input 
                  type="range" min="0" max="255" value={userColor[channel]}
                  disabled={gameState === 'evaluated'}
                  onChange={e => setUserColor({ ...userColor, [channel]: parseInt(e.target.value) })}
                  style={{ 
                    flex: 1, height: '6px', borderRadius: '3px', accentColor: channel === 'r' ? '#f43f5e' : channel === 'g' ? '#10b981' : '#3b82f6',
                    cursor: gameState === 'evaluated' ? 'default' : 'pointer'
                  }}
                />
                <span style={{ width: '35px', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>{userColor[channel]}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '500px' }}>
            {gameState === 'playing' ? (
              <button 
                onClick={handleMatch}
                className="btn btn-primary"
                style={{ flex: 1, padding: '1.25rem', height: 'auto', fontSize: '1.1rem', fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                <Target size={20} /> MATCH COLOR
              </button>
            ) : (
              <button 
                onClick={nextRound}
                className="btn btn-primary"
                style={{ flex: 1, background: '#fff', color: '#000', padding: '1.25rem', height: 'auto', fontSize: '1.1rem', fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                <RefreshCcw size={20} /> NEXT ROUND
              </button>
            )}
          </div>
        </div>

        {/* Status & Accuracy Sidebar */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '300px' }}>
            {accuracy !== null ? (
              <div className="animate-scale-in">
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem' }}>Match Accuracy</div>
                <div style={{ fontSize: '4.5rem', fontWeight: 950, color: getAccuracyColor(accuracy), lineHeight: 1, marginBottom: '0.5rem' }}>{accuracy}%</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {accuracy >= 98 ? '🏆 Perfect Eye!' : accuracy >= 90 ? '✨ Incredible Match' : accuracy >= 80 ? '👍 Great Job' : 'Keep practicing!'}
                </div>
                {timeTaken !== null && (
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)', opacity: 0.8 }}>
                    Matched in {timeTaken}s
                  </div>
                )}
              </div>
            ) : (
              <div style={{ opacity: 0.5 }}>
                <Target size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--text-secondary)' }} />
                <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Adjust sliders to match the target color square.</p>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Trophy size={24} color="#fbbf24" />
                <div>
                   <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>PERSONAL BEST</div>
                   <div style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{bestScore}% Match</div>
                </div>
             </div>
             <div style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--item-bg)', border: '1px solid var(--item-border)', fontWeight: 900, color: 'var(--accent)' }}>
                ROUND {round}
             </div>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--accent)" /> PRO TIP
             </h3>
             <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
                Colors are mathematical vectors. Try adjusting one channel at a time to zero-in on the exact shade.
             </p>
          </div>

        </div>

      </div>
    </div>
  );
};
