import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, ArrowLeft, RefreshCw, Timer, Brain, 
  Zap, Heart, Star, Cloud, Moon, Sun, 
  Camera, Coffee, Gift, 
  Anchor, Ghost, Grape, IceCream, Pizza, 
  Rocket, Smile, Umbrella, Watch, Users
} from 'lucide-react';
import { socket } from '../socket';
import type { Room, Player as PlayerType } from '../types';
import confetti from 'canvas-confetti';

const ICONS = [
  { icon: Zap, color: '#FCD34D' },
  { icon: Heart, color: '#F87171' },
  { icon: Star, color: '#FB923C' },
  { icon: Cloud, color: '#94A3B8' },
  { icon: Moon, color: '#818CF8' },
  { icon: Sun, color: '#FACC15' },
  { icon: Camera, color: '#EC4899' },
  { icon: Coffee, color: '#B45309' },
  { icon: Gift, color: '#F43F5E' },
  { icon: Rocket, color: '#3B82F6' },
  { icon: Pizza, color: '#EF4444' },
  { icon: Smile, color: '#10B981' },
  { icon: Umbrella, color: '#8B5CF6' },
  { icon: Watch, color: '#6366F1' },
  { icon: Anchor, color: '#0EA5E9' },
  { icon: Ghost, color: '#D1D5DB' },
  { icon: Grape, color: '#A855F7' },
  { icon: IceCream, color: '#FBCFE8' },
];

interface Card {
  id: number;
  iconIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  room?: Room;
  me?: PlayerType;
  level: number;
  onBack: () => void;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ room, me, level: initialLevel, onBack }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false); // Only true when gameState is 'playing'
  const [isWon, setIsWon] = useState(false);
  const [level, setLevel] = useState(initialLevel);
  const [countdown, setCountdown] = useState<number | null>(null);

  const initializeSinglePlayer = useCallback(() => {
    const numPairs = initialLevel / 2;
    const selectedIcons = [...ICONS].sort(() => 0.5 - Math.random()).slice(0, numPairs);
    const cardPairs = [...selectedIcons, ...selectedIcons]
      .sort(() => 0.5 - Math.random())
      .map((icon, index) => ({
        id: index,
        iconIndex: ICONS.indexOf(icon),
        isFlipped: false,
        isMatched: false,
      }));

    setCards(cardPairs);
    setFlippedCards([]);
    setMoves(0);
    setTime(0);
    setIsActive(false);
    setIsWon(false);
    setCountdown(3); 
  }, [initialLevel]);

  // Initialize/Sync Board
  useEffect(() => {
    if (room && (room.gameState === 'starting' || room.gameState === 'playing')) {
      const serverLevel = Number(room.gameData?.level || initialLevel);
      const serverBoard = room.gameData?.board as number[];
      
      // ONLY set cards if we haven't initialized them yet.
      // This prevents server-sync re-renders from wiping matched progress.
      if (serverBoard && serverBoard.length > 0 && cards.length === 0) {
        const syncedCards = serverBoard.map((iconIdx, index) => ({
          id: index,
          iconIndex: iconIdx,
          isFlipped: false,
          isMatched: false,
        }));
        setCards(syncedCards);
        setLevel(serverLevel);
        
        if (room.gameState === 'playing') {
          setIsActive(true);
        } else {
          setIsActive(false);
          if (countdown === null) setCountdown(3);
        }
        
        setMoves(0);
        setTime(0);
        setIsWon(false);
      } else if (cards.length > 0) {
         // Just sync start phase
         if (room.gameState === 'playing' && !isActive) {
           setIsActive(true);
           setCountdown(null);
         }
      }
    } else if (!room && cards.length === 0) {
      // Single Player Mode - start directly with countdown
      initializeSinglePlayer();
    }
  }, [room, initialLevel, countdown, cards.length, initializeSinglePlayer, isActive]);

  // Handle Countdown Timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCountdown(null);
        if (!room) setIsActive(true); // For single player, activates on 0
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [countdown, room]);



  useEffect(() => {
    let interval: any = null;
    if (isActive && !isWon) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isWon]);

  const handleCardClick = (id: number) => {
    if (!isActive || isWon || flippedCards.length === 2 || cards[id].isMatched || cards[id].isFlipped) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      const [firstId, secondId] = newFlipped;

      if (cards[firstId].iconIndex === cards[secondId].iconIndex) {
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[firstId].isMatched = true;
            updated[secondId].isMatched = true;
            
            const matchedCount = updated.filter(c => c.isMatched).length;
            if (room && room.id) {
               socket.emit('memory-match', { roomId: room.id, matches: matchedCount });
            }

            if (updated.every(c => c.isMatched)) {
              setIsWon(true);
              setIsActive(false);
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              
              if (room && room.id) {
                socket.emit('memory-win', { roomId: room.id, time });
              } else {
                const savedName = localStorage.getItem('arcade-player-name') || 'Player';
                socket.emit('memory-score', { name: savedName, level, time });
              }
            }
            return updated;
          });
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => {
            const flipped = [...prev];
            flipped[firstId].isFlipped = false;
            flipped[secondId].isFlipped = false;
            return flipped;
          });
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', position: 'relative' }}>
      
      {/* Full-width Header */}
      <header style={{ 
        width: '100%', padding: '1rem 2rem', 
        background: 'var(--card-bg)', borderBottom: '1px solid var(--item-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 50, position: 'sticky', top: 0,
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button onClick={onBack} className="btn-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800, padding: 0 }}>
             <ArrowLeft size={18} /> BACK
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <Brain size={32} color="#ec4899" />
             <div>
               <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, letterSpacing: '0.05em' }}>REMEMBER ME</h1>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>LEVEL: {level} CARDS</span>
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)' }}>TIME</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Timer size={18} /> {formatTime(time)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)' }}>MOVES</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{moves}</div>
            </div>
          </div>
          {!room && (
            <button onClick={initializeSinglePlayer} className="btn btn-outline" style={{ height: '40px', padding: '0 1rem', fontSize: '0.85rem' }}>
               <RefreshCw size={16} /> RESET
            </button>
          )}
        </div>
      </header>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          pointerEvents: 'none'
        }}>
           <div className="animate-scale-in" style={{ fontSize: '8rem', fontWeight: 950, color: 'white', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {countdown === 0 ? 'GO!' : countdown}
           </div>
        </div>
      )}

      {/* Main Game Layout */}
      <div className="container" style={{ flex: 1, padding: '2rem', display: 'flex', gap: '2rem', flexDirection: window.innerWidth < 1000 ? 'column' : 'row' }}>
        
        {/* Game Board */}
        <main style={{ flex: 1 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(auto-fit, minmax(${level > 16 ? '150px' : '180px'}, 1fr))`, 
            gap: '1.25rem', 
            perspective: '1000px'
          }}>
            {cards.map((card) => {
              const IconData = ICONS[card.iconIndex] || ICONS[0];
              const Icon = IconData.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  style={{
                    aspectRatio: '1.6', 
                    cursor: card.isMatched ? 'default' : (isActive ? 'pointer' : 'not-allowed'),
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0)',
                  }}
                >
                  {/* Front Side */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                    background: 'linear-gradient(135deg, #3A7BD5, #00D2FF)', 
                    borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(0, 114, 255, 0.2)',
                    overflow: 'hidden'
                  }}>
                     <Brain size={48} color="white" style={{ opacity: 0.1 }} />
                  </div>

                  {/* Back Side */}
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: card.isMatched ? 'var(--bg-secondary)' : 'var(--card-bg)',
                    borderRadius: '16px', border: `3px solid ${card.isMatched ? '#10B981' : IconData.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: card.isMatched ? 0.3 : 1
                  }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%', 
                      background: `${IconData.color}15`, display: 'flex', 
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={38} color={IconData.color} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Sidebar: Live Stats */}
        {room && (
          <aside className="responsive-card-width" style={{ width: '300px', flexShrink: 0 }}>
             <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                 <Users size={20} color="var(--accent)" />
                 <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>LIVE STATS</h3>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {room.players.map(player => {
                    const progress = (room.gameData?.progress as any)?.[player.id] || 0;
                    const percent = Math.floor((Number(progress) / level) * 100);
                    return (
                      <div key={player.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 800 }}>{player.name} {player.id === me?.id && '(You)'}</span>
                          <span style={{ fontWeight: 900, color: 'var(--accent)' }}>{progress}/{level}</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: player.id === me?.id ? 'var(--accent)' : 'var(--success)', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
          </aside>
        )}
      </div>

      {/* Results Modal */}
      {(isWon || room?.gameState === 'finished') && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-scale-in" style={{ padding: room ? '2.5rem 2rem' : '4rem 3rem', textAlign: 'center', maxWidth: '480px', width: '100%' }}>
            
            {!room ? (
              <>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#fbbf2415', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                  <Trophy size={64} color="#fbbf24" />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: '0.5rem' }}>VICTORY!</h2>
                <div style={{ background: 'var(--accent-glow)', padding: '0.75rem 1.5rem', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)', fontWeight: 950, fontSize: '1.2rem', marginBottom: '2rem' }}>
                   <Timer size={22} /> {formatTime(time)}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem', fontWeight: 600 }}>
                  You matched all {level} cards!
                </p>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '2rem' }}>
                   <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: isWon && room.winners?.[0]?.id === me?.id ? '#fbbf2415' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <Trophy size={40} color={isWon && room.winners?.[0]?.id === me?.id ? '#fbbf24' : 'var(--text-secondary)'} />
                   </div>
                   <h2 style={{ fontSize: '2.5rem', fontWeight: 950, margin: 0, color: isWon && room.winners?.[0]?.id === me?.id ? '#fbbf24' : 'var(--text-primary)' }}>
                      {isWon && room.winners?.[0]?.id === me?.id ? 'WINNER!' : 'GAME OVER'}
                   </h2>
                   <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '0.25rem', letterSpacing: '0.1em' }}>
                      {isWon ? 'YOU FINISHED ALL MATCHES' : 'VIEW FINAL RESULTS'}
                   </div>
                   {isWon && (
                     <div style={{ marginTop: '1rem', background: 'var(--accent-glow)', padding: '0.5rem 1rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 950 }}>
                        <Timer size={18} /> TIME: {formatTime(time)}
                     </div>
                   )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                   {room.players
                     .map(p => ({ 
                       ...p, 
                       rank: room.winners?.findIndex(w => w.id === p.id) ?? -1,
                       progress: (room.gameData?.progress as any)?.[p.id] || 0
                     }))
                     .sort((a, b) => {
                        if (a.rank !== -1 && b.rank !== -1) return a.rank - b.rank;
                        if (a.rank !== -1) return -1;
                        if (b.rank !== -1) return 1;
                        return b.progress - a.progress;
                     })
                     .map((p, idx) => (
                       <div key={p.id} style={{ 
                         display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                         padding: '1rem', background: p.id === me?.id ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                         borderRadius: '12px', border: p.id === me?.id ? '1px solid var(--accent)' : '1px solid var(--item-border)'
                       }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                             <div style={{ 
                               width: '28px', height: '28px', borderRadius: '50%', 
                               background: idx === 0 ? '#fbbf24' : (idx === 1 ? '#94a3b8' : (idx === 2 ? '#b45309' : 'transparent')),
                               color: idx < 3 ? 'white' : 'var(--text-secondary)',
                               fontSize: '0.75rem', fontWeight: 900,
                               display: 'flex', alignItems: 'center', justifyContent: 'center'
                             }}>
                               {idx + 1}
                             </div>
                             <span style={{ fontWeight: 800 }}>{p.name} {p.id === me?.id && '(YOU)'}</span>
                          </div>
                          <div style={{ fontWeight: 900, color: idx === 0 ? '#fbbf24' : 'var(--text-secondary)' }}>
                             {p.progress >= level ? 'FINISHED' : `${p.progress}/${level}`}
                          </div>
                       </div>
                     ))
                   }
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
               <button onClick={onBack} className="btn btn-primary" style={{ height: '60px', borderRadius: '14px', fontSize: '1.1rem' }}>
                EXIT TO DASHBOARD
              </button>
              {!room && (
                <button onClick={initializeSinglePlayer} className="btn btn-outline" style={{ height: '60px', borderRadius: '14px', fontSize: '1.1rem' }}>
                   PLAY AGAIN
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
