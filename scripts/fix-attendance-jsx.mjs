import fs from 'node:fs';

const path = 'src/pages/attendance/AttendancePage.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Close truncated className="... lines (no closing quote before EOL); skip template literals.
lines = lines.map((line) => {
  if (/className=\{`/.test(line)) return line;
  if (!/className="/.test(line)) return line;
  if (/className="[^"]*"/.test(line)) return line;
  const t = line.trimEnd();
  if (t.endsWith('`}') || t.endsWith('`')) return line;
  if (t.includes('className="') && !/className="[^"]*"/.test(line)) {
    return `${line}">`;
  }
  return line;
});

let s = lines.join('\n');

// Restore common mangled i18n / JSX fragments from greedy dark: removal
const patches = [
  ['text-slate-500 Center\', \'Center Point\')}</div>', 'text-slate-500">{t(\'Titik Center\', \'Center Point\')}</div>'],
  ['tabular-nums text-slate-800 {attendanceCenterLng.toFixed(6)}</div>', 'tabular-nums text-slate-800">{attendanceCenterLat.toFixed(6)}, {attendanceCenterLng.toFixed(6)}</div>'],
  ['text-slate-500 Area\', \'Area Radius\')}</div>', 'text-slate-500">{t(\'Radius Area\', \'Area Radius\')}</div>'],
  ['font-semibold text-slate-800 m</div>', 'font-semibold text-slate-800">{attendanceRadiusMeters} m</div>'],
  ['text-slate-500 Minimum\', \'Minimum Accuracy\')}</div>', 'text-slate-500">{t(\'Akurasi Minimum\', \'Minimum Accuracy\')}</div>'],
  ['className="font-semibold text-slate-800 m</div>', 'className="font-semibold text-slate-800">{attendanceMinAccuracyMeters} m</div>'],
  ['text-slate-800 siap absen:\', \'Ready status:\')}</strong>', 'text-slate-800">{t(\'Status siap absen:\', \'Ready status:\')}</strong>'],
  ['text-slate-800 kerja hari ini (terpasang check-in/out):\', \'Work duration today (paired in/out):\')}</strong>', 'text-slate-800">{t(\'Durasi kerja hari ini (terpasang check-in/out):\', \'Work duration today (paired in/out):\')}</strong>'],
  ['rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm\n                {t(\'Pembacaan terakhir\'', 'rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">\n                {t(\'Pembacaan terakhir\''],
];

for (const [a, b] of patches) {
  s = s.split(a).join(b);
}

fs.writeFileSync(path, s);
console.log('patched', path);
