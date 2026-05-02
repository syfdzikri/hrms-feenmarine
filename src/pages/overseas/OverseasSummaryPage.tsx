import { useMemo, useState } from 'react';
import { Plane, Search } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';
import type { OverseasEntry } from '../../types';
import { fmtDate } from '../../utils/common';

export function OverseasSummaryPage({
  overseas,
  totalsByName,
  onBack,
}: {
  overseas: OverseasEntry[];
  totalsByName: Record<string, number>;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const map: Record<
      string,
      { nama: string; departemen: string; total: number; trips: number; lastStart?: string; lastProject?: string; lastStatus?: OverseasEntry['status'] }
    > = {};
    overseas.forEach((o) => {
      if (o.status === 'upcoming') return;
      const r = map[o.nama] || { nama: o.nama, departemen: o.departemen, total: 0, trips: 0 };
      r.trips += 1;
      const prev = r.lastStart || '';
      if (!prev || o.tglMulai > prev) {
        r.lastStart = o.tglMulai;
        r.lastProject = `${o.projectType || '-'} · ${o.projectNo}`;
        r.lastStatus = o.status;
      }
      map[o.nama] = r;
    });

    const list = Object.values(map).map((r) => ({
      ...r,
      total: totalsByName[r.nama] || 0,
    }));

    const qq = q.trim().toLowerCase();
    return list
      .filter((r) => !qq || r.nama.toLowerCase().includes(qq) || (r.departemen || '').toLowerCase().includes(qq) || (r.lastProject || '').toLowerCase().includes(qq))
      .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama));
  }, [overseas, totalsByName, q]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition">
            ← {t('Kembali', 'Back')}
          </button>
          <div>
            <div className="text-sm font-extrabold text-slate-800">{t('Ringkasan Total Hari Overseas', 'Overseas Total Days Summary')}</div>
            <div className="text-xs text-slate-400 mt-0.5">{t('Menampilkan akumulasi hari overseas per karyawan (record upcoming tidak dihitung).', 'Shows accumulated overseas days per employee (upcoming records are excluded).')}</div>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
          <input className="w-56 h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A9E]" placeholder={t('Cari nama/dept/proyek…', 'Search name/dept/project…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={Plane} size={40} /></div>
            <p className="text-sm">{t('Belum ada data overseas untuk diringkas', 'No overseas data to summarize yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[min(70dvh,calc(100dvh-14rem))]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {[t('Karyawan', 'Employee'), t('Departemen', 'Department'), t('Total Hari', 'Total Days'), t('Trip (record)', 'Trip (records)'), t('Terakhir', 'Latest')].map((h) => (
                    <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.nama} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-2.5"><div className="font-semibold text-slate-800">{r.nama}</div></td>
                    <td className="px-3 py-2.5 text-slate-600">{r.departemen || '-'}</td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">{r.total} {t('hari', 'days')}</span></td>
                    <td className="px-3 py-2.5 text-slate-600 font-semibold">{r.trips}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-slate-700 font-semibold">{r.lastProject || '-'}</div>
                      <div className="text-[10px] text-slate-400">{r.lastStart ? `${fmtDate(r.lastStart)} · ${r.lastStatus}` : '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
