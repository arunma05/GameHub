import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { User, Lock, Mail, ShieldCheck, Smartphone, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';

interface AuthProps {
    onAuthenticated: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        password: '',
        captcha: ''
    });
    const [captcha, setCaptcha] = useState<{ n1: number; n2: number } | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (mode === 'register') {
            fetchCaptcha();
        }
    }, [mode]);

    const fetchCaptcha = () => {
        socket.emit('get-captcha', (res: { n1: number; n2: number }) => {
            setCaptcha(res);
        });
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        socket.emit('login', { username: formData.username, password: formData.password }, (res: any) => {
            setIsLoading(false);
            if (res.success) {
                onAuthenticated(res.user);
            } else {
                setError(res.message);
            }
        });
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        socket.emit('register', {
            username: formData.username,
            name: formData.name,
            password: formData.password,
            captchaResponse: parseInt(formData.captcha)
        }, (res: any) => {
            setIsLoading(false);
            if (res.success) {
                onAuthenticated(res.user);
            } else {
                setError(res.message);
                fetchCaptcha();
            }
        });
    };

    const handleGuest = () => {
        setIsLoading(true);
        socket.emit('guest-login', (res: any) => {
            setIsLoading(false);
            if (res.success) {
                onAuthenticated(res.user);
            }
        });
    };

    return (
        <div className="auth-container" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '1.5rem',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            {/* Background elements */}
            <div className="auth-glow-1" />
            <div className="auth-glow-2" />

            {/* Branding */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: '1.25rem', 
                marginBottom: '2.5rem',
                animation: 'fadeIn 0.8s ease-out'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px -5px rgba(99, 102, 241, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    flexShrink: 0
                }}>
                    <Logo size={36} />
                </div>
                <h1 style={{ 
                    fontSize: 'clamp(2rem, 6vw, 2.75rem)', 
                    fontWeight: 950, 
                    margin: 0,
                    letterSpacing: '-0.04em',
                    background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'left'
                }}>
                    FUN ARCADE
                </h1>
            </div>

            <div className="card animate-fade-in auth-card" style={{
                maxWidth: '480px',
                width: '100%',
                padding: 'clamp(1.5rem, 5vw, 3.5rem)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                boxShadow: 'var(--card-shadow)',
                border: '1px solid var(--item-border)',
                position: 'relative',
                zIndex: 2,
                borderRadius: '32px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join Fun Arcade' : 'Guest Mode'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {mode === 'login' ? 'Sign in to access your persistent stats.' : 
                         mode === 'register' ? 'Create a unique handle to start playing.' : 
                         'No account? No problem. Get a temporary ID.'}
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        background: 'var(--error-glow)', 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        border: '1px solid var(--error)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--error)',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    background: 'var(--item-bg)',
                    borderRadius: '12px',
                    padding: '4px',
                    border: '1px solid var(--item-border)'
                }}>
                    <button 
                        onClick={() => setMode('login')} 
                        style={{
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: mode === 'login' ? 'var(--card-bg)' : 'transparent',
                            color: mode === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >Login</button>
                    <button 
                        onClick={() => setMode('register')}
                        style={{
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: mode === 'register' ? 'var(--card-bg)' : 'transparent',
                            color: mode === 'register' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >Register</button>
                    <button 
                        onClick={() => setMode('guest')}
                        style={{
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: mode === 'guest' ? 'var(--card-bg)' : 'transparent',
                            color: mode === 'guest' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >Guest</button>
                </div>

                {mode !== 'guest' ? (
                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {mode === 'register' && (
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        style={{ paddingLeft: '3rem' }} 
                                        placeholder="Arjun Sharma"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="input-group">
                            <label className="input-label">Username</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    style={{ paddingLeft: '3rem' }} 
                                    placeholder="arjun_gamer"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                <input 
                                    type="password" 
                                    className="input-field" 
                                    style={{ paddingLeft: '3rem' }} 
                                    placeholder="••••••••"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>

                        {mode === 'register' && captcha && (
                            <div className="input-group" style={{ 
                                padding: '1.5rem', 
                                background: 'var(--accent-glow)', 
                                border: '1px solid var(--accent)', 
                                borderRadius: '16px' 
                            }}>
                                <label className="input-label" style={{ color: 'var(--accent)' }}>Verification Challenge</label>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                                        {captcha.n1} + {captcha.n2} = ?
                                    </div>
                                    <input 
                                        type="number" 
                                        className="input-field" 
                                        style={{ width: '80px', textAlign: 'center', height: '48px', fontSize: '1.2rem' }}
                                        required
                                        value={formData.captcha}
                                        onChange={e => setFormData({...formData, captcha: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary btn-lg" 
                            disabled={isLoading}
                            style={{ 
                                marginTop: '1rem', 
                                height: '60px', 
                                fontSize: '1.1rem', 
                                fontWeight: 800,
                                boxShadow: '0 10px 25px -5px var(--accent)'
                            }}
                        >
                            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In Now' : 'Create My Account'}
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', padding: '1rem 0' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'var(--item-bg)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--item-border)'
                        }}>
                            <ShieldCheck size={40} color="var(--accent)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Instant Guest Access</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>No password needed. Just a one-click session.</p>
                        </div>
                        <button 
                            onClick={handleGuest}
                            className="btn btn-primary btn-lg"
                            disabled={isLoading}
                            style={{ width: '100%', height: '60px', fontWeight: 800 }}
                        >
                            <Smartphone size={20} />
                            Generate Guest ID
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                .auth-container {
                    background-image: 
                        radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
                        radial-gradient(circle at 100% 100%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
                }
                
                .auth-glow-1 {
                    position: absolute;
                    top: 15%;
                    left: 10%;
                    width: 40vw;
                    height: 40vw;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
                    z-index: 1;
                    filter: blur(80px);
                }

                .auth-glow-2 {
                    position: absolute;
                    bottom: 10%;
                    right: 5%;
                    width: 30vw;
                    height: 30vw;
                    background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%);
                    z-index: 1;
                    filter: blur(60px);
                }

                @media (max-width: 480px) {
                    .auth-container {
                        padding: 1rem;
                    }
                    .auth-card {
                        padding: 1.75rem !important;
                        gap: 1.5rem !important;
                        border-radius: 24px !important;
                    }
                    h2 {
                        font-size: 1.75rem !important;
                    }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
