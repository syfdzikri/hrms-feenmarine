import type { DateTimeFormat } from '../types';

export const nowTs = () => {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtDate = (d: string) => {
  if (!d) return '-';
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2, '0')} ${M[dt.getMonth()]} ${dt.getFullYear()}`;
};

let currentDateTimeFormat: DateTimeFormat = 'id_wib';
export const setDateTimeFormat = (format?: DateTimeFormat) => {
  currentDateTimeFormat = format === 'iso' ? 'iso' : 'id_wib';
};
export const getDateTimeFormat = (): DateTimeFormat => currentDateTimeFormat;
export const fmtDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '-';
  if (currentDateTimeFormat === 'iso') return parsed.toISOString().replace('T', ' ').slice(0, 19);
  const idText = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed);
  return `${idText} WIB`;
};

export const fmtTimeShort = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '-';
  if (currentDateTimeFormat === 'iso') return parsed.toISOString().slice(11, 19);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed);
};

export const fmtDateOnly = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '-';
  if (currentDateTimeFormat === 'iso') return parsed.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

export const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const tsToMs = (s?: string) => {
  if (!s) return 0;
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const t = new Date(normalized).getTime();
  return Number.isFinite(t) ? t : 0;
};

export const getWeekRange = (baseDate = new Date()) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startISO: toISODate(start),
    endISO: toISODate(end),
  };
};
