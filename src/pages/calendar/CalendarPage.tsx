import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/store';
import type { FATEntry, LogEntry, OverseasEntry } from '../../types';
import { parseLeaveRange } from '../../utils/leave';

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  while (cur <= last) {
    result.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

interface CalEvent {
  nama: string;
  dept: string;
  tipe: 'cuti' | 'izin' | 'overseas' | 'fat';
  info?: string;
}

/** Satu baris perwakilan untuk izin: hindari menampilkan semua langkah approval/log sistem untuk orang & tanggal yang sama. */
function pickRepresentativeIzinLog(rows: LogEntry[]): LogEntry {
  if (rows.length <= 1) return rows[0];
  const sorted = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const submission = sorted.find((l) => /pengajuan/i.test(l.keterangan));
  if (submission) return submission;
  return sorted[sorted.length - 1];
}

function groupKeyIzin(log: LogEntry): string {
  return `${log.tglCuti ?? ''}\u0001${log.nama.trim().toLowerCase()}\u0001${log.departemen}`;
}

function groupKeyCutiDay(dateStr: string, nama: string, dept: string): string {
  return `${dateStr}\u0001${nama.trim().toLowerCase()}\u0001${dept}`;
}

/** Izin tidak punya `leaveStatus`; status akhir ditanggung teks log terbaru (dibatalkan / ditolak). */
function shouldHideIzinGroupFromCalendar(rows: LogEntry[]): boolean {
  if (!rows.length) return true;
  const sorted = [...rows].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const k = (sorted[0].keterangan || '').trim();
  if (/dibatalkan/i.test(k)) return true;
  if (/DITOLAK\s+oleh/i.test(k)) return true;
  return false;
}

export function CalendarPage({ logs, overseas, fatEntries }: { logs: LogEntry[]; overseas: OverseasEntry[]; fatEntries: FATEntry[] }) {
  const { t, language } = useI18n();
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selDate, setSelDate] = useState<string | null>(todayLocal);
  const [fDept, setFDept] = useState('');
  const [fTipe, setFTipe] = useState<'' | 'cuti' | 'izin' | 'overseas' | 'fat'>('');
  const [holidayMap, setHolidayMap] = useState<Record<string, string[]>>({});

  const todayStr2 = todayLocal;
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const eventMap = useMemo<Record<string, CalEvent[]>>(() => {
    const map: Record<string, CalEvent[]> = {};
    const add = (date: string, ev: CalEvent) => {
      if (!map[date]) map[date] = [];
      map[date].push(ev);
    };

    const cutiSeenPerDate: Record<string, Set<string>> = {};

    logs.forEach((log) => {
      const isLeaveLog = log.logType === 'leave' || log.status === 'used' || log.status === 'planned';
      if (!isLeaveLog) return;
      if (log.leaveStatus === 'canceled') return;
      const range = parseLeaveRange(log.tglCuti);
      if (!range) return;
      datesBetween(range.start, range.end).forEach((d) => {
        const k = groupKeyCutiDay(d, log.nama, log.departemen);
        if (!cutiSeenPerDate[d]) cutiSeenPerDate[d] = new Set();
        if (cutiSeenPerDate[d].has(k)) return;
        cutiSeenPerDate[d].add(k);
        add(d, { nama: log.nama, dept: log.departemen, tipe: 'cuti' });
      });
    });

    const izinByGroup = new Map<string, LogEntry[]>();
    logs.forEach((log) => {
      if (log.logType !== 'izin' || !log.tglCuti) return;
      const key = groupKeyIzin(log);
      if (!izinByGroup.has(key)) izinByGroup.set(key, []);
      izinByGroup.get(key)!.push(log);
    });
    izinByGroup.forEach((rows) => {
      if (shouldHideIzinGroupFromCalendar(rows)) return;
      const rep = pickRepresentativeIzinLog(rows);
      add(rep.tglCuti!, {
        nama: rep.nama,
        dept: rep.departemen,
        tipe: 'izin',
        info: rep.keterangan?.trim() || 'Izin',
      });
    });

    overseas.forEach((o) => {
      if (!o.tglMulai || !o.tglSelesai) return;
      if (o.status === 'completed') return;
      datesBetween(o.tglMulai, o.tglSelesai).forEach((d) => add(d, { nama: o.nama, dept: o.departemen, tipe: 'overseas', info: `${o.tipe} · ${o.lokasi} · ${o.projectNo}` }));
    });

    fatEntries.forEach((f) => {
      if (!f.fatDateTime) return;
      const d = new Date(f.fatDateTime);
      if (isNaN(d.getTime())) return;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const eng = f.assignedTo || '-';
      add(dateStr, {
        nama: eng,
        dept: 'Electrical & Automation',
        tipe: 'fat',
        info: `FAT ${f.fatClass} · ${f.projectNo} · ${timeStr}${f.keterangan ? ` · ${f.keterangan}` : ''}`,
      });
    });

    return map;
  }, [logs, overseas, fatEntries]);

  const allDepts = useMemo(() => {
    const s = new Set<string>();
    [...logs.map((l) => l.departemen), ...overseas.map((o) => o.departemen)].forEach((d) => d && s.add(d));
    if (fatEntries.length) s.add('Electrical & Automation');
    return Array.from(s).sort();
  }, [logs, overseas, fatEntries]);

  const holidayYearsToLoad = useMemo(() => {
    const s = new Set<number>([year]);
    if (month === 0) s.add(year - 1);
    if (month === 11) s.add(year + 1);
    return [...s];
  }, [year, month]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const loadHolidays = async () => {
      try {
        const map: Record<string, string[]> = {};
        for (const y of holidayYearsToLoad) {
          const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/ID`, { signal: controller.signal });
          if (!res.ok) continue;
          const data = await res.json() as Array<{ date?: string; localName?: string; name?: string }>;
          data.forEach((h) => {
            if (!h?.date) return;
            const d = new Date(`${h.date}T12:00:00`);
            if (isNaN(d.getTime())) return;
            const ds = fmtDate(d);
            if (!map[ds]) map[ds] = [];
            map[ds].push(h.localName || h.name || 'Holiday');
          });
        }
        if (active) setHolidayMap(map);
      } catch {
        if (active) setHolidayMap({});
      }
    };
    loadHolidays();
    return () => {
      active = false;
      controller.abort();
    };
  }, [holidayYearsToLoad]);

  const getEvents = (dateStr: string): CalEvent[] => (eventMap[dateStr] || []).filter((e) => (!fDept || e.dept === fDept) && (!fTipe || e.tipe === fTipe));
  const getHolidayNames = (dateStr: string): string[] => holidayMap[dateStr] || [];

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelDate(todayLocal);
  };

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;

  const cells: { day: number; inCurrentMonth: boolean; dateStr: string }[] = [];
  for (let i = 0; i < firstDow; i++) {
    const d = prevMonthLastDay - firstDow + 1 + i;
    const ds = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, inCurrentMonth: false, dateStr: ds });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, inCurrentMonth: true, dateStr: ds });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const ds = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    cells.push({ day: nextDay, inCurrentMonth: false, dateStr: ds });
    nextDay += 1;
  }

  const selEvents = selDate ? getEvents(selDate) : [];
  const selHolidayNames = selDate ? getHolidayNames(selDate) : [];
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
  const cutiNamas = new Set(monthDates.flatMap((d) => (eventMap[d] || []).filter((e) => e.tipe === 'cuti' && (!fDept || e.dept === fDept)).map((e) => e.nama)));
  const ovsNamas = new Set(monthDates.flatMap((d) => (eventMap[d] || []).filter((e) => e.tipe === 'overseas' && (!fDept || e.dept === fDept)).map((e) => e.nama)));
  const fatNamas = new Set(monthDates.flatMap((d) => (eventMap[d] || []).filter((e) => e.tipe === 'fat' && (!fDept || e.dept === fDept)).map((e) => e.nama)));

  const cutiOutNamas = new Set((eventMap[todayStr2] || []).filter((e) => e.tipe === 'cuti' && (!fDept || e.dept === fDept)).map((e) => e.nama));
  const ovsOutNamas = new Set(overseas.filter((o) => o.status === 'active' && o.tglMulai <= todayStr2 && o.tglSelesai >= todayStr2 && (!fDept || o.departemen === fDept)).map((o) => o.nama));
  const totalOutNamas = new Set<string>([...cutiOutNamas, ...ovsOutNamas]);

  return (
    <div className="calendar-shell flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition">‹</button>
          <span className="font-bold text-slate-800 min-w-[160px] text-center">{MONTH_ID[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold transition">›</button>
          <button onClick={goToday} className="h-8 px-3 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition">{t('Hari ini', 'Today')}</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={fDept} onChange={(e) => setFDept(e.target.value)} className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]">
            <option value="">{t('Semua Departemen', 'All Departments')}</option>
            {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fTipe} onChange={(e) => setFTipe(e.target.value as '' | 'cuti' | 'izin' | 'overseas' | 'fat')} className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#005A9E]">
            <option value="">{t('Semua Acara', 'All Events')}</option>
            <option value="cuti">{t('Cuti saja', 'Leave only')}</option>
            <option value="izin">{t('Izin saja', 'Permit only')}</option>
            <option value="overseas">{t('Overseas saja', 'Overseas only')}</option>
            <option value="fat">{t('FAT saja', 'FAT only')}</option>
          </select>
        </div>
      </div>

      <div className="calendar-kpi-grid grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { v: cutiNamas.size, l: t('Karyawan cuti bulan ini', 'Employees on leave this month'), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
          { v: ovsNamas.size, l: t('Karyawan overseas bulan ini', 'Employees overseas this month'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { v: fatNamas.size, l: t('Engineer FAT bulan ini', 'FAT engineers this month'), c: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-100' },
          { v: totalOutNamas.size, l: t('Total tidak di kantor (sedang keluar)', 'Total out of office'), c: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        ].map(({ v, l, c, bg }) => (
          <div key={l} className={`calendar-kpi-card border rounded-xl p-3 text-center ${bg}`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-blue-300 inline-block" /> {t('Cuti', 'Leave')}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> {t('Izin', 'Permit')}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Overseas</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-cyan-400 inline-block" /> FAT</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="w-3 h-3 rounded bg-rose-300 inline-block" /> {t('Hari libur nasional', 'National holiday')}</div>
      </div>

      <div className="calendar-board bg-white border border-slate-200 rounded-2xl overflow-hidden mb-3">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_ID.map((d, dayIndex) => (
            <div key={d} className={`calendar-dow py-2 text-center text-[10px] font-bold uppercase tracking-wider ${dayIndex === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const evs = getEvents(cell.dateStr);
            const isToday = cell.dateStr === todayStr2;
            const isSel = cell.dateStr === selDate;
            const holidayNames = getHolidayNames(cell.dateStr);
            const isHoliday = holidayNames.length > 0;
            const isSunday = new Date(`${cell.dateStr}T12:00:00`).getDay() === 0;
            const cutiCount = evs.filter((e) => e.tipe === 'cuti').length;
            const izinCount = evs.filter((e) => e.tipe === 'izin').length;
            const ovsCount = evs.filter((e) => e.tipe === 'overseas').length;
            const fatCount = evs.filter((e) => e.tipe === 'fat').length;
            const adjacent = !cell.inCurrentMonth;
            const baseBg = adjacent
              ? (isSel ? 'bg-slate-100 ring-2 ring-inset ring-[#005A9E]' : isHoliday ? 'bg-rose-50/50' : isSunday ? 'bg-rose-50/20' : 'bg-slate-50/90')
              : (isSel ? 'bg-blue-50 ring-2 ring-inset ring-[#005A9E]' : isHoliday ? 'bg-rose-50/60 hover:bg-rose-50' : isSunday ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50');
            const dayNumClass = adjacent
              ? `${isToday ? 'bg-[#005A9E] text-white' : isHoliday || isSunday ? 'text-rose-500/80' : 'text-slate-400'}`
              : `${isToday ? 'bg-[#005A9E] text-white' : isHoliday || isSunday ? 'text-rose-700' : 'text-slate-600'}`;
            const badgeMuted = adjacent ? 'opacity-85' : '';
            const adjMonthShort = MONTH_ID[Math.max(0, Math.min(11, parseInt(cell.dateStr.slice(5, 7), 10) - 1))]?.slice(0, 3) ?? '';
            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                onClick={() => setSelDate(cell.dateStr)}
                title={adjacent ? `${cell.dateStr} · ${t('Bukan bulan ini', 'Outside current month')}` : cell.dateStr}
                className={`calendar-grid-cell min-h-[72px] p-1 border-b border-r ${adjacent ? 'calendar-grid-cell--adjacent border-slate-100/80' : 'border-slate-100'} cursor-pointer transition-colors ${baseBg}`}
              >
                <div className="flex items-center justify-between mb-1 gap-0.5">
                  <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${dayNumClass}`}>{cell.day}</span>
                  {adjacent && <span className="text-[8px] font-semibold text-slate-400 truncate leading-tight pr-0.5" title={cell.dateStr}>{adjMonthShort}</span>}
                </div>
                {isHoliday && <div className={`calendar-badge calendar-badge--holiday text-[10px] bg-rose-100/90 text-rose-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium ${badgeMuted}`}>{holidayNames.length > 1 ? `${holidayNames[0]} +${holidayNames.length - 1}` : holidayNames[0]}</div>}
                {cutiCount > 0 && <div className={`calendar-badge calendar-badge--cuti text-[10px] bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium ${badgeMuted}`}>{cutiCount > 1 ? `${cutiCount} ${t('cuti', 'leave')}` : evs.find((e) => e.tipe === 'cuti')?.nama.split(' ')[0]}</div>}
                {izinCount > 0 && <div className={`calendar-badge calendar-badge--izin text-[10px] bg-orange-100 text-orange-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium ${badgeMuted}`}>{izinCount > 1 ? `${izinCount} ${t('izin', 'permit')}` : evs.find((e) => e.tipe === 'izin')?.nama.split(' ')[0]}</div>}
                {ovsCount > 0 && <div className={`calendar-badge calendar-badge--overseas text-[10px] bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium ${badgeMuted}`}>{ovsCount > 1 ? `${ovsCount} overseas` : evs.find((e) => e.tipe === 'overseas')?.nama.split(' ')[0]}</div>}
                {fatCount > 0 && <div className={`calendar-badge calendar-badge--fat text-[10px] bg-cyan-100 text-cyan-700 rounded px-1 py-0.5 truncate font-medium ${badgeMuted}`}>{fatCount > 1 ? `${fatCount} FAT` : `FAT · ${evs.find((e) => e.tipe === 'fat')?.nama.split(' ')[0]}`}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-detail bg-white border border-slate-200 rounded-2xl p-4 min-h-[60px]">
        {selDate ? (
          <>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {new Date(`${selDate}T12:00:00`).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {(selEvents.length > 0 || selHolidayNames.length > 0) && <span className="ml-2 text-slate-400">— {selEvents.length} {t('orang', 'people')}</span>}
            </div>
            {selHolidayNames.length > 0 && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">{t('Hari libur nasional', 'National holiday')}</div>
                <ul className="list-disc pl-4 text-sm text-rose-700 space-y-0.5">
                  {selHolidayNames.map((name, idx) => <li key={`${name}-${idx}`}>{name}</li>)}
                </ul>
              </div>
            )}
            {selEvents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">{t('Tidak ada cuti, overseas, atau FAT', 'No leave, overseas, or FAT events')}</p>
            ) : (
              <div className="space-y-2">
                {selEvents.map((ev, i) => {
                  const colorMap = {
                    cuti: { avatar: 'bg-blue-100 text-blue-700', badge: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Cuti' },
                    izin: { avatar: 'bg-orange-100 text-orange-700', badge: 'bg-orange-50 text-orange-600 border-orange-200', label: t('Izin', 'Permit') },
                    overseas: { avatar: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Overseas' },
                    fat: { avatar: 'bg-cyan-100 text-cyan-700', badge: 'bg-cyan-50 text-cyan-600 border-cyan-200', label: 'FAT' },
                  } as const;
                  const cm = colorMap[ev.tipe];
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${cm.avatar}`}>{ev.nama.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm">{ev.nama}</div>
                        <div className="text-[11px] text-slate-400">{ev.dept}{ev.info && ` · ${ev.info}`}</div>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${cm.badge}`}>{cm.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">{t('Klik tanggal untuk melihat detail', 'Click a date to view details')}</p>
        )}
      </div>
    </div>
  );
}
