import { can } from '../../../utils/permissions';
import { AlertTriangle, Eye, EyeOff, KeyRound, Lock, Save, ShieldCheck } from 'lucide-react';
import { ContentLucideIcon } from '../../../components/icons/ContentLucideIcon';
import { useI18n } from '../../../i18n/store';
import type { OwnAccountSectionProps } from '../types';

export function OwnAccountSection(props: OwnAccountSectionProps) {
  const { t } = useI18n();
  const { currentUser, ownEmployee, ownVisaActive, setOwnVisaActive, activeVisaOptions, ownVisaTypes, setOwnVisaTypes, doSaveOwnVisa, ownVisaSaving, roleLabel, showOwnPwOld, setShowOwnPwOld, ownPwOld, setOwnPwOld, showOwnPwNew, setShowOwnPwNew, ownPwNew, setOwnPwNew, showOwnPwConfirm, setShowOwnPwConfirm, ownPwConfirm, setOwnPwConfirm, ownPwLoading, doChangeOwnPassword } = props;
  return (
    <>
      {ownEmployee && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={ShieldCheck} size={14} variant="toolbar" /></div>
            <div><h3 className="font-bold text-slate-800">{t('Visa Aktif Saya', 'My Active Visa')}</h3><p className="text-xs text-slate-400 mt-0.5">{ownEmployee.nama} · {ownEmployee.departemen}</p></div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={ownVisaActive} onChange={(e) => setOwnVisaActive(e.target.checked)} />{t('Saya memiliki visa aktif', 'I have an active visa')}</label>
            <div className="flex flex-wrap gap-2">
              {activeVisaOptions.map((v) => (
                <button key={v} type="button" onClick={() => setOwnVisaTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))} disabled={!ownVisaActive} className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition ${ownVisaTypes.includes(v) ? 'bg-sky-600 border-sky-700 text-white' : 'bg-white border-slate-200 text-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>{v}</button>
              ))}
            </div>
            {can(currentUser.role, 'write') && <button onClick={doSaveOwnVisa} disabled={ownVisaSaving} className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1">{ownVisaSaving ? t('Menyimpan...', 'Saving...') : <><ContentLucideIcon icon={Save} size={13} variant="toolbar" className="text-white" /> {t('Simpan Visa Aktif Saya', 'Save My Active Visa')}</>}</button>}
          </div>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Lock} size={14} variant="toolbar" /></div>
          <div><h3 className="font-bold text-slate-800">{t('Ganti Password Saya', 'Change My Password')}</h3><p className="text-xs text-slate-400 mt-0.5">{currentUser.displayName} · @{currentUser.username} · {roleLabel[currentUser.role]}</p></div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Password Lama', 'Current Password')}</label><div className="relative"><input type={showOwnPwOld ? 'text' : 'password'} className="w-full h-11 px-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Masukkan password saat ini', 'Enter current password')} value={ownPwOld} onChange={(e) => setOwnPwOld(e.target.value)} /><button type="button" onClick={() => setShowOwnPwOld((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-base select-none" title={showOwnPwOld ? t('Sembunyikan', 'Hide') : t('Tampilkan', 'Show')}>{showOwnPwOld ? <ContentLucideIcon icon={EyeOff} size={14} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={14} variant="toolbar" />}</button></div></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Password Baru', 'New Password')}</label><div className="relative"><input type={showOwnPwNew ? 'text' : 'password'} className="w-full h-11 px-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Minimal 6 karakter', 'Minimum 6 characters')} value={ownPwNew} onChange={(e) => setOwnPwNew(e.target.value)} /><button type="button" onClick={() => setShowOwnPwNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-base select-none" title={showOwnPwNew ? t('Sembunyikan', 'Hide') : t('Tampilkan', 'Show')}>{showOwnPwNew ? <ContentLucideIcon icon={EyeOff} size={14} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={14} variant="toolbar" />}</button></div></div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Konfirmasi Password Baru', 'Confirm New Password')}</label>
            <div className="relative"><input type={showOwnPwConfirm ? 'text' : 'password'} className={`w-full h-11 px-3 pr-11 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 transition ${ownPwNew && ownPwConfirm && ownPwNew !== ownPwConfirm ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ownPwConfirm && ownPwNew === ownPwConfirm ? 'border-emerald-400 focus:border-emerald-400 focus:ring-emerald-400/10' : 'border-slate-200 focus:border-[#005A9E] focus:ring-[#005A9E]/10'}`} placeholder={t('Ulangi password baru', 'Repeat new password')} value={ownPwConfirm} onChange={(e) => setOwnPwConfirm(e.target.value)} /><button type="button" onClick={() => setShowOwnPwConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-base select-none" title={showOwnPwConfirm ? t('Sembunyikan', 'Hide') : t('Tampilkan', 'Show')}>{showOwnPwConfirm ? <ContentLucideIcon icon={EyeOff} size={14} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={14} variant="toolbar" />}</button></div>
            {ownPwConfirm && ownPwNew === ownPwConfirm && <p className="text-[11px] text-emerald-600 mt-1 font-semibold">✓ {t('Password cocok', 'Password matches')}</p>}
            {ownPwNew && ownPwConfirm && ownPwNew !== ownPwConfirm && <p className="text-[11px] text-red-500 mt-1 font-semibold">✗ {t('Password tidak cocok', 'Password does not match')}</p>}
          </div>
          {ownPwNew.length > 0 && ownPwNew.length < 6 && <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2"><ContentLucideIcon icon={AlertTriangle} size={12} variant="toolbar" /> {t('Password minimal 6 karakter', 'Password minimum 6 characters')}</div>}
          <button onClick={doChangeOwnPassword} disabled={ownPwLoading || !ownPwOld || !ownPwNew || ownPwNew !== ownPwConfirm || ownPwNew.length < 6} className="w-full h-11 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">{ownPwLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />} <ContentLucideIcon icon={KeyRound} size={14} variant="toolbar" className="text-white" /> {t('Ubah Password', 'Change Password')}</button>
        </div>
      </div>
    </>
  );
}
