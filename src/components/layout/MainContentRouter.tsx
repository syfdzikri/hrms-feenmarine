import { Suspense, lazy } from 'react';
import { useI18n } from '../../i18n/store';
import { can } from '../../utils/permissions';

const LeavePage = lazy(() => import('../../pages/leave/LeavePage').then((m) => ({ default: m.LeavePage })));
const HistoryPage = lazy(() => import('../../pages/history/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const IzinPage = lazy(() => import('../../pages/izin/IzinPage').then((m) => ({ default: m.IzinPage })));
const ChatPage = lazy(() => import('../ChatWidgets').then((m) => ({ default: m.ChatPage })));
const OverseasPage = lazy(() => import('../../pages/overseas/OverseasPage').then((m) => ({ default: m.OverseasPage })));
const OverseasSummaryPage = lazy(() => import('../../pages/overseas/OverseasSummaryPage').then((m) => ({ default: m.OverseasSummaryPage })));
const FATPage = lazy(() => import('../../pages/fat/FATPage').then((m) => ({ default: m.FATPage })));
const AnalyticsPage = lazy(() => import('../../pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const AttendancePage = lazy(() => import('../../pages/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const CalendarPage = lazy(() => import('../../pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const ApprovalsPage = lazy(() => import('../../pages/approvals/ApprovalsPage').then((m) => ({ default: m.ApprovalsPage })));
const AboutPage = lazy(() => import('../../pages/about/AboutPage').then((m) => ({ default: m.AboutPage })));
const ConfigPage = lazy(() => import('../../pages/config/ConfigPage').then((m) => ({ default: m.ConfigPage })));
const UsersPage = lazy(() => import('../../pages/users/UsersPage').then((m) => ({ default: m.UsersPage })));
const TodoPage = lazy(() => import('../../pages/todo/TodoPage').then((m) => ({ default: m.TodoPage })));

export type RoutedPage = 'leave' | 'izin' | 'chat' | 'history' | 'overseas' | 'fat' | 'calendar' | 'analytics' | 'attendance' | 'todo' | 'overseasSummary' | 'approvals' | 'about' | 'config' | 'users';

type MainContentRouterProps = {
  activePage: RoutedPage;
  currentUserRole: 'superadmin' | 'admin' | 'viewer';
  showUsersPage: boolean;
  leavePageProps: Record<string, unknown>;
  izinPageProps: Record<string, unknown>;
  chatPageProps: Record<string, unknown>;
  historyPageProps: Record<string, unknown>;
  overseasPageProps: Record<string, unknown>;
  fatPageProps: Record<string, unknown>;
  calendarPageProps: Record<string, unknown>;
  analyticsPageProps: Record<string, unknown>;
  attendancePageProps: Record<string, unknown>;
  todoPageProps: Record<string, unknown>;
  overseasSummaryPageProps: Record<string, unknown>;
  approvalsPageProps: Record<string, unknown>;
  aboutPageProps: Record<string, unknown>;
  configPageProps: Record<string, unknown>;
  usersPageProps: Record<string, unknown>;
};

export function MainContentRouter({
  activePage,
  currentUserRole,
  showUsersPage,
  leavePageProps,
  izinPageProps,
  chatPageProps,
  historyPageProps,
  overseasPageProps,
  fatPageProps,
  calendarPageProps,
  analyticsPageProps,
  attendancePageProps,
  todoPageProps,
  overseasSummaryPageProps,
  approvalsPageProps,
  aboutPageProps,
  configPageProps,
  usersPageProps,
}: MainContentRouterProps) {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="flex-1 min-h-0 p-4 text-sm text-slate-500">{t('Memuat halaman...', 'Loading page...')}</div>}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activePage === 'leave' && <LeavePage {...leavePageProps} />}
        {activePage === 'izin' && <IzinPage {...izinPageProps} />}
        {activePage === 'chat' && <ChatPage {...chatPageProps} />}
        {activePage === 'history' && <HistoryPage {...historyPageProps} />}
        {activePage === 'overseas' && <OverseasPage {...overseasPageProps} />}
        {activePage === 'fat' && <FATPage {...fatPageProps} />}
        {activePage === 'calendar' && <CalendarPage {...calendarPageProps} />}
        {activePage === 'analytics' && <AnalyticsPage {...analyticsPageProps} />}
        {activePage === 'attendance' && <AttendancePage {...attendancePageProps} />}
        {activePage === 'todo' && <TodoPage {...todoPageProps} />}
        {activePage === 'overseasSummary' && <OverseasSummaryPage {...overseasSummaryPageProps} />}
        {activePage === 'approvals' && currentUserRole === 'superadmin' && <ApprovalsPage {...approvalsPageProps} />}
        {activePage === 'about' && <AboutPage {...aboutPageProps} />}
        {activePage === 'config' && can(currentUserRole, 'config') && <ConfigPage {...configPageProps} />}
        {activePage === 'users' && showUsersPage && <UsersPage {...usersPageProps} />}
      </div>
    </Suspense>
  );
}
