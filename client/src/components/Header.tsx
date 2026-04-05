import React, { useState, useEffect } from 'react';
import { User, LogOut, Sun, Moon, X, Settings } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  user: { name: string; username: string; isGuest?: boolean } | null;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, isDark, toggleTheme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  const handleMobileOnLogout = () => {
    setIsMenuOpen(false);
    onLogout();
  };

  return (
    <header style={{
      height: '70px',
      background: isMenuOpen ? 'var(--bg-primary)' : 'var(--header-bg)',
      backdropFilter: isMenuOpen ? 'none' : 'blur(24px)',
      WebkitBackdropFilter: isMenuOpen ? 'none' : 'blur(24px)',
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: 'var(--glass-shadow)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
        <Logo size={32} />
        <span style={{ 
          fontSize: '1.4rem', 
          fontWeight: 900, 
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          FUN ARCADE
        </span>
      </div>


      <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                {user.isGuest ? 'Guest Session' : `@${user.username}`}
              </span>
            </div>
            
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'var(--accent-glow)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid var(--accent)',
              color: 'var(--accent)'
            }}>
              <User size={20} />
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--item-border)' }} />


            <button 
              onClick={toggleTheme}
              style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#fbbf24' : '#6366f1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: '5px'
              }}
              className="hover-scale"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={onLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="hover-scale"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button 
                onClick={toggleTheme}
                style={{
                    background: 'var(--item-bg)',
                    border: '1px solid var(--item-border)',
                    borderRadius: '10px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isDark ? '#fbbf24' : '#6366f1'
                }}
             >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        )}
      </div>


      {/* Mobile Menu Trigger */}
      <div className="mobile-nav-toggle" style={{ display: 'none' }}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          {isMenuOpen ? <X size={28} /> : <Settings size={28} />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999
          }}
        />
      )}

      {/* Mobile Menu Dropdown */}
      <div 
        style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          background: 'var(--bg-primary)',
          backdropFilter: 'none',
          borderBottom: '1px solid var(--item-border)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
          padding: '2rem',
          display: isMenuOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '1.5rem',
          transform: isMenuOpen ? 'translateY(0)' : 'translateY(-20px)',
          opacity: isMenuOpen ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isMenuOpen ? 'all' : 'none',
          zIndex: 1000
        }}
      >
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--item-border)', paddingBottom: '1rem' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: 'var(--accent-glow)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid var(--accent)',
                color: 'var(--accent)'
              }}>
                <User size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{user.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {user.isGuest ? 'Guest Session' : `@${user.username}`}
                </span>
              </div>
            </div>


            <button 
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--item-bg)',
                border: '1px solid var(--item-border)',
                padding: '1rem',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              {isDark ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#6366f1" />}
              {isDark ? 'Light Theme' : 'Dark Theme'}
            </button>

            <button 
              onClick={handleMobileOnLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--error-glow)',
                border: '1px solid var(--error)',
                padding: '1rem',
                borderRadius: '12px',
                color: 'var(--error)',
                fontWeight: 800,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <LogOut size={20} /> Logout
            </button>
          </>
        ) : (
          <button 
            onClick={toggleTheme}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--item-bg)',
                border: '1px solid var(--item-border)',
                padding: '1rem',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer'
            }}
          >
            {isDark ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#6366f1" />}
            {isDark ? 'Light Theme' : 'Dark Theme'}
          </button>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: block !important; }
        }
        @keyframes pulse-api {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </header>
  );
};
