import { useI18n } from '../../i18n/store';
import { Ban, CheckCircle2, Clock3, FileText, Pencil, Plus, Timer, Trash2, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface IzinEntryLite {
  id: string;
  employeeName: string;
  department: string;
  tanggal: string;
  tipe: 'terlambat' | 'pulang_cepat' | 'sakit';
  jamMasukSesungguhnya?: string;
  jamPulangLebihAwal?: string;
  mcRef?: string;
  alasan: string;
  periode: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectionNote?: string;
}

export function IzinEntriesList({
  filteredEntries,
  canSubmitIzin,
  currentUserRole,
  linkedEmpName,
  onOpenCreate,
  getUsedCount,
  maxPerPeriode,
  todayStr,
  fmtDate,
  isSuperAdmin,
  canManageOwnPlannedIzin,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  onCancelOwn,
}: {
  filteredEntries: IzinEntryLite[];
  canSubmitIzin: boolean;
  currentUserRole: 'superadmin' | 'admin' | 'viewer';
  linkedEmpName?: string;
  onOpenCreate: () => void;
  getUsedCount: (empName: string, periode: string, excludeId?: string) => number;
  maxPerPeriode: number;
  todayStr: () => string;
  fmtDate: (d: string) => string;
  isSuperAdmin: boolean;
  canManageOwnPlannedIzin: (iz: IzinEntryLite) => boolean;
  onApprove: (iz: IzinEntryLite) => void;
  onReject: (iz: IzinEntryLite) => void;
  onDelete: (iz: IzinEntryLite) => void;
  onEdit: (iz: IzinEntryLite) => void;
  onCancelOwn: (iz: IzinEntryLite) => void;
}) {
  const { t } = useI18n();
  const isHttpUrl = (v?: string) => !!v && /^https?:\/\//i.test(v.trim());
  const isIzinStillPlanned = (iz: IzinEntryLite) => {
    const jam = iz.tipe === 'terlambat' ? iz.jamMasukSesungguhnya : iz.jamPulangLebihAwal;
    if (!jam) return todayStr() <= iz.tanggal;
    const eventAt = new Date(`${iz.tanggal}T${jam}:00`);
    if (Number.isNaN(eventAt.getTime())) return todayStr() <= iz.tanggal;
    return eventAt.getTime() > Date.now();
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0 h-full">
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={Clock3} size={40} /></div>
          <p className="text-sm">{t('Belum ada pengajuan izin', 'No permit submissions yet')}</p>
          {canSubmitIzin && (
            <button type="button" onClick={onOpenCreate} className="mt-4 px-5 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition">
              <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Ajukan Izin', 'Submit Permit')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain scrollbar-mobile-strong pb-3">
          <table className="w-full border-collapse text-[13px] hidden sm:table">
            <thead>
              <tr className="bg-[#EFF1F3]">
                {[t('Karyawan', 'Employee'), t('Tanggal', 'Date'), t('Tipe', 'Type'), t('Jam', 'Time'), t('Alasan', 'Reason'), t('Jatah Periode', 'Period Quota'), t('Status', 'Status'), t('Aksi', 'Actions')].map((h) => (
                  <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((iz, i) => {
                const usedInPeriode = getUsedCount(iz.employeeName, iz.periode);
                const canSubmitForThisEmployee =
                  currentUserRole === 'superadmin' ||
                  (currentUserRole === 'admin' && !!linkedEmpName && iz.employeeName === linkedEmpName);
                const isPlannedApproved = iz.status === 'approved' && isIzinStillPlanned(iz);
                const statusBadge = iz.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : iz.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                const statusLabel = iz.status === 'approved' ? t('Disetujui', 'Approved') : iz.status === 'rejected' ? t('Ditolak', 'Rejected') : t('Pending', 'Pending');
                const canEditThis = isSuperAdmin || (iz.status === 'pending' && canManageOwnPlannedIzin(iz));
                const canCancelThis = canManageOwnPlannedIzin(iz);
                const canApprove = isSuperAdmin && iz.status === 'pending';
                return (
                  <tr key={iz.id} className={`border-b border-slate-100 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{iz.employeeName}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${canSubmitForThisEmployee ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {canSubmitForThisEmployee ? t('Bisa Ajukan', 'Can Submit') : t('Read Only', 'Read Only')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{iz.department}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(iz.tanggal)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        iz.tipe === 'terlambat'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : iz.tipe === 'pulang_cepat'
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'
                      }`}>
                        {iz.tipe === 'terlambat' ? <><ContentLucideIcon icon={Clock3} size={11} variant="toolbar" /> {t('Terlambat', 'Late')}</> : iz.tipe === 'pulang_cepat' ? <><ContentLucideIcon icon={Timer} size={11} variant="toolbar" /> {t('Pulang Cepat', 'Early Leave')}</> : <><ContentLucideIcon icon={FileText} size={11} variant="toolbar" /> {t('Sakit (MC)', 'Sick (MC)')}</>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">{iz.tipe === 'terlambat' ? `${t('Masuk', 'In')} ${iz.jamMasukSesungguhnya}` : iz.tipe === 'pulang_cepat' ? `${t('Pulang', 'Out')} ${iz.jamPulangLebihAwal}` : '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[200px]"><div className="truncate" title={iz.alasan}>{iz.alasan}</div>{iz.tipe === 'sakit' && iz.mcRef && <div className="text-[10px] text-rose-600 mt-0.5 truncate" title={iz.mcRef}>MC:{' '}{isHttpUrl(iz.mcRef) ? <a href={iz.mcRef} target="_blank" rel="noreferrer noopener" className="underline font-semibold hover:text-rose-700">{t('Buka Lampiran', 'Open Attachment')}</a> : iz.mcRef}</div>}{iz.rejectionNote && <div className="text-[10px] text-red-500 mt-0.5">{t('Ditolak:', 'Rejected:')} {iz.rejectionNote}</div>}</td>
                    <td className="px-3 py-2.5 text-center"><div className="flex items-center justify-center gap-1">{Array.from({ length: maxPerPeriode }).map((_, j) => <div key={j} className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold border ${j < usedInPeriode ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>{j < usedInPeriode ? '✓' : j + 1}</div>)}</div></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge}`}>{iz.status === 'approved' ? <ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> : iz.status === 'rejected' ? <ContentLucideIcon icon={XCircle} size={11} variant="toolbar" /> : <ContentLucideIcon icon={Clock3} size={11} variant="toolbar" />}{statusLabel}</span>{iz.approvedBy && <div className="text-[9px] text-slate-400 mt-0.5">{t('oleh', 'by')} {iz.approvedBy}</div>}{isPlannedApproved && <div className="text-[9px] text-blue-500 mt-0.5">{t('Masih rencana, bisa dibatalkan.', 'Still planned, can be canceled.')}</div>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        {canApprove && (<><button type="button" onClick={() => onApprove(iz)} className="h-7 px-2 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition inline-flex items-center"><ContentLucideIcon icon={CheckCircle2} size={12} variant="toolbar" /></button><button type="button" onClick={() => onReject(iz)} className="h-7 px-2 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition inline-flex items-center"><ContentLucideIcon icon={XCircle} size={12} variant="toolbar" /></button></>)}
                        {canEditThis && <button type="button" onClick={() => onEdit(iz)} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition inline-flex items-center justify-center"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /></button>}
                        {canCancelThis && <button type="button" onClick={() => onCancelOwn(iz)} className="w-7 h-7 bg-amber-50 text-amber-700 rounded-lg text-xs hover:bg-amber-100 transition inline-flex items-center justify-center" title={t('Batalkan', 'Cancel')}><ContentLucideIcon icon={Ban} size={12} variant="toolbar" /></button>}
                        {isSuperAdmin && <button type="button" onClick={() => onDelete(iz)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition inline-flex items-center justify-center"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="sm:hidden p-3 space-y-2">
            {filteredEntries.map((iz) => {
              const usedInPeriode = getUsedCount(iz.employeeName, iz.periode);
              const canSubmitForThisEmployee =
                currentUserRole === 'superadmin' ||
                (currentUserRole === 'admin' && !!linkedEmpName && iz.employeeName === linkedEmpName);
              const isPlannedApproved = iz.status === 'approved' && isIzinStillPlanned(iz);
              const statusBadge = iz.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : iz.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';
              const statusLabel = iz.status === 'approved' ? t('Disetujui', 'Approved') : iz.status === 'rejected' ? t('Ditolak', 'Rejected') : t('Pending', 'Pending');
              return (
                <div key={iz.id} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{iz.employeeName}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${canSubmitForThisEmployee ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {canSubmitForThisEmployee ? t('Bisa Ajukan', 'Can Submit') : t('Read Only', 'Read Only')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{iz.department} · {fmtDate(iz.tanggal)}</div>
                      {isPlannedApproved && <div className="text-[10px] text-blue-500 mt-0.5">{t('Masih rencana, bisa dibatalkan.', 'Still planned, can be canceled.')}</div>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>{iz.status === 'approved' ? <ContentLucideIcon icon={CheckCircle2} size={10} variant="toolbar" /> : iz.status === 'rejected' ? <ContentLucideIcon icon={XCircle} size={10} variant="toolbar" /> : <ContentLucideIcon icon={Clock3} size={10} variant="toolbar" />}{statusLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${iz.tipe === 'terlambat' ? 'bg-orange-100 text-orange-700 border-orange-200' : iz.tipe === 'pulang_cepat' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{iz.tipe === 'terlambat' ? <><ContentLucideIcon icon={Clock3} size={10} variant="toolbar" /> {t('Terlambat', 'Late')}</> : iz.tipe === 'pulang_cepat' ? <><ContentLucideIcon icon={Timer} size={10} variant="toolbar" /> {t('Pulang Cepat', 'Early Leave')}</> : <><ContentLucideIcon icon={FileText} size={10} variant="toolbar" /> {t('Sakit (MC)', 'Sick (MC)')}</>}</span><span className="text-xs font-mono font-bold text-slate-700">{iz.tipe === 'terlambat' ? `${t('Masuk', 'In')} ${iz.jamMasukSesungguhnya}` : iz.tipe === 'pulang_cepat' ? `${t('Pulang', 'Out')} ${iz.jamPulangLebihAwal}` : '-'}</span></div>
                  <p className="text-xs text-slate-500 mb-1">{iz.alasan}</p>
                  {iz.tipe === 'sakit' && iz.mcRef && <div className="text-[10px] text-rose-600 mb-2 truncate" title={iz.mcRef}>MC:{' '}{isHttpUrl(iz.mcRef) ? <a href={iz.mcRef} target="_blank" rel="noreferrer noopener" className="underline font-semibold hover:text-rose-700">{t('Buka Lampiran', 'Open Attachment')}</a> : iz.mcRef}</div>}
                  <div className="flex items-center gap-2 mb-2"><span className="text-[10px] text-slate-400">{t('Jatah:', 'Quota:')}</span>{Array.from({ length: maxPerPeriode }).map((_, j) => <div key={j} className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold border ${j < usedInPeriode ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>{j < usedInPeriode ? '✓' : j + 1}</div>)}</div>
                  {iz.status === 'pending' && isSuperAdmin && <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100"><button type="button" onClick={() => onApprove(iz)} className="flex-1 h-8 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> {t('Setujui', 'Approve')}</button><button type="button" onClick={() => onReject(iz)} className="flex-1 h-8 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={XCircle} size={11} variant="toolbar" /> {t('Tolak', 'Reject')}</button></div>}
                  {canManageOwnPlannedIzin(iz) && <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">{iz.status === 'pending' && <button type="button" onClick={() => onEdit(iz)} className="flex-1 h-8 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Pencil} size={11} variant="toolbar" /> {t('Edit', 'Edit')}</button>}<button type="button" onClick={() => onCancelOwn(iz)} className="flex-1 h-8 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Ban} size={11} variant="toolbar" /> {t('Batal', 'Cancel')}</button></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
