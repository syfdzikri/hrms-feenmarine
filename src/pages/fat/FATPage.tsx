import { useMemo } from 'react';
import { ArrowRightLeft, BarChart3, CheckCircle2, Clock3, FlaskConical, Pencil, Plus, Star, Trash2, UserRound } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';
import type { AppUser, Employee, FATEntry } from '../../types';
import { can } from '../../utils/permissions';

export function FATPage({
  fatEntries,
  employees,
  currentUser,
  onAdd,
  onEdit,
  onDelete,
}: {
  fatEntries: FATEntry[];
  employees: Employee[];
  currentUser: AppUser;
  onAdd: () => void;
  onEdit: (entry: FATEntry) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const automationEngineers = employees.filter(
    (e) =>
      e.departemen === 'Electrical & Automation' &&
      (e.posisi || '').toLowerCase().includes('automation') &&
      !(e.posisi || '').toLowerCase().includes('manager') &&
      !(e.posisi || '').toLowerCase().includes('head') &&
      (!e.gender || e.gender === 'L'),
  );

  const nowDate = new Date();
  const fatCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    automationEngineers.forEach((e) => {
      map[e.nama] = 0;
    });
    fatEntries
      .filter((f) => new Date(f.fatDateTime) <= nowDate)
      .forEach((f) => {
        if (map[f.assignedTo] !== undefined) map[f.assignedTo]++;
        else map[f.assignedTo] = (map[f.assignedTo] || 0) + 1;
      });
    return map;
  }, [fatEntries, automationEngineers, nowDate]);

  const sortedEngineers = useMemo(() => {
    return [...automationEngineers].sort((a, b) => {
      const countA = fatCountMap[a.nama] || 0;
      const countB = fatCountMap[b.nama] || 0;
      if (countA !== countB) return countA - countB;
      return a.nama.localeCompare(b.nama);
    });
  }, [automationEngineers, fatCountMap]);

  const recommendation = sortedEngineers[0]?.nama || null;
  const backupRecommendation = sortedEngineers[1]?.nama || null;

  const now = new Date();
  const upcoming = fatEntries.filter((f) => new Date(f.fatDateTime) > now);
  const past = fatEntries.filter((f) => new Date(f.fatDateTime) <= now);

  const fmtDateTime = (dt: string) => {
    if (!dt) return '-';
    const d = new Date(dt);
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const classBadge: Record<string, string> = {
    ClassNK: 'bg-blue-100 text-blue-700 border-blue-200',
    DNV: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LR: 'bg-red-100 text-red-700 border-red-200',
    BV: 'bg-purple-100 text-purple-700 border-purple-200',
    ABS: 'bg-amber-100 text-amber-700 border-amber-200',
    RINA: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  const getFatIcon = (count: number) => {
    if (count === 0) return <ContentLucideIcon icon={UserRound} size={13} variant="toolbar" />;
    if (count >= 1) return <ContentLucideIcon icon={Star} size={13} variant="toolbar" />;
    return <ContentLucideIcon icon={UserRound} size={13} variant="toolbar" />;
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-mobile-strong p-2 sm:p-4 pb-20 sm:pb-6 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { v: fatEntries.length, l: 'Total FAT', c: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
          { v: upcoming.length, l: 'Upcoming', c: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { v: past.length, l: t('Selesai', 'Completed'), c: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
          { v: automationEngineers.length, l: 'Automation Eng.', c: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
        ].map(({ v, l, c, bg }) => (
          <div key={l} className={`border rounded-xl p-2.5 text-center ${bg}`}>
            <div className={`text-xl sm:text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {(recommendation || backupRecommendation) && (
        <div className="fat-reco-panel bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ContentLucideIcon icon={ArrowRightLeft} size={12} variant="toolbar" /> {t('Rekomendasi Giliran FAT Berikutnya', 'Next FAT Rotation Recommendation')}
            <span className="text-[9px] font-normal text-slate-400 ml-auto">{t('Berdasarkan jumlah FAT yang sudah selesai', 'Based on completed FAT count')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommendation && (
              <div className="fat-reco-main p-3 bg-cyan-100/70 rounded-xl border border-cyan-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-base">{recommendation.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">⭐</span>
                      <span className="font-extrabold text-cyan-800 text-xs">{t('REKOMENDASI UTAMA', 'PRIMARY RECOMMENDATION')}</span>
                    </div>
                    <div className="font-bold text-cyan-900 text-base truncate">{recommendation}</div>
                    <div className="text-[11px] text-cyan-700 mt-0.5">
                      {t('Telah menangani', 'Handled')} <strong>{fatCountMap[recommendation] || 0}x FAT</strong> ({t('paling sedikit', 'least')})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (can(currentUser.role, 'write')) onAdd();
                    }}
                    className="h-9 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                  >
                    <ContentLucideIcon icon={Plus} size={12} variant="toolbar" className="text-white" /> {t('Jadwalkan', 'Schedule')}
                  </button>
                </div>
              </div>
            )}

            {backupRecommendation && recommendation !== backupRecommendation && (
              <div className="fat-reco-backup p-3 bg-white/60 rounded-xl border border-cyan-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs">{backupRecommendation.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <ContentLucideIcon icon={ArrowRightLeft} size={11} variant="toolbar" />
                      <span className="font-semibold text-amber-700 text-[11px]">{t('REKOMENDASI BACKUP', 'BACKUP RECOMMENDATION')}</span>
                    </div>
                    <div className="font-bold text-slate-800 truncate">{backupRecommendation}</div>
                    <div className="text-[10px] text-slate-500">{fatCountMap[backupRecommendation] || 0}x FAT {t('selesai', 'completed')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sortedEngineers.length > 0 && (
        <div className="fat-priority-panel bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <ContentLucideIcon icon={BarChart3} size={12} variant="toolbar" /> {t('Urutan Prioritas (Paling sedikit → Paling banyak)', 'Priority Order (Least → Most)')}
            <span className="text-[9px] font-normal text-slate-400 ml-auto">{t('Berdasarkan jumlah FAT yang sudah selesai', 'Based on completed FAT count')}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
            {sortedEngineers.map((e, idx) => {
              const fatCount = fatCountMap[e.nama] || 0;
              const isMain = e.nama === recommendation;
              const isBackup = e.nama === backupRecommendation;
              return (
                <div
                  key={e.id}
                  className={`fat-priority-chip flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isMain ? 'bg-cyan-100 border-cyan-400 ring-2 ring-cyan-300' : isBackup ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isMain ? 'bg-cyan-600 text-white' : isBackup ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</div>
                  <span className={`text-sm font-medium ${isMain ? 'fat-main-name text-cyan-800 font-bold' : 'text-slate-700'}`}>{e.nama}</span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className={`text-sm ml-0.5 ${fatCount > 0 ? 'text-amber-500' : 'text-slate-300'} inline-flex`}>{getFatIcon(fatCount)}</span>
                    <span className={`text-xs font-semibold ${isMain ? 'fat-main-count text-cyan-700' : 'text-cyan-600'}`}>{fatCount}x</span>
                  </div>
                  {isMain && <span className="fat-primary-badge ml-1 text-[9px] font-bold bg-cyan-200 text-cyan-800 px-1.5 py-0.5 rounded-full">{t('Utama', 'Primary')}</span>}
                  {isBackup && !isMain && <span className="ml-1 text-[9px] font-bold bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">{t('Backup', 'Backup')}</span>}
                </div>
              );
            })}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-500 rounded-full" /> {t('Rekomendasi Utama (paling sedikit FAT)', 'Primary recommendation (least FAT)')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> {t('Rekomendasi Backup (kedua paling sedikit)', 'Backup recommendation (second least)')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-full" /> {t('Urutan berdasarkan jumlah FAT selesai ↑', 'Order by completed FAT count ↑')}</span>
          </div>
        </div>
      )}

      {can(currentUser.role, 'write') && (
        <div className="flex justify-end">
          <button onClick={onAdd} className="h-9 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
            <ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Tambah Jadwal FAT', 'Add FAT Schedule')}
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {fatEntries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={FlaskConical} size={40} /></div>
            <p className="text-sm">{t('Belum ada jadwal FAT', 'No FAT schedules yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {[t('No. Proyek', 'Project No.'), 'Class', t('Waktu FAT', 'FAT Time'), 'Assigned To', t('Status', 'Status'), t('Keterangan', 'Description'), t('Aksi', 'Actions')].map((h) => (
                    <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ...fatEntries.filter((f) => new Date(f.fatDateTime) > now).sort((a, b) => a.fatDateTime.localeCompare(b.fatDateTime)),
                  ...fatEntries.filter((f) => new Date(f.fatDateTime) <= now).sort((a, b) => b.fatDateTime.localeCompare(a.fatDateTime)),
                ].map((f, i) => {
                  const isPast = new Date(f.fatDateTime) <= now;
                  const fatCount = fatCountMap[f.assignedTo] || 0;
                  return (
                    <tr key={f.id} className={`border-b border-slate-100 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2.5"><div className="font-mono font-bold text-[#005A9E] text-xs">{f.projectNo}</div><div className="text-[10px] text-slate-400 font-semibold">{f.projectType || '-'}</div></td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${classBadge[f.fatClass] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{f.fatClass}</span></td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDateTime(f.fatDateTime)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-800">{f.assignedTo}</span>
                          {f.assignedTo === recommendation && !isPast && <span className="text-[9px] font-bold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">{t('Rekomendasi', 'Recommended')}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">{fatCount}x FAT {t('selesai', 'completed')}</div>
                      </td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${isPast ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{isPast ? <><ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> {t('Selesai', 'Completed')}</> : <><ContentLucideIcon icon={Clock3} size={11} variant="toolbar" /> Upcoming</>}</span></td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[180px] truncate">{f.keterangan || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {can(currentUser.role, 'write') && <button type="button" onClick={() => onEdit(f)} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 inline-flex items-center justify-center"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /></button>}
                          {can(currentUser.role, 'delete') && <button type="button" onClick={() => onDelete(f.id)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 inline-flex items-center justify-center"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>}
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
