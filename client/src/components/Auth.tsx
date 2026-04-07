import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { User, Lock, Mail, ShieldCheck, Smartphone, ChevronRight, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Logo } from './Logo';

interface AuthProps {
    onAuthenticated: (user: any) => void;
}

// ── Validation helpers ────────────────────────────────────────────────────────
const validators = {
    name: (v: string) => {
        if (!v.trim()) return 'Full name is required';
        if (v.trim().length < 2) return 'Name must be at least 2 characters';
        if (v.trim().length > 50) return 'Name must be under 50 characters';
        if (!/^[a-zA-Z\s'-]+$/.test(v.trim())) return 'Only letters, spaces, hyphens and apostrophes allowed';
        return '';
    },
    username: (v: string) => {
        if (!v) return 'Username is required';
        if (v.length < 3) return 'Username must be at least 3 characters';
        if (v.length > 20) return 'Username must be under 20 characters';
        if (/\s/.test(v)) return 'Username cannot contain spaces';
        if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only letters, numbers and underscores allowed';
        if (/^_/.test(v) || /_$/.test(v)) return 'Username cannot start or end with an underscore';
        return '';
    },
    password: (v: string) => {
        if (!v) return 'Password is required';
        if (v.length < 4) return 'Password must be at least 4 characters';
        if (v.length > 72) return 'Password is too long';
        return '';
    },
};

const getPasswordStrength = (p: string): { score: number; label: string; color: string } => {
    if (!p) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: '#f43f5e' };
    if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 3, label: 'Good', color: '#3b82f6' };
    return { score: 4, label: 'Strong', color: '#10b981' };
};

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
    const [formData, setFormData] = useState({ username: '', name: '', password: '', captcha: '' });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [captcha, setCaptcha] = useState<{ n1: number; n2: number } | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() { setIsConnected(true); }
        function onDisconnect() { setIsConnected(false); }
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
    }, []);

    useEffect(() => {
        if (mode === 'register') fetchCaptcha();
        // Clear errors when switching modes
        setFieldErrors({});
        setTouched({});
        setError('');
        setFormData({ username: '', name: '', password: '', captcha: '' });
        setShowPassword(false);
    }, [mode]);

    const fetchCaptcha = () => {
        socket.emit('get-captcha', (res: { n1: number; n2: number }) => setCaptcha(res));
    };

    // Run a validator and update fieldErrors + touched
    const validate = (field: string, value: string) => {
        const fn = validators[field as keyof typeof validators];
        const err = fn ? fn(value) : '';
        setFieldErrors(prev => ({ ...prev, [field]: err }));
        return err;
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (touched[field]) validate(field, value);
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validate(field, formData[field as keyof typeof formData]);
    };

    const isRegisterValid = () => {
        if (mode !== 'register') return true;
        return (
            !validators.name(formData.name) &&
            !validators.username(formData.username) &&
            !validators.password(formData.password) &&
            formData.captcha !== ''
        );
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        socket.emit('login', { username: formData.username, password: formData.password }, (res: any) => {
            setIsLoading(false);
            if (res.success) onAuthenticated(res.user);
            else setError(res.message);
        });
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // Mark all fields touched to show any errors
        setTouched({ name: true, username: true, password: true });
        const nameErr = validate('name', formData.name);
        const userErr = validate('username', formData.username);
        const passErr = validate('password', formData.password);
        if (nameErr || userErr || passErr) return;

        setIsLoading(true);
        setError('');
        socket.emit('register', {
            username: formData.username,
            name: formData.name,
            password: formData.password,
            captchaResponse: parseInt(formData.captcha)
        }, (res: any) => {
            setIsLoading(false);
            if (res.success) onAuthenticated(res.user);
            else { setError(res.message); fetchCaptcha(); }
        });
    };

    const handleGuest = () => {
        setIsLoading(true);
        socket.emit('guest-login', (res: any) => {
            setIsLoading(false);
            if (res.success) onAuthenticated(res.user);
        });
    };

    const strength = getPasswordStrength(formData.password);

    const inputStyle = (field: string): React.CSSProperties => ({
        paddingLeft: '3rem',
        borderColor: touched[field] && fieldErrors[field] ? 'var(--error)' : touched[field] && !fieldErrors[field] ? 'var(--success)' : undefined,
        boxShadow: touched[field] && fieldErrors[field] ? '0 0 0 2px var(--error-glow)' : touched[field] && !fieldErrors[field] ? '0 0 0 2px var(--success-glow)' : undefined,
    });

    const FieldError = ({ field }: { field: string }) =>
        touched[field] && fieldErrors[field] ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                <XCircle size={13} color="var(--error)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--error)', fontWeight: 600 }}>{fieldErrors[field]}</span>
            </div>
        ) : touched[field] && !fieldErrors[field] && formData[field as keyof typeof formData] ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                <CheckCircle2 size={13} color="var(--success)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>Looks good!</span>
            </div>
        ) : null;

    return (
        <div className="auth-container" style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg-primary)', padding: '1.5rem',
            position: 'relative', overflowX: 'hidden'
        }}>
            <div className="auth-glow-1" />
            <div className="auth-glow-2" />

            {/* Branding */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', animation: 'fadeIn 0.8s ease-out' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px -5px rgba(99, 102, 241, 0.4)', border: '1px solid rgba(255, 255, 255, 0.2)', flexShrink: 0 }}>
                    <Logo size={36} />
                </div>
                <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.75rem)', fontWeight: 950, margin: 0, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'left' }}>
                    FUN ARCADE
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.5rem', padding: '0.2rem 0.5rem', background: 'var(--item-bg)', borderRadius: '12px', border: '1px solid var(--item-border)', animation: 'fadeIn 1s ease-out' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? '#10b981' : '#f43f5e', boxShadow: `0 0 8px ${isConnected ? '#10b981' : '#f43f5e'}`, animation: 'pulse-api 2s infinite' }} />
                    <span style={{ fontSize: '0.45rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        SERVER {isConnected ? 'Active' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="card animate-fade-in auth-card" style={{ maxWidth: '480px', width: '100%', padding: 'clamp(1.5rem, 5vw, 3.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem', boxShadow: 'var(--card-shadow)', border: '1px solid var(--item-border)', position: 'relative', zIndex: 2, borderRadius: '32px' }}>
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
                    <div style={{ background: 'var(--error-glow)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--error)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--error)', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* Mode tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'var(--item-bg)', borderRadius: '12px', padding: '4px', border: '1px solid var(--item-border)' }}>
                    {(['login', 'register', 'guest'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)} style={{ padding: '0.75rem', border: 'none', borderRadius: '8px', background: mode === m ? 'var(--card-bg)' : 'transparent', color: mode === m ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'capitalize' }}>
                            {m === 'guest' ? 'Guest' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {mode !== 'guest' ? (
                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Full Name — register only */}
                        {mode === 'register' && (
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, zIndex: 1 }} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        style={inputStyle('name')}
                                        placeholder="Arjun Sharma"
                                        value={formData.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        onBlur={() => handleBlur('name')}
                                        autoComplete="name"
                                    />
                                </div>
                                <FieldError field="name" />
                            </div>
                        )}

                        {/* Username */}
                        <div className="input-group">
                            <label className="input-label">Username</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, zIndex: 1 }} />
                                <input
                                    type="text"
                                    className="input-field"
                                    style={inputStyle('username')}
                                    placeholder="arjun_gamer"
                                    value={formData.username}
                                    onChange={e => handleChange('username', e.target.value.toLowerCase())}
                                    onBlur={() => handleBlur('username')}
                                    autoComplete="username"
                                    spellCheck={false}
                                />
                            </div>
                            {mode === 'register' && <FieldError field="username" />}
                            {mode === 'register' && !fieldErrors.username && !touched.username && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0', opacity: 0.7 }}>
                                    3–20 chars · letters, numbers, underscores only
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, zIndex: 1 }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field"
                                    style={{ ...inputStyle('password'), paddingRight: '3rem' }}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => handleChange('password', e.target.value)}
                                    onBlur={() => handleBlur('password')}
                                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Password strength meter — register only */}
                            {mode === 'register' && formData.password && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '0.3rem' }}>
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= strength.score ? strength.color : 'var(--item-border)', transition: 'background 0.3s ease' }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: strength.color }}>{strength.label} password</span>
                                </div>
                            )}
                            {mode === 'register' && <FieldError field="password" />}
                            {mode === 'register' && !fieldErrors.password && !touched.password && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0', opacity: 0.7 }}>
                                    4+ characters minimum
                                </p>
                            )}
                        </div>

                        {/* CAPTCHA — register only */}
                        {mode === 'register' && captcha && (
                            <div className="input-group" style={{ padding: '1.25rem', background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: '16px' }}>
                                <label className="input-label" style={{ color: 'var(--accent)', marginBottom: '0.75rem', display: 'block' }}>Verification Challenge</label>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                                        {captcha.n1} + {captcha.n2} = ?
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="input-field captcha-input"
                                        style={{ width: '90px', textAlign: 'center', height: '48px', fontSize: '1.25rem', fontWeight: 900 }}
                                        placeholder="?"
                                        maxLength={2}
                                        value={formData.captcha}
                                        onChange={e => setFormData(prev => ({ ...prev, captcha: e.target.value.replace(/[^0-9]/g, '') }))}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isLoading || (mode === 'register' && !isRegisterValid())}
                            style={{ marginTop: '0.5rem', height: '60px', fontSize: '1.1rem', fontWeight: 800, boxShadow: '0 10px 25px -5px var(--accent)', opacity: isLoading || (mode === 'register' && !isRegisterValid()) ? 0.6 : 1, transition: 'opacity 0.2s' }}
                        >
                            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In Now' : 'Create My Account'}
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', padding: '1rem 0' }}>
                        <div style={{ width: '80px', height: '80px', background: 'var(--item-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--item-border)' }}>
                            <ShieldCheck size={40} color="var(--accent)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Instant Guest Access</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>No password needed. Just a one-click session.</p>
                        </div>
                        <button onClick={handleGuest} className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', height: '60px', fontWeight: 800 }}>
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
                .auth-glow-1 { position: absolute; top: 15%; left: 10%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%); z-index: 1; filter: blur(80px); }
                .auth-glow-2 { position: absolute; bottom: 10%; right: 5%; width: 30vw; height: 30vw; background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%); z-index: 1; filter: blur(60px); }
                @media (max-width: 480px) {
                    .auth-container { padding: 1rem; }
                    .auth-card { padding: 1.75rem !important; gap: 1.5rem !important; border-radius: 24px !important; }
                    h2 { font-size: 1.75rem !important; }
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-api { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
                /* Hide number input spinners globally on auth page */
                .captcha-input::-webkit-outer-spin-button,
                .captcha-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .captcha-input { -moz-appearance: textfield; }
            `}</style>
        </div>
    );
};
