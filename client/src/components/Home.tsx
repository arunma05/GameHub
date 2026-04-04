import React, { useState } from 'react';
import { socket } from '../socket';
import type { Player, PublicRoom } from '../types';
import { Sparkles, Users, Trophy, Timer, Globe, Lock, Unlock, Zap, Brain, Paintbrush, Grid3X3, Sword, LayoutGrid, HelpCircle } from 'lucide-react';
import { TRIVIA_TOPICS } from '../constants/TriviaTopics';

interface HomeProps {
  onRoomJoined: (me: Player) => void;
  leaderboards: { 
    bingo: Record<string, number>; 
    typeracer: { name: string; wpm: number }[]; 
    chess: Record<string, number>;
    quiz: Record<string, number>;
    flappy: { name: string; score: number }[];
    cssbattle: Record<number, { name: string; time: number }[]>;
    sudoku: Record<string, number>;
    kakuro: Record<string, number>;
    sixteencoins: Record<string, number>;
    gridorder: Record<number, { 
      bestTimes: { name: string; time: number }[]; 
      bestMoves: { name: string; moves: number }[]; 
    }>;
    memory: Record<number, { name: string; time: number }[]>;
    jumprace: Record<string, number>;
  };
  selectedGame: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'jumprace' | null;
  publicRooms: PublicRoom[];
  memoryLevel: number;
  onMemoryLevelChange: (level: number) => void;
  kakuroLevel: number | 'All';
  onKakuroLevelChange: (level: number | 'All') => void;
  playerName?: string;
}

export const Home: React.FC<HomeProps> = ({ 
  onRoomJoined, 
  leaderboards, 
  selectedGame, 
  publicRooms, 
  memoryLevel, 
  onMemoryLevelChange,
  kakuroLevel,
  onKakuroLevelChange,
  playerName
}) => {
  const [name] = useState(playerName || '');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [quizAmount, setQuizAmount] = useState(10);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [gridSize, setGridSize] = useState(3);


  const handleCreateRoom = (isPublic: boolean) => {
    if (!name.trim()) return setError('Please enter your name');
    setIsLoading(true);
    const selectedTopic = TRIVIA_TOPICS[selectedTopicIdx];
    socket.emit('create-room', { 
      playerName: name, 
      type: selectedGame || 'bingo', 
      isPublic, 
      quizAmount, 
      quizCategory: selectedTopic.category,
      quizDifficulty: selectedTopic.difficulty,
      gridSize, 
      memoryLevel,
      kakuroLevel 
    }, (response: { success: boolean; player?: Player; message?: string }) => {
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


  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderLeaderboardRows = () => {
    if (!selectedGame || !leaderboards) return null;
    const data = leaderboards[selectedGame];
    if (!data) return null;

    if (selectedGame === 'typeracer') {
      const top = [...(data as { name: string; wpm: number }[])].sort((a,b) => b.wpm - a.wpm).slice(0, 10);
      if (top.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
      return top.map((item, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ width: '24px', opacity: 0.5, fontWeight: 800 }}>#{index+1}</span>
            <span style={{ fontWeight: 600 }}>{item.name}</span>
          </div>
          <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{item.wpm} WPM</span>
        </div>
      ));
    }

    if (selectedGame === 'cssbattle') {
        // Safety: older db might have array for cssbattle or different structure
        if (typeof data !== 'object' || Array.isArray(data)) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        
        const battleData = data as Record<number, { name: string; time: number }[]>;
        const entries = Object.entries(battleData).filter(([_, rec]) => Array.isArray(rec));
        
        if (entries.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        return entries.map(([lvlId, records]) => (
            <div key={lvlId} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level {lvlId}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {records.slice(0, 3).map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--item-border)', fontSize: '0.9rem' }}>
                           <span style={{ fontWeight: 600 }}>{r.name}</span>
                           <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{formatTime(r.time)}</span>
                        </div>
                    ))}
                </div>
            </div>
        ));
    }

    if (selectedGame === 'gridorder') {
        // Safety for type transition
        if (typeof data !== 'object' || Array.isArray(data)) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;

        const gridData = data as Record<number, { bestTimes: any[]; bestMoves: any[] }>;
        const entries = Object.entries(gridData).filter(([_, rec]) => rec && typeof rec === 'object' && ('bestTimes' in rec || 'bestMoves' in rec));
        
        if (entries.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        return entries.map(([size, record]) => (
            <div key={size} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '16px', border: '1px solid var(--item-border)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>{size}x{size} CHALLENGE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>BEST TIMES</div>
                        {Array.isArray(record.bestTimes) && record.bestTimes.length > 0 ? record.bestTimes.slice(0, 3).map((r, i) => (
                            <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                {i+1}. {r.name} - <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{formatTime(r.time)}</span>
                            </div>
                        )) : <div style={{ fontSize: '0.75rem', opacity: 0.3 }}>N/A</div>}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>FEWEST MOVES</div>
                        {Array.isArray(record.bestMoves) && record.bestMoves.length > 0 ? record.bestMoves.slice(0, 3).map((r, i) => (
                            <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                {i+1}. {r.name} - <span style={{ color: '#10b981', fontWeight: 800 }}>{r.moves}</span>
                            </div>
                        )) : <div style={{ fontSize: '0.75rem', opacity: 0.3 }}>N/A</div>}
                    </div>
                </div>
            </div>
        ));
    }

    if (selectedGame === 'memory') {
        if (typeof data !== 'object' || Array.isArray(data)) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        const memoryData = data as Record<number, { name: string; time: number }[]>;
        const entries = Object.entries(memoryData).filter(([_, rec]) => Array.isArray(rec));
        if (entries.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        return entries.map(([lvl, records]) => (
            <div key={lvl} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level {lvl} Cards</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {records.slice(0, 3).map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--item-border)', fontSize: '0.9rem' }}>
                           <span style={{ fontWeight: 600 }}>{r.name}</span>
                           <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{formatTime(r.time)}</span>
                        </div>
                    ))}
                </div>
            </div>
        ));
    }

    if (selectedGame === 'flappy') {
        const flappy = [...(data as { name: string; score: number }[])].sort((a,b) => b.score - a.score).slice(0, 10);
        if (flappy.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No records yet</div>;
        return flappy.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
            <span style={{ fontWeight: 600 }}>{item.name}</span>
            <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{item.score} <small style={{fontSize: '0.6rem', opacity: 0.6}}>KM</small></span>
          </div>
        ));
    }

    // Default Win Records
    const entries = Object.entries(data as Record<string, number>).sort(([, a], [, b]) => b - a).slice(0, 10);
    if (entries.length === 0) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>No wins yet</div>;
    return entries.map(([pName, wins], index) => (
      <div key={pName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--item-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? '#fbbf24' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: index === 0 ? '#000' : 'var(--text-primary)' }}>{index + 1}</span>
          <span style={{ fontWeight: 600 }}>{pName}</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 800 }}>{wins} {wins === 1 ? 'Win' : 'Wins'}</div>
      </div>
    ));
  };

  return (
    <div className="container responsive-flex" style={{ alignItems: 'flex-start', gap: '3rem', padding: '4rem 2rem', flexWrap: 'wrap', justifyContent: 'center' }}>

      {/* Left Column: Create / Join Action */}
      <div className="card animate-fade-in responsive-card-width" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '3rem' }}>




        <div style={{ textAlign: 'center' }}>
          <h1 className="responsive-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem', fontWeight: 900 }}>
            {selectedGame === 'typeracer' ? <Timer size={48} color="#60a5fa" /> : 
             selectedGame === 'chess' ? <span style={{ fontSize: '3rem', color: '#8b5cf6' }}>♘</span> : 
             selectedGame === 'flappy' ? <Zap size={48} color="#fbbf24" /> :
             selectedGame === 'quiz' ? <HelpCircle size={48} color="#ec4899" /> :
             selectedGame === 'cssbattle' ? <Paintbrush size={48} color="#f43f5e" /> :
             selectedGame === 'sudoku' ? <Grid3X3 size={48} color="#22d3ee" /> :
             selectedGame === 'sixteencoins' ? <Sword size={48} color="#6366f1" /> :
             selectedGame === 'kakuro' ? <Brain size={48} color="#a78bfa" /> :
             selectedGame === 'gridorder' ? <LayoutGrid size={48} color="#f59e0b" /> :
             selectedGame === 'memory' ? <Brain size={48} color="#ec4899" /> :
             selectedGame === 'jumprace' ? <Sword size={48} color="#10b981" /> :
             <Sparkles size={48} color="#60a5fa" />}
            {selectedGame === 'typeracer' ? 'Type Racer' : 
             selectedGame === 'chess' ? 'Chess' : 
             selectedGame === 'flappy' ? 'Flappy Bird' :
             selectedGame === 'quiz' ? 'Trivia' :
             selectedGame === 'cssbattle' ? 'CSS Battle' :
             selectedGame === 'sudoku' ? 'Sudoku' :
             selectedGame === 'sixteencoins' ? '16 Coins' :
             selectedGame === 'kakuro' ? 'Kakuro' :
             selectedGame === 'gridorder' ? 'Grid Order' :
             selectedGame === 'memory' ? 'Remember Me' :
             selectedGame === 'jumprace' ? 'Jump Race' :
             'BINGO'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {selectedGame === 'typeracer' ? 'Speed typing arena' : 
             selectedGame === 'chess' ? 'Classic 3D Strategy' : 
             selectedGame === 'flappy' ? 'High-flying arcade challenge' :
             selectedGame === 'quiz' ? 'Test your knowledge across 50+ topics' :
             selectedGame === 'cssbattle' ? 'Replicate shapes using HTML & CSS' :
             selectedGame === 'sudoku' ? 'Classic 9x9 puzzle' :
             selectedGame === 'sixteencoins' ? 'Capture pieces in this strategy classic' :
             selectedGame === 'kakuro' ? 'Challenging number crossword puzzle' :
             selectedGame === 'gridorder' ? 'Shuffle the numbers into the right order' :
             selectedGame === 'memory' ? 'Test your memory and race to match cards' :
             selectedGame === 'jumprace' ? 'Race your pieces to the opposite corner' :
             'Real-time multiplayer bingo experience'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--error-glow)', color: 'var(--error)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--error)', textAlign: 'center', fontWeight: 900 }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="input-label" style={{ fontSize: '0.9rem' }}>PLAYING AS</label>
          <div style={{ 
            fontSize: '1.2rem', 
            padding: '1.25rem', 
            background: 'var(--item-bg)', 
            borderRadius: '16px', 
            border: '1px solid var(--accent)', 
            color: 'var(--accent)',
            fontWeight: 800,
            textAlign: 'center'
          }}>
            {name}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {selectedGame === 'gridorder' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.8rem' }}>SELECT GRID SIZE</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {[3, 4, 5, 6, 7].map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`btn ${gridSize === size ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.5rem', fontSize: '0.9rem', height: '40px' }}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedGame === 'memory' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.8rem' }}>SELECT NUMBER OF CARDS</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {[6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(level => (
                  <button
                    key={level}
                    onClick={() => onMemoryLevelChange(level)}
                    className={`btn ${memoryLevel === level ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.5rem', fontSize: '0.9rem', height: '40px' }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedGame === 'kakuro' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.8rem' }}>SELECT DIFFICULTY</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <button
                    key={level}
                    onClick={() => onKakuroLevelChange(level)}
                    className={`btn ${kakuroLevel === level ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.5rem', fontSize: '0.9rem', height: '40px' }}
                  >
                    L{level}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onKakuroLevelChange('All')}
                className={`btn ${kakuroLevel === 'All' ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.9rem', height: '40px' }}
              >
                Random Challenges (All Levels)
              </button>
            </div>
          )}
          {selectedGame === 'quiz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '0.5rem' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.8rem' }}>SELECT TOPIC</label>
                <select 
                  className="input-field"
                  value={selectedTopicIdx} 
                  onChange={e => setSelectedTopicIdx(parseInt(e.target.value))}
                  style={{ width: '100%', fontSize: '0.95rem', padding: '1rem', background: 'var(--item-bg)', color: 'var(--text-primary)', border: '1px solid var(--item-border)', borderRadius: '14px' }}
                >
                  {TRIVIA_TOPICS.map((t, idx) => (
                    <option key={idx} value={idx} style={{ background: 'var(--card-bg)' }}>
                      {t.tech ? '🚀 ' : '📚 '}{t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label" style={{ fontSize: '0.8rem' }}>QUESTIONS</label>
                <select 
                  className="input-field"
                  value={quizAmount} 
                  onChange={e => setQuizAmount(parseInt(e.target.value))}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.8rem', background: 'var(--item-bg)', color: 'var(--text-primary)', border: '1px solid var(--item-border)', borderRadius: '14px' }}
                >
                  <option value={10} style={{ background: 'var(--card-bg)' }}>10 Questions</option>
                  <option value={25} style={{ background: 'var(--card-bg)' }}>25 Questions</option>
                  <option value={50} style={{ background: 'var(--card-bg)' }}>50 Questions</option>
                </select>
              </div>
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

          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--item-border)' }}></div>
            <span style={{ padding: '0 1.5rem', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.1em' }}>OR JOIN BY CODE</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--item-border)' }}></div>
          </div>

          <div className="input-group" style={{ marginBottom: '1rem' }}>
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
        {showLeaderboard && (
          <div className="card animate-fade-in" style={{ padding: '2rem', border: '1px solid var(--accent)', background: 'var(--item-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Trophy color="#fbbf24" size={24} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedGame === 'typeracer' ? 'Top WPM Records' : 
                 selectedGame === 'chess' ? 'Chess Grandmasters' : 
                 selectedGame === 'flappy' ? 'Top Flyers' :
                 selectedGame === 'quiz' ? 'Quiz Brainiacs' :
                 selectedGame === 'cssbattle' ? 'CSS Masters (By Level)' :
                 selectedGame === 'sudoku' ? 'Sudoku Masters' :
                 selectedGame === 'sixteencoins' ? 'Board Tacticians' :
                 selectedGame === 'kakuro' ? 'Kakuro Brainiacs' :
                 selectedGame === 'gridorder' ? 'Grid Overlords (By Size)' :
                 'Bingo Champions'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {renderLeaderboardRows()}
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
