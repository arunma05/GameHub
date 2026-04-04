import React, { useEffect, useState, lazy, Suspense } from 'react';
import { socket } from './socket';
import type { GameState, Room, PublicRoom, Player } from './types';
import { ArrowLeft, Sun, Moon, Settings, X } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Auth } from './components/Auth';
import { PolicyModal } from './components/PolicyModal';

// Lazy Load Components
const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const Lobby = lazy(() => import('./components/Lobby').then(m => ({ default: m.Lobby })));
const Game = lazy(() => import('./components/Game').then(m => ({ default: m.Game })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Racer = lazy(() => import('./components/Racer').then(m => ({ default: m.Racer })));
const Chess = lazy(() => import('./components/Chess'));
const Flappy = lazy(() => import('./components/Flappy'));
const Quiz = lazy(() => import('./components/Quiz').then(m => ({ default: m.Quiz })));
const CssBattle = lazy(() => import('./components/CssBattle').then(m => ({ default: m.CssBattle })));
const Sudoku = lazy(() => import('./components/Sudoku').then(m => ({ default: m.Sudoku })));
const SixteenCoins = lazy(() => import('./components/SixteenCoins').then(m => ({ default: m.SixteenCoins })));
const Kakuro = lazy(() => import('./components/Kakuro').then(m => ({ default: m.Kakuro })));
const GridOrder = lazy(() => import('./components/GridOrder').then(m => ({ default: m.GridOrder })));
const MemoryGame = lazy(() => import('./components/MemoryGame').then(m => ({ default: m.MemoryGame })));
const NewsView = lazy(() => import('./components/NewsView').then(m => ({ default: m.NewsView })));
const JumpRaceComponent = lazy(() => import('./components/JumpRaceComponent').then(m => ({ default: m.JumpRaceComponent }))) as React.LazyExoticComponent<React.FC<{ room: Room; me: Player; isDark?: boolean }>>;

const LoadingFallback = () => (
  <div style={{ 
    padding: '2rem', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '2rem', 
    animation: 'pulse 1.5s infinite ease-in-out, delayedShow 0s 0.3s forwards',
    opacity: 0,
    visibility: 'hidden'
  }}>
    {/* Header Skeleton */}
    <div style={{ height: '70px', background: 'var(--item-bg)', borderRadius: '24px', display: 'flex', alignItems: 'center', padding: '0 2rem', justifyContent: 'space-between', border: '1px solid var(--item-border)' }}>
        <div style={{ width: '150px', height: '24px', background: 'var(--item-border)', borderRadius: '12px' }} />
        <div style={{ width: '40px', height: '40px', background: 'var(--item-border)', borderRadius: '12px' }} />
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ height: '250px', background: 'var(--item-bg)', borderRadius: '32px', border: '1px solid var(--item-border)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 2fr)', gap: '1.5rem' }}>
                <div style={{ height: '180px', background: 'var(--item-bg)', borderRadius: '24px', border: '1px solid var(--item-border)' }} />
                <div style={{ height: '180px', background: 'var(--item-bg)', borderRadius: '24px', border: '1px solid var(--item-border)' }} />
            </div>
        </div>
        <div style={{ height: '450px', background: 'var(--item-bg)', borderRadius: '32px', border: '1px solid var(--item-border)' }} />
    </div>

    <style>{`
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      @keyframes delayedShow {
        to { opacity: 1; visibility: visible; }
      }
    `}</style>
  </div>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<{ id: number; name: string; username: string; theme: string; isGuest?: boolean } | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState<'dashboard' | 'home' | 'lobby' | 'game' | 'flappy' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'news' | 'jumprace'>('dashboard');
  const [selectedGame, setSelectedGame] = useState<'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'jumprace' | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (user?.theme) return user.theme === 'dark';
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [newsQuery, setNewsQuery] = useState('Latest tech news');
  const [newsTitle, setNewsTitle] = useState('Tech Industry Updates');
  const [newsSubtitle, setNewsSubtitle] = useState('Stay updated with fresh industry insights.');
  const [memoryLevel, setMemoryLevel] = useState<number>(6);
  const [kakuroLevel, setKakuroLevel] = useState<number | 'All'>(1);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy' | 'cookie' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.title = user ? `Fun Arcade | ${user.name}` : "Fun Arcade";
  }, [isDark, user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const toggleTheme = () => {
    setIsDark(prev => {
        const next = !prev;
        socket.emit('update-theme', next ? 'dark' : 'light');
        return next;
    });
  };

  const [gameState, setGameState] = useState<GameState>({
    room: null,
    me: null,
    leaderboards: { 
      bingo: {}, typeracer: [], chess: {}, quiz: {}, sudoku: {}, kakuro: {}, sixteencoins: {}, gridorder: {},
      flappy: [], cssbattle: {}, memory: {}, jumprace: {}
    },
    error: null,
  });

  const handleAuthenticated = (user: any) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    if (user.theme) setIsDark(user.theme === 'dark');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setView('dashboard');
  };

  useEffect(() => {
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

    const onLeaderboardUpdated = (lb: GameState['leaderboards']) => {
      setGameState(prev => ({ ...prev, leaderboards: lb }));
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

  const handleSelectGame = (type: 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'jumprace') => {
    setSelectedGame(type);
    setGameState(prev => ({ ...prev, room: null, me: null })); 
    if (type === 'flappy') setView('flappy');
    else if (type === 'cssbattle') setView('cssbattle');
    else if (type === 'sudoku') setView('sudoku');
    else if (type === 'sixteencoins') setView('sixteencoins');
    else if (type === 'jumprace') setView('jumprace');
    else setView('home');
  };

  const handleRoomJoined = (me: GameState['me']) => {
    setGameState(prev => ({ ...prev, me }));
    setView('lobby');
  };


  const renderView = () => {
    if (view === 'dashboard') {
      return <Dashboard 
        onSelectGame={handleSelectGame} 
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
        query={newsQuery} 
        subtitle={newsSubtitle} 
      />;
    }

    if (view === 'flappy') {
      return <Flappy room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.flappy} onRoomJoined={(me) => setGameState(prev => ({ ...prev, me }))} />;
    }

    if (view === 'cssbattle') {
      return <CssBattle room={gameState.room} me={gameState.me} leaderboard={[]} onBack={() => setView('dashboard')} />;
    }

    if (view === 'sudoku') {
      return <Sudoku leaderboard={gameState.leaderboards.sudoku} />;
    }

    if (view === 'sixteencoins' && gameState.room && gameState.me) {
      return <SixteenCoins room={gameState.room} me={gameState.me} isDark={isDark} />;
    }

    if (view === 'jumprace' && gameState.room && gameState.me) {
        return <JumpRaceComponent room={gameState.room} me={gameState.me} isDark={isDark} />;
    }

    if (view === 'memory') {
      return <MemoryGame 
        room={gameState.room || undefined} 
        me={gameState.me || undefined} 
        level={memoryLevel} 
      />;
    }

    if (!gameState.room || !gameState.me) {
      return (
        <Home 
          onRoomJoined={handleRoomJoined} 
          leaderboards={gameState.leaderboards}
          selectedGame={selectedGame}
          publicRooms={publicRooms}
          memoryLevel={memoryLevel}
          onMemoryLevelChange={setMemoryLevel}
          kakuroLevel={kakuroLevel}
          onKakuroLevelChange={setKakuroLevel}
          playerName={user?.name || ''}
        />
      );
    }
    
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
        return <CssBattle room={gameState.room} me={gameState.me} leaderboard={[]} onBack={() => setView('dashboard')} />;
      } else if (gameState.room.type === 'sudoku') {
        return <Sudoku leaderboard={gameState.leaderboards.sudoku} />;
      } else if (gameState.room.type === 'sixteencoins') {
        return <SixteenCoins room={gameState.room} me={gameState.me} isDark={isDark} />;
      } else if (gameState.room.type === 'jumprace') {
        return <JumpRaceComponent room={gameState.room} me={gameState.me} isDark={isDark} />;
      } else if (gameState.room.type === 'quiz') {
        return <Quiz room={gameState.room} me={gameState.me} />;
      } else if (gameState.room.type === 'kakuro') {
        return <Kakuro room={gameState.room} me={gameState.me} leaderboard={gameState.leaderboards.kakuro} />;
      } else if (gameState.room.type === 'gridorder') {
        return <GridOrder room={gameState.room} me={gameState.me} leaderboard={{}} />;
      } else if (gameState.room.type === 'memory') {
        return <MemoryGame room={gameState.room} me={gameState.me} level={memoryLevel} />;
      }
      return <Game room={gameState.room} me={gameState.me} />;
    }
    return null;
  };

  const getPageTitle = () => {
    if (view === 'news') return newsTitle;
    if (view === 'flappy') return 'Flappy Bird';
    if (view === 'cssbattle') return 'CSS Battle';
    if (view === 'sudoku') return 'Sudoku';
    if (view === 'sixteencoins') return '16 Coins';
    if (view === 'memory') return 'Remember Me';
    if (view === 'jumprace') return 'Jump Race';
    if (view === 'home') return selectedGame?.toUpperCase() || 'New Game';
    if (view === 'lobby') return 'Lobby';
    if (view === 'game') {
      const type = gameState.room?.type;
      if (type === 'quiz') return 'TRIVIA';
      if (type === 'sixteencoins') return '16 COINS';
      if (type === 'jumprace') return 'JUMP RACE';
      if (type === 'gridorder') return 'GRID ORDER';
      if (type === 'typeracer') return 'TYPE RACER';
      if (type === 'memory') return 'MEMORY GAME';
      if (type === 'cssbattle') return 'CSS BATTLE';
      return type?.toUpperCase() || 'Playing';
    }
    return '';
  };

  if (!user) {
    return <Suspense fallback={<LoadingFallback />}><Auth onAuthenticated={handleAuthenticated} /></Suspense>;
  }

  const isDashboard = view === 'dashboard';

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh'
    }}>
      {isDashboard ? (
          <Header 
            user={user} 
            onLogout={handleLogout} 
            isDark={isDark} 
            toggleTheme={toggleTheme} 
          />
      ) : (
          <div style={{ 
              height: '60px', 
              background: 'var(--header-bg)', 
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 2rem',
              justifyContent: 'space-between',
              position: 'relative',
              top: 0,
              zIndex: 1000,
              boxShadow: 'var(--glass-shadow)'
          }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                    onClick={() => setView('dashboard')}
                    style={{
                        background: 'var(--item-bg)',
                        border: '1px solid var(--item-border)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    className="hover-scale"
                    title="Back to Dashboard"
                >
                    <ArrowLeft size={20} />
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--item-border)', margin: '0 0.25rem' }} />
                <span style={{ 
                  fontSize: 'clamp(0.85rem, 3.5vw, 1.1rem)', 
                  fontWeight: 950, 
                  color: 'var(--accent)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                    {getPageTitle()}
                </span>
              </div>
              <div className="game-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="desktop-header-info" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {user.name}
                  </div>
                  <button 
                    onClick={toggleTheme}
                    style={{
                      background: 'var(--item-bg)',
                      border: '1px solid var(--item-border)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    className="hover-scale"
                    title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                  >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                </div>

                <div className="mobile-header-settings" style={{ display: 'none', position: 'relative' }}>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                      background: 'var(--item-bg)',
                      border: '1px solid var(--item-border)',
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showSettings ? <X size={20} /> : <Settings size={20} />}
                  </button>

                  {showSettings && (
                    <div style={{
                      position: 'absolute',
                      top: '50px',
                      right: 0,
                      width: '200px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--item-border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                      zIndex: 1100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Account</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user.name}</div>
                      <div style={{ height: '1px', background: 'var(--item-border)' }} />
                      <button 
                         onClick={() => { toggleTheme(); setShowSettings(false); }}
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'space-between',
                           background: 'var(--item-bg)',
                           border: '1px solid var(--item-border)',
                           padding: '0.75rem',
                           borderRadius: '10px',
                           color: 'var(--text-primary)',
                           fontWeight: 700,
                           cursor: 'pointer'
                         }}
                      >
                         <span>{isDark ? 'Light' : 'Dark'} Mode</span>
                         {isDark ? <Sun size={16} /> : <Moon size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <style>{`
                @media (max-width: 640px) {
                  .desktop-header-info { display: none !important; }
                  .mobile-header-settings { display: block !important; }
                }
              `}</style>
          </div>
      )}

      <main>
        <Suspense fallback={<LoadingFallback />}>
            {renderView()}
        </Suspense>
      </main>

      {isDashboard && (
          <Footer 
            onSelectGame={handleSelectGame} 
            onSelectNews={() => {
              setNewsQuery('Latest tech news');
              setNewsTitle('Tech News');
              setNewsSubtitle('Stay updated with fresh industry insights.');
              setView('news');
            }}
            onNavigateHome={() => setView('dashboard')}
            onOpenPolicy={(type) => setPolicyType(type)}
          />
      )}
      
      <PolicyModal 
        type={policyType} 
        onClose={() => setPolicyType(null)} 
      />
    </div>
  );
};

export default App;
