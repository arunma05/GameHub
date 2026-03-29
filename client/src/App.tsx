import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import type { GameState, Room, PublicRoom } from './types';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { Dashboard } from './components/Dashboard';
import { Racer } from './components/Racer';
import Chess from './components/Chess';
import Flappy from './components/Flappy';
import { Quiz } from './components/Quiz';
import { CssBattle } from './components/CssBattle';
import { Sudoku } from './components/Sudoku';
import { SixteenCoins } from './components/SixteenCoins';
import { Kakuro } from './components/Kakuro';
import { NewsView } from './components/NewsView';

export const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'home' | 'lobby' | 'game' | 'flappy' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'news'>('dashboard');
  const [selectedGame, setSelectedGame] = useState<'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [newsQuery, setNewsQuery] = useState('Latest tech news');
  const [newsTitle, setNewsTitle] = useState('Tech Industry Updates');
  const [newsSubtitle, setNewsSubtitle] = useState('Stay updated with fresh industry insights.');

  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.title = "Fun Arcade";
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const [gameState, setGameState] = useState<GameState>({
    room: null,
    me: null,
    leaderboards: { bingo: {}, typeracer: {}, chess: {}, quiz: {}, sudoku: {}, kakuro: {}, sixteencoins: {},
      flappy: [], cssbattle: []
    },
    error: null,
  });

  useEffect(() => {
    // Single persistent listener — survives view transitions
    const onActiveRooms = (rooms: PublicRoom[]) => setPublicRooms(rooms);
    socket.on('active-rooms', onActiveRooms);
    socket.emit('get-active-rooms');
    socket.emit('get-leaderboards');

    const onRoomUpdated = (room: Room) => {
      setGameState(prev => ({ ...prev, room }));
    };

    const onGameStarted = (room: Room) => {
      setGameState(prev => {
        const meWithCard = room.players.find(p => p.id === prev.me?.id) || prev.me;
        return { ...prev, room, me: meWithCard };
      });
      setView('game');
    };

    const onNumberCalled = ({ room }: { room: Room }) => {
      setGameState(prev => ({ ...prev, room }));
    };

    const onGameOver = ({ room }: { room: Room }) => {
      setGameState(prev => ({ ...prev, room }));
    };

    const onLeaderboardUpdated = (lb: any) => {
      setGameState(prev => ({ ...prev, leaderboards: lb as GameState['leaderboards'] }));
    };

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-started', onGameStarted);
    socket.on('number-called', onNumberCalled);
    socket.on('game-over', onGameOver);
    socket.on('leaderboard-updated', onLeaderboardUpdated);

    return () => {
      socket.off('active-rooms', onActiveRooms);
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-started', onGameStarted);
      socket.off('number-called', onNumberCalled);
      socket.off('game-over', onGameOver);
      socket.off('leaderboard-updated', onLeaderboardUpdated);
    };
  }, []);

  const handleSelectGame = (type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro') => {
    setSelectedGame(type);
    setGameState(prev => ({ ...prev, room: null, me: null })); 
    if (type === 'flappy') setView('flappy');
    else if (type === 'cssbattle') setView('cssbattle');
    else if (type === 'sudoku') setView('sudoku');
    else if (type === 'sixteencoins') setView('sixteencoins');
    else if (type === 'kakuro') setView('home'); 
    else setView('home');
  };

  const handleRoomJoined = (me: GameState['me']) => {
    setGameState(prev => ({ ...prev, me }));
    setView('lobby');
  };

  const handleDashboardJoin = (me: GameState['me'], gameType: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro') => {
    setSelectedGame(gameType);
    setGameState(prev => ({ ...prev, me }));
    setView('lobby');
  };

  const renderView = () => {
    if (view === 'dashboard') {
      return <Dashboard 
        onSelectGame={handleSelectGame} 
        onRoomJoined={handleDashboardJoin} 
        publicRooms={publicRooms} 
        leaderboards={gameState.leaderboards}
        onSelectNews={(q: string, t: string, s: string) => {
          setNewsQuery(q);
          setNewsTitle(t);
          setNewsSubtitle(s);
          setView('news');
        }} 
      />;
    }

    if (view === 'news') {
      return <NewsView 
        onBack={() => setView('dashboard')} 
        query={newsQuery} 
        title={newsTitle} 
        subtitle={newsSubtitle} 
      />;
    }

    if (view === 'flappy') {
      return <Flappy room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.flappy} onRoomJoined={(me) => setGameState(prev => ({ ...prev, me }))} />;
    }

    if (view === 'cssbattle') {
      return <CssBattle room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.cssbattle} onBack={() => setView('dashboard')} />;
    }

    if (view === 'sudoku') {
      return <Sudoku leaderboard={gameState.leaderboards.sudoku} onBack={() => setView('dashboard')} />;
    }

    if (view === 'sixteencoins' && gameState.room && gameState.me) {
      return <SixteenCoins room={gameState.room} me={gameState.me} onBack={() => setView('dashboard')} />;
    }

    if (!gameState.room || !gameState.me) {
      return (
        <Home 
          onRoomJoined={handleRoomJoined} 
          leaderboards={gameState.leaderboards}
          selectedGame={selectedGame}
          publicRooms={publicRooms}
        />
      );
    }
    
    // TRANSITION LOGIC: If 'starting' or later, go to Game View.
    // If 'waiting', show Lobby.
    if (gameState.room.gameState === 'waiting') {
      return <Lobby room={gameState.room} me={gameState.me} />;
    }
    
    if (gameState.room.gameState === 'starting' || gameState.room.gameState === 'playing' || gameState.room.gameState === 'finished') {
      if (gameState.room.type === 'typeracer') {
        return <Racer room={gameState.room} me={gameState.me} />;
      } else if (gameState.room.type === 'chess') {
        return <Chess room={gameState.room} me={gameState.me} />;
      } else if (gameState.room.type === 'flappy') {
        return <Flappy room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.flappy} onRoomJoined={(me) => setGameState(prev => ({ ...prev, me }))} />;
      } else if (gameState.room.type === 'cssbattle') {
        return <CssBattle room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.cssbattle} onBack={() => setView('dashboard')} />;
      } else if (gameState.room.type === 'sudoku') {
        return <Sudoku leaderboard={gameState.leaderboards.sudoku} onBack={() => setView('dashboard')} />;
      } else if (gameState.room.type === 'sixteencoins') {
        return <SixteenCoins room={gameState.room} me={gameState.me} onBack={() => setView('dashboard')} />;
      } else if (gameState.room.type === 'quiz') {
        return <Quiz room={gameState.room} me={gameState.me} />;
      } else if (gameState.room.type === 'kakuro') {
        return <Kakuro room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.kakuro} onBack={() => setView('dashboard')} />;
      }
      return <Game room={gameState.room} me={gameState.me} />;
    }
    return null;
  };

  return (
    <>
      <button 
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
      {renderView()}
    </>
  );
};

export default App;
