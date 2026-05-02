import { useId, useRef } from 'react';
import { useI18n } from '../../i18n/store';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { Clock3, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface IzinRejectTarget {
  employeeName: string;
  tipe: 'terlambat' | 'pulang_cepat' | 'sakit';
  tanggal: string;
}

export function IzinRejectDialog({
  rejectTarget,
  rejectNote,
  setRejectNote,
  onClose,
  onConfirm,
  fmtDate,
}: {
  rejectTarget: IzinRejectTarget | null;
  rejectNote: string;
  setRejectNote: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  fmtDate: (d: string) => string;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const open = !!rejectTarget;
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  if (!rejectTarget) return null;
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-red-50">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-xl" aria-hidden><ContentLucideIcon icon={XCircle} size={16} variant="toolbar" /></div>
          <h3 id={titleId} className="font-bold text-base text-slate-800">{t('Tolak Pengajuan Izin', 'Reject Permit Submission')}</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <div className="font-bold text-slate-800">{rejectTarget.employeeName}</div>
            <div className="text-xs text-slate-400 inline-flex items-center gap-1"><ContentLucideIcon icon={Clock3} size={11} variant="toolbar" /> {rejectTarget.tipe === 'terlambat' ? t('Datang Terlambat', 'Late Arrival') : rejectTarget.tipe === 'pulang_cepat' ? t('Pulang Cepat', 'Early Leave') : t('Sakit (MC)', 'Sick (MC)')} · {fmtDate(rejectTarget.tanggal)}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Alasan Penolakan', 'Rejection Reason')} <span className="text-slate-300 font-normal">({t('opsional', 'optional')})</span></label>
            <textarea
              className="w-full h-16 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition resize-none"
              placeholder={t('Tuliskan alasan penolakan...', 'Write rejection reason...')}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={onConfirm} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={XCircle} size={13} variant="toolbar" className="text-white" /> {t('Konfirmasi Tolak', 'Confirm Reject')}</button>
        </div>
      </div>
    </div>
  );
}
