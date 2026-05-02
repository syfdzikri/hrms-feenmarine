import { AlertTriangle, ClipboardList, Clock3, FlaskConical, Plane, Users, PlaneLanding } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { parseLeaveRange } from '../../utils/leave';
import { useI18n } from '../../i18n/store';
import type { ActivePage, Employee, FATEntry, IzinEntry, LogEntry, OverseasEntry } from '../../types';
import { getCurrentIzinPeriode } from '../../utils/izinPeriod';

type DashboardWidgetsProps = {
  logs: LogEntry[];
  overseas: OverseasEntry[];
  employees: Employee[];
  izinEntries: IzinEntry[];
  fatEntries: FATEntry[];
  stats: { aman: number; low: number; out: number };
  setActivePage: (page: ActivePage) => void;
  fmtDate: (d: string) => string;
  todayStr: () => string;
  getWeekRange: (baseDate?: Date) => { startISO: string; endISO: string };
  toISODate: (d: Date) => string;
  izinCutoffDay: number;
  izinMaxPerPeriode: number;
};

export function DashboardWidgets({
  logs,
  overseas,
  employees,
  izinEntries,
  fatEntries,
  stats,
  setActivePage,
  fmtDate,
  todayStr,
  getWeekRange,
  toISODate,
  izinCutoffDay,
  izinMaxPerPeriode,
}: DashboardWidgetsProps) {
  const { t } = useI18n();
  const todayISO = todayStr();
  const { startISO: weekStartISO, endISO: weekEndISO } = getWeekRange();
  const leaveLogsOnly = logs.filter(
    (l) =>
      l.logType === 'leave' ||
      (l.logType === undefined &&
        (l.status === 'used' || l.status === 'planned') &&
        !['ditambahkan', 'diperbarui', 'reset', 'accrual', 'auto'].some((k) => l.keterangan?.toLowerCase().includes(k))),
  );

  const returningThisWeek = overseas.filter((o) => o.tglSelesai >= weekStartISO && o.tglSelesai <= weekEndISO);
  const lowLeave = employees.filter((e) => {
    const sisa = e.jatahAwal - e.terpakai - (e.rencana || 0);
    return sisa > 0 && sisa <= 3;
  });
  const onLeaveToday = Array.from(
    new Set(
      leaveLogsOnly
        .filter((l) => l.leaveStatus !== 'canceled')
        .filter((l) => {
          const range = parseLeaveRange(l.tglCuti);
          return !!range && todayISO >= range.start && todayISO <= range.end;
        })
        .map((l) => l.nama),
    ),
  );
  const izinToday = Array.from(new Set(izinEntries.filter((iz) => iz.tanggal === todayISO && iz.status !== 'rejected').map((iz) => iz.employeeName)));
  const fatThisWeek = fatEntries.filter((f) => {
    if (!f.fatDateTime) return false;
    const d = new Date(f.fatDateTime);
    if (isNaN(d.getTime())) return false;
    const ds = toISODate(d);
    return ds >= weekStartISO && ds <= weekEndISO;
  });
  const overseasToday = Array.from(new Set(overseas.filter((o) => o.tglMulai <= todayISO && o.tglSelesai >= todayISO).map((o) => o.nama)));
  const totalEmp = employees.length || 1;
  const amanPct = Math.round((stats.aman / totalEmp) * 100);
  const lowPct = Math.round((stats.low / totalEmp) * 100);
  const outPct = Math.round((stats.out / totalEmp) * 100);
  const r = 20;
  const circ = 2 * Math.PI * r;
  const activeIzinPeriod = getCurrentIzinPeriode(izinCutoffDay);
  const maxIzinQuota = Math.max(1, izinMaxPerPeriode || 3);
  const izinUsedByEmployee = employees.map((emp) => {
    const used = izinEntries.filter((iz) => iz.employeeName === emp.nama && iz.periode === activeIzinPeriod && iz.status !== 'rejected').length;
    return { name: emp.nama, used, remaining: maxIzinQuota - used };
  });
  const izinSafe = izinUsedByEmployee.filter((x) => x.remaining > 1).length;
  const izinLow = izinUsedByEmployee.filter((x) => x.remaining === 1).length;
  const izinOut = izinUsedByEmployee.filter((x) => x.remaining <= 0).length;

  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { key: 'users', Icon: Users, v: employees.length, l: t('Total Karyawan', 'Total Employees'), c: 'text-[#005A9E]', bg: 'bg-blue-50 border-blue-200', page: 'users' as ActivePage, hint: t('Buka data karyawan', 'Open employee data') },
          { key: 'overseas', Icon: Plane, v: overseasToday.length, l: t('Overseas Hari Ini', 'Overseas Today'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', page: 'overseas' as ActivePage, hint: t('Lihat overseas aktif hari ini', 'View active overseas today') },
          { key: 'leave', Icon: ClipboardList, v: onLeaveToday.length, l: t('Cuti Hari Ini', 'Leave Today'), c: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', page: 'leave' as ActivePage, hint: t('Buka modul cuti', 'Open leave module') },
          { key: 'izin', Icon: Clock3, v: izinToday.length, l: t('Izin Hari Ini', 'Permit Today'), c: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', page: 'izin' as ActivePage, hint: t('Buka modul izin', 'Open permit module') },
          { key: 'fat', Icon: FlaskConical, v: fatThisWeek.length, l: t('FAT Minggu Ini', 'FAT This Week'), c: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', page: 'fat' as ActivePage, hint: t('Buka jadwal FAT minggu ini', 'Open this week FAT schedule') },
        ].map(({ key, Icon, v, l, c, bg, page, hint }) => (
          <button key={l} type="button" onClick={() => setActivePage(page)} className={`dashboard-kpi-card dashboard-kpi-card--${key} border rounded-2xl p-3 flex items-center gap-3 text-left transition hover:shadow-sm hover:-translate-y-[1px] active:scale-[0.99] ${bg}`} title={hint}>
            <span className="text-2xl">
              <ContentLucideIcon icon={Icon} size={22} variant="dashboard-kpi" />
            </span>
            <div>
              <div className={`text-2xl font-extrabold leading-none ${c}`}>{v}</div>
              <div className="dashboard-kpi-subtext text-[10px] text-slate-400 mt-0.5 font-medium">{l}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <button type="button" onClick={() => setActivePage('leave')} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 text-left transition hover:shadow-sm hover:border-slate-300">
          <div className="relative flex-shrink-0">
            <svg width="72" height="72" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
              <circle cx="24" cy="24" r={r} fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray={`${(amanPct / 100) * circ} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
              <circle cx="24" cy="24" r={r} fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray={`${(lowPct / 100) * circ} ${circ}`} strokeDashoffset={-(amanPct / 100) * circ + circ * 0.25} strokeLinecap="round" />
              <circle cx="24" cy="24" r={r} fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray={`${(outPct / 100) * circ} ${circ}`} strokeDashoffset={-((amanPct + lowPct) / 100) * circ + circ * 0.25} strokeLinecap="round" />
              <text x="24" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">{employees.length}</text>
            </svg>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{t('Status Cuti', 'Leave Status')}</div>
            {[{ color: 'bg-emerald-500', l: t('Aman', 'Safe'), v: stats.aman }, { color: 'bg-amber-400', l: t('Sisa ≤ 3', 'Remaining ≤ 3'), v: stats.low }, { color: 'bg-red-500', l: t('Habis', 'Exhausted'), v: stats.out }].map(({ color, l, v }) => (
              <div key={l} className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-slate-500">{l}</span>
                <span className="ml-auto font-bold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </button>

        <button type="button" onClick={() => setActivePage('izin')} className="bg-white border border-violet-200 rounded-2xl p-4 text-left transition hover:shadow-sm hover:border-violet-300">
          <div className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">{t('Status Jatah Izin', 'Permit Quota Status')}</div>
          {[{ color: 'bg-violet-500', l: t('Aman', 'Safe'), v: izinSafe }, { color: 'bg-fuchsia-400', l: t('Sisa 1x', 'Remaining 1x'), v: izinLow }, { color: 'bg-rose-500', l: t('Habis', 'Exhausted'), v: izinOut }].map(({ color, l, v }) => (
            <div key={l} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
              <span className="text-slate-500">{l}</span>
              <span className="ml-auto font-bold text-slate-700">{v}</span>
            </div>
          ))}
          <div className="dashboard-kpi-subtext mt-2 text-[10px] text-slate-400">
            {t('Periode aktif', 'Active period')}: {activeIzinPeriod} · {t('Maks', 'Max')} {maxIzinQuota}x/{t('karyawan', 'employee')}
          </div>
        </button>

        <button type="button" onClick={() => setActivePage('overseas')} className="bg-white border border-slate-200 rounded-2xl p-4 text-left transition hover:shadow-sm hover:border-slate-300">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ContentLucideIcon icon={PlaneLanding} size={12} variant="toolbar" /> {t('Kembali Minggu Ini', 'Returning This Week')} <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{returningThisWeek.length}</span></div>
          {returningThisWeek.length === 0 ? <p className="text-xs text-slate-400 text-center py-3">{t('Tidak ada yang kembali', 'No returners')}</p> : <div className="space-y-1.5 max-h-24 overflow-y-auto">{returningThisWeek.slice(0, 5).map((o) => <div key={o.id} className="flex items-center gap-2 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" /><span className="font-semibold text-slate-700 truncate">{o.nama}</span><span className="ml-auto text-slate-400 flex-shrink-0">{fmtDate(o.tglSelesai)}</span></div>)}{returningThisWeek.length > 5 && <div className="text-[10px] text-slate-400">+{returningThisWeek.length - 5} {t('lainnya', 'others')}</div>}</div>}
        </button>

        <button type="button" onClick={() => setActivePage('leave')} className={`border rounded-2xl p-4 text-left transition hover:shadow-sm ${lowLeave.length > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-amber-700"><ContentLucideIcon icon={AlertTriangle} size={12} variant="toolbar" /> {t('Cuti Hampir Habis', 'Leave Almost Exhausted')} <span className="ml-auto bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{lowLeave.length}</span></div>
          {lowLeave.length === 0 ? <p className="text-xs text-slate-400 text-center py-3">{t('Semua karyawan aman', 'All employees are safe')}</p> : <div className="space-y-1.5 max-h-24 overflow-y-auto">{lowLeave.slice(0, 5).map((e) => { const sisa = e.jatahAwal - e.terpakai - (e.rencana || 0); return <div key={e.id} className="flex items-center gap-2 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span className="font-semibold text-slate-700 truncate">{e.nama}</span><span className="ml-auto font-bold text-amber-700 flex-shrink-0">{sisa}h</span></div>; })}{lowLeave.length > 5 && <div className="text-[10px] text-slate-400">+{lowLeave.length - 5} {t('lainnya', 'others')}</div>}</div>}
        </button>
      </div>
    </div>
  );
}
