import { useId, useRef } from 'react';
import { useI18n } from '../../i18n/store';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';

export function ConfirmDialog({
  open,
  title,
  msg,
  danger,
  onOk,
  onCancel,
}: {
  open: boolean;
  title: string;
  msg: string;
  danger: boolean;
  onOk: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onCancel });
  if (!open) return null;
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className={`px-5 py-4 flex items-center gap-3 ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`} aria-hidden>
            {danger ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            )}
          </div>
          <h3 id={titleId} className="font-bold text-base text-slate-800">
            {title}
          </h3>
        </div>
        <div className="px-5 py-4"><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{msg}</p></div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button onClick={onOk} className={`flex-1 h-11 rounded-xl text-white text-sm font-bold active:scale-95 transition ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#005A9E] hover:bg-[#004880]'}`}>{t('Ya, Lanjutkan', 'Yes, Continue')}</button>
        </div>
      </div>
    </div>
  );
}
