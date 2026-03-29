import React, { useState } from 'react';
import { Gamepad2, Timer, Sparkles, Trophy, Globe, Users, Zap, Brain, Paintbrush, Grid3X3, Sword } from 'lucide-react';
import { socket } from '../socket';
import type { Player, PublicRoom } from '../types';

interface DashboardProps {
  onSelectGame: (type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins') => void;
  onRoomJoined: (me: Player, gameType: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins') => void;
  publicRooms: PublicRoom[];
  onSelectNews?: () => void;
}

const GAME_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  bingo: { color: '#10b981', label: 'BINGO', icon: <Gamepad2 size={13} /> },
  typeracer: { color: '#3b82f6', label: 'TYPE RACER', icon: <Timer size={13} /> },
  chess: { color: '#8b5cf6', label: 'CHESS', icon: <span style={{ fontSize: '0.85rem' }}>♘</span> },
  flappy: { color: '#fbbf24', label: 'FLAPPY', icon: <Zap size={13} /> },
  quiz: { color: '#ec4899', label: 'TECH QUIZ', icon: <Brain size={13} /> },
  cssbattle: { color: '#f43f5e', label: 'CSS BATTLE', icon: <Paintbrush size={13} /> },
  sudoku: { color: '#22d3ee', label: 'SUDOKU', icon: <Grid3X3 size={13} /> },
  sixteencoins: { color: '#6366f1', label: '16 COINS', icon: <Sword size={13} /> },
};

const TechNewsTile: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div
    className="card"
    onClick={onClick}
    style={{
      padding: '2.5rem', height: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column',
      borderColor: 'var(--success-glow)', cursor: 'pointer', background: 'var(--card-bg)',
      transition: 'all 0.3s ease', border: '1px solid var(--item-border)'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; e.currentTarget.style.borderColor = 'var(--success)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.borderColor = 'var(--item-border)'; }}
  >
    <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--success-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
      <Globe size={32} color="var(--success)" />
    </div>
    <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 900 }}>Latest Tech News</h2>
    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', fontWeight: 600 }}>
      Stay up-to-date with curated news about software, QA, and global tech trends.
    </p>
    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', fontSize: '0.9rem', color: 'var(--success)', fontWeight: 900 }}>
      READ LATEST NEWS →
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onSelectGame, onRoomJoined, publicRooms, onSelectNews }) => {
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
    <div className="container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.5rem', margin: '0 auto', position: 'relative' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h1 className="responsive-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontWeight: 950, marginBottom: '1rem' }}>
          <Sparkles size={50} color="var(--accent)" />
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
              <div className="card animate-fade-in" style={{ padding: '2rem', borderColor: 'var(--item-border)', background: 'var(--card-bg)' }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {publicRooms.map(room => {
                    const meta = GAME_META[room.type] ?? GAME_META['bingo'];
                    return (
                      <div key={room.id} className="lobby-item" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
                        padding: '1.25rem', background: 'var(--card-bg)',
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
                { type: 'typeracer' as const, players: 'Multiplayer', color: '#3b82f6', icon: <Timer size={32} color="#3b82f6" />, title: 'TYPE RACER', desc: 'Speed typing test. Complete the paragraph first without errors.' },
                { type: 'chess' as const, players: '2 Player', color: '#8b5cf6', icon: <span style={{ fontSize: '2rem', color: '#8b5cf6' }}>♘</span>, title: 'CHESS', desc: 'Classic game of strategy in full 3D. Checkmate your opponent!' },
                { type: 'quiz' as const, players: 'Multiplayer', color: '#ec4899', icon: <Brain size={32} color="#ec4899" />, title: 'TECH QUIZ', desc: 'Test your tech knowledge in this fast-paced trivia game!' },
                { type: 'cssbattle' as const, players: 'Single Player', color: '#f43f5e', icon: <Paintbrush size={32} color="#f43f5e" />, title: 'CSS BATTLE', desc: 'Code HTML & CSS to match target shapes. Beat the clock and get 100% match!' },
                { type: 'flappy' as const, players: 'Single Player', color: '#fbbf24', icon: <Zap size={32} color="#fbbf24" />, title: 'FLAPPY BIRD', desc: 'Navigate the bird through pipes. Beat your high score in this fly-high challenge!' },
                { type: 'sudoku' as const, players: 'Single Player', color: '#22d3ee', icon: <Grid3X3 size={32} color="#22d3ee" />, title: 'SUDOKU', desc: 'Classic 9x9 puzzle. Saves your progress so you can resume anytime!' },
                { type: 'sixteencoins' as const, players: '2 Player', color: '#6366f1', icon: <Sword size={32} color="#6366f1" />, title: '16 COINS', desc: 'Classic strategy board game in stunning 3D. Capture all opponent coins to win!' },
              ].map(({ type, players, color, icon, title, desc }) => (
                <div
                  key={type}
                  onClick={() => onSelectGame(type)}
                  className="card"
                  style={{ width: '100%', minHeight: '320px', padding: '2.5rem', cursor: 'pointer', transition: 'all 0.3s ease', border: '2px solid transparent', position: 'relative', overflow: 'hidden' }}
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
          <TechNewsTile onClick={onSelectNews} />
        </div>

      </div>

    </div>
  );
};
