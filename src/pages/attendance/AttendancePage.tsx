import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Crosshair,
  Download,
  ExternalLink,
  History,
  Map as MapIcon,
  MapPin,
  ShieldAlert,
  Smartphone,
  TimerReset,
  Users,
} from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useI18n } from '../../i18n/store';
import type { AppUser, AttendanceEntry, Employee, Notification, OnlineUser, ToastKind } from '../../types';
import { fmtDateTime, nowTs, todayStr, uid } from '../../utils/common';
import {
  buildWorkPairsForDay,
  computeMonthStats,
  formatDurationMs,
  isAttendanceAnomaly,
  totalWorkedMsFromPairs,
} from '../../utils/attendance';
import { haversineMeters } from '../../utils/geo';

type AttendancePageProps = {
  currentUser: AppUser;
  employees: Employee[];
  attendanceEntries: AttendanceEntry[];
  attendanceLockEnabled: boolean;
  attendanceCenterLat: number;
  attendanceCenterLng: number;
  attendanceRadiusMeters: number;
  attendanceMinAccuracyMeters: number;
  attendanceShiftEnforced: boolean;
  attendanceShiftStart: string;
  attendanceShiftEnd: string;
  attendanceShiftToleranceMinutes: number;
  fbSaveAttendance: (entry: AttendanceEntry) => Promise<void>;
  fbDeleteAttendance: (id: string) => Promise<void>;
  toast: (msg: string, kind?: ToastKind) => void;
  appUsers: AppUser[];
  onlineUsers: OnlineUser[];
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<Notification>;
  focusDate?: string | null;
  focusEntryId?: string | null;
};

export function AttendancePage({
  currentUser,
  employees,
  attendanceEntries,
  attendanceLockEnabled,
  attendanceCenterLat,
  attendanceCenterLng,
  attendanceRadiusMeters,
  attendanceMinAccuracyMeters,
  attendanceShiftEnforced,
  attendanceShiftStart,
  attendanceShiftEnd,
  attendanceShiftToleranceMinutes,
  fbSaveAttendance,
  fbDeleteAttendance,
  toast,
  appUsers,
  onlineUsers,
  addNotification,
  focusDate,
  focusEntryId,
}: AttendancePageProps) {
  const { t } = useI18n();
  const safeTs = (value?: string) => (typeof value === 'string' ? value : '');
  const safeDay = (value?: string) => safeTs(value).slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('');
  const [teamDateFilter, setTeamDateFilter] = useState(todayStr());
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceEntry | null>(null);
  const [deletingAttendance, setDeletingAttendance] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  useEffect(() => {
    if (focusDate) setTeamDateFilter(focusDate);
  }, [focusDate]);
  useEffect(() => {
    if (!focusEntryId) return;
    setHighlightEntryId(focusEntryId);
    const timer = window.setTimeout(() => {
      setHighlightEntryId((curr) => (curr === focusEntryId ? null : curr));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [focusEntryId]);

  const [teamDeptFilter, setTeamDeptFilter] = useState('');
  const [teamTableMode, setTeamTableMode] = useState<'latest' | 'all'>('latest');
  const [exportDateStart, setExportDateStart] = useState(todayStr());
  const [exportDateEnd, setExportDateEnd] = useState(todayStr());
  const [reviewModal, setReviewModal] = useState<{ entry: AttendanceEntry; decision: 'approved' | 'rejected' } | null>(null);
  const [reviewNoteDraft, setReviewNoteDraft] = useState('');

  const ownEmployee = useMemo(() => {
    if (!currentUser.linkedEmployeeName) return null;
    return employees.find((e) => e.nama === currentUser.linkedEmployeeName) || null;
  }, [employees, currentUser.linkedEmployeeName]);

  const ownEntriesAll = useMemo(
    () =>
      attendanceEntries
        .filter((entry) => entry && entry.employeeName === ownEmployee?.nama)
        .sort((a, b) => safeTs(b.createdAt).localeCompare(safeTs(a.createdAt))),
    [attendanceEntries, ownEmployee?.nama],
  );
  const ownEntries = useMemo(() => ownEntriesAll.slice(0, 10), [ownEntriesAll]);
  const todayOwnEntries = useMemo(
    () =>
      ownEntriesAll
        .filter((entry) => safeDay(entry.createdAt) === todayStr())
        .sort((a, b) => safeTs(b.createdAt).localeCompare(safeTs(a.createdAt))),
    [ownEntriesAll],
  );
  const lastOwnEntryToday = todayOwnEntries[0] || null;
  const nextActionType: 'checkin' | 'checkout' = lastOwnEntryToday?.type === 'checkin' ? 'checkout' : 'checkin';
  const nextActionLabel = nextActionType === 'checkin' ? t('Check-in Sekarang', 'Check in now') : t('Check-out Sekarang', 'Check out now');
  const nextActionHint = lastOwnEntryToday
    ? `${t('Absensi terakhir hari ini', 'Last attendance today')}: ${lastOwnEntryToday.type === 'checkin' ? 'Check-in' : 'Check-out'} · ${fmtDateTime(lastOwnEntryToday.createdAt)}`
    : t('Belum ada absensi hari ini.', 'No attendance records today yet.');
  const canSeeTeamRealtime = currentUser.role === 'superadmin' || currentUser.role === 'admin';
  const canReviewAnomaly = currentUser.role === 'superadmin' || currentUser.role === 'admin';
  const selectedDayEntries = useMemo(
    () => attendanceEntries.filter((entry) => safeDay(entry?.createdAt) === teamDateFilter),
    [attendanceEntries, teamDateFilter],
  );
  const dayEntriesFiltered = useMemo(
    () => selectedDayEntries.filter((e) => !teamDeptFilter || e.department === teamDeptFilter),
    [selectedDayEntries, teamDeptFilter],
  );
  const wibMonthKey = (() => {
    const wib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}`;
  })();
  const monthStats = useMemo(
    () => (ownEmployee ? computeMonthStats(attendanceEntries, ownEmployee.nama, wibMonthKey) : null),
    [attendanceEntries, ownEmployee, wibMonthKey],
  );
  const todayWorkedMs = useMemo(() => {
    if (!ownEmployee) return 0;
    return totalWorkedMsFromPairs(buildWorkPairsForDay(attendanceEntries, ownEmployee.nama, todayStr()));
  }, [attendanceEntries, ownEmployee]);
  const activeDepartments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.departemen).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [employees],
  );
  const teamLatestRows = useMemo(() => {
    const latestByEmployee = new Map<string, AttendanceEntry>();
    for (const entry of dayEntriesFiltered) {
      const current = latestByEmployee.get(entry.employeeName);
      if (!current || entry.createdAt > current.createdAt) {
        latestByEmployee.set(entry.employeeName, entry);
      }
    }
    const rows = Array.from(latestByEmployee.values())
      .map((entry) => {
        const linkedUser = appUsers.find((u) => u.linkedEmployeeName === entry.employeeName);
        const isOnline = !!linkedUser && onlineUsers.some((u) => u.userId === linkedUser.id);
        const anomalyFlags: string[] = [];
        const isOutsideArea = !entry.withinAllowedArea;
        const isLowAccuracy = entry.accuracyMeters > attendanceMinAccuracyMeters;
        if (isOutsideArea && isLowAccuracy) anomalyFlags.push(t('Anomali Tinggi', 'High Anomaly'));
        if (isOutsideArea) anomalyFlags.push(t('Luar area', 'Outside area'));
        if (isLowAccuracy) anomalyFlags.push(t('Akurasi rendah', 'Low accuracy'));
        return {
          entry,
          isOnline,
          anomalyText: anomalyFlags.join(', '),
          isHighAnomaly: isOutsideArea && isLowAccuracy,
          isAnomaly: isOutsideArea || isLowAccuracy,
        };
      })
      .sort((a, b) => {
        if (a.isHighAnomaly !== b.isHighAnomaly) return a.isHighAnomaly ? -1 : 1;
        return safeTs(b.entry.createdAt).localeCompare(safeTs(a.entry.createdAt));
      })
      .slice(0, 30);
    if (!onlyAnomalies) return rows;
    return rows.filter((row) => !!row.anomalyText);
  }, [dayEntriesFiltered, appUsers, onlineUsers, attendanceMinAccuracyMeters, t, onlyAnomalies]);
  const teamAllRows = useMemo(() => {
    let rows = dayEntriesFiltered
      .map((entry) => {
        const linkedUser = appUsers.find((u) => u.linkedEmployeeName === entry.employeeName);
        const isOnline = !!linkedUser && onlineUsers.some((u) => u.userId === linkedUser.id);
        const anomalyFlags: string[] = [];
        const isOutsideArea = !entry.withinAllowedArea;
        const isLowAccuracy = entry.accuracyMeters > attendanceMinAccuracyMeters;
        if (isOutsideArea && isLowAccuracy) anomalyFlags.push(t('Anomali Tinggi', 'High Anomaly'));
        if (isOutsideArea) anomalyFlags.push(t('Luar area', 'Outside area'));
        if (isLowAccuracy) anomalyFlags.push(t('Akurasi rendah', 'Low accuracy'));
        return {
          entry,
          isOnline,
          anomalyText: anomalyFlags.join(', '),
          isHighAnomaly: isOutsideArea && isLowAccuracy,
          isAnomaly: isOutsideArea || isLowAccuracy,
        };
      })
      .sort((a, b) => safeTs(b.entry.createdAt).localeCompare(safeTs(a.entry.createdAt)))
      .slice(0, 500);
    if (onlyAnomalies) rows = rows.filter((row) => !!row.anomalyText);
    return rows;
  }, [dayEntriesFiltered, appUsers, onlineUsers, attendanceMinAccuracyMeters, t, onlyAnomalies]);
  const teamDisplayRows = teamTableMode === 'latest' ? teamLatestRows : teamAllRows;
  useEffect(() => {
    if (!focusEntryId) return;
    const row = rowRefs.current[focusEntryId];
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusEntryId, teamDisplayRows]);
  const checkinTodayCount = dayEntriesFiltered.filter((e) => e.type === 'checkin').length;
  const checkoutTodayCount = dayEntriesFiltered.filter((e) => e.type === 'checkout').length;
  const anomalyTodayCount = teamDisplayRows.filter((row) => !!row.anomalyText).length;
  const pendingReviewCount = teamDisplayRows.filter(
    (row) => row.isAnomaly && (row.entry.reviewStatus || 'approved') === 'pending',
  ).length;

  const doExportCsv = () => {
    if (exportDateStart > exportDateEnd) {
      toast(t('Tanggal mulai tidak boleh setelah tanggal akhir.', 'Start date cannot be after end date.'), 'error');
      return;
    }
    const rows = attendanceEntries
      .filter((entry) => {
        const d = safeDay(entry.createdAt);
        if (d < exportDateStart || d > exportDateEnd) return false;
        if (teamDeptFilter && entry.department !== teamDeptFilter) return false;
        if (onlyAnomalies && !isAttendanceAnomaly(entry, attendanceMinAccuracyMeters)) return false;
        return true;
      })
      .sort((a, b) => safeTs(b.createdAt).localeCompare(safeTs(a.createdAt)));
    const anomalyLabel = (entry: AttendanceEntry) => {
      const flags: string[] = [];
      if (!entry.withinAllowedArea && entry.accuracyMeters > attendanceMinAccuracyMeters) {
        flags.push(t('Anomali Tinggi', 'High Anomaly'));
      }
      if (!entry.withinAllowedArea) flags.push(t('Luar area', 'Outside area'));
      if (entry.accuracyMeters > attendanceMinAccuracyMeters) flags.push(t('Akurasi rendah', 'Low accuracy'));
      return flags.join(', ');
    };
    const csvRows = [
      ['employeeName', 'department', 'timestamp', 'type', 'latitude', 'longitude', 'accuracyMeters', 'distanceFromCenterMeters', 'withinAllowedArea', 'anomaly'],
      ...rows.map((entry) => [
        entry.employeeName,
        entry.department,
        entry.createdAt,
        entry.type,
        String(entry.latitude),
        String(entry.longitude),
        String(entry.accuracyMeters),
        String(entry.distanceFromCenterMeters ?? ''),
        entry.withinAllowedArea ? 'yes' : 'no',
        anomalyLabel(entry),
      ]),
    ];
    const encodeCell = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = csvRows.map((r) => r.map(encodeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${exportDateStart}_to_${exportDateEnd}${teamDeptFilter ? `-${teamDeptFilter.replace(/\s+/g, '-')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('Export CSV berhasil diunduh.', 'CSV export downloaded successfully.'), 'success');
  };

  const isMobileClient = /android|iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const buildMapsHref = (latitude: number, longitude: number) => {
    if (isMobileClient) return `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };
  const copyCoordinates = async (latitude: number, longitude: number) => {
    const text = `${latitude},${longitude}`;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.setAttribute('readonly', 'true');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      toast(t('Koordinat berhasil disalin.', 'Coordinates copied.'));
    } catch {
      toast(t('Gagal menyalin koordinat.', 'Failed to copy coordinates.'), 'error');
    }
  };
  const reviewAnomaly = async (entry: AttendanceEntry, status: 'approved' | 'rejected', note?: string): Promise<boolean> => {
    if (!canReviewAnomaly) return false;
    const trimmed = note?.trim();
    const updated: AttendanceEntry = {
      ...entry,
      reviewStatus: status,
      reviewedBy: currentUser.displayName,
      reviewedAt: nowTs(),
      reviewNote:
        trimmed ||
        (status === 'rejected' ? t('Ditolak oleh reviewer', 'Rejected by reviewer') : t('Disetujui oleh reviewer', 'Approved by reviewer')),
    };
    try {
      await fbSaveAttendance(updated);
      toast(status === 'approved' ? t('Anomali disetujui.', 'Anomaly approved.') : t('Anomali ditolak.', 'Anomaly rejected.'));
      return true;
    } catch {
      toast(t('Gagal menyimpan hasil review anomali.', 'Failed to save anomaly review result.'), 'error');
      return false;
    }
  };
  const submitReviewModal = async () => {
    if (!reviewModal) return;
    const ok = await reviewAnomaly(reviewModal.entry, reviewModal.decision, reviewNoteDraft);
    if (ok) {
      setReviewModal(null);
      setReviewNoteDraft('');
    }
  };
  const requestDeleteAttendance = (entry: AttendanceEntry) => {
    if (currentUser.role !== 'superadmin') return;
    setDeleteTarget(entry);
  };
  const doDeleteAttendance = async () => {
    if (!deleteTarget || currentUser.role !== 'superadmin') return;
    setDeletingAttendance(true);
    try {
      await fbDeleteAttendance(deleteTarget.id);
      toast(t('Data absensi berhasil dihapus.', 'Attendance record deleted.'), 'warning');
      setDeleteTarget(null);
    } catch {
      toast(t('Gagal menghapus data absensi.', 'Failed to delete attendance record.'), 'error');
    } finally {
      setDeletingAttendance(false);
    }
  };
  const doBulkDeleteByDate = async () => {
    if (currentUser.role !== 'superadmin') return;
    if (selectedDayEntries.length === 0) {
      toast(t('Tidak ada data absensi pada tanggal ini.', 'No attendance data on this date.'), 'info');
      setConfirmBulkDeleteOpen(false);
      return;
    }
    const guardText = window.prompt(
      t(
        'Ketik DELETE untuk melanjutkan hapus massal data absensi.',
        'Type DELETE to continue bulk deleting attendance data.',
      ),
      '',
    );
    if ((guardText || '').trim().toUpperCase() !== 'DELETE') {
      toast(t('Bulk delete dibatalkan. Kode konfirmasi tidak sesuai.', 'Bulk delete canceled. Confirmation code mismatch.'), 'warning');
      return;
    }
    setDeletingAttendance(true);
    try {
      await Promise.all(selectedDayEntries.map((entry) => fbDeleteAttendance(entry.id)));
      toast(
        `${selectedDayEntries.length} ${t('data absensi berhasil dihapus untuk tanggal terpilih.', 'attendance records deleted for selected date.')}`,
        'warning',
      );
      setConfirmBulkDeleteOpen(false);
    } catch {
      toast(t('Gagal menghapus data absensi massal.', 'Failed to bulk delete attendance records.'), 'error');
    } finally {
      setDeletingAttendance(false);
    }
  };

  const requestPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    });
  const toMinutes = (hhmm: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };
  const getJakartaMinutesFromTs = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    const wibDate = new Date(parsed.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return wibDate.getHours() * 60 + wibDate.getMinutes();
  };
  const formatDuration = (minutes: number) => {
    const safe = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    if (hours > 0) return `${hours}j ${mins}m`;
    return `${mins}m`;
  };
  const getPunctualityDetail = (entry: AttendanceEntry) => {
    if (!entry.punctualityStatus || entry.punctualityStatus === 'on_time') return null;
    const eventMinutes = getJakartaMinutesFromTs(entry.createdAt);
    if (eventMinutes === null) return null;
    if (entry.punctualityStatus === 'late') {
      const shiftStartMins = toMinutes(attendanceShiftStart);
      if (shiftStartMins === null) return null;
      const diff = eventMinutes - shiftStartMins;
      if (diff <= 0) return null;
      return t('Telat', 'Late') + ` ${formatDuration(diff)}`;
    }
    if (entry.punctualityStatus === 'early_leave') {
      const shiftEndMins = toMinutes(attendanceShiftEnd);
      if (shiftEndMins === null) return null;
      const diff = shiftEndMins - eventMinutes;
      if (diff <= 0) return null;
      return t('Lebih cepat', 'Early by') + ` ${formatDuration(diff)}`;
    }
    return null;
  };
  const getJakartaNowMinutes = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return now.getHours() * 60 + now.getMinutes();
  };

  const probeCurrentLocation = async (showToast = false) => {
    if (!('geolocation' in navigator)) {
      if (showToast) toast(t('Browser tidak mendukung GPS. Gunakan browser modern dengan izin lokasi aktif.', 'Browser does not support geolocation. Use a modern browser with location permission enabled.'), 'error');
      return null;
    }
    try {
      const pos = await requestPosition();
      const latitude = Number(pos.coords.latitude);
      const longitude = Number(pos.coords.longitude);
      const accuracy = Math.round(Number(pos.coords.accuracy || 0));
      const distance = haversineMeters(latitude, longitude, attendanceCenterLat, attendanceCenterLng);
      setLastDistance(distance);
      setLastAccuracy(accuracy);
      setLastCheckedAt(nowTs());
      if (showToast) toast(`${t('Lokasi berhasil dibaca.', 'Location read successfully.')} ${Math.round(distance)}m · GPS ${accuracy}m`, 'info');
      return { pos, latitude, longitude, accuracy, distance };
    } catch (error: any) {
      if (showToast) {
        if (error?.code === 1) {
          toast(t('Izin lokasi ditolak. Aktifkan permission lokasi pada browser terlebih dahulu.', 'Location permission denied. Please enable browser location permission first.'), 'error');
        } else if (error?.code === 2) {
          toast(t('Lokasi tidak tersedia. Pastikan GPS/Wi-Fi aktif.', 'Location is unavailable. Ensure GPS/Wi-Fi is enabled.'), 'error');
        } else if (error?.code === 3) {
          toast(t('Pembacaan lokasi timeout. Coba lagi di area terbuka.', 'Location request timed out. Try again in an open area.'), 'error');
        } else {
          toast(t('Gagal membaca lokasi GPS.', 'Failed to read GPS location.'), 'error');
        }
      }
      return null;
    }
  };

  const submitAttendance = async (type: 'checkin' | 'checkout') => {
    if (!ownEmployee) {
      toast(t('Akun Anda belum terhubung ke data karyawan.', 'Your account is not linked to an employee record.'), 'error');
      return;
    }
    setSaving(true);
    try {
      const probe = await probeCurrentLocation(false);
      if (!probe) {
        toast(t('Lokasi tidak dapat dibaca. Cek izin lokasi dan koneksi GPS.', 'Could not read location. Check location permission and GPS connectivity.'), 'error');
        return;
      }
      const { pos, latitude, longitude, accuracy, distance } = probe;
      const withinAllowedArea = distance <= attendanceRadiusMeters;
      const shiftStartMins = toMinutes(attendanceShiftStart);
      const shiftEndMins = toMinutes(attendanceShiftEnd);
      const nowMins = getJakartaNowMinutes();
      if (attendanceShiftEnforced && shiftStartMins !== null && shiftEndMins !== null) {
        if (type === 'checkin') {
          const earliestCheckin = Math.max(0, shiftStartMins - 180);
          const latestCheckin = Math.min(24 * 60, shiftStartMins + attendanceShiftToleranceMinutes);
          if (nowMins < earliestCheckin || nowMins > latestCheckin) {
            toast(`${t('Di luar jam check-in shift', 'Outside shift check-in window')}: ${attendanceShiftStart} ± ${attendanceShiftToleranceMinutes}m`, 'error');
            return;
          }
        } else {
          const earliestCheckout = Math.max(0, shiftEndMins - attendanceShiftToleranceMinutes);
          const latestCheckout = Math.min(24 * 60, shiftEndMins + 360);
          if (nowMins < earliestCheckout || nowMins > latestCheckout) {
            toast(`${t('Di luar jam check-out shift', 'Outside shift check-out window')}: ${attendanceShiftEnd} ± ${attendanceShiftToleranceMinutes}m`, 'error');
            return;
          }
        }
      }

      if (accuracy > attendanceMinAccuracyMeters) {
        toast(
          `${t('Akurasi GPS terlalu rendah', 'GPS accuracy is too low')}: ${accuracy}m. ${t('Coba pindah ke area terbuka.', 'Try moving to an open area.')}`,
          'error',
        );
        return;
      }

      if (attendanceLockEnabled && !withinAllowedArea) {
        toast(
          `${t('Di luar area absensi', 'Outside attendance area')} (${Math.round(distance)}m / ${attendanceRadiusMeters}m).`,
          'error',
        );
        return;
      }

      const entry: AttendanceEntry = {
        id: uid('att'),
        employeeId: ownEmployee.id,
        employeeName: ownEmployee.nama,
        department: ownEmployee.departemen,
        createdBy: currentUser.id,
        createdAt: nowTs(),
        type,
        latitude,
        longitude,
        accuracyMeters: accuracy,
        distanceFromCenterMeters: Math.round(distance),
        withinAllowedArea,
        punctualityStatus:
          type === 'checkin'
            ? (shiftStartMins !== null && nowMins > shiftStartMins + attendanceShiftToleranceMinutes ? 'late' : 'on_time')
            : (shiftEndMins !== null && nowMins < shiftEndMins - attendanceShiftToleranceMinutes ? 'early_leave' : 'on_time'),
        reviewStatus: (!withinAllowedArea || accuracy > attendanceMinAccuracyMeters) ? 'pending' : 'approved',
        geolocationTimestampMs: pos.timestamp,
        userAgent: navigator.userAgent,
      };

      await fbSaveAttendance(entry);

      if (!withinAllowedArea || accuracy > attendanceMinAccuracyMeters) {
        try {
          await addNotification({
            type: 'warning',
            title: t('Anomali Absensi GPS', 'GPS Attendance Anomaly'),
            message: `${ownEmployee.nama} · ${type === 'checkin' ? 'check-in' : 'check-out'} · ${t('Akurasi', 'Accuracy')} ${accuracy}m · ${t('Jarak', 'Distance')} ${Math.round(distance)}m`,
            targetRole: 'superadmin',
            relatedId: entry.id,
            action: 'open-attendance',
          });
        } catch {
          // ignore notification failure; attendance already saved
        }
      }
      if (entry.reviewStatus === 'pending') {
        toast(t('Absensi tercatat dan menunggu review anomali admin.', 'Attendance recorded and waiting admin anomaly review.'), 'warning');
      } else {
        toast(type === 'checkin' ? t('Check-in berhasil.', 'Check-in recorded.') : t('Check-out berhasil.', 'Check-out recorded.'));
      }
    } catch (error: any) {
      if (error?.code === 1) toast(t('Izin lokasi ditolak. Aktifkan permission lokasi browser.', 'Location permission denied. Please enable browser location permission.'), 'error');
      else toast(t('Gagal mengambil lokasi GPS.', 'Failed to read GPS location.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const mapLink = `https://www.google.com/maps?q=${attendanceCenterLat},${attendanceCenterLng}`;

  return (
    <div className="att-page flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#005A9E] via-[#006db5] to-[#004f87] px-5 py-4 text-white">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                  <MapPin className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{t('Absensi GPS', 'GPS Attendance')}</h2>
                  <p className="mt-1 text-sm text-blue-100/95">
                    {attendanceLockEnabled
                      ? t('Absensi dibatasi area geofence perusahaan.', 'Attendance is locked to company geofence area.')
                      : t('Mode lock area nonaktif.', 'Lock area mode is disabled.')}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm ${
                  attendanceLockEnabled ? 'border-emerald-300/80 bg-emerald-500/20 text-emerald-50' : 'border-amber-300/80 bg-amber-500/20 text-amber-50'
                }`}
              >
                <ContentLucideIcon icon={ShieldAlert} size={12} variant="toolbar" /> {attendanceLockEnabled ? 'LOCK ON' : 'LOCK OFF'}
              </span>
            </div>
          </div>

          <div className="space-y-5 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1 text-xs font-medium text-slate-500">{t('Titik Center', 'Center Point')}</div>
                <div className="font-semibold tabular-nums text-slate-800">{attendanceCenterLat.toFixed(6)}, {attendanceCenterLng.toFixed(6)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1 text-xs font-medium text-slate-500">{t('Radius Area', 'Area Radius')}</div>
                <div className="font-semibold text-slate-800">{attendanceRadiusMeters} m</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1 text-xs font-medium text-slate-500">{t('Akurasi Minimum', 'Minimum Accuracy')}</div>
                <div className="font-semibold text-slate-800">{attendanceMinAccuracyMeters} m</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void probeCurrentLocation(true)}
                disabled={saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
                <ContentLucideIcon icon={Crosshair} size={14} variant="toolbar" /> {t('Cek Lokasi Saya', 'Check my location')}
              </button>
              <button
                type="button"
                onClick={() => submitAttendance(nextActionType)}
                disabled={saving}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-md transition disabled:opacity-60 active:scale-[0.98] ${
                  nextActionType === 'checkin' ? 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700' : 'bg-[#005A9E] shadow-[#005A9E]/25 hover:bg-[#004880]'
                }`}
              >
                <ContentLucideIcon icon={nextActionType === 'checkin' ? MapPin : TimerReset} size={14} variant="toolbar" className="text-white" /> {nextActionLabel}
              </button>
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-100">
                <ContentLucideIcon icon={Crosshair} size={14} variant="toolbar" /> {t('Lihat Area di Maps', 'View area in maps')}
              </a>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
              <div>
                <strong className="text-slate-800">{t('Status siap absen:', 'Ready status:')}</strong> {nextActionLabel}
              </div>
              <div>{nextActionHint}</div>
              {ownEmployee && todayWorkedMs > 0 && (
                <div>
                  <strong className="text-slate-800">{t('Durasi kerja hari ini (terpasang check-in/out):', 'Work duration today (paired in/out):')}</strong>{' '}
                  {formatDurationMs(todayWorkedMs)}
                </div>
              )}
              <div>
                {t('Shift:', 'Shift:')} {attendanceShiftStart} - {attendanceShiftEnd} · {t('Toleransi', 'Tolerance')} {attendanceShiftToleranceMinutes}m{' '}
                {attendanceShiftEnforced ? `(${t('aktif', 'active')})` : `(${t('nonaktif', 'disabled')})`}
              </div>
              <div>
                {t('Terakhir cek lokasi:', 'Last location check:')} {lastCheckedAt ? fmtDateTime(lastCheckedAt) : '-'}
              </div>
            </div>

            {(lastDistance !== null || lastAccuracy !== null) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
                {t('Pembacaan terakhir', 'Last reading')}: {lastDistance !== null ? `${Math.round(lastDistance)}m` : '-'} · GPS {t('akurasi', 'accuracy')}{' '}
                {lastAccuracy !== null ? `${lastAccuracy}m` : '-'}
              </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white p-4 text-xs text-amber-950 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Smartphone className="h-4 w-4" aria-hidden />
              </div>
              <p className="leading-relaxed">
                {t(
                  'Mitigasi anti fake GPS di web bersifat deteksi risiko (akurasi, geofence, audit). Tidak dapat menjamin 100% anti-manipulasi pada browser.',
                  'Anti fake GPS in web is risk mitigation (accuracy, geofence, audit). It cannot guarantee 100% anti-manipulation in browser environments.',
                )}
              </p>
            </div>
          </div>
        </div>

        {ownEmployee && monthStats && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-5 py-4 text-white">
              <div className="pointer-events-none absolute -left-6 top-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/15">
                  <BarChart3 className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{t('Ringkasan bulan ini', 'This month summary')}</h3>
                  <p className="mt-0.5 text-sm text-slate-300">{monthStats.monthKey}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-white p-4 sm:grid-cols-3 sm:p-5">
              {[
                {
                  label: t('Hari dengan pasangan in/out', 'Days with in/out pair'),
                  value: monthStats.workDaysWithPair,
                  accent: 'border-l-emerald-500',
                },
                {
                  label: t('Check-in terlambat', 'Late check-ins'),
                  value: monthStats.lateCheckins,
                  accent: 'border-l-amber-500',
                },
                {
                  label: t('Total tap absensi', 'Total attendance taps'),
                  value: monthStats.entriesInMonth,
                  accent: 'border-l-slate-400',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className={`rounded-xl border border-slate-200 bg-slate-50/90 p-3 pl-3 shadow-sm ${kpi.accent} border-l-4`}
                >
                  <div className="text-[11px] font-medium leading-tight text-slate-500">{kpi.label}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#005A9E] via-[#006db5] to-[#004f87] px-5 py-4 text-white">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                <History className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">{t('Riwayat Absensi Saya', 'My Attendance History')}</h3>
                <p className="mt-1 text-sm text-blue-100/95">{t('10 tap terakhir Anda.', 'Your latest 10 taps.')}</p>
              </div>
            </div>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2.5">{t('Waktu', 'Time')}</th>
                  <th className="px-3 py-2.5">{t('Tipe', 'Type')}</th>
                  <th className="px-3 py-2.5">GPS</th>
                  <th className="px-3 py-2.5">{t('Status Area', 'Area Status')}</th>
                  <th className="px-3 py-2.5">Maps</th>
                </tr>
              </thead>
              <tbody>
                {ownEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <ClipboardList className="h-7 w-7" aria-hidden />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{t('Belum ada absensi.', 'No attendance records yet.')}</p>
                        <p className="mt-1 max-w-xs text-xs text-slate-400">
                          {t('Lakukan check-in atau check-out untuk mulai mencatat.', 'Use check-in or check-out to start recording.')}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {ownEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-600">{fmtDateTime(entry.createdAt)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{entry.type === 'checkin' ? 'Check-in' : 'Check-out'}</td>
                    <td className="px-3 py-2 text-slate-600">{entry.accuracyMeters}m · {entry.distanceFromCenterMeters ?? '-'}m</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          entry.withinAllowedArea
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {entry.withinAllowedArea ? t('Dalam area', 'Within area') : t('Luar area', 'Outside area')}
                      </span>
                      {entry.punctualityStatus && (
                        <span
                          className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            entry.punctualityStatus === 'late'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : entry.punctualityStatus === 'early_leave'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}
                        >
                          {entry.punctualityStatus === 'late'
                            ? t('Terlambat', 'Late')
                            : entry.punctualityStatus === 'early_leave'
                              ? t('Pulang cepat', 'Early leave')
                              : t('On time', 'On time')}
                        </span>
                      )}
                      {getPunctualityDetail(entry) && (
                        <div className="mt-1 text-[10px] font-semibold text-amber-600">{getPunctualityDetail(entry)}</div>
                      )}
                      {entry.reviewStatus && (
                        <span
                          className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            entry.reviewStatus === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : entry.reviewStatus === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {entry.reviewStatus === 'pending'
                            ? t('Pending review', 'Pending review')
                            : entry.reviewStatus === 'rejected'
                              ? t('Ditolak', 'Rejected')
                              : t('Disetujui', 'Approved')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={buildMapsHref(entry.latitude, entry.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 text-xs font-bold transition">
                          <ContentLucideIcon icon={MapIcon} size={12} variant="toolbar" />
                          {t('Buka Maps', 'Open Maps')}
                          <ContentLucideIcon icon={ExternalLink} size={11} variant="toolbar" />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyCoordinates(entry.latitude, entry.longitude)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-800">
                          {t('Copy', 'Copy')}
                        </button>
                        {currentUser.role === 'superadmin' && (
                          <button
                            type="button"
                            onClick={() => requestDeleteAttendance(entry)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                            {t('Hapus', 'Delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canSeeTeamRealtime && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/60 overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#005A9E] via-[#006db5] to-[#004f87] px-5 py-4 text-white">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                  <Users className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="text-lg font-bold tracking-tight">{t('Status Kehadiran Realtime', 'Realtime Attendance Status')}</h3>
                  <p className="mt-1 text-sm text-blue-100/95">{t('Sinkronisasi langsung dari data absensi terbaru.', 'Live synchronized from latest attendance events.')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="team-date-filter"
                    className="flex min-h-5 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    {t('Tanggal tim', 'Team date')}
                  </label>
                  <input
                    id="team-date-filter"
                    type="date"
                    value={teamDateFilter}
                    onChange={(e) => setTeamDateFilter(e.target.value || todayStr())}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="team-dept-filter"
                    className="flex min-h-5 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    {t('Departemen', 'Department')}
                  </label>
                  <select
                    id="team-dept-filter"
                    value={teamDeptFilter}
                    onChange={(e) => setTeamDeptFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/20"
                  >
                    <option value="">{t('Semua Departemen', 'All Departments')}</option>
                    {activeDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Export CSV', 'Export CSV')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setExportDateStart(teamDateFilter);
                      setExportDateEnd(teamDateFilter);
                    }}
                    className="text-xs font-semibold text-[#005A9E] underline-offset-2 hover:underline"
                  >
                    {t('Samakan dengan tanggal tim', 'Match team date')}
                  </button>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-500">{t('Mulai', 'Start')}</span>
                      <input
                        type="date"
                        value={exportDateStart}
                        onChange={(e) => setExportDateStart(e.target.value || todayStr())}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-800 outline-none transition focus:border-[#005A9E] focus:bg-white focus:ring-2 focus:ring-[#005A9E]/15"
                        aria-label={t('Export mulai', 'Export start')}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-500">{t('Akhir', 'End')}</span>
                      <input
                        type="date"
                        value={exportDateEnd}
                        onChange={(e) => setExportDateEnd(e.target.value || todayStr())}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-800 outline-none transition focus:border-[#005A9E] focus:bg-white focus:ring-2 focus:ring-[#005A9E]/15"
                        aria-label={t('Export akhir', 'Export end')}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmExportOpen(true)}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#005A9E] px-5 text-sm font-semibold text-white shadow-md shadow-[#005A9E]/25 transition hover:bg-[#004880] active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    {t('Export CSV', 'Export CSV')}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Tampilan tabel', 'Table view')}</span>
                  <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setTeamTableMode('latest')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${teamTableMode === 'latest' ? 'bg-[#005A9E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('Terakhir per orang', 'Latest per person')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamTableMode('all')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${teamTableMode === 'all' ? 'bg-[#005A9E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('Semua tap hari ini', 'All taps this day')}
                    </button>
                  </div>
                  {teamTableMode === 'all' && (
                    <p className="mt-1.5 text-[11px] text-slate-400">{t('Maks. 500 event per tanggal.', 'Max 500 events per date.')}</p>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyAnomalies}
                    onChange={(e) => setOnlyAnomalies(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/30"
                  />
                  <span className="text-sm font-medium text-slate-700">{t('Hanya anomali', 'Only anomalies')}</span>
                </label>
              </div>

              {currentUser.role === 'superadmin' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3 text-sm text-rose-900">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <AlertTriangle className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-900">{t('Zona administratif', 'Administrative zone')}</p>
                      <p className="mt-0.5 text-xs text-rose-800/80">{t('Hapus permanen semua data absensi untuk tanggal tim yang dipilih. Tidak dapat dibatalkan.', 'Permanently deletes all attendance for the selected team date. Cannot be undone.')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    className="h-10 shrink-0 rounded-xl border-2 border-rose-300 bg-white px-4 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50"
                  >
                    {t('Hapus semua di tanggal ini', 'Delete all on this date')}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:grid-cols-3 lg:grid-cols-5 sm:px-5">
              {[
                { label: t('Check-in hari ini', 'Today check-ins'), value: checkinTodayCount, accent: 'border-l-emerald-500' },
                { label: t('Check-out hari ini', 'Today check-outs'), value: checkoutTodayCount, accent: 'border-l-blue-500' },
                { label: t('Baris tabel', 'Table rows'), value: teamDisplayRows.length, accent: 'border-l-slate-400' },
                { label: t('Flag anomali', 'Anomaly flags'), value: anomalyTodayCount, accent: 'border-l-amber-500' },
                { label: t('Pending review', 'Pending review'), value: pendingReviewCount, accent: 'border-l-violet-500' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className={`rounded-xl border border-slate-200 bg-slate-50/90 p-3 pl-3 shadow-sm ${kpi.accent} border-l-4`}
                >
                  <div className="text-[11px] font-medium leading-tight text-slate-500">{kpi.label}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{kpi.value}</div>
                </div>
              ))}
            </div>

            <div className="max-h-[320px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5">{t('Nama', 'Name')}</th>
                    <th className="px-3 py-2.5">{t('Waktu', 'Time')}</th>
                    <th className="px-3 py-2.5">{t('Status', 'Status')}</th>
                    <th className="px-3 py-2.5">GPS</th>
                    <th className="px-3 py-2.5">{t('Anomali', 'Anomaly')}</th>
                    <th className="px-3 py-2.5">Maps</th>
                    <th className="px-3 py-2.5">{t('Review', 'Review')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDisplayRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <ClipboardList className="h-7 w-7" aria-hidden />
                          </div>
                          <p className="text-sm font-semibold text-slate-600">{t('Belum ada data absensi tim', 'No team attendance data yet')}</p>
                          <p className="mt-1 max-w-sm text-xs text-slate-400">
                            {t(
                              'Ubah tanggal, departemen, atau matikan filter anomali untuk melihat data.',
                              'Change date, department, or turn off the anomaly filter to see data.',
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {teamDisplayRows.map((row) => (
                    <tr
                      key={row.entry.id}
                      ref={(el) => {
                        rowRefs.current[row.entry.id] = el;
                      }}
                      className={`border-t border-slate-100 transition-colors ${highlightEntryId === row.entry.id ? 'bg-amber-50 ring-1 ring-amber-300' : ''}`}
                    >
                      <td className="px-3 py-2 text-slate-700">
                        <div className="font-semibold">{row.entry.employeeName}</div>
                        <div className="text-xs text-slate-400">{row.entry.department || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{fmtDateTime(row.entry.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            row.entry.type === 'checkin'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {row.entry.type === 'checkin' ? 'Check-in' : 'Check-out'}
                        </span>
                        <span
                          className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            row.isOnline
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {row.isOnline ? t('Online', 'Online') : t('Offline', 'Offline')}
                        </span>
                        {getPunctualityDetail(row.entry) && (
                          <div className="mt-1 text-[10px] font-semibold text-amber-600">
                            {getPunctualityDetail(row.entry)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.entry.accuracyMeters}m · {row.entry.distanceFromCenterMeters ?? '-'}m</td>
                      <td className="px-3 py-2 text-xs">
                        {row.anomalyText ? (
                          <span
                            className={
                              row.isHighAnomaly
                                ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200'
                                : 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200'
                            }
                          >
                            {row.anomalyText}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={buildMapsHref(row.entry.latitude, row.entry.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 text-xs font-bold transition">
                            <ContentLucideIcon icon={MapIcon} size={12} variant="toolbar" />
                            {t('Buka Maps', 'Open Maps')}
                            <ContentLucideIcon icon={ExternalLink} size={11} variant="toolbar" />
                          </a>
                          <button
                            type="button"
                            onClick={() => copyCoordinates(row.entry.latitude, row.entry.longitude)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-800">
                            {t('Copy', 'Copy')}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {row.isAnomaly && row.entry.reviewStatus === 'pending' && canReviewAnomaly ? (
                          <div className="inline-flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewNoteDraft('');
                                setReviewModal({ entry: row.entry, decision: 'approved' });
                              }}
                              className="h-7 px-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition">
                              {t('Approve', 'Approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewNoteDraft('');
                                setReviewModal({ entry: row.entry, decision: 'rejected' });
                              }}
                              className="h-7 px-2 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 transition">
                              {t('Reject', 'Reject')}
                            </button>
                            {currentUser.role === 'superadmin' && (
                              <button
                                type="button"
                                onClick={() => requestDeleteAttendance(row.entry)}
                                className="h-7 px-2 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 transition">
                                {t('Delete', 'Delete')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              row.entry.reviewStatus === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : row.entry.reviewStatus === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                              {row.entry.reviewStatus === 'pending'
                                ? t('Pending', 'Pending')
                                : row.entry.reviewStatus === 'rejected'
                                  ? t('Rejected', 'Rejected')
                                  : t('Approved', 'Approved')}
                            </span>
                            {currentUser.role === 'superadmin' && (
                              <button
                                type="button"
                                onClick={() => requestDeleteAttendance(row.entry)}
                                className="h-7 px-2 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 transition">
                                {t('Delete', 'Delete')}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      {reviewModal && (
        <div
          className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 id="review-modal-title" className="font-bold text-slate-800">
                {reviewModal.decision === 'approved' ? t('Setujui anomali?', 'Approve anomaly?') : t('Tolak anomali?', 'Reject anomaly?')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{reviewModal.entry.employeeName}</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-600">{t('Catatan (opsional)', 'Note (optional)')}</label>
              <textarea
                value={reviewNoteDraft}
                onChange={(e) => setReviewNoteDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] resize-none placeholder:text-slate-400"
                placeholder={t('Alasan singkat…', 'Short reason…')}
              />
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReviewModal(null);
                  setReviewNoteDraft('');
                }}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                {t('Batal', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => void submitReviewModal()}
                className={`flex-1 h-11 rounded-xl text-white text-sm font-bold ${reviewModal.decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {t('Simpan', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmExportOpen}
        title={t('Export data absensi?', 'Export attendance data?')}
        msg={`${t('Rentang tanggal', 'Date range')}: ${exportDateStart} → ${exportDateEnd}. ${t(
          'File CSV memuat setiap baris absensi (bukan ringkasan), dengan filter departemen & anomali yang sama seperti di atas.\n\nLanjutkan export?',
          'The CSV includes each attendance row (not a summary), using the same department and anomaly filters as above.\n\nContinue export?',
        )}`}
        danger={false}
        onCancel={() => setConfirmExportOpen(false)}
        onOk={() => {
          doExportCsv();
          setConfirmExportOpen(false);
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('Hapus data absensi?', 'Delete attendance record?')}
        msg={deleteTarget
          ? `${deleteTarget.employeeName} · ${fmtDateTime(deleteTarget.createdAt)}\n\n${t('Data yang dihapus tidak dapat dikembalikan.', 'Deleted data cannot be recovered.')}`
          : t('Data yang dihapus tidak dapat dikembalikan.', 'Deleted data cannot be recovered.')}
        danger
        onCancel={() => {
          if (deletingAttendance) return;
          setDeleteTarget(null);
        }}
        onOk={() => { void doDeleteAttendance(); }}
      />
      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        title={t('Hapus semua data absensi di tanggal ini?', 'Delete all attendance data on this date?')}
        msg={`${teamDateFilter} · ${selectedDayEntries.length} ${t('data.\n\nAksi ini hanya untuk tahap develop dan tidak dapat dibatalkan.', 'records.\n\nThis is for development phase only and cannot be undone.')}`}
        danger
        onCancel={() => {
          if (deletingAttendance) return;
          setConfirmBulkDeleteOpen(false);
        }}
        onOk={() => { void doBulkDeleteByDate(); }}
      />
      </div>
    </div>
  );
}

