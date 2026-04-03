import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 48, showText = false }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
       <div style={{ 
          width: size, height: size, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: size * 0.2
       }}>
          <img 
            src="/funarcade_logo.png" 
            alt="FunArcade Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
       </div>

       {showText && (
          <span style={{ fontSize: size * 0.5, fontWeight: 900, color: 'var(--text-primary)' }}>
            FunArcade
          </span>
       )}
    </div>
  );
};
