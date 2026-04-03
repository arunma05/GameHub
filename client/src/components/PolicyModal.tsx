import React from 'react';
import { X, Shield, Scale, Cookie } from 'lucide-react';

interface PolicyModalProps {
  type: 'terms' | 'privacy' | 'cookie' | null;
  onClose: () => void;
}

const POLICIES: Record<string, { title: string, icon: React.ReactNode, content: string[] }> = {
  terms: {
    title: 'Terms of Service',
    icon: <Scale size={24} color="var(--accent)" />,
    content: [
      'By using Fun Arcade, you agree to these legal terms.',
      'Acount Security: You are responsible for maintaining the confidentiality of your account credentials.',
      'Fair Play: Use of scripts, bots, or external hacks is strictly prohibited and results in immediate ban.',
      'Content: We reserve the right to remove any name or display content deemed offensive.',
      'Termination: We may suspend access to our service at any time for policy violations.'
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    icon: <Shield size={24} color="var(--success)" />,
    content: [
      'Data Collection: We collect your username and game statistics to provide personalized leaderboards.',
      'Data Storage: Your passwords are encrypted using industry-standard hashing algorithms.',
      'Cookies: We use local storage and cookies purely for authentication and session persistence.',
      'No Third Parties: We do not sell or share your data with advertisers or third-party brokers.',
      'Right to Delete: You can request account deletion by contacting our support team.'
    ]
  },
  cookie: {
    title: 'Cookie Policy',
    icon: <Cookie size={24} color="#f59e0b" />,
    content: [
      'Authentication: We use session cookies to keep you logged in across different pages.',
      'Preferences: Local storage is used to remember your theme choice (Light/Dark mode).',
      'Performance: We may use anonymous analytics to improve game loading times.',
      'Management: You can clear these cookies at any time through your browser settings.',
      'Notification: By continuing to use Fun Arcade, you consent to our use of these essential technologies.'
    ]
  }
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const policy = POLICIES[type];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '2rem'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '550px',
          background: 'var(--card-bg)',
          borderRadius: '32px',
          border: '1px solid var(--item-border)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'var(--card-shadow)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid var(--item-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--item-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
               width: '45px', 
               height: '45px', 
               borderRadius: '12px', 
               background: 'var(--card-bg)', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               border: '1px solid var(--item-border)'
            }}>
              {policy.icon}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-primary)', margin: 0 }}>
              {policy.title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--item-bg)',
              border: '1px solid var(--item-border)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {policy.content.map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', marginTop: '0.6rem', flexShrink: 0 }} />
               <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6', fontWeight: 550 }}>
                 {text}
               </p>
            </div>
          ))}
        </div>

        <div style={{ padding: '2rem', background: 'var(--item-bg)', borderTop: '1px solid var(--item-border)', textAlign: 'right' }}>
           <button 
             onClick={onClose}
             className="btn btn-primary"
             style={{ padding: '0.75rem 2rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 800 }}
           >
             I Understand
           </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
