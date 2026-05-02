import { can } from '../../../utils/permissions';
import { Download, FileSpreadsheet, FileX2, Pencil, Plus, Trash2, UserRound, UserRoundCheck, UserRoundPlus } from 'lucide-react';
import { ContentLucideIcon } from '../../../components/icons/ContentLucideIcon';
import { useI18n } from '../../../i18n/store';
import type { EmployeeManagementCardProps } from '../types';

export function EmployeeManagementCard({
  currentUser,
  employees,
  setAddEmpOpen,
  doOpenEdit,
  doDelete,
  doPickImportEmployeesCsv,
  doDownloadEmployeesCsvTemplate,
}: EmployeeManagementCardProps) {
  const { t } = useI18n();
  if (currentUser.role !== 'superadmin') return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={UserRoundPlus} size={14} variant="toolbar" /></div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{t('Manajemen Karyawan', 'Employee Management')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{employees.length} {t('karyawan terdaftar', 'registered employees')}</p>
          </div>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
          <button
            type="button"
            onClick={() => setAddEmpOpen(true)}
            className="h-10 px-5 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Tambah Karyawan', 'Add Employee')}
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={doDownloadEmployeesCsvTemplate}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
            >
              <ContentLucideIcon icon={Download} size={12} variant="toolbar" /> {t('Template CSV', 'CSV Template')}
            </button>
            <button
              type="button"
              onClick={doPickImportEmployeesCsv}
              className="h-8 px-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
            >
              <ContentLucideIcon icon={FileSpreadsheet} size={12} variant="toolbar" /> {t('Import CSV', 'Import CSV')}
            </button>
          </div>
        </div>
      </div>
      {employees.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-400">
          <div className="text-4xl mb-2 inline-flex text-slate-300"><ContentLucideIcon icon={FileX2} size={32} /></div>
          <p className="text-sm">{t('Belum ada karyawan terdaftar', 'No registered employees yet')}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {employees.slice().sort((a, b) => a.nama.localeCompare(b.nama)).map((emp) => (
            <div key={emp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition group">
              <span className="text-lg flex-shrink-0 inline-flex">{emp.gender === 'P' ? <ContentLucideIcon icon={UserRound} size={16} variant="toolbar" /> : <ContentLucideIcon icon={UserRoundCheck} size={16} variant="toolbar" />}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm truncate">{emp.nama}</div>
                <div className="text-[10px] text-slate-400">{emp.posisi ? `${emp.posisi} · ` : ''}{emp.departemen}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-slate-400">{t('Sisa', 'Remaining')}: <span className="font-bold text-[#005A9E]">{emp.jatahAwal - emp.terpakai - (emp.rencana || 0)}</span>h</span>
                <button type="button" onClick={() => doOpenEdit(emp.id)} className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition inline-flex items-center justify-center"><ContentLucideIcon icon={Pencil} size={12} variant="toolbar" /></button>
                {can(currentUser.role, 'delete') && <button type="button" onClick={() => doDelete(emp.id)} className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition inline-flex items-center justify-center"><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
