import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { Plus, UserRound, UserRoundCheck, UserRoundPlus, X } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';

interface AddEmployeePayload {
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  posisi: string;
  gender: 'L' | 'P';
  visaActive?: boolean;
  visaTypes?: string[];
}

const VISA_OPTIONS = ["Schengen", "Jepang", "China"] as const;
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => toISODate(new Date());
const isVisaEligible = (posisi?: string, gender?: 'L' | 'P') => {
  const g = gender || 'L';
  const p = (posisi || '').toLowerCase();
  const roleOk = ['engineer', 'teknisi', 'teknik', 'electrical', 'automation', 'commissioning', 'service', 'supervisor', 'inspector'].some(k => p.includes(k));
  return g === 'L' && roleOk;
};

export function AddEmployeeModal({ open, departments, onSave, onClose, visaOptions }: {
  open: boolean;
  departments: string[];
  onSave: (data: AddEmployeePayload) => void;
  onClose: () => void;
  visaOptions?: string[];
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  const [nama, setNama] = useState('');
  const [dept, setDept] = useState(departments[0] || '');
  const [tgl, setTgl] = useState(todayStr());
  const [jatah, setJatah] = useState(12);
  const [posisi, setPosisi] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [visaActive, setVisaActive] = useState(false);
  const [visaTypes, setVisaTypes] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setNama('');
      setDept(departments[0] || '');
      setTgl(todayStr());
      setJatah(12);
      setPosisi('');
      setGender('L');
      setVisaActive(false);
      setVisaTypes([]);
    }
  }, [open, departments]);

  if (!open) return null;

  const inp = "w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition";
  const visaEligible = isVisaEligible(posisi, gender);
  const toggleVisa = (v: string) => setVisaTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-desc`}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'scaleIn .18s ease-out' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#005A9E] to-[#0077CC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white text-lg" aria-hidden><ContentLucideIcon icon={UserRoundPlus} size={18} variant="toolbar" className="text-white" /></div>
            <div>
              <h3 id={titleId} className="font-bold text-base text-white">{t('Tambah Karyawan Baru', 'Add New Employee')}</h3>
              <p id={`${titleId}-desc`} className="text-blue-200 text-[11px]">{t('Isi semua data dengan lengkap', 'Fill all data completely')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-lg"><ContentLucideIcon icon={X} size={16} variant="toolbar" className="text-white" /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Nama Karyawan', 'Employee Name')} *</label>
            <input className={inp} placeholder={t('Nama lengkap karyawan', 'Employee full name')} value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Posisi / Jabatan', 'Position / Role')}</label>
              <input className={inp} placeholder={t('Contoh: Electrical Engineer', 'Example: Electrical Engineer')} value={posisi} onChange={(e) => setPosisi(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Gender', 'Gender')} *</label>
              <select className={inp} value={gender} onChange={(e) => setGender(e.target.value as 'L' | 'P')}>
                <option value="L">{t('Laki-laki', 'Male')}</option>
                <option value="P">{t('Perempuan', 'Female')}</option>
              </select>
            </div>
          </div>
          {visaEligible && (
            <div className="border border-sky-200 bg-sky-50 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={visaActive} onChange={(e) => setVisaActive(e.target.checked)} />
                {t('Visa Aktif', 'Active Visa')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(visaOptions && visaOptions.length ? visaOptions : [...VISA_OPTIONS]).map((v) => (
                  <button key={v} type="button" onClick={() => toggleVisa(v)} className={`px-2.5 h-7 rounded-lg text-[11px] font-bold border transition ${visaTypes.includes(v) ? 'bg-sky-600 border-sky-700 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{v}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Departemen', 'Department')} *</label>
            <select className={inp} value={dept} onChange={(e) => setDept(e.target.value)}>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Tanggal Kontrak', 'Contract Date')} *</label>
              <input type="date" className={inp} value={tgl} onChange={(e) => setTgl(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{t('Jatah Cuti (Hari)', 'Leave Quota (Days)')}</label>
              <input type="number" min={0} max={365} className={inp} value={jatah} onChange={(e) => setJatah(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          {nama.trim() && tgl && (
            <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2">
              <span className="text-base inline-flex">{gender === 'P' ? <ContentLucideIcon icon={UserRound} size={16} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={16} variant="toolbar" />}</span>
              <div>
                <span className="font-bold">{nama.trim()}</span>
                <span className="text-blue-500"> · {dept} · {jatah} {t('hari cuti', 'leave days')}</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button
            type="button"
            onClick={() => {
              if (nama.trim() && dept && tgl) {
                onSave({
                  nama: nama.trim(),
                  departemen: dept,
                  tglKontrak: tgl,
                  jatahAwal: jatah,
                  posisi: posisi.trim(),
                  gender,
                  visaActive: visaEligible ? visaActive : false,
                  visaTypes: visaEligible ? visaTypes : [],
                });
              }
            }}
            disabled={!nama.trim() || !tgl}
            className="flex-1 h-11 rounded-xl bg-[#005A9E] text-white text-sm font-bold hover:bg-[#004880] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Tambah Karyawan', 'Add Employee')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
