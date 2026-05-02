import { useI18n } from '../../i18n/store';
import { CalendarDays, ClipboardList, FileX2, Pencil, RotateCcw, Search } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface LeaveLogLite {
  id: string;
  nama: string;
  tglCuti: string;
  days?: number;
  status?: 'used' | 'planned';
  leaveStatus?: 'planned' | 'completed' | 'canceled' | 'revised';
}

interface EmployeeStatusLite {
  id: string;
  nama: string;
  departemen: string;
  posisi?: string;
  jatahAwal: number;
  terpakai: number;
  rencana?: number;
  sisa: number;
}

interface UserLite {
  linkedEmployeeName?: string;
  role: 'superadmin' | 'admin' | 'viewer';
}

export function LeaveStatusTab({
  searchQ,
  setSearchQ,
  deptFilter,
  setDeptFilter,
  departments,
  filteredEmps,
  statusTag,
  leaveLogs,
  canWrite,
  currentUser,
  canEditEmployeeRecord,
  onLogCuti,
  onEditJatah,
  onResetJatah,
}: {
  searchQ: string;
  setSearchQ: (v: string) => void;
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  departments: string[];
  filteredEmps: EmployeeStatusLite[];
  statusTag: (sisa: number, rencana?: number) => { label: string; badge: string };
  leaveLogs: LeaveLogLite[];
  canWrite: boolean;
  currentUser: UserLite;
  canEditEmployeeRecord: (user: UserLite, empNama?: string | null) => boolean;
  onLogCuti: () => void;
  onEditJatah: (id: string) => void;
  onResetJatah: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
          <input className="w-48 h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A9E]" placeholder={t('Cari nama karyawan…', 'Search employee name…')} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-9 px-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A9E]">
          <option value="">{t('Semua Departemen', 'All Departments')}</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredEmps.map((emp) => {
          const { label, badge } = statusTag(emp.sisa, emp.rencana);
          const pctUsed = emp.jatahAwal > 0 ? Math.min(100, Math.round((emp.terpakai / emp.jatahAwal) * 100)) : 0;
          const pctPlan = emp.jatahAwal > 0 ? Math.min(100 - pctUsed, Math.round(((emp.rencana || 0) / emp.jatahAwal) * 100)) : 0;
          const empLogs = leaveLogs.filter((l) => l.nama === emp.nama && (l.leaveStatus === 'planned' || l.status === 'planned')).slice(0, 3);
          return (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition hover:border-slate-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">{emp.nama.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{emp.nama}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{emp.posisi || emp.departemen}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${badge}`}>{label}</span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>{t('Penggunaan cuti', 'Leave usage')}</span>
                  <span className="font-semibold text-slate-600">{emp.terpakai + (emp.rencana || 0)} / {emp.jatahAwal} {t('hari', 'days')}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-orange-400 rounded-l-full transition-all" style={{ width: `${pctUsed}%` }} />
                  <div className="bg-blue-300 transition-all" style={{ width: `${pctPlan}%` }} />
                </div>
                <div className="flex gap-3 mt-1 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-sm inline-block" />{t('Terpakai', 'Used')}: {emp.terpakai}h</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-300 rounded-sm inline-block" />{t('Rencana', 'Planned')}: {emp.rencana || 0}h</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-sm inline-block" />{t('Sisa', 'Remaining')}: {emp.sisa}h</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { l: t('Jatah', 'Quota'), v: emp.jatahAwal, c: 'text-slate-700' },
                  { l: t('Terpakai', 'Used'), v: emp.terpakai, c: 'text-orange-600' },
                  { l: t('Rencana', 'Planned'), v: emp.rencana || 0, c: 'text-blue-600' },
                  { l: t('Sisa', 'Remaining'), v: emp.sisa, c: emp.sisa <= 0 ? 'text-red-600' : emp.sisa <= 3 ? 'text-amber-600' : 'text-emerald-600' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className={`font-bold text-base ${c}`}>{v}</div>
                    <div className="text-[9px] text-slate-400">{l}</div>
                  </div>
                ))}
              </div>

              {empLogs.length > 0 && (
                <div className="border-t border-slate-100 pt-2 mt-1">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('Rencana Mendatang', 'Upcoming Plans')}</div>
                  <div className="space-y-1">
                    {empLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600 inline-flex items-center gap-1"><ContentLucideIcon icon={CalendarDays} size={10} variant="toolbar" /> {log.tglCuti}</span>
                        <span className="font-bold text-blue-600">{log.days || '?'}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canWrite && (
                <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-100">
                  <button type="button" onClick={onLogCuti} className="flex-1 h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={ClipboardList} size={12} variant="toolbar" /> {t('Catat Cuti', 'Record Leave')}</button>
                  {canEditEmployeeRecord(currentUser, emp.nama) && <button type="button" onClick={() => onEditJatah(emp.id)} className="h-8 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /> {t('Jatah', 'Quota')}</button>}
                  {canEditEmployeeRecord(currentUser, emp.nama) && <button type="button" onClick={() => onResetJatah(emp.id)} className="h-8 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold transition inline-flex items-center"><ContentLucideIcon icon={RotateCcw} size={12} variant="toolbar" /></button>}
                </div>
              )}
            </div>
          );
        })}
        {filteredEmps.length === 0 && (
          <div className="col-span-3 py-16 text-center text-slate-400">
            <div className="text-4xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={FileX2} size={32} /></div>
            <p className="text-sm">{t('Tidak ada karyawan ditemukan', 'No employees found')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
