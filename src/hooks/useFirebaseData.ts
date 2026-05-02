import { useCallback, useEffect, useState } from 'react';
import { DataSnapshot, limitToLast, off, onValue, query, ref, remove, set } from 'firebase/database';
import { db } from '../services/firebase/client';
import { DEFAULT_ATTENDANCE_CENTER_LAT, DEFAULT_ATTENDANCE_CENTER_LNG, DEFAULT_ATTENDANCE_ENABLED, DEFAULT_ATTENDANCE_LOCK_ENABLED, DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS, DEFAULT_ATTENDANCE_RADIUS_METERS, DEFAULT_ATTENDANCE_SHIFT_ENFORCED, DEFAULT_ATTENDANCE_SHIFT_END, DEFAULT_ATTENDANCE_SHIFT_START, DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES, DEFAULT_AUTO_LOGOUT_MINUTES, DEFAULT_DATETIME_FORMAT, DEFAULT_DEPARTMENTS, DEFAULT_ICON_STYLE, DEFAULT_IZIN_CUTOFF_DAY, DEFAULT_IZIN_MAX_PER_PERIODE, DEFAULT_VISA_OPTIONS } from '../constants/appDefaults';
import type { AppConfig, AppUser, ApprovalRequest, AttendanceEntry, Employee, FATEntry, IzinEntry, LogEntry, OverseasEntry } from '../types';

const uid = (p = 'id') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function useFirebaseData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [overseas, setOverseas] = useState<OverseasEntry[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    companyName: 'PT Feen Marine',
    monthlyAccrualDays: 1,
    maxLeaveBalance: 12,
    autoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES,
    izinCutoffDay: DEFAULT_IZIN_CUTOFF_DAY,
    izinMaxPerPeriode: DEFAULT_IZIN_MAX_PER_PERIODE,
    attendanceEnabled: DEFAULT_ATTENDANCE_ENABLED,
    attendanceLockEnabled: DEFAULT_ATTENDANCE_LOCK_ENABLED,
    attendanceCenterLat: DEFAULT_ATTENDANCE_CENTER_LAT,
    attendanceCenterLng: DEFAULT_ATTENDANCE_CENTER_LNG,
    attendanceRadiusMeters: DEFAULT_ATTENDANCE_RADIUS_METERS,
    attendanceMinAccuracyMeters: DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS,
    attendanceShiftEnforced: DEFAULT_ATTENDANCE_SHIFT_ENFORCED,
    attendanceShiftStart: DEFAULT_ATTENDANCE_SHIFT_START,
    attendanceShiftEnd: DEFAULT_ATTENDANCE_SHIFT_END,
    attendanceShiftToleranceMinutes: DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES,
    dateTimeFormat: DEFAULT_DATETIME_FORMAT,
    departments: DEFAULT_DEPARTMENTS,
    visaOptions: [...DEFAULT_VISA_OPTIONS],
    iconStyle: DEFAULT_ICON_STYLE,
  });
  const [fatEntries, setFatEntries] = useState<FATEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [izinEntries, setIzinEntries] = useState<IzinEntry[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const empRef = ref(db, 'employees');
    const logRef = query(ref(db, 'logs'), limitToLast(500));
    const connRef = ref(db, '.info/connected');
    const ovsRef = ref(db, 'overseas');
    const usrRef = ref(db, 'appUsers');
    const cfgRef = ref(db, 'config');
    const fatRef = ref(db, 'fatEntries');
    const approvalsRef = ref(db, 'approvals');
    const izinRef = ref(db, 'izinEntries');
    const attendanceRef = query(ref(db, 'attendanceEntries'), limitToLast(1000));

    onValue(empRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, Employee> | null;
      if (data) setEmployees(Object.values(data).map((emp) => ({ ...emp, rencana: emp.rencana || 0 })));
      else setEmployees([]);
      setSyncing(false);
    }, () => { setSyncing(false); setOnline(false); });

    onValue(logRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, LogEntry> | null;
      setLogs(data ? Object.values(data).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 500) : []);
    });

    onValue(ovsRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, OverseasEntry> | null;
      if (!data) { setOverseas([]); return; }
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      const todayS = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
      const computed = Object.values(data).map((o) => {
        let status: OverseasEntry['status'];
        if (o.status === 'completed') status = 'completed';
        else if (o.tglMulai > todayS) status = 'upcoming';
        else if (o.tglSelesai < todayS) status = 'completed';
        else status = 'active';
        return { ...o, status };
      });
      setOverseas(computed.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });

    onValue(usrRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, AppUser> | null;
      setAppUsers(data ? Object.values(data) : []);
    });

    onValue(cfgRef, (snap: DataSnapshot) => {
      const data = snap.val() as AppConfig | null;
      if (data) {
        setConfig({
          ...data,
          izinCutoffDay: Math.min(28, Math.max(1, Math.floor(Number(data.izinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY)))),
          izinMaxPerPeriode: Math.max(1, Math.floor(Number(data.izinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE))),
          visaOptions: data.visaOptions && data.visaOptions.length ? data.visaOptions : [...DEFAULT_VISA_OPTIONS],
          iconStyle: data.iconStyle === 'vibrant' ? 'vibrant' : DEFAULT_ICON_STYLE,
          attendanceEnabled: !!data.attendanceEnabled,
          attendanceLockEnabled: data.attendanceLockEnabled !== false,
          attendanceCenterLat: Number.isFinite(Number(data.attendanceCenterLat)) ? Number(data.attendanceCenterLat) : DEFAULT_ATTENDANCE_CENTER_LAT,
          attendanceCenterLng: Number.isFinite(Number(data.attendanceCenterLng)) ? Number(data.attendanceCenterLng) : DEFAULT_ATTENDANCE_CENTER_LNG,
          attendanceRadiusMeters: Math.max(25, Math.floor(Number(data.attendanceRadiusMeters || DEFAULT_ATTENDANCE_RADIUS_METERS))),
          attendanceMinAccuracyMeters: Math.max(10, Math.floor(Number(data.attendanceMinAccuracyMeters || DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS))),
          attendanceShiftEnforced: !!data.attendanceShiftEnforced,
          attendanceShiftStart: typeof data.attendanceShiftStart === 'string' && /^\d{2}:\d{2}$/.test(data.attendanceShiftStart) ? data.attendanceShiftStart : DEFAULT_ATTENDANCE_SHIFT_START,
          attendanceShiftEnd: typeof data.attendanceShiftEnd === 'string' && /^\d{2}:\d{2}$/.test(data.attendanceShiftEnd) ? data.attendanceShiftEnd : DEFAULT_ATTENDANCE_SHIFT_END,
          attendanceShiftToleranceMinutes: Math.max(0, Math.min(180, Math.floor(Number(data.attendanceShiftToleranceMinutes || DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES)))),
          dateTimeFormat: data.dateTimeFormat === 'iso' ? 'iso' : DEFAULT_DATETIME_FORMAT,
        });
      }
    });

    onValue(fatRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, FATEntry> | null;
      setFatEntries(data ? Object.values(data).sort((a, b) => a.fatDateTime.localeCompare(b.fatDateTime)) : []);
    });

    onValue(approvalsRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, ApprovalRequest> | null;
      const list = data ? Object.values(data) : [];
      list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      setApprovals(list);
    });

    onValue(izinRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, IzinEntry> | null;
      setIzinEntries(data ? Object.values(data).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []);
    });

    onValue(attendanceRef, (snap: DataSnapshot) => {
      const data = snap.val() as Record<string, AttendanceEntry> | null;
      setAttendanceEntries(data ? Object.values(data).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []);
    });

    onValue(connRef, (snap: DataSnapshot) => setOnline(!!snap.val()));
    return () => { off(empRef); off(logRef); off(connRef); off(ovsRef); off(usrRef); off(cfgRef); off(fatRef); off(approvalsRef); off(izinRef); off(attendanceRef); };
  }, []);

  const fbSaveEmployee = useCallback(async (e: Employee) => set(ref(db, `employees/${e.id}`), { ...e, rencana: e.rencana || 0 }), []);
  const fbDeleteEmployee = useCallback(async (id: string) => remove(ref(db, `employees/${id}`)), []);
  const fbAddLog = useCallback(async (entry: Omit<LogEntry, 'id'>) => { const id = uid('log'); return set(ref(db, `logs/${id}`), { ...entry, id }); }, []);
  const fbClearLogs = useCallback(async () => remove(ref(db, 'logs')), []);
  const fbDeleteLog = useCallback(async (id: string) => remove(ref(db, `logs/${id}`)), []);
  const fbSaveOverseas = useCallback(async (o: OverseasEntry) => set(ref(db, `overseas/${o.id}`), o), []);
  const fbDeleteOverseas = useCallback(async (id: string) => remove(ref(db, `overseas/${id}`)), []);
  const fbSaveUser = useCallback(async (u: AppUser) => set(ref(db, `appUsers/${u.id}`), u), []);
  const fbDeleteUser = useCallback(async (id: string) => remove(ref(db, `appUsers/${id}`)), []);
  const fbSaveConfig = useCallback(async (c: AppConfig) => set(ref(db, 'config'), c), []);
  const fbSaveFAT = useCallback(async (f: FATEntry) => set(ref(db, `fatEntries/${f.id}`), f), []);
  const fbDeleteFAT = useCallback(async (id: string) => remove(ref(db, `fatEntries/${id}`)), []);
  const fbUpdateLog = useCallback(async (entry: LogEntry) => set(ref(db, `logs/${entry.id}`), entry), []);
  const fbSaveApproval = useCallback(async (a: ApprovalRequest) => set(ref(db, `approvals/${a.id}`), a), []);
  const fbSaveIzin = useCallback(async (iz: IzinEntry) => set(ref(db, `izinEntries/${iz.id}`), Object.fromEntries(Object.entries(iz).filter(([, v]) => v !== undefined))), []);
  const fbDeleteIzin = useCallback(async (id: string) => remove(ref(db, `izinEntries/${id}`)), []);
  const fbSaveAttendance = useCallback(async (entry: AttendanceEntry) => set(ref(db, `attendanceEntries/${entry.id}`), entry), []);
  const fbDeleteAttendance = useCallback(async (id: string) => remove(ref(db, `attendanceEntries/${id}`)), []);

  return {
    employees, logs, overseas, appUsers, config, fatEntries, approvals, izinEntries, attendanceEntries, syncing, online,
    fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs, fbDeleteLog,
    fbSaveOverseas, fbDeleteOverseas, fbSaveUser, fbDeleteUser, fbSaveConfig,
    fbSaveFAT, fbDeleteFAT, fbUpdateLog, fbSaveApproval, fbSaveIzin, fbDeleteIzin, fbSaveAttendance, fbDeleteAttendance,
  };
}
