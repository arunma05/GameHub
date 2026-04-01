import React, { useState } from 'react';
import { Gamepad2, Timer, Trophy, Globe, Users, Zap, Brain, Paintbrush, Grid3X3, Sword, LayoutGrid, Lightbulb, HelpCircle } from 'lucide-react';
import { socket } from '../socket';
import { Logo } from './Logo';
import type { Player, PublicRoom } from '../types';

interface DashboardProps {
  onSelectGame: (type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory') => void;
  onRoomJoined: (me: Player, gameType: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory') => void;
  publicRooms: PublicRoom[];
  leaderboards: Record<string, any>;
  onSelectNews?: (query: string, title: string, subtitle: string) => void;
}

const GAME_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  bingo: { color: '#10b981', label: 'Bingo', icon: <Gamepad2 size={13} /> },
  typeracer: { color: '#3b82f6', label: 'Type Racer', icon: <Timer size={13} /> },
  chess: { color: '#8b5cf6', label: 'Chess', icon: <span style={{ fontSize: '0.85rem' }}>♘</span> },
  flappy: { color: '#fbbf24', label: 'Flappy Bird', icon: <Zap size={13} /> },
  quiz: { color: '#ec4899', label: 'Tech Quiz', icon: <HelpCircle size={13} /> },
  cssbattle: { color: '#f43f5e', label: 'CSS Battle', icon: <Paintbrush size={13} /> },
  sudoku: { color: '#22d3ee', label: 'Sudoku', icon: <Grid3X3 size={13} /> },
  kakuro: { color: '#a78bfa', label: 'Kakuro', icon: <Brain size={13} /> },
  sixteencoins: { color: '#6366f1', label: '16 Coins', icon: <Sword size={13} /> },
  gridorder: { color: '#f59e0b', label: 'Grid Order', icon: <LayoutGrid size={13} /> },
  memory: { color: '#ec4899', label: 'Remember Me', icon: <Lightbulb size={13} /> }
};

const NewsTile: React.FC<{ 
  onClick?: () => void; 
  title: string; 
  desc: string; 
  icon: React.ReactNode; 
  color: string;
  linkText: string;
}> = ({ onClick, title, desc, icon, color, linkText }) => (
  <div
    className="card"
    onClick={onClick}
    style={{
      padding: '2rem', height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column',
      borderColor: `${color}44`, cursor: 'pointer', background: 'var(--card-bg)',
      transition: 'all 0.3s ease', border: '1px solid var(--item-border)'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)'; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.borderColor = 'var(--item-border)'; }}
  >
    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
      {icon}
    </div>
    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 950 }}>{title}</h2>
    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.9rem', fontWeight: 600 }}>
      {desc}
    </p>
    <div style={{ marginTop: 'auto', paddingTop: '1.25rem', fontSize: '0.85rem', color: color, fontWeight: 900 }}>
      {linkText}
    </div>
  </div>
);

const GlobalLeadersTile: React.FC<{ leaderboards: Record<string, any> }> = ({ leaderboards }) => {
  const getTopPlayer = (gameType: string, data: any) => {
    if (gameType === 'typeracer') {
      if (!Array.isArray(data) || data.length === 0) return null;
      const top = data[0];
      return { name: top.name, score: `${top.wpm} WPM` };
    }
    if (gameType === 'flappy') {
      if (!Array.isArray(data) || data.length === 0) return null;
      const top = data[0];
      return { name: top.name, score: `${(top.score / 1000).toFixed(2)} km` };
    }
    if (gameType === 'cssbattle') {
      // Find level 1 best if exists
      if (data && data[1] && data[1].length > 0) {
        const top = data[1][0];
        const m = Math.floor(top.time / 60);
        const s = Math.floor(top.time % 60);
        return { name: top.name, score: `L1 - ${m}:${s < 10 ? '0' : ''}${s}` };
      }
      return null;
    }
    if (gameType === 'gridorder') {
      // Find 3x3 best time if exists
      if (data && data[3] && data[3].bestTimes && data[3].bestTimes.length > 0) {
        const top = data[3].bestTimes[0];
        const m = Math.floor(top.time / 60);
        const s = Math.floor(top.time % 60);
        return { name: top.name, score: `3x3 - ${m}:${s < 10 ? '0' : ''}${s}` };
      }
      return null;
    }
    
    if (gameType === 'memory') {
      if (data && data[6] && data[6].length > 0) {
        const top = data[6][0];
        const m = Math.floor(top.time / 60);
        const s = top.time % 60;
        return { name: top.name, score: `Lvl 6 - ${m}:${s < 10 ? '0' : ''}${s}` };
      }
      return null;
    }
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const entries = Object.entries(data);
      if (entries.length === 0) return null;
      const sorted = entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      return { name: sorted[0][0], score: `${sorted[0][1]} wins` };
    }
    return null;
  };

  return (
    <div className="card">
       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Trophy size={24} color="#fbbf24" />
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-primary)' }}>Top Scorers</h2>
       </div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(GAME_META).filter(([key]) => getTopPlayer(key, leaderboards[key])).length > 0 ? (
            Object.entries(GAME_META).map(([key, meta], index, array) => {
              const top = getTopPlayer(key, leaderboards[key]) as { name: string; score: string | number } | null;
              if (!top) return null;
              const isLast = index === array.length - 1;
              return (
                <div key={key} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingBottom: '0.75rem', 
                  borderBottom: isLast ? 'none' : '1px solid var(--item-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ color: meta.color, opacity: 0.8 }}>{meta.icon}</div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-primary)' }}>{top.name}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 950, color: meta.color }}>
                    {top.score}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', background: 'var(--item-bg)', borderRadius: '12px', fontSize: '0.9rem' }}>
               No records found. Be the first to win!
            </div>
          )}
       </div>
    </div>
  );
};



export const Dashboard: React.FC<DashboardProps> = ({ onSelectGame, onRoomJoined, publicRooms, leaderboards, onSelectNews }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  const handleJoinPublic = (room: PublicRoom) => {
    if (!playerName.trim()) return;
    setJoiningRoom(room.id);
    setIsLoading(true);
    socket.emit('join-room', { roomId: room.id, playerName: playerName.trim() }, (res: { success: boolean; player?: Player; message?: string }) => {
      setIsLoading(false);
      setJoiningRoom(null);
      if (res.success && res.player) {
        onRoomJoined(res.player, room.type);
      }
    });
  };

  return (
    <div className="container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.5rem', margin: '0 auto', position: 'relative', paddingBottom: '4rem' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Logo size={40} />
        <h1 className="responsive-title" style={{ fontWeight: 950, margin: 0, color: 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word', fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
          Fun Arcade
        </h1>
      </div>

      {/* Main Two-Column Layout */}
      <div className="dashboard-layout">

        {/* Left Column: Games + Public Lobbies */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Games Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
                <Gamepad2 size={28} color="var(--accent)" /> Games
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', opacity: 0.8, fontSize: '0.85rem', fontWeight: 600 }}>
                <Trophy size={16} />
                <span>Leaderboard scores are preserved across all games</span>
              </div>
            </div>

            {/* Public Lobbies Section (MOVED HERE) */}
            {publicRooms.length > 0 && (
              <div className="card animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Globe size={22} color="var(--text-secondary)" />
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: 'var(--text-primary)' }}>Active Lobbies</h3>
                  </div>
                  <div style={{ padding: '0.35rem 0.8rem', background: 'var(--accent)', color: 'white', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, boxShadow: 'var(--card-shadow)' }}>
                    {publicRooms.length} LIVE
                  </div>
                </div>

                {/* Name input to quick-join */}
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Enter your name to join..."
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    maxLength={15}
                    style={{ fontSize: '1rem', padding: '0.9rem 1.1rem', width: '100%', boxSizing: 'border-box', background: 'var(--card-bg)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {publicRooms.map(room => {
                    const meta = GAME_META[room.type] ?? GAME_META['bingo'];
                    return (
                      <div key={room.id} className="lobby-item" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
                        background: 'var(--card-bg)',
                        borderRadius: '16px', border: '1px solid var(--item-border)',
                        transition: 'all 0.2s ease',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `${meta.color}18`, color: meta.color,
                            border: `1px solid ${meta.color}30`,
                          }}>
                            {meta.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 950, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{room.hostName}'s Room</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px', fontWeight: 700 }}>
                              <span style={{ color: meta.color, fontWeight: 900 }}>{meta.label}</span>
                              <div style={{ width: '3px', height: '3px', background: 'var(--text-secondary)', opacity: 0.3, borderRadius: '50%' }} />
                              <Users size={12} /> {room.playerCount} waiting · <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{room.id}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleJoinPublic(room)}
                          disabled={isLoading || !playerName.trim()}
                          style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', height: 'auto', borderRadius: '12px', whiteSpace: 'nowrap', opacity: !playerName.trim() ? 0.4 : 1 }}
                        >
                          {joiningRoom === room.id ? '...' : 'Join'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="game-cards-grid">
              {[
                { type: 'bingo' as const, players: 'Multiplayer', color: '#10b981', icon: <Gamepad2 size={32} color="#10b981" />, title: 'BINGO', desc: 'Classic Bingo with a competitive twist. Complete 5 lines to win!' },
                { type: 'typeracer' as const, players: 'Single/Multiplayer', color: '#3b82f6', icon: <Timer size={32} color="#3b82f6" />, title: 'TYPE RACER', desc: 'Speed typing test. Complete the paragraph first without errors.' },
                { type: 'chess' as const, players: '2 Player', color: '#8b5cf6', icon: <span style={{ fontSize: '2rem', color: '#8b5cf6' }}>♘</span>, title: 'CHESS', desc: 'Classic game of strategy in full 3D. Checkmate your opponent!' },
                { type: 'quiz' as const, players: 'Single/Multiplayer', color: '#ec4899', icon: <HelpCircle size={32} color="#ec4899" />, title: 'TECH QUIZ', desc: 'Test your tech knowledge in this fast-paced trivia game!' },
                { type: 'cssbattle' as const, players: 'Single Player', color: '#f43f5e', icon: <Paintbrush size={32} color="#f43f5e" />, title: 'CSS BATTLE', desc: 'Code HTML & CSS to match target shapes. Beat the clock and get 100% match!' },
                { type: 'flappy' as const, players: 'Single Player', color: '#fbbf24', icon: <Zap size={32} color="#fbbf24" />, title: 'FLAPPY BIRD', desc: 'Navigate the bird through pipes. Beat your high score in this fly-high challenge!' },
                { type: 'sudoku' as const, players: 'Single Player', color: '#22d3ee', icon: <Grid3X3 size={32} color="#22d3ee" />, title: 'SUDOKU', desc: 'Classic 9x9 puzzle. Saves your progress so you can resume anytime!' },
                { type: 'kakuro' as const, players: 'Single/Multiplayer', color: '#a78bfa', icon: <Brain size={32} color="#a78bfa" />, title: 'KAKURO', desc: 'Challenging number crossword puzzle. Solve single player or race in multiplayer!' },
                { type: 'sixteencoins' as const, players: '2 Player', color: '#6366f1', icon: <Sword size={32} color="#6366f1" />, title: '16 COINS', desc: 'Classic strategy board game in stunning 3D. Capture all opponent coins to win!' },
                { type: 'gridorder' as const, players: 'Single/Multiplayer', color: '#f59e0b', icon: <LayoutGrid size={32} color="#f59e0b" />, title: 'GRID ORDER', desc: 'Shuffle the numbers into the right order. Race against others or beat your own best time!' },
                { type: 'memory' as const, players: 'Single/Multiplayer', color: '#ec4899', icon: <Lightbulb size={32} color="#ec4899" />, title: 'REMEMBER ME', desc: 'Test your memory! Match all pairs of cards as fast as you can. Solve single player or race in multiplayer!' },
              ].map(({ type, players, color, icon, title, desc }) => (
                <div
                  key={type}
                  onClick={() => onSelectGame(type)}
                  className="card game-card-hover"
                  style={{ width: '100%', minHeight: '320px', cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                >
                  {/* Player Type Badge */}
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.7rem', fontWeight: 900, color, background: `${color}12`, padding: '0.3rem 0.7rem', borderRadius: '20px', border: `1px solid ${color}33`, letterSpacing: '0.05em' }}>
                    {players}
                  </div>
                  <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {icon}
                  </div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 900 }}>{title}</h2>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: 600 }}>{desc}</p>
                  <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color, fontWeight: 900 }}>
                    PLAY NOW →
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Information */}
        <div className="dashboard-sidebar">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 900 }}>
            <Globe size={28} color="var(--success)" /> Information
          </h2>
          <NewsTile 
            title="Latest Tech News"
            desc="Stay up-to-date with curated news about latest tech trends."
            icon={<Zap size={24} color="var(--success)" />}
            color="var(--success)"
            linkText="READ TECH NEWS →"
            onClick={() => onSelectNews?.(
              'Latest tech news', 
              'Tech Industry Updates', 
              'Curated global updates. Use the search below to track latest tech trends.'
            )} 
          />
          <NewsTile 
            title="Global & India News"
            desc="Breaking stories and headlines from across the globe and the Indian subcontinent."
            icon={<Globe size={24} color="var(--accent)" />}
            color="var(--accent)"
            linkText="READ GLOBAL NEWS →"
            onClick={() => onSelectNews?.(
              'Latest International and Indian News', 
              'Global & India Headlines',
              'Stay informed with the latest happenings across international borders and from every corner of India.'
            )} 
          />
          <GlobalLeadersTile leaderboards={leaderboards} />
        </div>

      </div>

    </div>
  );
};
