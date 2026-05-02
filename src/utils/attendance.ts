import type { AttendanceEntry } from '../types';

export function dayKeyFromCreatedAt(createdAt: string): string {
  return (typeof createdAt === 'string' ? createdAt : '').slice(0, 10);
}

export function monthKeyFromCreatedAt(createdAt: string): string {
  return (typeof createdAt === 'string' ? createdAt : '').slice(0, 7);
}

function entryTimeMs(createdAt: string): number {
  const s = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T');
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export type WorkPair = {
  checkin: AttendanceEntry;
  checkout: AttendanceEntry | null;
  /** Null if no checkout yet or invalid order */
  durationMs: number | null;
};

/**
 * Pairs check-in / check-out in chronological order for one employee and one calendar day.
 * Consecutive check-ins without checkout: previous check-in is closed with no duration.
 */
export function buildWorkPairsForDay(
  entries: AttendanceEntry[],
  employeeName: string,
  dayKey: string,
): WorkPair[] {
  const dayEntries = entries
    .filter((e) => e.employeeName === employeeName && dayKeyFromCreatedAt(e.createdAt) === dayKey)
    .sort((a, b) => entryTimeMs(a.createdAt) - entryTimeMs(b.createdAt));
  const pairs: WorkPair[] = [];
  let open: AttendanceEntry | null = null;
  for (const e of dayEntries) {
    if (e.type === 'checkin') {
      if (open) {
        pairs.push({ checkin: open, checkout: null, durationMs: null });
      }
      open = e;
    } else {
      if (open) {
        const ms = entryTimeMs(e.createdAt) - entryTimeMs(open.createdAt);
        pairs.push({ checkin: open, checkout: e, durationMs: ms >= 0 ? ms : null });
        open = null;
      }
    }
  }
  if (open) {
    pairs.push({ checkin: open, checkout: null, durationMs: null });
  }
  return pairs;
}

export function totalWorkedMsFromPairs(pairs: WorkPair[]): number {
  return pairs.reduce((sum, p) => sum + (typeof p.durationMs === 'number' && p.durationMs > 0 ? p.durationMs : 0), 0);
}

export function formatDurationMs(ms: number): string {
  const safe = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export function isAttendanceAnomaly(entry: AttendanceEntry, minAccuracyMeters: number): boolean {
  return !entry.withinAllowedArea || entry.accuracyMeters > minAccuracyMeters;
}

export type MonthAttendanceStats = {
  monthKey: string;
  workDaysWithPair: number;
  lateCheckins: number;
  entriesInMonth: number;
};

export function computeMonthStats(
  entries: AttendanceEntry[],
  employeeName: string,
  monthKey: string,
): MonthAttendanceStats {
  const inMonth = entries.filter(
    (e) => e.employeeName === employeeName && monthKeyFromCreatedAt(e.createdAt) === monthKey,
  );
  const daySet = new Set<string>();
  for (const d of inMonth.map((e) => dayKeyFromCreatedAt(e.createdAt))) {
    const pairs = buildWorkPairsForDay(entries, employeeName, d);
    if (pairs.some((p) => p.durationMs !== null && p.durationMs > 0)) daySet.add(d);
  }
  const lateCheckins = inMonth.filter((e) => e.type === 'checkin' && e.punctualityStatus === 'late').length;
  return {
    monthKey,
    workDaysWithPair: daySet.size,
    lateCheckins,
    entriesInMonth: inMonth.length,
  };
}
