import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, ClipboardList, History, Wallet } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { LeaveApplyTab } from '../../components/leave/LeaveApplyTab';
import { AdminLeaveRestrictionNotice } from '../../components/leave/AdminLeaveRestrictionNotice';
import { LeaveBalanceTab } from '../../components/leave/LeaveBalanceTab';
import { LeaveHistoryTab } from '../../components/leave/LeaveHistoryTab';
import { LeaveStatusTab } from '../../components/leave/LeaveStatusTab';
import { useI18n } from '../../i18n/store';
import type { AppUser as AppUserLite, Employee as EmployeeLite, LogEntry as LogEntryLite, ToastKind } from '../../types';
import { todayStr } from '../../utils/common';
import { leaveStatusBadge, parseLeaveRange, statusTag } from '../../utils/leave';

const can = (role: AppUserLite['role'] | null, action: 'write' | 'delete' | 'config' | 'manageUsers') => {
  if (!role) return false;
  if (role === 'superadmin') return true;
  if (role === 'admin') return action === 'write';
  return false;
};

export function LeavePage({
  employees,
  logs,
  currentUser,
  departments,
  onLogCuti,
  onResetJatah,
  onEditJatah,
  fbUpdateLog,
  fbSaveEmployee,
  toast,
  canEditEmployeeRecord,
  canEditOwnLeave,
  renderLeaveLogDialog,
}: {
  employees: EmployeeLite[];
  logs: LogEntryLite[];
  currentUser: AppUserLite;
  departments: string[];
  onLogCuti: () => void;
  onResetJatah: (id: string) => void;
  onEditJatah: (id: string) => void;
  fbUpdateLog: (entry: LogEntryLite) => Promise<void>;
  fbSaveEmployee: (e: EmployeeLite) => Promise<void>;
  toast: (msg: string, kind?: ToastKind) => void;
  canEditEmployeeRecord: (user: AppUserLite | null, empNama?: string | null) => boolean;
  canEditOwnLeave: (currentUser: AppUserLite | null, empNama: string) => boolean;
  renderLeaveLogDialog: (ctx: {
    open: boolean;
    log: LogEntryLite | null;
    employees: EmployeeLite[];
    currentUser: AppUserLite;
    onClose: () => void;
    onSave: (updatedLog: LogEntryLite, updatedEmp?: EmployeeLite | null, action?: string) => Promise<void>;
  }) => ReactNode;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'apply' | 'status' | 'balance' | 'history'>('status');
  const [searchQ, setSearchQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'completed' | 'canceled'>('all');
  const [leaveLogEntry, setLeaveLogEntry] = useState<LogEntryLite | null>(null);
  const [leaveLogOpen, setLeaveLogOpen] = useState(false);

  const leaveLogs = useMemo(() => logs.filter((l) =>
    l.logType === 'leave' ||
    (l.logType === undefined && (l.status === 'used' || l.status === 'planned') &&
      !['ditambahkan', 'diperbarui', 'reset', 'accrual', 'auto'].some((k) => l.keterangan?.toLowerCase().includes(k)))
  ), [logs]);

  const filteredLeaveLogs = useMemo(() => leaveLogs
    .filter((l) => {
      if (statusFilter !== 'all') {
        const ls = l.leaveStatus || (l.status === 'used' ? 'completed' : l.status === 'planned' ? 'planned' : null);
        if (statusFilter === 'completed' && ls !== 'completed') return false;
        if (statusFilter === 'planned' && ls !== 'planned') return false;
        if (statusFilter === 'canceled' && ls !== 'canceled') return false;
      }
      if (searchQ && !l.nama.toLowerCase().includes(searchQ.toLowerCase()) && !l.departemen?.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [leaveLogs, statusFilter, searchQ]);

  const stats = useMemo(() => ({
    total: employees.length,
    available: employees.filter((e) => (e.jatahAwal - e.terpakai - (e.rencana || 0)) > 3).length,
    low: employees.filter((e) => { const s = e.jatahAwal - e.terpakai - (e.rencana || 0); return s > 0 && s <= 3; }).length,
    exhausted: employees.filter((e) => (e.jatahAwal - e.terpakai - (e.rencana || 0)) <= 0).length,
    planned: leaveLogs.filter((l) => l.leaveStatus === 'planned' || l.status === 'planned').length,
    completed: leaveLogs.filter((l) => l.leaveStatus === 'completed' || l.status === 'used').length,
    canceled: leaveLogs.filter((l) => l.leaveStatus === 'canceled').length,
    totalDays: leaveLogs.reduce((s, l) => s + (l.days || 0), 0),
  }), [employees, leaveLogs]);

  const filteredEmps = useMemo(() => employees
    .map((e) => ({ ...e, sisa: e.jatahAwal - e.terpakai - (e.rencana || 0) }))
    .filter((e) => (!deptFilter || e.departemen === deptFilter) && (!searchQ || e.nama.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => a.nama.localeCompare(b.nama)), [employees, deptFilter, searchQ]);

  const onLeaveToday = useMemo(() => {
    const today = todayStr();
    return leaveLogs.filter((l) => {
      if (l.leaveStatus === 'canceled') return false;
      const range = parseLeaveRange(l.tglCuti);
      if (!range) return false;
      return today >= range.start && today <= range.end;
    });
  }, [leaveLogs]);

  const canWrite = can(currentUser.role, 'write');
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Manajemen Cuti</h1>
            <p className="text-xs text-slate-400 mt-0.5">{t('Kelola jatah, pengajuan, dan riwayat cuti karyawan', 'Manage employee leave balances, requests, and history')}</p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={onLogCuti} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"><ContentLucideIcon icon={ClipboardList} size={15} variant="toolbar" className="text-white" /> {t('Pengajuan Cuti', 'Leave Request')}</button>
            </div>
          )}
        </div>
        <div className="mt-3">
          <AdminLeaveRestrictionNotice role={currentUser.role} linkedEmployeeName={currentUser.linkedEmployeeName} />
        </div>

        <div className="mt-4 sm:hidden -mx-1 px-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {[
              { v: stats.total, l: t('Total Karyawan', 'Total Employees'), c: 'text-[#005A9E]', bg: 'bg-blue-50 border-blue-100' },
              { v: stats.available, l: t('Cuti Aman', 'Healthy Leave'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
              { v: stats.low, l: t('Sisa ≤ 3 Hari', 'Remaining ≤ 3 Days'), c: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
              { v: stats.exhausted, l: t('Cuti Habis', 'No Leave Left'), c: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              { v: stats.planned, l: t('Rencana', 'Planned'), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
              { v: stats.completed, l: t('Selesai', 'Completed'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
              { v: stats.totalDays, l: t('Total Hari', 'Total Days'), c: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
            ].map(({ v, l, c, bg }) => (
              <div key={l} className={`border rounded-xl px-3 py-2 min-w-[122px] ${bg}`}>
                <div className={`text-lg font-extrabold leading-none ${c}`}>{v}</div>
                <div className="text-[10px] text-slate-500 mt-1 leading-tight">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
          {[
            { v: stats.total, l: t('Total Karyawan', 'Total Employees'), c: 'text-[#005A9E]', bg: 'bg-blue-50 border-blue-100' },
            { v: stats.available, l: t('Cuti Aman', 'Healthy Leave'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
            { v: stats.low, l: t('Sisa ≤ 3 Hari', 'Remaining ≤ 3 Days'), c: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
            { v: stats.exhausted, l: t('Cuti Habis', 'No Leave Left'), c: 'text-red-600', bg: 'bg-red-50 border-red-100' },
            { v: stats.planned, l: t('Rencana', 'Planned'), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
            { v: stats.completed, l: t('Selesai', 'Completed'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
            { v: stats.totalDays, l: t('Total Hari', 'Total Days'), c: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
          ].map(({ v, l, c, bg }) => (
            <div key={l} className={`border rounded-xl p-2.5 text-center ${bg}`}>
              <div className={`text-xl font-extrabold ${c}`}>{v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mt-4 bg-slate-100 rounded-xl p-1 w-full max-w-full sm:w-fit overflow-x-auto">
          {([
            { key: 'status' as const, Icon: BarChart3, label: t('Status Cuti', 'Leave Status') },
            { key: 'apply' as const, Icon: ClipboardList, label: t('Pengajuan', 'Requests') },
            { key: 'balance' as const, Icon: Wallet, label: t('Saldo Cuti', 'Leave Balance') },
            { key: 'history' as const, Icon: History, label: t('Riwayat', 'History') },
          ]).map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-white text-[#005A9E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <span><ContentLucideIcon icon={tab.Icon} size={14} variant="toolbar" /></span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-mobile-strong p-4 sm:p-6 pb-6">
        {activeTab === 'status' && (
          <LeaveStatusTab
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            deptFilter={deptFilter}
            setDeptFilter={setDeptFilter}
            departments={departments}
            filteredEmps={filteredEmps}
            statusTag={statusTag}
            leaveLogs={leaveLogs}
            canWrite={canWrite}
            currentUser={currentUser}
            canEditEmployeeRecord={canEditEmployeeRecord}
            onLogCuti={onLogCuti}
            onEditJatah={onEditJatah}
            onResetJatah={onResetJatah}
          />
        )}

        {activeTab === 'apply' && (
          <LeaveApplyTab
            canWrite={canWrite}
            onLogCuti={onLogCuti}
            departments={departments}
            employees={employees}
            onLeaveToday={onLeaveToday}
          />
        )}

        {activeTab === 'balance' && (
          <LeaveBalanceTab
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            deptFilter={deptFilter}
            setDeptFilter={setDeptFilter}
            departments={departments}
            filteredEmps={filteredEmps}
            statusTag={statusTag}
            canWrite={canWrite}
            currentUser={currentUser}
            canEditEmployeeRecord={canEditEmployeeRecord}
            onLogCuti={onLogCuti}
            onEditJatah={onEditJatah}
            onResetJatah={onResetJatah}
          />
        )}

        {activeTab === 'history' && (
          <LeaveHistoryTab
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            leaveLogs={leaveLogs}
            filteredLeaveLogs={filteredLeaveLogs}
            leaveStatusBadge={leaveStatusBadge}
            currentUser={currentUser}
            canEditOwnLeave={canEditOwnLeave}
            onManage={(log) => {
              setLeaveLogEntry(log as LogEntryLite);
              setLeaveLogOpen(true);
            }}
          />
        )}
      </div>

      {renderLeaveLogDialog({
        open: leaveLogOpen,
        log: leaveLogEntry,
        employees,
        currentUser,
        onClose: () => { setLeaveLogOpen(false); setLeaveLogEntry(null); },
        onSave: async (updatedLog, updatedEmp) => {
          await fbUpdateLog(updatedLog);
          if (updatedEmp) await fbSaveEmployee(updatedEmp);
          setLeaveLogOpen(false);
          setLeaveLogEntry(null);
          toast(t('Log cuti berhasil diperbarui.', 'Leave log updated successfully.'));
        },
      })}
    </div>
  );
}
