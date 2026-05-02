import { Suspense, lazy } from 'react';
import { MessageCircle, Palmtree, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { ContentLucideIcon } from '../icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';
import type { FloatingChatWidgetProps } from '../ChatWidgets';

const FloatingChatWidget = lazy(() => import('../ChatWidgets').then((m) => ({ default: m.FloatingChatWidget })));

type AppOverlaysProps = {
  canWrite: boolean;
  activePage: string;
  onOpenOverseas: () => void;
  onOpenFat: () => void;
  onGoLeaveFromHistory: () => void;
  ctxOpen: boolean;
  ctxEmpId: string | null;
  ctxPos: { x: number; y: number };
  canEditContextEmployee: boolean;
  canDeleteContextEmployee: boolean;
  onContextEdit: () => void;
  onContextReset: () => void;
  onContextDelete: () => void;
  chatFabOpen: boolean;
  chatFabSide: 'left' | 'right';
  onOpenChatFab: () => void;
  personalUnreadCount: number;
  floatingChatProps: FloatingChatWidgetProps;
};

export function AppOverlays({
  canWrite,
  activePage,
  onOpenOverseas,
  onOpenFat,
  onGoLeaveFromHistory,
  ctxOpen,
  ctxEmpId,
  ctxPos,
  canEditContextEmployee,
  canDeleteContextEmployee,
  onContextEdit,
  onContextReset,
  onContextDelete,
  chatFabOpen,
  chatFabSide,
  onOpenChatFab,
  personalUnreadCount,
  floatingChatProps,
}: AppOverlaysProps) {
  const { t } = useI18n();
  return (
    <>
      {canWrite && activePage === 'overseas' && (
        <button
          type="button"
          onClick={onOpenOverseas}
          aria-label={t('Tambah overseas', 'Add overseas')}
          className="fixed right-4 bottom-[72px] z-[140] lg:hidden w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl text-2xl flex items-center justify-center active:scale-90 transition hover:bg-indigo-700"
          style={{ boxShadow: '0 4px 20px rgba(79,70,229,0.5)' }}
        >
          <span aria-hidden>＋</span>
        </button>
      )}
      {canWrite && activePage === 'fat' && (
        <button
          type="button"
          onClick={onOpenFat}
          aria-label={t('Tambah jadwal FAT', 'Add FAT schedule')}
          className="fixed right-4 bottom-[72px] z-[140] lg:hidden w-14 h-14 bg-cyan-600 text-white rounded-full shadow-2xl text-2xl flex items-center justify-center active:scale-90 transition hover:bg-cyan-700"
          style={{ boxShadow: '0 4px 20px rgba(8,145,178,0.5)' }}
        >
          <span aria-hidden>＋</span>
        </button>
      )}
      {canWrite && activePage === 'history' && (
        <button
          type="button"
          onClick={onGoLeaveFromHistory}
          aria-label={t('Buka halaman cuti', 'Open leave page')}
          className="fixed right-4 bottom-[72px] z-[140] lg:hidden w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl text-xl flex items-center justify-center active:scale-90 transition hover:bg-emerald-700"
          style={{ boxShadow: '0 4px 20px rgba(5,150,105,0.5)' }}
        >
          <ContentLucideIcon icon={Palmtree} size={20} variant="toolbar" className="text-white" />
        </button>
      )}

      {ctxOpen && ctxEmpId && (
        <div style={{ position: 'fixed', top: ctxPos.y, left: ctxPos.x, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[190px] py-1.5 overflow-hidden" onClick={e => e.stopPropagation()}>
          {canEditContextEmployee && (
            <button type="button" onClick={onContextEdit}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"><ContentLucideIcon icon={Pencil} size={14} variant="toolbar" /> {t('Edit Profil', 'Edit Profile')}
              <span className="ml-auto text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">{t('EDIT', 'EDIT')}</span></button>
          )}
          {canEditContextEmployee && (
            <button type="button" onClick={onContextReset}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition">
              <ContentLucideIcon icon={RotateCcw} size={14} variant="toolbar" /> {t('Reset Jatah Cuti', 'Reset Leave Quota')}
              <span className="ml-auto text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">{t('EDIT', 'EDIT')}</span>
            </button>
          )}
          {canDeleteContextEmployee && (
            <>
              <div className="h-px bg-slate-100 my-1" />
              <button type="button" onClick={onContextDelete}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"><ContentLucideIcon icon={Trash2} size={14} variant="toolbar" /> {t('Hapus Karyawan', 'Delete Employee')}</button>
            </>
          )}
        </div>
      )}

      {!chatFabOpen && (
        <button
          type="button"
          onClick={onOpenChatFab}
          aria-label={t('Buka Chat', 'Open Chat')}
          className={`fixed bottom-20 sm:bottom-6 z-[9998] w-14 h-14 rounded-full shadow-xl bg-[#005A9E] hover:bg-[#004880] text-white flex items-center justify-center transition active:scale-95 ${chatFabSide === 'right' ? 'right-4' : 'left-4'}`}
        >
          <ContentLucideIcon icon={MessageCircle} size={20} variant="toolbar" className="text-white" />
          {personalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
              {personalUnreadCount > 99 ? '99+' : personalUnreadCount}
            </span>
          )}
        </button>
      )}
      <Suspense fallback={null}>
        <FloatingChatWidget {...floatingChatProps} />
      </Suspense>
    </>
  );
}
