import { useI18n } from '../i18n/store';
import { fmtDateTime } from '../utils/common';
type UserRole = 'superadmin' | 'admin' | 'viewer';

interface OnlineUserLite {
  id: string;
  userId: string;
  displayName: string;
  role: UserRole;
  lastSeen: string;
}

export function OnlineUsersPanel({
  users,
  currentUserId,
  onClose,
  onStartChat,
}: {
  users: OnlineUserLite[];
  currentUserId: string;
  onClose: () => void;
  onStartChat: (u: OnlineUserLite) => void;
}) {
  const { t } = useI18n();
  const roleColor: Record<UserRole, string> = {
    superadmin: 'bg-purple-500',
    admin: 'bg-blue-500',
    viewer: 'bg-slate-400',
  };
  const roleLabelShort: Record<UserRole, string> = {
    superadmin: 'SA',
    admin: t('Admin', 'Admin'),
    viewer: t('Viewer', 'Viewer'),
  };

  return (
    <div className="absolute top-12 right-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden" style={{ animation: 'scaleIn .15s ease-out' }} onClick={(e) => e.stopPropagation()}>
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white font-bold text-sm">{t('Pengguna Online', 'Online Users')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{users.length}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white transition text-sm">✕</button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
        {users.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400 text-sm">{t('Tidak ada pengguna online', 'No users online')}</div>
        ) : users.map((u) => {
          const isMe = u.userId === currentUserId;
          const lastSeenDate = new Date(u.lastSeen.replace(' ', 'T'));
          const minsAgo = Math.floor((Date.now() - lastSeenDate.getTime()) / 60000);
          const lastSeenText = fmtDateTime(u.lastSeen);
          return (
            <div key={u.id} className={`px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-emerald-50' : 'hover:bg-slate-50'} transition`}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">{u.displayName.charAt(0).toUpperCase()}</div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 text-sm truncate">{u.displayName}</span>
                  {isMe && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{t('Anda', 'You')}</span>}
                </div>
                <div className="text-[10px] text-slate-400" title={lastSeenText}>
                  {minsAgo < 1 ? t('Baru saja aktif', 'Active just now') : `${t('Aktif', 'Active')} ${minsAgo}m ${t('lalu', 'ago')}`} · {lastSeenText}
                </div>
              </div>
              <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleColor[u.role]}`}>{roleLabelShort[u.role]}</span>
              {!isMe && (
                <button onClick={() => onStartChat(u)} className="h-6 px-2 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition" title={t('Chat personal', 'Personal chat')}>
                  {t('Chat', 'Chat')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">{t('Diperbarui setiap 30 detik', 'Updated every 30 seconds')}</div>
    </div>
  );
}
