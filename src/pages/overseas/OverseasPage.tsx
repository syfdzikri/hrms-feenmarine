import type { AppUser, OverseasEntry } from '../../types';
import { BarChart3, CalendarClock, CheckCircle2, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { fmtDate } from '../../utils/common';
import { useI18n } from '../../i18n/store';
import { can, canConfirmOverseasCompletion } from '../../utils/permissions';

type Props = {
  ovsFilter: string;
  setOvsFilter: (v: string) => void;
  ovsSearch: string;
  setOvsSearch: (v: string) => void;
  currentUser: AppUser;
  overseas: OverseasEntry[];
  filteredOverseas: OverseasEntry[];
  onOpenAdd: () => void;
  onOpenEdit: (entry: OverseasEntry) => void;
  onDelete: (id: string) => void;
  onMarkDone: (id: string) => void;
  onOpenSummary: () => void;
  countDays: (a: string, b: string) => number;
};

const statusMap = {
  active: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Active' },
  upcoming: { bg: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Upcoming' },
  completed: { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Completed' },
} as const;

function typeBadge(tipe: string) {
  if (tipe === 'Commissioning') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (tipe === 'Service') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (tipe === 'Mengurus Visa') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function entryDays(o: OverseasEntry, countDays: (a: string, b: string) => number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (o.status === 'active') {
    return Math.floor((today.getTime() - new Date(`${o.tglMulai}T00:00:00`).getTime()) / 86400000) + 1;
  }
  return countDays(o.tglMulai, o.tglSelesai);
}

export function OverseasPage({
  ovsFilter, setOvsFilter, ovsSearch, setOvsSearch, currentUser, overseas, filteredOverseas,
  onOpenAdd, onOpenEdit, onDelete, onMarkDone, onOpenSummary, countDays,
}: Props) {
  const { t } = useI18n();
  const canWrite = can(currentUser.role, 'write');
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4 gap-3">
      <div className="sm:hidden flex gap-2 mb-3">
        <select value={ovsFilter} onChange={(e) => setOvsFilter(e.target.value)} className="h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs outline-none max-w-[120px]">
          <option value="">{t('Semua', 'All')}</option><option value="active">Active</option><option value="upcoming">Upcoming</option><option value="completed">{t('Selesai', 'Completed')}</option><option value="Commissioning">Comm.</option><option value="Service">Service</option><option value="Mengurus Visa">{t('Visa', 'Visa')}</option>
        </select>
        <input className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E]" placeholder={t('Cari nama/proyek…', 'Search name/project…')} value={ovsSearch} onChange={(e) => setOvsSearch(e.target.value)} />
        {canWrite && <button type="button" onClick={onOpenAdd} className="h-9 px-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex-shrink-0 inline-flex items-center justify-center"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /></button>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { v: overseas.filter((o) => o.status === 'active').length, l: t('Berlangsung', 'Active'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { v: overseas.filter((o) => o.status === 'upcoming').length, l: 'Upcoming', c: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { v: overseas.filter((o) => o.status === 'completed').length, l: t('Selesai', 'Completed'), c: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
          { v: overseas.filter((o) => o.tipe === 'Commissioning').length, l: 'Commissioning', c: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
          { v: overseas.filter((o) => o.tipe === 'Mengurus Visa').length, l: t('Mengurus Visa', 'Visa Processing'), c: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' },
        ].map(({ v, l, c, bg }) => (
          <div key={l} className={`border rounded-2xl p-3 text-center ${bg}`}><div className={`text-2xl font-extrabold ${c}`}>{v}</div><div className="text-[10px] text-slate-400 mt-0.5">{l}</div></div>
        ))}
      </div>

      <div className="flex justify-end mb-3">
        <button type="button" onClick={onOpenSummary} className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition inline-flex items-center gap-1"><ContentLucideIcon icon={BarChart3} size={14} variant="toolbar" /> {t('Lihat Total Hari Overseas', 'View Total Overseas Days')}</button>
      </div>

      <div className="sm:hidden space-y-3">
        {filteredOverseas.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <div className="text-5xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={Plane} size={40} /></div><p className="text-sm">{t('Belum ada data overseas', 'No overseas records yet')}</p>
            {canWrite && <button onClick={onOpenAdd} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">+ {t('Tambah Overseas', 'Add Overseas')}</button>}
          </div>
        ) : filteredOverseas.map((o) => {
          const days = entryDays(o, countDays);
          const statusInfo = statusMap[o.status];
          const tipeBadge = typeBadge(o.tipe);
          return (
            <div key={o.id} className={`rounded-2xl border-2 p-4 ${o.status === 'active' ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2 mb-3"><div><div className="font-bold text-slate-800">{o.nama}</div><div className="text-xs text-slate-400">{o.departemen}</div></div><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${statusInfo.bg}`}>{statusInfo.label}</span></div>
              <div className="flex flex-wrap gap-2 mb-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${tipeBadge}`}>{o.tipe}</span><span className="text-[11px] font-mono font-bold text-[#005A9E] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{o.projectNo}</span>{o.projectType && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{o.projectType}</span>}</div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-50 rounded-xl py-2"><div className="text-xs text-slate-400 mb-0.5">{t('Lokasi', 'Location')}</div><div className="text-xs font-bold text-slate-700 truncate px-1">{o.lokasi}</div></div>
                <div className="bg-slate-50 rounded-xl py-2"><div className="text-xs text-slate-400 mb-0.5">{t('Periode', 'Period')}</div><div className="text-[10px] font-semibold text-slate-600">{fmtDate(o.tglMulai)}</div><div className="text-[9px] text-slate-400">{t('s/d', 'to')} {fmtDate(o.tglSelesai)}</div></div>
                <div className="bg-slate-50 rounded-xl py-2"><div className="text-xs text-slate-400 mb-0.5">{t('Durasi', 'Duration')}</div><div className="text-lg font-extrabold text-[#005A9E]">{days}h</div>{o.status === 'active' && <div className="text-[9px] text-emerald-600">{t('s/d hari ini', 'until today')}</div>}</div>
              </div>
              {o.status !== 'completed' && (canWrite || canConfirmOverseasCompletion(currentUser, o.nama)) && (
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  {o.status === 'active' && canConfirmOverseasCompletion(currentUser, o.nama) && (
                    <button type="button" onClick={() => onMarkDone(o.id)} className="flex-1 h-9 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition inline-flex items-center justify-center gap-1">
                      <ContentLucideIcon icon={CheckCircle2} size={12} variant="toolbar" /> {t('Selesai', 'Done')}
                    </button>
                  )}
                  {canWrite && (
                    <button type="button" onClick={() => onOpenEdit(o)} className="flex-1 h-9 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition inline-flex items-center justify-center gap-1">
                      <ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /> {t('Edit', 'Edit')}
                    </button>
                  )}
                  {can(currentUser.role, 'delete') && (
                    <button type="button" onClick={() => onDelete(o.id)} className="flex-1 h-9 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition inline-flex items-center justify-center gap-1">
                      <ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}
                    </button>
                  )}
                </div>
              )}
              {o.status === 'completed' && (canWrite || can(currentUser.role, 'delete')) && <div className="flex gap-2 pt-2 border-t border-slate-200">{canWrite && <button type="button" onClick={() => onOpenEdit(o)} className="flex-1 h-9 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /> {t('Edit', 'Edit')}</button>}{can(currentUser.role, 'delete') && <button type="button" onClick={() => onDelete(o.id)} className="flex-1 h-9 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}</button>}</div>}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {filteredOverseas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={Plane} size={40} /></div><p className="text-sm">{t('Belum ada data overseas', 'No overseas records yet')}</p>
            {canWrite && <button onClick={onOpenAdd} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">+ {t('Tambah Overseas', 'Add Overseas')}</button>}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[70dvh] sm:max-h-none">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {['Nama', 'Tipe', 'No. Proyek', 'Lokasi', 'Berangkat', 'Kembali', 'Durasi', 'Status', 'Aksi'].map((h) => (
                    <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOverseas.map((o, i) => {
                  const days = entryDays(o, countDays);
                  const statusInfo = statusMap[o.status];
                  const tipeBadge = typeBadge(o.tipe);
                  return (
                    <tr key={o.id} className={`border-b border-slate-100 group ${o.status === 'active' ? 'bg-emerald-50/60' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2.5"><div className="font-semibold text-slate-800">{o.nama}</div><div className="text-[10px] text-slate-400">{o.departemen}</div></td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${tipeBadge}`}>{o.tipe}</span></td>
                      <td className="px-3 py-2.5"><div className="font-mono font-semibold text-[#005A9E] text-xs">{o.projectNo}</div><div className="text-[10px] text-slate-400 font-semibold">{o.projectType || '-'}</div></td>
                      <td className="px-3 py-2.5 text-slate-600">{o.lokasi}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(o.tglMulai)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        <div>{fmtDate(o.tglSelesai)}</div>
                        {o.status === 'active' && (
                          <div className="mt-1 text-[9px] text-amber-500 font-medium flex items-center gap-1">
                            <ContentLucideIcon icon={CalendarClock} size={10} variant="toolbar" />
                            {t('perkiraan', 'estimated')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center"><span className="text-xs font-bold text-slate-700">{days}h</span>{o.status === 'active' && <div className="text-[9px] text-emerald-600 font-medium">s/d hari ini</div>}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.bg}`}>{statusInfo.label}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {canConfirmOverseasCompletion(currentUser, o.nama) && o.status !== 'completed' && (
                            <button type="button" onClick={() => onMarkDone(o.id)} className="h-7 px-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 font-semibold whitespace-nowrap inline-flex items-center gap-1" title={t('Konfirmasi Selesai', 'Confirm Done')}>
                              <ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> {t('Selesai', 'Done')}
                            </button>
                          )}
                          {canWrite && <button type="button" onClick={() => onOpenEdit(o)} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 inline-flex items-center justify-center"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /></button>}
                          {can(currentUser.role, 'delete') && <button type="button" onClick={() => onDelete(o.id)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 inline-flex items-center justify-center"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>}
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
