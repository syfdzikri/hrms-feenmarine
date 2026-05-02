import { useI18n } from '../../i18n/store';
import { ClipboardList, Info, Palmtree } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface EmployeeLeaveLite {
  id: string;
  nama: string;
  departemen: string;
  jatahAwal: number;
  terpakai: number;
  rencana?: number;
}

interface LeaveLogLite {
  id: string;
  nama: string;
  departemen: string;
  tglCuti: string;
  days?: number;
}

export function LeaveApplyTab({
  canWrite,
  onLogCuti,
  departments,
  employees,
  onLeaveToday,
}: {
  canWrite: boolean;
  onLogCuti: () => void;
  departments: string[];
  employees: EmployeeLeaveLite[];
  onLeaveToday: LeaveLogLite[];
}) {
  const { t } = useI18n();
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <div className="text-2xl flex-shrink-0 inline-flex"><ContentLucideIcon icon={Info} size={20} variant="toolbar" /></div>
        <div>
          <div className="font-bold text-blue-800 text-sm">{t('Cara Pengajuan Cuti', 'How to Submit Leave')}</div>
          <div className="text-blue-700 text-xs mt-1 space-y-1">
            <p>1. {t('Klik tombol', 'Click')} <strong>"{t('Pengajuan Cuti', 'Leave Request')}"</strong> {t('di pojok kanan atas.', 'at the top right.')}</p>
            <p>2. {t('Pilih karyawan yang akan mengambil cuti.', 'Select the employee who will take leave.')}</p>
            <p>3. {t('Pilih tanggal mulai dan tanggal selesai cuti.', 'Select leave start and end dates.')}</p>
            <p>4. {t('Sistem akan otomatis menghitung durasi dan memvalidasi saldo cuti.', 'The system will automatically calculate duration and validate leave balance.')}</p>
            <p>5. {t('Cuti masa lampau dicatat sebagai', 'Past leave is recorded as')} <strong>{t('Terpakai', 'Used')}</strong>, {t('cuti masa depan sebagai', 'future leave as')} <strong>{t('Rencana', 'Planned')}</strong>.</p>
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-5 text-white">
          <div className="font-bold text-lg mb-1">{t('Ajukan Cuti Sekarang', 'Submit Leave Now')}</div>
          <p className="text-emerald-100 text-sm mb-4">{t('Catat cuti terpakai atau jadwalkan rencana cuti karyawan.', 'Record used leave or schedule employee planned leave.')}</p>
          <button type="button" onClick={onLogCuti} className="h-10 px-6 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 active:scale-95 transition shadow-sm">
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={ClipboardList} size={14} variant="toolbar" className="text-emerald-700" /> {t('Buat Pengajuan Cuti', 'Create Leave Request')}</span>
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-3">{t('Ringkasan Per Departemen', 'Summary by Department')}</h3>
        <div className="space-y-2">
          {departments.map((dept) => {
            const deptEmps = employees.filter((e) => e.departemen === dept);
            if (!deptEmps.length) return null;
            const totalQuota = deptEmps.reduce((s, e) => s + e.jatahAwal, 0);
            const totalUsed = deptEmps.reduce((s, e) => s + e.terpakai, 0);
            const totalPlan = deptEmps.reduce((s, e) => s + (e.rencana || 0), 0);
            const totalSisa = totalQuota - totalUsed - totalPlan;
            const pct = totalQuota > 0 ? Math.round(((totalUsed + totalPlan) / totalQuota) * 100) : 0;
            return (
              <div key={dept} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-semibold text-slate-700 text-xs">{dept}</div>
                  <div className="text-[10px] text-slate-400">{deptEmps.length} {t('karyawan', 'employees')} · {pct}% {t('terpakai', 'used')}</div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex mb-1.5">
                  <div className="bg-orange-400 transition-all" style={{ width: `${totalQuota > 0 ? Math.min(100, Math.round((totalUsed / totalQuota) * 100)) : 0}%` }} />
                  <div className="bg-blue-300 transition-all" style={{ width: `${totalQuota > 0 ? Math.min(100, Math.round((totalPlan / totalQuota) * 100)) : 0}%` }} />
                </div>
                <div className="flex gap-3 text-[9px] text-slate-400">
                  <span>{t('Total', 'Total')}: {totalQuota}h</span>
                  <span className="text-orange-500">{t('Terpakai', 'Used')}: {totalUsed}h</span>
                  <span className="text-blue-500">{t('Rencana', 'Planned')}: {totalPlan}h</span>
                  <span className="text-emerald-600 font-semibold">{t('Sisa', 'Remaining')}: {totalSisa}h</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onLeaveToday.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-3 inline-flex items-center gap-1"><ContentLucideIcon icon={Palmtree} size={14} variant="toolbar" /> {t('Sedang Cuti Hari Ini', 'On Leave Today')} ({onLeaveToday.length})</h3>
          <div className="space-y-2">
            {onLeaveToday.map((l) => (
              <div key={l.id} className="flex items-center gap-2.5 p-2 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center font-bold text-amber-700 text-xs flex-shrink-0">
                  {l.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-xs">{l.nama}</div>
                  <div className="text-[10px] text-slate-400">{l.departemen} · {l.tglCuti}</div>
                </div>
                <span className="text-xs font-bold text-amber-700">{l.days || '?'}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
