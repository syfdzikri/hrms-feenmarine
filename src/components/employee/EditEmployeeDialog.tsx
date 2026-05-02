import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { Pencil, Save, X } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';

const VISA_OPTIONS = ['Schengen', 'Jepang', 'China'] as const;

interface EmployeeLite {
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  posisi?: string;
  gender?: 'L' | 'P';
  visaActive?: boolean;
  visaTypes?: string[];
}

const isVisaEligible = (posisi?: string, gender?: 'L' | 'P') => {
  const g = gender || 'L';
  const p = (posisi || '').toLowerCase();
  const roleOk = ['engineer', 'teknisi', 'teknik', 'electrical', 'automation', 'commissioning', 'service', 'supervisor', 'inspector'].some((k) => p.includes(k));
  return g === 'L' && roleOk;
};

export function EditEmployeeDialog({
  open,
  employee,
  departments,
  onSave,
  onClose,
  submitLabel,
  bannerText,
  visaOptions,
}: {
  open: boolean;
  employee: EmployeeLite | null;
  departments: string[];
  onSave: (d: Partial<EmployeeLite>) => void;
  onClose: () => void;
  submitLabel?: string;
  bannerText?: string;
  visaOptions?: string[];
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  const [nama, setNama] = useState('');
  const [dept, setDept] = useState(departments[0] || '');
  const [tgl, setTgl] = useState('');
  const [jatah, setJatah] = useState(12);
  const [posisi, setPosisi] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [visaActive, setVisaActive] = useState(false);
  const [visaTypes, setVisaTypes] = useState<string[]>([]);

  useEffect(() => {
    if (employee) {
      setNama(employee.nama);
      setDept(employee.departemen);
      setTgl(employee.tglKontrak);
      setJatah(employee.jatahAwal);
      setPosisi(employee.posisi || '');
      setGender(employee.gender || 'L');
      setVisaActive(!!employee.visaActive);
      setVisaTypes(employee.visaTypes || []);
    } else {
      setNama('');
      setDept(departments[0] || '');
      setTgl('');
      setJatah(12);
      setPosisi('');
      setGender('L');
      setVisaActive(false);
      setVisaTypes([]);
    }
  }, [employee, open, departments]);

  if (!open) return null;
  const inp = "w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:bg-white focus:ring-2 focus:ring-[#005A9E]/10 transition";
  const visaEligible = isVisaEligible(posisi, gender);
  const toggleVisa = (v: string) => setVisaTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
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
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-base" aria-hidden><ContentLucideIcon icon={Pencil} size={16} variant="toolbar" /></div>
            <h3 id={titleId} className="font-bold text-base text-slate-800">{employee ? t('Edit Data Karyawan', 'Edit Employee Data') : t('Tambah Karyawan', 'Add Employee')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-lg"><ContentLucideIcon icon={X} size={16} variant="toolbar" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          {!!bannerText && <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">{bannerText}</div>}
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Nama Karyawan', 'Employee Name')} *</label><input className={inp} placeholder={t('Nama lengkap', 'Full name')} value={nama} onChange={(e) => setNama(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Posisi / Jabatan', 'Position / Role')}</label><input className={inp} placeholder={t('Contoh: Electrical Engineer', 'Example: Electrical Engineer')} value={posisi} onChange={(e) => setPosisi(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Gender', 'Gender')} *</label><select className={inp} value={gender} onChange={(e) => setGender(e.target.value as 'L' | 'P')}><option value="L">{t('Laki-laki', 'Male')}</option><option value="P">{t('Perempuan', 'Female')}</option></select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Departemen', 'Department')} *</label><select className={inp} value={dept} onChange={(e) => setDept(e.target.value)}>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal Kontrak', 'Contract Date')} *</label><input type="date" className={inp} value={tgl} onChange={(e) => setTgl(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Jatah Cuti (Hari)', 'Leave Quota (Days)')}</label><input type="number" min={0} className={inp} value={jatah} onChange={(e) => setJatah(parseInt(e.target.value) || 0)} /></div>
          </div>
          {visaEligible && (
            <div className="border border-sky-200 bg-sky-50 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={visaActive} onChange={(e) => setVisaActive(e.target.checked)} />{t('Visa Aktif', 'Active Visa')}</label>
              <div className="flex flex-wrap gap-2">{(visaOptions && visaOptions.length ? visaOptions : [...VISA_OPTIONS]).map((v) => <button key={v} type="button" onClick={() => toggleVisa(v)} className={`px-2.5 h-7 rounded-lg text-[11px] font-bold border transition ${visaTypes.includes(v) ? 'bg-sky-600 border-sky-700 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{v}</button>)}</div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={() => { if (nama.trim() && dept && tgl) onSave({ nama: nama.trim(), departemen: dept, tglKontrak: tgl, jatahAwal: jatah, posisi: posisi.trim(), gender, visaActive: visaEligible ? visaActive : false, visaTypes: visaEligible ? visaTypes : [] }); }} className="flex-1 h-11 rounded-xl bg-[#005A9E] text-white text-sm font-bold hover:bg-[#004880] active:scale-95 transition inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Save} size={14} variant="toolbar" className="text-white" /> {submitLabel || t('Simpan', 'Save')}</button>
        </div>
      </div>
    </div>
  );
}
