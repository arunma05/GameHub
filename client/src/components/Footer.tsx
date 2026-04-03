import React from 'react';
import { Heart, Cpu } from 'lucide-react';
import { Logo } from './Logo';

interface FooterProps {
    onSelectGame?: (type: any) => void;
    onSelectNews?: () => void;
    onNavigateHome?: () => void;
    onOpenPolicy?: (type: 'terms' | 'privacy' | 'cookie') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectGame, onSelectNews, onNavigateHome, onOpenPolicy }) => {
    const year = new Date().getFullYear();
    return (
        <footer style={{
            background: 'var(--footer-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--glass-border)',
            padding: '2rem 1.5rem',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--glass-shadow)'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '3rem',
                justifyContent: 'center'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={onNavigateHome}>
                        <Logo size={28} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>FUN ARCADE</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.7, maxWidth: '300px' }}>
                        Premium multiplayer gaming experience built for the modern web. Every game, every pixel, every moment designed for pure fun.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Quick Nav</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                        <span onClick={onNavigateHome} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }} className="link-underlined">Dashboard</span>
                        <span onClick={onNavigateHome} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }} className="link-underlined">Leaderboards</span>
                        <span onClick={onSelectNews} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }} className="link-underlined">Tech News</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Game Suite</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                        <span onClick={() => onSelectGame?.('bingo')} style={{ cursor: 'pointer' }} className="hover-accent">Bingo Royale</span>
                        <span onClick={() => onSelectGame?.('typeracer')} style={{ cursor: 'pointer' }} className="hover-accent">Type Racer EX</span>
                        <span onClick={() => onSelectGame?.('chess')} style={{ cursor: 'pointer' }} className="hover-accent">Chess Grandmaster</span>
                        <span onClick={() => onSelectGame?.('sudoku')} style={{ cursor: 'pointer' }} className="hover-accent">Puzzle Master Sudoku</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                   <div style={{
                       padding: '2rem',
                       background: 'var(--item-bg)',
                       borderRadius: '24px',
                       border: '1px solid var(--item-border)',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: '1rem',
                       alignItems: 'center',
                       textAlign: 'center'
                   }}>
                        <Cpu size={32} color="var(--accent)" />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Powered by Advanced AI</div>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>
                            Intelligent matchmaking & game logic orchestration.
                        </p>
                   </div>
                </div>
            </div>

            <div style={{ 
                maxWidth: '1200px', 
                margin: '4rem auto 0 auto', 
                paddingTop: '2rem', 
                borderTop: '1px solid var(--item-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.8rem',
                opacity: 0.6
            }}>
                <div>&copy; {year} Fun Arcade Innovations. All rights reserved.</div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('terms')}>Terms of Service</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('privacy')}>Privacy Policy</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => onOpenPolicy?.('cookie')}>Cookie Policy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Made with <Heart size={12} fill="var(--error)" color="var(--error)" /> by DevTeam
                </div>
            </div>
        </footer>
    );
};
