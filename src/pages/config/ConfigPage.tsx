import { useEffect, useState, type ChangeEvent } from 'react';
import { Bot, Building2, CheckCircle2, Download, ExternalLink, FlaskConical, Info, ListChecks, LocateFixed, Map, MapPin, MapPinned, MessageSquareShare, Palette, RotateCcw, Save, Search, Settings, ShieldAlert, Smartphone, TrendingUp, Upload, WalletCards, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { DateTimeFormat, IconStyle, UserRole } from '../../types';
import { useI18n } from '../../i18n/store';

export function ConfigPage({
  currentUserRole,
  cfgCompany,
  setCfgCompany,
  cfgAccrual,
  setCfgAccrual,
  cfgMaxLeave,
  setCfgMaxLeave,
  cfgAutoLogout,
  setCfgAutoLogout,
  cfgIzinCutoffDay,
  setCfgIzinCutoffDay,
  cfgIzinMaxPerPeriode,
  setCfgIzinMaxPerPeriode,
  cfgDepts,
  setCfgDepts,
  cfgVisaOptions,
  setCfgVisaOptions,
  cfgAttendanceEnabled,
  setCfgAttendanceEnabled,
  cfgAttendanceLockEnabled,
  setCfgAttendanceLockEnabled,
  cfgAttendanceCenterLat,
  setCfgAttendanceCenterLat,
  cfgAttendanceCenterLng,
  setCfgAttendanceCenterLng,
  cfgAttendanceRadiusMeters,
  setCfgAttendanceRadiusMeters,
  cfgAttendanceMinAccuracyMeters,
  setCfgAttendanceMinAccuracyMeters,
  cfgAttendanceShiftEnforced,
  setCfgAttendanceShiftEnforced,
  cfgAttendanceShiftStart,
  setCfgAttendanceShiftStart,
  cfgAttendanceShiftEnd,
  setCfgAttendanceShiftEnd,
  cfgAttendanceShiftToleranceMinutes,
  setCfgAttendanceShiftToleranceMinutes,
  cfgDateTimeFormat,
  setCfgDateTimeFormat,
  cfgIconStyle,
  setCfgIconStyle,
  cfgTodoEnabled,
  setCfgTodoEnabled,
  cfgTodoKanbanEnabled,
  setCfgTodoKanbanEnabled,
  cfgTodoSubtaskEnabled,
  setCfgTodoSubtaskEnabled,
  cfgTodoReminderEnabled,
  setCfgTodoReminderEnabled,
  cfgTodoRecurringEnabled,
  setCfgTodoRecurringEnabled,
  cfgTodoActivityEnabled,
  setCfgTodoActivityEnabled,
  cfgTodoDarkModeEnabled,
  setCfgTodoDarkModeEnabled,
  cfgTodoTaskDeleteConfirmEnabled,
  setCfgTodoTaskDeleteConfirmEnabled,
  cfgFatEnabled,
  setCfgFatEnabled,
  cfgAnalyticsEnabled,
  setCfgAnalyticsEnabled,
  onQuickToggleModule,
  onSaveConfig,
  onExportBackup,
  onImportBackup,
  onTestTelegram,
  onToast,
  configSaving = false,
}: {
  currentUserRole: UserRole;
  cfgCompany: string;
  setCfgCompany: (v: string) => void;
  cfgAccrual: number;
  setCfgAccrual: (v: number) => void;
  cfgMaxLeave: number;
  setCfgMaxLeave: (v: number) => void;
  cfgAutoLogout: number;
  setCfgAutoLogout: (v: number) => void;
  cfgIzinCutoffDay: number;
  setCfgIzinCutoffDay: (v: number) => void;
  cfgIzinMaxPerPeriode: number;
  setCfgIzinMaxPerPeriode: (v: number) => void;
  cfgDepts: string;
  setCfgDepts: (v: string) => void;
  cfgVisaOptions: string;
  setCfgVisaOptions: (v: string) => void;
  cfgAttendanceEnabled: boolean;
  setCfgAttendanceEnabled: (v: boolean) => void;
  cfgAttendanceLockEnabled: boolean;
  setCfgAttendanceLockEnabled: (v: boolean) => void;
  cfgAttendanceCenterLat: number;
  setCfgAttendanceCenterLat: (v: number) => void;
  cfgAttendanceCenterLng: number;
  setCfgAttendanceCenterLng: (v: number) => void;
  cfgAttendanceRadiusMeters: number;
  setCfgAttendanceRadiusMeters: (v: number) => void;
  cfgAttendanceMinAccuracyMeters: number;
  setCfgAttendanceMinAccuracyMeters: (v: number) => void;
  cfgAttendanceShiftEnforced: boolean;
  setCfgAttendanceShiftEnforced: (v: boolean) => void;
  cfgAttendanceShiftStart: string;
  setCfgAttendanceShiftStart: (v: string) => void;
  cfgAttendanceShiftEnd: string;
  setCfgAttendanceShiftEnd: (v: string) => void;
  cfgAttendanceShiftToleranceMinutes: number;
  setCfgAttendanceShiftToleranceMinutes: (v: number) => void;
  cfgDateTimeFormat: DateTimeFormat;
  setCfgDateTimeFormat: (v: DateTimeFormat) => void;
  cfgIconStyle: IconStyle;
  setCfgIconStyle: (v: IconStyle) => void;
  cfgTodoEnabled: boolean;
  setCfgTodoEnabled: (v: boolean) => void;
  cfgTodoKanbanEnabled: boolean;
  setCfgTodoKanbanEnabled: (v: boolean) => void;
  cfgTodoSubtaskEnabled: boolean;
  setCfgTodoSubtaskEnabled: (v: boolean) => void;
  cfgTodoReminderEnabled: boolean;
  setCfgTodoReminderEnabled: (v: boolean) => void;
  cfgTodoRecurringEnabled: boolean;
  setCfgTodoRecurringEnabled: (v: boolean) => void;
  cfgTodoActivityEnabled: boolean;
  setCfgTodoActivityEnabled: (v: boolean) => void;
  cfgTodoDarkModeEnabled: boolean;
  setCfgTodoDarkModeEnabled: (v: boolean) => void;
  cfgTodoTaskDeleteConfirmEnabled: boolean;
  setCfgTodoTaskDeleteConfirmEnabled: (v: boolean) => void;
  cfgFatEnabled: boolean;
  setCfgFatEnabled: (v: boolean) => void;
  cfgAnalyticsEnabled: boolean;
  setCfgAnalyticsEnabled: (v: boolean) => void;
  onQuickToggleModule: (key: 'attendance' | 'fat' | 'analytics' | 'todo', next: boolean) => Promise<void>;
  onSaveConfig: () => void;
  onExportBackup: () => void;
  onImportBackup: (ev: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onTestTelegram: () => Promise<void>;
  onToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  configSaving?: boolean;
}) {
  type ConfigTab = 'general' | 'attendance' | 'master' | 'features' | 'integrations';
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<ConfigTab>('general');
  const [mapsSource, setMapsSource] = useState('');
  const [mapsParseMsg, setMapsParseMsg] = useState('');
  const [mapsParseStatus, setMapsParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mapsMsgAnimated, setMapsMsgAnimated] = useState(true);
  const [previewMapMode, setPreviewMapMode] = useState<'terrain' | 'satellite'>('terrain');
  const [previewMapZoom, setPreviewMapZoom] = useState(17);
  const [previewCenterLat, setPreviewCenterLat] = useState(cfgAttendanceCenterLat);
  const [previewCenterLng, setPreviewCenterLng] = useState(cfgAttendanceCenterLng);
  const [detectingCurrentLocation, setDetectingCurrentLocation] = useState(false);
  const [detectedAccuracyMeters, setDetectedAccuracyMeters] = useState<number | null>(null);
  const [confirmEnableAttendanceOpen, setConfirmEnableAttendanceOpen] = useState(false);
  const [confirmFeatureToggleOpen, setConfirmFeatureToggleOpen] = useState(false);
  const [pendingFeatureToggle, setPendingFeatureToggle] = useState<{ key: 'attendance' | 'fat' | 'analytics' | 'todo'; next: boolean } | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hrms_maps_source') || '';
      setMapsSource(saved);
    } catch {
      void 0;
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('hrms_maps_source', mapsSource);
    } catch {
      void 0;
    }
  }, [mapsSource]);
  useEffect(() => {
    setMapsMsgAnimated(false);
    const id = window.setTimeout(() => setMapsMsgAnimated(true), 20);
    return () => window.clearTimeout(id);
  }, [mapsParseMsg, mapsParseStatus]);
  useEffect(() => {
    setPreviewCenterLat(cfgAttendanceCenterLat);
    setPreviewCenterLng(cfgAttendanceCenterLng);
  }, [cfgAttendanceCenterLat, cfgAttendanceCenterLng]);

  const parseMapsLatLng = (raw: string): { lat: number; lng: number } | null => {
    const text = (raw || '').trim();
    if (!text) return null;

    const direct = text.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (direct) {
      const lat = Number(direct[1]);
      const lng = Number(direct[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    const atPattern = text.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
    if (atPattern) {
      const lat = Number(atPattern[1]);
      const lng = Number(atPattern[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    const qPattern = text.match(/[?&](?:q|query)=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/i);
    if (qPattern) {
      const lat = Number(qPattern[1]);
      const lng = Number(qPattern[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    const dPattern = text.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
    if (dPattern) {
      const lat = Number(dPattern[1]);
      const lng = Number(dPattern[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    return null;
  };

  const applyMapsSource = () => {
    const parsed = parseMapsLatLng(mapsSource);
    if (!parsed) {
      setMapsParseMsg(t('Format tidak dikenali. Paste URL Google Maps atau koordinat "lat,lng".', 'Unrecognized format. Paste a Google Maps URL or coordinates as "lat,lng".'));
      setMapsParseStatus('error');
      return;
    }
    setCfgAttendanceCenterLat(Number(parsed.lat.toFixed(6)));
    setCfgAttendanceCenterLng(Number(parsed.lng.toFixed(6)));
    setPreviewCenterLat(Number(parsed.lat.toFixed(6)));
    setPreviewCenterLng(Number(parsed.lng.toFixed(6)));
    setMapsParseMsg(t('Koordinat berhasil diambil dari input Maps.', 'Coordinates were extracted successfully.'));
    setMapsParseStatus('success');
  };
  const applyAttendancePreset = (mode: 'indoor' | 'hybrid' | 'outdoor') => {
    if (mode === 'indoor') {
      setCfgAttendanceRadiusMeters(250);
      setCfgAttendanceMinAccuracyMeters(150);
      setMapsParseMsg(t('Preset Indoor diterapkan: radius 250m, akurasi 150m.', 'Indoor preset applied: radius 250m, accuracy 150m.'));
      setMapsParseStatus('success');
      return;
    }
    if (mode === 'hybrid') {
      setCfgAttendanceRadiusMeters(180);
      setCfgAttendanceMinAccuracyMeters(100);
      setMapsParseMsg(t('Preset Hybrid diterapkan: radius 180m, akurasi 100m.', 'Hybrid preset applied: radius 180m, accuracy 100m.'));
      setMapsParseStatus('success');
      return;
    }
    setCfgAttendanceRadiusMeters(100);
    setCfgAttendanceMinAccuracyMeters(50);
    setMapsParseMsg(t('Preset Outdoor diterapkan: radius 100m, akurasi 50m.', 'Outdoor preset applied: radius 100m, accuracy 50m.'));
    setMapsParseStatus('success');
  };
  const useCurrentLocationAsCenter = () => {
    if (!navigator.geolocation) {
      setMapsParseMsg(t('Browser ini tidak mendukung geolocation.', 'This browser does not support geolocation.'));
      setMapsParseStatus('error');
      return;
    }
    setDetectingCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : NaN;
        setCfgAttendanceCenterLat(lat);
        setCfgAttendanceCenterLng(lng);
        setPreviewCenterLat(lat);
        setPreviewCenterLng(lng);
        setPreviewMapZoom((z) => Math.max(17, z));
        setDetectedAccuracyMeters(Number.isFinite(accuracy) ? accuracy : null);
        setMapsParseMsg(t('Lokasi saat ini berhasil dipakai sebagai center area.', 'Current location was set as area center.'));
        setMapsParseStatus('success');
        setDetectingCurrentLocation(false);
      },
      (error) => {
        let message = t('Tidak dapat mengambil lokasi saat ini.', 'Unable to get current location.');
        if (error.code === error.PERMISSION_DENIED) {
          message = t('Izin lokasi ditolak. Aktifkan izin lokasi browser lalu coba lagi.', 'Location permission denied. Enable browser location access and try again.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = t('Posisi tidak tersedia. Pastikan GPS/jaringan aktif.', 'Position unavailable. Ensure GPS/network is active.');
        } else if (error.code === error.TIMEOUT) {
          message = t('Pengambilan lokasi timeout. Coba lagi.', 'Location request timed out. Please try again.');
        }
        setDetectedAccuracyMeters(null);
        setMapsParseMsg(message);
        setMapsParseStatus('error');
        setDetectingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const getCurrentPermitPeriodPreview = (cutoffDay: number) => {
    const cutoff = Math.min(28, Math.max(1, Math.floor(cutoffDay || 21)));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const monthNames = language === 'en'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    if (cutoff === 1) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return `1 ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }

    const currentPeriodMonth = day >= cutoff ? month + 1 : month;
    const endDate = new Date(year, currentPeriodMonth, cutoff - 1);
    const startDate = new Date(year, currentPeriodMonth - 1, cutoff);
    return `${startDate.getDate()} ${monthNames[startDate.getMonth()]} - ${endDate.getDate()} ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
  };

  const requestFeatureToggle = (key: 'attendance' | 'fat' | 'analytics' | 'todo', next: boolean) => {
    if (key === 'attendance' && !cfgAttendanceEnabled && next) {
      setConfirmEnableAttendanceOpen(true);
      return;
    }
    setPendingFeatureToggle({ key, next });
    setConfirmFeatureToggleOpen(true);
  };

  const applyPendingFeatureToggle = async () => {
    if (!pendingFeatureToggle) return;
    const { key, next } = pendingFeatureToggle;
    await onQuickToggleModule(key, next);
    setConfirmFeatureToggleOpen(false);
    setPendingFeatureToggle(null);
  };

  return (
    <div className="cfg-page flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {([
              { key: 'general', label: t('Umum', 'General'), icon: Settings },
              { key: 'attendance', label: t('Absensi', 'Attendance'), icon: MapPinned },
              { key: 'master', label: t('Master Data', 'Master Data'), icon: Building2 },
              { key: 'features', label: t('Fitur', 'Features'), icon: Palette },
              { key: 'integrations', label: t('Integrasi', 'Integrations'), icon: Bot },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-10 px-3 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-[#005A9E] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ContentLucideIcon icon={tab.icon} size={12} variant="toolbar" className={activeTab === tab.key ? 'text-white' : ''} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'general' && (
        <>
        <div className="cfg-attendance-card bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Settings} size={14} variant="toolbar" /></div>
            <h3 className="font-bold text-slate-800">{t('Pengaturan Umum', 'General Settings')}</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Nama Perusahaan', 'Company Name')}</label>
              <input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgCompany} onChange={(e) => setCfgCompany(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Akrual Cuti / Bulan (hari)', 'Leave Accrual / Month (days)')}</label>
                <input type="number" min={0} max={5} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAccrual} onChange={(e) => setCfgAccrual(parseInt(e.target.value, 10) || 0)} />
                <p className="text-[10px] text-slate-400 mt-1">{t('Ditambahkan otomatis setiap bulan per tanggal kontrak', 'Automatically added monthly based on contract date')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Maks. Saldo Cuti (hari)', 'Max Leave Balance (days)')}</label>
                <input type="number" min={1} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgMaxLeave} onChange={(e) => setCfgMaxLeave(parseInt(e.target.value, 10) || 1)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Auto Logout (menit)', 'Auto Logout (minutes)')}</label>
                <input type="number" min={5} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAutoLogout} onChange={(e) => setCfgAutoLogout(parseInt(e.target.value, 10) || 30)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Cutoff Periode Izin (tanggal)', 'Permit Period Cutoff Day')}</label>
                <input type="number" min={1} max={28} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgIzinCutoffDay} onChange={(e) => setCfgIzinCutoffDay(parseInt(e.target.value, 10) || 21)} />
                <p className="text-[10px] text-slate-400 mt-1">{t('Periode berjalan dari tanggal cutoff bulan lalu sampai sehari sebelum cutoff bulan ini.', 'Current period runs from cutoff date last month until one day before this month cutoff.')}</p>
                <p className="text-[10px] text-blue-600 mt-1">{t('Preview periode aktif:', 'Current period preview:')} <strong>{getCurrentPermitPeriodPreview(cfgIzinCutoffDay)}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Maks. Izin per Periode', 'Max Permits per Period')}</label>
                <input type="number" min={1} max={20} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgIzinMaxPerPeriode} onChange={(e) => setCfgIzinMaxPerPeriode(parseInt(e.target.value, 10) || 3)} />
                <p className="text-[10px] text-slate-400 mt-1">{t('Digunakan untuk membatasi jumlah pengajuan izin tiap karyawan per periode.', 'Used to limit number of permit submissions per employee per period.')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Settings} size={14} variant="toolbar" /></div>
            <div>
              <h3 className="font-bold text-slate-800">{t('Kontrol Modul Sidebar', 'Sidebar Module Controls')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('Aktifkan atau nonaktifkan menu utama sesuai kebutuhan operasional.', 'Enable or disable key menu modules based on operational needs.')}</p>
            </div>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ContentLucideIcon icon={MapPin} size={13} variant="toolbar" /> {t('Absensi', 'Attendance')}</span>
              <input type="checkbox" className="h-4 w-4" checked={cfgAttendanceEnabled} onChange={(e) => requestFeatureToggle('attendance', e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ContentLucideIcon icon={FlaskConical} size={13} variant="toolbar" /> {t('Jadwal FAT', 'FAT Schedule')}</span>
              <input type="checkbox" className="h-4 w-4" checked={cfgFatEnabled} onChange={(e) => requestFeatureToggle('fat', e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ContentLucideIcon icon={TrendingUp} size={13} variant="toolbar" /> {t('Analitik', 'Analytics')}</span>
              <input type="checkbox" className="h-4 w-4" checked={cfgAnalyticsEnabled} onChange={(e) => requestFeatureToggle('analytics', e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ContentLucideIcon icon={ListChecks} size={13} variant="toolbar" /> {t('To-Do', 'To-Do')}</span>
              <input type="checkbox" className="h-4 w-4" checked={cfgTodoEnabled} onChange={(e) => requestFeatureToggle('todo', e.target.checked)} />
            </label>
          </div>
        </div>
        </>
        )}

        {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={MapPinned} size={14} variant="toolbar" /></div>
            <div>
              <h3 className="font-bold text-slate-800">{t('Absensi Geolocation', 'Geolocation Attendance')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('Aktifkan/nonaktifkan fitur absensi GPS serta lock area.', 'Enable/disable GPS attendance feature and lock area settings.')}</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="cfg-attendance-toggle flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <span className="text-sm font-semibold text-slate-700">{t('Aktifkan lock area', 'Enable lock area')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgAttendanceLockEnabled} onChange={(e) => setCfgAttendanceLockEnabled(e.target.checked)} />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Latitude Center</label>
                <input type="number" step="0.000001" className="cfg-attendance-input w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceCenterLat} onChange={(e) => setCfgAttendanceCenterLat(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Longitude Center</label>
                <input type="number" step="0.000001" className="cfg-attendance-input w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceCenterLng} onChange={(e) => setCfgAttendanceCenterLng(Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="cfg-attendance-mapsbox rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <label className="block text-xs font-semibold text-slate-500 mb-2">{t('Ambil dari Google Maps', 'Get from Google Maps')}</label>
              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-3">
                <div className="cfg-geo-preview-wrap rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-2.5 py-1.5 border-b border-slate-100 text-[10px] font-bold tracking-wide text-slate-500">
                    {t('EDIT SPOT', 'EDIT SPOT')}
                  </div>
                  <div className="p-2 border-b border-slate-100">
                    <div className="space-y-2">
                      <div className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                        <ContentLucideIcon icon={Search} size={12} variant="toolbar" />
                        <span className="truncate">{mapsSource || `${cfgAttendanceCenterLat.toFixed(6)}, ${cfgAttendanceCenterLng.toFixed(6)}`}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div className="h-9 p-1 rounded-xl border border-slate-200 bg-slate-50 inline-flex items-center justify-start shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewMapMode('terrain')}
                            className={`h-7 flex-1 px-2 rounded-lg text-[10px] font-bold transition ${previewMapMode === 'terrain' ? 'bg-[#005A9E] shadow-sm text-white border border-[#005A9E]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                          >
                            {t('Terrain', 'Terrain')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMapMode('satellite')}
                            className={`h-7 flex-1 px-2 rounded-lg text-[10px] font-bold transition ${previewMapMode === 'satellite' ? 'bg-[#005A9E] shadow-sm text-white border border-[#005A9E]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                          >
                            {t('Satellite', 'Satellite')}
                          </button>
                        </div>
                        <div className="h-9 p-1 rounded-xl border border-slate-200 bg-slate-50 inline-flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewMapZoom((z) => Math.max(3, z - 1))}
                            className="h-7 w-7 rounded-lg text-[12px] font-bold text-slate-600 hover:text-slate-800 hover:bg-white transition"
                            aria-label={t('Zoom out', 'Zoom out')}
                            title={t('Zoom out', 'Zoom out')}
                          >
                            -
                          </button>
                          <div className="min-w-[44px] text-center text-[10px] font-bold text-slate-500">
                            Z{previewMapZoom}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewMapZoom((z) => Math.min(21, z + 1))}
                            className="h-7 w-7 rounded-lg text-[12px] font-bold text-slate-600 hover:text-slate-800 hover:bg-white transition"
                            aria-label={t('Zoom in', 'Zoom in')}
                            title={t('Zoom in', 'Zoom in')}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewMapZoom(17);
                            setPreviewMapMode('terrain');
                            setPreviewCenterLat(cfgAttendanceCenterLat);
                            setPreviewCenterLng(cfgAttendanceCenterLng);
                          }}
                          className="col-span-2 h-9 px-3 rounded-xl border border-slate-200 bg-white/70 text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-white transition inline-flex items-center justify-center gap-1"
                          title={t('Reset view', 'Reset view')}
                        >
                          <ContentLucideIcon icon={RotateCcw} size={11} variant="toolbar" className="text-slate-400" />
                          <span>{t('Reset View', 'Reset View')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative aspect-[4/3] bg-slate-200">
                    <iframe
                      title="Attendance geofence map preview"
                      src={`https://maps.google.com/maps?q=${previewCenterLat},${previewCenterLng}&z=${previewMapZoom}&t=${previewMapMode === 'satellite' ? 'k' : 'm'}&output=embed`}
                      className="absolute inset-0 w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div
                        className="rounded-full border-2 border-red-400/90 bg-red-400/20"
                        style={{
                          width: `${Math.max(70, Math.min(220, cfgAttendanceRadiusMeters / 1.8))}px`,
                          height: `${Math.max(70, Math.min(220, cfgAttendanceRadiusMeters / 1.8))}px`,
                        }}
                      />
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                      <div className="w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                  <div className="grid grid-cols-1 gap-2 items-center">
                    <input
                      className="cfg-attendance-input w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                      placeholder={t('Paste URL Google Maps atau koordinat -6.200000,106.816666', 'Paste Google Maps URL or coordinates -6.200000,106.816666')}
                      value={mapsSource}
                      onChange={(e) => setMapsSource(e.target.value)}
                    />
                    <button type="button" onClick={applyMapsSource} className="cfg-attendance-action h-10 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition whitespace-nowrap">
                      {t('Gunakan Koordinat', 'Use Coordinates')}
                    </button>
                    <button
                      type="button"
                      onClick={useCurrentLocationAsCenter}
                      disabled={detectingCurrentLocation}
                      className="h-10 px-4 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition whitespace-nowrap inline-flex items-center justify-center gap-1"
                    >
                      <ContentLucideIcon icon={LocateFixed} size={12} variant="toolbar" />
                      {detectingCurrentLocation ? t('Mendeteksi lokasi...', 'Detecting location...') : t('Use Current Location', 'Use Current Location')}
                    </button>
                    {detectedAccuracyMeters !== null && (
                      <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 inline-flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500">{t('GPS Accuracy', 'GPS Accuracy')}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold border ${
                          detectedAccuracyMeters <= 30
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : detectedAccuracyMeters <= 80
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          ±{Math.round(detectedAccuracyMeters)} m
                        </span>
                      </div>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${cfgAttendanceCenterLat},${cfgAttendanceCenterLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="cfg-attendance-mapslink h-10 inline-flex items-center justify-center gap-1 px-3 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 text-xs font-bold whitespace-nowrap transition"
                    >
                      <ContentLucideIcon icon={Map} size={12} variant="toolbar" />
                      {t('Buka Maps', 'Open Maps')}
                      <ContentLucideIcon icon={ExternalLink} size={10} variant="toolbar" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <div className="text-slate-400">{t('Address', 'Address')}</div>
                      <div className="font-semibold text-slate-700 truncate">
                        {t('Center Point', 'Center Point')}: {cfgAttendanceCenterLat.toFixed(6)}, {cfgAttendanceCenterLng.toFixed(6)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <div className="text-slate-400">{t('Latitude', 'Latitude')}</div>
                      <div className="font-semibold text-slate-700">{cfgAttendanceCenterLat.toFixed(6)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <div className="text-slate-400">{t('Longitude', 'Longitude')}</div>
                      <div className="font-semibold text-slate-700">{cfgAttendanceCenterLng.toFixed(6)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 col-span-2">
                      <div className="text-slate-400">{t('Spot Name', 'Spot Name')}</div>
                      <div className="font-semibold text-slate-700">{t('Attendance Center', 'Attendance Center')}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 col-span-2">
                      <div className="text-slate-400">{t('Radius', 'Radius')}</div>
                      <div className="font-semibold text-slate-700">{cfgAttendanceRadiusMeters} m</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 min-h-5">
                {mapsParseMsg ? (
                  <p className={`text-[11px] inline-flex items-center gap-1.5 transition-all duration-200 ${
                    mapsParseStatus === 'error' ? 'text-red-600' : mapsParseStatus === 'success' ? 'text-emerald-600' : 'text-blue-600'
                  } ${mapsMsgAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-0.5'}`}>
                    <ContentLucideIcon
                      icon={mapsParseStatus === 'error' ? XCircle : CheckCircle2}
                      size={12}
                      variant="toolbar"
                    />
                    {mapsParseMsg}
                  </p>
                ) : (
                  <p className={`text-[11px] inline-flex items-center gap-1.5 text-slate-400 transition-all duration-200 ${mapsMsgAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-0.5'}`}>
                    <ContentLucideIcon icon={Info} size={12} variant="toolbar" />
                    {t('Tip: klik kanan titik di Google Maps lalu copy koordinat.', 'Tip: right-click a point in Google Maps and copy coordinates.')}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Radius Area (meter)', 'Area Radius (meters)')}</label>
                <input type="number" min={25} max={10000} className="cfg-attendance-input w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceRadiusMeters} onChange={(e) => setCfgAttendanceRadiusMeters(parseInt(e.target.value, 10) || 25)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Batas Akurasi GPS (meter)', 'GPS Accuracy Limit (meters)')}</label>
                <input type="number" min={10} max={1000} className="cfg-attendance-input w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceMinAccuracyMeters} onChange={(e) => setCfgAttendanceMinAccuracyMeters(parseInt(e.target.value, 10) || 10)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
              <label className="cfg-attendance-toggle flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <span className="text-sm font-semibold text-slate-700">{t('Aktifkan validasi jam shift', 'Enable shift-time validation')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgAttendanceShiftEnforced} onChange={(e) => setCfgAttendanceShiftEnforced(e.target.checked)} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('Jam Masuk Shift', 'Shift Start')}</label>
                  <input type="time" className="cfg-attendance-input w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceShiftStart} onChange={(e) => setCfgAttendanceShiftStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('Jam Pulang Shift', 'Shift End')}</label>
                  <input type="time" className="cfg-attendance-input w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceShiftEnd} onChange={(e) => setCfgAttendanceShiftEnd(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t('Toleransi (menit)', 'Tolerance (minutes)')}</label>
                  <input type="number" min={0} max={180} className="cfg-attendance-input w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={cfgAttendanceShiftToleranceMinutes} onChange={(e) => setCfgAttendanceShiftToleranceMinutes(parseInt(e.target.value, 10) || 0)} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Format DateTime Global', 'Global DateTime Format')}</label>
              <select
                className="cfg-attendance-input w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                value={cfgDateTimeFormat}
                onChange={(e) => setCfgDateTimeFormat((e.target.value as DateTimeFormat) === 'iso' ? 'iso' : 'id_wib')}
              >
                <option value="id_wib">{t('Indonesia (WIB)', 'Indonesia (WIB)')}</option>
                <option value="iso">ISO (YYYY-MM-DD HH:mm:ss)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Preset Lokasi', 'Location Presets')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onClick={() => applyAttendancePreset('indoor')} className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                  {t('Indoor', 'Indoor')}
                </button>
                <button type="button" onClick={() => applyAttendancePreset('hybrid')} className="h-9 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition">
                  {t('Hybrid', 'Hybrid')}
                </button>
                <button type="button" onClick={() => applyAttendancePreset('outdoor')} className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition">
                  {t('Outdoor', 'Outdoor')}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {t('Catatan: anti fake GPS di web tidak 100% mutlak; gunakan geofence, akurasi, dan audit log untuk mitigasi.', 'Note: anti fake GPS in web is not absolutely 100%; use geofence, accuracy, and audit logs as mitigation.')}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">{t('Perubahan konfigurasi akan tersimpan setelah klik tombol Simpan.', 'Configuration updates are applied after pressing Save.')}</p>
              <button
                type="button"
                onClick={onSaveConfig}
                disabled={configSaving}
                className="h-10 min-w-[220px] px-4 bg-[#005A9E] hover:bg-[#004880] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1"
              >
                <ContentLucideIcon icon={Save} size={13} variant="toolbar" className="text-white" />
                {configSaving ? t('Menyimpan...', 'Saving...') : t('Simpan Pengaturan Absensi', 'Save Attendance Settings')}
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'master' && (
        <>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Building2} size={14} variant="toolbar" /></div>
            <h3 className="font-bold text-slate-800">{t('Departemen', 'Departments')}</h3>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Daftar Departemen (satu per baris)', 'Department List (one per line)')}</label>
            <textarea className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition resize-none" rows={6} value={cfgDepts} onChange={(e) => setCfgDepts(e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1.5">{t('Saat ini:', 'Current:')} {cfgDepts.split('\n').filter((d) => d.trim()).length} {t('departemen', 'departments')}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={WalletCards} size={14} variant="toolbar" /></div>
            <h3 className="font-bold text-slate-800">{t('Pilihan Visa', 'Visa Options')}</h3>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Daftar Jenis Visa (satu per baris)', 'Visa Type List (one per line)')}</label>
            <textarea className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition resize-none" rows={5} value={cfgVisaOptions} onChange={(e) => setCfgVisaOptions(e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1.5">{t('Saat ini:', 'Current:')} {cfgVisaOptions.split('\n').filter((v) => v.trim()).length} {t('jenis visa', 'visa types')}</p>
          </div>
        </div>
        </>
        )}

        {activeTab === 'features' && (
        <>
        {currentUserRole === 'superadmin' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={CheckCircle2} size={14} variant="toolbar" /></div>
              <div>
                <h3 className="font-bold text-slate-800">{t('Fitur To-Do List', 'To-Do List Features')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('Super admin dapat mengaktifkan/menonaktifkan modul dan fitur To-Do secara fleksibel.', 'Super admin can enable/disable the To-Do module and features independently.')}</p>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Aktifkan modul To-Do', 'Enable To-Do module')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoEnabled} onChange={(e) => requestFeatureToggle('todo', e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Kanban view', 'Kanban view')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoKanbanEnabled} onChange={(e) => setCfgTodoKanbanEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Subtask', 'Subtasks')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoSubtaskEnabled} onChange={(e) => setCfgTodoSubtaskEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Reminder', 'Reminders')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoReminderEnabled} onChange={(e) => setCfgTodoReminderEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Recurring task', 'Recurring tasks')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoRecurringEnabled} onChange={(e) => setCfgTodoRecurringEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-700">{t('Activity log', 'Activity log')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoActivityEnabled} onChange={(e) => setCfgTodoActivityEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 sm:col-span-2">
                <span className="font-semibold text-slate-700">{t('Dark mode khusus To-Do', 'To-Do dark mode')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoDarkModeEnabled} onChange={(e) => setCfgTodoDarkModeEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 sm:col-span-2">
                <span className="font-semibold text-slate-700">{t('Konfirmasi hapus task', 'Confirm task deletion')}</span>
                <input type="checkbox" className="h-4 w-4" checked={cfgTodoTaskDeleteConfirmEnabled} onChange={(e) => setCfgTodoTaskDeleteConfirmEnabled(e.target.checked)} />
              </label>
            </div>
          </div>
        )}

        {currentUserRole === 'superadmin' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-fuchsia-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Palette} size={14} variant="toolbar" /></div>
              <div>
                <h3 className="font-bold text-slate-800">{t('Tampilan ikon (navigasi)', 'Icon appearance (navigation)')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('Hanya super admin yang dapat mengubah. Mode warna memakai Microsoft Fluent Color (Iconify) di menu; halaman lain tetap memakai Lucide dengan penyesuaian ringan.', 'Only a super admin can change this. Colorful mode uses Microsoft Fluent Color (Iconify) in the menu; other pages still use Lucide with a light saturation boost.')}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Gaya ikon', 'Icon style')}</label>
              <select
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition"
                value={cfgIconStyle}
                onChange={(e) => setCfgIconStyle(e.target.value as IconStyle)}
              >
                <option value="default">{t('Default (Lucide garis)', 'Default (Lucide outline)')}</option>
                <option value="vibrant">{t('Berwarna (Fluent Color)', 'Colorful (Fluent Color)')}</option>
              </select>
            </div>
          </div>
        )}
        {currentUserRole !== 'superadmin' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={ShieldAlert} size={13} variant="toolbar" /> {t('Tab ini khusus Super Admin.', 'This tab is only available for Super Admin.')}</span>
          </div>
        )}
        </>
        )}

        {activeTab === 'general' && (
        <>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          <div className="font-semibold mb-1 inline-flex items-center gap-1"><ContentLucideIcon icon={Info} size={13} variant="toolbar" /> {t('Tentang Akrual Cuti Otomatis', 'About Automatic Leave Accrual')}</div>
          <p className="text-xs leading-relaxed">
            {t('Sistem akan secara otomatis menambahkan', 'The system will automatically add')} <strong>{cfgAccrual} {t('hari', 'days')}</strong> {t('cuti setiap bulan kepada setiap karyawan, dihitung dari tanggal kontrak masing-masing. Penambahan dilakukan pada hari yang sama dengan tanggal kontrak setiap bulannya, minimal setelah 1 bulan bekerja. Saldo maksimal dibatasi', 'leave each month for each employee, calculated from each contract date. The accrual is applied on the same day as the contract date each month, after at least 1 month of employment. The maximum balance is limited to')} <strong>{cfgMaxLeave} {t('hari', 'days')}</strong>.
          </p>
        </div>

        <button onClick={onSaveConfig} disabled={configSaving} className="w-full h-12 bg-[#005A9E] hover:bg-[#004880] disabled:opacity-60 text-white rounded-xl font-bold text-sm transition active:scale-95">
          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Save} size={14} variant="toolbar" className="text-white" /> {configSaving ? t('Menyimpan Konfigurasi...', 'Saving Configuration...') : t('Simpan Konfigurasi', 'Save Configuration')}</span>
        </button>
        </>
        )}

        {activeTab === 'integrations' && (
        <>
        {currentUserRole === 'superadmin' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Save} size={14} variant="toolbar" /></div>
              <div>
                <h3 className="font-bold text-slate-800">{t('Backup & Restore Data', 'Backup & Restore Data')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('Export seluruh data ke JSON untuk disaster recovery, atau import kembali.', 'Export all data to JSON for disaster recovery, or import it back.')}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={onExportBackup} className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"><ContentLucideIcon icon={Download} size={14} variant="toolbar" className="text-white" /> {t('Export Backup (JSON)', 'Export Backup (JSON)')}</button>
                <label className="h-11 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer">
                  <ContentLucideIcon icon={Upload} size={14} variant="toolbar" className="text-white" /> {t('Import Restore (JSON)', 'Import Restore (JSON)')}
                  <input type="file" accept=".json" className="hidden" onChange={onImportBackup} />
                </label>
              </div>
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700">
                <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={ShieldAlert} size={12} variant="toolbar" /> <strong>{t('Perhatian:', 'Warning:')}</strong> {t('Import akan', 'Import will')} <strong>{t('menimpa semua data', 'overwrite all data')}</strong>. {t('Lakukan export backup terbaru sebelum restore. Password tidak disertakan dalam backup.', 'Export the latest backup before restore. Passwords are not included in backup.')}</span>
              </div>
            </div>
          </div>
        )}

        {currentUserRole === 'superadmin' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Smartphone} size={14} variant="toolbar" /></div>
              <div>
                <h3 className="font-bold text-slate-800">{t('Notifikasi Telegram Bot', 'Telegram Bot Notifications')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('Kirim reminder langsung ke HP karyawan via Telegram Bot.', 'Send reminders directly to employee phones via Telegram Bot.')}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="px-3 py-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 space-y-1">
                <p className="font-bold inline-flex items-center gap-1"><ContentLucideIcon icon={Bot} size={12} variant="toolbar" /> {t('Setup Telegram Bot:', 'Telegram Bot Setup:')}</p>
                <p>1. {t('Buka Telegram, cari', 'Open Telegram, search')} <strong>@BotFather</strong> → /newbot</p>
                <p>2. {t('Salin', 'Copy')} <strong>Bot Token</strong> {t('yang diberikan ke field di bawah', 'provided into the field below')}</p>
                <p>3. {t('Minta karyawan /start ke bot → dapatkan Chat ID via getUpdates', 'Ask employees to /start the bot → get Chat ID via getUpdates')}</p>
                <p>4. {t('Test kirim pesan untuk verifikasi koneksi', 'Send a test message to verify connection')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Telegram Bot Token', 'Telegram Bot Token')}</label>
                <input className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-green-400" placeholder="1234567890:AAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" defaultValue={(() => { try { return localStorage.getItem('hrms_tg_token') || ''; } catch { return ''; } })()} onBlur={(e) => { try { localStorage.setItem('hrms_tg_token', e.target.value); } catch { void 0; } }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Chat ID Test', 'Chat ID Test')}</label>
                <input className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-green-400" placeholder="-1001234567890 atau 123456789" defaultValue={(() => { try { return localStorage.getItem('hrms_tg_chatid') || ''; } catch { return ''; } })()} onBlur={(e) => { try { localStorage.setItem('hrms_tg_chatid', e.target.value); } catch { void 0; } }} />
              </div>
              <button onClick={onTestTelegram} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition">
                <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={MessageSquareShare} size={14} variant="toolbar" className="text-white" /> {t('Kirim Pesan Test ke Telegram', 'Send Test Message to Telegram')}</span>
              </button>
            </div>
          </div>
        )}
        {currentUserRole !== 'superadmin' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={ShieldAlert} size={13} variant="toolbar" /> {t('Tab ini khusus Super Admin.', 'This tab is only available for Super Admin.')}</span>
          </div>
        )}
        </>
        )}
      </div>
      <ConfirmDialog
        open={confirmFeatureToggleOpen}
        title={pendingFeatureToggle?.next ? t('Aktifkan modul ini?', 'Enable this module?') : t('Nonaktifkan modul ini?', 'Disable this module?')}
        msg={pendingFeatureToggle?.next
          ? t('Modul akan langsung ditampilkan kembali di sidebar.\n\nLanjutkan?', 'The module will be shown immediately in the sidebar.\n\nContinue?')
          : t('Modul akan langsung disembunyikan dari sidebar.\n\nLanjutkan?', 'The module will be hidden immediately from the sidebar.\n\nContinue?')}
        onCancel={() => {
          setConfirmFeatureToggleOpen(false);
          setPendingFeatureToggle(null);
        }}
        onOk={applyPendingFeatureToggle}
      />
      <ConfirmDialog
        open={confirmEnableAttendanceOpen}
        title={t('Aktifkan fitur absensi?', 'Enable attendance feature?')}
        msg={t(
          'Fitur Absensi akan ditampilkan untuk karyawan dan aturan geofence akan mulai diterapkan sesuai konfigurasi.\n\nLanjut aktifkan sekarang?',
          'Attendance will be visible to employees and geofence rules will be applied based on current configuration.\n\nDo you want to enable it now?',
        )}
        danger={false}
        onCancel={() => setConfirmEnableAttendanceOpen(false)}
        onOk={() => {
          void onQuickToggleModule('attendance', true);
          setConfirmEnableAttendanceOpen(false);
        }}
      />
    </div>
  );
}
