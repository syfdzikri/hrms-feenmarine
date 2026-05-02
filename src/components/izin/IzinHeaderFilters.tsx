import { useState } from 'react';
import { useI18n } from '../../i18n/store';
import { Plus, Search } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';

interface PeriodOption {
  value: string;
  label: string;
}

interface SummaryItem {
  name: string;
  dept: string;
  used: number;
  approved: number;
  pending: number;
  rejected: number;
}

export function IzinHeaderFilters({
  canSubmitIzin,
  currentUserRole,
  onOpenCreate,
  linkedEmpName,
  myUsedCount,
  myRemaining,
  izinCutoffDay,
  filterPeriode,
  setFilterPeriode,
  periods,
  filterTipe,
  setFilterTipe,
  filterStatus,
  setFilterStatus,
  searchQ,
  setSearchQ,
  empSummary,
  maxPerPeriode,
}: {
  canSubmitIzin: boolean;
  currentUserRole: 'superadmin' | 'admin' | 'viewer';
  onOpenCreate: () => void;
  linkedEmpName?: string;
  myUsedCount: number;
  myRemaining: number;
  izinCutoffDay: number;
  filterPeriode: string;
  setFilterPeriode: (v: string) => void;
  periods: PeriodOption[];
  filterTipe: 'all' | 'terlambat' | 'pulang_cepat' | 'sakit';
  setFilterTipe: (v: 'all' | 'terlambat' | 'pulang_cepat' | 'sakit') => void;
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected';
  setFilterStatus: (v: 'all' | 'pending' | 'approved' | 'rejected') => void;
  searchQ: string;
  setSearchQ: (v: string) => void;
  empSummary: SummaryItem[];
  maxPerPeriode: number;
}) {
  const { t } = useI18n();
  const [showSummary, setShowSummary] = useState(false);
  const selectedPeriodeLabel = periods.find((p) => p.value === filterPeriode)?.label || '';
  const summaryLabel = filterPeriode === 'all'
    ? t('Ringkasan Semua Periode', 'All Periods Summary')
    : t('Ringkasan Periode Ini', 'Current Period Summary');
  const summaryLabelMobile = filterPeriode === 'all'
    ? t('Ringkasan Semua', 'All Summary')
    : t('Ringkasan Periode', 'Period Summary');
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap min-w-0">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-800">{t('Izin Datang Terlambat / Pulang Cepat', 'Late Arrival / Early Leave Permits')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('Jatah max per periode (reset tiap cutoff). Jam kerja: 08:00 – 17:00. Max izin: 4 jam.', 'Quota max per period (resets at cutoff). Work hours: 08:00 - 17:00. Max permit: 4 hours.')} ({maxPerPeriode}x · {t('cutoff tgl', 'cutoff day')} {izinCutoffDay})</p>
        </div>
        {canSubmitIzin && (
          <button onClick={onOpenCreate} className="h-9 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
            <ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Ajukan Izin', 'Submit Permit')}
          </button>
        )}
      </div>

      {linkedEmpName && (
        <div className={`mb-3 px-4 py-3 rounded-2xl border flex items-center gap-4 ${myRemaining === 0 ? 'bg-red-50 border-red-200' : myRemaining === 1 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t('Jatah Izin Saya (Periode ini)', 'My Permit Quota (Current period)')}</div>
            <div className="flex items-center gap-3">
              {Array.from({ length: maxPerPeriode }).map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition ${i < myUsedCount ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                  {i < myUsedCount ? '✓' : i + 1}
                </div>
              ))}
              <span className={`text-sm font-bold ${myRemaining === 0 ? 'text-red-600' : myRemaining === 1 ? 'text-amber-600' : 'text-blue-600'}`}>
                {myRemaining === 0 ? t('Jatah habis!', 'Quota exhausted!') : `${t('Sisa', 'Remaining')} ${myRemaining}x`}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-3 min-w-0">
        <select
          value={filterPeriode}
          onChange={(e) => setFilterPeriode(e.target.value)}
          title={selectedPeriodeLabel}
          className="col-span-2 sm:col-span-1 h-10 sm:h-8 min-w-0 w-full sm:w-auto sm:flex-1 px-3 sm:px-2 pr-8 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs outline-none focus:border-[#005A9E] truncate whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filterTipe} onChange={(e) => setFilterTipe(e.target.value as 'all' | 'terlambat' | 'pulang_cepat' | 'sakit')} className="h-10 sm:h-8 min-w-0 w-full sm:w-auto sm:flex-1 px-3 sm:px-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs outline-none focus:border-[#005A9E]">
          <option value="all">{t('Semua Tipe', 'All Types')}</option>
          <option value="terlambat">{t('Datang Terlambat', 'Late Arrival')}</option>
          <option value="pulang_cepat">{t('Pulang Cepat', 'Early Leave')}</option>
          <option value="sakit">{t('Sakit (MC)', 'Sick (Doctor MC)')}</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')} className="h-10 sm:h-8 min-w-0 w-full sm:w-auto sm:flex-1 px-3 sm:px-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs outline-none focus:border-[#005A9E]">
          <option value="all">{t('Semua Status', 'All Statuses')}</option>
          <option value="pending">{t('Pending', 'Pending')}</option>
          <option value="approved">{t('Disetujui', 'Approved')}</option>
          <option value="rejected">{t('Ditolak', 'Rejected')}</option>
        </select>
        <div className="relative col-span-2 w-full min-w-0 sm:w-44 sm:flex-none">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
          <input className="w-full h-10 sm:h-8 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-sm sm:text-xs outline-none focus:border-[#005A9E]" placeholder={t('Cari karyawan…', 'Search employee…')} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
        </div>
      </div>

      {empSummary.length > 0 && (
        <>
          <div className="sm:hidden mb-3">
            <button
              type="button"
              onClick={() => setShowSummary((v) => !v)}
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-between"
            >
              <span>
                <span className="sm:hidden">{summaryLabelMobile}</span>
                <span className="hidden sm:inline">{summaryLabel}</span>
                {' '}({empSummary.length})
              </span>
              <span className="text-[11px]">{showSummary ? '▲' : '▼'}</span>
            </button>
          </div>
          <div className={`bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 mb-4 ${showSummary ? 'block' : 'hidden sm:block'}`}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">{summaryLabel}</div>
            <div className="sm:hidden -mx-1 px-1 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {empSummary.map((s) => {
                  const remaining = maxPerPeriode - (s.approved + s.pending);
                  const overQuota = (s.approved + s.pending) >= maxPerPeriode;
                  const canSubmitForThisEmployee =
                    currentUserRole === 'superadmin' ||
                    (currentUserRole === 'admin' && !!linkedEmpName && s.name === linkedEmpName);
                  return (
                    <div key={s.name} className={`min-w-[180px] flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${overQuota ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${overQuota ? 'bg-red-500' : 'bg-orange-500'}`}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{s.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                          {t('Digunakan:', 'Used:')} <span className="font-bold text-orange-600">{s.approved + s.pending}</span>/{maxPerPeriode}
                          {remaining > 0 ? <span className="text-emerald-600 ml-1">· {t('Sisa', 'Remaining')} {remaining}x</span> : <span className="text-red-600 ml-1 font-bold">· {t('HABIS', 'EXHAUSTED')}</span>}
                          <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${canSubmitForThisEmployee ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {canSubmitForThisEmployee ? t('Bisa Ajukan', 'Can Submit') : t('Read Only', 'Read Only')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2">
            {empSummary.map((s) => {
              const remaining = maxPerPeriode - (s.approved + s.pending);
              const overQuota = (s.approved + s.pending) >= maxPerPeriode;
              const canSubmitForThisEmployee =
                currentUserRole === 'superadmin' ||
                (currentUserRole === 'admin' && !!linkedEmpName && s.name === linkedEmpName);
              return (
                <div key={s.name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${overQuota ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${overQuota ? 'bg-red-500' : 'bg-orange-500'}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                      {t('Digunakan:', 'Used:')} <span className="font-bold text-orange-600">{s.approved + s.pending}</span>/{maxPerPeriode}
                      {remaining > 0 ? <span className="text-emerald-600 ml-1">· {t('Sisa', 'Remaining')} {remaining}x</span> : <span className="text-red-600 ml-1 font-bold">· {t('HABIS', 'EXHAUSTED')}</span>}
                      <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${canSubmitForThisEmployee ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {canSubmitForThisEmployee ? t('Bisa Ajukan', 'Can Submit') : t('Read Only', 'Read Only')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
