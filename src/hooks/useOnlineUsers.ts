import { useEffect, useRef, useState } from 'react';
import { get, limitToLast, onDisconnect, onValue, query, ref, remove, set, update } from 'firebase/database';
import { db } from '../services/firebase/client';
import { sendWebhookNotifications } from '../services/notifications/webhook';
import { useOfflineQueue } from './useOfflineQueue';

type UserRole = 'superadmin' | 'admin' | 'viewer';

interface AppUserLite {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

interface OnlineUserLite {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  lastSeen: string;
  loginTime: string;
  currentPage?: string;
}

interface NotificationLite {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetUserId?: string;
  targetRole?: UserRole;
  relatedId?: string;
  action?: string;
}

interface ChatMessageLite {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  recipientId?: string;
  recipientName?: string;
  quotedMessageId?: string;
  quotedSenderName?: string;
  quotedText?: string;
}

export function useOnlineUsers(
  currentUser: AppUserLite | null,
  nowTs: () => string,
  uid: (prefix?: string) => string,
) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserLite[]>([]);
  const [notifications, setNotifications] = useState<NotificationLite[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageLite[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { queueSize: offlineQueueSize, enqueue, flush } = useOfflineQueue({
    saveNotification: async (payload) => {
      const notif = payload as NotificationLite;
      await set(ref(db, `notifications/${notif.id}`), notif);
    },
  });

  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(db, `onlineUsers/${currentUser.id}`);
    const connectedRef = ref(db, '.info/connected');

    const parseLastSeenMs = (s: string | undefined): number => {
      if (!s) return 0;
      const normalized = s.includes('T') ? s : s.replace(' ', 'T');
      const t = new Date(normalized).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const updateOnlineStatus = async () => {
      const onlineUser: OnlineUserLite = {
        id: currentUser.id,
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        role: currentUser.role,
        lastSeen: nowTs(),
        loginTime: localStorage.getItem('hrms_loginTime') || nowTs(),
        currentPage: window.location.hash || 'dashboard',
      };
      await set(userRef, onlineUser);
    };

    updateOnlineStatus();
    heartbeatRef.current = setInterval(updateOnlineStatus, 30000);

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) onDisconnect(userRef).remove();
    });
    const handleBeforeUnload = () => { try { remove(userRef); } catch { /* ignore */ } };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const onlineUsersRef = ref(db, 'onlineUsers');
    const unsubscribe = onValue(onlineUsersRef, (snap) => {
      const data = snap.val() as Record<string, OnlineUserLite> | null;
      if (data) {
        const users = Object.values(data);
        const threshold = Date.now() - 2 * 60 * 1000;
        setOnlineUsers(users.filter((u) => parseLastSeenMs(u.lastSeen) >= threshold));
      } else {
        setOnlineUsers([]);
      }
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      unsubscribe();
      unsubConnected();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      remove(userRef);
    };
  }, [currentUser, nowTs]);

  useEffect(() => {
    if (!currentUser) return;
    const notifRef = query(ref(db, 'notifications'), limitToLast(500));
    const unsubscribe = onValue(notifRef, (snap) => {
      const data = snap.val() as Record<string, NotificationLite> | null;
      if (data) {
        const allNotifs = Object.values(data).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const userNotifs = allNotifs.filter((n) => {
          if (n.targetUserId) return n.targetUserId === currentUser.id;
          if (n.targetRole) return n.targetRole === currentUser.role;
          return true;
        });
        setNotifications(userNotifs);
        setUnreadCount(userNotifs.filter((n) => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const chatRef = query(ref(db, 'chatMessages'), limitToLast(300));
    const unsubscribe = onValue(chatRef, (snap) => {
      const data = snap.val() as Record<string, ChatMessageLite> | null;
      if (!data) { setChatMessages([]); return; }
      const rows = Object.values(data).filter((m) => m.message?.trim()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-200);
      setChatMessages(rows);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notifId: string) => set(ref(db, `notifications/${notifId}/read`), true);
  const markAllAsRead = async () => Promise.all(notifications.filter((n) => !n.read).map((n) => set(ref(db, `notifications/${n.id}/read`), true)));

  const addNotification = async (notif: Omit<NotificationLite, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationLite = { id: uid('notif'), ...notif, timestamp: nowTs(), read: false };
    try {
      await set(ref(db, `notifications/${newNotif.id}`), newNotif);
    } catch {
      enqueue('saveNotification', newNotif);
    }
    const action = (newNotif.action || '').toLowerCase();
    const type = action.includes('approval') ? 'approval_pending' : action.includes('contract') ? 'contract_expiring' : action.includes('visa') ? 'visa_expired' : action.includes('leave') ? 'low_leave_balance' : 'general';
    await sendWebhookNotifications({
      type,
      title: newNotif.title,
      message: newNotif.message,
      timestamp: newNotif.timestamp,
      metadata: { targetUserId: newNotif.targetUserId, targetRole: newNotif.targetRole, relatedId: newNotif.relatedId },
    });
    return newNotif;
  };

  const clearNotifications = async () => Promise.all(notifications.map((n) => remove(ref(db, `notifications/${n.id}`))));
  const deleteNotification = async (id: string) => remove(ref(db, `notifications/${id}`));

  const sendChatMessage = async (
    message: string,
    recipient?: { id: string; displayName: string } | null,
    quoted?: { id: string; senderName: string; text: string } | null,
  ) => {
    if (!currentUser) return;
    const msg: ChatMessageLite = {
      id: uid('chat'),
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      message: message.trim(),
      timestamp: nowTs(),
      ...(recipient ? { recipientId: recipient.id, recipientName: recipient.displayName } : {}),
      ...(quoted ? { quotedMessageId: quoted.id, quotedSenderName: quoted.senderName, quotedText: quoted.text } : {}),
    };
    if (!msg.message) return;
    await set(ref(db, `chatMessages/${msg.id}`), msg);
  };

  const deleteChatMessage = async (id: string) => remove(ref(db, `chatMessages/${id}`));
  const clearGlobalChatMessages = async () => {
    const snap = await get(ref(db, 'chatMessages'));
    const data = snap.val() as Record<string, ChatMessageLite> | null;
    if (!data) return 0;
    const updates: Record<string, null> = {};
    let removedCount = 0;
    Object.entries(data).forEach(([id, msg]) => {
      if (!msg?.recipientId) {
        updates[id] = null;
        removedCount += 1;
      }
    });
    if (removedCount > 0) {
      await update(ref(db, 'chatMessages'), updates);
    }
    return removedCount;
  };

  return {
    onlineUsers,
    notifications,
    chatMessages,
    unreadCount,
    showNotifPanel,
    setShowNotifPanel,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    deleteNotification,
    sendChatMessage,
    deleteChatMessage,
    clearGlobalChatMessages,
    offlineQueueSize,
    flushOfflineQueue: flush,
  };
}
