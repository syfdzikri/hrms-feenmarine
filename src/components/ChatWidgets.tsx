import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, MessageCircle, Pin, Smile } from 'lucide-react';
import { ContentLucideIcon } from './icons/ContentLucideIcon';
import { useI18n } from '../i18n/store';
import { fmtTimeShort } from '../utils/common';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface AppUserLite {
  id: string;
}

interface OnlineUserLite {
  userId: string;
  username: string;
  displayName: string;
}

interface ChatUserLite {
  userId: string;
  username: string;
  displayName: string;
}

interface ChatMessageLite {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  recipientId?: string;
  quotedText?: string;
  quotedSenderName?: string;
}

export function ChatPage({
  currentUser,
  onlineUsers,
  allUsers,
  chatMessages,
  targetUser,
  onSelectTarget,
  onSend,
  canClearGlobal,
  onClearGlobal,
}: {
  currentUser: AppUserLite;
  onlineUsers: OnlineUserLite[];
  allUsers: ChatUserLite[];
  chatMessages: ChatMessageLite[];
  targetUser: OnlineUserLite | null;
  onSelectTarget: (u: OnlineUserLite | null) => void;
  onSend: (message: string, recipient?: { id: string; displayName: string } | null) => Promise<void>;
  canClearGlobal: boolean;
  onClearGlobal: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.userId)), [onlineUsers]);
  const chatUsers = useMemo(() => allUsers
    .filter((u) => u.userId !== currentUser.id)
    .sort((a, b) => {
      const aOnline = onlineUserIds.has(a.userId) ? 1 : 0;
      const bOnline = onlineUserIds.has(b.userId) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return a.displayName.localeCompare(b.displayName);
    }), [allUsers, currentUser.id, onlineUserIds]);
  const onlineChatUsers = useMemo(() => chatUsers.filter((u) => onlineUserIds.has(u.userId)), [chatUsers, onlineUserIds]);
  const offlineChatUsers = useMemo(() => chatUsers.filter((u) => !onlineUserIds.has(u.userId)), [chatUsers, onlineUserIds]);

  const scopedMessages = useMemo(() => {
    if (!targetUser) return chatMessages.filter((m) => !m.recipientId);
    return chatMessages.filter((m) => {
      const meToTarget = m.senderId === currentUser.id && m.recipientId === targetUser.userId;
      const targetToMe = m.senderId === targetUser.userId && m.recipientId === currentUser.id;
      return meToTarget || targetToMe;
    });
  }, [chatMessages, currentUser.id, targetUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scopedMessages.length, targetUser?.userId]);

  const submit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onSend(draft, targetUser ? { id: targetUser.userId, displayName: targetUser.displayName } : null);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page-shell flex-1 flex flex-col min-h-0 p-2 sm:p-4 gap-3">
      <div className="chat-page-header bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-800">{targetUser ? `${t('Chat Personal', 'Personal Chat')} · ${targetUser.displayName}` : t('Chat Karyawan Online', 'Online Employee Chat')}</div>
          <div className="text-xs text-slate-400">{targetUser ? t('Percakapan 1:1', '1:1 conversation') : `${onlineUsers.length} ${t('online · chat umum', 'online · global chat')}`}</div>
        </div>
        <div className="flex items-center gap-2">
          {!targetUser && canClearGlobal && (
            <button onClick={() => void onClearGlobal()} className="h-7 px-2 rounded-lg border border-red-200 bg-red-50 text-[11px] font-semibold text-red-600 hover:bg-red-100">
              Clear Global
            </button>
          )}
          {targetUser && (
            <button onClick={() => onSelectTarget(null)} className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
              {t('Global', 'Global')}
            </button>
          )}
          <select
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            value={targetUser?.userId || ''}
            onChange={(e) => {
              const selected = onlineUsers.find((u) => u.userId === e.target.value) || null;
              onSelectTarget(selected);
            }}
          >
            <option value="">{t('Chat Umum', 'Global Chat')}</option>
            {onlineChatUsers.length > 0 && (
              <optgroup label={t('Online', 'Online')}>
                {onlineChatUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>● {u.displayName} ({t('online', 'online')})</option>
                ))}
              </optgroup>
            )}
            {offlineChatUsers.length > 0 && (
              <optgroup label={t('Offline', 'Offline')}>
                {offlineChatUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>○ {u.displayName} ({t('offline', 'offline')})</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div className="chat-page-body flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="chat-page-messages flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
          {scopedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">{t('Belum ada percakapan.', 'No conversations yet.')}</div>
          ) : scopedMessages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`chat-page-bubble max-w-[80%] px-3 py-2 rounded-xl border text-sm ${mine ? 'chat-page-bubble--mine bg-blue-50 border-blue-200 text-blue-900' : 'chat-page-bubble--other bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <div className="text-[10px] font-bold mb-0.5 opacity-80">{m.senderName}</div>
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                  <div className="text-[10px] opacity-60 mt-1">{fmtTimeShort(m.timestamp)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="chat-page-compose border-t border-slate-200 p-3 flex gap-2">
          <input
            className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E]"
            placeholder={t('Tulis pesan...', 'Write a message...')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button onClick={submit} disabled={!draft.trim() || sending} className="h-10 px-4 rounded-xl bg-[#005A9E] text-white text-sm font-bold hover:bg-[#004880] disabled:opacity-50">
            {t('Kirim', 'Send')}
          </button>
        </div>
      </div>
    </div>
  );
}

export type FloatingChatWidgetProps = {
  open: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  onToggleSide: () => void;
  currentUser: AppUserLite;
  onlineUsers: OnlineUserLite[];
  allUsers: ChatUserLite[];
  chatMessages: ChatMessageLite[];
  targetUser: OnlineUserLite | null;
  onSelectTarget: (u: OnlineUserLite | null) => void;
  onSend: (message: string, recipient?: { id: string; displayName: string } | null, quoted?: { id: string; senderName: string; text: string } | null) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onToast: (msg: string, kind?: ToastKind) => void;
  canClearGlobal: boolean;
  onClearGlobal: () => Promise<void>;
};

export function FloatingChatWidget({
  open,
  onClose,
  side,
  onToggleSide,
  currentUser,
  onlineUsers,
  allUsers,
  chatMessages,
  targetUser,
  onSelectTarget,
  onSend,
  onDeleteMessage,
  onToast,
  canClearGlobal,
  onClearGlobal,
}: FloatingChatWidgetProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [userSearch, setUserSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessageLite | null>(null);
  const [pinnedThreads, setPinnedThreads] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('hrms_chat_pins');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const endRef = useRef<HTMLDivElement | null>(null);
  const EMOJIS = ['😀', '😁', '😂', '😊', '😍', '👍', '🙏', '🔥', '💪', '✅', '❌', '🎉', '🚀', '🤝', '🛠️', '📌'];

  const sizeStyle = { sm: { width: 320, height: 420 }, md: { width: 380, height: 520 }, lg: { width: 460, height: 620 } } as const;
  const onlineUserIds = useMemo(() => new Set(onlineUsers.map((u) => u.userId)), [onlineUsers]);
  const scopedMessages = useMemo(() => {
    if (!targetUser) return chatMessages.filter((m) => !m.recipientId);
    return chatMessages.filter((m) => {
      const meToTarget = m.senderId === currentUser.id && m.recipientId === targetUser.userId;
      const targetToMe = m.senderId === targetUser.userId && m.recipientId === currentUser.id;
      return meToTarget || targetToMe;
    });
  }, [chatMessages, currentUser.id, targetUser]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, scopedMessages.length, targetUser?.userId]);
  useEffect(() => {
    localStorage.setItem('hrms_chat_pins', JSON.stringify(pinnedThreads));
  }, [pinnedThreads]);

  const submit = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onSend(draft, targetUser ? { id: targetUser.userId, displayName: targetUser.displayName } : null, replyTarget ? { id: replyTarget.id, senderName: replyTarget.senderName, text: replyTarget.message } : null);
      setDraft('');
      setReplyTarget(null);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers
      .filter((u) => u.userId !== currentUser.id)
      .filter((u) => !q || u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      .sort((a, b) => {
      const aOnline = onlineUserIds.has(a.userId) ? 1 : 0;
      const bOnline = onlineUserIds.has(b.userId) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aPin = pinnedThreads.includes(a.userId) ? 1 : 0;
      const bPin = pinnedThreads.includes(b.userId) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allUsers, onlineUserIds, userSearch, currentUser.id, pinnedThreads]);
  const filteredOnlineUsers = useMemo(() => filteredUsers.filter((u) => onlineUserIds.has(u.userId)), [filteredUsers, onlineUserIds]);
  const filteredOfflineUsers = useMemo(() => filteredUsers.filter((u) => !onlineUserIds.has(u.userId)), [filteredUsers, onlineUserIds]);

  const togglePin = (threadId: string) => setPinnedThreads((prev) => prev.includes(threadId) ? prev.filter((x) => x !== threadId) : [...prev, threadId]);
  if (!open) return null;

  return (
    <div className={`fixed bottom-20 sm:bottom-6 z-[9999] ${side === 'right' ? 'right-4' : 'left-4'}`}>
      <div className="chat-widget-shell bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col resize" style={{ ...sizeStyle[size], minWidth: 300, minHeight: 360, maxWidth: '92vw', maxHeight: '82vh', resize: 'both' }}>
        <div className="px-3 py-2.5 bg-gradient-to-r from-[#005A9E] to-[#0A7BC2] text-white flex items-center gap-2">
          <span className="text-sm"><ContentLucideIcon icon={MessageCircle} size={14} variant="toolbar" className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{targetUser ? `${t('Chat Personal', 'Personal Chat')} · ${targetUser.displayName}` : t('Chat Karyawan', 'Employee Chat')}</div>
            <div className="text-[10px] text-blue-100">
              {targetUser
                ? `${t('1:1 conversation', '1:1 conversation')} · ${onlineUserIds.has(targetUser.userId) ? t('online', 'online') : t('offline', 'offline')}`
                : `${onlineUsers.length} ${t('online', 'online')}`}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(['sm', 'md', 'lg'] as const).map((s) => <button key={s} onClick={() => setSize(s)} className={`h-6 px-1.5 rounded text-[10px] font-bold ${size === s ? 'bg-white text-[#005A9E]' : 'bg-white/20 text-white hover:bg-white/30'}`}>{s.toUpperCase()}</button>)}
            <button onClick={onToggleSide} className="h-6 px-1.5 rounded text-[10px] font-bold bg-white/20 text-white hover:bg-white/30" title={t('Snap kiri/kanan', 'Snap left/right')}>{side === 'right' ? '↔ R' : 'L ↔'}</button>
            <button onClick={onClose} className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 text-white text-xs">✕</button>
          </div>
        </div>
        <div className="chat-widget-toolbar px-3 py-2 border-b border-slate-200 bg-slate-50 space-y-2">
          {!targetUser && canClearGlobal && (
            <button onClick={() => void onClearGlobal()} className="w-full h-7 rounded-lg border border-red-200 bg-red-50 text-[11px] font-semibold text-red-600 hover:bg-red-100">
              {t('Clear Semua Pesan Global', 'Clear All Global Messages')}
            </button>
          )}
          <input className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]" placeholder={t('Cari user online...', 'Search online users...')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          <div className="flex items-center gap-1 overflow-x-auto">
            <div className={`h-7 px-2 rounded-lg border flex items-center gap-1 whitespace-nowrap ${!targetUser ? 'bg-[#005A9E] text-white border-[#005A9E]' : 'bg-white text-slate-600 border-slate-200'}`}>
              <button type="button" onClick={() => onSelectTarget(null)} className="text-[11px] font-semibold inline-flex items-center gap-1"><ContentLucideIcon icon={Globe} size={11} variant="toolbar" className={!targetUser ? 'text-white' : undefined} /> {t('Global', 'Global')}</button>
              <button type="button" onClick={() => togglePin('global')} className={`text-[10px] ${pinnedThreads.includes('global') ? 'text-amber-300' : 'opacity-70'}`}><ContentLucideIcon icon={Pin} size={10} variant="toolbar" className={pinnedThreads.includes('global') ? 'text-amber-300' : undefined} /></button>
            </div>
            {filteredOnlineUsers.length > 0 && (
              <>
                <span className="text-[10px] font-bold text-emerald-600 px-1">{t('Online', 'Online')}</span>
                {filteredOnlineUsers.map((u) => <div key={u.userId} className={`h-7 px-2 rounded-lg border flex items-center gap-1 whitespace-nowrap ${targetUser?.userId === u.userId ? 'bg-[#005A9E] text-white border-[#005A9E]' : 'bg-white text-slate-600 border-slate-200'}`}><span className={`w-1.5 h-1.5 rounded-full ${onlineUserIds.has(u.userId) ? 'bg-emerald-500' : 'bg-slate-300'}`} title={onlineUserIds.has(u.userId) ? t('online', 'online') : t('offline', 'offline')} /><button type="button" onClick={() => onSelectTarget(u)} className="text-[11px] font-semibold">{u.displayName}</button><button type="button" onClick={() => togglePin(u.userId)} className={`text-[10px] ${pinnedThreads.includes(u.userId) ? 'text-amber-400' : 'opacity-60'}`}><ContentLucideIcon icon={Pin} size={10} variant="toolbar" className={pinnedThreads.includes(u.userId) ? 'text-amber-400' : targetUser?.userId === u.userId ? 'text-white' : undefined} /></button></div>)}
              </>
            )}
            {filteredOfflineUsers.length > 0 && (
              <>
                <span className="text-[10px] font-bold text-slate-400 px-1">{t('Offline', 'Offline')}</span>
                {filteredOfflineUsers.map((u) => <div key={u.userId} className={`h-7 px-2 rounded-lg border flex items-center gap-1 whitespace-nowrap ${targetUser?.userId === u.userId ? 'bg-[#005A9E] text-white border-[#005A9E]' : 'bg-white text-slate-600 border-slate-200'}`}><span className={`w-1.5 h-1.5 rounded-full ${onlineUserIds.has(u.userId) ? 'bg-emerald-500' : 'bg-slate-300'}`} title={onlineUserIds.has(u.userId) ? t('online', 'online') : t('offline', 'offline')} /><button type="button" onClick={() => onSelectTarget(u)} className="text-[11px] font-semibold">{u.displayName}</button><button type="button" onClick={() => togglePin(u.userId)} className={`text-[10px] ${pinnedThreads.includes(u.userId) ? 'text-amber-400' : 'opacity-60'}`}><ContentLucideIcon icon={Pin} size={10} variant="toolbar" className={pinnedThreads.includes(u.userId) ? 'text-amber-400' : targetUser?.userId === u.userId ? 'text-white' : undefined} /></button></div>)}
              </>
            )}
          </div>
        </div>
        <div className="chat-widget-messages flex-1 overflow-y-auto p-3 space-y-2 bg-[#F8FAFC]">
          {scopedMessages.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-slate-400">{t('Belum ada percakapan.', 'No conversations yet.')}</div> : scopedMessages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}><div className={`chat-widget-bubble max-w-[84%] px-3 py-2 rounded-2xl text-sm ${mine ? 'chat-widget-bubble--mine bg-[#005A9E] text-white' : 'chat-widget-bubble--other bg-white border border-slate-200 text-slate-700'}`}><div className={`text-[10px] font-bold mb-0.5 ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{m.senderName}</div>{m.quotedText && <div className={`chat-widget-quote mb-1.5 px-2 py-1 rounded-lg border text-[11px] ${mine ? 'bg-white/15 border-white/20 text-blue-100' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>↩ {m.quotedSenderName}: {m.quotedText}</div>}<div className="whitespace-pre-wrap break-words">{m.message}</div><div className="flex items-center justify-between gap-2 mt-1"><div className={`text-[10px] ${mine ? 'text-blue-100/80' : 'text-slate-400'}`}>{fmtTimeShort(m.timestamp)}</div><div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1"><button onClick={async () => { try { await navigator.clipboard.writeText(m.message); onToast(t('Pesan disalin.', 'Message copied.'), 'info'); } catch { onToast(t('Gagal menyalin pesan.', 'Failed to copy message.'), 'error'); } }} className={`h-5 px-1.5 rounded text-[10px] ${mine ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>Copy</button><button onClick={() => setReplyTarget(m as ChatMessageLite)} className={`h-5 px-1.5 rounded text-[10px] ${mine ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>Reply</button>{mine && <button onClick={async () => { await onDeleteMessage(m.id); onToast(t('Pesan dihapus.', 'Message deleted.'), 'warning'); }} className="h-5 px-1.5 rounded text-[10px] bg-red-500/80 text-white">{t('Hapus', 'Delete')}</button>}</div></div></div></div>;
          })}
          <div ref={endRef} />
        </div>
        <div className="chat-widget-compose border-t border-slate-200 p-2.5 flex gap-2 bg-white">
          <div className="flex flex-col gap-1 flex-1">
            {replyTarget && <div className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 flex items-center justify-between"><span className="truncate">{t('Reply ke', 'Reply to')} {replyTarget.senderName}: {replyTarget.message}</span><button onClick={() => setReplyTarget(null)} className="ml-2 text-amber-700">✕</button></div>}
            <textarea className="chat-widget-input flex-1 min-h-[36px] max-h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] resize-none" placeholder={targetUser ? `${t('Pesan ke', 'Message to')} ${targetUser.displayName}...` : t('Tulis pesan...', 'Write a message...')} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => setShowEmoji((v) => !v)} className="h-9 px-2 rounded-xl border border-slate-200 bg-slate-50 text-sm hover:bg-slate-100" title={t('Emoji', 'Emoji')}><ContentLucideIcon icon={Smile} size={14} variant="toolbar" /></button>
            <button onClick={submit} disabled={!draft.trim() || sending} className="h-9 px-3 rounded-xl bg-[#005A9E] text-white text-xs font-bold hover:bg-[#004880] disabled:opacity-50">{t('Kirim', 'Send')}</button>
          </div>
        </div>
        {showEmoji && <div className="chat-widget-emoji border-t border-slate-200 p-2 bg-slate-50 flex flex-wrap gap-1">{EMOJIS.map((e) => <button key={e} onClick={() => setDraft((prev) => `${prev}${e}`)} className="w-8 h-8 rounded-lg hover:bg-white text-lg">{e}</button>)}</div>}
      </div>
    </div>
  );
}
