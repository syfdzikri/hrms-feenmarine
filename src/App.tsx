/**
 * PT Feen Marine — HR Management System v8.0
 * Firebase Realtime Database + Full Auth + Overseas Monitor + Auto Leave Accrual
 *
 * Features:
 * - Login system with role-based access (Super Admin, Admin, Viewer)
 * - Auto logout after inactivity
 * - Leave quota auto-increment monthly based on contract date
 * - Overseas monitoring (Commissioning / Service)
 * - Configuration page
 * - [NEW] Kalender Cuti & Overseas terintegrasi
 * - [NEW] Dashboard Analytics (bar chart per departemen)
 * - [NEW] Pencarian Global (karyawan + log + overseas)
 * - Professional UI/UX
 *
 * Install: npm install firebase
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, off, DataSnapshot  } from 'firebase/database';

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDJVqxezqWthIg6Lixkrhw-tlWo_uf8WFw",
  authDomain: "feen-marine-hr.firebaseapp.com",
  databaseURL: "https://feen-marine-hr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "feen-marine-hr",
  storageBucket: "feen-marine-hr.firebasestorage.app",
  messagingSenderId: "912900137932",
  appId: "1:912900137932:web:2857c21d0573522630b369",
};
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(firebaseApp);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPARTMENTS = ["Electrical & Automation", "Engineering", "Operations", "Finance & Admin", "Procurement"];
const OVERSEAS_TYPES = ["Commissioning", "Service", "Mengurus Visa", "Other"] as const;
const FAT_CLASSES = ["ClassNK", "DNV", "LR", "BV", "ABS", "RINA"] as const;
const AUTO_LOGOUT_MINUTES = 30;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type UserRole = 'superadmin' | 'admin' | 'viewer';

interface AppUser {
  id: string;
  username: string;
  passwordHash: string; // simple hash
  role: UserRole;
  displayName: string;
  createdAt: string;
  linkedEmployeeName?: string; // nama karyawan yang terhubung ke user ini
}

interface Employee {
  id: string;
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  terpakai: number;
  lastAccrualMonth?: string; // YYYY-MM format to track monthly accrual
  posisi?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  nama: string;
  departemen: string;
  tglCuti: string;
  keterangan: string;
}

interface OverseasEntry {
  id: string;
  nama: string;
  departemen: string;
  tipe: typeof OVERSEAS_TYPES[number];
  projectNo: string;
  lokasi: string;
  tglMulai: string;
  tglSelesai: string;
  keterangan?: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'completed' | 'upcoming';
}

interface AppConfig {
  companyName: string;
  monthlyAccrualDays: number;
  maxLeaveBalance: number;
  autoLogoutMinutes: number;
  departments: string[];
}

type ToastKind = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: string; msg: string; kind: ToastKind; }
type SortCol = 'nama' | 'departemen' | 'tglKontrak' | 'jatahAwal' | 'terpakai' | 'sisa';
type HistSortCol = 'timestamp' | 'nama' | 'departemen' | 'tglCuti' | 'keterangan' | '';
type ActivePage = 'dashboard' | 'history' | 'overseas' | 'fat' | 'calendar' | 'analytics' | 'config' | 'users';

interface FATEntry {
  id: string;
  projectNo: string;
  fatClass: typeof FAT_CLASSES[number];
  fatDateTime: string; // ISO datetime string
  assignedTo: string;  // employee name
  keterangan?: string;
  createdAt: string;
  createdBy: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  if (!d) return '-';
  const M = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2,'0')} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
};
const countDays = (a: string, b: string) =>
  Math.floor((new Date(b+'T00:00:00').getTime() - new Date(a+'T00:00:00').getTime()) / 86400000) + 1;
const nowTs = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
};
const todayStr = () => new Date().toISOString().slice(0,10);
const uid = (p = 'id') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

// Simple hash for password (NOT for production — use Firebase Auth for real security)
const simpleHash = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

const statusTag = (sisa: number) =>
  sisa <= 0 ? { label:'Habis',       badge:'bg-red-100 text-red-700 border border-red-200',       row:'bg-red-50'    } :
  sisa <= 3 ? { label:`Sisa ${sisa}`, badge:'bg-amber-100 text-amber-700 border border-amber-200', row:'bg-amber-50' } :
              { label:`Sisa ${sisa}`, badge:'bg-emerald-100 text-emerald-700 border border-emerald-200', row:'bg-emerald-50'  };

const roleLabel: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer'
};
const roleBadge: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200'
};

// Permissions
const can = (role: UserRole | null, action: 'write' | 'delete' | 'config' | 'manageUsers') => {
  if (!role) return false;
  if (role === 'superadmin') return true;
  if (role === 'admin') return action === 'write';
  return false; // viewer: read only
};

// Cek apakah user boleh edit karyawan tertentu (karyawan bisa edit data dirinya sendiri di dashboard cuti)
const canEditOwnLeave = (currentUser: AppUser | null, empNama: string): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'superadmin' || currentUser.role === 'admin') return true;
  // Viewer: hanya bisa log cuti milik sendiri jika linkedEmployeeName cocok
  return !!(currentUser.linkedEmployeeName && currentUser.linkedEmployeeName === empNama);
};

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(''); const [date, setDate] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const D = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
      const M = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      setDate(`${D[n.getDay()]}, ${String(n.getDate()).padStart(2,'0')} ${M[n.getMonth()]} ${n.getFullYear()}`);
      setTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return { time, date };
}

// ─── FIREBASE HOOK ────────────────────────────────────────────────────────────
function useFirebase() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs,      setLogs]      = useState<LogEntry[]>([]);
  const [overseas,  setOverseas]  = useState<OverseasEntry[]>([]);
  const [appUsers,  setAppUsers]  = useState<AppUser[]>([]);
  const [fatEntries, setFatEntries] = useState<FATEntry[]>([]);
  const [config,    setConfig]    = useState<AppConfig>({
    companyName: 'PT Feen Marine',
    monthlyAccrualDays: 1,
    maxLeaveBalance: 24,
    autoLogoutMinutes: 30,
    departments: DEPARTMENTS,
  });
  const [syncing,   setSyncing]   = useState(true);
  const [online,    setOnline]    = useState(true);

  useEffect(() => {
    const empRef   = ref(db, 'employees');
    const logRef   = ref(db, 'logs');
    const connRef  = ref(db, '.info/connected');
    const ovsRef   = ref(db, 'overseas');
    const usrRef   = ref(db, 'appUsers');
    const cfgRef   = ref(db, 'config');
    const fatRef   = ref(db, 'fatEntries');

    onValue(empRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,Employee>|null;
      setEmployees(data ? Object.values(data) : []);
      setSyncing(false);
    }, () => { setSyncing(false); setOnline(false); });

    onValue(logRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,LogEntry>|null;
      setLogs(data ? Object.values(data).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,500) : []);
    });

    onValue(ovsRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,OverseasEntry>|null;
      setOverseas(data ? Object.values(data).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)) : []);
    });

    onValue(usrRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,AppUser>|null;
      setAppUsers(data ? Object.values(data) : []);
    });

    onValue(cfgRef, (snap: DataSnapshot) => {
      const data = snap.val() as AppConfig|null;
      if (data) setConfig(data);
    });

    onValue(fatRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,FATEntry>|null;
      setFatEntries(data ? Object.values(data).sort((a,b)=>a.fatDateTime.localeCompare(b.fatDateTime)) : []);
    });

    onValue(connRef, (snap: DataSnapshot) => setOnline(!!snap.val()));

    return () => { off(empRef); off(logRef); off(connRef); off(ovsRef); off(usrRef); off(cfgRef); off(fatRef); };
  }, []);

  const fbSaveEmployee   = useCallback(async (e: Employee)       => set(ref(db,`employees/${e.id}`), e), []);
  const fbDeleteEmployee = useCallback(async (id: string)        => remove(ref(db,`employees/${id}`)), []);
  const fbAddLog         = useCallback(async (entry: Omit<LogEntry,'id'>) => { const id=uid('log'); return set(ref(db,`logs/${id}`),{...entry,id}); }, []);
  const fbClearLogs      = useCallback(async ()                  => remove(ref(db,'logs')), []);
  const fbSaveOverseas   = useCallback(async (o: OverseasEntry)  => set(ref(db,`overseas/${o.id}`), o), []);
  const fbDeleteOverseas = useCallback(async (id: string)        => remove(ref(db,`overseas/${id}`)), []);
  const fbSaveUser       = useCallback(async (u: AppUser)        => set(ref(db,`appUsers/${u.id}`), u), []);
  const fbDeleteUser     = useCallback(async (id: string)        => remove(ref(db,`appUsers/${id}`)), []);
  const fbSaveConfig     = useCallback(async (c: AppConfig)      => set(ref(db,'config'), c), []);
  const fbSaveFAT        = useCallback(async (f: FATEntry)       => set(ref(db,`fatEntries/${f.id}`), f), []);
  const fbDeleteFAT      = useCallback(async (id: string)        => remove(ref(db,`fatEntries/${id}`)), []);

  return {
    employees, logs, overseas, appUsers, config, fatEntries, syncing, online,
    fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs,
    fbSaveOverseas, fbDeleteOverseas, fbSaveUser, fbDeleteUser, fbSaveConfig,
    fbSaveFAT, fbDeleteFAT
  };
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
const TSTYLE: Record<ToastKind,string> = {
  success:'bg-emerald-50 border-emerald-500 text-emerald-700',
  error:  'bg-red-50 border-red-500 text-red-700',
  warning:'bg-amber-50 border-amber-500 text-amber-700',
  info:   'bg-blue-50 border-blue-500 text-blue-700',
};
const TICON: Record<ToastKind,string> = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };

function ToastContainer({ toasts, onRemove }: { toasts:ToastItem[]; onRemove:(id:string)=>void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} onClick={()=>onRemove(t.id)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-l-4 text-sm font-semibold shadow-xl pointer-events-auto max-w-[320px] ${TSTYLE[t.kind]}`}
          style={{animation:'slideUp .25s ease-out', background:'white'}}>
          <span className="font-bold flex-shrink-0 text-base">{TICON[t.kind]}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, msg, danger, onOk, onCancel }:
  { open:boolean; title:string; msg:string; danger:boolean; onOk:()=>void; onCancel:()=>void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className={`px-5 py-4 flex items-center gap-3 ${danger?'bg-red-50':'bg-slate-50'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${danger?'bg-red-100':'bg-blue-100'}`}>
            {danger?'⚠️':'❓'}
          </div>
          <h3 className="font-bold text-base text-slate-800">{title}</h3>
        </div>
        <div className="px-5 py-4"><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{msg}</p></div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">Batal</button>
          <button onClick={onOk} className={`flex-1 h-11 rounded-xl text-white text-sm font-bold active:scale-95 transition ${danger?'bg-red-600 hover:bg-red-700':'bg-[#005A9E] hover:bg-[#004880]'}`}>Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT EMPLOYEE DIALOG ─────────────────────────────────────────────────────
function EditDialog({ open, employee, departments, onSave, onClose }:
  { open:boolean; employee:Employee|null; departments:string[]; onSave:(d:Partial<Employee>)=>void; onClose:()=>void }) {
  const [nama,  setNama]  = useState('');
  const [dept,  setDept]  = useState(departments[0] || '');
  const [tgl,   setTgl]   = useState('');
  const [jatah, setJatah] = useState(12);
  const [posisi, setPosisi] = useState('');

  useEffect(() => {
    if (employee) {
      setNama(employee.nama);
      setDept(employee.departemen);
      setTgl(employee.tglKontrak);
      setJatah(employee.jatahAwal);
      setPosisi(employee.posisi || '');
    } else {
      setNama(''); setDept(departments[0] || ''); setTgl(''); setJatah(12); setPosisi('');
    }
  }, [employee, open]);

  if (!open) return null;
  const inp = "w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:bg-white focus:ring-2 focus:ring-[#005A9E]/10 transition";
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-base">✏️</div>
            <h3 className="font-bold text-base text-slate-800">{employee ? 'Edit Data Karyawan' : 'Tambah Karyawan'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-lg">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Karyawan *</label>
            <input className={inp} placeholder="Nama lengkap" value={nama} onChange={e=>setNama(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Posisi / Jabatan</label>
            <input className={inp} placeholder="Contoh: Electrical Engineer" value={posisi} onChange={e=>setPosisi(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Departemen *</label>
            <select className={inp} value={dept} onChange={e=>setDept(e.target.value)}>
              {departments.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal Kontrak *</label>
              <input type="date" className={inp} value={tgl} onChange={e=>setTgl(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Jatah Cuti (Hari)</label>
              <input type="number" min={0} className={inp} value={jatah} onChange={e=>setJatah(parseInt(e.target.value)||0)} />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">Batal</button>
          <button onClick={()=>{ if(nama.trim() && dept && tgl) onSave({nama:nama.trim(),departemen:dept,tglKontrak:tgl,jatahAwal:jatah,posisi:posisi.trim()}); }}
            className="flex-1 h-11 rounded-xl bg-[#005A9E] text-white text-sm font-bold hover:bg-[#004880] active:scale-95 transition">
            💾 Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ appUsers, onLogin, companyName }: {
  appUsers: AppUser[];
  onLogin: (user: AppUser) => void;
  companyName: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Username dan password harus diisi.'); return; }
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 500));
    const hash = simpleHash(password);
    const user = appUsers.find(u => u.username === username && u.passwordHash === hash);
    if (user) {
      onLogin(user);
    } else {
      setError('Username atau password salah.');
    }
    setLoading(false);
  };

  const inp = "w-full h-12 px-4 bg-white/80 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition placeholder:text-slate-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003d6e] via-[#005A9E] to-[#0077CC] flex items-center justify-center p-4"
      style={{fontFamily:"'DM Sans',sans-serif"}}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 25px 25px, white 2px, transparent 0)', backgroundSize:'50px 50px'}} />

      <div className="w-full max-w-sm relative">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-xl">
            <img src="https://i.imgur.com/placeholder.png" alt="logo"
              className="w-12 h-12 object-contain"
              onError={e=>{(e.target as HTMLImageElement).style.display='none';}}
            />
            <span className="text-4xl" style={{display:'block', position:'absolute'}}>⚓</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{companyName}</h1>
          <p className="text-blue-200 text-sm mt-1">HR Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-bold text-slate-800">Selamat Datang</h2>
            <p className="text-sm text-slate-400 mt-0.5">Masuk untuk melanjutkan</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
              <input className={inp} placeholder="Masukkan username" value={username}
                onChange={e=>{setUsername(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
              <input type={showPw?'text':'password'} className={inp} placeholder="Masukkan password" value={password}
                onChange={e=>{setPassword(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
              <button type="button" onClick={()=>setShowPw(!showPw)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition text-sm">
                {showPw?'🙈':'👁'}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <span>⚠️</span> {error}
              </div>
            )}
            <button onClick={handleLogin} disabled={loading}
              className="w-full h-12 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Memverifikasi...' : '🔐 Masuk'}
            </button>
          </div>
          <div className="px-6 pb-5 text-center text-xs text-slate-400">
            Hubungi administrator untuk reset password
          </div>
        </div>

        {/* Default credentials hint for first-time setup */}
        {appUsers.length === 0 && (
          <div className="mt-4 px-4 py-3 bg-amber-500/20 backdrop-blur rounded-xl text-amber-100 text-xs text-center">
            💡 Setup pertama: gunakan <strong>admin</strong> / <strong>admin123</strong>
          </div>
        )}
        <p className="text-center text-blue-200/60 text-[11px] mt-6">
          {companyName} · HRMS v8.0 · Batam
        </p>
      </div>

      <style>{`
        @keyframes scaleIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ─── OVERSEAS FORM DIALOG ─────────────────────────────────────────────────────
function OverseasDialog({ open, entry, employees, onSave, onClose }: {
  open: boolean;
  entry: OverseasEntry | null;
  employees: Employee[];
  currentUser: AppUser;
  onSave: (data: Omit<OverseasEntry,'id'|'createdAt'|'createdBy'>) => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState('');
  const [dept, setDept] = useState('');
  const [tipe, setTipe] = useState<typeof OVERSEAS_TYPES[number]>('Commissioning');
  const [projectNo, setProjectNo] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [tglMulai, setTglMulai] = useState(todayStr());
  const [tglSelesai, setTglSelesai] = useState(todayStr());
  const [ket, setKet] = useState('');
  const [status, setStatus] = useState<'active'|'completed'|'upcoming'>('upcoming');

  useEffect(() => {
    if (entry) {
      setNama(entry.nama); setDept(entry.departemen); setTipe(entry.tipe);
      setProjectNo(entry.projectNo); setLokasi(entry.lokasi);
      setTglMulai(entry.tglMulai); setTglSelesai(entry.tglSelesai);
      setKet(entry.keterangan||''); setStatus(entry.status);
    } else {
      setNama(''); setDept(''); setTipe('Commissioning'); setProjectNo('');
      setLokasi(''); setTglMulai(todayStr()); setTglSelesai(todayStr()); setKet(''); setStatus('upcoming');
    }
  }, [entry, open]);

  if (!open) return null;
  const inp = "w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition";

  const handleSave = () => {
    if (!nama || !projectNo || !lokasi || !tglMulai || !tglSelesai) return;
    const emp = employees.find(e => e.nama === nama);
    onSave({
      nama, departemen: dept || (emp?.departemen || ''),
      tipe, projectNo, lokasi, tglMulai, tglSelesai,
      keterangan: ket, status
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">✈️</div>
            <h3 className="font-bold text-base text-slate-800">{entry ? 'Edit Overseas' : 'Tambah Overseas'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Karyawan *</label>
              <input list="emp-list" className={inp} placeholder="Nama atau ketik baru" value={nama} onChange={e=>{ setNama(e.target.value); const emp=employees.find(x=>x.nama===e.target.value); if(emp) setDept(emp.departemen); }} />
              <datalist id="emp-list">{employees.map(e=><option key={e.id} value={e.nama}>{e.departemen}</option>)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Departemen</label>
              <input className={inp} value={dept} onChange={e=>setDept(e.target.value)} placeholder="Departemen" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipe Pekerjaan *</label>
              <select className={inp} value={tipe} onChange={e=>setTipe(e.target.value as any)}>
                {OVERSEAS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">No. Proyek *</label>
              <input className={inp} placeholder="FMI-XXX atau FM-XXX" value={projectNo} onChange={e=>setProjectNo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lokasi Tujuan *</label>
            <input className={inp} placeholder="Contoh: Jakarta, Indonesia" value={lokasi} onChange={e=>setLokasi(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal Berangkat *</label>
              <input type="date" className={inp} value={tglMulai} onChange={e=>setTglMulai(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal Kembali *</label>
              <input type="date" className={inp} value={tglSelesai} onChange={e=>setTglSelesai(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
            <select className={inp} value={status} onChange={e=>setStatus(e.target.value as any)}>
              <option value="upcoming">🕐 Upcoming</option>
              <option value="active">🟢 Active / Berlangsung</option>
              <option value="completed">✅ Selesai</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Keterangan (opsional)</label>
            <textarea className={inp + ' h-20 resize-none pt-2.5'} placeholder="Catatan tambahan..." value={ket} onChange={e=>setKet(e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">Batal</button>
          <button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition">
            💾 Simpan
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── FAT DIALOG ───────────────────────────────────────────────────────────────
function FATDialog({ open, entry, automationEngineers, fatEntries, onSave, onClose }: {
  open: boolean;
  entry: FATEntry | null;
  automationEngineers: Employee[];
  fatEntries: FATEntry[];
  onSave: (data: Omit<FATEntry,'id'|'createdAt'|'createdBy'>) => void;
  onClose: () => void;
}) {
  const [projectNo,   setProjectNo]   = useState('');
  const [fatClass,    setFatClass]    = useState<typeof FAT_CLASSES[number]>('ClassNK');
  const [fatDateTime, setFatDateTime] = useState('');
  const [assignedTo,  setAssignedTo]  = useState('');
  const [ket,         setKet]         = useState('');

  // Hitung jumlah FAT per orang (urutan adil)
  const fatCountMap = useMemo(() => {
    const map: Record<string,number> = {};
    automationEngineers.forEach(e => { map[e.nama] = 0; });
    fatEntries.forEach(f => { if (map[f.assignedTo] !== undefined) map[f.assignedTo]++; });
    return map;
  }, [fatEntries, automationEngineers]);

  // Rekomendasi: yang paling sedikit FAT
  const recommendation = useMemo(() => {
    if (automationEngineers.length === 0) return null;
    return Object.entries(fatCountMap).sort((a,b) => a[1]-b[1])[0]?.[0] || null;
  }, [fatCountMap]);

  useEffect(() => {
    if (entry) {
      setProjectNo(entry.projectNo);
      setFatClass(entry.fatClass);
      setFatDateTime(entry.fatDateTime);
      setAssignedTo(entry.assignedTo);
      setKet(entry.keterangan || '');
    } else {
      setProjectNo(''); setFatClass('ClassNK'); setFatDateTime('');
      setAssignedTo(recommendation || ''); setKet('');
    }
  }, [entry, open, recommendation]);

  if (!open) return null;
  const inp = "w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition";

  const handleSave = () => {
    if (!projectNo || !fatDateTime || !assignedTo) return;
    onSave({ projectNo, fatClass, fatDateTime, assignedTo, keterangan: ket });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center">🔬</div>
            <h3 className="font-bold text-base text-slate-800">{entry ? 'Edit Jadwal FAT' : 'Tambah Jadwal FAT'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Rekomendasi */}
          {!entry && recommendation && (
            <div className="px-3 py-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <span className="text-cyan-600 font-bold text-base">💡</span>
                <div>
                  <span className="font-semibold text-cyan-700">Rekomendasi: </span>
                  <span className="text-cyan-800 font-bold">{recommendation}</span>
                  <span className="text-cyan-600 text-xs ml-1">({fatCountMap[recommendation] || 0}x FAT sebelumnya)</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">No. Project *</label>
              <input className={inp} placeholder="FMI-XXX atau FM-XX" value={projectNo} onChange={e=>setProjectNo(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Class *</label>
              <select className={inp} value={fatClass} onChange={e=>setFatClass(e.target.value as any)}>
                {FAT_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal & Waktu FAT *</label>
            <input type="datetime-local" className={inp} value={fatDateTime} onChange={e=>setFatDateTime(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned To (Automation Engineer) *</label>
            <select className={inp} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
              <option value="">-- Pilih Engineer --</option>
              {automationEngineers
                .sort((a,b) => (fatCountMap[a.nama]||0) - (fatCountMap[b.nama]||0))
                .map(e => (
                  <option key={e.id} value={e.nama}>
                    {e.nama} — {fatCountMap[e.nama] || 0}x FAT
                    {e.nama === recommendation ? ' ⭐ Rekomendasi' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* FAT count summary */}
          {automationEngineers.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Distribusi FAT saat ini</div>
              <div className="space-y-1.5">
                {automationEngineers
                  .sort((a,b) => (fatCountMap[a.nama]||0) - (fatCountMap[b.nama]||0))
                  .map(e => {
                    const cnt = fatCountMap[e.nama] || 0;
                    const isRec = e.nama === recommendation;
                    return (
                      <div key={e.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isRec && <span className="text-amber-500 text-xs">⭐</span>}
                          <span className={`text-sm ${isRec ? 'font-bold text-cyan-700' : 'text-slate-600'}`}>{e.nama}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({length: Math.min(cnt, 10)}).map((_,i) => (
                              <div key={i} className="w-2 h-2 bg-cyan-400 rounded-sm" />
                            ))}
                            {cnt > 10 && <span className="text-[10px] text-slate-400">+{cnt-10}</span>}
                          </div>
                          <span className="text-xs font-bold text-slate-500 w-8 text-right">{cnt}x</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Keterangan (opsional)</label>
            <textarea className={inp + ' h-16 resize-none pt-2.5'} placeholder="Catatan tambahan..." value={ket} onChange={e=>setKet(e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">Batal</button>
          <button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 active:scale-95 transition">
            💾 Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FAT PAGE ─────────────────────────────────────────────────────────────────
function FATPage({ fatEntries, employees, currentUser, onAdd, onEdit, onDelete }: {
  fatEntries: FATEntry[];
  employees: Employee[];
  currentUser: AppUser;
  onAdd: () => void;
  onEdit: (entry: FATEntry) => void;
  onDelete: (id: string) => void;
}) {
  const automationEngineers = employees.filter(e =>
    e.departemen === 'Electrical & Automation' &&
    (e.posisi||'').toLowerCase().includes('automation')
  );

  // FAT count per person
  const fatCountMap = useMemo(() => {
    const map: Record<string,number> = {};
    automationEngineers.forEach(e => { map[e.nama] = 0; });
    fatEntries.forEach(f => { if (map[f.assignedTo] !== undefined) map[f.assignedTo]++; });
    // Also count people assigned but not in filtered list
    fatEntries.forEach(f => { if (map[f.assignedTo] === undefined) map[f.assignedTo] = (map[f.assignedTo]||0)+1; });
    return map;
  }, [fatEntries, automationEngineers]);

  const recommendation = Object.entries(fatCountMap)
    .filter(([name]) => automationEngineers.some(e=>e.nama===name))
    .sort((a,b)=>a[1]-b[1])[0]?.[0] || null;

  const now = new Date();
  const upcoming = fatEntries.filter(f => new Date(f.fatDateTime) > now);
  const past = fatEntries.filter(f => new Date(f.fatDateTime) <= now);

  const fmtDateTime = (dt: string) => {
    if (!dt) return '-';
    const d = new Date(dt);
    const M = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const classBadge: Record<string,string> = {
    ClassNK: 'bg-blue-100 text-blue-700 border-blue-200',
    DNV: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LR: 'bg-red-100 text-red-700 border-red-200',
    BV: 'bg-purple-100 text-purple-700 border-purple-200',
    ABS: 'bg-amber-100 text-amber-700 border-amber-200',
    RINA: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {v: fatEntries.length, l:'Total FAT', c:'text-cyan-700', bg:'bg-cyan-50 border-cyan-200'},
          {v: upcoming.length,   l:'Upcoming', c:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
          {v: past.length,       l:'Selesai', c:'text-slate-600', bg:'bg-slate-50 border-slate-200'},
          {v: automationEngineers.length, l:'Automation Eng.', c:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
        ].map(({v,l,c,bg})=>(
          <div key={l} className={`border rounded-2xl p-3 text-center ${bg}`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Recommendation panel */}
      {recommendation && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">🔄 Giliran FAT Berikutnya</div>
          <div className="flex flex-wrap gap-3">
            {automationEngineers
              .sort((a,b)=>(fatCountMap[a.nama]||0)-(fatCountMap[b.nama]||0))
              .map((e, rank) => (
                <div key={e.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${rank===0?'bg-cyan-100 border-cyan-300':'bg-white border-slate-200'}`}>
                  <span className={`text-lg ${rank===0?'':'opacity-40'}`}>{rank===0?'⭐':rank===1?'🥈':rank===2?'🥉':'👤'}</span>
                  <div>
                    <div className={`text-sm font-bold ${rank===0?'text-cyan-700':'text-slate-600'}`}>{e.nama}</div>
                    <div className="text-[10px] text-slate-400">{fatCountMap[e.nama]||0}x FAT total</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add button */}
      {can(currentUser.role, 'write') && (
        <div className="flex justify-end">
          <button onClick={onAdd} className="h-9 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
            ➕ Tambah Jadwal FAT
          </button>
        </div>
      )}

      {/* FAT list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {fatEntries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🔬</div>
            <p className="text-sm">Belum ada jadwal FAT</p>
          </div>
        ) : (
          <div className="overflow-auto" style={{maxHeight:'calc(100vh - 380px)'}}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {['No. Project','Class','Waktu FAT','Assigned To','Status','Keterangan','Aksi'].map(h=>(
                    <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatEntries.map((f,i) => {
                  const isPast = new Date(f.fatDateTime) <= now;
                  return (
                    <tr key={f.id} className={`border-b border-slate-100 group ${i%2===0?'bg-white':'bg-slate-50'}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-[#005A9E] text-xs">{f.projectNo}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${classBadge[f.fatClass]||'bg-slate-100 text-slate-600 border-slate-200'}`}>{f.fatClass}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDateTime(f.fatDateTime)}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{f.assignedTo}</div>
                        <div className="text-[10px] text-slate-400">{fatCountMap[f.assignedTo]||0}x total FAT</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${isPast?'bg-emerald-100 text-emerald-700 border-emerald-200':'bg-blue-100 text-blue-700 border-blue-200'}`}>
                          {isPast?'✅ Selesai':'🕐 Upcoming'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[180px] truncate">{f.keterangan||'-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {can(currentUser.role,'write') && (
                            <button onClick={()=>onEdit(f)} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">✏️</button>
                          )}
                          {can(currentUser.role,'delete') && (
                            <button onClick={()=>onDelete(f.id)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_ID   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function parseLeaveRange(tglCuti: string): {start:string; end:string} | null {
  if (!tglCuti) return null;
  const s = tglCuti.trim();
  if (s.includes(' s/d ')) {
    const parts = s.split(' s/d ');
    const start = parts[0].trim();
    const end   = parts[1].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) return {start, end};
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return {start:s, end:s};
  return null;
}

function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) { result.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }
  return result;
}

interface CalEvent { nama:string; dept:string; tipe:'cuti'|'overseas'; info?:string; }

// ─── CALENDAR PAGE ────────────────────────────────────────────────────────────
function CalendarPage({ logs, overseas }: { logs:LogEntry[]; overseas:OverseasEntry[] }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selDate, setSelDate] = useState<string|null>(today.toISOString().slice(0,10));
  const [fDept,  setFDept]  = useState('');
  const [fTipe,  setFTipe]  = useState<''|'cuti'|'overseas'>('');

  // Build event map: date -> CalEvent[]
  const eventMap = useMemo<Record<string, CalEvent[]>>(() => {
    const map: Record<string, CalEvent[]> = {};
    const add = (date: string, ev: CalEvent) => { if (!map[date]) map[date]=[]; map[date].push(ev); };

    // Cuti from logs (only real leave entries, skip accrual/add/edit/reset logs)
    logs.forEach(log => {
      const skip = ['ditambahkan','diperbarui','reset','accrual','auto'].some(k => log.keterangan.toLowerCase().includes(k));
      if (skip) return;
      const range = parseLeaveRange(log.tglCuti);
      if (!range) return;
      datesBetween(range.start, range.end).forEach(d => add(d, {nama:log.nama, dept:log.departemen, tipe:'cuti'}));
    });

    // Overseas
    overseas.forEach(o => {
      if (!o.tglMulai || !o.tglSelesai) return;
      datesBetween(o.tglMulai, o.tglSelesai).forEach(d =>
        add(d, {nama:o.nama, dept:o.departemen, tipe:'overseas', info:`${o.tipe} · ${o.lokasi} · ${o.projectNo}`})
      );
    });
    return map;
  }, [logs, overseas]);

  const allDepts = useMemo(() => {
    const s = new Set<string>();
    [...logs.map(l=>l.departemen), ...overseas.map(o=>o.departemen)].forEach(d=>d&&s.add(d));
    return Array.from(s).sort();
  }, [logs, overseas]);

  const getEvents = (dateStr: string): CalEvent[] => {
    const evs = eventMap[dateStr] || [];
    return evs.filter(e => (!fDept || e.dept===fDept) && (!fTipe || e.tipe===fTipe));
  };

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelDate(today.toISOString().slice(0,10)); };

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: {day:number; cur:boolean; dateStr:string|null}[] = [];
  for (let i=0;i<firstDow;i++) cells.push({day:prevMonthDays-firstDow+1+i, cur:false, dateStr:null});
  for (let d=1;d<=daysInMonth;d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({day:d, cur:true, dateStr:ds});
  }
  while (cells.length%7!==0) cells.push({day:cells.length-firstDow-daysInMonth+1, cur:false, dateStr:null});

  const todayStr2 = today.toISOString().slice(0,10);
  const selEvents = selDate ? getEvents(selDate) : [];

  // Monthly summary
  const monthDates = Array.from({length:daysInMonth}, (_,i) => `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
  const cutiNamas  = new Set(monthDates.flatMap(d=>(eventMap[d]||[]).filter(e=>e.tipe==='cuti' && (!fDept||e.dept===fDept)).map(e=>e.nama)));
  const ovsNamas   = new Set(monthDates.flatMap(d=>(eventMap[d]||[]).filter(e=>e.tipe==='overseas' && (!fDept||e.dept===fDept)).map(e=>e.nama)));

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition">‹</button>
          <span className="font-bold text-slate-800 min-w-[160px] text-center">{MONTH_ID[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition">›</button>
          <button onClick={goToday} className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition">Hari ini</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={fDept} onChange={e=>setFDept(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]">
            <option value="">Semua Departemen</option>
            {allDepts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fTipe} onChange={e=>setFTipe(e.target.value as any)} className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]">
            <option value="">Cuti & Overseas</option>
            <option value="cuti">Cuti saja</option>
            <option value="overseas">Overseas saja</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          {v:cutiNamas.size,  l:'Karyawan cuti bulan ini',    c:'text-blue-700',    bg:'bg-blue-50 border-blue-100'},
          {v:ovsNamas.size,   l:'Karyawan overseas bulan ini',c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-100'},
          {v:cutiNamas.size+ovsNamas.size, l:'Total tidak di kantor', c:'text-slate-700', bg:'bg-slate-50 border-slate-100'},
        ].map(({v,l,c,bg})=>(
          <div key={l} className={`border rounded-xl p-3 text-center ${bg}`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{l}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-blue-300 inline-block"></span> Cuti</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"></span> Overseas</div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_ID.map(d=>(
            <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell.cur) return (
              <div key={idx} className="min-h-[72px] p-1 border-b border-r border-slate-50 opacity-30">
                <span className="text-[11px] text-slate-300">{cell.day}</span>
              </div>
            );
            const evs = getEvents(cell.dateStr!);
            const isToday = cell.dateStr === todayStr2;
            const isSel   = cell.dateStr === selDate;
            const cutiCount = evs.filter(e=>e.tipe==='cuti').length;
            const ovsCount  = evs.filter(e=>e.tipe==='overseas').length;
            return (
              <div key={idx}
                onClick={() => setSelDate(cell.dateStr)}
                className={`min-h-[72px] p-1 border-b border-r border-slate-100 cursor-pointer transition-colors
                  ${isSel ? 'bg-blue-50 ring-2 ring-inset ring-[#005A9E]' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#005A9E] text-white' : 'text-slate-600'}`}>{cell.day}</span>
                </div>
                {cutiCount > 0 && (
                  <div className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium">
                    {cutiCount > 1 ? `${cutiCount} cuti` : evs.find(e=>e.tipe==='cuti')?.nama.split(' ')[0]}
                  </div>
                )}
                {ovsCount > 0 && (
                  <div className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 truncate font-medium">
                    {ovsCount > 1 ? `${ovsCount} overseas` : evs.find(e=>e.tipe==='overseas')?.nama.split(' ')[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 min-h-[60px]">
        {selDate ? (
          <>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {new Date(selDate+'T12:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              {selEvents.length > 0 && <span className="ml-2 text-slate-400">— {selEvents.length} orang</span>}
            </div>
            {selEvents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">Tidak ada cuti atau overseas</p>
            ) : (
              <div className="space-y-2">
                {selEvents.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${ev.tipe==='cuti' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {ev.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{ev.nama}</div>
                      <div className="text-[11px] text-slate-400">{ev.dept}{ev.info && ` · ${ev.info}`}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0
                      ${ev.tipe==='cuti' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                      {ev.tipe === 'cuti' ? 'Cuti' : 'Overseas'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">Klik tanggal untuk melihat detail</p>
        )}
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ employees, logs, overseas }: { employees:Employee[]; logs:LogEntry[]; overseas:OverseasEntry[] }) {
  const [viewMode, setViewMode] = useState<'dept'|'monthly'|'overseas'>('dept');

  // Cuti per departemen
  const deptData = useMemo(() => {
    const map: Record<string, {jatah:number; terpakai:number; karyawan:number}> = {};
    employees.forEach(e => {
      if (!map[e.departemen]) map[e.departemen] = {jatah:0, terpakai:0, karyawan:0};
      map[e.departemen].jatah    += e.jatahAwal;
      map[e.departemen].terpakai += e.terpakai;
      map[e.departemen].karyawan += 1;
    });
    return Object.entries(map).sort((a,b)=>b[1].terpakai-a[1].terpakai);
  }, [employees]);

  // Cuti per bulan (last 6 months)
  const monthlyData = useMemo(() => {
    const months: {label:string; key:string}[] = [];
    const now = new Date();
    for (let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({
        label: `${MONTH_ID[d.getMonth()].slice(0,3)} ${d.getFullYear()}`,
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      });
    }
    return months.map(m => {
      const count = logs.filter(l => {
        const skip = ['ditambahkan','diperbarui','reset','accrual','auto'].some(k=>l.keterangan.toLowerCase().includes(k));
        if (skip) return false;
        return l.timestamp.startsWith(m.key);
      }).length;
      return {...m, count};
    });
  }, [logs]);

  // Overseas per tipe
  const overseasData = useMemo(() => {
    const comm = overseas.filter(o=>o.tipe==='Commissioning').length;
    const serv = overseas.filter(o=>o.tipe==='Service').length;
    const visa = overseas.filter(o=>o.tipe==='Mengurus Visa').length;
    const other = overseas.filter(o=>o.tipe==='Other').length;
    const depts: Record<string,number> = {};
    overseas.forEach(o => { depts[o.departemen] = (depts[o.departemen]||0)+1; });
    return { comm, serv, visa, other, depts: Object.entries(depts).sort((a,b)=>b[1]-a[1]) };
  }, [overseas]);

  const maxDeptVal = Math.max(...deptData.map(d=>d[1].terpakai), 1);
  const maxMonthly = Math.max(...monthlyData.map(m=>m.count), 1);
  const maxOvs     = Math.max(...overseasData.depts.map(d=>d[1]), 1);

  const DEPT_COLORS = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-rose-500','bg-cyan-500'];

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          {v:employees.length, l:'Total Karyawan', c:'text-[#005A9E]', bg:'bg-blue-50 border-blue-100'},
          {v:employees.reduce((s,e)=>s+e.terpakai,0), l:'Total Hari Cuti', c:'text-orange-600', bg:'bg-orange-50 border-orange-100'},
          {v:overseas.filter(o=>o.status==='active').length, l:'Overseas Aktif', c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-100'},
          {v:employees.filter(e=>e.jatahAwal-e.terpakai<=0).length, l:'Cuti Habis', c:'text-red-600', bg:'bg-red-50 border-red-100'},
        ].map(({v,l,c,bg})=>(
          <div key={l} className={`border rounded-2xl p-3 text-center ${bg}`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
        {([['dept','Per Departemen'],['monthly','Tren Bulanan'],['overseas','Overseas']] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setViewMode(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode===k?'bg-white text-[#005A9E] shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Chart: Per Departemen */}
      {viewMode==='dept' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Penggunaan Cuti per Departemen</div>
          {deptData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data karyawan</p>
          ) : deptData.map(([dept, data], i) => {
            const pct = Math.round((data.terpakai / Math.max(data.jatah, 1)) * 100);
            const barW = Math.round((data.terpakai / maxDeptVal) * 100);
            return (
              <div key={dept}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{dept}</span>
                    <span className="text-xs text-slate-400 ml-2">{data.karyawan} karyawan</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-700">{data.terpakai}</span>
                    <span className="text-xs text-slate-400"> / {data.jatah} hari ({pct}%)</span>
                  </div>
                </div>
                <div className="h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className={`h-full ${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-lg transition-all`} style={{width:`${barW}%`}} />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[10px] font-bold text-white drop-shadow">{barW > 10 ? `${data.terpakai} hari` : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart: Monthly trend */}
      {viewMode==='monthly' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Log Cuti per Bulan (6 Bulan Terakhir)</div>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((m, i) => {
              const h = Math.max(Math.round((m.count / maxMonthly) * 160), m.count > 0 ? 20 : 4);
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-[#005A9E]">{m.count > 0 ? m.count : ''}</span>
                  <div className="w-full flex items-end justify-center">
                    <div className={`w-full rounded-t-lg transition-all ${m.count>0?'bg-[#005A9E]':'bg-slate-100'}`} style={{height:`${h}px`}} />
                  </div>
                  <span className="text-[10px] text-slate-400 text-center leading-tight">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart: Overseas */}
      {viewMode==='overseas' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Tipe Overseas</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {v:overseasData.comm,  l:'Commissioning',  c:'text-purple-700', bg:'bg-purple-50 border-purple-100'},
                {v:overseasData.serv,  l:'Service',        c:'text-amber-700',  bg:'bg-amber-50 border-amber-100'},
                {v:overseasData.visa,  l:'Mengurus Visa',  c:'text-blue-700',   bg:'bg-blue-50 border-blue-100'},
                {v:overseasData.other, l:'Other',          c:'text-slate-600',  bg:'bg-slate-50 border-slate-200'},
              ].map(({v,l,c,bg})=>(
                <div key={l} className={`border rounded-xl p-4 text-center ${bg}`}>
                  <div className={`text-3xl font-extrabold ${c}`}>{v}</div>
                  <div className="text-xs text-slate-400 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Overseas per Departemen</div>
            {overseasData.depts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada data overseas</p>
            ) : overseasData.depts.map(([dept, count], i) => {
              const barW = Math.round((count / maxOvs) * 100);
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-700">{dept}</span>
                    <span className="text-sm font-bold text-slate-700">{count}x</span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div className={`h-full ${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-lg`} style={{width:`${barW}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const HRLeaveManagement: React.FC = () => {
  const { time, date } = useClock();
  const {
    employees, logs, overseas, appUsers, config, fatEntries, syncing, online,
    fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs,
    fbSaveOverseas, fbDeleteOverseas, fbSaveUser, fbDeleteUser, fbSaveConfig,
    fbSaveFAT, fbDeleteFAT
  } = useFirebase();

  // Auth state — restore session from localStorage on reload
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('hrms_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as AppUser;
      // Basic sanity check — must have required fields
      if (!parsed?.id || !parsed?.username || !parsed?.role) return null;
      return parsed;
    } catch { return null; }
  });
  //const [sessionExpiry, setSessionExpiry] = useState<number>(0);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // UI state
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Employee form
  const [inpNama, setInpNama] = useState('');
  const [inpDept, setInpDept] = useState(config.departments[0] || DEPARTMENTS[0]);
  const [inpTgl, setInpTgl] = useState(todayStr());
  const [inpJatah, setInpJatah] = useState(12);
  const [inpPosisi, setInpPosisi] = useState('');
  const [inpMulai, setInpMulai] = useState(todayStr());
  const [inpSelesai, setInpSelesai] = useState(todayStr());
  const [selectedId, setSelectedId] = useState<string|null>(null);

  // Filters
  const [sortCol, setSortCol] = useState<SortCol>('nama');
  const [sortAsc, setSortAsc] = useState(true);
  const [histSort, setHistSort] = useState<HistSortCol>('');
  const [histAsc, setHistAsc] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [ovsFilter, setOvsFilter] = useState('');
  const [ovsSearch, setOvsSearch] = useState('');

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const globalRef = useRef<HTMLDivElement>(null);

  // Status bar
  const [statusTxt, setStatusTxt] = useState('● Siap');
  const stRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({x:0,y:0});
  const [ctxEmpId, setCtxEmpId] = useState<string|null>(null);

  // Dialogs
  const [confirm, setConfirm] = useState<{open:boolean;title:string;msg:string;danger:boolean;cb:(()=>void)|null}>({open:false,title:'',msg:'',danger:false,cb:null});
  const [editOpen, setEditOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee|null>(null);
  const [ovsOpen, setOvsOpen] = useState(false);
  const [ovsEntry, setOvsEntry] = useState<OverseasEntry|null>(null);

  // FAT dialogs
  const [fatOpen, setFatOpen] = useState(false);
  const [fatEntry, setFatEntry] = useState<FATEntry|null>(null);

  // Config form
  const [cfgCompany, setCfgCompany] = useState(config.companyName);
  const [cfgAccrual, setCfgAccrual] = useState(config.monthlyAccrualDays);
  const [cfgMaxLeave, setCfgMaxLeave] = useState(config.maxLeaveBalance);
  const [cfgAutoLogout, setCfgAutoLogout] = useState(config.autoLogoutMinutes);
  const [cfgDepts, setCfgDepts] = useState(config.departments.join('\n'));

  // User management form
  const [newUserName, setNewUserName] = useState('');
  const [newUserDisplay, setNewUserDisplay] = useState('');
  const [newUserPw, setNewUserPw] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [newUserLinked, setNewUserLinked] = useState('');

  // Sync session to localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hrms_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('hrms_session');
    }
  }, [currentUser]);

  useEffect(() => {
    setCfgCompany(config.companyName);
    setCfgAccrual(config.monthlyAccrualDays);
    setCfgMaxLeave(config.maxLeaveBalance);
    setCfgAutoLogout(config.autoLogoutMinutes);
    setCfgDepts(config.departments.join('\n'));
  }, [config]);

  // Validate restored session against Firebase users (in case user was deleted)
  useEffect(() => {
    if (syncing || !currentUser || appUsers.length === 0) return;
    const freshUser = appUsers.find(u => u.id === currentUser.id);
    if (!freshUser) {
      // User was deleted from Firebase — force logout
      setCurrentUser(null);
    } else {
      // Always update session with latest data from Firebase (role may have changed)
      setCurrentUser(prev => {
        if (!prev) return prev;
        return JSON.stringify(freshUser) !== JSON.stringify(prev) ? freshUser : prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUsers.length, syncing]);

  // ─── AUTO LOGOUT ────────────────────────────────────────────────────────────
  const activityRef = useRef(Date.now());
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const resetActivity = useCallback(() => {
    activityRef.current = Date.now();
    setShowLogoutWarning(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (!currentUser) return;
    const mins = config.autoLogoutMinutes || AUTO_LOGOUT_MINUTES;
    const warningAt = (mins - 2) * 60 * 1000;
    const logoutAt = mins * 60 * 1000;
    logoutTimerRef.current = setTimeout(() => setShowLogoutWarning(true), warningAt);
    setTimeout(() => {
      if (Date.now() - activityRef.current >= logoutAt) {
        setCurrentUser(null);
        setShowLogoutWarning(false);
      }
    }, logoutAt);
  }, [currentUser, config.autoLogoutMinutes]);

  useEffect(() => {
    if (!currentUser) return;
    const events = ['mousedown','mousemove','keydown','touchstart','scroll'];
    const handler = () => resetActivity();
    events.forEach(e => document.addEventListener(e, handler, {passive: true}));
    resetActivity();
    return () => { events.forEach(e => document.removeEventListener(e, handler)); if(logoutTimerRef.current) clearTimeout(logoutTimerRef.current); };
  }, [currentUser, resetActivity]);

  // ─── AUTO LEAVE ACCRUAL ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!employees.length || !currentUser || !can(currentUser.role, 'write')) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    employees.forEach(emp => {
      if (!emp.tglKontrak) return;
      const contractDate = new Date(emp.tglKontrak + 'T00:00:00');
      if (isNaN(contractDate.getTime())) return;
      const contractDay = contractDate.getDate();
      const today = now.getDate();
      // Accrue on the anniversary day of contract each month
      if (today >= contractDay && emp.lastAccrualMonth !== currentMonth) {
        // Contract must be at least 1 month old
        const monthsWorked = (now.getFullYear() - contractDate.getFullYear()) * 12 + (now.getMonth() - contractDate.getMonth());
        if (monthsWorked >= 1) {
          const newJatah = Math.min(emp.jatahAwal + config.monthlyAccrualDays, config.maxLeaveBalance);
          fbSaveEmployee({...emp, jatahAwal: newJatah, lastAccrualMonth: currentMonth}).then(() => {
            fbAddLog({
              timestamp: nowTs(), nama: emp.nama, departemen: emp.departemen,
              tglCuti: todayStr(),
              keterangan: `Auto Accrual Cuti +${config.monthlyAccrualDays} hari (Total: ${newJatah} hari)`
            });
          });
        }
      }
    });
  }, [employees]);

  // ─── INIT DEFAULT ADMIN ─────────────────────────────────────────────────────
  // Only runs when Firebase finishes syncing AND there are truly no users
  useEffect(() => {
    if (syncing) return;             // wait for Firebase to finish loading
    if (appUsers.length > 0) return; // users already exist — never create default
    if (localStorage.getItem('adminCreated')) return; // already created before
    const defaultAdmin: AppUser = {
      id: uid('usr'), username: 'admin', passwordHash: simpleHash('admin123'),
      role: 'superadmin', displayName: 'Administrator', createdAt: nowTs()
    };
    fbSaveUser(defaultAdmin);
    localStorage.setItem('adminCreated', 'true');
  }, [syncing, appUsers.length, fbSaveUser]);

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  const setStatus = (msg: string) => {
    if (stRef.current) clearTimeout(stRef.current);
    setStatusTxt(msg);
    stRef.current = setTimeout(() => setStatusTxt('● Siap'), 5000);
  };
  const toast = useCallback((msg: string, kind: ToastKind = 'success') => {
    const id = uid('t');
    setToasts(p => [...p, {id, msg, kind}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const showConfirm = (title: string, msg: string, danger: boolean, cb: () => void) =>
    setConfirm({open:true,title,msg,danger,cb});
  const handleSort = (c: SortCol) => { if(sortCol===c) setSortAsc(a=>!a); else {setSortCol(c);setSortAsc(true);} };
  const handleHistSort = (c: HistSortCol) => { if(histSort===c) setHistAsc(a=>!a); else {setHistSort(c);setHistAsc(true);} };
  const sArr = (c: SortCol) => sortCol===c?(sortAsc?' ↑':' ↓'):'';
  const hArr = (c: HistSortCol) => histSort===c?(histAsc?' ↑':' ↓'):'';

  const activeDepts = config.departments.length > 0 ? config.departments : DEPARTMENTS;

  // Derived data
  const selectedEmp = employees.find(e => e.id === selectedId) || null;
  const sisaSelected = selectedEmp ? selectedEmp.jatahAwal - selectedEmp.terpakai : null;
  const cutiDays = (inpMulai && inpSelesai) ? countDays(inpMulai, inpSelesai) : 0;
  const cutiPreview = cutiDays > 0 && !(cutiDays > (sisaSelected ?? Infinity));
  const cutiWarning =
    cutiDays <= 0 && inpMulai && inpSelesai ? '⚠ Tanggal selesai harus setelah tanggal mulai!' :
    (sisaSelected !== null && cutiDays > 0 && cutiDays > sisaSelected)
      ? `⚠ Kurang! Butuh ${cutiDays} hari, sisa cuti hanya ${sisaSelected} hari.` : '';

  // Global search results
  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 2) return {emps:[], logs_:[], ovs:[]};
    const emps = employees.filter(e =>
      e.nama.toLowerCase().includes(q) || (e.posisi||'').toLowerCase().includes(q) || e.departemen.toLowerCase().includes(q)
    ).slice(0, 5);
    const logs_ = logs.filter(l =>
      l.nama.toLowerCase().includes(q) || l.keterangan.toLowerCase().includes(q)
    ).slice(0, 5);
    const ovs = overseas.filter(o =>
      o.nama.toLowerCase().includes(q) || o.projectNo.toLowerCase().includes(q) || o.lokasi.toLowerCase().includes(q)
    ).slice(0, 5);
    return {emps, logs_, ovs};
  }, [globalSearch, employees, logs, overseas]);

  const stats = {
    total: employees.length,
    aman:  employees.filter(e=>e.jatahAwal-e.terpakai>3).length,
    low:   employees.filter(e=>{const s=e.jatahAwal-e.terpakai;return s>0&&s<=3;}).length,
    out:   employees.filter(e=>e.jatahAwal-e.terpakai<=0).length,
    overseasActive: overseas.filter(o=>o.status==='active').length,
  };

  const filteredEmps = employees
    .map(e => ({...e, sisa: e.jatahAwal - e.terpakai}))
    .filter(e => (!deptFilter || e.departemen===deptFilter) && (!searchQ || e.nama.toLowerCase().includes(searchQ.toLowerCase()) || e.departemen.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a,b) => {
      const va = String((a as any)[sortCol]??'').toLowerCase();
      const vb = String((b as any)[sortCol]??'').toLowerCase();
      const na = parseFloat(va); const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na-nb : nb-na;
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const filteredLogs = [...logs].sort((a,b) => {
    if (!histSort) return 0;
    const va = String((a as any)[histSort]||'').toLowerCase();
    const vb = String((b as any)[histSort]||'').toLowerCase();
    return histAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const filteredOverseas = overseas
    .filter(o => (!ovsFilter || o.tipe===ovsFilter || o.status===ovsFilter) &&
      (!ovsSearch || o.nama.toLowerCase().includes(ovsSearch.toLowerCase()) ||
       o.projectNo.toLowerCase().includes(ovsSearch.toLowerCase()) ||
       o.lokasi.toLowerCase().includes(ovsSearch.toLowerCase())))
    .sort((a,b) => b.tglMulai.localeCompare(a.tglMulai));

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const doSaveEmployee = async () => {
    if (!can(currentUser?.role || null, 'write')) { toast('Anda tidak punya izin untuk aksi ini.', 'error'); return; }
    if (!inpNama.trim()) { toast('Nama karyawan tidak boleh kosong!', 'error'); return; }
    if (!inpTgl) { toast('Tanggal kontrak harus diisi!', 'error'); return; }
    if (inpJatah < 0) { toast('Jatah cuti tidak boleh negatif!', 'error'); return; }
    if (employees.find(e => e.nama.toLowerCase() === inpNama.toLowerCase().trim())) {
      toast(`'${inpNama}' sudah terdaftar!`, 'warning'); return;
    }
    const emp: Employee = {
      id: uid('emp'), nama: inpNama.trim(), departemen: inpDept,
      tglKontrak: inpTgl, jatahAwal: inpJatah, terpakai: 0, posisi: inpPosisi.trim()
    };
    await fbSaveEmployee(emp);
    await fbAddLog({timestamp:nowTs(), nama:emp.nama, departemen:emp.departemen, tglCuti:inpTgl, keterangan:`Karyawan baru ditambahkan (Jatah: ${inpJatah} hari) oleh ${currentUser?.displayName}`});
    setInpNama(''); setInpJatah(12); setInpPosisi('');
    setStatus(`✓ '${emp.nama}' ditambahkan.`);
    toast(`'${emp.nama}' — ${emp.departemen} berhasil ditambahkan.`);
    setDrawerOpen(false);
  };

  const doLogCuti = () => {
    if (!selectedId) { toast('Pilih karyawan terlebih dahulu.', 'warning'); return; }
    const emp = employees.find(e => e.id === selectedId);
    if (!emp) { toast('Karyawan tidak ditemukan!', 'error'); return; }
    if (!canEditOwnLeave(currentUser, emp.nama)) { toast('Anda hanya dapat mencatat cuti milik Anda sendiri.', 'error'); return; }
    const sisa = emp.jatahAwal - emp.terpakai;
    if (sisa <= 0) { toast(`Jatah cuti '${emp.nama}' sudah habis!`, 'error'); return; }
    if (!inpMulai || !inpSelesai) { toast('Tanggal cuti harus diisi!', 'error'); return; }
    const days = countDays(inpMulai, inpSelesai);
    if (days <= 0) { toast('Tanggal selesai harus setelah tanggal mulai!', 'error'); return; }
    if (days > sisa) { toast(`Jatah tidak cukup! Butuh ${days} hari, sisa ${sisa} hari.`, 'error'); return; }
    const range = inpMulai === inpSelesai ? fmtDate(inpMulai) : `${fmtDate(inpMulai)} s/d ${fmtDate(inpSelesai)}`;
    showConfirm('Konfirmasi Cuti', `Catat cuti untuk:\n${emp.nama} · ${emp.departemen}\nTanggal: ${range}\nDurasi: ${days} hari`, false, async () => {
      await fbSaveEmployee({...emp, terpakai: emp.terpakai + days});
      const ket = days === 1 ? 'Cuti 1 Hari' : `Cuti ${days} Hari (${inpMulai} s/d ${inpSelesai})`;
      await fbAddLog({timestamp:nowTs(), nama:emp.nama, departemen:emp.departemen, tglCuti:`${inpMulai} s/d ${inpSelesai}`, keterangan:ket});
      setStatus(`✓ Cuti ${emp.nama} (${days} hari) dicatat.`);
      toast(`Cuti '${emp.nama}' ${days} hari berhasil dicatat.`);
      setDrawerOpen(false);
    });
  };

  const doResetJatah = (id: string) => {
    if (!can(currentUser?.role || null, 'write')) { toast('Anda tidak punya izin.', 'error'); return; }
    const emp = employees.find(e => e.id === id); if (!emp) return;
    showConfirm('Reset Jatah Cuti', `Reset jatah cuti '${emp.nama}'\nkembali ke 0 hari terpakai?\n\nAksi ini akan dicatat di log.`, false, async () => {
      await fbSaveEmployee({...emp, terpakai: 0});
      await fbAddLog({timestamp:nowTs(), nama:emp.nama, departemen:emp.departemen, tglCuti:todayStr(), keterangan:`Reset Jatah Cuti → Terpakai 0 hari`});
      setStatus(`♻ Jatah cuti '${emp.nama}' direset.`);
      toast(`Jatah cuti '${emp.nama}' berhasil direset.`);
    });
  };

  const doDelete = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { toast('Anda tidak punya izin untuk menghapus.', 'error'); return; }
    const emp = employees.find(e => e.id === id); if (!emp) return;
    showConfirm('Hapus Karyawan', `Data '${emp.nama}' akan dihapus permanen.\nLanjutkan?`, true, async () => {
      await fbDeleteEmployee(id);
      setSelectedId(null);
      setStatus(`✕ Data '${emp.nama}' dihapus.`);
      toast(`Karyawan '${emp.nama}' dihapus.`, 'warning');
    });
  };

  const doOpenEdit = (id: string) => {
    if (!can(currentUser?.role || null, 'write')) { toast('Anda tidak punya izin untuk mengedit.', 'error'); return; }
    const emp = employees.find(e => e.id === id); if (!emp) return;
    setEditEmp(emp); setEditOpen(true);
  };

  const doSaveEdit = async (data: Partial<Employee>) => {
    if (!editEmp) return;
    const updated = {...editEmp, ...data};
    await fbSaveEmployee(updated);
    await fbAddLog({timestamp:nowTs(), nama:updated.nama, departemen:updated.departemen, tglCuti:todayStr(), keterangan:`Data karyawan diperbarui oleh ${currentUser?.displayName}`});
    setStatus(`✓ Data '${data.nama}' diperbarui.`);
    toast(`Data '${data.nama}' diperbarui.`);
    setEditOpen(false); setEditEmp(null);
  };

  const doExportCSV = () => {
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    let csv = 'Nama,Posisi,Departemen,Tgl_Kontrak,Jatah_Awal,Terpakai,Sisa\n';
    employees.forEach(e => {
      csv += `"${e.nama}","${e.posisi||''}","${e.departemen}","${e.tglKontrak}",${e.jatahAwal},${e.terpakai},${e.jatahAwal-e.terpakai}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `export_cuti_feenmarine_${ts}.csv`; a.click();
    toast('Ekspor CSV berhasil!');
  };

  const doClearHistory = () => showConfirm('Bersihkan History', 'Semua log aktivitas akan dihapus permanen.\nLanjutkan?', true, async () => {
    await fbClearLogs();
    toast('Semua log history dihapus.', 'info');
  });

  const doSaveOverseas = async (data: Omit<OverseasEntry,'id'|'createdAt'|'createdBy'>) => {
    if (!currentUser) return;
    if (ovsEntry) {
      await fbSaveOverseas({...ovsEntry, ...data});
      toast('Data overseas diperbarui.');
    } else {
      const entry: OverseasEntry = {id:uid('ovs'), ...data, createdAt:nowTs(), createdBy:currentUser.displayName};
      await fbSaveOverseas(entry);
      toast(`Overseas '${data.projectNo}' ditambahkan.`);
    }
    setOvsOpen(false); setOvsEntry(null);
  };

  const doDeleteOverseas = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { toast('Anda tidak punya izin.', 'error'); return; }
    const o = overseas.find(x => x.id === id); if (!o) return;
    showConfirm('Hapus Overseas', `Hapus record '${o.projectNo}' untuk '${o.nama}'?`, true, async () => {
      await fbDeleteOverseas(id);
      toast(`Record overseas '${o.projectNo}' dihapus.`, 'warning');
    });
  };

  const doSaveFAT = async (data: Omit<FATEntry,'id'|'createdAt'|'createdBy'>) => {
    if (!currentUser) return;
    if (fatEntry) {
      await fbSaveFAT({...fatEntry, ...data});
      toast('Jadwal FAT diperbarui.');
    } else {
      const entry: FATEntry = {id:uid('fat'), ...data, createdAt:nowTs(), createdBy:currentUser.displayName};
      await fbSaveFAT(entry);
      toast(`FAT '${data.projectNo}' (${data.assignedTo}) dijadwalkan.`);
    }
    setFatOpen(false); setFatEntry(null);
  };

  const doDeleteFAT = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { toast('Anda tidak punya izin.', 'error'); return; }
    const f = fatEntries.find(x => x.id === id); if (!f) return;
    showConfirm('Hapus FAT', `Hapus jadwal FAT '${f.projectNo}' untuk '${f.assignedTo}'?`, true, async () => {
      await fbDeleteFAT(id);
      toast(`Jadwal FAT '${f.projectNo}' dihapus.`, 'warning');
    });
  };

  const doSaveConfig = async () => {
    if (!can(currentUser?.role || null, 'config')) { toast('Akses ditolak.', 'error'); return; }
    const newDepts = cfgDepts.split('\n').map(d=>d.trim()).filter(Boolean);
    const newConfig: AppConfig = {
      companyName: cfgCompany, monthlyAccrualDays: cfgAccrual,
      maxLeaveBalance: cfgMaxLeave, autoLogoutMinutes: cfgAutoLogout,
      departments: newDepts.length > 0 ? newDepts : DEPARTMENTS
    };
    await fbSaveConfig(newConfig);
    toast('Konfigurasi berhasil disimpan.');
  };

  const doAddUser = async () => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast('Akses ditolak.', 'error'); return; }
    if (!newUserName || !newUserPw || !newUserDisplay) { toast('Semua field harus diisi.', 'error'); return; }
    if (appUsers.find(u => u.username === newUserName)) { toast('Username sudah digunakan.', 'error'); return; }
    const newUser: AppUser = {
      id: uid('usr'), username: newUserName, passwordHash: simpleHash(newUserPw),
      role: newUserRole, displayName: newUserDisplay, createdAt: nowTs(),
      ...(newUserLinked ? {linkedEmployeeName: newUserLinked} : {})
    };
    await fbSaveUser(newUser);
    setNewUserName(''); setNewUserPw(''); setNewUserDisplay(''); setNewUserLinked('');
    toast(`User '${newUserDisplay}' berhasil ditambahkan.`);
  };

  // ─── CLEANUP DUPLICATE ADMINS (auto-run once) ───────────────────────────────
  const cleanedRef = React.useRef(false);
  useEffect(() => {
    if (syncing || appUsers.length === 0 || cleanedRef.current) return;
    // Find all users with username 'admin', keep only the first one (oldest createdAt)
    const adminUsers = appUsers.filter(u => u.username === 'admin');
    if (adminUsers.length > 1) {
      adminUsers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const toDelete = adminUsers.slice(1); // keep first, delete the rest
      toDelete.forEach(u => fbDeleteUser(u.id));
      cleanedRef.current = true;
      toast(`${toDelete.length} duplikat Administrator dihapus otomatis.`, 'info');
    } else {
      cleanedRef.current = true;
    }
  }, [appUsers, syncing]);

  const doDeleteUser = (id: string) => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast('Akses ditolak.', 'error'); return; }
    if (id === currentUser?.id) { toast('Tidak bisa menghapus akun sendiri.', 'error'); return; }
    const u = appUsers.find(x => x.id === id); if (!u) return;
    showConfirm('Hapus User', `Hapus user '${u.displayName}'?`, true, async () => {
      await fbDeleteUser(id);
      toast(`User '${u.displayName}' dihapus.`, 'warning');
    });
  };

  // Auto-select linked employee for viewer role
  useEffect(() => {
    if (!currentUser?.linkedEmployeeName || currentUser.role !== 'viewer') return;
    const emp = employees.find(e => e.nama === currentUser.linkedEmployeeName);
    if (emp) setSelectedId(emp.id);
  }, [employees, currentUser]);

  // Close ctx menu on click
  useEffect(() => {
    const close = () => { setCtxOpen(false); setCtxEmpId(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ─── RENDER: LOGIN ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <LoginPage appUsers={appUsers} onLogin={setCurrentUser} companyName={config.companyName} />
        <style>{`
          @keyframes scaleIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        `}</style>
      </>
    );
  }

  // ─── NAV ITEMS ───────────────────────────────────────────────────────────────
  const navItems: {key:ActivePage; icon:string; label:string}[] = [
    {key:'dashboard', icon:'📊', label:'Dashboard'},
    {key:'history',   icon:'📜', label:'Log Cuti'},
    {key:'overseas',  icon:'✈️',  label:'Overseas'},
    {key:'fat',       icon:'🔬', label:'Jadwal FAT'},
    {key:'calendar'  as ActivePage, icon:'📅', label:'Kalender'},
    {key:'analytics' as ActivePage, icon:'📈', label:'Analitik'},
    ...(can(currentUser.role, 'config') ? [{key:'config' as ActivePage, icon:'⚙️', label:'Konfigurasi'}] : []),
    ...(can(currentUser.role, 'manageUsers') ? [{key:'users' as ActivePage, icon:'👥', label:'Manajemen User'}] : []),
  ];

  const inp = "w-full h-10 px-3 bg-[#EFF1F3] border border-slate-200 rounded-xl text-[13px] outline-none focus:border-[#005A9E] focus:bg-white focus:ring-2 focus:ring-[#005A9E]/10 transition";
  const lbl = "block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1";

  // ─── RENDER: MAIN ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#F0F4F8] overflow-hidden" style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── AUTO LOGOUT WARNING ── */}
      {showLogoutWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99998] px-5 py-3 bg-amber-500 text-white rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3">
          <span>⏱</span>
          <span>Sesi akan berakhir dalam 2 menit. Gerakkan mouse untuk melanjutkan.</span>
          <button onClick={resetActivity} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition">Tetap Login</button>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="h-14 bg-[#005A9E] flex items-center justify-between px-3 sm:px-5 z-20 flex-shrink-0 shadow-lg">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button onClick={()=>setDrawerOpen(true)} className="lg:hidden text-white/80 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#004880] transition" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect y="2" width="18" height="2" rx="1"/><rect y="8" width="18" height="2" rx="1"/><rect y="14" width="18" height="2" rx="1"/></svg>
          </button>
          <button onClick={()=>setSidebarCollapsed(c=>!c)} className="hidden lg:flex text-white/70 hover:text-white w-8 h-8 items-center justify-center rounded-lg hover:bg-[#004880] transition">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect y="2" width="16" height="1.5" rx=".75"/><rect y="7.25" width="16" height="1.5" rx=".75"/><rect y="12.5" width="16" height="1.5" rx=".75"/></svg>
          </button>
          {/* Company Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
              <span className="text-base">⚓</span>
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-white font-extrabold text-sm tracking-tight">{config.companyName}</div>
              <div className="text-[#A8C8F0] text-[10px]">HR Management System</div>
            </div>
            <div className="text-white font-bold text-sm sm:hidden">{config.companyName.replace('PT ','')}</div>
          </div>
        </div>

        {/* Right: global search + clock + sync + user */}
        <div className="flex items-center gap-2">
          {/* Global Search */}
          <div className="relative" ref={globalRef}>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-xs pointer-events-none">🔍</span>
              <input
                className="w-36 sm:w-48 h-8 pl-7 pr-3 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/40 transition"
                placeholder="Cari karyawan, log…"
                value={globalSearch}
                onChange={e=>{setGlobalSearch(e.target.value);setGlobalOpen(true);}}
                onFocus={()=>setGlobalOpen(true)}
                onBlur={()=>setTimeout(()=>setGlobalOpen(false),150)}
              />
            </div>
            {globalOpen && globalSearch.trim().length >= 2 && (
              <div className="absolute top-10 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-80 overflow-y-auto">
                {globalResults.emps.length===0 && globalResults.logs_.length===0 && globalResults.ovs.length===0 ? (
                  <div className="p-4 text-sm text-slate-400 text-center">Tidak ada hasil untuk "{globalSearch}"</div>
                ) : (
                  <>
                    {globalResults.emps.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Karyawan</div>
                        {globalResults.emps.map(e=>(
                          <button key={e.id} onMouseDown={()=>{setActivePage('dashboard');setSearchQ(e.nama);setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">{e.nama.charAt(0)}</div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{e.nama}</div>
                              <div className="text-[10px] text-slate-400">{e.posisi||e.departemen}</div>
                            </div>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${e.jatahAwal-e.terpakai<=0?'bg-red-100 text-red-600':e.jatahAwal-e.terpakai<=3?'bg-amber-100 text-amber-600':'bg-emerald-100 text-emerald-600'}`}>
                              {e.jatahAwal-e.terpakai}h
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.logs_.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Log Cuti</div>
                        {globalResults.logs_.map(l=>(
                          <button key={l.id} onMouseDown={()=>{setActivePage('history');setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition">
                            <div className="text-sm font-semibold text-slate-800">{l.nama}</div>
                            <div className="text-[10px] text-slate-400 truncate">{l.keterangan}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.ovs.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Overseas</div>
                        {globalResults.ovs.map(o=>(
                          <button key={o.id} onMouseDown={()=>{setActivePage('overseas');setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition">
                            <div className="text-sm font-semibold text-slate-800">{o.nama} · {o.projectNo}</div>
                            <div className="text-[10px] text-slate-400">{o.lokasi} · {o.tipe}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${syncing?'bg-yellow-400 animate-pulse':online?'bg-emerald-400':'bg-red-500'}`} />
            <span className={`text-[11px] font-medium hidden sm:inline ${syncing?'text-yellow-300':online?'text-emerald-300':'text-red-300'}`}>
              {syncing?'Syncing…':online?'Online':'Offline'}
            </span>
          </span>
          <div className="hidden md:flex bg-[#004880] rounded-lg px-3 py-1.5 items-center gap-2">
            <span className="text-[#A8C8F0] text-[11px] hidden lg:block">{date}</span>
            <span className="text-white text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>
          </div>
          {/* User badge */}
          <div className="flex items-center gap-1.5 bg-[#004880] rounded-lg px-2.5 py-1.5">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-white text-xs font-semibold leading-tight">{currentUser.displayName}</div>
              <div className="text-[#A8C8F0] text-[10px] leading-tight">{roleLabel[currentUser.role]}</div>
            </div>
          </div>
          <button onClick={()=>showConfirm('Logout','Keluar dari sistem?',false,()=>setCurrentUser(null))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition text-sm" title="Logout">
            🚪
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex flex-col flex-shrink-0 bg-[#E8EDF2] border-r border-slate-300 transition-all duration-300 overflow-hidden ${sidebarCollapsed?'w-0':'w-[280px]'}`}>
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Nav */}
            <nav className="p-3 space-y-1">
              {navItems.map(item => (
                <button key={item.key} onClick={()=>setActivePage(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left
                    ${activePage===item.key?'bg-[#005A9E] text-white shadow-sm':'text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}>
                  <span className="text-base">{item.icon}</span> {item.label}
                  {item.key==='calendar' && (
                    <span className="ml-auto text-[9px] font-bold bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                  {item.key==='analytics' && (
                    <span className="ml-auto text-[9px] font-bold bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                  {item.key==='overseas' && stats.overseasActive>0 && (
                    <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{stats.overseasActive}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="h-px bg-slate-300 mx-3" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                {v:stats.total, l:'Karyawan', c:'text-[#005A9E]', bg:'bg-blue-50 border-blue-100'},
                {v:stats.aman,  l:'Cuti Aman', c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-100'},
                {v:stats.low,   l:'Sisa ≤ 3', c:'text-amber-700', bg:'bg-amber-50 border-amber-100'},
                {v:stats.out,   l:'Habis', c:'text-red-600', bg:'bg-red-50 border-red-100'},
              ].map(({v,l,c,bg})=>(
                <div key={l} className={`border rounded-xl p-2 text-center ${bg}`}>
                  <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {/* Only show forms when on dashboard */}
            {activePage === 'dashboard' && (
              <div className="px-3 pb-4 space-y-2">
                <div className="h-px bg-slate-300 mb-3" />
                {can(currentUser.role, 'write') && (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tambah Karyawan Baru</p>
                    <div><label className={lbl}>Nama Karyawan</label>
                      <input className={inp} placeholder="Nama lengkap" value={inpNama} onChange={e=>setInpNama(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSaveEmployee()} />
                    </div>
                    <div><label className={lbl}>Posisi</label>
                      <input className={inp} placeholder="Jabatan/posisi" value={inpPosisi} onChange={e=>setInpPosisi(e.target.value)} />
                    </div>
                    <div><label className={lbl}>Departemen</label>
                      <select className={inp} value={inpDept} onChange={e=>setInpDept(e.target.value)}>
                        {activeDepts.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={lbl}>Tgl Kontrak</label>
                        <input type="date" className={inp} value={inpTgl} onChange={e=>setInpTgl(e.target.value)} />
                      </div>
                      <div><label className={lbl}>Jatah (Hari)</label>
                        <input type="number" min={0} className={inp} value={inpJatah} onChange={e=>setInpJatah(parseInt(e.target.value)||0)} />
                      </div>
                    </div>
                    <button onClick={doSaveEmployee} className="w-full h-10 bg-[#005A9E] hover:bg-[#004880] active:scale-95 text-white rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5">
                      <span>＋</span> Tambah Karyawan
                    </button>
                    <div className="h-px bg-slate-300 !my-3" />
                  </>
                )}
                {/* Pengambilan Cuti — visible for admin/superadmin AND linked viewer */}
                {(can(currentUser.role, 'write') || !!currentUser.linkedEmployeeName) && (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Pengambilan Cuti</p>
                    {currentUser.linkedEmployeeName && currentUser.role === 'viewer' && (
                      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700">
                        🔒 Anda hanya dapat mencatat cuti milik <strong>{currentUser.linkedEmployeeName}</strong>
                      </div>
                    )}
                    {selectedEmp && (
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-blue-700 font-semibold">
                        ✓ Dipilih: {selectedEmp.nama}
                      </div>
                    )}
                    <div><label className={lbl}>Tanggal Mulai</label>
                      <input type="date" className={inp} value={inpMulai} onChange={e=>setInpMulai(e.target.value)} />
                    </div>
                    <div><label className={lbl}>Tanggal Selesai</label>
                      <input type="date" className={inp} value={inpSelesai} onChange={e=>setInpSelesai(e.target.value)} />
                    </div>
                    {cutiPreview && inpMulai && inpSelesai && (
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[12px]">
                        <span className="font-bold text-[#005A9E]">{cutiDays} hari</span>
                        <span className="text-slate-500"> · {fmtDate(inpMulai)} → {fmtDate(inpSelesai)}</span>
                      </div>
                    )}
                    {cutiWarning && (
                      <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-xl text-[12px] font-semibold text-red-600">{cutiWarning}</div>
                    )}
                    <button onClick={doLogCuti} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[13px] font-bold transition">
                      📋 Log Cuti Karyawan
                    </button>
                  </>
                )}
                <div className="h-px bg-slate-300 !mt-3" />
                <button onClick={doExportCSV} className="w-full h-9 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 border border-slate-200 rounded-xl text-[13px] font-semibold transition">
                  📤 Export CSV
                </button>
                {selectedEmp && can(currentUser.role, 'write') && (
                  <button onClick={()=>selectedId&&doResetJatah(selectedId)}
                    className="w-full h-9 bg-white hover:bg-amber-50 active:scale-95 text-amber-700 border border-amber-200 rounded-xl text-[13px] font-semibold transition">
                    ♻️ Reset Jatah Cuti
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Drawer */}
        <>
          {drawerOpen && <div className="fixed inset-0 bg-black/40 z-[200] lg:hidden" onClick={()=>setDrawerOpen(false)} />}
          <div className={`fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-[#E8EDF2] z-[201] flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ${drawerOpen?'translate-x-0':'-translate-x-full'}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-[#005A9E] flex-shrink-0">
              <span className="text-white font-bold text-sm">⚓ Menu</span>
              <button onClick={()=>setDrawerOpen(false)} className="text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#004880] transition">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => (
                <button key={item.key} onClick={()=>{setActivePage(item.key);setDrawerOpen(false);}}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left
                    ${activePage===item.key?'bg-[#005A9E] text-white':'text-slate-600 hover:bg-slate-200'}`}>
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          </div>
        </>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Page header */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-lg">{navItems.find(n=>n.key===activePage)?.icon}</span>
              <span className="font-bold text-slate-800 text-sm">{navItems.find(n=>n.key===activePage)?.label}</span>
              {activePage==='dashboard' && (
                <span className="text-xs text-slate-400">· {filteredEmps.length} karyawan</span>
              )}
            </div>
            {/* Filters for dashboard */}
            {activePage==='dashboard' && (
              <div className="hidden sm:flex items-center gap-2">
                <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E] min-w-[150px]">
                  <option value="">Semua Departemen</option>
                  {activeDepts.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">🔍</span>
                  <input className="w-40 h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E] transition"
                    placeholder="Cari karyawan…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
                </div>
              </div>
            )}
            {activePage==='overseas' && (
              <div className="hidden sm:flex items-center gap-2">
                <select value={ovsFilter} onChange={e=>setOvsFilter(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none">
                  <option value="">Semua Status/Tipe</option>
                  <option value="active">🟢 Active</option>
                  <option value="upcoming">🕐 Upcoming</option>
                  <option value="completed">✅ Selesai</option>
                  <option value="Commissioning">🔧 Commissioning</option>
                  <option value="Service">🛠️ Service</option>
                </select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
                  <input className="w-36 h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]"
                    placeholder="Cari nama/proyek…" value={ovsSearch} onChange={e=>setOvsSearch(e.target.value)} />
                </div>
                {can(currentUser.role, 'write') && (
                  <button onClick={()=>{setOvsEntry(null);setOvsOpen(true);}}
                    className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                    ＋ Tambah
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile search bar */}
          {activePage==='dashboard' && (
            <div className="sm:hidden px-3 py-2 bg-white border-b border-slate-200 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
                <input className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E]"
                  placeholder="Cari…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              </div>
              <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none max-w-[110px]">
                <option value="">Semua</option>
                {activeDepts.map(d=><option key={d} value={d}>{d.length>12?d.slice(0,12)+'…':d}</option>)}
              </select>
              {can(currentUser.role, 'write') && (
                <button onClick={()=>setDrawerOpen(true)} className="h-9 px-3 bg-[#005A9E] text-white rounded-xl text-sm font-bold">＋</button>
              )}
            </div>
          )}

          {/* ── CONTENT AREA ── */}
          <div className="flex-1 overflow-hidden">

            {/* ── PAGE: DASHBOARD ── */}
            {activePage==='dashboard' && (
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                {syncing && (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
                    <span className="w-4 h-4 border-2 border-[#005A9E] border-t-transparent rounded-full animate-spin" />
                    Memuat data dari Firebase…
                  </div>
                )}
                {/* Mobile: cards */}
                <div className="md:hidden space-y-3" onClick={()=>setSelectedId(null)}>
                  {!syncing && filteredEmps.length===0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <div className="text-5xl mb-3">🗂️</div>
                      <p className="text-sm mb-4">Belum ada data karyawan</p>
                      {can(currentUser.role,'write') && (
                        <button onClick={()=>setDrawerOpen(true)} className="px-5 py-2.5 bg-[#005A9E] text-white rounded-xl text-sm font-bold">+ Tambah Karyawan</button>
                      )}
                    </div>
                  ) : filteredEmps.map(emp => {
                    const {label,badge}=statusTag(emp.sisa);
                    const isSel=emp.id===selectedId;
                    return (
                      <div key={emp.id} onClick={e=>{e.stopPropagation();setSelectedId(emp.id);}}
                        className={`rounded-2xl border-2 p-4 cursor-pointer transition-all select-none active:scale-[0.98]
                          ${isSel?'border-[#005A9E] bg-blue-50 shadow-md':'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-bold text-slate-800">{emp.nama}</div>
                            <div className="text-xs text-slate-400">{emp.posisi || emp.departemen}</div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border ${badge}`}>{label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center my-2">
                          {[['Jatah',emp.jatahAwal,'text-slate-600'],['Terpakai',emp.terpakai,'text-orange-600'],['Sisa',emp.sisa,'text-[#005A9E] font-extrabold']].map(([l,v,c])=>(
                            <div key={String(l)} className="bg-slate-50 rounded-xl py-2">
                              <div className={`text-lg font-bold ${c}`}>{v}</div>
                              <div className="text-[10px] text-slate-400 uppercase">{l}</div>
                            </div>
                          ))}
                        </div>
                        {isSel && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                            {can(currentUser.role,'write') && (
                              <button onClick={e=>{e.stopPropagation();doOpenEdit(emp.id);}} className="flex-1 h-9 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition">✏️ Edit</button>
                            )}
                            {can(currentUser.role,'write') && (
                              <button onClick={e=>{e.stopPropagation();doResetJatah(emp.id);}} className="flex-1 h-9 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition">♻️ Reset</button>
                            )}
                            {can(currentUser.role,'delete') && (
                              <button onClick={e=>{e.stopPropagation();doDelete(emp.id);}} className="flex-1 h-9 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition">🗑️ Hapus</button>
                            )}
                            {/* Viewer dengan linked employee bisa log cuti sendiri */}
                            {!can(currentUser.role,'write') && canEditOwnLeave(currentUser, emp.nama) && (
                              <button onClick={e=>{e.stopPropagation();setSelectedId(emp.id);setDrawerOpen(true);}} className="flex-1 h-9 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition">📋 Log Cuti</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Desktop: table */}
                <div className="hidden md:flex bg-white border border-slate-200 rounded-2xl overflow-hidden flex-col" style={{maxHeight:'calc(100vh - 200px)'}}>
                  <div className="overflow-auto flex-1" onClick={()=>setSelectedId(null)}>
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-[#EFF1F3]">
                          {([['nama','Nama'],['departemen','Dept'],['tglKontrak','Kontrak'],['jatahAwal','Jatah'],['terpakai','Terpakai'],['sisa','Sisa'],['sisa','Status']] as [SortCol,string][])
                            .map(([col,label],i)=>(
                            <th key={i} onClick={()=>handleSort(col)}
                              className={`sticky top-0 bg-[#EFF1F3] px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition text-left
                                ${['Kontrak','Jatah','Terpakai','Sisa','Status'].includes(label)?'text-center':''}
                                ${sortCol===col?'text-[#005A9E]':''}`}>
                              {label}{i<6?sArr(col):''}
                            </th>
                          ))}
                          <th className="sticky top-0 bg-[#EFF1F3] px-3 py-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmps.length===0 ? (
                          <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                            <div className="text-4xl mb-3">🗂️</div><p className="text-sm">Belum ada data karyawan</p>
                          </td></tr>
                        ) : filteredEmps.map(emp => {
                          const {label,badge,row}=statusTag(emp.sisa);
                          const isSel=emp.id===selectedId;
                          return (
                            <tr key={emp.id}
                              style={{background:isSel?'#DFF0FF':undefined}}
                              className={`border-b border-slate-100 cursor-pointer transition-colors select-none group ${!isSel?row:''}`}
                              onClick={e=>{e.stopPropagation();setSelectedId(emp.id);}}
                              onDoubleClick={()=>doOpenEdit(emp.id)}
                              onContextMenu={e=>{
                                e.preventDefault();
                                setSelectedId(emp.id); setCtxEmpId(emp.id);
                                setCtxPos({x:Math.min(e.clientX,window.innerWidth-200),y:Math.min(e.clientY,window.innerHeight-140)});
                                setCtxOpen(true);
                              }}>
                              <td className="px-3 py-3">
                                <div className="font-semibold text-slate-800">{emp.nama}</div>
                                {emp.posisi && <div className="text-[10px] text-slate-400 mt-0.5">{emp.posisi}</div>}
                              </td>
                              <td className="px-3 py-3 text-slate-500 text-xs">{emp.departemen}</td>
                              <td className="px-3 py-3 text-center text-xs text-slate-500">{emp.tglKontrak||'-'}</td>
                              <td className="px-3 py-3 text-center font-semibold">{emp.jatahAwal}</td>
                              <td className="px-3 py-3 text-center text-orange-600 font-semibold">{emp.terpakai}</td>
                              <td className="px-3 py-3 text-center font-bold text-[#005A9E]">{emp.sisa}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge}`}>{label}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  {can(currentUser.role,'write') && (
                                    <button onClick={e=>{e.stopPropagation();doOpenEdit(emp.id);}}
                                      className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition" title="Edit">✏️</button>
                                  )}
                                  {can(currentUser.role,'delete') && (
                                    <button onClick={e=>{e.stopPropagation();doDelete(emp.id);}}
                                      className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition" title="Hapus">🗑️</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PAGE: HISTORY ── */}
            {activePage==='history' && (
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col" style={{maxHeight:'calc(100vh - 170px)'}}>
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Log Aktivitas · {logs.length} entri</span>
                    {can(currentUser.role,'delete') && (
                      <button onClick={doClearHistory}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                        🗑️ Bersihkan
                      </button>
                    )}
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-[#EFF1F3]">
                          {([['timestamp','Waktu'],['nama','Nama'],['departemen','Departemen'],['tglCuti','Tgl Cuti'],['keterangan','Keterangan']] as [HistSortCol,string][])
                            .map(([col,label])=>(
                            <th key={col} onClick={()=>handleHistSort(col)}
                              className={`sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition`}>
                              {label}{hArr(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.length===0 ? (
                          <tr><td colSpan={5} className="py-12 text-center text-slate-400">
                            <div className="text-4xl mb-3">📋</div><p className="text-sm">Belum ada log aktivitas</p>
                          </td></tr>
                        ) : filteredLogs.map((log,i) => (
                          <tr key={log.id} className={i%2===0?'bg-white':'bg-slate-50'}>
                            <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-400" style={{fontFamily:"'JetBrains Mono',monospace"}}>{log.timestamp}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{log.nama}</td>
                            <td className="px-3 py-2.5 text-slate-500 text-xs hidden lg:table-cell">{log.departemen||'-'}</td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap text-xs text-slate-500">{log.tglCuti||'-'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{log.keterangan||'-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PAGE: OVERSEAS ── */}
            {activePage==='overseas' && (
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                {/* Mobile add button */}
                <div className="sm:hidden flex gap-2 mb-3">
                  <input className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E]"
                    placeholder="Cari nama/proyek…" value={ovsSearch} onChange={e=>setOvsSearch(e.target.value)} />
                  {can(currentUser.role,'write') && (
                    <button onClick={()=>{setOvsEntry(null);setOvsOpen(true);}} className="h-9 px-3 bg-indigo-600 text-white rounded-xl text-sm font-bold">＋</button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  {[
                    {v:overseas.filter(o=>o.status==='active').length, l:'Berlangsung', c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-200'},
                    {v:overseas.filter(o=>o.status==='upcoming').length, l:'Upcoming', c:'text-blue-700', bg:'bg-blue-50 border-blue-200'},
                    {v:overseas.filter(o=>o.status==='completed').length, l:'Selesai', c:'text-slate-600', bg:'bg-slate-50 border-slate-200'},
                    {v:overseas.filter(o=>o.tipe==='Commissioning').length, l:'Commissioning', c:'text-purple-700', bg:'bg-purple-50 border-purple-200'},
                    {v:overseas.filter(o=>o.tipe==='Mengurus Visa').length, l:'Mengurus Visa', c:'text-blue-700', bg:'bg-blue-100 border-blue-300'},
                  ].map(({v,l,c,bg})=>(
                    <div key={l} className={`border rounded-2xl p-3 text-center ${bg}`}>
                      <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {filteredOverseas.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <div className="text-5xl mb-3">✈️</div>
                      <p className="text-sm">Belum ada data overseas</p>
                      {can(currentUser.role,'write') && (
                        <button onClick={()=>{setOvsEntry(null);setOvsOpen(true);}} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">+ Tambah Overseas</button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto" style={{maxHeight:'calc(100vh - 280px)'}}>
                      <table className="w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-[#EFF1F3]">
                            {['Nama','Tipe','No. Proyek','Lokasi','Berangkat','Kembali','Durasi','Status','Aksi'].map(h=>(
                              <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOverseas.map((o,i) => {
                            const days = countDays(o.tglMulai, o.tglSelesai);
                            const statusInfo = {
                              active: {bg:'bg-emerald-100 text-emerald-700 border-emerald-200', label:'🟢 Active'},
                              upcoming: {bg:'bg-blue-100 text-blue-700 border-blue-200', label:'🕐 Upcoming'},
                              completed: {bg:'bg-slate-100 text-slate-600 border-slate-200', label:'✅ Selesai'},
                            }[o.status];
                            const tipeBadge = o.tipe === 'Commissioning'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : o.tipe === 'Service'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : o.tipe === 'Mengurus Visa'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200';
                            return (
                              <tr key={o.id} className={`border-b border-slate-100 group ${i%2===0?'bg-white':'bg-slate-50'}`}>
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-800">{o.nama}</div>
                                  <div className="text-[10px] text-slate-400">{o.departemen}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${tipeBadge}`}>{o.tipe}</span>
                                </td>
                                <td className="px-3 py-2.5 font-mono font-semibold text-[#005A9E] text-xs">{o.projectNo}</td>
                                <td className="px-3 py-2.5 text-slate-600">{o.lokasi}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(o.tglMulai)}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(o.tglSelesai)}</td>
                                <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600">{days}h</td>
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.bg}`}>{statusInfo.label}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    {can(currentUser.role,'write') && (
                                      <button onClick={()=>{setOvsEntry(o);setOvsOpen(true);}} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">✏️</button>
                                    )}
                                    {can(currentUser.role,'delete') && (
                                      <button onClick={()=>doDeleteOverseas(o.id)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">🗑️</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PAGE: FAT ── */}
            {activePage==='fat' && (
              <FATPage
                fatEntries={fatEntries}
                employees={employees}
                currentUser={currentUser}
                onAdd={()=>{setFatEntry(null);setFatOpen(true);}}
                onEdit={(entry)=>{setFatEntry(entry);setFatOpen(true);}}
                onDelete={doDeleteFAT}
              />
            )}

            {/* ── PAGE: CALENDAR ── */}
            {activePage==='calendar' && (
              <CalendarPage logs={logs} overseas={overseas} />
            )}

            {/* ── PAGE: ANALYTICS ── */}
            {activePage==='analytics' && (
              <AnalyticsPage employees={employees} logs={logs} overseas={overseas} />
            )}

            {/* ── PAGE: CONFIG ── */}
            {activePage==='config' && can(currentUser.role,'config') && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* General Settings */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">⚙️</div>
                      <h3 className="font-bold text-slate-800">Pengaturan Umum</h3>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Perusahaan</label>
                        <input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                          value={cfgCompany} onChange={e=>setCfgCompany(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Akrual Cuti / Bulan (hari)</label>
                          <input type="number" min={0} max={5}
                            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            value={cfgAccrual} onChange={e=>setCfgAccrual(parseInt(e.target.value)||0)} />
                          <p className="text-[10px] text-slate-400 mt-1">Ditambahkan otomatis setiap bulan per tanggal kontrak</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Maks. Saldo Cuti (hari)</label>
                          <input type="number" min={1}
                            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            value={cfgMaxLeave} onChange={e=>setCfgMaxLeave(parseInt(e.target.value)||1)} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Auto Logout (menit)</label>
                          <input type="number" min={5}
                            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            value={cfgAutoLogout} onChange={e=>setCfgAutoLogout(parseInt(e.target.value)||30)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">🏢</div>
                      <h3 className="font-bold text-slate-800">Departemen</h3>
                    </div>
                    <div className="px-5 py-4">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Daftar Departemen (satu per baris)</label>
                      <textarea
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition resize-none"
                        rows={6} value={cfgDepts} onChange={e=>setCfgDepts(e.target.value)} />
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Saat ini: {cfgDepts.split('\n').filter(d=>d.trim()).length} departemen
                      </p>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
                    <div className="font-semibold mb-1">ℹ️ Tentang Akrual Cuti Otomatis</div>
                    <p className="text-xs leading-relaxed">
                      Sistem akan secara otomatis menambahkan <strong>{cfgAccrual} hari</strong> cuti setiap bulan kepada setiap karyawan,
                      dihitung dari tanggal kontrak masing-masing. Penambahan dilakukan pada hari yang sama dengan tanggal kontrak setiap bulannya,
                      minimal setelah 1 bulan bekerja. Saldo maksimal dibatasi <strong>{cfgMaxLeave} hari</strong>.
                    </p>
                  </div>

                  <button onClick={doSaveConfig}
                    className="w-full h-12 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl font-bold text-sm transition active:scale-95">
                    💾 Simpan Konfigurasi
                  </button>
                </div>
              </div>
            )}

            {/* ── PAGE: USER MANAGEMENT ── */}
            {activePage==='users' && can(currentUser.role,'manageUsers') && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Add user form */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">➕</div>
                      <h3 className="font-bold text-slate-800">Tambah User Baru</h3>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Lengkap</label>
                          <input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            placeholder="Nama ditampilkan" value={newUserDisplay} onChange={e=>setNewUserDisplay(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username</label>
                          <input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            placeholder="Username untuk login" value={newUserName} onChange={e=>setNewUserName(e.target.value.toLowerCase())} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                          <input type="password" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            placeholder="Minimal 6 karakter" value={newUserPw} onChange={e=>setNewUserPw(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Role</label>
                          <select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                            value={newUserRole} onChange={e=>setNewUserRole(e.target.value as UserRole)}>
                            <option value="viewer">Viewer — Hanya lihat</option>
                            <option value="admin">Admin — Dapat edit data</option>
                            <option value="superadmin">Super Admin — Akses penuh</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                          Link ke Karyawan <span className="text-slate-300 font-normal">(opsional — agar Viewer bisa log cutinya sendiri)</span>
                        </label>
                        <select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                          value={newUserLinked} onChange={e=>setNewUserLinked(e.target.value)}>
                          <option value="">-- Tidak di-link --</option>
                          {employees.sort((a,b)=>a.nama.localeCompare(b.nama)).map(e=>(
                            <option key={e.id} value={e.nama}>{e.nama} ({e.departemen})</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={doAddUser}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition active:scale-95">
                        ➕ Tambah User
                      </button>
                    </div>
                  </div>

                  {/* Role info */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan Role</span>
                    </div>
                    <div className="px-5 py-4 space-y-2 text-sm">
                      {[
                        {role:'superadmin', label:'Super Admin', desc:'Akses penuh: CRUD karyawan, overseas, config, manajemen user'},
                        {role:'admin', label:'Admin', desc:'Dapat tambah/edit karyawan & overseas, log cuti. Tidak bisa hapus atau konfigurasi'},
                        {role:'viewer', label:'Viewer', desc:'Hanya dapat melihat data. Tidak bisa melakukan perubahan apapun'},
                      ].map(r=>(
                        <div key={r.role} className="flex items-start gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${roleBadge[r.role as UserRole]}`}>{r.label}</span>
                          <span className="text-slate-500 text-xs">{r.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User list */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Terdaftar · {appUsers.length}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {appUsers.map(u => (
                        <div key={u.id} className="px-5 py-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-sm">{u.displayName}</div>
                            <div className="text-xs text-slate-400">@{u.username} · Bergabung {u.createdAt?.slice(0,10)}</div>
                            {u.linkedEmployeeName && (
                              <div className="text-[10px] text-emerald-600 font-medium">🔗 {u.linkedEmployeeName}</div>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadge[u.role]}`}>
                            {roleLabel[u.role]}
                          </span>
                          {u.id === currentUser.id ? (
                            <span className="text-xs text-slate-400 px-2">(Anda)</span>
                          ) : (
                            <button onClick={()=>doDeleteUser(u.id)}
                              className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition text-sm">
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── STATUS BAR ── */}
          <div className="h-7 bg-[#E8EDF2] border-t border-slate-300 flex items-center justify-between px-4 flex-shrink-0">
            <span className="text-[11px] font-semibold text-[#005A9E] truncate" style={{fontFamily:"'JetBrains Mono',monospace"}}>{statusTxt}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:block ml-2">
            {config.companyName} · Batam · HRMS v9.0 · {currentUser.displayName} ({roleLabel[currentUser.role]})
            </span>
          </div>

          {/* ── FOOTER ── */}
          <footer className="w-full border-t border-slate-200 bg-white/95 text-center py-3 text-[11px] text-slate-500">
            Developed by Syifa Dzikri Tsani · Automation Engineer · © 2026 · HRMS v9.0
          </footer>
        </div>
      </div>

      {/* ── CONTEXT MENU ── */}
      {ctxOpen && ctxEmpId && (
        <div style={{position:'fixed',top:ctxPos.y,left:ctxPos.x,zIndex:9999}}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[190px] py-1.5 overflow-hidden" onClick={e=>e.stopPropagation()}>
          {can(currentUser.role,'write') && (
            <button onClick={()=>{setCtxOpen(false);doOpenEdit(ctxEmpId);setCtxEmpId(null);}}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">✏️ Edit Profil</button>
          )}
          {can(currentUser.role,'write') && (
            <button onClick={()=>{setCtxOpen(false);doResetJatah(ctxEmpId);setCtxEmpId(null);}}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">♻️ Reset Jatah Cuti</button>
          )}
          {can(currentUser.role,'delete') && (
            <>
              <div className="h-px bg-slate-100 my-1" />
              <button onClick={()=>{setCtxOpen(false);doDelete(ctxEmpId);setCtxEmpId(null);}}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">❌ Hapus Karyawan</button>
            </>
          )}
        </div>
      )}

      {/* ── DIALOGS ── */}
      <ConfirmDialog open={confirm.open} title={confirm.title} msg={confirm.msg} danger={confirm.danger}
        onOk={()=>{confirm.cb?.();setConfirm(p=>({...p,open:false,cb:null}));}}
        onCancel={()=>setConfirm(p=>({...p,open:false,cb:null}))} />
      <EditDialog open={editOpen} employee={editEmp} departments={activeDepts} onSave={doSaveEdit}
        onClose={()=>{setEditOpen(false);setEditEmp(null);}} />
      <OverseasDialog open={ovsOpen} entry={ovsEntry} employees={employees} currentUser={currentUser}
        onSave={doSaveOverseas} onClose={()=>{setOvsOpen(false);setOvsEntry(null);}} />
      <FATDialog open={fatOpen} entry={fatEntry}
        automationEngineers={employees.filter(e => e.departemen==='Electrical & Automation' && (e.posisi||'').toLowerCase().includes('automation'))}
        fatEntries={fatEntries}
        onSave={doSaveFAT} onClose={()=>{setFatOpen(false);setFatEntry(null);}} />
      <ToastContainer toasts={toasts} onRemove={id=>setToasts(p=>p.filter(t=>t.id!==id))} />

      <style>{`
        @keyframes slideUp      { from{opacity:0;transform:translateY(10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(.94) translateY(8px)}  to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @media (hover:hover) { tbody tr:hover td { background: #EFF8FF !important; } }
        * { -webkit-tap-highlight-color: transparent; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>
    </div>
  );
};

export default HRLeaveManagement;