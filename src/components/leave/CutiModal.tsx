import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { AlertTriangle, CheckCircle2, ClipboardList, Search, UserRound, UserRoundCheck, X } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';

type UserRole = 'superadmin' | 'admin' | 'viewer';

interface AppUserLite {
  role: UserRole;
  linkedEmployeeName?: string;
}

interface EmployeeLite {
  id: string;
  nama: string;
  departemen: string;
  jatahAwal: number;
  terpakai: number;
  rencana?: number;
  gender?: 'L' | 'P';
}

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => toISODate(new Date());

export function CutiModal({
  open,
  employees,
  currentUser,
  onSave,
  onClose,
}: {
  open: boolean;
  employees: EmployeeLite[];
  currentUser: AppUserLite;
  onSave: (empId: string, mulai: string, selesai: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = `${titleId}-sub`;
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  const [selId, setSelId] = useState('');
  const [mulai, setMulai] = useState(todayStr());
  const [selesai, setSelesai] = useState(todayStr());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      if (currentUser.role === 'admin' && currentUser.linkedEmployeeName) {
        const linked = employees.find((e) => e.nama === currentUser.linkedEmployeeName);
        setSelId(linked?.id || '');
      } else {
        setSelId('');
      }
      setMulai(todayStr());
      setSelesai(todayStr());
      setSearch('');
    }
  }, [open, currentUser, employees]);

  if (!open) return null;

  const inp = 'w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition';

  const allowedEmps = employees.filter((e) => {
    if (currentUser.role === 'superadmin') return true;
    if (currentUser.role === 'admin') {
      return !!currentUser.linkedEmployeeName && e.nama === currentUser.linkedEmployeeName;
    }
    return false;
  });

  const filteredEmps = allowedEmps.filter((e) => !search || e.nama.toLowerCase().includes(search.toLowerCase()) || e.departemen.toLowerCase().includes(search.toLowerCase()));
  const selEmp = employees.find((e) => e.id === selId);
  const sisa = selEmp ? selEmp.jatahAwal - selEmp.terpakai - (selEmp.rencana || 0) : 0;
  const days = (mulai && selesai) ? Math.floor((new Date(`${selesai}T00:00:00`).getTime() - new Date(`${mulai}T00:00:00`).getTime()) / 86400000) + 1 : 0;
  const isFuture = mulai ? new Date(`${mulai}T00:00:00`) > new Date(new Date().toDateString()) : false;
  const hasWarning = days > 0 && days > sisa;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg" aria-hidden><ContentLucideIcon icon={ClipboardList} size={16} variant="toolbar" className="text-white" /></div>
            <div>
              <h3 id={titleId} className="font-bold text-base text-white">{t('Pengambilan Cuti', 'Leave Logging')}</h3>
              <p id={subtitleId} className="text-emerald-100 text-[11px]">{t('Catat cuti terpakai atau rencana cuti', 'Record used leave or planned leave')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-lg"><ContentLucideIcon icon={X} size={16} variant="toolbar" className="text-white" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Pilih Karyawan', 'Select Employee')} *</label>
            {allowedEmps.length > 5 && (
              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
                <input className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#005A9E]" placeholder={t('Cari nama karyawan…', 'Search employee name…')} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredEmps.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">{t('Tidak ada karyawan', 'No employees')}</div>
              ) : filteredEmps.map((e) => {
                const s = e.jatahAwal - e.terpakai - (e.rencana || 0);
                const isSel = e.id === selId;
                return (
                  <button type="button" key={e.id} onClick={() => setSelId(e.id)} className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition ${isSel ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base inline-flex">{e.gender === 'P' ? <ContentLucideIcon icon={UserRound} size={14} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={14} variant="toolbar" />}</span>
                      <div>
                        <div className={`text-sm font-semibold ${isSel ? 'text-emerald-700' : 'text-slate-800'}`}>{e.nama}</div>
                        <div className="text-[10px] text-slate-400">{e.departemen}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s <= 0 ? 'bg-red-100 text-red-600' : s <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{s}h {t('sisa', 'remaining')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Tanggal Mulai', 'Start Date')} *</label>
              <input type="date" className={inp} value={mulai} onChange={(e) => setMulai(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Tanggal Selesai', 'End Date')} *</label>
              <input type="date" className={inp} value={selesai} onChange={(e) => setSelesai(e.target.value)} />
            </div>
          </div>

          {selEmp && days > 0 && (
            <div className={`px-4 py-3 rounded-xl border text-sm ${hasWarning ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-bold text-base ${hasWarning ? 'text-red-700' : 'text-emerald-700'}`}>{days} {t('hari', 'days')}</span>
                  <span className="text-slate-500 ml-2 text-xs inline-flex items-center gap-1">{isFuture ? <><ContentLucideIcon icon={ClipboardList} size={11} variant="toolbar" /> {t('Rencana Cuti', 'Planned Leave')}</> : <><ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> {t('Cuti Terpakai', 'Used Leave')}</>}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{t('Sisa sekarang', 'Current remaining')}: <span className="font-bold">{sisa}h</span></div>
                  {!hasWarning && <div className="text-xs text-emerald-600">{t('Sisa setelah', 'Remaining after')}: <span className="font-bold">{sisa - days}h</span></div>}
                </div>
              </div>
              {hasWarning && <div className="text-xs text-red-600 mt-1 font-semibold inline-flex items-center gap-1"><ContentLucideIcon icon={AlertTriangle} size={11} variant="toolbar" /> {t('Jatah tidak cukup! Butuh', 'Quota is not enough! Need')} {days}h, {t('tersedia', 'available')} {sisa}h</div>}
            </div>
          )}
          {!selEmp && <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 text-center">{t('Pilih karyawan untuk melihat sisa cuti', 'Select an employee to see remaining leave')}</div>}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={() => { if (selId && mulai && selesai && days > 0 && !hasWarning) onSave(selId, mulai, selesai); }} disabled={!selId || !mulai || !selesai || days <= 0 || hasWarning} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={ClipboardList} size={14} variant="toolbar" className="text-white" /> {t('Log Cuti', 'Log Leave')}</button>
        </div>
      </div>
    </div>
  );
}
