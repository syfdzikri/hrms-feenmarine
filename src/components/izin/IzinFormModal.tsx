import { useId, useRef } from 'react';
import { useI18n } from '../../i18n/store';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { Clock3, LoaderCircle, Save, Search, UserRound, UserRoundCheck, X } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface EmployeeLite {
  id: string;
  nama: string;
  departemen: string;
  gender?: 'L' | 'P';
}

interface UserLite {
  role: 'superadmin' | 'admin' | 'viewer';
  linkedEmployeeName?: string;
}

export function IzinFormModal({
  open,
  editMode,
  onClose,
  employees,
  currentUser,
  fEmpSearch,
  setFEmpSearch,
  fEmpId,
  setFEmpId,
  fTipe,
  setFTipe,
  fTanggal,
  setFTanggal,
  fJam,
  setFJam,
  fMcRef,
  setFMcRef,
  fAlasan,
  setFAlasan,
  getJamError,
  getUsedCount,
  getCurrentIzinPeriode,
  izinCutoffDay,
  maxPerPeriode,
  onSave,
  fSaving,
}: {
  open: boolean;
  editMode: boolean;
  onClose: () => void;
  employees: EmployeeLite[];
  currentUser: UserLite;
  fEmpSearch: string;
  setFEmpSearch: (v: string) => void;
  fEmpId: string;
  setFEmpId: (v: string) => void;
  fTipe: 'terlambat' | 'pulang_cepat' | 'sakit';
  setFTipe: (v: 'terlambat' | 'pulang_cepat' | 'sakit') => void;
  fTanggal: string;
  setFTanggal: (v: string) => void;
  fJam: string;
  setFJam: (v: string) => void;
  fMcRef: string;
  setFMcRef: (v: string) => void;
  fAlasan: string;
  setFAlasan: (v: string) => void;
  getJamError: () => string;
  getUsedCount: (empName: string, periode: string, excludeId?: string) => number;
  getCurrentIzinPeriode: () => string;
  izinCutoffDay: number;
  maxPerPeriode: number;
  onSave: () => void;
  fSaving: boolean;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  if (!open) return null;
  const inp = "w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition";
  const filteredEmployees = employees.filter((e) => {
    if (currentUser.role === 'admin') {
      return !!currentUser.linkedEmployeeName && e.nama === currentUser.linkedEmployeeName;
    }
    return !fEmpSearch || e.nama.toLowerCase().includes(fEmpSearch.toLowerCase()) || e.departemen.toLowerCase().includes(fEmpSearch.toLowerCase());
  });

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-600 to-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl" aria-hidden><ContentLucideIcon icon={Clock3} size={16} variant="toolbar" className="text-white" /></div>
            <h3 id={titleId} className="font-bold text-base text-white">{editMode ? t('Edit Pengajuan Izin', 'Edit Permit Submission') : t('Ajukan Izin', 'Submit Permit')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition"><ContentLucideIcon icon={X} size={15} variant="toolbar" className="text-white" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 space-y-1">
            <div className="font-bold">{t('Ketentuan Izin:', 'Permit Rules:')}</div>
            <div>• {t('Max', 'Max')} <strong>{maxPerPeriode}x {t('per periode', 'per period')}</strong> ({t('reset tiap tgl', 'resets on day')} {izinCutoffDay})</div>
            <div>• {t('Izin terlambat: masuk jam', 'Late permit: arrival at')} <strong>08:06 – 12:00</strong> ({t('max 4 jam', 'max 4 hours')})</div>
            <div>• {t('Izin pulang cepat: pulang jam', 'Early-leave permit: departure at')} <strong>13:00 – 16:59</strong> ({t('max 4 jam', 'max 4 hours')})</div>
            <div>• {t('Izin sakit (MC) tidak mengurangi jatah cuti tahunan.', 'Sick permit (with doctor MC) does not reduce annual leave quota.')}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Pilih Karyawan', 'Select Employee')} *</label>
            {currentUser.role !== 'admin' && employees.length > 5 && (
              <div className="relative mb-2">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
                <input className="w-full h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-orange-400" placeholder={t('Cari nama karyawan…', 'Search employee name…')} value={fEmpSearch} onChange={(e) => setFEmpSearch(e.target.value)} />
              </div>
            )}
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">{t('Tidak ada karyawan', 'No employees found')}</div>
              ) : filteredEmployees.map((e) => {
                const isSel = e.id === fEmpId;
                const used = getUsedCount(e.nama, getCurrentIzinPeriode());
                const rem = maxPerPeriode - used;
                return (
                  <button key={e.id} type="button" onClick={() => setFEmpId(e.id)} className={`w-full px-3 py-2 flex items-center justify-between text-left transition ${isSel ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm inline-flex">{e.gender === 'P' ? <ContentLucideIcon icon={UserRound} size={13} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={13} variant="toolbar" />}</span>
                      <div>
                        <div className={`text-xs font-semibold ${isSel ? 'text-orange-700' : 'text-slate-800'}`}>{e.nama}</div>
                        <div className="text-[10px] text-slate-400">{e.departemen}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: maxPerPeriode }).map((_, j) => (
                        <div key={j} className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold border ${j < used ? 'bg-orange-500 border-orange-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>{j < used ? '✓' : ''}</div>
                      ))}
                      <span className={`text-[10px] font-bold ml-1 ${rem === 0 ? 'text-red-600' : rem === 1 ? 'text-amber-600' : 'text-emerald-600'}`}>{rem === 0 ? t('Habis', 'Exhausted') : `${t('Sisa', 'Remaining')} ${rem}x`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tipe Izin', 'Permit Type')} *</label>
              <select className={inp} value={fTipe} onChange={(e) => { setFTipe(e.target.value as 'terlambat' | 'pulang_cepat' | 'sakit'); setFJam(''); }}>
                <option value="terlambat">{t('Datang Terlambat', 'Late Arrival')}</option>
                <option value="pulang_cepat">{t('Pulang Cepat', 'Early Leave')}</option>
                <option value="sakit">{t('Sakit (dengan MC)', 'Sick (with Doctor MC)')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal', 'Date')} *</label>
              <input type="date" className={inp} value={fTanggal} onChange={(e) => setFTanggal(e.target.value)} />
            </div>
          </div>

          {fTipe !== 'sakit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{fTipe === 'terlambat' ? t('Jam Masuk Sesungguhnya *', 'Actual Arrival Time *') : t('Jam Pulang Lebih Awal *', 'Actual Early Leave Time *')}</label>
              <input type="time" className={inp} value={fJam} onChange={(e) => setFJam(e.target.value)} min={fTipe === 'terlambat' ? '08:06' : '13:00'} max={fTipe === 'terlambat' ? '12:00' : '16:59'} />
              {fJam && getJamError() && <div className="mt-1 text-[11px] text-red-600">{getJamError()}</div>}
            </div>
          )}

          {fTipe === 'sakit' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('No/Link Surat MC Dokter *', 'Doctor MC Number/Link *')}</label>
              <input
                type="text"
                className={inp}
                value={fMcRef}
                onChange={(e) => setFMcRef(e.target.value)}
                placeholder={t('Contoh: RS-12345 / https://...', 'Example: RS-12345 / https://...')}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Alasan', 'Reason')} *</label>
            <textarea className={inp + ' h-20 resize-none pt-2.5'} placeholder={t('Jelaskan alasan izin Anda…', 'Explain your permit reason…')} value={fAlasan} onChange={(e) => setFAlasan(e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={onSave} disabled={fSaving} className="flex-1 h-11 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 active:scale-95 transition disabled:opacity-60 inline-flex items-center justify-center gap-1">{fSaving ? <><ContentLucideIcon icon={LoaderCircle} size={13} variant="toolbar" className="animate-spin text-white" /> {t('Menyimpan…', 'Saving…')}</> : <><ContentLucideIcon icon={Save} size={13} variant="toolbar" className="text-white" /> {t('Simpan Pengajuan', 'Save Submission')}</>}</button>
        </div>
      </div>
    </div>
  );
}
