import type { LogEntry } from '../types';

export const statusTag = (sisa: number, rencana: number = 0) => {
  if (sisa <= 0 && rencana > 0) return { label: `Rencana ${rencana}h`, badge: 'bg-blue-100 text-blue-700 border border-blue-200', row: 'bg-blue-50' };
  if (sisa <= 0) return { label: 'Habis', badge: 'bg-red-100 text-red-700 border border-red-200', row: 'bg-red-50' };
  if (sisa <= 3) return { label: `Sisa ${sisa}`, badge: 'bg-amber-100 text-amber-700 border border-amber-200', row: 'bg-amber-50' };
  return { label: `Sisa ${sisa}`, badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', row: 'bg-emerald-50' };
};

export const leaveStatusBadge = (log: Pick<LogEntry, 'leaveStatus' | 'status'>) => {
  const ls = log.leaveStatus || (log.status === 'used' ? 'completed' : log.status === 'planned' ? 'planned' : null);
  if (ls === 'canceled') return { label: '❌ Dibatalkan', cls: 'bg-red-100 text-red-700 border-red-200' };
  if (ls === 'revised') return { label: '✏️ Direvisi', cls: 'bg-purple-100 text-purple-700 border-purple-200' };
  if (ls === 'completed') return { label: '✅ Selesai', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (ls === 'planned') return { label: '📋 Rencana', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { label: '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
};

export const parseLeaveRange = (tglCuti: string): { start: string; end: string } | null => {
  if (!tglCuti) return null;
  const s = tglCuti.trim();
  const fmtLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (s.includes(' s/d ')) {
    const parts = s.split(' s/d ');
    const start = parts[0].trim();
    const end = parts[1].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) return { start, end };
    const ds = new Date(start + 'T00:00:00');
    const de = new Date(end + 'T00:00:00');
    if (!isNaN(ds.getTime()) && !isNaN(de.getTime())) return { start: fmtLocal(ds), end: fmtLocal(de) };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { start: s, end: s };
  return null;
};
