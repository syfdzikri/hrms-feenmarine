import { useI18n } from '../../i18n/store';
import { CalendarDays, ClipboardList, FileCog, Search, Pencil } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { AdminLeaveRestrictionNotice } from './AdminLeaveRestrictionNotice';

interface LeaveLogLite {
  id: string;
  nama: string;
  departemen: string;
  tglCuti: string;
  timestamp: string;
  status?: 'used' | 'planned';
  leaveStatus?: 'planned' | 'completed' | 'canceled' | 'revised';
  days?: number;
  createdBy?: string;
  editedAt?: string;
  originalTglCuti?: string;
  revisionNote?: string;
}

interface UserLite {
  linkedEmployeeName?: string;
  role: 'superadmin' | 'admin' | 'viewer';
}

export function LeaveHistoryTab({
  searchQ,
  setSearchQ,
  statusFilter,
  setStatusFilter,
  leaveLogs,
  filteredLeaveLogs,
  leaveStatusBadge,
  currentUser,
  canEditOwnLeave,
  onManage,
}: {
  searchQ: string;
  setSearchQ: (v: string) => void;
  statusFilter: 'all' | 'planned' | 'completed' | 'canceled';
  setStatusFilter: (v: 'all' | 'planned' | 'completed' | 'canceled') => void;
  leaveLogs: LeaveLogLite[];
  filteredLeaveLogs: LeaveLogLite[];
  leaveStatusBadge: (log: LeaveLogLite) => { label: string; cls: string };
  currentUser: UserLite;
  canEditOwnLeave: (currentUser: UserLite, empNama: string) => boolean;
  onManage: (log: LeaveLogLite) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <AdminLeaveRestrictionNotice role={currentUser.role} linkedEmployeeName={currentUser.linkedEmployeeName} />
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
          <input
            className="w-48 h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A9E]"
            placeholder={t('Cari nama…', 'Search name…')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'planned', 'completed', 'canceled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold transition ${statusFilter === f ? 'bg-[#005A9E] text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              {f === 'all' ? t('Semua', 'All') : f === 'planned' ? t('Rencana', 'Planned') : f === 'completed' ? t('Selesai', 'Completed') : t('Batal', 'Canceled')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs">
        <span><span className="font-bold text-blue-600">{leaveLogs.filter((l) => l.leaveStatus === 'planned' || l.status === 'planned').length}</span> <span className="text-slate-400">{t('Rencana', 'Planned')}</span></span>
        <span><span className="font-bold text-emerald-600">{leaveLogs.filter((l) => l.leaveStatus === 'completed' || l.status === 'used').length}</span> <span className="text-slate-400">{t('Selesai', 'Completed')}</span></span>
        <span><span className="font-bold text-red-500">{leaveLogs.filter((l) => l.leaveStatus === 'canceled').length}</span> <span className="text-slate-400">{t('Dibatalkan', 'Canceled')}</span></span>
        <span><span className="font-bold text-[#005A9E]">{leaveLogs.reduce((s, l) => s + (l.days || 0), 0)}</span> <span className="text-slate-400">{t('Total Hari', 'Total Days')}</span></span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[t('Tanggal Catat', 'Recorded Date'), t('Karyawan', 'Employee'), t('Departemen', 'Department'), t('Tanggal Cuti', 'Leave Date'), t('Durasi', 'Duration'), t('Status', 'Status'), t('Dicatat Oleh', 'Recorded By'), t('Aksi', 'Actions')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeaveLogs.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400"><div className="text-4xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={ClipboardList} size={32} /></div><p className="text-sm">{t('Belum ada riwayat cuti', 'No leave history yet')}</p></td></tr>
              ) : filteredLeaveLogs.map((log, i) => {
                const { label: slabel, cls: scls } = leaveStatusBadge(log);
                const isCanceled = log.leaveStatus === 'canceled';
                const canEdit = canEditOwnLeave(currentUser, log.nama);
                return (
                  <tr key={log.id} className={`border-b border-slate-100 group hover:bg-slate-50 transition ${isCanceled ? 'opacity-60' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                      {log.timestamp?.slice(0, 10)}
                      {log.editedAt && <div className="text-[9px] text-purple-400 inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={10} variant="toolbar" /> {log.editedAt?.slice(0, 10)}</div>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.nama}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.departemen || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {log.tglCuti || '-'}
                      {log.originalTglCuti && <div className="text-[9px] text-slate-400 line-through">{log.originalTglCuti}</div>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#005A9E]">{log.days ? `${log.days}h` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${scls}`}>{slabel}</span>
                      {log.revisionNote && <div className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={log.revisionNote}>"{log.revisionNote}"</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{log.createdBy || '-'}</td>
                    <td className="px-4 py-3">
                      {canEdit && !isCanceled && (
                        <button
                          onClick={() => onManage(log)}
                          className="opacity-0 group-hover:opacity-100 transition h-7 px-2.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold hover:bg-amber-100"
                          title={t('Kelola', 'Manage')}
                        >
                          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={FileCog} size={11} variant="toolbar" /> {t('Kelola', 'Manage')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-2">
        {filteredLeaveLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="text-4xl mb-3 inline-flex text-slate-300"><ContentLucideIcon icon={ClipboardList} size={32} /></div><p className="text-sm">{t('Belum ada riwayat cuti', 'No leave history yet')}</p>
          </div>
        ) : filteredLeaveLogs.map((log) => {
          const { label: slabel, cls: scls } = leaveStatusBadge(log);
          const isCanceled = log.leaveStatus === 'canceled';
          const canEdit = canEditOwnLeave(currentUser, log.nama);
          return (
            <div key={log.id} className={`bg-white border rounded-xl p-3 ${isCanceled ? 'opacity-60 border-slate-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{log.nama}</div>
                  <div className="text-[10px] text-slate-400">{log.departemen}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${scls}`}>{slabel}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={CalendarDays} size={11} variant="toolbar" /> {log.tglCuti || '-'}</span>
                {log.days && <span className="font-bold text-[#005A9E]">{log.days} {t('hari', 'days')}</span>}
                <span className="text-[10px] text-slate-400 ml-auto">{log.timestamp?.slice(0, 10)}</span>
              </div>
              {canEdit && !isCanceled && (
                <button
                  onClick={() => onManage(log)}
                  className="w-full h-8 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition mt-1"
                >
                  <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={FileCog} size={11} variant="toolbar" /> {t('Kelola Cuti', 'Manage Leave')}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
