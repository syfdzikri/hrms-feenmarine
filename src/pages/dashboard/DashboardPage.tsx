import { DashboardWidgets } from '../../components/dashboard/DashboardWidgets';
import { SkeletonCard, TableSkeleton } from '../../components/common/Feedback';
import { useI18n } from '../../i18n/store';
import { can, canEditEmployeeRecord, canEditOwnLeave } from '../../utils/permissions';
import { Search, FileX2, UserRound, UserRoundCheck, Pencil, RotateCcw, Trash2, Palmtree } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { statusTag } from '../../utils/leave';
import type { ActivePage, AppUser, Employee, SortCol } from '../../types';

type DashboardPageProps = {
  activeDepts: string[];
  searchQ: string;
  setSearchQ: (v: string) => void;
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  syncing: boolean;
  filteredEmps: Array<Employee & { sisa: number }>;
  currentUser: AppUser;
  setActivePage: (page: ActivePage) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  doOpenEdit: (id: string) => void;
  doResetJatah: (id: string) => void;
  doDelete: (id: string) => void;
  handleSort: (c: SortCol) => void;
  sortCol: SortCol;
  sArr: (c: SortCol) => string;
  calcWorkDuration: (tglKontrak?: string) => string;
  setCtxEmpId: (id: string | null) => void;
  setCtxPos: (pos: { x: number; y: number }) => void;
  setCtxOpen: (open: boolean) => void;
  dashboardWidgetsProps: {
    logs: any[];
    overseas: any[];
    employees: Employee[];
    izinEntries: any[];
    fatEntries: any[];
    stats: { aman: number; low: number; out: number };
    setActivePage: (page: ActivePage) => void;
    fmtDate: (d: string) => string;
    todayStr: () => string;
    getWeekRange: (baseDate?: Date) => { startISO: string; endISO: string };
    toISODate: (d: Date) => string;
    izinCutoffDay: number;
    izinMaxPerPeriode: number;
  };
};

export function DashboardPage({
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
}: DashboardPageProps) {
  const { t } = useI18n();
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="sm:hidden flex-shrink-0 px-3 py-2 bg-white border-b border-slate-200 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"><ContentLucideIcon icon={Search} size={12} variant="toolbar" /></span>
          <input
            className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E]"
            placeholder={t('Cari…', 'Search…')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none max-w-[110px]"
        >
          <option value="">{t('Semua', 'All')}</option>
          {activeDepts.map((d) => (
            <option key={d} value={d}>
              {d.length > 12 ? d.slice(0, 12) + '…' : d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
        {syncing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-40 animate-pulse" />
              </div>
              <table className="w-full">
                <TableSkeleton rows={6} cols={8} />
              </table>
            </div>
          </div>
        )}

        {!syncing && <DashboardWidgets {...dashboardWidgetsProps} />}

        <div className="md:hidden space-y-3" onClick={() => setSelectedId(null)}>
          {!syncing && filteredEmps.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-3 flex justify-center text-slate-300"><ContentLucideIcon icon={FileX2} size={40} /></div>
              <p className="text-sm mb-4">{t('Belum ada data karyawan', 'No employee data yet')}</p>
              {can(currentUser.role, 'manageUsers') && (
                <button onClick={() => setActivePage('users')} className="px-5 py-2.5 bg-[#005A9E] text-white rounded-xl text-sm font-bold">
                  + {t('Tambah Karyawan', 'Add Employee')}
                </button>
              )}
            </div>
          ) : (
            filteredEmps.map((emp) => {
              const { label, badge } = statusTag(emp.sisa, emp.rencana);
              const isSel = emp.id === selectedId;
              return (
                <div
                  key={emp.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(emp.id);
                  }}
                  className={`rounded-2xl border-2 p-4 cursor-pointer transition-all select-none active:scale-[0.98] ${
                    isSel ? 'border-[#005A9E] bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emp.gender === 'P' ? <ContentLucideIcon icon={UserRound} size={18} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={18} variant="toolbar" />}</span>
                      <div>
                        <div className="font-bold text-slate-800">{emp.nama}</div>
                        <div className="text-xs text-slate-400">{emp.posisi || emp.departemen}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold border ${badge}`}>{label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center my-2">
                    {[
                      [t('Jatah Cuti', 'Leave Quota'), emp.jatahAwal, 'text-slate-600'],
                      [t('Terpakai Cuti', 'Leave Used'), emp.terpakai, 'text-orange-600'],
                      [t('Rencana Cuti', 'Leave Planned'), emp.rencana, 'text-amber-600'],
                      [t('Sisa Cuti', 'Leave Remaining'), emp.sisa, 'text-[#005A9E] font-extrabold'],
                    ].map(([l, v, c]) => (
                      <div key={String(l)} className="bg-slate-50 rounded-xl py-2">
                        <div className={`text-lg font-bold ${c}`}>{v}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{l}</div>
                      </div>
                    ))}
                  </div>
                  {isSel && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                      {canEditEmployeeRecord(currentUser, emp.nama) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            doOpenEdit(emp.id);
                          }}
                          className="flex-1 h-9 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
                        >
                          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /> {t('Edit', 'Edit')}</span>
                        </button>
                      )}
                      {canEditEmployeeRecord(currentUser, emp.nama) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            doResetJatah(emp.id);
                          }}
                          className="flex-1 h-9 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition"
                        >
                          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={RotateCcw} size={12} variant="toolbar" /> Reset</span>
                        </button>
                      )}
                      {can(currentUser.role, 'delete') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            doDelete(emp.id);
                          }}
                          className="flex-1 h-9 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                        >
                          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /> {t('Hapus', 'Delete')}</span>
                        </button>
                      )}
                      {canEditOwnLeave(currentUser, emp.nama) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePage('leave');
                          }}
                          className="flex-1 h-9 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                        >
                          <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={Palmtree} size={12} variant="toolbar" /> {t('Cuti', 'Leave')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:flex bg-white border border-slate-200 rounded-2xl overflow-hidden flex-col" style={{ maxHeight: 'calc(100dvh - 200px)' }}>
          <div className="overflow-auto flex-1 min-h-0" onClick={() => setSelectedId(null)}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#EFF1F3]">
                  {['nama', 'departemen', 'tglKontrak', 'tglKontrak', 'jatahAwal', 'terpakai', 'rencana', 'sisa', 'sisa'].map((col, i) => {
                    const labels = [t('Nama', 'Name'), t('Dept', 'Dept'), t('Kontrak', 'Contract'), t('Masa Kerja', 'Work Duration'), t('Jatah Cuti', 'Leave Quota'), t('Terpakai Cuti', 'Leave Used'), t('Rencana Cuti', 'Leave Planned'), t('Sisa Cuti', 'Leave Remaining'), t('Status', 'Status')];
                    const isCenter = ['Kontrak', 'Masa Kerja', 'Jatah', 'Terpakai', 'Rencana', 'Sisa', 'Status'].includes(labels[i]);
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col as SortCol)}
                        className={`sticky top-0 bg-[#EFF1F3] px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-[#DFF0FF] hover:text-[#005A9E] select-none whitespace-nowrap transition text-left ${
                          isCenter ? 'text-center' : ''
                        } ${sortCol === col ? 'text-[#005A9E]' : ''}`}
                      >
                        {labels[i]}
                        {i < 8 ? sArr(col as SortCol) : ''}
                      </th>
                    );
                  })}
                  <th className="sticky top-0 bg-[#EFF1F3] px-3 py-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 text-center">{t('Visa', 'Visa')}</th>
                  <th className="sticky top-0 bg-[#EFF1F3] px-3 py-3 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 text-center">{t('Aksi', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmps.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="text-4xl mb-3 flex justify-center text-slate-300"><ContentLucideIcon icon={FileX2} size={32} /></div>
                      <p className="text-sm">{t('Belum ada data karyawan', 'No employee data yet')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmps.map((emp) => {
                    const { label, badge, row } = statusTag(emp.sisa, emp.rencana);
                    const isSel = emp.id === selectedId;
                    return (
                      <tr
                        key={emp.id}
                        style={{ background: isSel ? '#DFF0FF' : undefined }}
                        className={`border-b border-slate-100 cursor-pointer transition-colors select-none group ${!isSel ? row : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(emp.id);
                        }}
                        onDoubleClick={() => canEditEmployeeRecord(currentUser, emp.nama) && doOpenEdit(emp.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedId(emp.id);
                          setCtxEmpId(emp.id);
                          setCtxPos({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 140) });
                          setCtxOpen(true);
                        }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{emp.gender === 'P' ? <ContentLucideIcon icon={UserRound} size={16} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={16} variant="toolbar" />}</span>
                            <div>
                              <div className="font-semibold text-slate-800">{emp.nama}</div>
                              {emp.posisi && <div className="text-[10px] text-slate-400 mt-0.5">{emp.posisi}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500 text-xs">{emp.departemen}</td>
                        <td className="px-3 py-3 text-center text-xs text-slate-500">{emp.tglKontrak || '-'}</td>
                        <td className="px-3 py-3 text-center text-xs text-slate-500">{calcWorkDuration(emp.tglKontrak)}</td>
                        <td className="px-3 py-3 text-center font-semibold">{emp.jatahAwal}</td>
                        <td className="px-3 py-3 text-center text-orange-600 font-semibold">{emp.terpakai}</td>
                        <td className="px-3 py-3 text-center text-amber-600 font-semibold">{emp.rencana}</td>
                        <td className="px-3 py-3 text-center font-bold text-[#005A9E]">{emp.sisa}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge}`}>{label}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {emp.visaActive && (emp.visaTypes || []).length > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                              {(emp.visaTypes || []).join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            {canEditEmployeeRecord(currentUser, emp.nama) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  doOpenEdit(emp.id);
                                }}
                                className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition"
                                title={t('Edit', 'Edit')}
                              >
                                <ContentLucideIcon icon={Pencil} size={12} variant="toolbar" />
                              </button>
                            )}
                            {can(currentUser.role, 'delete') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  doDelete(emp.id);
                                }}
                                className="w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition"
                                title={t('Hapus', 'Delete')}
                              >
                                <ContentLucideIcon icon={Trash2} size={12} variant="toolbar" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
