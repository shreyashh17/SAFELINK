import React, { useState } from 'react';
import api from './api';

type Step = 'landing' | 'admin-login' | 'admin-register' | 'user-login' | 'user-register';

interface Props {
    onLogin: (token: string, role: string, userInfo: any) => void;
}

export default function LoginFlow({ onLogin }: Props) {
    const [step, setStep] = useState<Step>('landing');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const reset = (next: Step) => {
        setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
        setError(''); setSuccess(''); setLoading(false); setShowPw(false);
        setStep(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setSuccess('');

        const isRegister = step === 'admin-register' || step === 'user-register';
        const isAdmin = step === 'admin-login' || step === 'admin-register';

        // Validation
        if (isRegister) {
            if (!name.trim()) { setError('Full name is required.'); setLoading(false); return; }
            if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
            if (password !== confirmPassword) { setError("Passwords don't match."); setLoading(false); return; }
            if (isAdmin && !email.endsWith('@admin.safelink')) {
                setError('Admin accounts must use an email ending with @admin.safelink');
                setLoading(false); return;
            }
        }

        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const body = isRegister ? { name, email, password } : { email, password };
            const res = await api.post(endpoint, body);

            // For admin paths, enforce admin role
            if (isAdmin && res.data.role !== 'admin') {
                setError('This account does not have admin privileges.');
                setLoading(false); return;
            }

            if (isRegister) {
                setSuccess('Account created successfully! Signing you in…');
                setTimeout(() => finishLogin(res.data), 900);
            } else {
                finishLogin(res.data);
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || (isRegister ? 'Registration failed.' : 'Login failed. Check your credentials.'));
            setLoading(false);
        }
    };

    const finishLogin = (data: any) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userInfo', JSON.stringify({ name: data.name, email: data.email }));
        onLogin(data.token, data.role, { name: data.name, email: data.email });
    };

    /* ─── Landing ──────────────────────────────────────────────────────────── */
    if (step === 'landing') {
        return (
            <div style={s.page}>
                <div style={s.landingWrap}>
                    {/* Logo */}
                    <div style={s.logo}>
                        <img src="/logo1.png" alt="SafeLink" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                        <h1 style={s.logoTitle}>SafeLink</h1>
                        <p style={s.logoSub}>Real-Time Emergency Response System</p>
                    </div>

                    <p style={s.prompt}>Choose your portal to continue</p>

                    {/* Portal cards */}
                    <div style={s.portalRow}>
                        {/* Admin card */}
                        <button style={s.portalCard} onClick={() => reset('admin-login')}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
                            <div style={s.portalCardTitle}>Admin / Authority</div>
                            <div style={s.portalCardSub}>
                                Dashboard for police, fire &amp; emergency authorities. View live alerts, manage incidents, monitor crowd density.
                            </div>
                            <div style={{ ...s.portalBtn, background: '#FF3B3B' }}>Enter Admin Portal →</div>
                        </button>

                        {/* User card */}
                        <button style={s.portalCard} onClick={() => reset('user-login')}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🆘</div>
                            <div style={s.portalCardTitle}>User / Citizen</div>
                            <div style={s.portalCardSub}>
                                One-click SOS, emergency dial, quick alerts and GPS sharing for citizens during disasters and emergencies.
                            </div>
                            <div style={{ ...s.portalBtn, background: '#3B82F6' }}>Enter Emergency Portal →</div>
                        </button>
                    </div>

                    <p style={s.footNote}>SafeLink v1.0 · Encrypted · Real-Time · Always-On</p>
                </div>
            </div>
        );
    }

    /* ─── Forms ────────────────────────────────────────────────────────────── */
    const isAdmin = step === 'admin-login' || step === 'admin-register';
    const isRegister = step === 'admin-register' || step === 'user-register';
    const accent = isAdmin ? '#FF3B3B' : '#3B82F6';
    const portalName = isAdmin ? 'Admin Portal' : 'Emergency Portal';
    const portalIcon = isAdmin ? '🛡️' : '🆘';

    return (
        <div style={s.page}>
            <div style={s.formWrap}>

                {/* Back */}
                <button style={s.backBtn} onClick={() => reset(isAdmin ? 'landing' : 'landing')}>
                    ← Back
                </button>

                {/* Header */}
                <div style={s.formHeader}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{portalIcon}</div>
                    <h2 style={{ ...s.formTitle, color: accent }}>{portalName}</h2>
                    <p style={s.formSub}>SafeLink Emergency Response</p>
                </div>

                {/* Login / Register tabs */}
                <div style={s.tabs}>
                    <button
                        style={{ ...s.tab, ...(isRegister ? {} : { borderBottom: `2px solid ${accent}`, color: accent }) }}
                        onClick={() => reset(isAdmin ? 'admin-login' : 'user-login')}>
                        Login
                    </button>
                    <button
                        style={{ ...s.tab, ...(isRegister ? { borderBottom: `2px solid ${accent}`, color: accent } : {}) }}
                        onClick={() => reset(isAdmin ? 'admin-register' : 'user-register')}>
                        {isAdmin ? 'Create Admin' : 'Register'}
                    </button>
                </div>

                {/* Special notice for admin register */}
                {step === 'admin-register' && (
                    <div style={{ ...s.infoBox, borderColor: '#FF3B3B44', background: '#FF3B3B11', color: '#FF3B3B' }}>
                        ℹ️ Admin accounts require an email ending in <strong>@admin.safelink</strong><br />
                        e.g. <code style={s.code}>yourname@admin.safelink</code>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={s.form} noValidate>
                    {isRegister && (
                        <div style={s.fg}>
                            <label style={s.label}>Full Name</label>
                            <input style={s.input} type="text" placeholder="Enter your full name"
                                value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    )}

                    <div style={s.fg}>
                        <label style={s.label}>Email Address</label>
                        <input style={s.input} type="email"
                            placeholder={isAdmin ? 'name@admin.safelink' : 'your@email.com'}
                            value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div style={s.fg}>
                        <label style={s.label}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input style={{ ...s.input, paddingRight: 44 }}
                                type={showPw ? 'text' : 'password'}
                                placeholder={isRegister ? 'Min. 6 characters' : 'Enter your password'}
                                value={password} onChange={e => setPassword(e.target.value)} required />
                            <button type="button"
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 16 }}
                                onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</button>
                        </div>
                    </div>

                    {isRegister && (
                        <div style={s.fg}>
                            <label style={s.label}>Confirm Password</label>
                            <input style={s.input} type={showPw ? 'text' : 'password'} placeholder="Re-enter your password"
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ ...s.msgBox, background: '#FF3B3B11', borderColor: '#FF3B3B44', color: '#FF3B3B' }}>
                            ❌ {error}
                        </div>
                    )}
                    {/* Success */}
                    {success && (
                        <div style={{ ...s.msgBox, background: '#10B98111', borderColor: '#10B98144', color: '#10B981' }}>
                            ✅ {success}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        style={{ ...s.submitBtn, background: accent, opacity: loading ? 0.7 : 1 }}>
                        {loading
                            ? (isRegister ? 'Creating account…' : 'Signing in…')
                            : (isRegister ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                {/* Divider with alternate action */}
                <div style={s.divider}>
                    <span style={s.dividerLine} />
                    <span style={s.dividerText}>{isRegister ? 'Already have an account?' : 'New here?'}</span>
                    <span style={s.dividerLine} />
                </div>
                <button style={{ ...s.altBtn, borderColor: accent, color: accent }}
                    onClick={() => reset(isRegister
                        ? (isAdmin ? 'admin-login' : 'user-login')
                        : (isAdmin ? 'admin-register' : 'user-register'))}>
                    {isRegister ? 'Sign In Instead' : (isAdmin ? 'Create Admin Account' : 'Create New Account')}
                </button>

            </div>
        </div>
    );
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', background: 'linear-gradient(135deg, #0A0E1A 0%, #0D1324 50%, #0A0E1A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px',
    },

    /* Landing */
    landingWrap: { width: '100%', maxWidth: 860, textAlign: 'center' },
    logo: { marginBottom: 32 },
    logoTitle: { fontSize: 48, fontWeight: 900, color: '#FF3B3B', letterSpacing: 4, margin: '12px 0 6px' },
    logoSub: { color: '#888', fontSize: 16 },
    prompt: { color: '#666', fontSize: 15, marginBottom: 28 },
    portalRow: { display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' },
    portalCard: {
        background: '#151928', border: '1px solid #252c43', borderRadius: 20,
        padding: '32px 28px', width: 340, textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 0,
        transition: 'transform .2s, box-shadow .2s',
    },
    portalCardTitle: { fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 },
    portalCardSub: { fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24, flexGrow: 1 },
    portalBtn: { color: '#fff', borderRadius: 10, padding: '12px 20px', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', textAlign: 'center' },
    footNote: { color: '#333', fontSize: 12, marginTop: 40 },

    /* Form card */
    formWrap: {
        background: '#151928', borderRadius: 24, border: '1px solid #252c43',
        padding: '40px 36px', width: '100%', maxWidth: 440,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)', position: 'relative',
    },
    backBtn: {
        background: 'none', border: 'none', color: '#888', cursor: 'pointer',
        fontSize: 14, fontWeight: 600, padding: '0 0 16px', display: 'block',
    },
    formHeader: { textAlign: 'center', marginBottom: 24 },
    formTitle: { fontSize: 26, fontWeight: 900, margin: '0 0 4px', letterSpacing: 1 },
    formSub: { color: '#888', fontSize: 13 },
    tabs: { display: 'flex', borderBottom: '1px solid #252c43', marginBottom: 24 },
    tab: { flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#888', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .2s' },
    infoBox: { borderRadius: 10, border: '1px solid', padding: '12px 14px', fontSize: 13, lineHeight: 1.6, marginBottom: 20 },
    code: { background: '#0A0E1A', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    fg: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 13, fontWeight: 600, color: '#aaa' },
    input: {
        background: '#1E2438', border: '1px solid #2A3050', borderRadius: 10,
        padding: '13px 14px', color: '#fff', fontSize: 15, outline: 'none',
        width: '100%', boxSizing: 'border-box', transition: 'border-color .2s',
    },
    msgBox: { borderRadius: 10, border: '1px solid', padding: '10px 14px', fontSize: 14, lineHeight: 1.5 },
    submitBtn: {
        border: 'none', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: 16,
        color: '#fff', cursor: 'pointer', width: '100%', marginTop: 4, transition: 'opacity .2s',
    },
    divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' },
    dividerLine: { flex: 1, height: 1, background: '#252c43' },
    dividerText: { color: '#555', fontSize: 13, whiteSpace: 'nowrap' },
    altBtn: {
        width: '100%', background: 'transparent', borderRadius: 10, padding: '12px',
        fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '1px solid', transition: 'opacity .2s',
    },
};
