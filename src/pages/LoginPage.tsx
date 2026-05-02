import { APP_FULL_VERSION, APP_LOCATION } from '../constants/appVersion';
import { AlertTriangle, ChevronDown, Eye, EyeOff, KeyRound, Lightbulb, Lock, Moon, Sun } from 'lucide-react';
import { ContentLucideIcon } from '../components/icons/ContentLucideIcon';

import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/store';
import { signInWithRole } from '../services/firebase/auth';

type UserRole = 'superadmin' | 'admin' | 'viewer';

interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
  firebaseUid?: string;
  email?: string;
}

const LOGIN_LOCKOUT_KEY = 'hrms_login_attempts';
const USERNAME_HISTORY_KEY = 'hrms_username_history';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000;
const MAX_USERNAME_HISTORY = 6;

interface LoginAttempts {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const nowTs = () => {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

const getLoginAttempts = (username: string): LoginAttempts => {
  try {
    const raw = localStorage.getItem(`${LOGIN_LOCKOUT_KEY}_${username}`);
    if (!raw) return { count: 0, firstAttemptAt: Date.now() };
    return JSON.parse(raw);
  } catch {
    return { count: 0, firstAttemptAt: Date.now() };
  }
};

const setLoginAttempts = (username: string, data: LoginAttempts) => {
  try { localStorage.setItem(`${LOGIN_LOCKOUT_KEY}_${username}`, JSON.stringify(data)); } catch { /* ignore */ }
};
const clearLoginAttempts = (username: string) => {
  try { localStorage.removeItem(`${LOGIN_LOCKOUT_KEY}_${username}`); } catch { /* ignore */ }
};

const getUsernameHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(USERNAME_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const addUsernameHistory = (name: string) => {
  const u = name.trim();
  if (!u) return;
  try {
    const prev = getUsernameHistory();
    const next = [u, ...prev.filter((x) => x.toLowerCase() !== u.toLowerCase())].slice(0, MAX_USERNAME_HISTORY);
    localStorage.setItem(USERNAME_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage failure
  }
};

const removeUsernameHistoryItem = (name: string) => {
  const key = name.trim().toLowerCase();
  if (!key) return;
  try {
    const next = getUsernameHistory().filter((u) => u.trim().toLowerCase() !== key);
    localStorage.setItem(USERNAME_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage failure
  }
};

export function LoginPage({
  appUsers,
  onLogin,
  companyName,
  verifyLegacyPassword,
  dark,
  onToggleTheme,
}: {
  appUsers: AppUser[];
  onLogin: (user: AppUser) => void;
  companyName: string;
  verifyLegacyPassword: (plain: string, stored: string) => Promise<boolean>;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [usernameHistory, setUsernameHistory] = useState<string[]>(() => getUsernameHistory());
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const id = setInterval(() => {
      setLockoutRemaining((r) => {
        const next = r - 1;
        if (next <= 0) clearInterval(id);
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutRemaining]);

  useEffect(() => {
    if (!username) { setLockoutRemaining(0); return; }
    const data = getLoginAttempts(username);
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      setLockoutRemaining(Math.ceil((data.lockedUntil - Date.now()) / 1000));
    } else {
      setLockoutRemaining(0);
    }
  }, [username]);

  const handleLogin = async () => {
    if (!username || !password) { setError(t('Username dan password harus diisi.', 'Username and password are required.')); return; }

    const attempts = getLoginAttempts(username);
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const secs = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      setLockoutRemaining(secs);
      setError(`${t('Akun dikunci sementara. Coba lagi dalam', 'Account is temporarily locked. Try again in')} ${Math.ceil(secs / 60)} ${t('menit.', 'minutes.')}`);
      return;
    }

    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 300));

    try {
      const authRes = await signInWithRole(username, password);
      const fromAppUsers = appUsers.find((u) =>
        u.firebaseUid === authRes.uid ||
        u.email === authRes.email ||
        u.username.toLowerCase() === username.toLowerCase()
      );
      const resolvedUser: AppUser = fromAppUsers
        ? {
            ...fromAppUsers,
            firebaseUid: authRes.uid,
            email: authRes.email || fromAppUsers.email,
            role: fromAppUsers.role || authRes.role,
          }
        : {
            id: authRes.uid,
            firebaseUid: authRes.uid,
            username: authRes.email || username,
            email: authRes.email || undefined,
            passwordHash: '',
            role: authRes.role,
            displayName: authRes.email?.split('@')[0] || username,
            createdAt: nowTs(),
          };
      clearLoginAttempts(username);
      setLockoutRemaining(0);
      addUsernameHistory(username);
      setUsernameHistory(getUsernameHistory());
      onLogin(resolvedUser);
      setLoading(false);
      return;
    } catch {
      // fallback to legacy account verification
    }

    const normalizedUsername = username.trim().toLowerCase();
    const candidate = appUsers.find((u) => u.username.trim().toLowerCase() === normalizedUsername);
    if (!candidate) {
      setError(t('Username atau password salah.', 'Invalid username or password.'));
      setLoading(false);
      return;
    }
    const ok = await verifyLegacyPassword(password, candidate.passwordHash);
    if (ok) {
      clearLoginAttempts(username);
      setLockoutRemaining(0);
      addUsernameHistory(username);
      setUsernameHistory(getUsernameHistory());
      onLogin(candidate);
    } else {
      const newCount = (attempts.count || 0) + 1;
      const firstAt = attempts.firstAttemptAt || Date.now();
      const remaining = MAX_LOGIN_ATTEMPTS - newCount;
      if (newCount >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLoginAttempts(username, { count: newCount, firstAttemptAt: firstAt, lockedUntil });
        setLockoutRemaining(LOCKOUT_DURATION_MS / 1000);
        setError(t('Terlalu banyak percobaan gagal. Akun dikunci selama 10 menit.', 'Too many failed attempts. Account is locked for 10 minutes.'));
      } else {
        setLoginAttempts(username, { count: newCount, firstAttemptAt: firstAt });
        setError(`${t('Username atau password salah.', 'Invalid username or password.')} ${remaining} ${t('percobaan tersisa.', 'attempts remaining.')}`);
      }
    }
    setLoading(false);
  };

  const inp = 'w-full h-12 px-4 bg-white/80 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition placeholder:text-slate-400';

  return (
    <div className="login-shell h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-[#003d6e] via-[#005A9E] to-[#0077CC] flex items-center justify-center p-4 overflow-hidden overscroll-none transition-[background] duration-200 ease-out" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div className="login-grid absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)', backgroundSize: '50px 50px' }} />
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" style={{ animation: 'floatBlob 12s ease-in-out infinite' }} />
      <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-blue-200/20 blur-3xl pointer-events-none" style={{ animation: 'floatBlob 14s ease-in-out infinite reverse' }} />
      <button
        type="button"
        onClick={onToggleTheme}
        className="absolute top-4 right-4 z-20 h-10 px-3 rounded-xl border border-white/30 bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xs font-semibold transition inline-flex items-center gap-2"
        title={dark ? t('Ganti ke mode terang', 'Switch to light mode') : t('Ganti ke mode gelap', 'Switch to dark mode')}
      >
        <ContentLucideIcon icon={dark ? Sun : Moon} size={14} variant="toolbar" className="text-white" />
        {dark ? t('Light', 'Light') : t('Dark', 'Dark')}
      </button>
      <div className="w-full max-w-sm relative" style={{ animation: 'slideUp .55s ease-out' }}>
        <div className="text-center mb-8" style={{ animation: 'fadeIn .6s ease-out' }}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-xl" style={{ animation: 'softPulse 3.5s ease-in-out infinite' }}>
            <img src="/fmlogo.png" alt="FM Logo" className="w-14 h-14" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight transition-colors duration-200 ease-out">{companyName}</h1>
          <p className="login-title-sub text-blue-200 text-sm mt-1 transition-colors duration-200 ease-out">{t('HR Management System', 'HR Management System')}</p>
        </div>

        <div className="login-card bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/50 relative transition-[background-color,border-color,box-shadow] duration-200 ease-out" style={{ animation: 'scaleIn .45s ease-out' }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#005A9E]/35 to-transparent" />
          <div className="px-6 pt-6 pb-2">
            <h2 className="login-card-title text-lg font-bold text-slate-800 transition-colors duration-200 ease-out">{t('Selamat Datang', 'Welcome')}</h2>
            <p className="login-card-subtitle text-sm text-slate-400 mt-0.5 transition-colors duration-200 ease-out">{t('Masuk untuk melanjutkan', 'Sign in to continue')}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
              <div className="relative">
                <input
                  className={`${inp} pr-10 focus:scale-[1.01]`}
                  placeholder={t('Masukkan username', 'Enter username')}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 120)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowUserDropdown((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"
                >
                  <ContentLucideIcon icon={ChevronDown} size={14} variant="toolbar" />
                </button>
                {showUserDropdown && usernameHistory.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200/80 bg-slate-50/95 overflow-hidden shadow-lg">
                    <div className="max-h-36 overflow-y-auto">
                      {usernameHistory.slice(0, 6).map((u) => (
                        <div key={u} className="h-8 px-2.5 border-b last:border-b-0 border-slate-200/70 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setUsername(u); setError(''); setShowUserDropdown(false); }}
                            className="flex-1 text-left text-[12px] text-slate-700 font-semibold hover:text-[#005A9E] truncate transition"
                            title={u}
                          >
                            {u}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeUsernameHistoryItem(u);
                              setUsernameHistory(getUsernameHistory());
                            }}
                            className="w-5 h-5 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[11px] leading-none inline-flex items-center justify-center transition"
                            aria-label={`${t('Hapus', 'Remove')} ${u}`}
                            title={t('Hapus dari riwayat', 'Remove from history')}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Password', 'Password')}</label>
              <input type={showPw ? 'text' : 'password'} className={`${inp} focus:scale-[1.01]`} placeholder={t('Masukkan password', 'Enter password')} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition text-sm">
                {showPw ? <ContentLucideIcon icon={EyeOff} size={14} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={14} variant="toolbar" />}
              </button>
            </div>
            {error && <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><ContentLucideIcon icon={AlertTriangle} size={14} variant="toolbar" /> {error}</div>}
            {lockoutRemaining > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-700 font-semibold">
                <ContentLucideIcon icon={Lock} size={14} variant="toolbar" />
                {t('Akun dikunci · Buka dalam', 'Account locked · Unlock in')} <span className="font-bold font-mono">{Math.floor(lockoutRemaining / 60)}:{String(lockoutRemaining % 60).padStart(2, '0')}</span>
              </div>
            )}
            <button type="button" onClick={handleLogin} disabled={loading || lockoutRemaining > 0} className="w-full h-12 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#005A9E]/30 hover:shadow-xl hover:shadow-[#005A9E]/40">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {lockoutRemaining > 0 ? <><ContentLucideIcon icon={Lock} size={14} variant="toolbar" className="text-white" /> {t('Akun Dikunci', 'Account Locked')}</> : loading ? t('Memverifikasi...', 'Verifying...') : <><ContentLucideIcon icon={KeyRound} size={14} variant="toolbar" className="text-white" /> {t('Masuk', 'Sign In')}</>}
            </button>
          </div>
          <div className="login-help px-6 pb-5 text-center text-xs text-slate-400 transition-colors duration-200 ease-out">{t('Hubungi administrator untuk reset password', 'Contact administrator to reset password')}</div>
        </div>

        {appUsers.length === 0 && <div className="mt-4 px-4 py-3 bg-amber-500/20 backdrop-blur rounded-xl text-amber-100 text-xs text-center inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Lightbulb} size={12} variant="toolbar" className="text-amber-100" /> {t('Silakan hubungi administrator untuk akun pertama', 'Please contact administrator for the first account')}</div>}
        <p className="login-footnote text-center text-blue-200/60 text-[11px] mt-6 transition-colors duration-200 ease-out">{companyName} · {APP_FULL_VERSION} · {APP_LOCATION}</p>
      </div>

      <style>{`
        @keyframes scaleIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes softPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }
        @keyframes floatBlob { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-16px,0)} }
        [data-theme="dark"] .login-shell {
          background:
            radial-gradient(1200px 520px at 82% -8%, rgba(59,130,246,.22) 0%, rgba(59,130,246,0) 58%),
            radial-gradient(900px 460px at -6% 10%, rgba(14,165,233,.16) 0%, rgba(14,165,233,0) 62%),
            linear-gradient(135deg, #050b14 0%, #0a1424 45%, #0f1b2f 100%);
        }
        [data-theme="dark"] .login-grid { opacity: .1; }
        [data-theme="dark"] .login-card {
          background: linear-gradient(180deg, rgba(12, 21, 38, .92), rgba(11, 27, 48, .9));
          border-color: rgba(100, 116, 139, .34);
          box-shadow: 0 24px 48px -20px rgba(2, 6, 23, .85), inset 0 1px 0 rgba(148, 163, 184, .18);
        }
        [data-theme="dark"] .login-card-title { color: #e2e8f0; }
        [data-theme="dark"] .login-card-subtitle { color: #9fb1c9; }
        [data-theme="dark"] .login-title-sub { color: #9ec5ff; }
        [data-theme="dark"] .login-help { color: #8ea4ba !important; }
        [data-theme="dark"] .login-footnote { color: rgba(148, 163, 184, .78); }
        [data-theme="dark"] .login-shell input,
        [data-theme="dark"] .login-shell textarea,
        [data-theme="dark"] .login-shell select {
          background: rgba(15, 30, 52, .78) !important;
          border-color: rgba(71, 85, 105, .62) !important;
          color: #e2e8f0 !important;
        }
        [data-theme="dark"] .login-shell input::placeholder,
        [data-theme="dark"] .login-shell textarea::placeholder {
          color: #7f93ab !important;
        }
        [data-theme="dark"] .login-shell input:focus,
        [data-theme="dark"] .login-shell textarea:focus,
        [data-theme="dark"] .login-shell select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,.22) !important;
        }
        [data-theme="dark"] .login-shell button.bg-\\[\\#005A9E\\] {
          background: linear-gradient(135deg, #0b5fa7, #0a4f90) !important;
          box-shadow: 0 12px 24px -14px rgba(14, 116, 214, .75) !important;
        }
        [data-theme="dark"] .login-shell button.bg-\\[\\#005A9E\\]:hover {
          background: linear-gradient(135deg, #0c6dbe, #0b5b9f) !important;
        }
        [data-theme="dark"] .login-shell .bg-slate-50\\/80 {
          background: rgba(22, 37, 62, .78) !important;
        }
        [data-theme="dark"] .login-shell .border-slate-200\\/80 {
          border-color: rgba(71, 85, 105, .5) !important;
        }
        [data-theme="dark"] .login-shell .bg-slate-100 {
          background: rgba(30, 47, 74, .88) !important;
        }
        [data-theme="dark"] .login-shell .hover\\:bg-slate-200:hover {
          background: rgba(42, 63, 94, .95) !important;
        }
        [data-theme="dark"] .login-shell .bg-white {
          background: rgba(228, 236, 247, .92) !important;
        }
        [data-theme="dark"] .login-shell .text-slate-600 {
          color: #4e6178 !important;
        }
        [data-theme="dark"] .login-shell .border-white\\/30 {
          border-color: rgba(148, 163, 184, .32) !important;
        }
        [data-theme="dark"] .login-shell .bg-white\\/15 {
          background: rgba(15, 30, 52, .62) !important;
        }
        [data-theme="dark"] .login-shell .hover\\:bg-white\\/25:hover {
          background: rgba(30, 47, 74, .82) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
