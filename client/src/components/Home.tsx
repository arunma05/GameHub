import React, { useState } from 'react';
import { socket } from '../socket';
import type { Player, PublicRoom } from '../types';
import { Sparkles, Users, Trophy, Timer, Globe, Lock, Unlock, Zap, Brain, Paintbrush, Grid3X3, Sword, RefreshCw } from 'lucide-react';

interface HomeProps {
  onRoomJoined: (me: Player) => void;
  leaderboards: { 
    bingo: Record<string, number>; 
    typeracer: Record<string, number>; 
    chess: Record<string, number>;
    quiz: Record<string, number>;
    flappy: { name: string; score: number }[];
    cssbattle: { name: string; score: number; time: number }[];
    sudoku: Record<string, number>;
    kakuro: Record<string, number>;
    sixteencoins: Record<string, number>;
    crossword: Record<string, number>;
  };
  selectedGame: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'crossword' | null;
  publicRooms: PublicRoom[];
}

export const Home: React.FC<HomeProps> = ({ onRoomJoined, leaderboards, selectedGame, publicRooms }) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [quizAmount, setQuizAmount] = useState(10);


  const handleCreateRoom = (isPublic: boolean) => {
    if (!name.trim()) return setError('Please enter your name');
    setIsLoading(true);
    socket.emit('create-room', { playerName: name, type: selectedGame || 'bingo', isPublic, quizAmount }, (response: { success: boolean; player?: Player; message?: string }) => {
      if (response.success && response.player) {
        onRoomJoined(response.player);
      } else {
        setIsLoading(false);
        setError(response.message || 'Failed to create room');
      }
    });
  };

  const handleJoinByCode = (code: string) => {
    if (!name.trim()) return setError('Please enter your name');
    const targetCode = code || roomCode;
    if (!targetCode.trim()) return setError('Please enter a room code');

    setIsLoading(true);
    socket.emit('join-room', { roomId: targetCode, playerName: name }, (response: { success: boolean; player?: Player; message?: string }) => {
      if (response.success && response.player) {
        onRoomJoined(response.player);
      } else {
        setIsLoading(false);
        setError(response.message || 'Failed to join room');
      }
    });
  };

  const filteredRooms = selectedGame
    ? publicRooms.filter((r: PublicRoom) => r.type === selectedGame)
    : publicRooms;


  const currentLeaderboard = selectedGame ? leaderboards[selectedGame] : {};
  let topPlayers: [string, any][] = [];

  if (Array.isArray(currentLeaderboard)) {
    // Array of objects (flappy, cssbattle)
    if (selectedGame === 'cssbattle') {
       topPlayers = (currentLeaderboard as any[])
         .sort((a, b) => a.time - b.time)
         .slice(0, 5)
         .map(item => [item.name, item.time]);
    } else {
       topPlayers = (currentLeaderboard as any[])
         .sort((a, b) => b.score - a.score)
         .slice(0, 5)
         .map(item => [item.name, item.score]);
    }
  } else {
    // Record<string, number> (sudoku, crossword, etc)
    const entries = Object.entries(currentLeaderboard);
    if (selectedGame === 'crossword') {
      topPlayers = entries.sort(([, a], [, b]) => (a as number) - (b as number)).slice(0, 5);
    } else {
      topPlayers = entries.sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5);
    }
  }

  return (
    <div className="container responsive-flex" style={{ alignItems: 'flex-start', gap: '3rem', padding: '4rem 2rem', flexWrap: 'wrap', justifyContent: 'center' }}>

      {/* Left Column: Create / Join Action */}
      <div className="card animate-fade-in responsive-card-width" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '3rem' }}>

        <button
          onClick={() => window.location.reload()}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content', padding: 0 }}
        >
          ← Back to Dashboard
        </button>



        <div style={{ textAlign: 'center' }}>
          <h1 className="responsive-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem', fontWeight: 900 }}>
            {selectedGame === 'typeracer' ? <Timer size={48} color="#60a5fa" /> : 
             selectedGame === 'chess' ? <span style={{ fontSize: '3rem', color: '#8b5cf6' }}>♘</span> : 
             selectedGame === 'flappy' ? <Zap size={48} color="#fbbf24" /> :
             selectedGame === 'quiz' ? <Brain size={48} color="#ec4899" /> :
             selectedGame === 'cssbattle' ? <Paintbrush size={48} color="#f43f5e" /> :
             selectedGame === 'sudoku' ? <Grid3X3 size={48} color="#22d3ee" /> :
             selectedGame === 'sixteencoins' ? <Sword size={48} color="#6366f1" /> :
             selectedGame === 'kakuro' ? <Brain size={48} color="#a78bfa" /> :
             selectedGame === 'crossword' ? <RefreshCw size={48} color="#fb7185" /> :
             <Sparkles size={48} color="#60a5fa" />}
            {selectedGame === 'typeracer' ? 'Type Racer' : 
             selectedGame === 'chess' ? 'Chess' : 
             selectedGame === 'flappy' ? 'Flappy Bird' :
             selectedGame === 'quiz' ? 'Tech Quiz' :
             selectedGame === 'cssbattle' ? 'CSS Battle' :
             selectedGame === 'sudoku' ? 'Sudoku' :
             selectedGame === 'sixteencoins' ? '16 Coins' :
             selectedGame === 'kakuro' ? 'Kakuro' :
             selectedGame === 'crossword' ? 'Cross-Tech' :
             'BINGO'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {selectedGame === 'typeracer' ? 'Speed typing arena' : 
             selectedGame === 'chess' ? 'Classic 3D Strategy' : 
             selectedGame === 'flappy' ? 'High-flying arcade challenge' :
             selectedGame === 'quiz' ? 'Test your tech knowledge' :
             selectedGame === 'cssbattle' ? 'Replicate shapes using HTML & CSS' :
             selectedGame === 'sudoku' ? 'Classic 9x9 puzzle' :
             selectedGame === 'sixteencoins' ? 'Capture pieces in this strategy classic' :
             selectedGame === 'kakuro' ? 'Challenging number crossword puzzle' :
             selectedGame === 'crossword' ? 'The ultimate tech industry crossword' :
             'Real-time multiplayer bingo experience'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--error-glow)', color: 'var(--error)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--error)', textAlign: 'center', fontWeight: 900 }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="input-label" style={{ fontSize: '0.9rem' }}>YOUR PLAYER NAME</label>
          <input
            className="input-field"
            type="text"
            placeholder="e.g. Player One"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={15}
            style={{ fontSize: '1.2rem', padding: '1.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedGame === 'quiz' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.8rem' }}>NUMBER OF QUESTIONS</label>
              <select 
                 className="input-field"
                 value={quizAmount} 
                 onChange={e => setQuizAmount(parseInt(e.target.value))}
                 style={{ width: '100%', fontSize: '1rem', padding: '0.8rem', background: 'var(--item-bg)', color: 'var(--text-primary)', border: '1px solid var(--item-border)' }}
              >
                 <option value={10} style={{ background: 'var(--card-bg)' }}>10 Questions</option>
                 <option value={25} style={{ background: 'var(--card-bg)' }}>25 Questions</option>
                 <option value={50} style={{ background: 'var(--card-bg)' }}>50 Questions</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => handleCreateRoom(true)}
              disabled={isLoading || !name.trim()}
              style={{ height: '64px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Unlock size={14} /> PUBLIC</div>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500 }}>Others can join</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => handleCreateRoom(false)}
              disabled={isLoading || !name.trim()}
              style={{ height: '64px', fontSize: '1rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={14} /> PRIVATE</div>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500 }}>Code only</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--item-border)' }}></div>
            <span style={{ padding: '0 1.5rem', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.1em' }}>OR JOIN BY CODE</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--item-border)' }}></div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <input
              className="input-field"
              type="text"
              placeholder="ENTER ROOM CODE"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              style={{ textAlign: 'center', letterSpacing: '0.3rem', textTransform: 'uppercase', width: '100%', fontSize: '1.4rem', fontWeight: 900, height: '64px' }}
              maxLength={5}
            />
          </div>

          <button
            className="btn btn-outline btn-lg"
            onClick={() => handleJoinByCode(roomCode)}
            disabled={isLoading || !roomCode}
            style={{ width: '100%', height: '60px', fontWeight: 800 }}
          >
            <Users size={20} /> Join with Code
          </button>
        </div>

        <button
          className="btn btn-link"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          style={{
            marginTop: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 800
          }}
        >
          <Trophy size={18} />
          {showLeaderboard ? 'Hide Hall of Fame' : 'View Hall of Fame'}
        </button>
      </div>

      {/* Right Column: Public Lobbies & Leaderboard */}
      <div className="responsive-card-width" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Open Lobbies Section */}
        <div className="card animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderColor: 'var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Globe size={24} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Public Lobbies</h3>
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--success-glow)', color: 'var(--success)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, border: '1px solid var(--success)' }}>
              {filteredRooms.length} ACTIVE
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <input
              className="input-field"
              type="text"
              placeholder="Enter your name to join a room..."
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              maxLength={15}
              style={{ fontSize: '1rem', padding: '0.9rem 1.1rem', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {filteredRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--item-bg)', borderRadius: '16px', border: '1px dashed var(--item-border)' }}>
                <Users size={32} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, opacity: 0.6 }}>No public rooms available.<br />Be the first to create one!</p>
              </div>
            ) : (
              filteredRooms.map((room: PublicRoom) => (
                <div key={room.id} className="lobby-item" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1.25rem', background: 'var(--item-bg)', borderRadius: '16px',
                  border: '1px solid var(--item-border)', transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{room.hostName}'s Room</span>
                      <div style={{ width: '4px', height: '4px', background: 'var(--text-secondary)', opacity: 0.3, borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>{room.id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                      <Users size={14} />
                      {room.playerCount} Players waiting
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleJoinByCode(room.id)}
                    disabled={isLoading}
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', height: 'auto', borderRadius: '12px' }}
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leaderboard Section */}
        {showLeaderboard && topPlayers.length > 0 && (
          <div className="card animate-fade-in" style={{ padding: '2rem', border: '1px solid var(--accent)', background: 'var(--item-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Trophy color="#fbbf24" size={24} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedGame === 'typeracer' ? 'Racer Hall of Fame' : 
                 selectedGame === 'chess' ? 'Chess Grandmasters' : 
                 selectedGame === 'flappy' ? 'Top Flyers' :
                 selectedGame === 'quiz' ? 'Quiz Brainiacs' :
                 selectedGame === 'cssbattle' ? 'CSS Masters' :
                 selectedGame === 'sudoku' ? 'Sudoku Masters' :
                 selectedGame === 'sixteencoins' ? 'Board Tacticians' :
                 selectedGame === 'kakuro' ? 'Kakuro Brainiacs' :
                 selectedGame === 'crossword' ? 'Tech Gurus' :
                 'Bingo Champions'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topPlayers.map(([pName, wins], index) => (
                <div key={pName} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px',
                  border: '1px solid var(--item-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? '#fbbf24' : 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: index === 0 ? '#000' : 'var(--text-primary)'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pName}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 800 }}>
                    {wins} {wins === 1 ? 'Win' : 'Wins'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .lobby-item:hover {
          background: var(--accent-glow) !important;
          border-color: var(--accent) !important;
          transform: translateY(-2px);
          box-shadow: var(--card-shadow);
        }
      `}</style>
    </div>
  );
};
