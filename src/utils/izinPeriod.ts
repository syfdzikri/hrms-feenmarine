export function normalizeIzinCutoffDay(cutoffDay?: number): number {
  const v = Number(cutoffDay);
  if (!Number.isFinite(v)) return 21;
  return Math.min(28, Math.max(1, Math.floor(v)));
}

export function getIzinPeriode(dateStr: string, cutoffDay?: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  const cutoff = normalizeIzinCutoffDay(cutoffDay);
  const day = d.getDate();
  if (day < cutoff) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentIzinPeriode(cutoffDay?: number): string {
  const today = new Date();
  const cutoff = normalizeIzinCutoffDay(cutoffDay);
  const day = today.getDate();
  if (day < cutoff) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}
