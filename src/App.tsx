/**
 * PT Feen Marine — HR Management System v12.0
 * Firebase Realtime Database + Full Auth + Overseas Monitor + Auto Leave Accrual
 *
 * v11.0 Changes:
 * - Modul About diperbarui dengan ringkasan arsitektur, fitur inti, dan praktik operasional
 * - Versioning aplikasi diseragamkan ke v11.0 di seluruh UI
 * - Changelog dirapikan agar release notes lebih jelas dan mudah ditelusuri
 *
 * v10.1 Changes:
 * - Overseas: auto-compute status berdasarkan tanggal (upcoming/active/completed)
 * - Overseas: tombol "Konfirmasi Selesai" untuk mark done secara manual
 * - Dark Mode: coverage komprehensif — semua elemen/
 * - SHA-256 password hashing (upgrade dari XOR legacy hash)
 * - Ganti password sendiri tersedia untuk semua role
 * - Dark Mode (toggle + persist ke localStorage)
 * - Dashboard widgets: KPI cards, ring chart status cuti, overseas returners, low-leave alerts
 * - PWA Support: Service Worker + manifest + offline page + Install App button
 * - Firebase Security Rules: validasi struktur data di database.rules.json
 * - Mobile: Bottom nav, FAB, mobile card views, responsive layouts
 * - Login system with role-based access (Super Admin, Admin, Viewer)
 * - Auto logout after inactivity
 * - Leave quota auto-increment monthly based on contract date
 * - Overseas monitoring (Commissioning / Service)
 * - Configuration page
 * - Kalender Cuti & Overseas terintegrasi
 * - Dashboard Analytics (bar chart per departemen)
 * - Pencarian Global (karyawan + log + overseas)
 * - [FIXED] FAT Schedule - save button works properly
 * - [FIXED] Leave dashboard - separates used vs planned leave
 * - Professional UI/UX
 *
 * Install: npm install firebase
 */

import React, { Suspense, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { Icon } from '@iconify/react/offline';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Ellipsis,
  FileSpreadsheet,
  FlaskConical,
  Info,
  LayoutDashboard,
  MapPin,
  Plane,
  RotateCcw,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  X,
  Plus,
  ScrollText,
  ListChecks,
} from 'lucide-react';
import { ref, set } from 'firebase/database';
import { db } from './services/firebase/client';
import { useDarkMode } from './hooks/useDarkMode';
import { useClock } from './hooks/useClock';
import { useOnlineUsers } from './hooks/useOnlineUsers';
import { useHistoryLogState } from './hooks/useHistoryLogState';
import { useFirebaseData } from './hooks/useFirebaseData';
import type { RoutedPage } from './components/layout/MainContentRouter';
import { can, canConfirmOverseasCompletion, canEditEmployeeRecord, canEditOwnLeave, roleBadge, roleLabel } from './utils/permissions';
import { buildOverseasTotalDaysByName, countInclusiveDays, filterOverseasEntries } from './utils/overseas';
import { fmtDate, getWeekRange, nowTs, setDateTimeFormat, toISODate, todayStr, tsToMs, uid } from './utils/common';
import { hashPassword, legacyHash, verifyPassword } from './utils/auth';
import { appThemeStyles } from './styles/appThemeStyles';
import { DEFAULT_ANALYTICS_ENABLED, DEFAULT_ATTENDANCE_CENTER_LAT, DEFAULT_ATTENDANCE_CENTER_LNG, DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS, DEFAULT_ATTENDANCE_RADIUS_METERS, DEFAULT_ATTENDANCE_SHIFT_END, DEFAULT_ATTENDANCE_SHIFT_START, DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES, DEFAULT_AUTO_LOGOUT_MINUTES, DEFAULT_DATETIME_FORMAT, DEFAULT_DEPARTMENTS, DEFAULT_FAT_ENABLED, DEFAULT_ICON_STYLE, DEFAULT_IZIN_CUTOFF_DAY, DEFAULT_IZIN_MAX_PER_PERIODE, DEFAULT_TODO_ACTIVITY_ENABLED, DEFAULT_TODO_DARKMODE_ENABLED, DEFAULT_TODO_ENABLED, DEFAULT_TODO_KANBAN_ENABLED, DEFAULT_TODO_RECURRING_ENABLED, DEFAULT_TODO_REMINDER_ENABLED, DEFAULT_TODO_SUBTASK_ENABLED, DEFAULT_TODO_TASK_DELETE_CONFIRM_ENABLED, DEFAULT_VISA_OPTIONS } from './constants/appDefaults';
import {
  APP_BACKUP_PREFIX,
  APP_DEVELOPER_CREDIT,
  APP_FULL_VERSION,
  APP_LOCATION,
  APP_NAME,
  APP_VERSION,
} from './constants/appVersion';
import { I18nProvider } from './i18n/context';
import type {
  ActivePage,
  AppConfig,
  AppUser,
  ApprovalRequest,
  ChatMessage,
  Employee,
  FATEntry,
  IconStyle,
  DateTimeFormat,
  LogEntry,
  OnlineUser,
  OverseasEntry,
  SortCol,
  ToastKind,
  ToastItem,
  UserRole,
} from './types';

const LazyLoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LazyDashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MainContentRouter = React.lazy(() => import('./components/layout/MainContentRouter').then((m) => ({ default: m.MainContentRouter })));
const AppOverlays = React.lazy(() => import('./components/layout/AppOverlays').then((m) => ({ default: m.AppOverlays })));
const ConfirmDialog = React.lazy(() => import('./components/common/ConfirmDialog').then((m) => ({ default: m.ConfirmDialog })));
const ToastContainer = React.lazy(() => import('./components/common/Feedback').then((m) => ({ default: m.ToastContainer })));
const EditEmployeeDialog = React.lazy(() => import('./components/employee/EditEmployeeDialog').then((m) => ({ default: m.EditEmployeeDialog })));
const AddEmployeeModal = React.lazy(() => import('./components/employee/AddEmployeeModal').then((m) => ({ default: m.AddEmployeeModal })));
const CutiModal = React.lazy(() => import('./components/leave/CutiModal').then((m) => ({ default: m.CutiModal })));
const LeaveLogDialog = React.lazy(() => import('./components/leave/LeaveLogDialog').then((m) => ({ default: m.LeaveLogDialog })));
const OverseasDialog = React.lazy(() => import('./components/overseas/OverseasDialog').then((m) => ({ default: m.OverseasDialog })));
const FATDialog = React.lazy(() => import('./components/fat/FATDialog').then((m) => ({ default: m.FATDialog })));
const NotificationsPanel = React.lazy(() => import('./components/NotificationsPanel').then((m) => ({ default: m.NotificationsPanel })));
const OnlineUsersPanel = React.lazy(() => import('./components/OnlineUsersPanel').then((m) => ({ default: m.OnlineUsersPanel })));

/** Fluent Color (Iconify) — dipakai mode navigasi vibrant */
const FLUENT_NAV = {
  dashboard: 'fluent-color:building-home-20',
  leave: 'fluent-color:clipboard-20',
  izin: 'fluent-color:calendar-clock-20',
  history: 'fluent-color:document-text-20',
  overseas: 'fluent-color:globe-20',
  fat: 'fluent-color:table-20',
  calendar: 'fluent-color:calendar-20',
  analytics: 'fluent-color:data-trending-20',
  attendance: 'fluent-color:location-ripple-20',
  config: 'fluent-color:settings-20',
  usersTeam: 'fluent-color:people-team-20',
  usersPerson: 'fluent-color:person-20',
  approvals: 'fluent-color:checkmark-circle-20',
  about: 'fluent-color:question-circle-20',
  todo: 'fluent-color:task-list-ltr-20',
  more: 'fluent-color:chat-more-20',
} as const;

type FluentNavKey = keyof typeof FLUENT_NAV;

type PageErrorBoundaryProps = {
  activeKey: string;
  onReset: () => void;
  children: ReactNode;
};

type PageErrorBoundaryState = {
  hasError: boolean;
  errorMsg: string;
};

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(error: unknown): PageErrorBoundaryState {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  componentDidUpdate(prevProps: PageErrorBoundaryProps) {
    if (prevProps.activeKey !== this.props.activeKey && this.state.hasError) {
      this.setState({ hasError: false, errorMsg: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex-1 min-h-0 p-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white border border-red-200 rounded-2xl p-5 text-center">
          <h3 className="text-base font-bold text-red-700">Halaman gagal dimuat</h3>
          <p className="mt-1 text-sm text-slate-600">Terjadi error runtime pada halaman ini. Silakan kembali ke Dashboard atau coba lagi.</p>
          {this.state.errorMsg && <p className="mt-2 text-xs text-red-600 break-words">{this.state.errorMsg}</p>}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={this.props.onReset} className="h-9 px-3 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl text-xs font-bold transition">
              Kembali ke Dashboard
            </button>
            <button onClick={() => this.setState({ hasError: false, errorMsg: '' })} className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// ─── PWA SERVICE WORKER REGISTRATION ─────────────────────────────────────────
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[HRMS PWA] Service Worker registered:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Versi baru tersedia — bisa notifikasi user jika diperlukan
            console.log('[HRMS PWA] Update tersedia, refresh untuk memperbarui.');
          }
        });
      });
    }).catch((err) => {
      console.warn('[HRMS PWA] Service Worker gagal terdaftar:', err);
    });
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const calcWorkDuration = (tglKontrak?: string) => {
  if (!tglKontrak) return '-';
  const start = new Date(tglKontrak + 'T00:00:00');
  if (isNaN(start.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '-';
  if (years === 0 && months === 0) return '< 1 bulan';
  if (years === 0) return `${months} bulan`;
  if (months === 0) return `${years} tahun`;
  return `${years} th ${months} bln`;
};

// Kept untuk backward compat di tempat-tempat yang perlu sync — hanya dipakai untuk hash lama
const simpleHash = legacyHash;

// ─── FIREBASE HOOK ────────────────────────────────────────────────────────────

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const HRLeaveManagement: React.FC = () => {
  const { time, date } = useClock();
  const { dark, toggleDark } = useDarkMode();

  // ── PWA Install prompt ──────────────────────────────────────────────────
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const {
    employees, logs, overseas, appUsers, config, fatEntries, approvals, izinEntries, attendanceEntries, syncing, online,
    fbSaveEmployee, fbDeleteEmployee, fbAddLog, fbClearLogs, fbDeleteLog,
    fbSaveOverseas, fbDeleteOverseas, fbSaveUser, fbDeleteUser, fbSaveConfig,
    fbSaveFAT, fbDeleteFAT, fbUpdateLog, fbSaveApproval, fbSaveIzin, fbDeleteIzin, fbSaveAttendance, fbDeleteAttendance
  } = useFirebaseData();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('hrms_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as AppUser;
      if (!parsed?.id || !parsed?.username || !parsed?.role) return null;
      return parsed;
    } catch { return null; }
  });
  const {
    onlineUsers,
    notifications,
    chatMessages,
    unreadCount,
    showNotifPanel,
    setShowNotifPanel,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    deleteNotification,
    sendChatMessage,
    deleteChatMessage,
    clearGlobalChatMessages,
  } = useOnlineUsers(currentUser, nowTs, uid);

  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [approvalFocusId, setApprovalFocusId] = useState<string | null>(null);
  const [attendanceFocusDate, setAttendanceFocusDate] = useState<string | null>(null);
  const [attendanceFocusEntryId, setAttendanceFocusEntryId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<OnlineUser | null>(null);
  const [chatFabOpen, setChatFabOpen] = useState(false);
  const [chatFabSide, setChatFabSide] = useState<'left'|'right'>(() => {
    try {
      const saved = localStorage.getItem('hrms_chat_side');
      return saved === 'left' ? 'left' : 'right';
    } catch {
      return 'right';
    }
  });
  const [lastPersonalReadMs, setLastPersonalReadMs] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('hrms_chat_last_read_ms') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [language, setLanguage] = useState<'id'|'en'>(() => {
    try {
      const saved = localStorage.getItem('hrms_lang');
      return saved === 'en' ? 'en' : 'id';
    } catch {
      return 'id';
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    localStorage.setItem('hrms_chat_side', chatFabSide);
  }, [chatFabSide]);
  useEffect(() => {
    localStorage.setItem('hrms_chat_last_read_ms', String(lastPersonalReadMs));
  }, [lastPersonalReadMs]);
  useEffect(() => {
    localStorage.setItem('hrms_lang', language);
  }, [language]);
  const tr = useCallback((id: string, en: string) => language === 'id' ? id : en, [language]);

  const [selectedId, setSelectedId] = useState<string|null>(null);

  const [sortCol, setSortCol] = useState<SortCol>('nama');
  const [sortAsc, setSortAsc] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [ovsFilter, setOvsFilter] = useState('');
  const [ovsSearch, setOvsSearch] = useState('');

  const [globalSearch, setGlobalSearch] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const globalRef = useRef<HTMLDivElement>(null);

  const [statusTxt, setStatusTxt] = useState('● Siap');
  const stRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({x:0,y:0});
  const [ctxEmpId, setCtxEmpId] = useState<string|null>(null);

  const [confirm, setConfirm] = useState<{open:boolean;title:string;msg:string;danger:boolean;cb:(()=>void)|null}>({open:false,title:'',msg:'',danger:false,cb:null});
  const [editOpen, setEditOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee|null>(null);
  const [ovsOpen, setOvsOpen] = useState(false);
  const [ovsEntry, setOvsEntry] = useState<OverseasEntry|null>(null);
  const [fatOpen, setFatOpen] = useState(false);
  const [fatEntry, setFatEntry] = useState<FATEntry|null>(null);
  const [leaveLogOpen, setLeaveLogOpen] = useState(false);
  const [leaveLogEntry, setLeaveLogEntry] = useState<LogEntry|null>(null);
  const {
    logTab,
    setLogTab,
    leaveLogFilter,
    setLeaveLogFilter,
    handleHistSort,
    hArr,
  } = useHistoryLogState();

  const [cfgCompany, setCfgCompany] = useState(config.companyName);
  const [cfgAccrual, setCfgAccrual] = useState(config.monthlyAccrualDays);
  const [cfgMaxLeave, setCfgMaxLeave] = useState(config.maxLeaveBalance);
  const [cfgAutoLogout, setCfgAutoLogout] = useState(config.autoLogoutMinutes);
  const [cfgIzinCutoffDay, setCfgIzinCutoffDay] = useState(config.izinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY);
  const [cfgIzinMaxPerPeriode, setCfgIzinMaxPerPeriode] = useState(config.izinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE);
  const [cfgDepts, setCfgDepts] = useState(config.departments.join('\n'));
  const [cfgVisaOptions, setCfgVisaOptions] = useState((config.visaOptions && config.visaOptions.length ? config.visaOptions : [...DEFAULT_VISA_OPTIONS]).join('\n'));
  const [cfgAttendanceEnabled, setCfgAttendanceEnabled] = useState(!!config.attendanceEnabled);
  const [cfgAttendanceLockEnabled, setCfgAttendanceLockEnabled] = useState(config.attendanceLockEnabled !== false);
  const [cfgAttendanceCenterLat, setCfgAttendanceCenterLat] = useState(Number(config.attendanceCenterLat || DEFAULT_ATTENDANCE_CENTER_LAT));
  const [cfgAttendanceCenterLng, setCfgAttendanceCenterLng] = useState(Number(config.attendanceCenterLng || DEFAULT_ATTENDANCE_CENTER_LNG));
  const [cfgAttendanceRadiusMeters, setCfgAttendanceRadiusMeters] = useState(Math.max(25, Math.floor(config.attendanceRadiusMeters || DEFAULT_ATTENDANCE_RADIUS_METERS)));
  const [cfgAttendanceMinAccuracyMeters, setCfgAttendanceMinAccuracyMeters] = useState(Math.max(10, Math.floor(config.attendanceMinAccuracyMeters || DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS)));
  const [cfgAttendanceShiftEnforced, setCfgAttendanceShiftEnforced] = useState(!!config.attendanceShiftEnforced);
  const [cfgAttendanceShiftStart, setCfgAttendanceShiftStart] = useState(config.attendanceShiftStart || DEFAULT_ATTENDANCE_SHIFT_START);
  const [cfgAttendanceShiftEnd, setCfgAttendanceShiftEnd] = useState(config.attendanceShiftEnd || DEFAULT_ATTENDANCE_SHIFT_END);
  const [cfgAttendanceShiftToleranceMinutes, setCfgAttendanceShiftToleranceMinutes] = useState(Math.max(0, Math.min(180, Math.floor(config.attendanceShiftToleranceMinutes || DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES))));
  const [cfgDateTimeFormat, setCfgDateTimeFormat] = useState<DateTimeFormat>(config.dateTimeFormat === 'iso' ? 'iso' : DEFAULT_DATETIME_FORMAT);
  const [cfgIconStyle, setCfgIconStyle] = useState<IconStyle>(config.iconStyle === 'vibrant' ? 'vibrant' : DEFAULT_ICON_STYLE);
  const [cfgTodoEnabled, setCfgTodoEnabled] = useState(config.todoEnabled ?? DEFAULT_TODO_ENABLED);
  const [cfgTodoKanbanEnabled, setCfgTodoKanbanEnabled] = useState(config.todoKanbanEnabled ?? DEFAULT_TODO_KANBAN_ENABLED);
  const [cfgTodoSubtaskEnabled, setCfgTodoSubtaskEnabled] = useState(config.todoSubtaskEnabled ?? DEFAULT_TODO_SUBTASK_ENABLED);
  const [cfgTodoReminderEnabled, setCfgTodoReminderEnabled] = useState(config.todoReminderEnabled ?? DEFAULT_TODO_REMINDER_ENABLED);
  const [cfgTodoRecurringEnabled, setCfgTodoRecurringEnabled] = useState(config.todoRecurringEnabled ?? DEFAULT_TODO_RECURRING_ENABLED);
  const [cfgTodoActivityEnabled, setCfgTodoActivityEnabled] = useState(config.todoActivityEnabled ?? DEFAULT_TODO_ACTIVITY_ENABLED);
  const [cfgTodoDarkModeEnabled, setCfgTodoDarkModeEnabled] = useState(config.todoDarkModeEnabled ?? DEFAULT_TODO_DARKMODE_ENABLED);
  const [cfgTodoTaskDeleteConfirmEnabled, setCfgTodoTaskDeleteConfirmEnabled] = useState(config.todoTaskDeleteConfirmEnabled ?? DEFAULT_TODO_TASK_DELETE_CONFIRM_ENABLED);
  const [cfgFatEnabled, setCfgFatEnabled] = useState(config.fatEnabled ?? DEFAULT_FAT_ENABLED);
  const [cfgAnalyticsEnabled, setCfgAnalyticsEnabled] = useState(config.analyticsEnabled ?? DEFAULT_ANALYTICS_ENABLED);
  const [configSaving, setConfigSaving] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserDisplay, setNewUserDisplay] = useState('');
  const [newUserPw, setNewUserPw] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [newUserLinked, setNewUserLinked] = useState('');
  const [newUserFirebaseUid, setNewUserFirebaseUid] = useState('');
  const [newUserCanEditEmployeeData, setNewUserCanEditEmployeeData] = useState(false);

  // State untuk edit user
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserDisplay, setEditUserDisplay] = useState('');
  const [editUserPw, setEditUserPw] = useState('');
  const [showEditUserPw, setShowEditUserPw] = useState(false);
  const [editUserRole, setEditUserRole] = useState<UserRole>('viewer');
  const [editUserLinked, setEditUserLinked] = useState('');
  const [editUserFirebaseUid, setEditUserFirebaseUid] = useState('');
  const [editUserCanEditEmployeeData, setEditUserCanEditEmployeeData] = useState(false);

  // ─── Modal state for Tambah Karyawan & Pengambilan Cuti ───────────────────
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [cutiModalOpen, setCutiModalOpen] = useState(false);
  // ─── Online users panel visibility ───────────────────────────────────────
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  // ─── Change Own Password ──────────────────────────────────────────────────
  const [ownPwOld, setOwnPwOld] = useState('');
  const [ownPwNew, setOwnPwNew] = useState('');
  const [ownPwConfirm, setOwnPwConfirm] = useState('');
  const [ownPwLoading, setOwnPwLoading] = useState(false);
  const [showOwnPwOld, setShowOwnPwOld] = useState(false);
  const [showOwnPwNew, setShowOwnPwNew] = useState(false);
  const [showOwnPwConfirm, setShowOwnPwConfirm] = useState(false);
  const [showNewUserPw, setShowNewUserPw] = useState(false);
  const [ownVisaActive, setOwnVisaActive] = useState(false);
  const [ownVisaTypes, setOwnVisaTypes] = useState<string[]>([]);
  const [ownVisaSaving, setOwnVisaSaving] = useState(false);
  const ownEmployee = useMemo(() => {
    if (!currentUser?.linkedEmployeeName) return null;
    return employees.find(e => e.nama === currentUser.linkedEmployeeName) || null;
  }, [employees, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hrms_session', JSON.stringify(currentUser));
      if (!localStorage.getItem('hrms_loginTime')) {
        localStorage.setItem('hrms_loginTime', nowTs());
      }
    } else {
      localStorage.removeItem('hrms_session');
      localStorage.removeItem('hrms_loginTime');
    }
  }, [currentUser]);

  useEffect(() => {
    setCfgCompany(config.companyName);
    setCfgAccrual(config.monthlyAccrualDays);
    setCfgMaxLeave(config.maxLeaveBalance);
    setCfgAutoLogout(config.autoLogoutMinutes);
    setCfgIzinCutoffDay(config.izinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY);
    setCfgIzinMaxPerPeriode(config.izinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE);
    setCfgDepts(config.departments.join('\n'));
    setCfgVisaOptions((config.visaOptions && config.visaOptions.length ? config.visaOptions : [...DEFAULT_VISA_OPTIONS]).join('\n'));
    setCfgAttendanceEnabled(!!config.attendanceEnabled);
    setCfgAttendanceLockEnabled(config.attendanceLockEnabled !== false);
    setCfgAttendanceCenterLat(Number(config.attendanceCenterLat || DEFAULT_ATTENDANCE_CENTER_LAT));
    setCfgAttendanceCenterLng(Number(config.attendanceCenterLng || DEFAULT_ATTENDANCE_CENTER_LNG));
    setCfgAttendanceRadiusMeters(Math.max(25, Math.floor(config.attendanceRadiusMeters || DEFAULT_ATTENDANCE_RADIUS_METERS)));
    setCfgAttendanceMinAccuracyMeters(Math.max(10, Math.floor(config.attendanceMinAccuracyMeters || DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS)));
    setCfgAttendanceShiftEnforced(!!config.attendanceShiftEnforced);
    setCfgAttendanceShiftStart(config.attendanceShiftStart || DEFAULT_ATTENDANCE_SHIFT_START);
    setCfgAttendanceShiftEnd(config.attendanceShiftEnd || DEFAULT_ATTENDANCE_SHIFT_END);
    setCfgAttendanceShiftToleranceMinutes(Math.max(0, Math.min(180, Math.floor(config.attendanceShiftToleranceMinutes || DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES))));
    setCfgDateTimeFormat(config.dateTimeFormat === 'iso' ? 'iso' : DEFAULT_DATETIME_FORMAT);
    setCfgIconStyle(config.iconStyle === 'vibrant' ? 'vibrant' : DEFAULT_ICON_STYLE);
    setCfgTodoEnabled(config.todoEnabled ?? DEFAULT_TODO_ENABLED);
    setCfgTodoKanbanEnabled(config.todoKanbanEnabled ?? DEFAULT_TODO_KANBAN_ENABLED);
    setCfgTodoSubtaskEnabled(config.todoSubtaskEnabled ?? DEFAULT_TODO_SUBTASK_ENABLED);
    setCfgTodoReminderEnabled(config.todoReminderEnabled ?? DEFAULT_TODO_REMINDER_ENABLED);
    setCfgTodoRecurringEnabled(config.todoRecurringEnabled ?? DEFAULT_TODO_RECURRING_ENABLED);
    setCfgTodoActivityEnabled(config.todoActivityEnabled ?? DEFAULT_TODO_ACTIVITY_ENABLED);
    setCfgTodoDarkModeEnabled(config.todoDarkModeEnabled ?? DEFAULT_TODO_DARKMODE_ENABLED);
    setCfgTodoTaskDeleteConfirmEnabled(config.todoTaskDeleteConfirmEnabled ?? DEFAULT_TODO_TASK_DELETE_CONFIRM_ENABLED);
    setCfgFatEnabled(config.fatEnabled ?? DEFAULT_FAT_ENABLED);
    setCfgAnalyticsEnabled(config.analyticsEnabled ?? DEFAULT_ANALYTICS_ENABLED);
  }, [config]);

  useEffect(() => {
    setDateTimeFormat(config.dateTimeFormat === 'iso' ? 'iso' : DEFAULT_DATETIME_FORMAT);
  }, [config.dateTimeFormat]);

  useEffect(() => {
    if (!ownEmployee) {
      setOwnVisaActive(false);
      setOwnVisaTypes([]);
      return;
    }
    setOwnVisaActive(!!ownEmployee.visaActive);
    setOwnVisaTypes(ownEmployee.visaTypes || []);
  }, [ownEmployee]);

  useEffect(() => {
    if (!cfgAttendanceEnabled && activePage === 'attendance') {
      setActivePage('dashboard');
    }
  }, [cfgAttendanceEnabled, activePage]);

  useEffect(() => {
    if (!cfgTodoEnabled && activePage === 'todo') {
      setActivePage('dashboard');
    }
  }, [cfgTodoEnabled, activePage]);
  useEffect(() => {
    if (!cfgFatEnabled && activePage === 'fat') {
      setActivePage('dashboard');
    }
  }, [cfgFatEnabled, activePage]);
  useEffect(() => {
    if (!cfgAnalyticsEnabled && activePage === 'analytics') {
      setActivePage('dashboard');
    }
  }, [cfgAnalyticsEnabled, activePage]);

  useEffect(() => {
    if (syncing || !currentUser || appUsers.length === 0) return;
    const freshUser = appUsers.find(u => u.id === currentUser.id);
    if (!freshUser) {
      setCurrentUser(null);
    } else {
      setCurrentUser(prev => {
        if (!prev) return prev;
        return JSON.stringify(freshUser) !== JSON.stringify(prev) ? freshUser : prev;
      });
    }
  }, [appUsers.length, syncing]);

  const activityRef = useRef(Date.now());
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const resetActivity = useCallback(() => {
    activityRef.current = Date.now();
    setShowLogoutWarning(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (!currentUser) return;
    const mins = config.autoLogoutMinutes || DEFAULT_AUTO_LOGOUT_MINUTES;
    const warningAt = (mins - 2) * 60 * 1000;
    const logoutAt = mins * 60 * 1000;
    logoutTimerRef.current = setTimeout(() => setShowLogoutWarning(true), warningAt);
    setTimeout(() => {
      if (Date.now() - activityRef.current >= logoutAt) {
        setCurrentUser(null);
        setShowLogoutWarning(false);
      }
    }, logoutAt);
  }, [currentUser, config.autoLogoutMinutes]);

  useEffect(() => {
    if (!currentUser) return;
    const events = ['mousedown','mousemove','keydown','touchstart','scroll'];
    const handler = () => resetActivity();
    events.forEach(e => document.addEventListener(e, handler, {passive: true}));
    resetActivity();
    return () => { events.forEach(e => document.removeEventListener(e, handler)); if(logoutTimerRef.current) clearTimeout(logoutTimerRef.current); };
  }, [currentUser, resetActivity]);

  useEffect(() => {
    if (!employees.length || !currentUser || !can(currentUser.role, 'write')) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    employees.forEach(emp => {
      if (!emp.tglKontrak) return;
      const contractDate = new Date(emp.tglKontrak + 'T00:00:00');
      if (isNaN(contractDate.getTime())) return;
      const contractDay = contractDate.getDate();
      const today = now.getDate();
      if (today >= contractDay && emp.lastAccrualMonth !== currentMonth) {
        const monthsWorked = (now.getFullYear() - contractDate.getFullYear()) * 12 + (now.getMonth() - contractDate.getMonth());
        if (monthsWorked >= 1) {
          const newJatah = Math.min(emp.jatahAwal + config.monthlyAccrualDays, config.maxLeaveBalance);
          fbSaveEmployee({...emp, jatahAwal: newJatah, lastAccrualMonth: currentMonth}).then(() => {
            fbAddLog({
              timestamp: nowTs(), nama: emp.nama, departemen: emp.departemen,
              tglCuti: todayStr(),
              keterangan: `Auto Accrual Cuti +${config.monthlyAccrualDays} hari (Total: ${newJatah} hari)`,
              logType: 'activity'
            });
          });
        }
      }
    });
  }, [employees]);

  useEffect(() => {
    if (syncing) return;
    if (appUsers.length > 0) return;
    if (localStorage.getItem('adminCreated')) return;
    const defaultAdmin: AppUser = {
      id: uid('usr'), username: 'admin', passwordHash: simpleHash('admin123'),
      role: 'superadmin', displayName: 'Administrator', createdAt: nowTs()
    };
    fbSaveUser(defaultAdmin);
    localStorage.setItem('adminCreated', 'true');
  }, [syncing, appUsers.length, fbSaveUser]);

  // Update browser tab title based on active page
  useEffect(() => {
    const PAGE_LABELS: Record<string, string> = {
      dashboard: tr('Dashboard', 'Dashboard'),
      history: tr('Log Cuti', 'Leave Logs'),
      overseas: tr('Overseas', 'Overseas'),
      fat: tr('Jadwal FAT', 'FAT Schedule'),
      calendar: tr('Kalender', 'Calendar'),
      analytics: tr('Analitik', 'Analytics'),
      overseasSummary: tr('Ringkasan Overseas', 'Overseas Summary'),
      leave: tr('Manajemen Cuti', 'Leave Management'),
      izin: tr('Izin Terlambat/Pulang Cepat', 'Late/Early Permit'),
      attendance: tr('Absensi GPS', 'GPS Attendance'),
      todo: tr('To-Do List', 'To-Do List'),
      chat: tr('Chat', 'Chat'),
      config: tr('Konfigurasi', 'Configuration'),
      users: tr('Manajemen User', 'User Management'),
      approvals: tr('Approval', 'Approval'),
      about: 'About',
    };
    const pageLabel = PAGE_LABELS[activePage] || tr('Dashboard', 'Dashboard');
    document.title = `${pageLabel} — ${config.companyName} ${APP_NAME}`;
  }, [activePage, config.companyName, tr]);

  const toast = useCallback((msg: string, kind: ToastKind = 'success') => {
    const id = uid('t');
    setToasts(p => [...p, {id, msg, kind}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const personalIncoming = useMemo(() => {
    if (!currentUser) return [] as ChatMessage[];
    return chatMessages
      .filter(m => m.recipientId === currentUser.id && m.senderId !== currentUser.id)
      .sort((a,b) => tsToMs(a.timestamp) - tsToMs(b.timestamp));
  }, [chatMessages, currentUser]);
  const personalUnreadCount = useMemo(() => personalIncoming.filter(m => tsToMs(m.timestamp) > lastPersonalReadMs).length, [personalIncoming, lastPersonalReadMs]);
  const lastNotifiedPersonalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (chatFabOpen) {
      const newest = personalIncoming[personalIncoming.length - 1];
      if (newest) {
        setLastPersonalReadMs(Math.max(lastPersonalReadMs, tsToMs(newest.timestamp)));
      }
    }
  }, [chatFabOpen, personalIncoming, lastPersonalReadMs]);

  useEffect(() => {
    if (!personalIncoming.length) return;
    const newest = personalIncoming[personalIncoming.length - 1];
    if (!newest) return;
    if (!lastNotifiedPersonalIdRef.current) {
      lastNotifiedPersonalIdRef.current = newest.id;
      return;
    }
    if (newest.id === lastNotifiedPersonalIdRef.current) return;
    lastNotifiedPersonalIdRef.current = newest.id;
    if (chatFabOpen) return;

    // Lightweight beep notification for new personal chat
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.value = 0.03;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch { /* ignore audio failures */ }
    toast(`Pesan personal baru dari ${newest.senderName}`, 'info');
  }, [personalIncoming, chatFabOpen, toast]);

  const showConfirm = (title: string, msg: string, danger: boolean, cb: () => void) =>
    setConfirm({open:true,title,msg,danger,cb});

  const setStatus = (msg: string) => {
    if (stRef.current) clearTimeout(stRef.current);
    setStatusTxt(msg);
    stRef.current = setTimeout(() => setStatusTxt('● Siap'), 5000);
  };

  const handleSort = (c: SortCol) => { if(sortCol===c) setSortAsc(a=>!a); else {setSortCol(c);setSortAsc(true);} };
  const sArr = (c: SortCol) => sortCol===c?(sortAsc?' ↑':' ↓'):'';

  const activeDepts = config.departments.length > 0 ? config.departments : DEFAULT_DEPARTMENTS;
  const activeVisaOptions = (config.visaOptions && config.visaOptions.length ? config.visaOptions : [...DEFAULT_VISA_OPTIONS]);

  const selectedEmp = employees.find(e => e.id === selectedId) || null;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 2) return {emps:[], logs_:[], ovs:[]};
    const emps = employees.filter(e =>
      e.nama.toLowerCase().includes(q) || (e.posisi||'').toLowerCase().includes(q) || e.departemen.toLowerCase().includes(q)
    ).slice(0, 5);
    const logs_ = logs.filter(l =>
      l.nama.toLowerCase().includes(q) || l.keterangan.toLowerCase().includes(q)
    ).slice(0, 5);
    const ovs = overseas.filter(o =>
      o.nama.toLowerCase().includes(q) ||
      (o.projectType || '').toLowerCase().includes(q) ||
      o.projectNo.toLowerCase().includes(q) ||
      o.lokasi.toLowerCase().includes(q)
    ).slice(0, 5);
    return {emps, logs_, ovs};
  }, [globalSearch, employees, logs, overseas]);

  const stats = {
    total: employees.length,
    aman:  employees.filter(e => (e.jatahAwal - e.terpakai - (e.rencana || 0)) > 3).length,
    low:   employees.filter(e => {
      const sisa = e.jatahAwal - e.terpakai - (e.rencana || 0);
      return sisa > 0 && sisa <= 3;
    }).length,
    out:   employees.filter(e => (e.jatahAwal - e.terpakai - (e.rencana || 0)) <= 0).length,
    overseasActive: overseas.filter(o => o.status === 'active').length,
    fatUpcoming: fatEntries.filter((f) => new Date(f.fatDateTime) > new Date()).length,
  };

  const filteredEmps = employees
    .map(e => ({
      ...e, 
      sisa: e.jatahAwal - e.terpakai - (e.rencana || 0),
      rencana: e.rencana || 0
    }))
    .filter(e => (!deptFilter || e.departemen === deptFilter) && 
      (!searchQ || e.nama.toLowerCase().includes(searchQ.toLowerCase()) || 
       e.departemen.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a,b) => {
      const va = String((a as any)[sortCol]??'').toLowerCase();
      const vb = String((b as any)[sortCol]??'').toLowerCase();
      const na = parseFloat(va); const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na-nb : nb-na;
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const filteredOverseas = useMemo(
    () => filterOverseasEntries(overseas, ovsFilter, ovsSearch),
    [overseas, ovsFilter, ovsSearch],
  );

  const overseasTotalDaysByName = useMemo(
    () => buildOverseasTotalDaysByName(overseas),
    [overseas],
  );

  // Modal-based add employee
  const doSaveEmployeeFromModal = async (data: {nama:string;departemen:string;tglKontrak:string;jatahAwal:number;posisi:string;gender:'L'|'P'; visaActive?: boolean; visaTypes?: string[]}) => {
    if (currentUser?.role !== 'superadmin') { toast(tr('Hanya Super Admin yang dapat menambah karyawan baru.', 'Only Super Admin can add new employees.'), 'error'); return; }
    if (employees.find(e => e.nama.toLowerCase() === data.nama.toLowerCase())) {
      toast(`'${data.nama}' ${tr('sudah terdaftar!', 'is already registered!')}`, 'warning'); return;
    }
    const emp: Employee = { id: uid('emp'), ...data, terpakai: 0, rencana: 0 };
    await fbSaveEmployee(emp);
    await fbAddLog({timestamp:nowTs(), nama:emp.nama, departemen:emp.departemen, tglCuti:emp.tglKontrak, keterangan:`${tr('Karyawan baru ditambahkan', 'New employee added')} (${tr('Jatah', 'Quota')}: ${data.jatahAwal} ${tr('hari', 'days')}) ${tr('oleh', 'by')} ${currentUser?.displayName}`, logType:'activity'});
    setStatus(`✓ '${emp.nama}' ditambahkan.`);
    toast(`'${emp.nama}' — ${emp.departemen} ${tr('berhasil ditambahkan.', 'added successfully.')}`);
    setAddEmpOpen(false);
  };

  // Modal-based log cuti
  const doLogCutiFromModal = (empId: string, mulai: string, selesai: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) { toast(tr('Karyawan tidak ditemukan!', 'Employee not found!'), 'error'); return; }
    if (currentUser?.role === 'admin') {
      if (!currentUser.linkedEmployeeName || emp.nama !== currentUser.linkedEmployeeName) {
        toast(tr('Admin hanya dapat mencatat cuti untuk data dirinya sendiri.', 'Admin can only log leave for their own linked employee.'), 'error');
        return;
      }
    }
    if (!canEditOwnLeave(currentUser, emp.nama)) { toast(tr('Anda hanya dapat mencatat cuti milik Anda sendiri.', 'You can only log your own leave.'), 'error'); return; }
    const sisaSaatIni = emp.jatahAwal - emp.terpakai - (emp.rencana || 0);
    const days = countInclusiveDays(mulai, selesai);
    if (days <= 0) { toast(tr('Tanggal tidak valid!', 'Invalid date!'), 'error'); return; }
    if (days > sisaSaatIni) { toast(`${tr('Jatah tidak cukup! Butuh', 'Quota is not enough! Need')} ${days} ${tr('hari, sisa', 'days, remaining')} ${sisaSaatIni}.`, 'error'); return; }
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const isPast = new Date(mulai + 'T00:00:00') <= todayDate;
    const statusText = isPast ? tr('Cuti Terpakai', 'Used Leave') : tr('Cuti Rencana', 'Planned Leave');
    const tglCutiValue = mulai === selesai ? mulai : `${mulai} s/d ${selesai}`;
    showConfirm(tr('Konfirmasi Cuti', 'Leave Confirmation'),
      `${isPast ? tr('Catat cuti yang sudah diambil', 'Record already used leave') : tr('Catat rencana cuti', 'Record planned leave')} ${tr('untuk', 'for')}:\n${emp.nama} · ${emp.departemen}\n${tr('Tanggal', 'Date')}: ${mulai === selesai ? fmtDate(mulai) : `${fmtDate(mulai)} s/d ${fmtDate(selesai)}`}\n${tr('Durasi', 'Duration')}: ${days} ${tr('hari', 'days')}`,
      false, async () => {
        if (isPast) await fbSaveEmployee({...emp, terpakai: emp.terpakai + days});
        else await fbSaveEmployee({...emp, rencana: (emp.rencana||0) + days});
        const ket = days === 1 ? `${statusText} 1 ${tr('Hari', 'Day')} (${mulai})` : `${statusText} ${days} ${tr('Hari', 'Days')} (${mulai} s/d ${selesai})`;
        await fbAddLog({
          timestamp: nowTs(), nama: emp.nama, departemen: emp.departemen,
          tglCuti: tglCutiValue, keterangan: ket,
          status: isPast ? 'used' : 'planned', logType: 'leave',
          leaveStatus: isPast ? 'completed' : 'planned', days,
          createdBy: currentUser?.displayName
        });
        setStatus(`✓ ${statusText} ${emp.nama} (${days} hari) dicatat.`);
        toast(`${statusText} '${emp.nama}' ${days} ${tr('hari berhasil dicatat.', 'days recorded successfully.')}`);
        setCutiModalOpen(false);
      });
  };

  const doResetJatah = (id: string) => {
    const emp = employees.find(e => e.id === id); if (!emp) return;
    if (!canEditEmployeeRecord(currentUser, emp.nama)) { toast(tr('Anda hanya dapat mengubah jatah cuti karyawan yang terhubung dengan akun Anda.', 'You can only edit leave quota for employees linked to your account.'), 'error'); return; }
    showConfirm(tr('Reset Jatah Cuti', 'Reset Leave Quota'),
      `${tr('Reset jatah cuti', 'Reset leave quota')} '${emp.nama}'\n${tr('Terpakai', 'Used')} → 0 ${tr('hari', 'days')}\n${tr('Rencana', 'Planned')} → 0 ${tr('hari', 'days')}\n\n${tr('Aksi ini akan dicatat di log.', 'This action will be logged.')}`,
      false, async () => {
        await fbSaveEmployee({...emp, terpakai: 0, rencana: 0});
        await fbAddLog({
          timestamp: nowTs(), 
          nama: emp.nama, 
          departemen: emp.departemen, 
          tglCuti: todayStr(), 
          keterangan: `${tr('Reset Jatah Cuti', 'Reset Leave Quota')} → ${tr('Terpakai', 'Used')} 0, ${tr('Rencana', 'Planned')} 0 ${tr('hari', 'days')}`,
          status: 'used',
          logType: 'activity'
        });
        setStatus(`${tr('Jatah cuti', 'Leave quota')} '${emp.nama}' ${tr('direset.', 'reset.')}`);
        toast(`${tr('Jatah cuti', 'Leave quota')} '${emp.nama}' ${tr('berhasil direset.', 'reset successfully.')}`);
      });
  };

  const doDelete = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { toast(tr('Anda tidak punya izin untuk menghapus.', 'You do not have permission to delete.'), 'error'); return; }
    const emp = employees.find(e => e.id === id); if (!emp) return;
    showConfirm(tr('Hapus Karyawan', 'Delete Employee'), `${tr('Data', 'Data')} '${emp.nama}' ${tr('akan dihapus permanen.', 'will be deleted permanently.')}\n${tr('Lanjutkan?', 'Continue?')}`, true, async () => {
      await fbDeleteEmployee(id);
      setSelectedId(null);
      setStatus(`✕ Data '${emp.nama}' dihapus.`);
      toast(`${tr('Karyawan', 'Employee')} '${emp.nama}' ${tr('dihapus.', 'deleted.')}`, 'warning');
    });
  };

  const doOpenEdit = (id: string) => {
    const emp = employees.find(e => e.id === id); if (!emp) return;
    if (!canEditEmployeeRecord(currentUser, emp.nama)) { toast(tr('Anda hanya dapat mengedit data karyawan yang terhubung dengan akun Anda.', 'You can only edit employee data linked to your account.'), 'error'); return; }
    setEditEmp(emp); setEditOpen(true);
  };

  const doSaveEdit = async (data: Partial<Employee>) => {
    if (!editEmp) return;
    if (!currentUser) return;
    if (!canEditEmployeeRecord(currentUser, editEmp.nama)) { toast(tr('Anda hanya dapat mengubah data karyawan yang terhubung dengan akun Anda.', 'You can only update employee data linked to your account.'), 'error'); return; }

    const updated = {...editEmp, ...data};
    await fbSaveEmployee(updated);
    await fbAddLog({timestamp:nowTs(), nama:updated.nama, departemen:updated.departemen, tglCuti:todayStr(), keterangan:`${tr('Data karyawan diperbarui oleh', 'Employee data updated by')} ${currentUser?.displayName}`, logType:'activity'});
    setStatus(`✓ Data '${data.nama}' diperbarui.`);
    toast(`${tr('Data', 'Data')} '${data.nama}' ${tr('diperbarui.', 'updated.')}`);
    setEditOpen(false); setEditEmp(null);
  };

  const doExportCSV = () => {
    if (currentUser.role !== 'superadmin') {
      toast(tr('Akses ditolak.', 'Access denied.'), 'error');
      return;
    }
    showConfirm(tr('Konfirmasi Export CSV', 'CSV Export Confirmation'), `${tr('Export data karyawan ke file CSV?', 'Export employee data to CSV file?')}\n${tr('Lanjutkan?', 'Continue?')}`, false, () => {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let csv = `${tr('Nama', 'Name')},${tr('Posisi', 'Position')},${tr('Departemen', 'Department')},${tr('Tgl_Kontrak', 'Contract_Date')},${tr('Jatah_Awal', 'Initial_Quota')},${tr('Terpakai', 'Used')},${tr('Rencana', 'Planned')},${tr('Sisa', 'Remaining')}\n`;
      employees.forEach((e) => {
        const sisa = e.jatahAwal - e.terpakai - (e.rencana || 0);
        csv += `"${e.nama}","${e.posisi || ''}","${e.departemen}","${e.tglKontrak}",${e.jatahAwal},${e.terpakai},${e.rencana || 0},${sisa}\n`;
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `export_cuti_feenmarine_${ts}.csv`;
      a.click();
      toast(tr('Ekspor CSV berhasil!', 'CSV export successful!'));
    });
  };

  const parseCsvRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out.map((v) => v.replace(/^"(.*)"$/, '$1').trim());
  };

  const doDownloadEmployeesCsvTemplate = () => {
    showConfirm(
      tr('Unduh Template CSV', 'Download CSV Template'),
      `${tr('Unduh file template CSV untuk import karyawan massal?', 'Download CSV template file for bulk employee import?')}\n${tr('Lanjutkan?', 'Continue?')}`,
      false,
      () => {
        const header = 'nama,posisi,departemen,tglKontrak,jatahAwal,gender,visaActive,visaTypes';
        const sample1 = '"Budi Santoso","Automation Engineer","Electrical & Automation","2024-01-15",12,"L",false,""';
        const sample2 = '"Siti Rahmawati","Project Admin","Project Management","2023-10-01",14,"P",true,"B1/B2, C1/D"';
        const csv = `${header}\n${sample1}\n${sample2}\n`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `template_import_karyawan_${todayStr()}.csv`;
        a.click();
        toast(tr('Template CSV berhasil diunduh.', 'CSV template downloaded successfully.'));
      },
    );
  };

  const doImportEmployeesCsvFile = async (file: File) => {
    if (currentUser?.role !== 'superadmin') {
      toast(tr('Hanya Super Admin yang dapat import karyawan.', 'Only Super Admin can import employees.'), 'error');
      return;
    }
    const raw = await file.text();
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      toast(tr('File CSV kosong atau tidak valid.', 'CSV file is empty or invalid.'), 'error');
      return;
    }

    const header = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
    const idx = {
      nama: header.indexOf('nama'),
      posisi: header.indexOf('posisi'),
      departemen: header.indexOf('departemen'),
      tglKontrak: header.indexOf('tglkontrak'),
      jatahAwal: header.indexOf('jatahawal'),
      gender: header.indexOf('gender'),
      visaActive: header.indexOf('visaactive'),
      visaTypes: header.indexOf('visatypes'),
    };
    if (idx.nama < 0 || idx.departemen < 0 || idx.tglKontrak < 0 || idx.jatahAwal < 0 || idx.gender < 0) {
      toast(tr('Header CSV tidak sesuai template. Silakan unduh template CSV.', 'CSV header does not match template. Please download CSV template.'), 'error');
      return;
    }

    const existingNames = new Set(employees.map((e) => e.nama.toLowerCase()));
    const validRows: Employee[] = [];
    let skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      const nama = (cols[idx.nama] || '').trim();
      const departemen = (cols[idx.departemen] || '').trim();
      const tglKontrak = (cols[idx.tglKontrak] || '').trim();
      const jatahAwal = Number(cols[idx.jatahAwal] || 0);
      const genderRaw = (cols[idx.gender] || '').trim().toUpperCase();
      const posisi = idx.posisi >= 0 ? (cols[idx.posisi] || '').trim() : '';
      const visaActiveRaw = idx.visaActive >= 0 ? (cols[idx.visaActive] || '').trim().toLowerCase() : 'false';
      const visaTypesRaw = idx.visaTypes >= 0 ? (cols[idx.visaTypes] || '').trim() : '';
      const gender: 'L' | 'P' | null = genderRaw === 'L' || genderRaw === 'P' ? (genderRaw as 'L' | 'P') : null;
      if (!nama || !departemen || !tglKontrak || Number.isNaN(jatahAwal) || jatahAwal < 0 || !gender) {
        skipped++;
        continue;
      }
      if (existingNames.has(nama.toLowerCase()) || validRows.some((v) => v.nama.toLowerCase() === nama.toLowerCase())) {
        skipped++;
        continue;
      }
      const visaActive = visaActiveRaw === 'true' || visaActiveRaw === '1' || visaActiveRaw === 'yes';
      const visaTypes = visaTypesRaw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      validRows.push({
        id: uid('emp'),
        nama,
        posisi,
        departemen,
        tglKontrak,
        jatahAwal: Math.floor(jatahAwal),
        terpakai: 0,
        rencana: 0,
        gender,
        visaActive,
        visaTypes,
      });
    }

    if (validRows.length === 0) {
      toast(tr('Tidak ada data valid untuk diimport.', 'No valid data to import.'), 'warning');
      return;
    }

    showConfirm(
      tr('Konfirmasi Import Karyawan', 'Employee Import Confirmation'),
      `${tr('File', 'File')}: ${file.name}\n${tr('Data valid', 'Valid rows')}: ${validRows.length}\n${tr('Dilewati', 'Skipped')}: ${skipped}\n\n${tr('Lanjutkan import?', 'Continue import?')}`,
      false,
      async () => {
        await Promise.all(validRows.map((emp) => fbSaveEmployee(emp)));
        await fbAddLog({
          timestamp: nowTs(),
          nama: currentUser?.displayName || 'system',
          departemen: 'System',
          tglCuti: todayStr(),
          keterangan: `${tr('Import CSV karyawan', 'Employee CSV import')}: ${validRows.length} ${tr('data baru ditambahkan', 'new rows added')}`,
          logType: 'activity',
        });
        setStatus(`✓ ${validRows.length} ${tr('karyawan berhasil diimport.', 'employees imported successfully.')}`);
        toast(`${validRows.length} ${tr('karyawan berhasil diimport.', 'employees imported successfully.')}`, 'success');
        if (skipped > 0) {
          toast(`${skipped} ${tr('baris dilewati karena tidak valid/duplikat.', 'rows skipped due to invalid/duplicate data.')}`, 'info');
        }
      },
    );
  };

  const doPickImportEmployeesCsv = () => {
    if (currentUser?.role !== 'superadmin') {
      toast(tr('Hanya Super Admin yang dapat import karyawan.', 'Only Super Admin can import employees.'), 'error');
      return;
    }
    showConfirm(
      tr('Pilih File CSV', 'Choose CSV File'),
      `${tr('Pilih file CSV dari perangkat Anda (komputer/HP) untuk import karyawan massal.', 'Choose CSV file from your device (computer/phone) for bulk employee import.')}\n${tr('Lanjutkan?', 'Continue?')}`,
      false,
      () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,text/csv';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            await doImportEmployeesCsvFile(file);
          } catch (err: any) {
            toast(`${tr('Import CSV gagal', 'CSV import failed')}: ${err?.message || String(err)}`, 'error');
          }
        };
        input.click();
      },
    );
  };

  const doClearHistory = () => showConfirm(tr('Bersihkan History', 'Clear History'), `${tr('Semua log aktivitas akan dihapus permanen.', 'All activity logs will be permanently deleted.')}\n${tr('Lanjutkan?', 'Continue?')}`, true, async () => {
    await fbClearLogs();
    toast(tr('Semua log history dihapus.', 'All history logs deleted.'), 'info');
  });

  const doClearGlobalChat = async () => {
    if (currentUser?.role !== 'superadmin') {
      toast(tr('Hanya Super Admin yang dapat clear pesan global.', 'Only Super Admin can clear global messages.'), 'error');
      return;
    }
    showConfirm(
      tr('Clear Pesan Global', 'Clear Global Messages'),
      `${tr('Hapus semua pesan chat global? Pesan personal tidak akan terhapus.', 'Delete all global chat messages? Personal messages will not be deleted.')}\n${tr('Lanjutkan?', 'Continue?')}`,
      true,
      async () => {
        const removed = await clearGlobalChatMessages();
        toast(removed > 0 ? `${removed} ${tr('pesan global berhasil dihapus.', 'global messages deleted successfully.')}` : tr('Tidak ada pesan global untuk dihapus.', 'No global messages to delete.'), removed > 0 ? 'warning' : 'info');
      },
    );
  };

  const doSaveOverseas = async (data: Omit<OverseasEntry,'id'|'createdAt'|'createdBy'>) => {
    if (!currentUser) return;
    if (ovsEntry) {
      await fbSaveOverseas({...ovsEntry, ...data});
      await fbAddLog({
        timestamp: nowTs(),
        nama: data.nama,
        departemen: data.departemen,
        tglCuti: data.tglMulai === data.tglSelesai ? data.tglMulai : `${data.tglMulai} s/d ${data.tglSelesai}`,
        keterangan: `${tr('Overseas diperbarui oleh', 'Overseas updated by')} ${currentUser.displayName}: ${data.projectType || '-'} · ${data.projectNo} · ${data.lokasi} (${data.status})`,
        logType: 'activity'
      });
      toast(tr('Data overseas diperbarui.', 'Overseas data updated.'));
    } else {
      const entry: OverseasEntry = {id:uid('ovs'), ...data, createdAt:nowTs(), createdBy:currentUser.displayName};
      await fbSaveOverseas(entry);
      await fbAddLog({
        timestamp: nowTs(),
        nama: data.nama,
        departemen: data.departemen,
        tglCuti: data.tglMulai === data.tglSelesai ? data.tglMulai : `${data.tglMulai} s/d ${data.tglSelesai}`,
        keterangan: `${tr('Overseas ditambahkan oleh', 'Overseas added by')} ${currentUser.displayName}: ${data.projectType || '-'} · ${data.projectNo} · ${data.lokasi} (${data.status})`,
        logType: 'activity'
      });
      toast(`Overseas '${data.projectNo}' ${tr('ditambahkan.', 'added.')}`);
    }
    setOvsOpen(false); setOvsEntry(null);
  };

  const doDeleteOverseas = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { toast(tr('Anda tidak punya izin.', 'You do not have permission.'), 'error'); return; }
    const o = overseas.find(x => x.id === id); if (!o) return;
    showConfirm(tr('Hapus Overseas', 'Delete Overseas'), `${tr('Hapus record', 'Delete record')} '${o.projectNo}' ${tr('untuk', 'for')} '${o.nama}'?`, true, async () => {
      await fbDeleteOverseas(id);
      await fbAddLog({
        timestamp: nowTs(),
        nama: o.nama,
        departemen: o.departemen,
        tglCuti: o.tglMulai === o.tglSelesai ? o.tglMulai : `${o.tglMulai} s/d ${o.tglSelesai}`,
        keterangan: `${tr('Overseas dihapus oleh', 'Overseas deleted by')} ${currentUser?.displayName}: ${o.projectType || '-'} · ${o.projectNo} · ${o.lokasi} (${o.status})`,
        logType: 'activity'
      });
      toast(`${tr('Record overseas', 'Overseas record')} '${o.projectNo}' ${tr('dihapus.', 'deleted.')}`, 'warning');
    });
  };

  const doMarkOverseasDone = (id: string) => {
    const o = overseas.find(x => x.id === id); if (!o) return;
    if (!canConfirmOverseasCompletion(currentUser, o.nama)) {
      toast(tr('Hanya Super Admin atau karyawan yang bersangkutan (bukan Admin) yang dapat mengonfirmasi selesai.', 'Only Super Admin or the employee on this trip can confirm completion. Admins cannot.'), 'error');
      return;
    }
    if (o.status === 'completed') { toast(tr('Status sudah Selesai.', 'Status is already completed.'), 'warning'); return; }
    const todayS = todayStr();
    showConfirm(
      tr('Konfirmasi Selesai', 'Completion Confirmation'),
      `${tr('Tandai overseas', 'Mark overseas')} '${o.projectNo}' (${o.nama}) ${tr('sebagai Selesai hari ini?', 'as completed today?')}\n\n${tr('Tanggal selesai akan diperbarui ke', 'End date will be updated to')} ${todayS} ${tr('jika tanggal kembali masih di masa depan.', 'if return date is still in the future.')}`,
      false,
      async () => {
        // Jika tglSelesai masih di masa depan, update ke hari ini
        const newTglSelesai = o.tglSelesai > todayS ? todayS : o.tglSelesai;
        const updated: OverseasEntry = { ...o, status: 'completed', tglSelesai: newTglSelesai };
        await fbSaveOverseas(updated);
        await fbAddLog({
          timestamp: nowTs(),
          nama: o.nama,
          departemen: o.departemen,
          tglCuti: `${o.tglMulai} s/d ${newTglSelesai}`,
          keterangan: `${tr('Overseas dikonfirmasi selesai oleh', 'Overseas completion confirmed by')} ${currentUser?.displayName}: ${o.projectType || '-'} · ${o.projectNo} · ${o.lokasi}`,
          logType: 'activity'
        });
        toast(`Overseas '${o.projectNo}' ${tr('ditandai selesai.', 'marked as completed.')}`);
      }
    );
  };

  const doSaveFAT = async (data: Omit<FATEntry,'id'|'createdAt'|'createdBy'>) => {
    if (!currentUser) {
      toast(tr('Anda harus login terlebih dahulu.', 'You must login first.'), 'error');
      return;
    }
    try {
      if (fatEntry) {
        await fbSaveFAT({...fatEntry, ...data});
        const empDept = employees.find(e => e.nama === data.assignedTo)?.departemen || 'Electrical & Automation';
        await fbAddLog({
          timestamp: nowTs(),
          nama: data.assignedTo,
          departemen: empDept,
          tglCuti: (data.fatDateTime || '').slice(0,10) || todayStr(),
          keterangan: `${tr('Jadwal FAT diperbarui oleh', 'FAT schedule updated by')} ${currentUser.displayName}: ${data.projectType || '-'} · ${data.projectNo} · ${data.fatClass} (${data.fatDateTime})`,
          logType: 'activity'
        });
        toast(tr('Jadwal FAT berhasil diperbarui.', 'FAT schedule updated successfully.'));
      } else {
        const entry: FATEntry = {
          id: uid('fat'), 
          ...data, 
          createdAt: nowTs(), 
          createdBy: currentUser.displayName
        };
        await fbSaveFAT(entry);
        const empDept = employees.find(e => e.nama === data.assignedTo)?.departemen || 'Electrical & Automation';
        await fbAddLog({
          timestamp: nowTs(),
          nama: data.assignedTo,
          departemen: empDept,
          tglCuti: (data.fatDateTime || '').slice(0,10) || todayStr(),
          keterangan: `${tr('Jadwal FAT ditambahkan oleh', 'FAT schedule added by')} ${currentUser.displayName}: ${data.projectType || '-'} · ${data.projectNo} · ${data.fatClass} (${data.fatDateTime})`,
          logType: 'activity'
        });
        toast(`${tr('Jadwal FAT', 'FAT schedule')} '${data.projectNo}' ${tr('untuk', 'for')} ${data.assignedTo} ${tr('berhasil ditambahkan.', 'added successfully.')}`);
      }
      setFatOpen(false); 
      setFatEntry(null);
    } catch (error) {
      console.error('Error saving FAT:', error);
      toast(tr('Gagal menyimpan jadwal FAT. Silakan coba lagi.', 'Failed to save FAT schedule. Please try again.'), 'error');
    }
  };

  const doDeleteFAT = (id: string) => {
    if (!can(currentUser?.role || null, 'delete')) { 
      toast(tr('Anda tidak memiliki izin untuk menghapus.', 'You do not have permission to delete.'), 'error');
      return; 
    }
    const f = fatEntries.find(x => x.id === id); 
    if (!f) return;
    
    showConfirm(
      tr('Hapus Jadwal FAT', 'Delete FAT Schedule'),
      `${tr('Apakah Anda yakin ingin menghapus jadwal FAT untuk proyek', 'Are you sure you want to delete FAT schedule for project')} '${f.projectNo}'?\n\nAssigned To: ${f.assignedTo}\nClass: ${f.fatClass}\n${tr('Waktu', 'Time')}: ${f.fatDateTime}`,
      true, 
      async () => {
        try {
          await fbDeleteFAT(id);
          await fbAddLog({
            timestamp: nowTs(),
            nama: f.assignedTo,
            departemen: employees.find(e => e.nama === f.assignedTo)?.departemen || 'Electrical & Automation',
            tglCuti: (f.fatDateTime || '').slice(0,10) || todayStr(),
            keterangan: `${tr('Jadwal FAT dihapus oleh', 'FAT schedule deleted by')} ${currentUser?.displayName}: ${f.projectType || '-'} · ${f.projectNo} · ${f.fatClass} (${f.fatDateTime})`,
            logType: 'activity'
          });
          toast(`${tr('Jadwal FAT', 'FAT schedule')} '${f.projectNo}' ${tr('berhasil dihapus.', 'deleted successfully.')}`, 'warning');
        } catch (error) {
          console.error('Error deleting FAT:', error);
          toast(tr('Gagal menghapus jadwal FAT.', 'Failed to delete FAT schedule.'), 'error');
        }
      }
    );
  };

  const doManageLeaveLog = async (updated: LogEntry, emp: Employee | null, action: 'revise' | 'cancel') => {
    if (!canEditOwnLeave(currentUser, updated.nama)) { toast(tr('Anda tidak punya izin.', 'You do not have permission.'), 'error'); return; }
    const origLog = logs.find(l => l.id === updated.id);
    if (!origLog) { toast(tr('Log tidak ditemukan.', 'Log not found.'), 'error'); return; }

    if (action === 'revise' && emp) {
      const origDays = origLog.days || 0;
      const newDays = updated.days || 0;
      const wasPlanned = origLog.leaveStatus === 'planned' || origLog.status === 'planned';
      const willBePlanned = updated.leaveStatus === 'planned';

      // Adjust employee counters
      const newEmp = { ...emp };
      if (wasPlanned) newEmp.rencana = Math.max(0, (newEmp.rencana || 0) - origDays);
      else newEmp.terpakai = Math.max(0, newEmp.terpakai - origDays);
      if (willBePlanned) newEmp.rencana = (newEmp.rencana || 0) + newDays;
      else newEmp.terpakai = newEmp.terpakai + newDays;

      await fbSaveEmployee(newEmp);
      await fbUpdateLog(updated);
      toast(`${tr('Cuti', 'Leave')} '${updated.nama}' ${tr('berhasil direvisi.', 'revised successfully.')}`);
    } else if (action === 'cancel') {
      const origDays = origLog.days || 0;
      const wasPlanned = origLog.leaveStatus === 'planned' || origLog.status === 'planned';
      if (emp) {
        const newEmp = { ...emp };
        if (wasPlanned) newEmp.rencana = Math.max(0, (newEmp.rencana || 0) - origDays);
        else newEmp.terpakai = Math.max(0, newEmp.terpakai - origDays);
        await fbSaveEmployee(newEmp);
      }
      await fbUpdateLog(updated);
      toast(`${tr('Pengajuan cuti', 'Leave request')} '${updated.nama}' ${tr('dibatalkan.', 'canceled.')}${emp ? ` ${origDays} ${tr('hari dikembalikan.', 'days returned.')}` : ''}`, 'info');
    }
    setLeaveLogOpen(false); setLeaveLogEntry(null);
  };

  const doSaveConfig = async () => {
    if (!can(currentUser?.role || null, 'config')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    setConfigSaving(true);
    const newDepts = cfgDepts.split('\n').map(d=>d.trim()).filter(Boolean);
    const newVisaOptions = cfgVisaOptions.split('\n').map(v=>v.trim()).filter(Boolean);
    const izinCutoffDay = Math.min(28, Math.max(1, Math.floor(cfgIzinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY)));
    const izinMaxPerPeriode = Math.max(1, Math.floor(cfgIzinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE));
    const attendanceRadiusMeters = Math.max(25, Math.floor(cfgAttendanceRadiusMeters || DEFAULT_ATTENDANCE_RADIUS_METERS));
    const attendanceMinAccuracyMeters = Math.max(10, Math.floor(cfgAttendanceMinAccuracyMeters || DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS));
    const attendanceShiftStart = /^\d{2}:\d{2}$/.test(cfgAttendanceShiftStart) ? cfgAttendanceShiftStart : DEFAULT_ATTENDANCE_SHIFT_START;
    const attendanceShiftEnd = /^\d{2}:\d{2}$/.test(cfgAttendanceShiftEnd) ? cfgAttendanceShiftEnd : DEFAULT_ATTENDANCE_SHIFT_END;
    const attendanceShiftToleranceMinutes = Math.max(0, Math.min(180, Math.floor(cfgAttendanceShiftToleranceMinutes || DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES)));
    const iconStyle: IconStyle =
      currentUser.role === 'superadmin'
        ? cfgIconStyle
        : (config.iconStyle === 'vibrant' ? 'vibrant' : DEFAULT_ICON_STYLE);
    const newConfig: AppConfig = {
      companyName: cfgCompany, monthlyAccrualDays: cfgAccrual,
      maxLeaveBalance: cfgMaxLeave, autoLogoutMinutes: cfgAutoLogout,
      izinCutoffDay,
      izinMaxPerPeriode,
      attendanceEnabled: !!cfgAttendanceEnabled,
      attendanceLockEnabled: !!cfgAttendanceLockEnabled,
      attendanceCenterLat: Number.isFinite(cfgAttendanceCenterLat) ? cfgAttendanceCenterLat : DEFAULT_ATTENDANCE_CENTER_LAT,
      attendanceCenterLng: Number.isFinite(cfgAttendanceCenterLng) ? cfgAttendanceCenterLng : DEFAULT_ATTENDANCE_CENTER_LNG,
      attendanceRadiusMeters,
      attendanceMinAccuracyMeters,
      attendanceShiftEnforced: !!cfgAttendanceShiftEnforced,
      attendanceShiftStart,
      attendanceShiftEnd,
      attendanceShiftToleranceMinutes,
      dateTimeFormat: cfgDateTimeFormat === 'iso' ? 'iso' : DEFAULT_DATETIME_FORMAT,
      departments: newDepts.length > 0 ? newDepts : DEFAULT_DEPARTMENTS,
      visaOptions: newVisaOptions.length > 0 ? newVisaOptions : [...DEFAULT_VISA_OPTIONS],
      iconStyle,
      todoEnabled: cfgTodoEnabled ?? DEFAULT_TODO_ENABLED,
      todoKanbanEnabled: cfgTodoKanbanEnabled ?? DEFAULT_TODO_KANBAN_ENABLED,
      todoSubtaskEnabled: cfgTodoSubtaskEnabled ?? DEFAULT_TODO_SUBTASK_ENABLED,
      todoReminderEnabled: cfgTodoReminderEnabled ?? DEFAULT_TODO_REMINDER_ENABLED,
      todoRecurringEnabled: cfgTodoRecurringEnabled ?? DEFAULT_TODO_RECURRING_ENABLED,
      todoActivityEnabled: cfgTodoActivityEnabled ?? DEFAULT_TODO_ACTIVITY_ENABLED,
      todoDarkModeEnabled: cfgTodoDarkModeEnabled ?? DEFAULT_TODO_DARKMODE_ENABLED,
      todoTaskDeleteConfirmEnabled: cfgTodoTaskDeleteConfirmEnabled ?? DEFAULT_TODO_TASK_DELETE_CONFIRM_ENABLED,
      fatEnabled: cfgFatEnabled ?? DEFAULT_FAT_ENABLED,
      analyticsEnabled: cfgAnalyticsEnabled ?? DEFAULT_ANALYTICS_ENABLED,
    };
    try {
      await fbSaveConfig(newConfig);
      toast(tr('Konfigurasi berhasil disimpan.', 'Configuration saved successfully.'));
    } catch (error) {
      console.error('Failed to save config:', error);
      toast(tr('Gagal menyimpan konfigurasi. Periksa koneksi atau hak akses Firebase.', 'Failed to save configuration. Check Firebase connectivity or permissions.'), 'error');
    } finally {
      setConfigSaving(false);
    }
  };

  const doQuickToggleModule = async (key: 'attendance' | 'fat' | 'analytics' | 'todo', next: boolean) => {
    if (!currentUser || currentUser.role !== 'superadmin') return;
    if (key === 'attendance') setCfgAttendanceEnabled(next);
    if (key === 'fat') setCfgFatEnabled(next);
    if (key === 'analytics') setCfgAnalyticsEnabled(next);
    if (key === 'todo') setCfgTodoEnabled(next);
    const patch: Partial<AppConfig> = {};
    if (key === 'attendance') patch.attendanceEnabled = next;
    if (key === 'fat') patch.fatEnabled = next;
    if (key === 'analytics') patch.analyticsEnabled = next;
    if (key === 'todo') patch.todoEnabled = next;
    try {
      await fbSaveConfig({ ...config, ...patch });
      toast(
        next
          ? tr('Modul berhasil diaktifkan.', 'Module enabled successfully.')
          : tr('Modul berhasil dinonaktifkan.', 'Module disabled successfully.'),
        'success',
      );
    } catch {
      toast(tr('Gagal mengubah status modul.', 'Failed to update module status.'), 'error');
    }
  };

  const doExportBackup = () => {
    showConfirm(tr('Konfirmasi Export Backup', 'Backup Export Confirmation'), `${tr('Export seluruh data ke file backup JSON?', 'Export all data to JSON backup file?')}\n${tr('Lanjutkan?', 'Continue?')}`, false, () => {
      const snapshot = {
        exportedAt: nowTs(),
        version: `${APP_NAME}-${APP_VERSION}`,
        employees: Object.fromEntries(employees.map((e) => [e.id, e])),
        logs: Object.fromEntries(logs.map((l) => [l.id, l])),
        overseas: Object.fromEntries(overseas.map((o) => [o.id, o])),
        fatEntries: Object.fromEntries(fatEntries.map((f) => [f.id, f])),
        approvals: Object.fromEntries(approvals.map((a) => [a.id, a])),
        izinEntries: Object.fromEntries(izinEntries.map((i) => [i.id, i])),
        attendanceEntries: Object.fromEntries(attendanceEntries.map((a) => [a.id, a])),
        appUsers: Object.fromEntries(appUsers.map((u) => [u.id, { ...u, passwordHash: '***REDACTED***' }])),
        config,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${APP_BACKUP_PREFIX}-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(tr('Backup berhasil diunduh!', 'Backup downloaded successfully!'), 'success');
    });
  };

  const doImportBackup = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.employees || !data.version?.startsWith(APP_NAME)) {
        toast(tr('File backup tidak valid.', 'Invalid backup file.'), 'error');
        return;
      }
      showConfirm(
        tr('Konfirmasi Import/Restore Backup', 'Import/Restore Backup Confirmation'),
        `RESTORE ${tr('akan menimpa semua data!', 'will overwrite all data!')}\n\n${tr('Backup dari', 'Backup from')}: ${data.exportedAt || tr('tidak diketahui', 'unknown')}\n${tr('Lanjutkan?', 'Continue?')}`,
        true,
        async () => {
          const restoreCode = window.prompt(tr('Ketik RESTORE untuk melanjutkan proses import/restore data:', 'Type RESTORE to continue import/restore process:'));
          if (restoreCode !== 'RESTORE') {
            toast(tr('Import dibatalkan. Kode verifikasi tidak sesuai.', 'Import canceled. Verification code does not match.'), 'warning');
            return;
          }
          const tasks: Promise<unknown>[] = [];
          if (data.employees) tasks.push(set(ref(db, 'employees'), data.employees));
          if (data.logs) tasks.push(set(ref(db, 'logs'), data.logs));
          if (data.overseas) tasks.push(set(ref(db, 'overseas'), data.overseas));
          if (data.fatEntries) tasks.push(set(ref(db, 'fatEntries'), data.fatEntries));
          if (data.approvals) tasks.push(set(ref(db, 'approvals'), data.approvals));
          if (data.izinEntries) tasks.push(set(ref(db, 'izinEntries'), data.izinEntries));
          if (data.attendanceEntries) tasks.push(set(ref(db, 'attendanceEntries'), data.attendanceEntries));
          if (data.config) tasks.push(set(ref(db, 'config'), data.config));
          await Promise.all(tasks);
          toast(tr('Restore berhasil! Data telah dipulihkan.', 'Restore successful! Data has been restored.'), 'success');
          ev.target.value = '';
        },
      );
    } catch (err) {
      toast(`${tr('Gagal restore', 'Restore failed')}: ${String(err)}`, 'error');
    }
  };

  const doTestTelegram = async () => {
    const token = (() => {
      try {
        return localStorage.getItem('hrms_tg_token') || '';
      } catch {
        return '';
      }
    })();
    const chatId = (() => {
      try {
        return localStorage.getItem('hrms_tg_chatid') || '';
      } catch {
        return '';
      }
    })();
    if (!token || !chatId) {
      toast(tr('Isi Bot Token dan Chat ID terlebih dahulu.', 'Fill Bot Token and Chat ID first.'), 'warning');
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `*${tr('Test Notifikasi', 'Notification Test')} ${APP_NAME}*\n\n${tr('Sistem HR', 'HR system')} ${config.companyName} ${tr('berhasil terhubung ke Telegram!', 'is successfully connected to Telegram!')}\n\n_${tr('Dikirim dari panel admin', 'Sent from admin panel')} ${APP_FULL_VERSION}_`,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (data.ok) toast(tr('Pesan test berhasil dikirim ke Telegram!', 'Test message sent to Telegram successfully!'), 'success');
      else toast(`${tr('Gagal kirim', 'Failed to send')}: ${data.description || tr('Token/Chat ID salah.', 'Invalid Token/Chat ID.')}`, 'error');
    } catch {
      toast(tr('Tidak dapat terhubung ke Telegram API.', 'Cannot connect to Telegram API.'), 'error');
    }
  };

  const doAddUser = async () => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    if (!newUserName || !newUserPw || !newUserDisplay) { toast(tr('Semua field harus diisi.', 'All fields are required.'), 'error'); return; }
    if (newUserPw.length < 6) { toast(tr('Password minimal 6 karakter.', 'Password must be at least 6 characters.'), 'error'); return; }
    if (appUsers.find(u => u.username === newUserName)) { toast(tr('Username sudah digunakan.', 'Username is already used.'), 'error'); return; }
    const newUser: AppUser = {
      id: uid('usr'), username: newUserName, passwordHash: await hashPassword(newUserPw),
      role: newUserRole, displayName: newUserDisplay, createdAt: nowTs(),
      canEditEmployeeData: newUserRole === 'superadmin' ? true : newUserCanEditEmployeeData,
      ...(newUserLinked ? {linkedEmployeeName: newUserLinked} : {}),
      ...(newUserFirebaseUid.trim() ? { firebaseUid: newUserFirebaseUid.trim() } : {}),
    };
    await fbSaveUser(newUser);
    setNewUserName(''); setNewUserPw(''); setNewUserDisplay(''); setNewUserLinked(''); setNewUserFirebaseUid(''); setNewUserCanEditEmployeeData(false); setShowNewUserPw(false);
    toast(`${tr('User', 'User')} '${newUserDisplay}' ${tr('berhasil ditambahkan.', 'added successfully.')}`);
  };

  const doDeleteUser = (id: string) => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    if (id === currentUser?.id) { toast(tr('Tidak bisa menghapus akun sendiri.', 'Cannot delete your own account.'), 'error'); return; }
    const u = appUsers.find(x => x.id === id); if (!u) return;
    showConfirm(tr('Hapus User', 'Delete User'), `${tr('Hapus user', 'Delete user')} '${u.displayName}'?`, true, async () => {
      await fbDeleteUser(id);
      toast(`${tr('User', 'User')} '${u.displayName}' ${tr('dihapus.', 'deleted.')}`, 'warning');
    });
  };

  const doStartEditUser = (id: string) => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    const u = appUsers.find(x => x.id === id); if (!u) return;
    setEditUserId(u.id);
    setEditUserName(u.username);
    setEditUserDisplay(u.displayName);
    setEditUserPw('');
    setShowEditUserPw(false);
    setEditUserRole(u.role);
    setEditUserLinked(u.linkedEmployeeName || '');
    setEditUserFirebaseUid(u.firebaseUid || '');
    setEditUserCanEditEmployeeData(!!u.canEditEmployeeData);
  };

  const doCancelEditUser = () => {
    setEditUserId(null);
    setEditUserName(''); setEditUserDisplay(''); setEditUserPw('');
    setShowEditUserPw(false);
    setEditUserRole('viewer'); setEditUserLinked(''); setEditUserFirebaseUid(''); setEditUserCanEditEmployeeData(false);
  };

  const doSaveEditUser = async () => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    if (!editUserId) return;
    const existing = appUsers.find(x => x.id === editUserId);
    if (!existing) { toast(tr('User tidak ditemukan.', 'User not found.'), 'error'); doCancelEditUser(); return; }
    if (!editUserName.trim() || !editUserDisplay.trim()) { toast(tr('Nama & username harus diisi.', 'Name & username are required.'), 'error'); return; }
    // Cek username unik (kecuali milik sendiri)
    if (appUsers.find(u => u.username === editUserName.trim() && u.id !== editUserId)) {
      toast(tr('Username sudah digunakan.', 'Username is already used.'), 'error'); return;
    }
    // Cegah superadmin terakhir kehilangan role superadmin
    if (existing.role === 'superadmin' && editUserRole !== 'superadmin') {
      const superAdmins = appUsers.filter(u => u.role === 'superadmin');
      if (superAdmins.length <= 1) {
        toast(tr('Tidak bisa menurunkan role Super Admin terakhir.', 'Cannot downgrade the last Super Admin role.'), 'error');
        return;
      }
    }
    const updated: AppUser = {
      ...existing,
      username: editUserName.trim(),
      displayName: editUserDisplay.trim(),
      role: editUserRole,
      canEditEmployeeData: editUserRole === 'superadmin' ? true : editUserCanEditEmployeeData,
      ...(editUserPw ? { passwordHash: await hashPassword(editUserPw) } : {}),
      ...(editUserLinked ? { linkedEmployeeName: editUserLinked } : {}),
      ...(editUserFirebaseUid.trim() ? { firebaseUid: editUserFirebaseUid.trim() } : {}),
    };
    if (editUserPw && editUserPw.length < 6) { toast(tr('Password minimal 6 karakter.', 'Password must be at least 6 characters.'), 'error'); return; }
    // Kalau link dikosongkan, pastikan field-nya benar-benar dihapus
    if (!editUserLinked && 'linkedEmployeeName' in updated) {
      delete (updated as any).linkedEmployeeName;
    }
    if (!editUserFirebaseUid.trim() && 'firebaseUid' in updated) {
      delete (updated as any).firebaseUid;
    }
    await fbSaveUser(updated);
    // Jika user yang sedang login meng-edit dirinya sendiri, perbarui session juga
    if (currentUser?.id === editUserId) {
      setCurrentUser(updated);
    }
    toast(`${tr('User', 'User')} '${updated.displayName}' ${tr('diperbarui.', 'updated.')}`);
    doCancelEditUser();
  };

  const doChangeOwnPassword = async () => {
    if (!currentUser) return;
    if (!ownPwOld || !ownPwNew || !ownPwConfirm) { toast(tr('Semua field harus diisi.', 'All fields are required.'), 'error'); return; }
    if (ownPwNew.length < 6) { toast(tr('Password baru minimal 6 karakter.', 'New password must be at least 6 characters.'), 'error'); return; }
    if (ownPwNew !== ownPwConfirm) { toast(tr('Konfirmasi password tidak cocok.', 'Password confirmation does not match.'), 'error'); return; }
    setOwnPwLoading(true);
    const ok = await verifyPassword(ownPwOld, currentUser.passwordHash);
    if (!ok) { toast(tr('Password lama salah.', 'Old password is incorrect.'), 'error'); setOwnPwLoading(false); return; }
    const newHash = await hashPassword(ownPwNew);
    const updated: AppUser = { ...currentUser, passwordHash: newHash };
    await fbSaveUser(updated);
    setCurrentUser(updated);
    setOwnPwOld(''); setOwnPwNew(''); setOwnPwConfirm('');
    setShowOwnPwOld(false); setShowOwnPwNew(false); setShowOwnPwConfirm(false);
    setOwnPwLoading(false);
    toast(tr('Password berhasil diubah!', 'Password changed successfully!'), 'success');
  };

  const doSaveOwnVisa = async () => {
    if (!can(currentUser?.role || null, 'write')) { toast(tr('Viewer hanya dapat melihat data.', 'Viewer can only view data.'), 'error'); return; }
    if (!currentUser?.linkedEmployeeName) { toast(tr('Akun Anda belum terhubung ke karyawan.', 'Your account is not linked to an employee yet.'), 'error'); return; }
    const emp = employees.find(e => e.nama === currentUser.linkedEmployeeName);
    if (!emp) { toast(tr('Data karyawan tidak ditemukan.', 'Employee data not found.'), 'error'); return; }
    setOwnVisaSaving(true);
    const updated: Employee = {
      ...emp,
      visaActive: ownVisaActive,
      visaTypes: ownVisaActive ? ownVisaTypes : [],
    };
    await fbSaveEmployee(updated);
    await fbAddLog({
      timestamp: nowTs(),
      nama: emp.nama,
      departemen: emp.departemen,
      tglCuti: todayStr(),
      keterangan: `${tr('Visa aktif diperbarui oleh', 'Active visa updated by')} ${currentUser.displayName}: ${updated.visaActive ? (updated.visaTypes || []).join(', ') || tr('aktif tanpa jenis', 'active without type') : tr('tidak aktif', 'inactive')}`,
      logType: 'activity'
    });
    setOwnVisaSaving(false);
    toast(tr('Visa aktif berhasil diperbarui.', 'Active visa updated successfully.'), 'success');
  };

  const doToggleUserEmployeeEdit = async (userId: string, enabled: boolean) => {
    if (!can(currentUser?.role || null, 'manageUsers')) { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    const target = appUsers.find(u => u.id === userId);
    if (!target) { toast(tr('User tidak ditemukan.', 'User not found.'), 'error'); return; }
    if (target.role === 'superadmin' && !enabled) {
      toast(tr('Izin edit data karyawan untuk Super Admin selalu aktif.', 'Employee data edit permission is always active for Super Admin.'), 'warning');
      return;
    }
    const updated: AppUser = { ...target, canEditEmployeeData: enabled };
    await fbSaveUser(updated);
    if (currentUser?.id === userId) setCurrentUser(updated);
    toast(`${tr('Hak edit data karyawan untuk', 'Employee data edit permission for')} '${target.displayName}' ${enabled ? tr('diaktifkan', 'enabled') : tr('dinonaktifkan', 'disabled')}.`, 'success');
  };

  const handleLogin = useCallback((loggedInUser: AppUser) => {
    setCurrentUser(loggedInUser);
    const matched = appUsers.find((u) =>
      u.id === loggedInUser.id ||
      (!!loggedInUser.email && u.email === loggedInUser.email) ||
      u.username.trim().toLowerCase() === loggedInUser.username.trim().toLowerCase(),
    );
    if (!matched) return;
    const nextFirebaseUid = loggedInUser.firebaseUid?.trim() || '';
    if (!nextFirebaseUid || matched.firebaseUid === nextFirebaseUid) return;
    void fbSaveUser({
      ...matched,
      firebaseUid: nextFirebaseUid,
      ...(loggedInUser.email ? { email: loggedInUser.email } : {}),
    });
  }, [appUsers, fbSaveUser]);

  const doApproveRequest = async (id: string, note?: string) => {
    if (!currentUser || currentUser.role !== 'superadmin') { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    const req = approvals.find(a => a.id === id);
    if (!req || req.status !== 'pending') { toast(tr('Request tidak ditemukan / sudah diproses.', 'Request not found / already processed.'), 'warning'); return; }
    const emp = employees.find(e => e.id === req.employeeId);
    if (!emp) { toast(tr('Data karyawan tidak ditemukan.', 'Employee data not found.'), 'error'); return; }

    const updated: Employee = { ...emp, ...req.changes };
    await fbSaveEmployee(updated);

    const newReq: ApprovalRequest = {
      ...req,
      status: 'approved',
      decisionBy: currentUser.displayName,
      decisionAt: nowTs(),
      ...(note?.trim() ? { decisionNote: note.trim() } : {}),
    };
    await fbSaveApproval(newReq);

    await fbAddLog({
      timestamp: nowTs(),
      nama: updated.nama,
      departemen: updated.departemen,
      tglCuti: todayStr(),
      keterangan: `${tr('Approval DITERIMA oleh', 'Approval ACCEPTED by')} ${currentUser.displayName} ${tr('untuk perubahan data karyawan (pemohon:', 'for employee data changes (requester:')} ${req.requestedByName})${note?.trim() ? ` · ${tr('Catatan', 'Note')}: ${note.trim()}` : ''}`,
      logType: 'activity'
    });

    await addNotification({
      type: 'success',
      title: tr('Approval diterima', 'Approval accepted'),
      message: `${tr('Perubahan data karyawan', 'Employee data changes')} '${req.employeeName}' ${tr('di-approve oleh', 'approved by')} ${currentUser.displayName}.${note?.trim() ? ` ${tr('Catatan', 'Note')}: ${note.trim()}` : ''}`,
      targetUserId: req.requestedByUserId,
      relatedId: req.id,
    });

    toast(tr('Request di-approve dan perubahan diterapkan.', 'Request approved and changes applied.'), 'success');
  };

  const doRejectRequest = async (id: string, note?: string) => {
    if (!currentUser || currentUser.role !== 'superadmin') { toast(tr('Akses ditolak.', 'Access denied.'), 'error'); return; }
    const req = approvals.find(a => a.id === id);
    if (!req || req.status !== 'pending') { toast(tr('Request tidak ditemukan / sudah diproses.', 'Request not found / already processed.'), 'warning'); return; }

    const newReq: ApprovalRequest = {
      ...req,
      status: 'rejected',
      decisionBy: currentUser.displayName,
      decisionAt: nowTs(),
      ...(note?.trim() ? { decisionNote: note.trim() } : {}),
    };
    await fbSaveApproval(newReq);

    await fbAddLog({
      timestamp: nowTs(),
      nama: req.employeeName,
      departemen: req.department,
      tglCuti: todayStr(),
      keterangan: `${tr('Approval DITOLAK oleh', 'Approval REJECTED by')} ${currentUser.displayName} ${tr('untuk perubahan data karyawan (pemohon:', 'for employee data changes (requester:')} ${req.requestedByName})${note?.trim() ? ` · ${tr('Alasan', 'Reason')}: ${note.trim()}` : ''}`,
      logType: 'activity'
    });

    await addNotification({
      type: 'error',
      title: tr('Approval ditolak', 'Approval rejected'),
      message: `${tr('Perubahan data karyawan', 'Employee data changes')} '${req.employeeName}' ${tr('ditolak oleh', 'rejected by')} ${currentUser.displayName}.${note?.trim() ? ` ${tr('Alasan', 'Reason')}: ${note.trim()}` : ''}`,
      targetUserId: req.requestedByUserId,
      relatedId: req.id,
    });

    toast(tr('Request ditolak.', 'Request rejected.'), 'info');
  };

  const cleanedRef = React.useRef(false);
  useEffect(() => {
    if (syncing || appUsers.length === 0 || cleanedRef.current) return;
    const adminUsers = appUsers.filter(u => u.username === 'admin');
    if (adminUsers.length > 1) {
      adminUsers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const toDelete = adminUsers.slice(1);
      toDelete.forEach(u => fbDeleteUser(u.id));
      cleanedRef.current = true;
      toast(`${toDelete.length} ${tr('duplikat Administrator dihapus otomatis.', 'duplicate Administrator accounts auto-removed.')}`, 'info');
    } else {
      cleanedRef.current = true;
    }
  }, [appUsers, syncing]);

  useEffect(() => {
    if (!currentUser?.linkedEmployeeName || currentUser.role !== 'viewer') return;
    const emp = employees.find(e => e.nama === currentUser.linkedEmployeeName);
    if (emp) setSelectedId(emp.id);
  }, [employees, currentUser]);

  useEffect(() => {
    const close = () => { setCtxOpen(false); setCtxEmpId(null); setShowOnlinePanel(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Warm-up common route chunks shortly after login for snappier first navigation.
    const preloadTimer = window.setTimeout(() => {
      void import('./pages/dashboard/DashboardPage');
      void import('./pages/leave/LeavePage');
      void import('./pages/izin/IzinPage');
      if (config.attendanceEnabled) void import('./pages/attendance/AttendancePage');
      void import('./pages/history/HistoryPage');
      void import('./pages/overseas/OverseasPage');

      if (currentUser.role === 'superadmin') {
        void import('./pages/approvals/ApprovalsPage');
        void import('./pages/users/UsersPage');
      } else if (currentUser.role === 'admin') {
        void import('./pages/users/UsersPage');
      }
    }, 1200);
    return () => window.clearTimeout(preloadTimer);
  }, [currentUser, cfgAttendanceEnabled]);

  const iconStyleEffective: IconStyle = config.iconStyle === 'vibrant' ? 'vibrant' : DEFAULT_ICON_STYLE;
  const [fluentIconsReady, setFluentIconsReady] = useState(false);
  useEffect(() => {
    if (iconStyleEffective !== 'vibrant') return;
    let cancelled = false;
    import('./registerFluentColorIcons')
      .then(() => {
        if (!cancelled) setFluentIconsReady(true);
      })
      .catch(() => {
        if (!cancelled) setFluentIconsReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [iconStyleEffective]);

  const navItems: {key: ActivePage; icon: ReactNode; label: string}[] = useMemo(() => {
    if (!currentUser) return [];
    const vibrant = iconStyleEffective === 'vibrant' && fluentIconsReady;
    const shell = (key: FluentNavKey, fallback: ReactNode) =>
      vibrant && key !== 'overseas' && key !== 'todo'
        ? <Icon icon={FLUENT_NAV[key]} width={18} height={18} className="flex-shrink-0" aria-hidden />
        : fallback;
    return [
      { key: 'dashboard', icon: shell('dashboard', <LayoutDashboard size={16} />), label: tr('Dashboard', 'Dashboard') },
      { key: 'leave', icon: shell('leave', <ClipboardList size={16} />), label: tr('Cuti', 'Leave') },
      { key: 'izin', icon: shell('izin', <Clock3 size={16} />), label: tr('Izin', 'Permit') },
      ...(cfgAttendanceEnabled ? [{ key: 'attendance' as ActivePage, icon: shell('attendance', <MapPin size={16} />), label: tr('Absensi', 'Attendance') }] : []),
      { key: 'history', icon: shell('history', <ScrollText size={16} />), label: tr('Log', 'Logs') },
      { key: 'overseas', icon: shell('overseas', <Plane size={16} />), label: 'Overseas' },
      ...(cfgFatEnabled ? [{ key: 'fat' as ActivePage, icon: shell('fat', <FlaskConical size={16} />), label: tr('Jadwal FAT', 'FAT Schedule') }] : []),
      { key: 'calendar', icon: shell('calendar', <CalendarDays size={16} />), label: tr('Kalender', 'Calendar') },
      ...(cfgAnalyticsEnabled ? [{ key: 'analytics' as ActivePage, icon: shell('analytics', <TrendingUp size={16} />), label: tr('Analitik', 'Analytics') }] : []),
      ...(cfgTodoEnabled ? [{ key: 'todo' as ActivePage, icon: shell('todo', <ListChecks size={16} />), label: tr('To-Do', 'To-Do') }] : []),
      ...(can(currentUser.role, 'config') ? [{ key: 'config' as ActivePage, icon: shell('config', <Settings size={16} />), label: tr('Konfigurasi', 'Config') }] : []),
      ...(can(currentUser.role, 'manageUsers')
        ? [{ key: 'users' as ActivePage, icon: shell('usersTeam', <Users size={16} />), label: tr('Manajemen User', 'Users') }]
        : [{ key: 'users' as ActivePage, icon: shell('usersPerson', <UserRound size={16} />), label: tr('Akun Saya', 'My Account') }]),
      ...(currentUser.role === 'superadmin' ? [{ key: 'approvals' as ActivePage, icon: shell('approvals', <CheckCircle2 size={16} />), label: 'Approval' }] : []),
      { key: 'about', icon: shell('about', <Info size={16} />), label: 'About' },
    ];
  }, [iconStyleEffective, currentUser, fluentIconsReady, tr, cfgAttendanceEnabled, cfgFatEnabled, cfgAnalyticsEnabled, cfgTodoEnabled]);

  if (!currentUser) {
    return (
      <I18nProvider language={language}>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading...</div>}>
          <LazyLoginPage
            appUsers={appUsers}
            onLogin={handleLogin}
            companyName={config.companyName}
            verifyLegacyPassword={verifyPassword}
            dark={dark}
            onToggleTheme={toggleDark}
          />
        </Suspense>
      </I18nProvider>
    );
  }

  const preloadPageChunk = (page: ActivePage) => {
    switch (page) {
      case 'dashboard':
        void import('./pages/dashboard/DashboardPage');
        break;
      case 'leave':
        void import('./pages/leave/LeavePage');
        break;
      case 'izin':
        void import('./pages/izin/IzinPage');
        break;
      case 'history':
        void import('./pages/history/HistoryPage');
        break;
      case 'attendance':
        void import('./pages/attendance/AttendancePage');
        break;
      case 'overseas':
        void import('./pages/overseas/OverseasPage');
        break;
      case 'fat':
        void import('./pages/fat/FATPage');
        break;
      case 'calendar':
        void import('./pages/calendar/CalendarPage');
        break;
      case 'analytics':
        void import('./pages/analytics/AnalyticsPage');
        break;
      case 'config':
        void import('./pages/config/ConfigPage');
        break;
      case 'todo':
        void import('./pages/todo/TodoPage');
        break;
      case 'users':
        void import('./pages/users/UsersPage');
        break;
      case 'approvals':
        void import('./pages/approvals/ApprovalsPage');
        break;
      case 'about':
        void import('./pages/about/AboutPage');
        break;
      default:
        break;
    }
  };

  const configPageProps = {
    currentUserRole: currentUser.role,
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
    onQuickToggleModule: doQuickToggleModule,
    onSaveConfig: doSaveConfig,
    onExportBackup: doExportBackup,
    onImportBackup: doImportBackup,
    onTestTelegram: doTestTelegram,
    onToast: toast,
    config,
    configSaving,
  };

  const leavePageProps = {
    employees,
    logs,
    currentUser,
    departments: activeDepts,
    onLogCuti: () => setCutiModalOpen(true),
    onResetJatah: doResetJatah,
    onEditJatah: doOpenEdit,
    fbUpdateLog,
    fbSaveEmployee,
    toast,
    canEditEmployeeRecord,
    canEditOwnLeave,
    renderLeaveLogDialog: ({ open, log, employees: dialogEmployees, currentUser: dialogCurrentUser, onClose, onSave }: any) => (
      open && log ? (
        <LeaveLogDialog
          open={open}
          log={log as LogEntry}
          employees={dialogEmployees as Employee[]}
          currentUser={dialogCurrentUser as AppUser}
          onClose={onClose}
          onSave={onSave as any}
        />
      ) : null
    ),
  };

  const izinPageProps = {
    employees,
    izinEntries,
    currentUser,
    izinCutoffDay: config.izinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY,
    izinMaxPerPeriode: config.izinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE,
    fbSaveIzin,
    fbDeleteIzin,
    fbAddLog,
    addNotification,
    toast,
  };

  const chatPageProps = {
    currentUser,
    onlineUsers,
    allUsers: appUsers.map((u) => ({ userId: u.id, username: u.username, displayName: u.displayName })),
    chatMessages,
    targetUser: chatTarget,
    onSelectTarget: (u: unknown) => setChatTarget(u as OnlineUser | null),
    onSend: sendChatMessage,
    canClearGlobal: currentUser?.role === 'superadmin',
    onClearGlobal: doClearGlobalChat,
  };

  const historyPageProps = {
    logs,
    logTab,
    setLogTab,
    leaveLogFilter,
    setLeaveLogFilter,
    currentUser,
    doClearHistory,
    canEditOwnLeave,
    setLeaveLogEntry,
    setLeaveLogOpen,
    showConfirm,
    fbDeleteLog,
    toast,
    hArr,
    handleHistSort,
  };

  const overseasPageProps = {
    ovsFilter,
    setOvsFilter,
    ovsSearch,
    setOvsSearch,
    currentUser,
    overseas,
    filteredOverseas,
    onOpenAdd: () => { setOvsEntry(null); setOvsOpen(true); },
    onOpenEdit: (entry: OverseasEntry) => { setOvsEntry(entry); setOvsOpen(true); },
    onDelete: doDeleteOverseas,
    onMarkDone: doMarkOverseasDone,
    onOpenSummary: () => setActivePage('overseasSummary'),
    countDays: countInclusiveDays,
  };

  const fatPageProps = {
    fatEntries,
    employees,
    currentUser,
    onAdd: () => { setFatEntry(null); setFatOpen(true); },
    onEdit: (entry: FATEntry) => { setFatEntry(entry); setFatOpen(true); },
    onDelete: doDeleteFAT,
  };

  const calendarPageProps = { logs, overseas, fatEntries };
  const analyticsPageProps = { employees, logs, overseas };
  const attendancePageProps = {
    currentUser,
    employees,
    attendanceEntries,
    appUsers,
    onlineUsers,
    attendanceLockEnabled: config.attendanceLockEnabled !== false,
    attendanceCenterLat: Number(config.attendanceCenterLat || DEFAULT_ATTENDANCE_CENTER_LAT),
    attendanceCenterLng: Number(config.attendanceCenterLng || DEFAULT_ATTENDANCE_CENTER_LNG),
    attendanceRadiusMeters: Math.max(25, Math.floor(config.attendanceRadiusMeters || DEFAULT_ATTENDANCE_RADIUS_METERS)),
    attendanceMinAccuracyMeters: Math.max(10, Math.floor(config.attendanceMinAccuracyMeters || DEFAULT_ATTENDANCE_MIN_ACCURACY_METERS)),
    attendanceShiftEnforced: !!config.attendanceShiftEnforced,
    attendanceShiftStart: config.attendanceShiftStart || DEFAULT_ATTENDANCE_SHIFT_START,
    attendanceShiftEnd: config.attendanceShiftEnd || DEFAULT_ATTENDANCE_SHIFT_END,
    attendanceShiftToleranceMinutes: Math.max(0, Math.min(180, Math.floor(config.attendanceShiftToleranceMinutes || DEFAULT_ATTENDANCE_SHIFT_TOLERANCE_MINUTES))),
    fbSaveAttendance,
    fbDeleteAttendance,
    addNotification,
    focusDate: attendanceFocusDate,
    focusEntryId: attendanceFocusEntryId,
    toast,
  };

  const todoPageProps = {
    userId: currentUser.id,
    userDisplayName: currentUser.displayName,
    currentUserFirebaseUid: currentUser.firebaseUid || '',
    currentUserRole: currentUser.role,
    assignableAdmins: appUsers
      .filter((u) => (u.role === 'admin' || u.role === 'superadmin'))
      .map((u) => ({ id: u.id, displayName: u.displayName, role: u.role, firebaseUid: u.firebaseUid || '' })),
    featureConfig: {
      kanbanEnabled: config.todoKanbanEnabled ?? DEFAULT_TODO_KANBAN_ENABLED,
      subtaskEnabled: config.todoSubtaskEnabled ?? DEFAULT_TODO_SUBTASK_ENABLED,
      reminderEnabled: config.todoReminderEnabled ?? DEFAULT_TODO_REMINDER_ENABLED,
      recurringEnabled: config.todoRecurringEnabled ?? DEFAULT_TODO_RECURRING_ENABLED,
      activityLogEnabled: config.todoActivityEnabled ?? DEFAULT_TODO_ACTIVITY_ENABLED,
      darkModeEnabled: config.todoDarkModeEnabled ?? DEFAULT_TODO_DARKMODE_ENABLED,
      taskDeleteConfirmEnabled: config.todoTaskDeleteConfirmEnabled ?? DEFAULT_TODO_TASK_DELETE_CONFIRM_ENABLED,
    },
  };
  const overseasSummaryPageProps = {
    overseas,
    totalsByName: overseasTotalDaysByName,
    onBack: () => setActivePage('overseas'),
  };
  const approvalsPageProps = {
    approvals,
    employees,
    currentUser,
    onApprove: doApproveRequest,
    onReject: doRejectRequest,
    focusApprovalId: approvalFocusId,
    onFocusHandled: () => setApprovalFocusId(null),
  };
  const aboutPageProps = { config };

  const ownAccountProps = {
    currentUserFirebaseUid: currentUser.firebaseUid || '',
    ownEmployee,
    ownVisaActive,
    setOwnVisaActive,
    activeVisaOptions,
    ownVisaTypes,
    setOwnVisaTypes,
    doSaveOwnVisa,
    ownVisaSaving,
    showOwnPwOld,
    setShowOwnPwOld,
    ownPwOld,
    setOwnPwOld,
    showOwnPwNew,
    setShowOwnPwNew,
    ownPwNew,
    setOwnPwNew,
    showOwnPwConfirm,
    setShowOwnPwConfirm,
    ownPwConfirm,
    setOwnPwConfirm,
    ownPwLoading,
    doChangeOwnPassword,
  };

  const newUserFormProps = {
    newUserDisplay,
    setNewUserDisplay,
    newUserName,
    setNewUserName,
    showNewUserPw,
    setShowNewUserPw,
    newUserPw,
    setNewUserPw,
    newUserRole,
    setNewUserRole,
    newUserLinked,
    setNewUserLinked,
    newUserFirebaseUid,
    setNewUserFirebaseUid,
    newUserCanEditEmployeeData,
    setNewUserCanEditEmployeeData,
    doAddUser,
  };

  const editUserFormProps = {
    editUserId,
    editUserDisplay,
    setEditUserDisplay,
    editUserName,
    setEditUserName,
    showEditUserPw,
    setShowEditUserPw,
    editUserPw,
    setEditUserPw,
    editUserRole,
    setEditUserRole,
    editUserLinked,
    setEditUserLinked,
    editUserFirebaseUid,
    setEditUserFirebaseUid,
    editUserCanEditEmployeeData,
    setEditUserCanEditEmployeeData,
    doSaveEditUser,
    doCancelEditUser,
    doStartEditUser,
    doDeleteUser,
    doToggleUserEmployeeEdit,
  };

  const usersPageProps = {
    currentUser,
    currentUserFirebaseUid: currentUser.firebaseUid || '',
    employees,
    setAddEmpOpen,
    doOpenEdit,
    doDelete,
    doPickImportEmployeesCsv,
    doDownloadEmployeesCsvTemplate,
    roleLabel,
    roleBadge,
    appUsers,
    ...ownAccountProps,
    ...newUserFormProps,
    ...editUserFormProps,
  };

  const floatingChatProps = {
    open: chatFabOpen,
    onClose: () => setChatFabOpen(false),
    side: chatFabSide,
    onToggleSide: () => setChatFabSide(s => s === 'right' ? 'left' : 'right'),
    currentUser,
    onlineUsers,
    allUsers: appUsers.map((u) => ({ userId: u.id, username: u.username, displayName: u.displayName })),
    chatMessages,
    targetUser: chatTarget,
    onSelectTarget: (u: unknown) => setChatTarget(u as OnlineUser | null),
    onSend: sendChatMessage,
    onDeleteMessage: deleteChatMessage,
    onToast: toast,
    canClearGlobal: currentUser?.role === 'superadmin',
    onClearGlobal: doClearGlobalChat,
  };

  const dashboardWidgetsProps = {
    logs,
    overseas,
    employees,
    izinEntries,
    fatEntries,
    stats,
    setActivePage,
    fmtDate,
    todayStr,
    getWeekRange,
    toISODate,
    izinCutoffDay: config.izinCutoffDay || DEFAULT_IZIN_CUTOFF_DAY,
    izinMaxPerPeriode: config.izinMaxPerPeriode || DEFAULT_IZIN_MAX_PER_PERIODE,
  };

  const dashboardPageProps = {
    activeDepts,
    searchQ,
    setSearchQ,
    deptFilter,
    setDeptFilter,
    syncing,
    filteredEmps,
    currentUser,
    setActivePage,
    selectedId,
    setSelectedId,
    doOpenEdit,
    doResetJatah,
    doDelete,
    handleSort,
    sortCol,
    sArr,
    calcWorkDuration,
    setCtxEmpId,
    setCtxPos,
    setCtxOpen,
    dashboardWidgetsProps,
  };


  return (
    <I18nProvider language={language}>
      <div data-icon-style={iconStyleEffective} className="app-root flex flex-col h-[100dvh] min-h-0 bg-[#F0F4F8] overflow-hidden animate__animated animate__fadeIn" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {showLogoutWarning && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[99998] px-4 py-3 bg-amber-500 text-white rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 mx-2">
          <span>⏱</span>
          <span className="text-xs sm:text-sm">{tr('Sesi berakhir 2 menit lagi.', 'Session expires in 2 minutes.')}</span>
          <button onClick={resetActivity} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition flex-shrink-0">{tr('Tetap Login', 'Stay Signed In')}</button>
        </div>
      )}

      <div className="h-14 bg-[#005A9E] flex items-center justify-between pl-3 pr-[calc(1.35rem+env(safe-area-inset-right,0px))] sm:px-5 z-20 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>setDrawerOpen(true)} className="lg:hidden text-white/80 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#004880] transition" aria-label={tr('Buka menu', 'Open menu')}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden><rect y="2" width="18" height="2" rx="1"/><rect y="8" width="18" height="2" rx="1"/><rect y="14" width="18" height="2" rx="1"/></svg>
          </button>
          <button type="button" onClick={()=>setSidebarCollapsed(c=>!c)} className="hidden lg:flex text-white/70 hover:text-white w-8 h-8 items-center justify-center rounded-lg hover:bg-[#004880] transition" aria-label={sidebarCollapsed ? tr('Perluas sidebar', 'Expand sidebar') : tr('Ciutkan sidebar', 'Collapse sidebar')} aria-expanded={!sidebarCollapsed}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><rect y="2" width="16" height="1.5" rx=".75"/><rect y="7.25" width="16" height="1.5" rx=".75"/><rect y="12.5" width="16" height="1.5" rx=".75"/></svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
              <img src="/fmlogo.png" alt="FM Logo" className="w-8 h-8" /><span className="text-base"></span>
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-white font-extrabold text-sm tracking-tight">{config.companyName}</div>
              <div className="text-[#A8C8F0] text-[10px]">HR Management System</div>
            </div>
            <div className="text-white font-bold text-sm sm:hidden">{config.companyName.replace('PT ','')}</div>
          </div>
        </div>

        {/* ── RIGHT SIDE: search + actions — always visible, critical buttons never hidden ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-0 flex-shrink-0">
          {/* Global Search — hidden on very small screens to save space for action buttons */}
          <div className="relative hidden xs:block" ref={globalRef}>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                className="w-24 sm:w-44 md:w-52 h-8 pl-7 pr-3 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/40 transition"
                placeholder={tr('Cari…', 'Search…')}
                value={globalSearch}
                onChange={e=>{setGlobalSearch(e.target.value);setGlobalOpen(true);}}
                onFocus={()=>setGlobalOpen(true)}
                onBlur={()=>setTimeout(()=>setGlobalOpen(false),150)}
              />
            </div>
            {globalOpen && globalSearch.trim().length >= 2 && (
              <div className="absolute top-10 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-80 overflow-y-auto">
                {globalResults.emps.length===0 && globalResults.logs_.length===0 && globalResults.ovs.length===0 ? (
                  <div className="p-4 text-sm text-slate-400 text-center">{tr('Tidak ada hasil untuk', 'No results for')} "{globalSearch}"</div>
                ) : (
                  <>
                    {globalResults.emps.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">{tr('Karyawan', 'Employees')}</div>
                        {globalResults.emps.map(e=>(
                          <button key={e.id} onMouseDown={()=>{setActivePage('dashboard');setSearchQ(e.nama);setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">{e.nama.charAt(0)}</div>
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{e.nama}</div>
                              <div className="text-[10px] text-slate-400">{e.posisi||e.departemen}</div>
                            </div>
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${e.jatahAwal-e.terpakai-(e.rencana||0)<=0?'bg-red-100 text-red-600':e.jatahAwal-e.terpakai-(e.rencana||0)<=3?'bg-amber-100 text-amber-600':'bg-emerald-100 text-emerald-600'}`}>
                              {e.jatahAwal-e.terpakai-(e.rencana||0)}h
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.logs_.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">{tr('Log Cuti', 'Leave Logs')}</div>
                        {globalResults.logs_.map(l=>(
                          <button key={l.id} onMouseDown={()=>{setActivePage('history');setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition">
                            <div className="text-sm font-semibold text-slate-800">{l.nama}</div>
                            <div className="text-[10px] text-slate-400 truncate">{l.keterangan}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {globalResults.ovs.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Overseas</div>
                        {globalResults.ovs.map(o=>(
                          <button key={o.id} onMouseDown={()=>{setActivePage('overseas');setGlobalSearch('');setGlobalOpen(false);}}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition">
                            <div className="text-sm font-semibold text-slate-800">{o.nama} · {o.projectNo}</div>
                            <div className="text-[10px] text-slate-400">{o.lokasi} · {o.tipe}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Online status dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${syncing?'bg-yellow-400 animate-pulse':online?'bg-emerald-400':'bg-red-500'}`} />

          {/* Clock — desktop only */}
          <div className="hidden md:flex bg-[#004880] rounded-lg px-3 py-1.5 items-center gap-2">
            <span className="text-[#A8C8F0] text-[11px] hidden lg:block">{date}</span>
            <span className="text-white text-sm font-bold" style={{fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>
          </div>

          <button
            onClick={()=>setLanguage(language === 'id' ? 'en' : 'id')}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition"
            title={tr('Ganti Bahasa', 'Switch Language')}
          >
            {language === 'id' ? 'ID' : 'EN'}
          </button>

          {/* User chip — sm+ only */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#004880] rounded-lg px-2.5 py-1.5 flex-shrink-0">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[11px] font-bold text-white">
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="text-white text-xs font-semibold leading-tight">{currentUser.displayName}</div>
              <div className="text-[#A8C8F0] text-[10px] leading-tight">{roleLabel[currentUser.role]}</div>
            </div>
          </div>

          {/* Dark mode toggle */}
          <button onClick={toggleDark} title={dark ? tr('Mode Terang', 'Light Mode') : tr('Mode Gelap', 'Dark Mode')}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition">
            {dark
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* PWA Install — desktop only */}
          {pwaPrompt && (
            <button
              onClick={async () => { pwaPrompt.prompt(); const r = await pwaPrompt.userChoice; if (r.outcome === 'accepted') setPwaPrompt(null); }}
              title={tr('Install Aplikasi', 'Install App')}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Install
            </button>
          )}

          {/* Online Users — ALWAYS visible */}
          <div className="relative flex-shrink-0">
            <button onClick={e=>{e.stopPropagation();setShowOnlinePanel(p=>!p);}}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              title={`${onlineUsers.length} ${tr('pengguna online', 'online users')}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {onlineUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#005A9E] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {onlineUsers.length}
                </span>
              )}
            </button>
            {showOnlinePanel && (
              <Suspense fallback={null}>
                <OnlineUsersPanel
                  users={onlineUsers}
                  currentUserId={currentUser.id}
                  onClose={()=>setShowOnlinePanel(false)}
                  onStartChat={(u)=>{
                    setChatTarget(u as OnlineUser);
                    setChatFabOpen(true);
                    setShowOnlinePanel(false);
                  }}
                />
              </Suspense>
            )}
          </div>

          {/* Notifications — ALWAYS visible */}
          <div className="relative flex-shrink-0">
            <button onClick={e=>{e.stopPropagation();setShowNotifPanel(p=>!p);}}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              title={tr('Notifikasi', 'Notifications')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 border-2 border-[#005A9E] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Suspense fallback={null}>
              <NotificationsPanel
                open={showNotifPanel}
                notifications={notifications}
                unreadCount={unreadCount}
                onClose={()=>setShowNotifPanel(false)}
                onMarkAsRead={(id)=>markAsRead(id)}
                onMarkAllAsRead={()=>markAllAsRead()}
                onOpenApprovals={(n) => {
                  markAsRead(n.id);
                  setShowNotifPanel(false);
                  if (n.action === 'open-attendance') {
                    const focusEntry = attendanceEntries.find((entry) => entry.id === n.relatedId);
                    setAttendanceFocusDate((focusEntry?.createdAt || n.timestamp || todayStr()).slice(0, 10));
                    setAttendanceFocusEntryId(focusEntry?.id || n.relatedId || null);
                    setActivePage('attendance');
                    return;
                  }
                  setApprovalFocusId(n.relatedId || null);
                  setActivePage('approvals');
                }}
                isSuperAdmin={currentUser.role === 'superadmin'}
                onDeleteNotif={(id) => {
                  showConfirm(tr('Hapus Notifikasi', 'Delete Notification'), tr('Hapus notifikasi ini?', 'Delete this notification?'), true, async () => {
                    await deleteNotification(id);
                    toast(tr('Notifikasi dihapus.', 'Notification deleted.'), 'info');
                  });
                }}
                onClearAllNotif={() => {
                  showConfirm(
                    tr('Hapus Semua Notifikasi', 'Delete All Notifications'),
                    `${tr('Hapus semua', 'Delete all')} ${notifications.length} ${tr('notifikasi? Tindakan ini tidak dapat dibatalkan.', 'notifications? This action cannot be undone.')}`,
                    true,
                    async () => {
                    await clearNotifications();
                    setShowNotifPanel(false);
                    toast(tr('Semua notifikasi dihapus.', 'All notifications deleted.'), 'info');
                  });
                }}
                onBroadcast={async (title, message, type) => {
                  await addNotification({ type, title, message });
                  setShowNotifPanel(false);
                  toast(`${tr('Broadcast', 'Broadcast')} "${title}" ${tr('berhasil dikirim ke semua pengguna.', 'sent successfully to all users.')}`, 'success');
                }}
              />
            </Suspense>
          </div>

          {/* Logout — ALWAYS visible */}
          <button onClick={()=>showConfirm(tr('Logout', 'Logout'), tr('Keluar dari sistem?', 'Sign out from the system?'), false, ()=>setCurrentUser(null))}
            className="w-9 h-9 ml-1 mr-2 sm:mr-0 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/30 text-white/80 hover:text-white transition" title={tr('Logout', 'Logout')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        <div className={`app-shell-muted hidden lg:flex flex-col flex-shrink-0 bg-[#E8EDF2] border-r border-slate-300 transition-all duration-300 overflow-hidden ${sidebarCollapsed?'w-0':'w-[280px]'}`}>
          <div className="flex flex-col h-full overflow-y-auto">
            <nav className="p-3 space-y-1">
              {navItems.map(item => (
                <button key={item.key} onClick={()=>setActivePage(item.key)}
                  onMouseEnter={() => preloadPageChunk(item.key)}
                  onFocus={() => preloadPageChunk(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left
                    ${activePage===item.key?'bg-[#005A9E] text-white shadow-sm':'text-slate-600 hover:bg-slate-200 hover:text-slate-800'}`}>
                  <span className="text-base">{item.icon}</span> {item.label}
                  {item.key==='overseas' && stats.overseasActive>0 && (
                    <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{stats.overseasActive}</span>
                  )}
                  {item.key==='fat' && stats.fatUpcoming>0 && (
                    <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {stats.fatUpcoming > 9 ? '9+' : stats.fatUpcoming}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="h-px bg-slate-300 mx-3" />

            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                {v:stats.total, l:tr('Karyawan', 'Employees'), c:'text-[#005A9E]', bg:'bg-blue-50 border-blue-100'},
                {v:stats.aman,  l:tr('Cuti Aman', 'Safe Leave'), c:'text-emerald-700', bg:'bg-emerald-50 border-emerald-100'},
                {v:stats.low,   l:tr('Sisa ≤ 3', 'Remaining ≤ 3'), c:'text-amber-700', bg:'bg-amber-50 border-amber-100'},
                {v:stats.out,   l:tr('Habis', 'Exhausted'), c:'text-red-600', bg:'bg-red-50 border-red-100'},
              ].map(({v,l,c,bg})=>(
                <div key={l} className={`border rounded-xl p-2 text-center animate__animated animate__fadeInUp ${bg}`}>
                  <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {activePage === 'dashboard' && (
              <div className="px-3 pb-4 space-y-2">
                <div className="h-px bg-slate-300 mb-3" />
                {currentUser.role === 'superadmin' && (
                  <button onClick={doExportCSV} className="w-full h-9 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 border border-slate-200 rounded-xl text-[13px] font-semibold transition flex items-center justify-center gap-1.5">
                    <FileSpreadsheet size={14} /> Export CSV
                  </button>
                )}
                {selectedEmp && canEditEmployeeRecord(currentUser, selectedEmp.nama) && (
                  <button onClick={()=>selectedId&&doResetJatah(selectedId)}
                    className="w-full h-9 bg-white hover:bg-amber-50 active:scale-95 text-amber-700 border border-amber-200 rounded-xl text-[13px] font-semibold transition flex items-center justify-center gap-1.5">
                    <RotateCcw size={14} /> {tr('Reset Jatah Cuti', 'Reset Leave Quota')}
                    <span className="ml-auto text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">{tr('EDIT', 'EDIT')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <>
          {drawerOpen && <div className="fixed inset-0 bg-black/40 z-[200] lg:hidden" role="presentation" tabIndex={-1} onClick={()=>setDrawerOpen(false)} aria-hidden />}
          <div className={`app-shell-muted fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-[#E8EDF2] z-[201] flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ${drawerOpen?'translate-x-0':'-translate-x-full'}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-[#005A9E] flex-shrink-0">
              <div className="flex items-center gap-2">
                <img 
                  src="/fmlogo.png" 
                  alt="FM Logo" 
                  className="h-8 w-auto"
                />
                <span className="text-white font-bold text-sm">Menu</span>
              </div>
              <button type="button" onClick={()=>setDrawerOpen(false)} className="text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#004880] transition" aria-label={tr('Tutup menu', 'Close menu')}><X size={16} aria-hidden /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Menu Utama</div>
              {navItems.slice(0,5).map(item => (
                <button key={item.key} onClick={()=>{setActivePage(item.key);setDrawerOpen(false);}}
                  onTouchStart={() => preloadPageChunk(item.key)}
                  onMouseEnter={() => preloadPageChunk(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left
                    ${activePage===item.key?'bg-[#005A9E] text-white':'text-slate-600 hover:bg-slate-200'}`}>
                  <span>{item.icon}</span> {item.label}
                  {item.key==='overseas' && stats.overseasActive>0 && (
                    <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {stats.overseasActive > 9 ? '9+' : stats.overseasActive}
                    </span>
                  )}
                  {item.key==='fat' && stats.fatUpcoming>0 && (
                    <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {stats.fatUpcoming > 9 ? '9+' : stats.fatUpcoming}
                    </span>
                  )}
                </button>
              ))}
              {navItems.slice(5).length > 0 && (
                <>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mt-3 mb-2">Lainnya</div>
                  {navItems.slice(5).map(item => (
                    <button key={item.key} onClick={()=>{setActivePage(item.key);setDrawerOpen(false);}}
                      onTouchStart={() => preloadPageChunk(item.key)}
                      onMouseEnter={() => preloadPageChunk(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left
                        ${activePage===item.key?'bg-[#005A9E] text-white':'text-slate-600 hover:bg-slate-200'}`}>
                      <span>{item.icon}</span> {item.label}
                      {item.key==='overseas' && stats.overseasActive>0 && (
                        <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {stats.overseasActive > 9 ? '9+' : stats.overseasActive}
                        </span>
                      )}
                      {item.key==='fat' && stats.fatUpcoming>0 && (
                        <span className="ml-auto w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {stats.fatUpcoming > 9 ? '9+' : stats.fatUpcoming}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-[150] lg:hidden bg-white border-t border-slate-200 flex items-stretch"
          style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
          {navItems.slice(0,5).map(item => (
            <button key={item.key} type="button" onClick={()=>setActivePage(item.key)}
              onTouchStart={() => preloadPageChunk(item.key)}
              onMouseEnter={() => preloadPageChunk(item.key)}
              aria-current={activePage===item.key?'page':undefined}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition relative
                ${activePage===item.key?'text-[#005A9E]':'text-slate-400'}`}>
              {activePage===item.key && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#005A9E] rounded-b-full" />}
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] font-semibold truncate max-w-[52px]">{item.label}</span>
              {item.key==='overseas' && stats.overseasActive>0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">{stats.overseasActive}</span>
              )}
              {item.key==='fat' && stats.fatUpcoming>0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                  {stats.fatUpcoming > 9 ? '9+' : stats.fatUpcoming}
                </span>
              )}
            </button>
          ))}
          <button type="button" onClick={()=>setDrawerOpen(true)}
            aria-label={tr('Menu lainnya', 'More navigation')}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition
              ${navItems.slice(5).some(n=>n.key===activePage)?'text-[#005A9E]':'text-slate-400'}`}>
            <span className="text-lg leading-none">
              {iconStyleEffective === 'vibrant' && fluentIconsReady ? (
                <Icon icon={FLUENT_NAV.more} width={18} height={18} className="flex-shrink-0" aria-hidden />
              ) : (
                <Ellipsis size={16} />
              )}
            </span>
            <span className="text-[9px] font-semibold">Lainnya</span>
          </button>
        </nav>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">

          <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-lg">{navItems.find(n=>n.key===activePage)?.icon}</span>
              <span className="font-bold text-slate-800 text-sm">{navItems.find(n=>n.key===activePage)?.label}</span>
              {activePage==='dashboard' && (
                <span className="text-xs text-slate-400">· {filteredEmps.length} karyawan</span>
              )}
            </div>
            {activePage==='dashboard' && (
              <div className="hidden sm:flex items-center gap-2">
                <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E] min-w-[150px]">
                  <option value="">{tr('Semua Departemen', 'All Departments')}</option>
                  {activeDepts.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"><Search size={12} /></span>
                  <input className="w-40 h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E] transition"
                    placeholder={tr('Cari karyawan…', 'Search employee…')} value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
                </div>
              </div>
            )}
            {activePage==='overseas' && (
              <div className="hidden sm:flex items-center gap-2">
                <select value={ovsFilter} onChange={e=>setOvsFilter(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none">
                  <option value="">{tr('Semua Status/Tipe', 'All Status/Types')}</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">{tr('Selesai', 'Completed')}</option>
                  <option value="Commissioning">Commissioning</option>
                  <option value="Service">Service</option>
                  <option value="Mengurus Visa">{tr('Mengurus Visa', 'Visa Processing')}</option>
                </select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"><Search size={12} /></span>
                  <input className="w-36 h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]"
                    placeholder={tr('Cari nama/proyek…', 'Search name/project…')} value={ovsSearch} onChange={e=>setOvsSearch(e.target.value)} />
                </div>
                {can(currentUser.role, 'write') && (
                  <button onClick={()=>{setOvsEntry(null);setOvsOpen(true);}}
                    className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                    <span className="inline-flex items-center gap-1"><Plus size={12} /> {tr('Tambah', 'Add')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <PageErrorBoundary activeKey={activePage} onReset={() => setActivePage('dashboard')}>
              {activePage === 'dashboard' && (
                <Suspense fallback={<div className="flex-1 min-h-0 p-4 text-sm text-slate-500">{tr('Memuat dashboard...', 'Loading dashboard...')}</div>}>
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <LazyDashboardPage {...dashboardPageProps} />
                  </div>
                </Suspense>
              )}

              {activePage !== 'dashboard' && (
                <Suspense fallback={<div className="flex-1 min-h-0 p-4 text-sm text-slate-500">{tr('Memuat halaman...', 'Loading page...')}</div>}>
                  <MainContentRouter
                    activePage={activePage as RoutedPage}
                    currentUserRole={currentUser.role}
                    showUsersPage={can(currentUser.role, 'manageUsers') || true}
                    leavePageProps={leavePageProps}
                    izinPageProps={izinPageProps}
                    chatPageProps={chatPageProps}
                    historyPageProps={historyPageProps}
                    overseasPageProps={overseasPageProps}
                    fatPageProps={fatPageProps}
                    calendarPageProps={calendarPageProps}
                    analyticsPageProps={analyticsPageProps}
                    attendancePageProps={attendancePageProps}
                    todoPageProps={todoPageProps}
                    overseasSummaryPageProps={overseasSummaryPageProps}
                    approvalsPageProps={approvalsPageProps}
                    aboutPageProps={aboutPageProps}
                    configPageProps={configPageProps}
                    usersPageProps={usersPageProps}
                  />
                </Suspense>
              )}
            </PageErrorBoundary>
          </div>

          <div className="app-shell-muted h-7 bg-[#E8EDF2] border-t border-slate-300 flex items-center justify-between px-4 flex-shrink-0">
            <span className="text-[11px] font-semibold text-[#005A9E] truncate" style={{fontFamily:"'JetBrains Mono',monospace"}}>{statusTxt}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:block ml-2">
              {config.companyName} · {APP_LOCATION} · {APP_FULL_VERSION} · {currentUser.displayName} ({roleLabel[currentUser.role]})
            </span>
          </div>

          <footer className="hidden sm:block w-full border-t border-slate-200 bg-white/95 text-center py-3 text-[11px] text-slate-500">
            {APP_DEVELOPER_CREDIT} · {APP_FULL_VERSION}
          </footer>
        </div>
      </div>

      <Suspense fallback={null}>
        <AppOverlays
          canWrite={can(currentUser.role, 'write')}
          activePage={activePage}
          onOpenOverseas={() => { setOvsEntry(null); setOvsOpen(true); }}
          onOpenFat={() => { setFatEntry(null); setFatOpen(true); }}
          onGoLeaveFromHistory={() => setActivePage('leave')}
          ctxOpen={ctxOpen}
          ctxEmpId={ctxEmpId}
          ctxPos={ctxPos}
          canEditContextEmployee={!!(ctxEmpId && canEditEmployeeRecord(currentUser, employees.find((e) => e.id === ctxEmpId)?.nama))}
          canDeleteContextEmployee={can(currentUser.role, 'delete')}
          onContextEdit={() => { if (!ctxEmpId) return; setCtxOpen(false); doOpenEdit(ctxEmpId); setCtxEmpId(null); }}
          onContextReset={() => { if (!ctxEmpId) return; setCtxOpen(false); doResetJatah(ctxEmpId); setCtxEmpId(null); }}
          onContextDelete={() => { if (!ctxEmpId) return; setCtxOpen(false); doDelete(ctxEmpId); setCtxEmpId(null); }}
          chatFabOpen={chatFabOpen}
          chatFabSide={chatFabSide}
          onOpenChatFab={() => setChatFabOpen(true)}
          personalUnreadCount={personalUnreadCount}
          floatingChatProps={floatingChatProps}
        />

        <ConfirmDialog open={confirm.open} title={confirm.title} msg={confirm.msg} danger={confirm.danger}
          onOk={()=>{confirm.cb?.();setConfirm(p=>({...p,open:false,cb:null}));}}
          onCancel={()=>setConfirm(p=>({...p,open:false,cb:null}))} />
        <EditEmployeeDialog
          open={editOpen}
          employee={editEmp}
          departments={activeDepts}
          visaOptions={activeVisaOptions}
          onSave={doSaveEdit}
          submitLabel={currentUser?.role === 'admin' ? 'Kirim untuk Approval' : 'Simpan'}
          bannerText={currentUser?.role === 'admin' ? 'Perubahan data karyawan oleh Admin wajib melalui approval Super Admin.' : undefined}
          onClose={()=>{setEditOpen(false);setEditEmp(null);}} />
        <OverseasDialog open={ovsOpen} entry={ovsEntry} employees={employees} onSave={doSaveOverseas}
          onClose={()=>{setOvsOpen(false);setOvsEntry(null);}} />
        <LeaveLogDialog
          open={leaveLogOpen}
          log={leaveLogEntry}
          employees={employees}
          currentUser={currentUser}
          onSave={doManageLeaveLog}
          onClose={()=>{setLeaveLogOpen(false);setLeaveLogEntry(null);}}
        />
        <FATDialog 
          open={fatOpen} 
          entry={fatEntry}
          automationEngineers={employees.filter(e => e.departemen==='Electrical & Automation' && (e.posisi||'').toLowerCase().includes('automation') && !(e.posisi||'').toLowerCase().includes('manager') && !(e.posisi||'').toLowerCase().includes('head') &&(!e.gender || e.gender === 'L'))}
          fatEntries={fatEntries}
          onSave={doSaveFAT} 
          onClose={()=>{setFatOpen(false);setFatEntry(null);}}
          toast={toast}
        />
        <AddEmployeeModal
          open={addEmpOpen}
          departments={activeDepts}
          visaOptions={activeVisaOptions}
          onSave={doSaveEmployeeFromModal}
          onClose={()=>setAddEmpOpen(false)}
        />
        <CutiModal
          open={cutiModalOpen}
          employees={employees}
          currentUser={currentUser}
          onSave={doLogCutiFromModal}
          onClose={()=>setCutiModalOpen(false)}
        />
        <ToastContainer toasts={toasts} onRemove={id=>setToasts(p=>p.filter(t=>t.id!==id))} />
      </Suspense>


      <style>{appThemeStyles}</style>
      </div>
    </I18nProvider>
  );
};

export default HRLeaveManagement;