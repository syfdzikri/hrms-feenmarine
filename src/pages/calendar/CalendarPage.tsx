import { useMemo, useState } from 'react';
import Holidays from 'date-holidays';
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

export function CalendarPage({ logs, overseas, fatEntries }: { logs: LogEntry[]; overseas: OverseasEntry[]; fatEntries: FATEntry[] }) {
  const { t, language } = useI18n();
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selDate, setSelDate] = useState<string | null>(todayLocal);
  const [fDept, setFDept] = useState('');
  const [fTipe, setFTipe] = useState<'' | 'cuti' | 'izin' | 'overseas' | 'fat'>('');

  const todayStr2 = todayLocal;
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const eventMap = useMemo<Record<string, CalEvent[]>>(() => {
    const map: Record<string, CalEvent[]> = {};
    const add = (date: string, ev: CalEvent) => {
      if (!map[date]) map[date] = [];
      map[date].push(ev);
    };

    logs.forEach((log) => {
      const isLeaveLog = log.logType === 'leave' || log.status === 'used' || log.status === 'planned';
      if (!isLeaveLog) return;
      if (log.leaveStatus === 'canceled') return;
      const range = parseLeaveRange(log.tglCuti);
      if (!range) return;
      datesBetween(range.start, range.end).forEach((d) => add(d, { nama: log.nama, dept: log.departemen, tipe: 'cuti' }));
    });

    logs.forEach((log) => {
      if (log.logType !== 'izin') return;
      if (!log.tglCuti) return;
      add(log.tglCuti, { nama: log.nama, dept: log.departemen, tipe: 'izin', info: log.keterangan || 'Izin' });
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

  const holidayMap = useMemo<Record<string, string[]>>(() => {
    const hd = new Holidays('ID');
    const map: Record<string, string[]> = {};
    hd.getHolidays(year).forEach((h) => {
      if (h.type !== 'public') return;
      const d = h.start instanceof Date ? h.start : new Date(h.date);
      if (isNaN(d.getTime())) return;
      const ds = fmtDate(d);
      if (!map[ds]) map[ds] = [];
      map[ds].push(h.name);
    });
    return map;
  }, [year]);

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
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { day: number; cur: boolean; dateStr: string | null }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: prevMonthDays - firstDow + 1 + i, cur: false, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, cur: true, dateStr: ds });
  }
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDow - daysInMonth + 1, cur: false, dateStr: null });

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
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { v: cutiNamas.size, l: t('Karyawan cuti bulan ini', 'Employees on leave this month'), c: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
          { v: ovsNamas.size, l: t('Karyawan overseas bulan ini', 'Employees overseas this month'), c: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { v: fatNamas.size, l: t('Engineer FAT bulan ini', 'FAT engineers this month'), c: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-100' },
          { v: totalOutNamas.size, l: t('Total tidak di kantor (sedang keluar)', 'Total out of office'), c: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
        ].map(({ v, l, c, bg }) => (
          <div key={l} className={`border rounded-xl p-3 text-center ${bg}`}>
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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-3">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_ID.map((d, dayIndex) => (
            <div key={d} className={`py-2 text-center text-[10px] font-bold uppercase tracking-wider ${dayIndex === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell.cur) {
              return (
                <div key={idx} className="min-h-[72px] p-1 border-b border-r border-slate-50 opacity-30">
                  <span className="text-[11px] text-slate-300">{cell.day}</span>
                </div>
              );
            }
            const evs = getEvents(cell.dateStr!);
            const isToday = cell.dateStr === todayStr2;
            const isSel = cell.dateStr === selDate;
            const holidayNames = getHolidayNames(cell.dateStr!);
            const isHoliday = holidayNames.length > 0;
            const isSunday = new Date(`${cell.dateStr}T12:00:00`).getDay() === 0;
            const cutiCount = evs.filter((e) => e.tipe === 'cuti').length;
            const izinCount = evs.filter((e) => e.tipe === 'izin').length;
            const ovsCount = evs.filter((e) => e.tipe === 'overseas').length;
            const fatCount = evs.filter((e) => e.tipe === 'fat').length;
            return (
              <div
                key={idx}
                onClick={() => setSelDate(cell.dateStr)}
                className={`min-h-[72px] p-1 border-b border-r border-slate-100 cursor-pointer transition-colors ${isSel ? 'bg-blue-50 ring-2 ring-inset ring-[#005A9E]' : isHoliday ? 'bg-rose-50/60 hover:bg-rose-50' : isSunday ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-[#005A9E] text-white' : isHoliday || isSunday ? 'text-rose-700' : 'text-slate-600'}`}>{cell.day}</span>
                </div>
                {isHoliday && <div className="text-[10px] bg-rose-100 text-rose-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium">{holidayNames.length > 1 ? `${holidayNames[0]} +${holidayNames.length - 1}` : holidayNames[0]}</div>}
                {cutiCount > 0 && <div className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium">{cutiCount > 1 ? `${cutiCount} ${t('cuti', 'leave')}` : evs.find((e) => e.tipe === 'cuti')?.nama.split(' ')[0]}</div>}
                {izinCount > 0 && <div className="text-[10px] bg-orange-100 text-orange-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium">{izinCount > 1 ? `${izinCount} ${t('izin', 'permit')}` : evs.find((e) => e.tipe === 'izin')?.nama.split(' ')[0]}</div>}
                {ovsCount > 0 && <div className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 mb-0.5 truncate font-medium">{ovsCount > 1 ? `${ovsCount} overseas` : evs.find((e) => e.tipe === 'overseas')?.nama.split(' ')[0]}</div>}
                {fatCount > 0 && <div className="text-[10px] bg-cyan-100 text-cyan-700 rounded px-1 py-0.5 truncate font-medium">{fatCount > 1 ? `${fatCount} FAT` : `FAT · ${evs.find((e) => e.tipe === 'fat')?.nama.split(' ')[0]}`}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 min-h-[60px]">
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
