/**
 * PT Feen Marine — HR Leave Management System
 * Firebase Realtime Database + Fully Responsive (Mobile / Tablet / Desktop)
 *
 * Install dependency:
 *   npm install firebase
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, off, DataSnapshot } from 'firebase/database';

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDJVqxezqWthIg6Lixkrhw-tlWo_uf8WFw",
  authDomain: "feen-marine-hr.firebaseapp.com",
  databaseURL: "https://feen-marine-hr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "feen-marine-hr",
  storageBucket: "feen-marine-hr.firebasestorage.app",
  messagingSenderId: "912900137932",
  appId: "1:912900137932:web:2857c21d0573522630b369",
  measurementId: "G-NLW7347T54"
};
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(firebaseApp);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Electrical & Automation", "Engineering"
];

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; nama: string; departemen: string;
  tglKontrak: string; jatahAwal: number; terpakai: number;
}
interface LogEntry {
  id: string; timestamp: string; nama: string;
  departemen: string; tglCuti: string; keterangan: string;
}
type ToastKind = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: string; msg: string; kind: ToastKind; }
type SortCol = 'nama' | 'departemen' | 'tglKontrak' | 'jatahAwal' | 'terpakai' | 'sisa';
type HistSortCol = 'timestamp' | 'nama' | 'departemen' | 'tglCuti' | 'keterangan' | '';
type ActiveTab = 'dashboard' | 'history';

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

const statusTag = (sisa: number) =>
  sisa <= 0 ? { label:'⛔ Habis',       badge:'bg-red-100 text-red-700',       row:'bg-red-50'    } :
  sisa <= 3 ? { label:`⚠️ Sisa ${sisa}`, badge:'bg-yellow-100 text-yellow-700', row:'bg-yellow-50' } :
              { label:`✅ Sisa ${sisa}`, badge:'bg-green-100 text-green-700',   row:'bg-green-50'  };

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
  const [syncing,   setSyncing]   = useState(true);
  const [online,    setOnline]    = useState(true);

  useEffect(() => {
    const empRef  = ref(db, 'employees');
    const logRef  = ref(db, 'logs');
    const connRef = ref(db, '.info/connected');

    onValue(empRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,Employee>|null;
      setEmployees(data ? Object.values(data) : []);
      setSyncing(false);
    }, () => { setSyncing(false); setOnline(false); });

    onValue(logRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string,LogEntry>|null;
      setLogs(data ? Object.values(data).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,200) : []);
    });

    onValue(connRef, (snap: DataSnapshot) => setOnline(!!snap.val()));
    return () => { off(empRef); off(logRef); off(connRef); };
  }, []);

  const fbSaveEmployee  = useCallback(async (e: Employee)  => set(ref(db,`employees/${e.id}`), e), []);
  const fbDeleteEmployee= useCallback(async (id: string)   => remove(ref(db,`employees/${id}`)), []);
  const fbAddLog        = useCallback(async (entry: Omit<LogEntry,'id'>) => { const id=uid('log'); return set(ref(db,`logs/${id}`),{...entry,id}); }, []);
  const fbClearLogs     = useCallback(async ()              => remove(ref(db,'logs')), []);

  return { employees, logs, syncing, online, fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs };
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
const TSTYLE: Record<ToastKind,string> = {
  success:'bg-green-50 border-green-600 text-green-700',
  error:  'bg-red-50 border-red-600 text-red-700',
  warning:'bg-yellow-50 border-yellow-500 text-yellow-700',
  info:   'bg-blue-50 border-blue-500 text-blue-700',
};
const TICON: Record<ToastKind,string> = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };

function ToastContainer({ toasts, onRemove }: { toasts:ToastItem[]; onRemove:(id:string)=>void }) {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-xs sm:max-w-sm">
      {toasts.map(t => (
        <div key={t.id} onClick={()=>onRemove(t.id)}
          className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold shadow-lg pointer-events-auto ${TSTYLE[t.kind]}`}
          style={{animation:'slideUp .22s ease-out'}}>
          <span className="font-bold flex-shrink-0">{TICON[t.kind]}</span>
          <span className="truncate">{t.msg}</span>
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className="bg-slate-100 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">{danger?'⚠️':'❓'}</span>
          <h3 className="font-bold text-base text-slate-800">{title}</h3>
        </div>
        <div className="px-5 py-4"><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{msg}</p></div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold hover:bg-slate-200 active:scale-95 transition">Batal</button>
          <button onClick={onOk} className={`flex-1 h-11 rounded-xl text-white text-sm font-bold active:scale-95 transition ${danger?'bg-red-600 hover:bg-red-700':'bg-[#005A9E] hover:bg-[#004880]'}`}>Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT DIALOG ─────────────────────────────────────────────────────────────
function EditDialog({ open, employee, onSave, onClose }:
  { open:boolean; employee:Employee|null; onSave:(d:Partial<Employee>)=>void; onClose:()=>void }) {
  const [nama,  setNama]  = useState('');
  const [dept,  setDept]  = useState(DEPARTMENTS[0]);
  const [tgl,   setTgl]   = useState('');
  const [jatah, setJatah] = useState(12);
  useEffect(() => {
    if (employee) { setNama(employee.nama); setDept(employee.departemen); setTgl(employee.tglKontrak); setJatah(employee.jatahAwal); }
  }, [employee]);
  if (!open) return null;
  const inputCls = "w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:bg-white transition";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{animation:'scaleIn .18s ease-out'}}>
        <div className="bg-slate-100 px-5 py-4 flex items-center gap-3">
          <span>✏️</span><h3 className="font-bold text-base text-slate-800">Edit Data Karyawan</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Karyawan</label>
            <input className={inputCls} value={nama} onChange={e=>setNama(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Departemen</label>
            <select className={inputCls} value={dept} onChange={e=>setDept(e.target.value)}>
              {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tgl Kontrak</label>
              <input type="date" className={inputCls} value={tgl} onChange={e=>setTgl(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jatah (Hari)</label>
              <input type="number" min={1} className={inputCls} value={jatah} onChange={e=>setJatah(parseInt(e.target.value)||12)} />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold hover:bg-slate-200 active:scale-95 transition">Batal</button>
          <button onClick={()=>{ if(nama.trim()) onSave({nama:nama.trim(),departemen:dept,tglKontrak:tgl,jatahAwal:jatah||12}); }}
            className="flex-1 h-11 rounded-xl bg-[#005A9E] text-white text-sm font-bold hover:bg-[#004880] active:scale-95 transition">💾 Simpan</button>
        </div>
      </div>
    </div>
  );
}

// ─── EMPLOYEE CARD (Mobile) ───────────────────────────────────────────────────
function EmployeeCard({ emp, selected, onSelect, onEdit, onDelete, onReset }:
  { emp:Employee&{sisa:number}; selected:boolean; onSelect:()=>void; onEdit:()=>void; onDelete:()=>void; onReset:()=>void }) {
  const { label, badge } = statusTag(emp.sisa);
  return (
    <div onClick={(e)=>{e.stopPropagation();onSelect();}}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all select-none active:scale-[0.98]
        ${selected ? 'border-[#005A9E] bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 truncate">{emp.nama}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{emp.departemen}</div>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${badge}`}>{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center my-2">
        {[['Jatah',emp.jatahAwal,'text-slate-600'],['Terpakai',emp.terpakai,'text-orange-600'],['Sisa',emp.sisa,'text-[#005A9E] font-extrabold']].map(([l,v,c])=>(
          <div key={String(l)} className="bg-slate-50 rounded-xl py-2">
            <div className={`text-lg font-bold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 uppercase">{l}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-400">Kontrak: {emp.tglKontrak||'-'}</div>
      {selected && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
          <button onClick={e=>{e.stopPropagation();onEdit();}}   className="flex-1 h-9 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 active:scale-95 transition">✏️ Edit</button>
          <button onClick={e=>{e.stopPropagation();onReset();}}  className="flex-1 h-9 bg-yellow-50 text-yellow-700 rounded-xl text-xs font-bold hover:bg-yellow-100 active:scale-95 transition">♻️ Reset</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} className="flex-1 h-9 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 active:scale-95 transition">🗑️ Hapus</button>
        </div>
      )}
    </div>
  );
}

// ─── DRAWER (Mobile Sidebar) ──────────────────────────────────────────────────
function Drawer({ open, onClose, children }: { open:boolean; onClose:()=>void; children:React.ReactNode }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[200] lg:hidden" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-[#E8EDF2] z-[201] flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ${open?'translate-x-0':'-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-[#005A9E] flex-shrink-0">
          <span className="text-white font-bold text-sm">⚓ Menu & Form</span>
          <button onClick={onClose} className="text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#004880] transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

// ─── SIDEBAR CONTENT ─────────────────────────────────────────────────────────
interface SBProps {
  stats:{total:number;aman:number;low:number;out:number};
  inpNama:string; setInpNama:(v:string)=>void;
  inpDept:string; setInpDept:(v:string)=>void;
  inpTgl:string;  setInpTgl:(v:string)=>void;
  inpJatah:number;setInpJatah:(v:number)=>void;
  inpMulai:string;setInpMulai:(v:string)=>void;
  inpSelesai:string;setInpSelesai:(v:string)=>void;
  cutiDays:number; cutiPreview:boolean; cutiWarning:string;
  selectedEmp:Employee|null;
  onSave:()=>void; onLog:()=>void; onExport:()=>void; onRefresh:()=>void; onReset:()=>void;
}
function SidebarContent(p: SBProps) {
  const inp = "w-full h-10 px-3 bg-[#EFF1F3] border border-slate-300 rounded-xl text-[13px] outline-none focus:border-[#005A9E] focus:bg-white transition";
  const lbl = "block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1";
  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {[{v:p.stats.total,l:'Total\nKaryawan',c:'text-blue-600'},{v:p.stats.aman,l:'Cuti\nAman',c:'text-green-700'},
          {v:p.stats.low, l:'Sisa\n≤ 3',c:'text-yellow-700'},{v:p.stats.out,l:'Cuti\nHabis',c:'text-red-600'}]
          .map(({v,l,c})=>(
          <div key={l} className="bg-white border border-slate-300 rounded-xl p-2 text-center">
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5 whitespace-pre-line">{l}</div>
          </div>
        ))}
      </div>
      <div className="h-px bg-slate-300" />
      <div className="px-3 py-3 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">Tambah Karyawan Baru</p>
        <div><label className={lbl}>Nama Karyawan</label>
          <input className={inp} placeholder="Nama lengkap" value={p.inpNama} onChange={e=>p.setInpNama(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&p.onSave()} />
        </div>
        <div><label className={lbl}>Departemen</label>
          <select className={inp} value={p.inpDept} onChange={e=>p.setInpDept(e.target.value)}>
            {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Tanggal Kontrak</label>
          <input type="date" className={inp} value={p.inpTgl} onChange={e=>p.setInpTgl(e.target.value)} />
        </div>
        <div><label className={lbl}>Jatah Cuti (Hari/Tahun)</label>
          <input type="number" min={1} className={inp} placeholder="12" value={p.inpJatah} onChange={e=>p.setInpJatah(parseInt(e.target.value)||0)} />
        </div>
        <button onClick={p.onSave} className="w-full h-10 bg-[#005A9E] hover:bg-[#004880] active:scale-95 text-white rounded-xl text-[13px] font-bold transition">➕ Tambah Karyawan</button>

        <div className="h-px bg-slate-300 !my-3" />

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pengambilan Cuti</p>
        {p.selectedEmp && (
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-blue-700 font-semibold">
            ✓ Dipilih: {p.selectedEmp.nama}
          </div>
        )}
        <div><label className={lbl}>Tanggal Mulai</label>
          <input type="date" className={inp} value={p.inpMulai} onChange={e=>p.setInpMulai(e.target.value)} />
        </div>
        <div><label className={lbl}>Tanggal Selesai</label>
          <input type="date" className={inp} value={p.inpSelesai} onChange={e=>p.setInpSelesai(e.target.value)} />
        </div>
        {p.cutiPreview && p.inpMulai && p.inpSelesai && (
          <div className="px-3 py-2 bg-[#EFF1F3] border border-slate-300 rounded-xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Durasi Cuti</div>
            <div className="text-[13px] font-bold text-[#005A9E]">{fmtDate(p.inpMulai)} → {fmtDate(p.inpSelesai)} · {p.cutiDays} hari</div>
          </div>
        )}
        {p.cutiWarning && (
          <div className="px-3 py-2 bg-red-50 border border-red-400 rounded-xl text-[12px] font-semibold text-red-600">{p.cutiWarning}</div>
        )}
        <button onClick={p.onLog} className="w-full h-10 bg-[#1A7F37] hover:bg-[#156D2F] active:scale-95 text-white rounded-xl text-[13px] font-bold transition">📋 Log Cuti Karyawan</button>

        <div className="h-px bg-slate-300 !my-3" />
        <button onClick={p.onExport}  className="w-full h-9 bg-[#EFF1F3] hover:bg-slate-300 active:scale-95 text-slate-600 border border-slate-300 rounded-xl text-[13px] font-bold transition">📤 Export CSV</button>
        <button onClick={p.onRefresh} className="w-full h-9 bg-[#EFF1F3] hover:bg-slate-300 active:scale-95 text-slate-600 border border-slate-300 rounded-xl text-[13px] font-bold transition mt-1.5">🔄 Refresh Data</button>
        {p.selectedEmp && (
          <button onClick={p.onReset} className="w-full h-9 bg-[#EFF1F3] hover:bg-yellow-100 active:scale-95 text-yellow-700 border border-yellow-400 rounded-xl text-[13px] font-bold transition mt-1.5">♻️ Reset Jatah Cuti</button>
        )}
        <div className="pb-6" />
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const HRLeaveManagement: React.FC = () => {
  const { time, date } = useClock();
  const { employees, logs, syncing, online, fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs } = useFirebase();

  const [selectedId,  setSelectedId]  = useState<string|null>(null);
  const [activeTab,   setActiveTab]   = useState<ActiveTab>('dashboard');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [toasts,      setToasts]      = useState<ToastItem[]>([]);

  // Form inputs
  const [inpNama,    setInpNama]    = useState('');
  const [inpDept,    setInpDept]    = useState(DEPARTMENTS[0]);
  const [inpTgl,     setInpTgl]     = useState(todayStr);
  const [inpJatah,   setInpJatah]   = useState(12);
  const [inpMulai,   setInpMulai]   = useState(todayStr);
  const [inpSelesai, setInpSelesai] = useState(todayStr);

  // Sort + filter
  const [sortCol,    setSortCol]    = useState<SortCol>('nama');
  const [sortAsc,    setSortAsc]    = useState(true);
  const [histSort,   setHistSort]   = useState<HistSortCol>('');
  const [histAsc,    setHistAsc]    = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQ,    setSearchQ]    = useState('');

  // Status bar
  const [statusTxt, setStatusTxt]  = useState('● Siap');
  const stRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos,  setCtxPos]  = useState({x:0,y:0});
  const [ctxEmpId, setCtxEmpId] = useState<string|null>(null);

  // Dialogs
  const [confirm, setConfirm] = useState<{open:boolean;title:string;msg:string;danger:boolean;cb:(()=>void)|null}>({open:false,title:'',msg:'',danger:false,cb:null});
  const [editOpen,setEditOpen] = useState(false);
  const [editEmp, setEditEmp]  = useState<Employee|null>(null);

  // Derived values
  const selectedEmp   = employees.find(e=>e.id===selectedId) || null;
  const sisaSelected  = selectedEmp ? selectedEmp.jatahAwal - selectedEmp.terpakai : null;
  const cutiDays      = (inpMulai && inpSelesai) ? countDays(inpMulai, inpSelesai) : 0;
  const cutiPreview   = cutiDays > 0 && !(cutiDays > (sisaSelected ?? Infinity));
  const cutiWarning   =
    cutiDays <= 0 && inpMulai && inpSelesai ? '⚠ Tanggal selesai harus setelah tanggal mulai!' :
    (sisaSelected !== null && cutiDays > 0 && cutiDays > sisaSelected)
      ? `⚠ Kurang! Butuh ${cutiDays} hari, sisa cuti ${selectedEmp!.nama} hanya ${sisaSelected} hari.` : '';

  const stats = {
    total: employees.length,
    aman:  employees.filter(e=>e.jatahAwal-e.terpakai>3).length,
    low:   employees.filter(e=>{const s=e.jatahAwal-e.terpakai;return s>0&&s<=3;}).length,
    out:   employees.filter(e=>e.jatahAwal-e.terpakai<=0).length,
  };

  const filteredEmps = employees
    .map(e=>({...e,sisa:e.jatahAwal-e.terpakai}))
    .filter(e=>(!deptFilter||e.departemen===deptFilter)&&(!searchQ||e.nama.toLowerCase().includes(searchQ.toLowerCase())||e.departemen.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a,b)=>{
      const nums:SortCol[]=['jatahAwal','terpakai','sisa'];
      let va:string|number=(a as any)[sortCol]??'', vb:string|number=(b as any)[sortCol]??'';
      if(nums.includes(sortCol)){va=Number(va)||0;vb=Number(vb)||0;}
      else{va=String(va).toLowerCase();vb=String(vb).toLowerCase();}
      return sortAsc?(va>vb?1:va<vb?-1:0):(va<vb?1:va>vb?-1:0);
    });

  const filteredLogs = [...logs].sort((a,b)=>{
    if(!histSort) return 0;
    const va=String((a as any)[histSort]||'').toLowerCase(), vb=String((b as any)[histSort]||'').toLowerCase();
    return histAsc?(va>vb?1:va<vb?-1:0):(va<vb?1:va>vb?-1:0);
  });

  useEffect(()=>{
    const close=()=>{setCtxOpen(false);setCtxEmpId(null);};
    document.addEventListener('click',close);
    return ()=>document.removeEventListener('click',close);
  },[]);

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  const setStatus = (msg:string) => {
    if(stRef.current) clearTimeout(stRef.current);
    setStatusTxt(msg);
    stRef.current = setTimeout(()=>setStatusTxt('● Siap'),5000);
  };
  const toast = useCallback((msg:string, kind:ToastKind='success')=>{
    const id=uid('t');
    setToasts(p=>[...p,{id,msg,kind}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3200);
  },[]);
  const showConfirm=(title:string,msg:string,danger:boolean,cb:()=>void)=>setConfirm({open:true,title,msg,danger,cb});
  const handleSort    =(c:SortCol)    =>{if(sortCol===c)setSortAsc(a=>!a);else{setSortCol(c);setSortAsc(true);}};
  const handleHistSort=(c:HistSortCol)=>{if(histSort===c)setHistAsc(a=>!a);else{setHistSort(c);setHistAsc(true);}};
  const sArr=(c:SortCol)    =>sortCol===c?(sortAsc?' ▲':' ▼'):'';
  const hArr=(c:HistSortCol)=>histSort===c?(histAsc?' ▲':' ▼'):'';

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const doSaveEmployee = async () => {
    if(!inpNama.trim()){toast('Nama karyawan tidak boleh kosong!','error');return;}
    if(!inpTgl)        {toast('Tanggal kontrak harus diisi!','error');return;}
    if(inpJatah<=0)    {toast('Jatah cuti harus lebih dari 0!','error');return;}
    if(employees.find(e=>e.nama.toLowerCase()===inpNama.toLowerCase().trim())){toast(`'${inpNama}' sudah terdaftar!`,'warning');return;}
    const emp:Employee={id:uid('emp'),nama:inpNama.trim(),departemen:inpDept,tglKontrak:inpTgl,jatahAwal:inpJatah,terpakai:0};
    await fbSaveEmployee(emp);
    await fbAddLog({timestamp:nowTs(),nama:emp.nama,departemen:emp.departemen,tglCuti:inpTgl,keterangan:`Karyawan baru ditambahkan (Jatah: ${inpJatah} hari)`});
    setInpNama(''); setInpJatah(12);
    setStatus(`✓ '${emp.nama}' ditambahkan.`);
    toast(`'${emp.nama}' — ${emp.departemen} berhasil ditambahkan.`,'success');
    setDrawerOpen(false);
  };

  const doLogCuti = () => {
    if(!selectedId)       {toast('Pilih karyawan di tabel terlebih dahulu.','warning');return;}
    const emp=employees.find(e=>e.id===selectedId);
    if(!emp)              {toast('Karyawan tidak ditemukan!','error');return;}
    const sisa=emp.jatahAwal-emp.terpakai;
    if(sisa<=0)           {toast(`Jatah cuti '${emp.nama}' sudah habis!`,'error');return;}
    if(!inpMulai||!inpSelesai){toast('Tanggal cuti harus diisi!','error');return;}
    const days=countDays(inpMulai,inpSelesai);
    if(days<=0)           {toast('Tanggal selesai harus setelah tanggal mulai!','error');return;}
    if(days>sisa)         {toast(`Jatah tidak cukup! Butuh ${days} hari, sisa ${sisa} hari.`,'error');return;}
    const range=inpMulai===inpSelesai?fmtDate(inpMulai):`${fmtDate(inpMulai)} s/d ${fmtDate(inpSelesai)}`;
    showConfirm('Konfirmasi Cuti',`Catat cuti untuk:\n${emp.nama}  ·  ${emp.departemen}\nTanggal: ${range}\nDurasi: ${days} hari`,false,async()=>{
      await fbSaveEmployee({...emp,terpakai:emp.terpakai+days});
      const ket=days===1?'Cuti 1 Hari':`Cuti ${days} Hari (${inpMulai} s/d ${inpSelesai})`;
      await fbAddLog({timestamp:nowTs(),nama:emp.nama,departemen:emp.departemen,tglCuti:`${inpMulai} s/d ${inpSelesai}`,keterangan:ket});
      setStatus(`✓ Cuti ${emp.nama} (${days} hari) dicatat.`);
      toast(`Cuti '${emp.nama}' ${days} hari berhasil dicatat.`,'success');
      setDrawerOpen(false);
    });
  };

  const doResetJatah=(id:string)=>{
    const emp=employees.find(e=>e.id===id); if(!emp) return;
    showConfirm('Reset Jatah Cuti',`Reset jatah cuti '${emp.nama}' (${emp.departemen})\nkembali ke ${emp.jatahAwal} hari (Terpakai → 0)?\n\nAksi ini akan dicatat di log.`,false,async()=>{
      await fbSaveEmployee({...emp,terpakai:0});
      await fbAddLog({timestamp:nowTs(),nama:emp.nama,departemen:emp.departemen,tglCuti:todayStr(),keterangan:`Reset Jatah → ${emp.jatahAwal} hari`});
      setStatus(`♻ Jatah cuti '${emp.nama}' direset.`);
      toast(`Jatah cuti '${emp.nama}' berhasil direset.`,'success');
    });
  };

  const doDelete=(id:string)=>{
    const emp=employees.find(e=>e.id===id); if(!emp) return;
    showConfirm('Hapus Karyawan',`Data '${emp.nama}' akan dihapus permanen.\nLanjutkan?`,true,async()=>{
      await fbDeleteEmployee(id);
      setSelectedId(null);
      setStatus(`✕ Data '${emp.nama}' dihapus.`);
      toast(`Karyawan '${emp.nama}' dihapus.`,'warning');
    });
  };

  const doOpenEdit=(id:string)=>{const emp=employees.find(e=>e.id===id);if(!emp)return;setEditEmp(emp);setEditOpen(true);};

  const doSaveEdit=async(data:Partial<Employee>)=>{
    if(!editEmp)return;
    await fbSaveEmployee({...editEmp,...data});
    setStatus(`✓ Data '${data.nama}' diperbarui.`);
    toast(`Data '${data.nama}' diperbarui.`,'success');
    setEditOpen(false); setEditEmp(null);
  };

  const doExportCSV=()=>{
    const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    let csv='Nama,Departemen,Tgl_Kontrak,Jatah_Awal,Terpakai,Sisa\n';
    employees.forEach(e=>{csv+=`"${e.nama}","${e.departemen}","${e.tglKontrak}",${e.jatahAwal},${e.terpakai},${e.jatahAwal-e.terpakai}\n`;});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`export_cuti_feenmarine_${ts}.csv`; a.click();
    setStatus('✓ Data berhasil diekspor.'); toast('Ekspor CSV berhasil!','success');
  };

  const doClearHistory=()=>showConfirm('Bersihkan History','Semua log aktivitas cuti akan dihapus permanen.\nLanjutkan?',true,async()=>{
    await fbClearLogs();
    setStatus('✓ Log history dibersihkan.'); toast('Semua log history dihapus.','info');
  });

  // ─── SIDEBAR PROPS ────────────────────────────────────────────────────────
  const sbProps:SBProps={
    stats, inpNama, setInpNama, inpDept, setInpDept, inpTgl, setInpTgl, inpJatah, setInpJatah,
    inpMulai, setInpMulai, inpSelesai, setInpSelesai,
    cutiDays, cutiPreview, cutiWarning, selectedEmp,
    onSave:doSaveEmployee, onLog:doLogCuti, onExport:doExportCSV,
    onRefresh:()=>{setStatus('✓ Data direfresh.');toast('Data berhasil direfresh.','info');},
    onReset:()=>selectedId&&doResetJatah(selectedId),
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#F0F4F8] overflow-hidden" style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* TOP BAR */}
      <div className="h-14 sm:h-[62px] bg-[#005A9E] flex items-center justify-between px-3 sm:px-6 z-20 flex-shrink-0 shadow">
        <div className="flex items-center gap-2">
          <button onClick={()=>setDrawerOpen(true)} className="lg:hidden text-white text-xl p-1.5 -ml-1 hover:bg-[#004880] rounded-lg transition" aria-label="Menu">☰</button>
          <span className="text-xl sm:text-2xl">⚓</span>
          <div className="leading-tight">
            <div className="text-sm sm:text-lg font-extrabold text-white tracking-tight">PT Feen Marine</div>
            <div className="hidden sm:block text-[#A8C8F0] text-[11px] font-normal">HR Leave Management System</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync status */}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className={`w-2 h-2 rounded-full ${syncing?'bg-yellow-400 animate-pulse':online?'bg-green-400':'bg-red-500'}`} />
            <span className={`hidden sm:inline ${syncing?'text-yellow-300':online?'text-green-300':'text-red-300'}`}>
              {syncing?'Syncing…':online?'Firebase':'Offline'}
            </span>
          </span>
          <div className="bg-[#004880] rounded-lg px-3 py-1.5 items-center gap-2 hidden sm:flex">
            <span className="text-[#A8C8F0] text-[11px] font-medium hidden md:block">{date}</span>
            <span className="text-white text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-[300px] flex-shrink-0 bg-[#E8EDF2] border-r border-slate-300 flex-col overflow-y-auto">
          <SidebarContent {...sbProps} />
        </div>

        {/* Mobile / Tablet Drawer */}
        <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)}>
          <SidebarContent {...sbProps} />
        </Drawer>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* TABS TOOLBAR */}
          <div className="h-12 sm:h-[50px] bg-white border-b border-slate-300 flex items-center flex-shrink-0 px-1">
            {(['dashboard','history'] as ActiveTab[]).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                className={`h-12 sm:h-[50px] px-3 sm:px-5 border-b-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap
                  ${activeTab===tab?'text-[#005A9E] border-[#005A9E] bg-[#EFF1F3]':'text-slate-500 border-transparent hover:bg-[#EFF1F3] hover:text-slate-800'}`}>
                {tab==='dashboard'?'📊 Dashboard':'📜 Log History'}
              </button>
            ))}
            {/* Filters — only on sm+ */}
            <div className="hidden sm:flex items-center gap-2 ml-auto pr-2">
              <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                className="hidden md:block h-9 px-2 bg-[#EFF1F3] border border-slate-300 rounded-lg text-[12px] outline-none min-w-[160px]">
                <option value="">Semua Departemen</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none">🔍</span>
                <input className="w-36 sm:w-44 h-9 pl-7 pr-3 bg-[#EFF1F3] border border-slate-300 rounded-lg text-[12px] outline-none focus:border-[#005A9E] focus:bg-white transition"
                  placeholder="Cari karyawan…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Mobile search + filter bar */}
          <div className="sm:hidden px-3 py-2 bg-white border-b border-slate-200 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none">🔍</span>
              <input className="w-full h-9 pl-7 pr-3 bg-[#EFF1F3] border border-slate-300 rounded-xl text-[13px] outline-none focus:border-[#005A9E] transition"
                placeholder="Cari karyawan…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
            </div>
            <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
              className="h-9 px-2 bg-[#EFF1F3] border border-slate-300 rounded-xl text-[12px] outline-none max-w-[110px]">
              <option value="">Semua</option>
              {DEPARTMENTS.map(d=><option key={d} value={d}>{d.length>12?d.slice(0,12)+'…':d}</option>)}
            </select>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-hidden">

            {/* ── DASHBOARD ── */}
            {activeTab==='dashboard'&&(
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                {syncing&&(
                  <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm">
                    <span className="w-4 h-4 border-2 border-[#005A9E] border-t-transparent rounded-full animate-spin inline-block" />
                    Memuat data dari Firebase…
                  </div>
                )}

                {/* Mobile/Tablet small: Card list */}
                <div className="md:hidden space-y-3" onClick={()=>setSelectedId(null)}>
                  {!syncing&&filteredEmps.length===0?(
                    <div className="text-center py-16 text-slate-400">
                      <div className="text-5xl mb-3">🗂️</div>
                      <p className="text-sm mb-4">Belum ada data karyawan</p>
                      <button onClick={()=>setDrawerOpen(true)} className="px-5 py-2.5 bg-[#005A9E] text-white rounded-xl text-sm font-bold active:scale-95 transition">+ Tambah Karyawan</button>
                    </div>
                  ):filteredEmps.map(emp=>(
                    <EmployeeCard key={emp.id} emp={emp}
                      selected={emp.id===selectedId}
                      onSelect={()=>setSelectedId(emp.id)}
                      onEdit={()=>doOpenEdit(emp.id)}
                      onDelete={()=>doDelete(emp.id)}
                      onReset={()=>doResetJatah(emp.id)} />
                  ))}
                </div>

                {/* Desktop/Tablet large: Table */}
                <div className="hidden md:flex bg-white border border-slate-300 rounded-xl overflow-hidden flex-col" style={{maxHeight:'calc(100vh - 200px)'}}>
                  <div className="px-4 py-2.5 border-b border-slate-300 flex items-center justify-between flex-shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Data Karyawan · PT Feen Marine</span>
                    <span className="text-[11px] text-slate-400 hidden lg:block">Klik kanan baris untuk aksi · Double-click untuk edit</span>
                  </div>
                  <div className="overflow-auto flex-1" onClick={()=>setSelectedId(null)}>
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr>
                          {([['nama','Nama'],['departemen','Departemen'],['tglKontrak','Kontrak'],
                             ['jatahAwal','Jatah'],['terpakai','Terpakai'],['sisa','Sisa'],['sisa','Status']] as [SortCol,string][])
                            .map(([col,label],i)=>(
                            <th key={i} onClick={()=>handleSort(col)}
                              className={`sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-300 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition text-left
                                ${['Kontrak','Jatah','Terpakai','Sisa','Status'].includes(label)?'text-center':''}
                                ${sortCol===col?'text-[#005A9E]':''}`}>
                              {label}{i<6?sArr(col):''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmps.length===0?(
                          <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                            <div className="text-4xl mb-3">🗂️</div><p className="text-sm">Belum ada data karyawan</p>
                          </td></tr>
                        ):filteredEmps.map(emp=>{
                          const {label,badge,row}=statusTag(emp.sisa);
                          const isSel=emp.id===selectedId;
                          return (
                            <tr key={emp.id}
                              style={{background:isSel?'#DFF0FF':undefined}}
                              className={`border-b border-slate-200 cursor-pointer transition-colors select-none ${!isSel?row:''}`}
                              onClick={(e)=>{e.stopPropagation();setSelectedId(emp.id);}}
                              onDoubleClick={()=>doOpenEdit(emp.id)}
                              onContextMenu={e=>{
                                e.preventDefault();
                                setSelectedId(emp.id);
                                setCtxEmpId(emp.id);
                                setCtxPos({x:Math.min(e.clientX,window.innerWidth-200),y:Math.min(e.clientY,window.innerHeight-120)});
                                setCtxOpen(true);
                              }}>
                              <td className="px-3 py-2.5">
                                <div className="font-bold">{emp.nama}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5" style={{fontFamily:"'JetBrains Mono',monospace"}}>{emp.departemen}</div>
                              </td>
                              <td className="px-3 py-2.5 hidden lg:table-cell">{emp.departemen}</td>
                              <td className="px-3 py-2.5 text-center">{emp.tglKontrak||'-'}</td>
                              <td className="px-3 py-2.5 text-center">{emp.jatahAwal}</td>
                              <td className="px-3 py-2.5 text-center">{emp.terpakai}</td>
                              <td className="px-3 py-2.5 text-center font-bold">{emp.sisa}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${badge}`}>{label}</span>
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

            {/* ── HISTORY ── */}
            {activeTab==='history'&&(
              <div className="h-full overflow-y-auto p-2 sm:p-4">
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden flex flex-col" style={{maxHeight:'calc(100vh - 180px)'}}>
                  <div className="px-4 py-2.5 border-b border-slate-300 flex items-center justify-between flex-shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Log Aktivitas · PT Feen Marine</span>
                    <button onClick={doClearHistory}
                      className="h-8 px-3 rounded-lg border border-slate-300 bg-[#EFF1F3] text-slate-500 text-[12px] font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95 transition">
                      🗑️ Bersihkan
                    </button>
                  </div>
                  {/* Mobile: card logs */}
                  <div className="sm:hidden overflow-y-auto divide-y divide-slate-100">
                    {filteredLogs.length===0?(
                      <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📋</div><p className="text-sm">Belum ada log</p></div>
                    ):filteredLogs.map(log=>(
                      <div key={log.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="font-bold text-sm text-slate-800">{log.nama}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex-shrink-0">{log.timestamp.slice(0,10)}</div>
                        </div>
                        <div className="text-xs text-slate-500">{log.departemen}</div>
                        <div className="text-xs text-[#005A9E] font-semibold mt-1">{log.keterangan}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{log.tglCuti}</div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop: table logs */}
                  <div className="hidden sm:block overflow-auto flex-1">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr>
                          {([['timestamp','Waktu'],['nama','Nama'],['departemen','Departemen'],['tglCuti','Tgl Cuti'],['keterangan','Keterangan']] as [HistSortCol,string][])
                            .map(([col,label])=>(
                            <th key={col} onClick={()=>handleHistSort(col)}
                              className={`sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-300 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition
                                ${col==='tglCuti'?'text-center':''}
                                ${histSort===col?'text-[#005A9E]':''}`}>
                              {label}{hArr(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.length===0?(
                          <tr><td colSpan={5} className="py-12 text-center text-slate-400">
                            <div className="text-4xl mb-3">📋</div><p className="text-sm">Belum ada log aktivitas</p>
                          </td></tr>
                        ):filteredLogs.map((log,i)=>(
                          <tr key={log.id} className={i%2===0?'bg-white':'bg-slate-50'}>
                            <td className="px-3 py-2.5 whitespace-nowrap text-[11px]" style={{fontFamily:"'JetBrains Mono',monospace"}}>{log.timestamp}</td>
                            <td className="px-3 py-2.5 font-bold">{log.nama}</td>
                            <td className="px-3 py-2.5 hidden lg:table-cell">{log.departemen||'-'}</td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">{log.tglCuti||'-'}</td>
                            <td className="px-3 py-2.5">{log.keterangan||'-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STATUS BAR */}
          <div className="h-8 bg-[#E8EDF2] border-t border-slate-300 flex items-center justify-between px-3 sm:px-4 flex-shrink-0">
            <span className="text-[11px] font-bold text-[#005A9E] truncate" style={{fontFamily:"'JetBrains Mono',monospace"}}>{statusTxt}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:block flex-shrink-0 ml-2">PT Feen Marine · Batam · HRMS v6.0</span>
          </div>
        </div>
      </div>

      {/* CONTEXT MENU */}
      {ctxOpen&&ctxEmpId&&(
        <div style={{position:'fixed',top:ctxPos.y,left:ctxPos.x,zIndex:9999}}
          className="bg-white border border-slate-200 rounded-xl shadow-xl min-w-[180px] py-1" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{setCtxOpen(false);doOpenEdit(ctxEmpId);setCtxEmpId(null);}}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition">✏️ Edit Profil</button>
          <button onClick={()=>{setCtxOpen(false);doResetJatah(ctxEmpId);setCtxEmpId(null);}}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition">♻️ Reset Jatah Cuti</button>
          <div className="h-px bg-slate-200 my-1" />
          <button onClick={()=>{setCtxOpen(false);doDelete(ctxEmpId);setCtxEmpId(null);}}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">❌ Hapus Karyawan</button>
        </div>
      )}

      {/* DIALOGS */}
      <ConfirmDialog open={confirm.open} title={confirm.title} msg={confirm.msg} danger={confirm.danger}
        onOk={()=>{confirm.cb?.();setConfirm(p=>({...p,open:false,cb:null}));}}
        onCancel={()=>setConfirm(p=>({...p,open:false,cb:null}))} />
      <EditDialog open={editOpen} employee={editEmp} onSave={doSaveEdit}
        onClose={()=>{setEditOpen(false);setEditEmp(null);}} />
      <ToastContainer toasts={toasts} onRemove={id=>setToasts(p=>p.filter(t=>t.id!==id))} />

      {/* GLOBAL STYLES */}
      <style>{`
        @keyframes slideUp  { from{opacity:0;transform:translateY(10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(.94) translateY(8px)}  to{opacity:1;transform:scale(1) translateY(0)} }
        @media (hover:hover) { tbody tr:hover td { background: #DFF0FF !important; } }
        * { -webkit-tap-highlight-color: transparent; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.6; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default HRLeaveManagement;