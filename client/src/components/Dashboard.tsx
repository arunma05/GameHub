import React from 'react';
import { Gamepad2, Timer, Trophy, Globe, Zap, Brain, Paintbrush, Grid3X3, LayoutGrid, Lightbulb, HelpCircle, Rabbit, Coins, MousePointer2 } from 'lucide-react';

interface DashboardProps {
  onSelectGame: (type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'jumprace' | 'shapeme' | 'colormatcher' | 'mirrordraw' | 'archerstick') => void;
  leaderboards: Record<string, any>;
  onSelectNews?: (query: string, title: string, subtitle: string) => void;
}

const GAME_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  bingo: { color: '#10b981', label: 'Bingo', icon: <Gamepad2 size={13} /> },
  typeracer: { color: '#3b82f6', label: 'Type Racer', icon: <Timer size={13} /> },
  chess: { color: '#8b5cf6', label: 'Chess', icon: <span style={{ fontSize: '0.85rem' }}>♘</span> },
  flappy: { color: '#fbbf24', label: 'Flappy Bird', icon: <Zap size={13} /> },
  quiz: { color: '#ec4899', label: 'Trivia', icon: <HelpCircle size={13} /> },
  cssbattle: { color: '#f43f5e', label: 'CSS Battle', icon: <Paintbrush size={13} /> },
  sudoku: { color: '#22d3ee', label: 'Sudoku', icon: <Grid3X3 size={13} /> },
  kakuro: { color: '#a78bfa', label: 'Kakuro', icon: <Brain size={13} /> },
  sixteencoins: { color: '#6366f1', label: '16 Coins', icon: <Coins size={13} /> },
  gridorder: { color: '#f59e0b', label: 'Grid Order', icon: <LayoutGrid size={13} /> },
  memory: { color: '#ec4899', label: 'Remember Me', icon: <Lightbulb size={13} /> },
  jumprace: { color: '#10b981', label: 'Jump Race', icon: <Rabbit size={13} /> },
  shapeme: { color: '#84cc16', label: 'Shape Me', icon: <Paintbrush size={13} /> },
  colormatcher: { color: '#d946ef', label: 'Color Matcher', icon: <Zap size={13} /> },
  mirrordraw: { color: '#2dd4bf', label: 'Mirror Draw', icon: <MousePointer2 size={13} /> },
  archerstick: { color: '#f43f5e', label: 'Archer Stick', icon: <span style={{ fontSize: '0.85rem' }}>🏹</span> }
};

const NewsTile: React.FC<{
  onClick?: () => void;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  linkText: string;
  staggerClass?: string;
}> = ({ onClick, title, desc, icon, color, linkText, staggerClass }) => (
  <div
    className="card"
    onClick={onClick}
    style={{
      padding: '2rem', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column',
      cursor: 'pointer', background: 'var(--card-bg)',
      transition: 'all var(--transition-normal)', border: '1px solid var(--card-border)'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)'; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.borderColor = 'var(--item-border)'; }}
  >
    <div
      className={`roll-in ${staggerClass || ''}`}
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        border: `1px solid ${color}25`
      }}
    >
      {icon}
    </div>
    <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 950, letterSpacing: '-0.01em' }}>{title}</h2>
    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.9rem', fontWeight: 600 }}>
      {desc}
    </p>
    <div style={{ marginTop: 'auto', paddingTop: '1.25rem', fontSize: '0.85rem', color: color, fontWeight: 900 }}>
      {linkText}
    </div>
  </div>
);

const GlobalLeadersTile: React.FC<{ leaderboards: Record<string, any> }> = ({ leaderboards }) => {
  const getAllTopEntries = (gameType: string, data: any): { sublabel?: string, name: string; score: string | number }[] => {
    if (gameType === 'shapeme' || gameType === 'mirrordraw') {
      if (typeof data !== 'object' || Array.isArray(data)) return [];
      return Object.entries(data).map(([cat, entries]: [string, any]) => {
        if (!Array.isArray(entries) || entries.length === 0) return null;
        const top = entries[0];
        return {
          sublabel: cat.charAt(0).toUpperCase() + cat.slice(1),
          name: top.name,
          score: `${top.score}% Acc`
        };
      }).filter(Boolean) as any[];
    }
    if (gameType === 'colormatcher') {
      if (typeof data !== 'object' || Array.isArray(data)) return [];
      const entries = data['Best Match'];
      if (!Array.isArray(entries) || entries.length === 0) return [];
      const top = entries[0];
      return [{ name: top.name, score: `${top.score}% Match` }];
    }
    if (gameType === 'cssbattle') {
      if (typeof data !== 'object' || Array.isArray(data)) return [];
      return Object.entries(data).map(([lvl, entries]: [string, any]) => {
        if (!Array.isArray(entries) || entries.length === 0) return null;
        const top = entries[0];
        const m = Math.floor(top.time / 60);
        const s = Math.floor(top.time % 60);
        return {
          sublabel: `Level ${lvl}`,
          name: top.name,
          score: `${m}:${s < 10 ? '0' : ''}${s}`
        };
      }).filter(Boolean) as any[];
    }
    if (gameType === 'gridorder') {
      if (typeof data !== 'object' || Array.isArray(data)) return [];
      return Object.entries(data).map(([size, entry]: [string, any]) => {
        if (!entry.bestTimes || entry.bestTimes.length === 0) return null;
        const top = entry.bestTimes[0];
        const m = Math.floor(top.time / 60);
        const s = Math.floor(top.time % 60);
        return {
          sublabel: `${size}x${size}`,
          name: top.name,
          score: `${m}:${s < 10 ? '0' : ''}${s}`
        };
      }).filter(Boolean) as any[];
    }
    if (gameType === 'memory') {
      if (typeof data !== 'object' || Array.isArray(data)) return [];
      return Object.entries(data).map(([lvl, entries]: [string, any]) => {
        if (!Array.isArray(entries) || entries.length === 0) return null;
        const top = entries[0];
        const m = Math.floor(top.time / 60);
        const s = Math.floor(top.time % 60);
        return {
          sublabel: `${lvl} Cards`,
          name: top.name,
          score: `${m}:${s < 10 ? '0' : ''}${s}`
        };
      }).filter(Boolean) as any[];
    }

    if (gameType === 'typeracer') {
      if (!Array.isArray(data) || data.length === 0) return [];
      const top = data[0];
      return [{ name: top.name, score: `${top.wpm} WPM` }];
    }
    if (gameType === 'flappy') {
      if (!Array.isArray(data) || data.length === 0) return [];
      const top = data[0];
      return [{ name: top.name, score: `${(top.score / 1000).toFixed(2)} km` }];
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const entries = Object.entries(data);
      if (entries.length === 0) return [];
      const sorted = entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      return [{ name: sorted[0][0], score: `${sorted[0][1]} wins` }];
    }
    return [];
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Trophy size={24} color="#fbbf24" />
        <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 950, color: 'var(--text-primary)' }}>Top Scorers</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(() => {
          const allEntries = Object.entries(GAME_META).flatMap(([key, meta]) => {
            const entries = getAllTopEntries(key, leaderboards[key]);
            return entries.map(top => ({ ...top, meta, key }));
          });

          if (allEntries.length === 0) {
            return (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', background: 'var(--item-bg)', borderRadius: '12px', fontSize: '0.9rem' }}>
                No records found. Be the first to win!
              </div>
            );
          }

          return allEntries.map((entry, idx) => (
            <div key={`${entry.key}-${idx}`} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '0.75rem',
              borderBottom: idx === allEntries.length - 1 ? 'none' : '1px solid var(--item-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ color: entry.meta.color, opacity: 0.8 }}>{entry.meta.icon}</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {entry.meta.label}{entry.sublabel ? `: ${entry.sublabel}` : ''}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-primary)' }}>{entry.name}</div>
                </div>
              </div>
              <div style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)', fontWeight: 950, color: entry.meta.color, marginLeft: '0.5rem' }}>
                {entry.score}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectGame,
  leaderboards,
  onSelectNews
}) => {
  return (
    <div className="container" style={{ position: 'relative', paddingTop: '2rem', paddingBottom: '6rem' }}>
      <div className="hero-glow" />

      {/* Hero Section */}
      <div className="reveal stagger-1" style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative' }}>
        <h1 style={{
          fontSize: 'clamp(2.1rem, 7vw, 3.8rem)',
          fontWeight: 950,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '1.25rem'
        }}>
          Elevate Your <br /> <span style={{ color: 'var(--accent)', textShadow: '0 0 30px var(--accent-glow)' }}>Arcade Experience</span>
        </h1>
        <p style={{
          maxWidth: '600px',
          margin: '0 auto',
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          lineHeight: 1.6
        }}>
          Compete, climb, and conquer. A curated collection of classic games reimagined with a modern aesthetic.
        </p>
      </div>

      {/* Glowing Divider */}
      <div className="reveal stagger-2" style={{
        width: '90%',
        margin: '0 auto 3rem auto',
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)',
        opacity: 0.6,
        boxShadow: '0 0 30px var(--accent-glow), 0 0 60px var(--accent-glow)'
      }} />

      {/* Main Two-Column Layout */}
      <div className="dashboard-layout">

        {/* Left Column: Games */}
        <div className="reveal stagger-3" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Games Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 950 }}>
                <Gamepad2 size={32} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow))' }} /> Popular Games
              </h2>
            </div>


            <div className="game-cards-grid">
              {[
                { type: 'shapeme' as const, players: 'Precision', color: '#84cc16', icon: <Paintbrush size={32} />, title: 'SHAPE ME', desc: 'Draw perfect circles, stars, and hearts to test your precision and accuracy.' },
                { type: 'bingo' as const, players: 'Multiplayer', color: '#10b981', icon: <Gamepad2 size={32} />, title: 'BINGO', desc: 'Classic Bingo with a competitive twist. Complete 5 lines to win!' },
                { type: 'typeracer' as const, players: 'Racing', color: '#6366f1', icon: <Timer size={32} />, title: 'TYPE RACER', desc: 'Speed typing test. Complete the paragraph first without errors.' },
                { type: 'chess' as const, players: '2 Player', color: '#8b5cf6', icon: <span style={{ fontSize: '2rem' }}>♘</span>, title: 'CHESS', desc: 'Classic game of strategy in full 3D. Checkmate your opponent!' },
                { type: 'quiz' as const, players: 'Trivia', color: '#ec4899', icon: <HelpCircle size={32} />, title: 'TRIVIA', desc: 'Test your knowledge across 50+ diverse topics!' },
                { type: 'cssbattle' as const, players: 'Coding', color: '#f43f5e', icon: <Paintbrush size={32} />, title: 'CSS BATTLE', desc: 'Code HTML & CSS to match target shapes. Beat the clock!' },
                { type: 'flappy' as const, players: 'Skill', color: '#fbbf24', icon: <Zap size={32} />, title: 'FLAPPY BIRD', desc: 'Navigate the bird through pipes. Beat your high score!' },
                { type: 'sudoku' as const, players: 'Puzzle', color: '#22d3ee', icon: <Grid3X3 size={32} />, title: 'SUDOKU', desc: 'Classic 9x9 puzzle. Saves your progress automatically!' },
                { type: 'kakuro' as const, players: 'Numbers', color: '#a78bfa', icon: <Brain size={32} />, title: 'KAKURO', desc: 'Challenging number crossword puzzle. Solve or race!' },
                { type: 'sixteencoins' as const, players: 'Capture', color: '#6366f1', icon: <Coins size={32} />, title: '16 COINS', desc: 'Classic strategy board game in stunning 3D.' },
                { type: 'gridorder' as const, players: 'Speed', color: '#f59e0b', icon: <LayoutGrid size={32} />, title: 'GRID ORDER', desc: 'Shuffle the numbers into the right order. Race others!' },
                { type: 'memory' as const, players: 'Memory', color: '#ec4899', icon: <Lightbulb size={32} />, title: 'REMEMBER ME', desc: 'Test your memory! Match all pairs of cards as fast as you can.' },
                { type: 'jumprace' as const, players: 'Racing', color: '#10b981', icon: <Rabbit size={32} />, title: 'JUMP RACE', desc: 'Race pieces to the opposite corner. Jump over any piece!' },
                { type: 'colormatcher' as const, players: 'Precision', color: '#d946ef', icon: <Zap size={32} />, title: 'COLOR MATCHER', desc: 'Match complex colors by mixing RGB channels. High precision required!' },
                { type: 'mirrordraw' as const, players: 'Spatial', color: '#2dd4bf', icon: <MousePointer2 size={32} />, title: 'MIRROR DRAW', desc: 'Draw the horizontal reflection of shapes. Test your symmetry skills!' },
                { type: 'archerstick' as const, players: 'Combat', color: '#f43f5e', icon: <span style={{ fontSize: '2rem' }}>🏹</span>, title: 'ARCHER STICK', desc: 'Shoot arrows at your opponent. 5 hits to win the duel!' },
              ].map(({ type, players, color, icon, title, desc }, index) => (
                <div
                  key={type}
                  onClick={() => onSelectGame(type)}
                  className="card card-shine game-card-hover reveal"
                  style={{
                    cursor: 'pointer',
                    border: '1px solid var(--card-border)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: `linear-gradient(135deg, var(--card-bg) 0%, var(--card-gradient-end) 100%)`
                  }}
                >
                  <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '0.65rem', fontWeight: 900, color, background: `${color}15`, padding: '0.35rem 0.8rem', borderRadius: '100px', border: `1px solid ${color}33`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {players}
                  </div>
                  <div
                    className={`roll-in stagger-icon-${(index % 6) + 1}`}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: `${color}12`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.75rem',
                      color: color,
                      border: `1px solid ${color}22`,
                      boxShadow: `0 8px 16px -4px ${color}15`
                    }}
                  >
                    {icon}
                  </div>
                  <h2 style={{ fontSize: '1.7rem', marginBottom: '0.6rem', color: 'var(--text-primary)', fontWeight: 950, letterSpacing: '-0.02em' }}>{title}</h2>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.9rem', fontWeight: 500, marginBottom: '2rem' }}>{desc}</p>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color, fontWeight: 900, letterSpacing: '0.1em' }}>
                    PLAY NOW <span style={{ transition: 'transform 0.3s ease' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Information */}
        <div className="dashboard-sidebar reveal stagger-3">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: 950 }}>
            <Globe size={28} color="var(--success)" style={{ filter: 'drop-shadow(0 0 10px var(--success-glow))' }} /> Insights
          </h2>
          <NewsTile
            title="Latest Tech News"
            desc="Stay up-to-date with curated news about latest tech trends."
            icon={<Zap size={24} color="var(--success)" />}
            color="var(--success)"
            linkText="READ TECH NEWS →"
            staggerClass="stagger-icon-4"
            onClick={() => onSelectNews?.(
              'Latest tech news',
              'Tech Industry Updates',
              'Curated global updates.'
            )}
          />
          <NewsTile
            title="Global Headlines"
            desc="Headlines from across the globe and the Indian subcontinent."
            icon={<Globe size={24} color="var(--accent)" />}
            color="var(--accent)"
            linkText="READ GLOBAL NEWS →"
            staggerClass="stagger-icon-5"
            onClick={() => onSelectNews?.(
              'Latest International and Indian News',
              'Global Headlines',
              'Stay informed with the latest happenings.'
            )}
          />
          <div className="reveal stagger-4">
            <GlobalLeadersTile leaderboards={leaderboards} />
          </div>
        </div>
      </div>
    </div>
  );
};
