import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/store';
import type { Employee, LogEntry, OverseasEntry } from '../../types';

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function AnalyticsPage({
  employees,
  logs,
  overseas,
}: {
  employees: Employee[];
  logs: LogEntry[];
  overseas: OverseasEntry[];
}) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'dept' | 'monthly' | 'overseas'>('dept');

  const deptData = useMemo(() => {
    const map: Record<string, { jatah: number; terpakai: number; rencana: number; karyawan: number }> = {};
    employees.forEach((e) => {
      if (!map[e.departemen]) map[e.departemen] = { jatah: 0, terpakai: 0, rencana: 0, karyawan: 0 };
      map[e.departemen].jatah += e.jatahAwal;
      map[e.departemen].terpakai += e.terpakai;
      map[e.departemen].rencana += e.rencana || 0;
      map[e.departemen].karyawan += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].terpakai - a[1].terpakai);
  }, [employees]);

  const monthlyData = useMemo(() => {
    const months: { label: string; key: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `${MONTH_ID[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return months.map((m) => {
      const count = logs.filter((l) => {
        const skip = ['ditambahkan', 'diperbarui', 'reset', 'accrual', 'auto'].some((k) => l.keterangan.toLowerCase().includes(k));
        if (skip) return false;
        return l.timestamp.startsWith(m.key);
      }).length;
      return { ...m, count };
    });
  }, [logs]);

  const overseasData = useMemo(() => {
    const comm = overseas.filter((o) => o.tipe === 'Commissioning').length;
    const serv = overseas.filter((o) => o.tipe === 'Service').length;
    const visa = overseas.filter((o) => o.tipe === 'Mengurus Visa').length;
    const other = overseas.filter((o) => o.tipe === 'Other').length;
    const depts: Record<string, number> = {};
    overseas.forEach((o) => {
      depts[o.departemen] = (depts[o.departemen] || 0) + 1;
    });
    return { comm, serv, visa, other, depts: Object.entries(depts).sort((a, b) => b[1] - a[1]) };
  }, [overseas]);

  const maxDeptVal = Math.max(...deptData.map((d) => d[1].terpakai), 1);
  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const maxOvs = Math.max(...overseasData.depts.map((d) => d[1]), 1);
  const DEPT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
  const totalSisa = employees.reduce((s, e) => s + (e.jatahAwal - e.terpakai - (e.rencana || 0)), 0);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { v: employees.length, l: t('Total Karyawan', 'Total Employees'), c: 'text-[#005A9E]', bg: 'bg-blue-50 border-blue-100' },
          { v: employees.reduce((s, e) => s + e.terpakai, 0), l: t('Cuti Terpakai', 'Used Leave'), c: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
          { v: employees.reduce((s, e) => s + (e.rencana || 0), 0), l: t('Cuti Rencana', 'Planned Leave'), c: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { v: totalSisa, l: t('Sisa Cuti', 'Remaining Leave'), c: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { v: overseas.filter((o) => o.status === 'active').length, l: t('Overseas Aktif', 'Active Overseas'), c: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
        ].map(({ v, l, c, bg }) => (
          <div key={l} className={`border rounded-2xl p-3 text-center ${bg}`}>
            <div className={`text-xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
        {([['dept', t('Per Departemen', 'By Department')], ['monthly', t('Tren Bulanan', 'Monthly Trend')], ['overseas', t('Overseas', 'Overseas')]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setViewMode(k)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === k ? 'bg-white text-[#005A9E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {viewMode === 'dept' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t('Penggunaan Cuti per Departemen', 'Leave Usage by Department')}</div>
          {deptData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t('Belum ada data karyawan', 'No employee data yet')}</p>
          ) : deptData.map(([dept, data], i) => {
            const pct = Math.round((data.terpakai / Math.max(data.jatah, 1)) * 100);
            const barW = Math.round((data.terpakai / maxDeptVal) * 100);
            return (
              <div key={dept}>
                <div className="flex items-center justify-between mb-1">
                  <div><span className="text-sm font-semibold text-slate-700">{dept}</span><span className="text-xs text-slate-400 ml-2">{data.karyawan} {t('karyawan', 'employees')}</span></div>
                  <div className="text-right"><span className="text-sm font-bold text-slate-700">{data.terpakai}</span><span className="text-xs text-slate-400"> / {data.jatah} {t('hari', 'days')} ({pct}%)</span>{data.rencana > 0 && <span className="text-xs text-amber-500 ml-1">+{data.rencana} {t('rencana', 'planned')}</span>}</div>
                </div>
                <div className="h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className={`h-full ${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-lg transition-all`} style={{ width: `${barW}%` }} />
                  <div className="absolute inset-0 flex items-center px-2"><span className="text-[10px] font-bold text-white drop-shadow">{barW > 10 ? `${data.terpakai} ${t('hari', 'days')}` : ''}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">{t('Log Cuti per Bulan (6 Bulan Terakhir)', 'Monthly Leave Logs (Last 6 Months)')}</div>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((m) => {
              const h = Math.max(Math.round((m.count / maxMonthly) * 160), m.count > 0 ? 20 : 4);
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-[#005A9E]">{m.count > 0 ? m.count : ''}</span>
                  <div className="w-full flex items-end justify-center"><div className={`w-full rounded-t-lg transition-all ${m.count > 0 ? 'bg-[#005A9E]' : 'bg-slate-100'}`} style={{ height: `${h}px` }} /></div>
                  <span className="text-[10px] text-slate-400 text-center leading-tight">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'overseas' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{t('Tipe Overseas', 'Overseas Types')}</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: overseasData.comm, l: 'Commissioning', c: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
                { v: overseasData.serv, l: 'Service', c: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
                { v: overseasData.visa, l: t('Mengurus Visa', 'Visa Processing'), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                { v: overseasData.other, l: 'Other', c: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
              ].map(({ v, l, c, bg }) => (
                <div key={l} className={`border rounded-xl p-4 text-center ${bg}`}>
                  <div className={`text-3xl font-extrabold ${c}`}>{v}</div>
                  <div className="text-xs text-slate-400 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('Overseas per Departemen', 'Overseas by Department')}</div>
            {overseasData.depts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{t('Belum ada data overseas', 'No overseas data yet')}</p>
            ) : overseasData.depts.map(([dept, count], i) => {
              const barW = Math.round((count / maxOvs) * 100);
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold text-slate-700">{dept}</span><span className="text-sm font-bold text-slate-700">{count}x</span></div>
                  <div className="h-6 bg-slate-100 rounded-lg overflow-hidden"><div className={`h-full ${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-lg`} style={{ width: `${barW}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
