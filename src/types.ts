export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
  firebaseUid?: string;
  email?: string;
  linkedEmployeeName?: string;
  canEditEmployeeData?: boolean;
}

export interface Employee {
  id: string;
  nama: string;
  departemen: string;
  tglKontrak: string;
  jatahAwal: number;
  terpakai: number;
  rencana: number;
  lastAccrualMonth?: string;
  posisi?: string;
  gender?: 'L' | 'P';
  visaTypes?: string[];
  visaActive?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  nama: string;
  departemen: string;
  tglCuti: string;
  keterangan: string;
  status?: 'used' | 'planned';
  logType?: 'leave' | 'izin' | 'activity';
  leaveStatus?: 'planned' | 'completed' | 'canceled' | 'revised';
  days?: number;
  createdBy?: string;
  editedBy?: string;
  editedAt?: string;
  canceledBy?: string;
  canceledAt?: string;
  revisionNote?: string;
  originalTglCuti?: string;
}

export interface OverseasEntry {
  id: string;
  nama: string;
  departemen: string;
  tipe: 'Commissioning' | 'Service' | 'Mengurus Visa' | 'Other';
  projectType?: 'EGCS' | 'IGG' | 'IGS' | 'N2 PSA' | 'N2 Membrane' | 'Other';
  projectNo: string;
  lokasi: string;
  tglMulai: string;
  tglSelesai: string;
  keterangan?: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'completed' | 'upcoming';
}

/** `vibrant` = Microsoft Fluent Color icons (Iconify) di navigasi & aksen UI; `default` = Lucide outline. */
export type IconStyle = 'default' | 'vibrant';
export type DateTimeFormat = 'id_wib' | 'iso';

export interface AppConfig {
  companyName: string;
  monthlyAccrualDays: number;
  maxLeaveBalance: number;
  autoLogoutMinutes: number;
  izinCutoffDay?: number;
  izinMaxPerPeriode?: number;
  attendanceEnabled?: boolean;
  attendanceLockEnabled?: boolean;
  attendanceCenterLat?: number;
  attendanceCenterLng?: number;
  attendanceRadiusMeters?: number;
  attendanceMinAccuracyMeters?: number;
  attendanceShiftEnforced?: boolean;
  attendanceShiftStart?: string;
  attendanceShiftEnd?: string;
  attendanceShiftToleranceMinutes?: number;
  dateTimeFormat?: DateTimeFormat;
  departments: string[];
  visaOptions?: string[];
  iconStyle?: IconStyle;
  todoEnabled?: boolean;
  todoKanbanEnabled?: boolean;
  todoSubtaskEnabled?: boolean;
  todoReminderEnabled?: boolean;
  todoRecurringEnabled?: boolean;
  todoActivityEnabled?: boolean;
  todoDarkModeEnabled?: boolean;
  todoTaskDeleteConfirmEnabled?: boolean;
  fatEnabled?: boolean;
  analyticsEnabled?: boolean;
}

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  createdBy: string;
  createdAt: string;
  type: 'checkin' | 'checkout';
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  distanceFromCenterMeters?: number;
  withinAllowedArea: boolean;
  punctualityStatus?: 'on_time' | 'late' | 'early_leave';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  geolocationTimestampMs?: number;
  userAgent?: string;
}

export interface FATEntry {
  id: string;
  projectType?: 'EGCS' | 'IGG' | 'IGS' | 'N2 PSA' | 'N2 Membrane';
  projectNo: string;
  fatClass: 'ClassNK' | 'DNV' | 'LR' | 'BV' | 'ABS' | 'RINA';
  fatDateTime: string;
  assignedTo: string;
  keterangan?: string;
  createdAt: string;
  createdBy: string;
}

export interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: Partial<Employee>;
  before: Partial<Employee>;
  decisionBy?: string;
  decisionAt?: string;
  decisionNote?: string;
}

export interface OnlineUser {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  lastSeen: string;
  loginTime: string;
  currentPage?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  recipientId?: string;
  recipientName?: string;
  quotedMessageId?: string;
  quotedSenderName?: string;
  quotedText?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetUserId?: string;
  targetRole?: UserRole;
  relatedId?: string;
  action?: string;
}

export interface IzinEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  tipe: 'terlambat' | 'pulang_cepat' | 'sakit';
  tanggal: string;
  jamMasukSesungguhnya?: string;
  jamPulangLebihAwal?: string;
  mcRef?: string;
  alasan: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionNote?: string;
  periode: string;
}

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
export interface ToastItem { id: string; msg: string; kind: ToastKind; }
export type SortCol = 'nama' | 'departemen' | 'tglKontrak' | 'jatahAwal' | 'terpakai' | 'rencana' | 'sisa';
export type HistSortCol = 'timestamp' | 'nama' | 'departemen' | 'tglCuti' | 'keterangan' | '';
export type ActivePage = 'dashboard' | 'history' | 'overseas' | 'overseasSummary' | 'fat' | 'calendar' | 'analytics' | 'attendance' | 'todo' | 'config' | 'users' | 'approvals' | 'about' | 'leave' | 'izin' | 'chat';