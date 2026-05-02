import { useI18n } from '../../i18n/store';
import { BriefcaseBusiness, ClipboardList, Pencil, RotateCcw, Search } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface EmployeeBalanceLite {
  id: string;
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  terpakai: number;
  rencana?: number;
  sisa: number;
  posisi?: string;
}

interface UserLite {
  linkedEmployeeName?: string;
  role: 'superadmin' | 'admin' | 'viewer';
}

export function LeaveBalanceTab({
  searchQ,
  setSearchQ,
  deptFilter,
  setDeptFilter,
  departments,
  filteredEmps,
  statusTag,
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
  filteredEmps: EmployeeBalanceLite[];
  statusTag: (sisa: number, rencana?: number) => { label: string; badge: string };
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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[t('Karyawan', 'Employee'), t('Departemen', 'Department'), t('Tgl Kontrak', 'Contract Date'), t('Jatah', 'Quota'), t('Terpakai', 'Used'), t('Rencana', 'Planned'), t('Sisa', 'Remaining'), t('Status', 'Status'), t('Aksi', 'Actions')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmps.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400"><div className="text-4xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={BriefcaseBusiness} size={32} /></div><p className="text-sm">{t('Belum ada data karyawan', 'No employee data yet')}</p></td></tr>
              ) : filteredEmps.map((emp, i) => {
                const { label, badge } = statusTag(emp.sisa, emp.rencana);
                return (
                  <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50 transition group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-xs flex-shrink-0">{emp.nama.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{emp.nama}</div>
                          {emp.posisi && <div className="text-[10px] text-slate-400">{emp.posisi}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{emp.departemen}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{emp.tglKontrak || '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">{emp.jatahAwal}</td>
                    <td className="px-4 py-3 text-center font-semibold text-orange-600">{emp.terpakai}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{emp.rencana || 0}</td>
                    <td className="px-4 py-3 text-center font-bold text-[#005A9E]">{emp.sisa}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                        {canWrite && <button type="button" onClick={onLogCuti} className="h-7 px-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition whitespace-nowrap inline-flex items-center gap-1"><ContentLucideIcon icon={ClipboardList} size={11} variant="toolbar" /> {t('Cuti', 'Leave')}</button>}
                        {canEditEmployeeRecord(currentUser, emp.nama) && <button type="button" onClick={() => onEditJatah(emp.id)} className="h-7 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition whitespace-nowrap inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={11} variant="toolbar" /> {t('Jatah', 'Quota')}</button>}
                        {canEditEmployeeRecord(currentUser, emp.nama) && <button type="button" onClick={() => onResetJatah(emp.id)} className="h-7 px-2 bg-amber-50 text-amber-600 rounded-lg text-xs hover:bg-amber-100 transition inline-flex items-center" title={t('Reset jatah', 'Reset quota')}><ContentLucideIcon icon={RotateCcw} size={11} variant="toolbar" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-400 rounded-full inline-block" /><strong>{t('Aman', 'Safe')}</strong> — {t('sisa', 'remaining')} &gt; 3 {t('hari', 'days')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded-full inline-block" /><strong>{t('Menipis', 'Low')}</strong> — {t('sisa', 'remaining')} 1-3 {t('hari', 'days')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded-full inline-block" /><strong>{t('Habis', 'Exhausted')}</strong> — {t('sisa', 'remaining')} 0 {t('hari', 'days')}</span>
      </div>
    </div>
  );
}
