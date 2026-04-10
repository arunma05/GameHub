import React from 'react';
import { Heart, Cpu, Zap, Trophy, Globe, Gamepad2 } from 'lucide-react';
import { Logo } from './Logo';

export type GameType = 'bingo' | 'typeracer' | 'chess' | 'flappy' | 'quiz' | 'cssbattle' | 'sudoku' | 'sixteencoins' | 'kakuro' | 'gridorder' | 'memory' | 'jumprace' | 'shapeme' | 'colormatcher' | 'mirrordraw' | 'archerstick';

interface FooterProps {
    onSelectGame?: (type: GameType) => void;
    onSelectNews?: () => void;
    onNavigateHome?: () => void;
    onOpenPolicy?: (type: 'terms' | 'privacy' | 'cookie') => void;
}

const GAME_INFO: Record<string, { label: string; color: string }> = {
    bingo: { label: 'Bingo Royale', color: '#10b981' },
    typeracer: { label: 'Type Racer EX', color: '#3b82f6' },
    chess: { label: 'Chess Grandmaster', color: '#8b5cf6' },
    flappy: { label: 'Flappy Bird', color: '#fbbf24' },
    quiz: { label: 'Trivia Master', color: '#ec4899' },
    cssbattle: { label: 'CSS Battle', color: '#f43f5e' },
    sudoku: { label: 'Sudoku Pro', color: '#22d3ee' },
    sixteencoins: { label: '16 Coins', color: '#6366f1' },
    kakuro: { label: 'Kakuro', color: '#a78bfa' },
    gridorder: { label: 'Grid Order', color: '#f59e0b' },
    memory: { label: 'Remember Me', color: '#ec4899' },
    jumprace: { label: 'Jump Race', color: '#10b981' },
    shapeme: { label: 'Shape Me', color: '#84cc16' },
    colormatcher: { label: 'Color Matcher', color: '#d946ef' },
    mirrordraw: { label: 'Mirror Draw', color: '#2dd4bf' },
    archerstick: { label: 'Archer Stick', color: '#f43f5e' }
};

const CATEGORIES = [
    {
        title: 'ARCADE CLASSICS',
        games: ['bingo', 'typeracer', 'flappy', 'jumprace', 'shapeme', 'mirrordraw', 'archerstick']
    },
    {
        title: 'PUZZLES & BRAINS',
        games: ['sudoku', 'kakuro', 'gridorder', 'memory', 'quiz', 'colormatcher']
    },
    {
        title: 'STRATEGY & SKILLS',
        games: ['chess', 'cssbattle', 'sixteencoins']
    }
];

export const Footer: React.FC<FooterProps> = ({ onSelectGame, onSelectNews, onNavigateHome, onOpenPolicy }) => {
    const year = new Date().getFullYear();
    
    return (
        <footer style={{
            background: 'var(--footer-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--glass-border)',
            padding: '4rem 1.5rem 2rem 1.5rem',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--glass-shadow)',
            marginTop: 'auto'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '3rem'
            }}>
                {/* Branding & Mission */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={onNavigateHome}>
                        <Logo size={32} />
                        <span style={{ fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>GAME HUB</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', fontWeight: 500, opacity: 0.8 }}>
                        Experience the ultimate multiplayer arcade destination. Compete, chat, and climb the global leaderboards across 15+ premium experiences.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <Zap size={20} color="var(--accent)" />
                        <Trophy size={20} color="var(--accent)" />
                        <Globe size={20} color="var(--accent)" />
                    </div>
                    
                    <div style={{
                        marginTop: '1rem',
                        padding: '1.25rem',
                        background: 'var(--item-bg)',
                        borderRadius: '20px',
                        border: '1px solid var(--item-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <Cpu size={24} color="var(--accent)" />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>AI POWERED</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Intelligent Matchmaking</div>
                        </div>
                    </div>
                </div>

                {/* Categories */}
                {CATEGORIES.map(cat => (
                    <div key={cat.title} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                            {cat.title}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {cat.games.map(g => (
                                <button 
                                    key={g} 
                                    onClick={() => onSelectGame?.(g as GameType)} 
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        padding: 0, 
                                        color: 'var(--text-secondary)', 
                                        fontSize: '0.95rem', 
                                        fontWeight: 600, 
                                        textAlign: 'left', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.2s' 
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = GAME_INFO[g].color;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    {GAME_INFO[g].label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* System & Policy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em' }}>RESOURCES</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button onClick={onNavigateHome} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }} className="hover-accent">Dashboard</button>
                        <button onClick={onSelectNews} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }} className="hover-accent">Tech News</button>
                        <button onClick={() => onOpenPolicy?.('terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }} className="hover-accent">Terms of Service</button>
                        <button onClick={() => onOpenPolicy?.('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer' }} className="hover-accent">Privacy Policy</button>
                    </div>
                </div>
            </div>

            <div style={{ 
                maxWidth: '1200px', 
                margin: '4rem auto 0 auto', 
                paddingTop: '2.5rem', 
                borderTop: '1px solid var(--item-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                fontSize: '0.8rem',
                fontWeight: 900,
                color: 'var(--text-secondary)'
            }}>
                <div style={{ letterSpacing: '0.05em' }}>&copy; {year} GAME HUB ARCADE. ALL RIGHTS RESERVED.</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                        MADE WITH <Heart size={14} fill="var(--error)" color="var(--error)" /> BY <span style={{ color: 'var(--text-primary)' }}>DEVTEAM</span>
                    </div>
                    <div style={{ width: '1px', height: '14px', background: 'var(--item-border)' }} />
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('terms')}>TERMS</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('privacy')}>PRIVACY</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('cookie')}>COOKIES</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
