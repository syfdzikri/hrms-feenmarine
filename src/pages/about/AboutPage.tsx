import type { AppConfig } from '../../types';
import { Activity, BarChart3, CalendarDays, CheckCircle2, Info, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { APP_FULL_VERSION, APP_VERSION } from '../../constants/appVersion';
import { useI18n } from '../../i18n/store';

export function AboutPage({ config }: { config: AppConfig }) {
  const { t } = useI18n();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-gradient-to-br from-[#005A9E] to-[#0A78C2] text-white rounded-2xl overflow-hidden">
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Info} size={18} variant="toolbar" className="text-white" /></div>
              <div>
                <h3 className="font-extrabold text-lg">{t('About — HR Management System', 'About — HR Management System')}</h3>
                <p className="text-xs text-blue-100 mt-0.5">{config.companyName} · {APP_FULL_VERSION}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-blue-50">
              {t(
                'HR Management System (HRMS) adalah platform internal PT Feen Marine untuk mengelola siklus data karyawan secara terpusat, mulai dari data master, cuti, overseas, hingga aktivitas FAT.',
                'HR Management System (HRMS) is PT Feen Marine\'s internal platform to centrally manage employee data lifecycle, from master data, leave, and overseas to FAT activities.',
              )}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { icon: LayoutDashboard, label: t('Modul Terintegrasi', 'Integrated Modules') },
                { icon: CheckCircle2, label: t('Alur Operasional Konsisten', 'Consistent Operational Flow') },
                { icon: Activity, label: t('Traceability Lebih Baik', 'Improved Traceability') },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
                  <ContentLucideIcon icon={item.icon} size={12} variant="toolbar" className="text-white" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 inline-flex items-center gap-2">
            <ContentLucideIcon icon={Sparkles} size={14} variant="toolbar" />
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Change Log', 'Change Log')} {APP_VERSION}</div>
          </div>
          <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed">
            <div className="relative pl-4">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
              <ul className="space-y-3">
                {[
                  {
                    title: t('Refactor Arsitektur Halaman', 'Page Architecture Refactor'),
                    desc: t('Modul dipisah ke struktur pages/components/hooks/constants agar lebih terawat, mudah scaling, dan aman untuk pengembangan lanjutan.', 'Modules are reorganized into pages/components/hooks/constants for better maintainability, scalability, and safer future development.'),
                    tag: t('Core', 'Core'),
                    tagCls: 'bg-blue-50 text-blue-700 border-blue-200',
                  },
                  {
                    title: t('Dashboard Widgets Baru', 'New Dashboard Widgets'),
                    desc: t('Dashboard diperbarui dengan komponen widget yang lebih modular, siap dipakai ulang, dan lebih konsisten antar role.', 'Dashboard has been refreshed with reusable modular widgets and better cross-role consistency.'),
                    tag: t('UI', 'UI'),
                    tagCls: 'bg-violet-50 text-violet-700 border-violet-200',
                  },
                  {
                    title: t('Modul To-Do Modern', 'Modern To-Do Module'),
                    desc: t('To-Do mendapatkan workspace baru dengan mode Full/Simple, project grouping, filter, drag & drop list/kanban, reminder, dan panel ringkasan.', 'To-Do gets a new workspace with Full/Simple mode, project grouping, filtering, list/kanban drag-and-drop, reminders, and overview panel.'),
                    tag: t('Productivity', 'Productivity'),
                    tagCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  },
                  {
                    title: t('Dark Mode Konsisten', 'Consistent Dark Mode'),
                    desc: t('Palet dark mode dirapikan menyeluruh untuk kontras panel, input, badge, hover, serta readability di halaman utama termasuk To-Do dan kalender.', 'Dark-mode palette has been tuned globally for panel/input/badge/hover contrast and readability, including To-Do and calendar screens.'),
                    tag: t('UX', 'UX'),
                    tagCls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
                  },
                  {
                    title: t('Peningkatan Modul Operasional', 'Operational Module Enhancements'),
                    desc: t('Perbaikan lintas modul FAT, overseas, izin/cuti, approvals, users, analytics, dan history agar alur kerja lebih stabil dan informatif.', 'Cross-module improvements for FAT, overseas, permit/leave, approvals, users, analytics, and history to improve stability and clarity.'),
                    tag: t('Ops', 'Ops'),
                    tagCls: 'bg-amber-50 text-amber-700 border-amber-200',
                  },
                  {
                    title: t('Pondasi Firebase & Utilitas', 'Firebase and Utility Foundation'),
                    desc: t('Penambahan service auth/client Firebase, queue offline, online users, pagination, i18n context/store, serta utilitas umum untuk performa dan keandalan aplikasi.', 'Added Firebase auth/client services, offline queue, online users, pagination, i18n context/store, and shared utilities for better performance and reliability.'),
                    tag: t('Infra', 'Infra'),
                    tagCls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                  },
                ].map((item) => (
                  <li key={item.title} className="relative rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <span className="absolute -left-[14px] top-3 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#005A9E]" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[12px] font-bold text-slate-800">{item.title}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${item.tagCls}`}>{item.tag}</span>
                    </div>
                    <div className="text-[12px] text-slate-600 mt-0.5">{item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 inline-flex items-center gap-2">
              <ContentLucideIcon icon={BarChart3} size={14} variant="toolbar" />
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Modul Utama', 'Core Modules')}</div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed">
              <ul className="space-y-1.5">
                <li className="inline-flex items-start gap-1.5"><ContentLucideIcon icon={LayoutDashboard} size={12} variant="toolbar" className="mt-1 text-slate-400" /><span><strong>Dashboard</strong> — {t('ringkasan KPI karyawan, status cuti, overseas aktif, dan alert operasional.', 'employee KPI summary, leave status, active overseas, and operational alerts.')}</span></li>
                <li className="inline-flex items-start gap-1.5"><ContentLucideIcon icon={Activity} size={12} variant="toolbar" className="mt-1 text-slate-400" /><span><strong>Log</strong> — {t('memisahkan Log Cuti dan Log Aktivitas (audit) untuk perubahan sistem.', 'separates Leave Logs and Activity Logs (audit) for system changes.')}</span></li>
                <li><strong>Overseas</strong> — {t('monitoring perjalanan (Commissioning/Service/Visa/Other), status otomatis (upcoming/active/completed), dan rekap total hari per karyawan.', 'trip monitoring (Commissioning/Service/Visa/Other), automatic statuses (upcoming/active/completed), and total-day recap per employee.')}</li>
                <li><strong>{t('Jadwal FAT', 'FAT Schedule')}</strong> — {t('penjadwalan FAT, assignment engineer, dan pencatatan aktivitas proyek.', 'FAT scheduling, engineer assignment, and project activity logging.')}</li>
                <li className="inline-flex items-start gap-1.5"><ContentLucideIcon icon={CalendarDays} size={12} variant="toolbar" className="mt-1 text-slate-400" /><span><strong>{t('Kalender', 'Calendar')}</strong> — {t('agregasi event cuti/overseas/FAT dalam satu tampilan kalender.', 'aggregates leave/overseas/FAT events in a single calendar view.')}</span></li>
                <li className="inline-flex items-start gap-1.5"><ContentLucideIcon icon={BarChart3} size={12} variant="toolbar" className="mt-1 text-slate-400" /><span><strong>{t('Analitik', 'Analytics')}</strong> — {t('ringkasan visual per departemen, tren, dan distribusi aktivitas.', 'visual summary by department, trends, and activity distribution.')}</span></li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 inline-flex items-center gap-2">
              <ContentLucideIcon icon={ShieldCheck} size={14} variant="toolbar" />
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Role & Keamanan', 'Roles & Security')}</div>
            </div>
            <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed">
              <ul className="space-y-1.5">
                <li><strong>Super Admin</strong> — {t('akses penuh, termasuk manajemen user dan approval.', 'full access, including user management and approvals.')}</li>
                <li><strong>Admin</strong> — {t('dapat input/update data operasional, namun perubahan data karyawan wajib approval Super Admin.', 'can input/update operational data, but employee-data changes require Super Admin approval.')}</li>
                <li><strong>Viewer</strong> — {t('akses baca (dan terbatas untuk data yang ter-link bila ada).', 'read-only access (and limited to linked data when available).')}</li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                {t('Catatan: untuk menjaga kualitas data, perubahan data karyawan oleh Admin diproses melalui approval berjenjang.', 'Note: to maintain data quality, employee-data changes by Admin are processed through a staged approval flow.')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 inline-flex items-center gap-2">
            <ContentLucideIcon icon={Activity} size={14} variant="toolbar" />
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Penyimpanan Data & Audit Trail', 'Data Storage & Audit Trail')}</div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              {t('Data disimpan pada Firebase Realtime Database. Aktivitas penting (create/update/delete) dicatat pada Log Aktivitas, sehingga histori perubahan dapat ditelusuri dengan jelas.', 'Data is stored in Firebase Realtime Database. Important activities (create/update/delete) are recorded in Activity Logs, so change history can be traced clearly.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
