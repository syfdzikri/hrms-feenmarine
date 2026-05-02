import type { OverseasEntry } from '../types';

function toStartOfDay(dateIso: string) {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function countInclusiveDays(startIso: string, endIso: string) {
  const s = toStartOfDay(startIso);
  const e = toStartOfDay(endIso);
  if (e.getTime() < s.getTime()) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function filterOverseasEntries(entries: OverseasEntry[], ovsFilter: string, ovsSearch: string) {
  const q = ovsSearch.trim().toLowerCase();
  return entries
    .filter(
      (o) =>
        (!ovsFilter || o.tipe === ovsFilter || o.status === ovsFilter) &&
        (!q ||
          o.nama.toLowerCase().includes(q) ||
          (o.projectType || '').toLowerCase().includes(q) ||
          o.projectNo.toLowerCase().includes(q) ||
          o.lokasi.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.tglMulai.localeCompare(a.tglMulai));
}

export function buildOverseasTotalDaysByName(entries: OverseasEntry[]) {
  const map: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  entries.forEach((o) => {
    const start = toStartOfDay(o.tglMulai);
    if (start.getTime() > today.getTime()) return;
    const endIso = o.status === 'active' ? todayIso : o.tglSelesai;
    const days = countInclusiveDays(o.tglMulai, endIso);
    map[o.nama] = (map[o.nama] || 0) + days;
  });

  return map;
}
