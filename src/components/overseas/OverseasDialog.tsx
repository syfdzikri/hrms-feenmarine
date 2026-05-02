import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { Plane, Save, UserRoundCheck, X } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { OVERSEAS_TYPES, PROJECT_TYPES } from '../../constants/appDefaults';
import { useI18n } from '../../i18n/store';
import { todayStr } from '../../utils/common';
import type { Employee, OverseasEntry } from '../../types';

type OverseasDialogProps = {
  open: boolean;
  entry: OverseasEntry | null;
  employees: Employee[];
  onSave: (data: Omit<OverseasEntry, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
};

export function OverseasDialog({ open, entry, employees, onSave, onClose }: OverseasDialogProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocusTrap(open, modalRef, { onEscape: onClose });
  const OVERSEAS_PROJECT_OPTIONS = [...PROJECT_TYPES, 'Other'] as const;
  type OverseasProjectType = typeof OVERSEAS_PROJECT_OPTIONS[number];
  const maleEmployees = employees.filter((e) => !e.gender || e.gender === 'L');
  const [nama, setNama] = useState('');
  const [dept, setDept] = useState('');
  const [tipe, setTipe] = useState<typeof OVERSEAS_TYPES[number]>('Commissioning');
  const [projectType, setProjectType] = useState<OverseasProjectType>('EGCS');
  const [projectNo, setProjectNo] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [tglMulai, setTglMulai] = useState(todayStr());
  const [tglSelesai, setTglSelesai] = useState(todayStr());
  const [ket, setKet] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'upcoming'>('upcoming');

  useEffect(() => {
    if (entry) {
      setNama(entry.nama);
      setDept(entry.departemen);
      setTipe(entry.tipe);
      setProjectType((entry.projectType as OverseasProjectType) || 'EGCS');
      setProjectNo(entry.projectNo);
      setLokasi(entry.lokasi);
      setTglMulai(entry.tglMulai);
      setTglSelesai(entry.tglSelesai);
      setKet(entry.keterangan || '');
      setStatus(entry.status);
    } else {
      setNama('');
      setDept('');
      setTipe('Commissioning');
      setProjectNo('');
      setProjectType('EGCS');
      setLokasi('');
      setTglMulai(todayStr());
      setTglSelesai(todayStr());
      setKet('');
      setStatus('upcoming');
    }
  }, [entry, open]);

  if (!open) return null;
  const inp = 'w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition';
  const isVisaProcess = tipe === 'Mengurus Visa';

  const handleSave = () => {
    if (!nama || !lokasi || !tglMulai || !tglSelesai || !projectType) return;
    const normalizedProjectNo = projectNo.trim();
    if (!isVisaProcess && !normalizedProjectNo) return;
    const emp = maleEmployees.find((e) => e.nama === nama);
    onSave({
      nama,
      departemen: dept || (emp?.departemen || ''),
      tipe,
      projectType,
      projectNo: normalizedProjectNo || 'N/A',
      lokasi,
      tglMulai,
      tglSelesai,
      keterangan: ket,
      status,
    });
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
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center" aria-hidden><ContentLucideIcon icon={Plane} size={16} variant="toolbar" /></div>
            <h3 id={titleId} className="font-bold text-base text-slate-800">{entry ? t('Edit Overseas', 'Edit Overseas') : t('Tambah Overseas', 'Add Overseas')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Tutup', 'Close')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><ContentLucideIcon icon={X} size={16} variant="toolbar" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-700">
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={UserRoundCheck} size={12} variant="toolbar" /> {t('Overseas hanya tersedia untuk karyawan', 'Overseas is only available for')} <strong>{t('Laki-laki', 'Male')}</strong></span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Nama Karyawan', 'Employee Name')} *</label>
              <input list="emp-list-ovs" className={inp} placeholder={t('Nama atau ketik baru', 'Name or type new')} value={nama} onChange={(e) => { setNama(e.target.value); const emp = maleEmployees.find((x) => x.nama === e.target.value); if (emp) setDept(emp.departemen); }} />
              <datalist id="emp-list-ovs">{maleEmployees.map((e) => <option key={e.id} value={e.nama}>{e.departemen}</option>)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Departemen', 'Department')}</label>
              <input className={inp} value={dept} onChange={(e) => setDept(e.target.value)} placeholder={t('Departemen', 'Department')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tipe Pekerjaan', 'Work Type')} *</label>
              <select className={inp} value={tipe} onChange={(e) => setTipe(e.target.value as typeof OVERSEAS_TYPES[number])}>
                {OVERSEAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Jenis Proyek', 'Project Type')} *</label>
              <select className={inp} value={projectType} onChange={(e) => setProjectType(e.target.value as OverseasProjectType)}>
                {OVERSEAS_PROJECT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {t('No. Proyek', 'Project No.')} {isVisaProcess ? t('(opsional)', '(optional)') : '*'}
            </label>
            <input className={inp} placeholder={isVisaProcess ? t('Opsional untuk urusan visa', 'Optional for visa processing') : t('FMI-XXX atau FM-XXX', 'FMI-XXX or FM-XXX')} value={projectNo} onChange={(e) => setProjectNo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Lokasi Tujuan', 'Destination')} *</label>
            <input className={inp} placeholder={t('Contoh: Jakarta, Indonesia', 'Example: Jakarta, Indonesia')} value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal Berangkat', 'Departure Date')} *</label>
              <input type="date" className={inp} value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Tanggal Kembali', 'Return Date')} *</label>
              <input type="date" className={inp} value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Status', 'Status')}</label>
            <select className={inp} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'completed' | 'upcoming')}>
              <option value="upcoming">Upcoming</option>
              <option value="active">{t('Active / Berlangsung', 'Active / Ongoing')}</option>
              <option value="completed">{t('Selesai', 'Completed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Keterangan (opsional)', 'Notes (optional)')}</label>
            <textarea className={inp + ' h-20 resize-none pt-2.5'} placeholder={t('Catatan tambahan...', 'Additional notes...')} value={ket} onChange={(e) => setKet(e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold hover:bg-slate-100 active:scale-95 transition text-slate-700">{t('Batal', 'Cancel')}</button>
          <button type="button" onClick={handleSave} className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition">
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Save} size={14} variant="toolbar" className="text-white" /> {t('Simpan', 'Save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
