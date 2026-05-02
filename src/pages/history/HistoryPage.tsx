import { useMemo } from 'react';
import { ClipboardList, Clock3, FileText, Trash2, Pencil, Settings2 } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import type { AppUser, HistSortCol, LogEntry } from '../../types';
import { useI18n } from '../../i18n/store';
import { can } from '../../utils/permissions';
import { leaveStatusBadge } from '../../utils/leave';
import { translateLegacyText } from '../../utils/legacyI18n';
import { fmtDateTime } from '../../utils/common';

export function HistoryPage({
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
}: {
  logs: LogEntry[];
  logTab: 'leave' | 'izin' | 'activity';
  setLogTab: (tab: 'leave' | 'izin' | 'activity') => void;
  leaveLogFilter: 'all' | 'planned' | 'completed' | 'canceled';
  setLeaveLogFilter: (filter: 'all' | 'planned' | 'completed' | 'canceled') => void;
  currentUser: AppUser;
  doClearHistory: () => void;
  canEditOwnLeave: (currentUser: AppUser | null, empNama: string) => boolean;
  setLeaveLogEntry: (log: LogEntry | null) => void;
  setLeaveLogOpen: (open: boolean) => void;
  showConfirm: (title: string, msg: string, danger: boolean, cb: () => void | Promise<void>) => void;
  fbDeleteLog: (id: string) => Promise<void>;
  toast: (msg: string, kind?: 'success' | 'error' | 'warning' | 'info') => void;
  hArr: (col: HistSortCol) => string;
  handleHistSort: (col: HistSortCol) => void;
}) {
  const { t, language } = useI18n();
  const leaveLogs = useMemo(
    () => logs.filter((l) => l.logType === 'leave' || (l.logType === undefined && (l.status === 'used' || l.status === 'planned') && !['ditambahkan', 'diperbarui', 'reset', 'accrual', 'auto'].some((k) => l.keterangan?.toLowerCase().includes(k)))),
    [logs],
  );
  const izinLogs = useMemo(() => logs.filter((l) => l.logType === 'izin'), [logs]);
  const filteredIzinLogs = useMemo(
    () => izinLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [izinLogs],
  );
  const activityLogs = useMemo(
    () => logs.filter((l) => l.logType === 'activity' || (l.logType === undefined && ['ditambahkan', 'diperbarui', 'reset', 'accrual', 'auto'].some((k) => l.keterangan?.toLowerCase().includes(k)))),
    [logs],
  );

  const filteredLeaveLogs = useMemo(
    () => leaveLogs
      .filter((l) => leaveLogFilter === 'all' || l.leaveStatus === leaveLogFilter || (!l.leaveStatus && leaveLogFilter === 'completed' && l.status === 'used') || (!l.leaveStatus && leaveLogFilter === 'planned' && l.status === 'planned'))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [leaveLogs, leaveLogFilter],
  );
  const filteredActivityLogs = useMemo(() => activityLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [activityLogs]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-4 gap-3">
      <div className="flex-shrink-0 flex gap-1 bg-slate-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        <button onClick={() => setLogTab('leave')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${logTab === 'leave' ? 'bg-white text-[#005A9E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ContentLucideIcon icon={ClipboardList} size={14} variant="toolbar" /> {t('Log Cuti', 'Leave Logs')}
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${logTab === 'leave' ? 'bg-[#005A9E] text-white' : 'bg-slate-300 text-slate-600'}`}>{leaveLogs.length}</span>
        </button>
        <button onClick={() => setLogTab('izin')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${logTab === 'izin' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ContentLucideIcon icon={Clock3} size={14} variant="toolbar" /> {t('Log Izin', 'Permit Logs')}
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${logTab === 'izin' ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-600'}`}>{izinLogs.length}</span>
        </button>
        <button onClick={() => setLogTab('activity')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${logTab === 'activity' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ContentLucideIcon icon={FileText} size={14} variant="toolbar" /> {t('Log Aktivitas', 'Activity Logs')}
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${logTab === 'activity' ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-600'}`}>{activityLogs.length}</span>
        </button>
      </div>

      {logTab === 'leave' && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2 justify-between flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Log Cuti', 'Leave Logs')}</span>
              {(['all', 'planned', 'completed', 'canceled'] as const).map((f) => (
                <button key={f} onClick={() => setLeaveLogFilter(f)} className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold transition ${leaveLogFilter === f ? 'bg-[#005A9E] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {f === 'all' ? t('Semua', 'All') : f === 'planned' ? t('Rencana', 'Planned') : f === 'completed' ? t('Selesai', 'Completed') : t('Dibatalkan', 'Canceled')}
                </button>
              ))}
            </div>
            {can(currentUser.role, 'delete') && (
              <button onClick={doClearHistory} className="h-7 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition inline-flex items-center gap-1 group/btn"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" className="group-hover/btn:text-white" /> {t('Bersihkan', 'Clear')}</button>
            )}
          </div>
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-4 text-[11px] flex-shrink-0">
            {[
              { v: leaveLogs.filter((l) => l.leaveStatus === 'planned' || l.status === 'planned').length, l: t('Rencana', 'Planned'), c: 'text-blue-600' },
              { v: leaveLogs.filter((l) => l.leaveStatus === 'completed' || l.status === 'used').length, l: t('Selesai', 'Completed'), c: 'text-emerald-600' },
              { v: leaveLogs.filter((l) => l.leaveStatus === 'canceled').length, l: t('Dibatalkan', 'Canceled'), c: 'text-red-500' },
              { v: leaveLogs.reduce((s, l) => s + (l.days || 0), 0), l: t('Total Hari', 'Total Days'), c: 'text-[#005A9E] font-extrabold' },
            ].map(({ v, l, c }) => <span key={l}><span className={`font-bold ${c}`}>{v}</span> <span className="text-slate-400">{l}</span></span>)}
          </div>
          <div className="overflow-auto flex-1 min-h-0 hidden sm:block overscroll-contain">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {[t('Waktu', 'Time'), t('Nama', 'Name'), t('Departemen', 'Department'), t('Tanggal Cuti', 'Leave Date'), t('Durasi', 'Duration'), t('Status', 'Status'), t('Dibuat Oleh', 'Created By'), t('Aksi', 'Actions')].map((h) => <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredLeaveLogs.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-400"><div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={ClipboardList} size={32} /></div><p className="text-sm">{t('Belum ada log cuti', 'No leave logs yet')}</p></td></tr>
                ) : filteredLeaveLogs.map((log, i) => {
                  const { label: slabel, cls: scls } = leaveStatusBadge(log);
                  const isCanceled = log.leaveStatus === 'canceled';
                  const canEdit = canEditOwnLeave(currentUser, log.nama);
                  return (
                    <tr key={log.id} className={`border-b border-slate-100 group ${isCanceled ? 'opacity-60' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-400" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fmtDateTime(log.timestamp)}{log.editedAt && <div className="text-[9px] text-purple-400 inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={10} variant="toolbar" /> {fmtDateTime(log.editedAt)}</div>}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{log.nama}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs hidden lg:table-cell">{log.departemen || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{log.tglCuti || '-'}{log.originalTglCuti && <div className="text-[9px] text-slate-400 line-through">{log.originalTglCuti}</div>}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[#005A9E]">{log.days ? `${log.days}h` : '-'}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${scls}`}>{slabel}</span>{log.canceledBy && <div className="text-[9px] text-slate-400 mt-0.5">{t('oleh', 'by')} {log.canceledBy}</div>}{log.revisionNote && <div className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={log.revisionNote}>"{translateLegacyText(log.revisionNote, language)}"</div>}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{log.createdBy || '-'}</td>
                      <td className="px-3 py-2.5"><div className="flex items-center gap-1">{canEdit && !isCanceled && <button onClick={() => { setLeaveLogEntry(log); setLeaveLogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition w-7 h-7 bg-amber-50 text-amber-600 rounded-lg text-xs hover:bg-amber-100 inline-flex items-center justify-center" title={t('Kelola', 'Manage')}><ContentLucideIcon icon={Settings2} size={12} variant="toolbar" /></button>}{currentUser.role === 'superadmin' && <button onClick={() => showConfirm(t('Hapus Log Cuti', 'Delete Leave Log'), `${t('Hapus log cuti', 'Delete leave log')} ${log.nama}?`, true, async () => { await fbDeleteLog(log.id); toast(t('Log cuti dihapus.', 'Leave log deleted.'), 'warning'); })} className="opacity-0 group-hover:opacity-100 transition w-7 h-7 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100 inline-flex items-center justify-center" title={t('Hapus log ini', 'Delete this log')}><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
            {filteredLeaveLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={ClipboardList} size={32} /></div>
                <p className="text-sm">{t('Belum ada log cuti', 'No leave logs yet')}</p>
              </div>
            ) : filteredLeaveLogs.map((log) => {
              const { label: slabel, cls: scls } = leaveStatusBadge(log);
              const isCanceled = log.leaveStatus === 'canceled';
              const canEdit = canEditOwnLeave(currentUser, log.nama);
              return (
                <div key={log.id} className={`rounded-xl border p-3 ${isCanceled ? 'opacity-60 bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{log.nama}</div>
                      <div className="text-[10px] text-slate-400">{log.departemen || '-'}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${scls}`}>{slabel}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    <div>{log.tglCuti || '-'}</div>
                    {log.originalTglCuti && <div className="text-[10px] text-slate-400 line-through">{log.originalTglCuti}</div>}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-[#005A9E] font-bold">{log.days ? `${log.days}h` : '-'}</span>
                    <span className="text-slate-400">{log.timestamp?.slice(0, 10)}</span>
                  </div>
                  {(log.canceledBy || log.revisionNote) && (
                    <div className="mt-1.5 text-[10px] text-slate-400 space-y-1">
                      {log.canceledBy && <div>{t('oleh', 'by')} {log.canceledBy}</div>}
                      {log.revisionNote && <div className="truncate" title={log.revisionNote}>"{translateLegacyText(log.revisionNote, language)}"</div>}
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                    {canEdit && !isCanceled && (
                      <button type="button" onClick={() => { setLeaveLogEntry(log); setLeaveLogOpen(true); }} className="h-8 px-2.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold inline-flex items-center gap-1">
                        <ContentLucideIcon icon={Settings2} size={12} variant="toolbar" /> {t('Kelola', 'Manage')}
                      </button>
                    )}
                    {currentUser.role === 'superadmin' && (
                      <button type="button" onClick={() => showConfirm(t('Hapus Log Cuti', 'Delete Leave Log'), `${t('Hapus log cuti', 'Delete leave log')} ${log.nama}?`, true, async () => { await fbDeleteLog(log.id); toast(t('Log cuti dihapus.', 'Leave log deleted.'), 'warning'); })} className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold inline-flex items-center gap-1">
                        <ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {logTab === 'izin' && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2 justify-between flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Log Izin', 'Permit Logs')} · {filteredIzinLogs.length} {t('entri', 'entries')}</span>
            </div>
            {currentUser.role === 'superadmin' && izinLogs.length > 0 && (
              <button
                onClick={() => showConfirm(t('Hapus Semua Log Izin', 'Delete All Permit Logs'), `${t('Hapus semua', 'Delete all')} ${izinLogs.length} ${t('log izin?', 'permit logs?')}`, true, async () => {
                  await Promise.all(izinLogs.map((l) => fbDeleteLog(l.id)));
                  toast(t('Semua log izin dihapus.', 'All permit logs deleted.'), 'warning');
                })}
                className="group/del h-7 px-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[11px] font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition"
              >
                <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" className="group-hover/del:text-white" /> {t('Hapus Semua', 'Delete All')}</span>
              </button>
            )}
          </div>
          <div className="overflow-auto flex-1 min-h-0 overscroll-contain">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {[t('Waktu', 'Time'), t('Nama', 'Name'), t('Departemen', 'Department'), t('Tanggal Izin', 'Permit Date'), t('Keterangan', 'Description'), ...(currentUser.role === 'superadmin' ? [t('Aksi', 'Actions')] : [])].map((h) => (
                    <th key={h} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIzinLogs.length === 0 ? (
                  <tr><td colSpan={currentUser.role === 'superadmin' ? 6 : 5} className="py-12 text-center text-slate-400"><div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={Clock3} size={32} /></div><p className="text-sm">{t('Belum ada log izin', 'No permit logs yet')}</p></td></tr>
                ) : filteredIzinLogs.map((log, i) => {
                  return (
                    <tr key={log.id} className={`border-b border-slate-100 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-400" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fmtDateTime(log.timestamp)}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{log.nama}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs hidden lg:table-cell">{log.departemen || '-'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">{log.tglCuti || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs">{log.keterangan ? translateLegacyText(log.keterangan, language) : '-'}</td>
                      {currentUser.role === 'superadmin' && (
                        <td className="px-3 py-2.5">
                          <button onClick={() => showConfirm(t('Hapus Log Izin', 'Delete Permit Log'), `${t('Hapus log izin', 'Delete permit log')} ${log.nama}?`, true, async () => { await fbDeleteLog(log.id); toast(t('Log izin dihapus.', 'Permit log deleted.'), 'warning'); })} className="opacity-0 group-hover:opacity-100 transition w-7 h-7 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100 inline-flex items-center justify-center" title={t('Hapus log ini', 'Delete this log')}><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
            {filteredIzinLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={Clock3} size={32} /></div>
                <p className="text-sm">{t('Belum ada log izin', 'No permit logs yet')}</p>
              </div>
            ) : filteredIzinLogs.map((log) => {
              return (
                <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{log.nama}</div>
                      <div className="text-[10px] text-slate-400">{log.departemen || '-'}</div>
                    </div>
                    <span className="text-[10px] text-slate-400">{fmtDateTime(log.timestamp)}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{log.tglCuti || '-'}</div>
                  <div className="mt-1.5 text-xs text-slate-600 break-words">{log.keterangan ? translateLegacyText(log.keterangan, language) : '-'}</div>
                  {currentUser.role === 'superadmin' && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button type="button" onClick={() => showConfirm(t('Hapus Log Izin', 'Delete Permit Log'), `${t('Hapus log izin', 'Delete permit log')} ${log.nama}?`, true, async () => { await fbDeleteLog(log.id); toast(t('Log izin dihapus.', 'Permit log deleted.'), 'warning'); })} className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold inline-flex items-center gap-1">
                        <ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {logTab === 'activity' && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Log Aktivitas Sistem', 'System Activity Logs')} · {filteredActivityLogs.length} {t('entri', 'entries')}</span>
            {can(currentUser.role, 'delete') && <button onClick={doClearHistory} className="group/clr h-7 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition inline-flex items-center gap-1"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" className="group-hover/clr:text-white" /> {t('Bersihkan Semua', 'Clear All')}</button>}
          </div>
          <div className="overflow-auto flex-1 min-h-0 overscroll-contain">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {(['timestamp', 'nama', 'departemen', 'tglCuti', 'keterangan'] as HistSortCol[]).map((col) => {
                    const labels = [t('Waktu', 'Time'), t('Nama', 'Name'), t('Departemen', 'Department'), t('Tgl Referensi', 'Reference Date'), t('Keterangan', 'Description')];
                    const idx = ['timestamp', 'nama', 'departemen', 'tglCuti', 'keterangan'].indexOf(col);
                    return <th key={col} onClick={() => handleHistSort(col)} className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition">{labels[idx]}{hArr(col)}</th>;
                  })}
                  {currentUser.role === 'superadmin' && <th className="sticky top-0 bg-[#EFF1F3] px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">{t('Aksi', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredActivityLogs.length === 0 ? (
                  <tr><td colSpan={currentUser.role === 'superadmin' ? 6 : 5} className="py-12 text-center text-slate-400"><div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={FileText} size={32} /></div><p className="text-sm">{t('Belum ada log aktivitas', 'No activity logs yet')}</p></td></tr>
                ) : filteredActivityLogs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-slate-100 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-400" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fmtDateTime(log.timestamp)}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{log.nama}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs hidden lg:table-cell">{log.departemen || '-'}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap text-xs text-slate-500">{log.tglCuti || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{log.keterangan ? translateLegacyText(log.keterangan, language) : '-'}</td>
                    {currentUser.role === 'superadmin' && <td className="px-3 py-2.5"><button onClick={() => showConfirm(t('Hapus Log Aktivitas', 'Delete Activity Log'), t('Hapus log aktivitas ini?', 'Delete this activity log?'), true, async () => { await fbDeleteLog(log.id); toast(t('Log aktivitas dihapus.', 'Activity log deleted.'), 'warning'); })} className="opacity-0 group-hover:opacity-100 transition w-7 h-7 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100 inline-flex items-center justify-center" title={t('Hapus log ini', 'Delete this log')}><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
            {filteredActivityLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <div className="text-4xl mb-3 inline-flex"><ContentLucideIcon icon={FileText} size={32} /></div>
                <p className="text-sm">{t('Belum ada log aktivitas', 'No activity logs yet')}</p>
              </div>
            ) : filteredActivityLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{log.nama}</div>
                    <div className="text-[10px] text-slate-400">{log.departemen || '-'}</div>
                  </div>
                  <span className="text-[10px] text-slate-400">{fmtDateTime(log.timestamp)}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">{log.tglCuti || '-'}</div>
                <div className="mt-1.5 text-xs text-slate-600 break-words">{log.keterangan ? translateLegacyText(log.keterangan, language) : '-'}</div>
                {currentUser.role === 'superadmin' && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => showConfirm(t('Hapus Log Aktivitas', 'Delete Activity Log'), t('Hapus log aktivitas ini?', 'Delete this activity log?'), true, async () => { await fbDeleteLog(log.id); toast(t('Log aktivitas dihapus.', 'Activity log deleted.'), 'warning'); })} className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold inline-flex items-center gap-1">
                      <ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
