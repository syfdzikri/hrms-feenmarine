import fs from 'node:fs';

const paths = [
  'src/pages/attendance/AttendancePage.tsx',
  'src/components/common/ConfirmDialog.tsx',
  'src/components/layout/AppOverlays.tsx',
  'src/App.tsx',
];

for (const p of paths) {
  let s = fs.readFileSync(p, 'utf8');
  let prev;
  do {
    prev = s;
    s = s.replace(/\s+dark:[^\s]+/g, '');
  } while (s !== prev);
  fs.writeFileSync(p, s);
  console.log('stripped', p);
}
