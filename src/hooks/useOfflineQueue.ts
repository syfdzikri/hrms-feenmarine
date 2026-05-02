import { useCallback, useEffect, useState } from 'react';

type QueueItem = {
  id: string;
  action: string;
  payload: unknown;
  createdAt: number;
};

const QUEUE_KEY = 'hrms_offline_queue_v1';

const readQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
};

const writeQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

export function useOfflineQueue(flushers: Record<string, (payload: unknown) => Promise<void>>) {
  const [queueSize, setQueueSize] = useState(0);

  const enqueue = useCallback((action: string, payload: unknown) => {
    const next = [...readQueue(), { id: `${Date.now()}-${Math.random()}`, action, payload, createdAt: Date.now() }];
    writeQueue(next);
    setQueueSize(next.length);
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    const current = readQueue();
    if (!current.length) {
      setQueueSize(0);
      return;
    }
    const remaining: QueueItem[] = [];
    for (const item of current) {
      const fn = flushers[item.action];
      if (!fn) continue;
      try {
        await fn(item.payload);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueueSize(remaining.length);
  }, [flushers]);

  useEffect(() => {
    setQueueSize(readQueue().length);
    const onOnline = () => { flush(); };
    window.addEventListener('online', onOnline);
    flush();
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return { queueSize, enqueue, flush };
}
