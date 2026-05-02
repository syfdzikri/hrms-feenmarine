import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { AlertTriangle, CheckCircle2, ClipboardList, Pencil, Save, X, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';
import { nowTs } from '../../utils/common';
import type { AppUser, Employee, LogEntry } from '../../types';

type LeaveLogDialogProps = {
  open: boolean;
  log: LogEntry | null;
  employees: Employee[];
  currentUser: AppUser;
  onSave: (updated: LogEntry, emp: Employee | null, action: 'revise' | 'cancel') => void;
  onClose: () => void;
};

export function LeaveLogDialog({ open, log, employees, currentUser, onSave, onClose }: LeaveLogDialogProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open && !!log, modalRef, { onEscape: onClose });
  const [tglMulai, setTglMulai] = useState('');
  const [tglSelesai, setTglSelesai] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [action, setAction] = useState<'revise' | 'cancel'>('revise');

  useEffect(() => {
    if (log && open) {
      const range = log.tglCuti?.includes(' s/d ') ? log.tglCuti.split(' s/d ') : [log.tglCuti, log.tglCuti];
      setTglMulai(range[0]?.trim() || '');
      setTglSelesai(range[1]?.trim() || '');
      setRevisionNote('');
      setAction('revise');
    }
  }, [log, open]);

  if (!open || !log) return null;
  const inp = 'w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition';
  const emp = employees.find((e) => e.nama === log.nama);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSave = () => {
    if (action === 'revise') {
      if (!tglMulai || !tglSelesai) return;
      const newDays = Math.floor((new Date(`${tglSelesai}T00:00:00`).getTime() - new Date(`${tglMulai}T00:00:00`).getTime()) / 86400000) + 1;
      const startDate = new Date(`${tglMulai}T00:00:00`);
      const isFuture = startDate > today;
      const updated: LogEntry = {
        ...log,
        tglCuti: tglMulai === tglSelesai ? tglMulai : `${tglMulai} s/d ${tglSelesai}`,
        originalTglCuti: log.tglCuti,
        days: newDays,
        leaveStatus: isFuture ? 'planned' : 'completed',
        status: isFuture ? 'planned' : 'used',
        keterangan: log.keterangan.replace(/\d+ Hari/, `${newDays} Hari`),
        editedBy: currentUser.displayName,
        editedAt: nowTs(),
        revisionNote: revisionNote || undefined,
      };
      onSave(updated, emp || null, 'revise');
    } else {
      const updated: LogEntry = {
        ...log,
        leaveStatus: 'canceled',
        canceledBy: currentUser.displayName,
        canceledAt: nowTs(),
        revisionNote: revisionNote || undefined,
      };
      onSave(updated, emp || null, 'cancel');
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center" aria-hidden><ContentLucideIcon icon={ClipboardList} size={16} variant="toolbar" /></div>
            <h3 id={titleId} className="font-bold text-base text-slate-800">{t('Kelola Pengajuan Cuti', 'Manage Leave Request')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><ContentLucideIcon icon={X} size={16} variant="toolbar" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <div className="font-bold text-slate-800">{log.nama}</div>
            <div className="text-xs text-slate-400 mt-0.5">{log.departemen} · {log.days || '-'} {t('hari', 'days')}</div>
            <div className="text-xs text-slate-500 mt-1">{t('Tanggal', 'Date')}: {log.tglCuti}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${log.leaveStatus === 'canceled' ? 'bg-red-100 text-red-700 border-red-200' : log.leaveStatus === 'completed' || log.status === 'used' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                {log.leaveStatus === 'canceled' ? <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={XCircle} size={11} variant="toolbar" /> {t('Dibatalkan', 'Canceled')}</span> : log.leaveStatus === 'completed' || log.status === 'used' ? <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={CheckCircle2} size={11} variant="toolbar" /> {t('Selesai', 'Completed')}</span> : <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={ClipboardList} size={11} variant="toolbar" /> {t('Rencana', 'Planned')}</span>}
              </span>
              {log.editedBy && <span className="text-[10px] text-slate-400">{t('Direvisi oleh', 'Revised by')} {log.editedBy}</span>}
            </div>
          </div>

          {log.leaveStatus !== 'canceled' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setAction('revise')} className={`flex-1 h-9 rounded-xl text-xs font-semibold transition inline-flex items-center justify-center gap-1 ${action === 'revise' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" className={action === 'revise' ? 'text-white' : undefined} /> {t('Revisi Tanggal', 'Revise Dates')}</button>
              <button type="button" onClick={() => setAction('cancel')} className={`flex-1 h-9 rounded-xl text-xs font-semibold transition inline-flex items-center justify-center gap-1 ${action === 'cancel' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><ContentLucideIcon icon={XCircle} size={12} variant="toolbar" className={action === 'cancel' ? 'text-white' : undefined} /> {t('Batalkan Cuti', 'Cancel Leave')}</button>
            </div>
          )}

          {action === 'revise' && log.leaveStatus !== 'canceled' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal Mulai Baru', 'New Start Date')}</label><input type="date" className={inp} value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} /></div>
                <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal Selesai Baru', 'New End Date')}</label><input type="date" className={inp} value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} /></div>
              </div>
              {tglMulai && tglSelesai && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  {(() => {
                    const d = Math.floor((new Date(`${tglSelesai}T00:00:00`).getTime() - new Date(`${tglMulai}T00:00:00`).getTime()) / 86400000) + 1;
                    const startDate = new Date(`${tglMulai}T00:00:00`);
                    const isFut = startDate > today;
                    return `${d} ${t('hari', 'days')} · ${isFut ? t('Rencana', 'Planned') : t('Selesai', 'Completed')}`;
                  })()}
                </div>
              )}
            </div>
          )}

          {action === 'cancel' && log.leaveStatus !== 'canceled' && <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 inline-flex items-center gap-1"><ContentLucideIcon icon={AlertTriangle} size={12} variant="toolbar" /> {t('Pembatalan akan mengembalikan', 'Cancellation will return')} <strong>{log.days || 0} {t('hari', 'days')}</strong> {t('ke saldo cuti', 'to leave balance')} {log.nama}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Catatan', 'Note')} {action === 'cancel' ? t('Pembatalan', 'Cancellation') : t('Revisi', 'Revision')} <span className="text-slate-300 font-normal">({t('opsional', 'optional')})</span></label>
            <textarea className={inp + ' h-16 resize-none pt-2.5'} placeholder={t('Alasan atau catatan...', 'Reason or notes...')} value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            {log.leaveStatus !== 'canceled' && <button type="button" onClick={handleSave} className={`flex-1 h-11 rounded-xl text-white text-sm font-bold transition active:scale-95 inline-flex items-center justify-center gap-1 ${action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{action === 'cancel' ? <><ContentLucideIcon icon={XCircle} size={14} variant="toolbar" className="text-white" /> {t('Konfirmasi Batalkan', 'Confirm Cancel')}</> : <><ContentLucideIcon icon={Save} size={14} variant="toolbar" className="text-white" /> {t('Simpan Revisi', 'Save Revision')}</>}</button>}
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Tutup', 'Close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
