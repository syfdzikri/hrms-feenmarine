import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, FlaskConical, Save, Star, UserRoundCheck, X, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { FAT_CLASSES, PROJECT_TYPES } from '../../constants/appDefaults';
import { useI18n } from '../../i18n/store';
import type { Employee, FATEntry, ToastKind } from '../../types';

type FATDialogProps = {
  open: boolean;
  entry: FATEntry | null;
  automationEngineers: Employee[];
  fatEntries: FATEntry[];
  onSave: (data: Omit<FATEntry, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
  toast: (msg: string, kind: ToastKind) => void;
};

export function FATDialog({ open, entry, automationEngineers, fatEntries, onSave, onClose, toast }: FATDialogProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  const [projectType, setProjectType] = useState<typeof PROJECT_TYPES[number]>('EGCS');
  const [projectNo, setProjectNo] = useState('');
  const [fatClass, setFatClass] = useState<typeof FAT_CLASSES[number]>('ClassNK');
  const [fatDateTime, setFatDateTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [ket, setKet] = useState('');
  const [recStatus, setRecStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectedEngineers, setRejectedEngineers] = useState<string[]>([]);

  const fatCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    automationEngineers.forEach((e) => { map[e.nama] = 0; });
    const now = new Date();
    fatEntries.filter((f) => new Date(f.fatDateTime) <= now).forEach((f) => { if (map[f.assignedTo] !== undefined) map[f.assignedTo]++; });
    return map;
  }, [fatEntries, automationEngineers]);

  const sortedEngineers = useMemo(() => {
    return [...automationEngineers].sort((a, b) => {
      const cA = fatCountMap[a.nama] || 0;
      const cB = fatCountMap[b.nama] || 0;
      if (cA !== cB) return cA - cB;
      return a.nama.localeCompare(b.nama);
    });
  }, [automationEngineers, fatCountMap]);

  const activeRecommendation = useMemo(() => {
    return sortedEngineers.find((e) => !rejectedEngineers.includes(e.nama))?.nama || null;
  }, [sortedEngineers, rejectedEngineers]);

  const nextBackup = useMemo(() => {
    const activeIdx = sortedEngineers.findIndex((e) => e.nama === activeRecommendation);
    return sortedEngineers.slice(activeIdx + 1).find((e) => !rejectedEngineers.includes(e.nama))?.nama || null;
  }, [sortedEngineers, activeRecommendation, rejectedEngineers]);

  useEffect(() => {
    if (open) {
      setRejectedEngineers([]);
      setRecStatus('pending');
      setRejectReason('');
    }
    if (entry) {
      setProjectType((entry.projectType as typeof PROJECT_TYPES[number]) || 'EGCS');
      setProjectNo(entry.projectNo);
      setFatClass(entry.fatClass);
      setFatDateTime(entry.fatDateTime);
      setAssignedTo(entry.assignedTo);
      setKet(entry.keterangan || '');
    } else {
      setProjectType('EGCS');
      setProjectNo('');
      setFatClass('ClassNK');
      setFatDateTime('');
      setAssignedTo('');
      setKet('');
    }
  }, [entry, open]);

  useEffect(() => {
    if (!entry && recStatus === 'accepted' && activeRecommendation) setAssignedTo(activeRecommendation);
  }, [recStatus, activeRecommendation, entry]);

  if (!open) return null;
  const inp = 'w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition';

  const handleAcceptRec = () => {
    if (activeRecommendation) {
      setAssignedTo(activeRecommendation);
      setRecStatus('accepted');
    }
  };

  const handleRejectRec = () => {
    if (!rejectReason.trim()) {
      toast(t('Harap isi alasan tidak bisa mengikuti FAT!', 'Please provide reason for not being able to attend FAT!'), 'warning');
      return;
    }
    if (activeRecommendation) {
      setRejectedEngineers((prev) => [...prev, activeRecommendation]);
      setRecStatus('pending');
      setRejectReason('');
      const remaining = sortedEngineers.filter((e) => e.nama !== activeRecommendation && !rejectedEngineers.includes(e.nama));
      if (remaining.length === 0) toast(t('Semua engineer sudah ditolak. Pilih manual.', 'All engineers have been rejected. Please select manually.'), 'warning');
    }
  };

  const handleSave = () => {
    if (!projectNo.trim()) return toast(t('No. Proyek harus diisi!', 'Project No. is required!'), 'error');
    if (!fatDateTime) return toast(t('Tanggal & Waktu FAT harus diisi!', 'FAT Date & Time is required!'), 'error');
    if (!assignedTo) return toast(t('Assigned To harus dipilih!', 'Assigned To must be selected!'), 'error');
    onSave({ projectType, projectNo: projectNo.trim(), fatClass, fatDateTime, assignedTo, keterangan: ket.trim() || undefined });
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center" aria-hidden><ContentLucideIcon icon={FlaskConical} size={16} variant="toolbar" /></div>
            <h3 id={titleId} className="font-bold text-base text-slate-800">{entry ? t('Edit Jadwal FAT', 'Edit FAT Schedule') : t('Tambah Jadwal FAT', 'Add FAT Schedule')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><ContentLucideIcon icon={X} size={16} variant="toolbar" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-700 inline-flex items-center gap-1"><ContentLucideIcon icon={UserRoundCheck} size={12} variant="toolbar" /> {t('FAT hanya ditugaskan kepada Automation Engineer', 'FAT is assigned only to Automation Engineers')} <strong>{t('Laki-laki', 'Male')}</strong></div>

          {!entry && activeRecommendation && (
            <div className={`rounded-xl border overflow-hidden ${recStatus === 'accepted' ? 'border-emerald-300 bg-emerald-50' : 'border-cyan-300 bg-cyan-50'}`}>
              <div className="px-3 py-2.5 flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0 ${recStatus === 'accepted' ? 'bg-emerald-500' : 'bg-cyan-600'}`}>{activeRecommendation.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 inline-flex items-center gap-1">{rejectedEngineers.length === 0 ? <><ContentLucideIcon icon={Star} size={10} variant="toolbar" /> {t('Rekomendasi Utama', 'Primary Recommendation')}</> : <><ContentLucideIcon icon={ArrowRightLeft} size={10} variant="toolbar" /> {t('Backup ke-', 'Backup #')}{rejectedEngineers.length + 1}</>}</span>
                    {recStatus === 'accepted' && <span className="text-[9px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">✓ {t('Dipilih', 'Selected')}</span>}
                  </div>
                  <div className="font-bold text-slate-800 text-sm truncate">{activeRecommendation}</div>
                  <div className="text-[10px] text-slate-500">{fatCountMap[activeRecommendation] || 0}x {t('FAT selesai', 'completed FAT')}</div>
                </div>
                {nextBackup && recStatus !== 'accepted' && <div className="text-right flex-shrink-0"><div className="text-[9px] text-slate-400 mb-0.5">{t('Backup:', 'Backup:')}</div><div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">{nextBackup}</div></div>}
              </div>

              {recStatus === 'pending' && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="text-[11px] text-slate-500 font-medium">{t('Apakah', 'Can')} <strong>{activeRecommendation}</strong> {t('bisa hadir untuk FAT ini?', 'attend this FAT?')}</div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAcceptRec} className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"><ContentLucideIcon icon={CheckCircle2} size={12} variant="toolbar" className="text-white" /> {t('Bisa', 'Available')}</button>
                    <button type="button" onClick={() => setRecStatus('rejected')} className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"><ContentLucideIcon icon={XCircle} size={12} variant="toolbar" className="text-white" /> {t('Tidak Bisa', 'Unavailable')}</button>
                  </div>
                </div>
              )}

              {recStatus === 'rejected' && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="text-[11px] text-red-600 font-semibold inline-flex items-center gap-1"><ContentLucideIcon icon={AlertTriangle} size={12} variant="toolbar" /> {t('Alasan tidak bisa (wajib diisi):', 'Reason unavailable (required):')}</div>
                  <textarea className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition resize-none h-16 placeholder:text-slate-400" placeholder={t('Contoh: Sedang ada proyek lain, sakit, cuti, dll...', 'Example: On another project, sick, on leave, etc...')} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  {nextBackup && <div className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 inline-flex items-center gap-1"><ContentLucideIcon icon={ArrowRightLeft} size={10} variant="toolbar" /> {t('Jika ditolak, rekomendasi akan naik ke:', 'If rejected, recommendation will move to:')} <strong>{nextBackup}</strong></div>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRecStatus('pending')} className="flex-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">← {t('Kembali', 'Back')}</button>
                    <button type="button" onClick={handleRejectRec} className="flex-1 h-8 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition active:scale-95">{t('Konfirmasi Tidak Bisa', 'Confirm Unavailable')}</button>
                  </div>
                </div>
              )}

              {rejectedEngineers.length > 0 && <div className="px-3 pb-2.5 flex flex-wrap gap-1"><span className="text-[9px] text-slate-400 font-medium w-full mb-0.5">{t('Sudah ditolak:', 'Already rejected:')}</span>{rejectedEngineers.map((name) => <span key={name} className="text-[9px] bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-medium">✕ {name}</span>)}</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Jenis Proyek', 'Project Type')} *</label><select className={inp} value={projectType} onChange={(e) => setProjectType(e.target.value as typeof PROJECT_TYPES[number])}>{PROJECT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('No. Proyek', 'Project No.')} *</label><input className={inp} placeholder={t('FMI-XXX atau FM-XX', 'FMI-XXX or FM-XX')} value={projectNo} onChange={(e) => setProjectNo(e.target.value)} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Class', 'Class')} *</label><select className={inp} value={fatClass} onChange={(e) => setFatClass(e.target.value as typeof FAT_CLASSES[number])}>{FAT_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal & Waktu FAT', 'FAT Date & Time')} *</label><input type="datetime-local" className={inp} value={fatDateTime} onChange={(e) => setFatDateTime(e.target.value)} /></div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Assigned To (Automation Engineer)', 'Assigned To (Automation Engineer)')} *</label>
            <select className={inp} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">-- {t('Pilih Engineer', 'Select Engineer')} --</option>
              {sortedEngineers.map((e) => {
                const isRejected = rejectedEngineers.includes(e.nama);
                const isActive = e.nama === activeRecommendation;
                return <option key={e.id} value={e.nama} disabled={isRejected}>{isRejected ? '✕ ' : isActive ? '⭐ ' : ''}{e.nama} — {fatCountMap[e.nama] || 0}x selesai{isActive && !isRejected ? ' (Rekomendasi)' : ''}{isRejected ? ' (Tidak bisa)' : ''}</option>;
              })}
            </select>
          </div>

          {automationEngineers.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Distribusi FAT Selesai</div>
              <div className="space-y-1.5">
                {sortedEngineers.map((e) => {
                  const cnt = fatCountMap[e.nama] || 0;
                  const isActive = e.nama === activeRecommendation;
                  const isRejected = rejectedEngineers.includes(e.nama);
                  return <div key={e.id} className={`flex items-center justify-between ${isRejected ? 'opacity-40' : ''}`}><div className="flex items-center gap-2">{isRejected ? <span className="text-red-400 text-xs">✕</span> : isActive ? <span className="text-amber-500 text-xs">⭐</span> : null}<span className={`text-sm ${isActive && !isRejected ? 'font-bold text-cyan-700' : isRejected ? 'line-through text-slate-400' : 'text-slate-600'}`}>{e.nama}</span></div><div className="flex items-center gap-2"><span className={`text-sm ${cnt > 0 ? 'text-amber-500' : 'text-slate-300'}`}>⭐</span><span className="text-xs font-bold text-slate-600 w-10 text-right">{cnt}x</span></div></div>;
                })}
              </div>
            </div>
          )}
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Keterangan (opsional)', 'Notes (optional)')}</label><textarea className={inp + ' h-16 resize-none pt-2.5'} placeholder={t('Catatan tambahan...', 'Additional notes...')} value={ket} onChange={(e) => setKet(e.target.value)} /></div>
        </div>
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={handleSave} className="flex-1 h-11 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 active:scale-95 transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Save} size={14} variant="toolbar" className="text-white" /> {t('Simpan', 'Save')}</button>
        </div>
      </div>
    </div>
  );
}
