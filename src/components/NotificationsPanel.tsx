import React, { useEffect } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import { ContentLucideIcon } from './icons/ContentLucideIcon';
import { useI18n } from '../i18n/store';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { translateLegacyText } from '../utils/legacyI18n';
import { fmtDateOnly, fmtTimeShort } from '../utils/common';

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: string;
  relatedId?: string;
}

export function NotificationsPanel({
  open,
  notifications,
  unreadCount,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenApprovals,
  onDeleteNotif,
  onClearAllNotif,
  isSuperAdmin,
  onBroadcast,
}: {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenApprovals: (notif: NotificationItem) => void;
  onDeleteNotif?: (id: string) => void;
  onClearAllNotif?: () => void;
  isSuperAdmin?: boolean;
  onBroadcast?: (title: string, message: string, type: NotificationItem['type']) => void;
}) {
  const { t, language } = useI18n();
  const [showBroadcast, setShowBroadcast] = React.useState(false);
  const [bTitle, setBTitle] = React.useState('');
  const [bMsg, setBMsg] = React.useState('');
  const [bType, setBType] = React.useState<NotificationItem['type']>('info');
  const { page, totalPages, pageRows, goNext, goPrev, resetPage } = usePaginatedData(notifications, 12);

  useEffect(() => {
    resetPage();
  }, [notifications.length, resetPage]);

  if (!open) return null;
  const latest = pageRows;

  const notifIcon = (t: NotificationItem['type']) => {
    const cls = t === 'success' ? 'bg-emerald-100 text-emerald-600'
      : t === 'warning' ? 'bg-amber-100 text-amber-600'
        : t === 'error' ? 'bg-red-100 text-red-600'
          : 'bg-blue-100 text-blue-600';
    const icon = t === 'success'
      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
      : t === 'warning'
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        : t === 'error'
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    return <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>{icon}</div>;
  };

  return (
    <div className="absolute right-0 top-11 w-[380px] max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[99998]" style={{ animation: 'scaleIn .15s ease-out' }} onClick={(e) => e.stopPropagation()}>
      <div className="px-4 py-3 bg-gradient-to-r from-[#005A9E] to-[#0077CC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span className="text-white font-bold text-sm">{t('Notifikasi', 'Notifications')}</span>
          {unreadCount > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount} {t('baru', 'new')}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAllAsRead} className="text-[11px] font-semibold text-blue-200 hover:text-white transition">{t('Baca semua', 'Read all')}</button>
          {isSuperAdmin && onClearAllNotif && notifications.length > 0 && <button type="button" onClick={onClearAllNotif} className="text-[11px] font-bold bg-red-500/70 hover:bg-red-500 text-white px-2 py-0.5 rounded-lg transition flex items-center gap-1" title={t('Hapus semua notifikasi', 'Delete all notifications')}><ContentLucideIcon icon={Trash2} size={12} variant="toolbar" className="text-white" /> Clear</button>}
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
      </div>

      {isSuperAdmin && onBroadcast && (
        <div className="border-b border-slate-100">
          {!showBroadcast ? (
            <button type="button" onClick={() => setShowBroadcast(true)} className="w-full px-4 py-2.5 flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12px] font-semibold transition"><ContentLucideIcon icon={Megaphone} size={14} variant="toolbar" /> {t('Broadcast Pengumuman ke Semua Pengguna', 'Broadcast Announcement to All Users')}</button>
          ) : (
            <div className="px-4 py-3 bg-indigo-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-indigo-700 inline-flex items-center gap-1"><ContentLucideIcon icon={Megaphone} size={13} variant="toolbar" /> {t('Broadcast Pengumuman', 'Broadcast Announcement')}</span>
                <button onClick={() => setShowBroadcast(false)} className="text-indigo-400 hover:text-indigo-600 text-sm">✕</button>
              </div>
              <input className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:border-indigo-400" placeholder={t('Judul pengumuman…', 'Announcement title…')} value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
              <textarea className="w-full h-16 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:border-indigo-400 resize-none" placeholder={t('Isi pesan broadcast ke semua pengguna…', 'Broadcast message to all users…')} value={bMsg} onChange={(e) => setBMsg(e.target.value)} />
              <div className="flex gap-2">
                <select className="flex-1 h-8 px-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none" value={bType} onChange={(e) => setBType(e.target.value as NotificationItem['type'])}>
                  <option value="info">{t('Info', 'Info')}</option>
                  <option value="success">{t('Sukses', 'Success')}</option>
                  <option value="warning">{t('Peringatan', 'Warning')}</option>
                  <option value="error">Urgent</option>
                </select>
                <button
                  onClick={() => {
                    if (!bTitle.trim() || !bMsg.trim()) return;
                    onBroadcast(bTitle.trim(), bMsg.trim(), bType);
                    setBTitle('');
                    setBMsg('');
                    setShowBroadcast(false);
                  }}
                  disabled={!bTitle.trim() || !bMsg.trim()}
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {t('Kirim', 'Send')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
        {latest.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </div>
            <p className="text-slate-400 text-sm">{t('Belum ada notifikasi', 'No notifications yet')}</p>
          </div>
        ) : latest.map((n) => (
          <div key={n.id} className={`px-4 py-3 transition hover:bg-slate-50 group ${!n.read ? 'bg-blue-50/50 border-l-2 border-l-blue-400' : ''}`}>
            <div className="flex items-start gap-3">
              {notifIcon(n.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-800 text-sm leading-tight">{translateLegacyText(n.title, language)}</div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-[10px] text-slate-400 mt-0.5">{fmtTimeShort(n.timestamp)}</div>
                    {isSuperAdmin && onDeleteNotif && (
                      <button onClick={() => onDeleteNotif(n.id)} className="opacity-0 group-hover:opacity-100 transition w-5 h-5 rounded-md bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center ml-1" title={t('Hapus notifikasi ini', 'Delete this notification')}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{translateLegacyText(n.message, language)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateOnly(n.timestamp)}</div>
                {(!n.read || n.action === 'openApprovals' || n.action === 'open-attendance') && (
                  <div className="mt-2 flex items-center gap-2">
                    {!n.read && <button onClick={() => onMarkAsRead(n.id)} className="h-6 px-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition">{t('Tandai dibaca', 'Mark as read')}</button>}
                    {(n.action === 'openApprovals' || n.action === 'open-attendance') && <button onClick={() => onOpenApprovals(n)} className="h-6 px-2.5 rounded-lg bg-[#005A9E] text-white text-[11px] font-bold hover:bg-[#004880] transition flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>{t('Buka', 'Open')}</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length > 12 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button onClick={goPrev} disabled={page <= 1} className="h-7 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 disabled:opacity-40">{t('Sebelumnya', 'Previous')}</button>
          <span className="text-[11px] text-slate-500">{t('Halaman', 'Page')} {page}/{totalPages}</span>
          <button onClick={goNext} disabled={page >= totalPages} className="h-7 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 disabled:opacity-40">{t('Berikutnya', 'Next')}</button>
        </div>
      )}
    </div>
  );
}
