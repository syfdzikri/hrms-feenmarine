export const appThemeStyles = `
        @keyframes slideUp      { from{opacity:0;transform:translateY(10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(.94) translateY(8px)}  to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fatPrimaryPulse {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 rgba(56, 189, 248, 0); }
          50% { transform: translateY(-0.5px) scale(1.03); box-shadow: 0 6px 14px -10px rgba(56, 189, 248, 0.85); }
        }
        @media (hover:hover) {
          html:not([data-theme="dark"]) tbody tr:hover td { background: #EFF8FF !important; }
        }
        @media (hover:hover) {
          .fat-priority-chip:hover .fat-primary-badge { animation: fatPrimaryPulse 1.25s ease-in-out infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fat-priority-chip:hover .fat-primary-badge { animation: none !important; }
        }
        * { -webkit-tap-highlight-color: transparent; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        :root { scrollbar-width: thin; scrollbar-color: #94A3B8 transparent; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #94A3B8; border-radius: 99px; border: 2px solid transparent; background-clip: content-box; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @media (hover: none), (pointer: coarse) {
          :root { scrollbar-width: auto; }
          ::-webkit-scrollbar { width: 12px; height: 12px; }
          ::-webkit-scrollbar-thumb { background: #64748B; border: 2px solid transparent; background-clip: content-box; }
        }
        .scrollbar-mobile-strong {
          scrollbar-width: auto;
          scrollbar-color: #64748B transparent;
        }
        .scrollbar-mobile-strong::-webkit-scrollbar { width: 10px; height: 10px; }
        .scrollbar-mobile-strong::-webkit-scrollbar-thumb { background: #64748B; border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
        @media (hover: none), (pointer: coarse) {
          .scrollbar-mobile-strong::-webkit-scrollbar { width: 14px; height: 14px; }
          .scrollbar-mobile-strong::-webkit-scrollbar-thumb { background: #475569; }
        }

        /* ── xs breakpoint (480px) for very small phones ── */
        @media (min-width: 480px) {
          .xs\\:block { display: block !important; }
          .xs\\:hidden { display: none !important; }
          .xs\\:flex { display: flex !important; }
        }

        /* ── Design System: consistent button variants ── */
        .btn-primary { @apply h-10 px-4 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl text-sm font-bold transition active:scale-95; }
        .btn-danger  { @apply h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition active:scale-95; }
        .btn-ghost   { @apply h-10 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition active:scale-95; }

        /* ── Skeleton shimmer ── */
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        /* ── 8px grid: ensure consistent spacing ── */
        .space-y-2 > * + * { margin-top: 8px; }
        .space-y-3 > * + * { margin-top: 12px; }
        .space-y-4 > * + * { margin-top: 16px; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }

        /* ═══════════════════════════════════════════════
           DARK MODE — Palette: bg-[#0f172a] → card-[#1e293b] → surface-[#162032]
           ═══════════════════════════════════════════════ */
        [data-theme="dark"] { color-scheme: dark; }

        /* ── Base backgrounds ── */
        [data-theme="dark"] body,
        [data-theme="dark"] .bg-\\[\\#F0F4F8\\] { background:#0f172a !important; }
        [data-theme="dark"] .bg-white           { background:#1e293b !important; }
        [data-theme="dark"] .bg-white\\/95      { background:rgba(30,41,59,.97) !important; }
        [data-theme="dark"] .bg-white\\/80      { background:rgba(30,41,59,.9) !important; }
        [data-theme="dark"] .bg-slate-50        { background:#162032 !important; }
        [data-theme="dark"] .bg-slate-100       { background:#1a2740 !important; }
        [data-theme="dark"] .bg-\\[\\#E8EDF2\\] { background:#111827 !important; }
        [data-theme="dark"] .bg-\\[\\#EFF1F3\\],
        [data-theme="dark"] .bg-\\[\\#EFF8FF\\] { background:#172135 !important; }

        /* ── Top navbar & sidebar (keep brand color, darken slightly) ── */
        [data-theme="dark"] .bg-\\[\\#005A9E\\] { background:#004880 !important; }
        [data-theme="dark"] .bg-\\[\\#004880\\] { background:#003d6e !important; }
        [data-theme="dark"] .bg-\\[\\#004a82\\] { background:#003d6e !important; }
        [data-theme="dark"] .hover\\:bg-\\[\\#004880\\]:hover { background:#003d6e !important; }

        /* ── Borders ── */
        [data-theme="dark"] .border-slate-100  { border-color:#1e2d40 !important; }
        [data-theme="dark"] .border-slate-200  { border-color:#263548 !important; }
        [data-theme="dark"] .border-slate-300  { border-color:#2d3f55 !important; }
        [data-theme="dark"] .divide-slate-100 > * + *,
        [data-theme="dark"] .divide-y > * + *  { border-color:#1e2d40 !important; }

        /* ── Text ── */
        [data-theme="dark"] .text-slate-800    { color:#e8eff8 !important; }
        [data-theme="dark"] .text-slate-700    { color:#d7e2ef !important; }
        [data-theme="dark"] .text-slate-600    { color:#b7c7d9 !important; }
        [data-theme="dark"] .text-slate-500    { color:#98adc2 !important; }
        [data-theme="dark"] .text-slate-400    { color:#8098b1 !important; }
        [data-theme="dark"] .text-slate-900    { color:#f1f5f9 !important; }

        /* Extra slate / opacity surfaces (Absensi, KPI cards) */
        [data-theme="dark"] .bg-slate-50\\/50 { background: rgba(22,32,50,.72) !important; }
        [data-theme="dark"] .bg-slate-50\\/80 { background: rgba(22,32,50,.88) !important; }
        [data-theme="dark"] .bg-slate-50\\/90 { background: rgba(22,32,50,.92) !important; }
        [data-theme="dark"] .border-slate-200\\/90 { border-color: rgba(38,53,72,.92) !important; }

        /* Strong warning / alert text (amber banner, etc.) */
        [data-theme="dark"] .text-amber-950 { color:#fde68a !important; }

        /* Rose palette — anomaly, admin zone, delete actions */
        [data-theme="dark"] .bg-rose-50     { background:rgba(190,18,60,.16) !important; }
        [data-theme="dark"] .bg-rose-100   { background:rgba(190,18,60,.24) !important; }
        [data-theme="dark"] .text-rose-600 { color:#fb7185 !important; }
        [data-theme="dark"] .text-rose-700 { color:#fda4af !important; }
        [data-theme="dark"] .text-rose-800 { color:#fecdd3 !important; }
        [data-theme="dark"] .text-rose-800\\/80 { color: rgba(254, 205, 211, 0.82) !important; }
        [data-theme="dark"] .text-rose-900 { color:#ffe4e6 !important; }
        [data-theme="dark"] .border-rose-200 { border-color:rgba(244,63,94,.42) !important; }
        [data-theme="dark"] .border-rose-300 { border-color:rgba(244,63,94,.5) !important; }
        [data-theme="dark"] .hover\\:bg-rose-50:hover { background:rgba(190,18,60,.12) !important; }

        /* Sky — online badge */
        [data-theme="dark"] .bg-sky-50    { background:rgba(14,165,233,.14) !important; }
        [data-theme="dark"] .text-sky-700 { color:#7dd3fc !important; }
        [data-theme="dark"] .border-sky-200 { border-color:rgba(56,189,248,.38) !important; }

        /* ── Form inputs / select / textarea ── */
        [data-theme="dark"] input:not([type=range]),
        [data-theme="dark"] select,
        [data-theme="dark"] textarea {
          background:#162032 !important;
          color:#e2e8f0 !important;
          border-color:#263548 !important;
        }
        [data-theme="dark"] input::placeholder,
        [data-theme="dark"] textarea::placeholder { color:#6f87a2 !important; }
        [data-theme="dark"] input:focus,
        [data-theme="dark"] select:focus,
        [data-theme="dark"] textarea:focus {
          border-color:#3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,.15) !important;
        }
        [data-theme="dark"] option { background:#1e293b; color:#e2e8f0; }

        /* ── Table rows ── */
        [data-theme="dark"] tbody tr:nth-child(odd) td  { background:#1e293b !important; }
        [data-theme="dark"] tbody tr:nth-child(even) td { background:#162032 !important; }
        [data-theme="dark"] tbody tr:hover td           { background:#1a3048 !important; }
        [data-theme="dark"] thead th,
        [data-theme="dark"] .sticky.top-0 { background:#172135 !important; color:#94a3b8 !important; }

        /* ── Bottom navigation ── */
        [data-theme="dark"] nav.fixed.bottom-0 { background:#1e293b !important; border-color:#263548 !important; }
        [data-theme="dark"] nav.fixed.bottom-0 .text-slate-400 { color:#8098b1 !important; }

        /* Tiny labels: keep readable in dark mode */
        [data-theme="dark"] .text-\\[9px\\].text-slate-400,
        [data-theme="dark"] .text-\\[10px\\].text-slate-400,
        [data-theme="dark"] .text-\\[11px\\].text-slate-400 { color:#8ea6be !important; }
        [data-theme="dark"] .text-\\[9px\\].text-slate-500,
        [data-theme="dark"] .text-\\[10px\\].text-slate-500,
        [data-theme="dark"] .text-\\[11px\\].text-slate-500 { color:#a1b6ca !important; }

        /* ── Sidebar drawer ── */
        [data-theme="dark"] .text-slate-600.hover\\:bg-slate-200:hover { background:#1e3048 !important; }
        [data-theme="dark"] .hover\\:bg-slate-200:hover { background:#1e3048 !important; }
        [data-theme="dark"] .hover\\:bg-slate-50:hover  { background:#162032 !important; }
        [data-theme="dark"] .hover\\:bg-slate-100:hover { background:#1a2740 !important; }

        /* ── Status bar footer ── */
        [data-theme="dark"] .bg-\\[\\#E8EDF2\\].border-t { background:#111827 !important; border-color:#1e2d40 !important; }
        [data-theme="dark"] .bg-white\\/95.border-t     { background:rgba(17,24,39,.97) !important; }

        /* ── Modals & overlays ── */
        [data-theme="dark"] .fixed.inset-0.bg-black\\/60 { background:rgba(0,0,0,.75) !important; }
        [data-theme="dark"] .bg-black\\/60.backdrop-blur-sm { background:rgba(0,0,0,.75) !important; }

        /* ── Colored badge backgrounds (soften in dark) ── */
        [data-theme="dark"] .bg-blue-50    { background:rgba(37,99,235,.15) !important; }
        [data-theme="dark"] .bg-blue-100   { background:rgba(37,99,235,.22) !important; }
        [data-theme="dark"] .bg-emerald-50 { background:rgba(5,150,105,.15) !important; }
        [data-theme="dark"] .bg-emerald-100{ background:rgba(5,150,105,.22) !important; }
        [data-theme="dark"] .bg-amber-50   { background:rgba(180,83,9,.18) !important; }
        [data-theme="dark"] .bg-amber-100  { background:rgba(180,83,9,.25) !important; }
        [data-theme="dark"] .bg-red-50     { background:rgba(185,28,28,.15) !important; }
        [data-theme="dark"] .bg-red-100    { background:rgba(185,28,28,.22) !important; }
        [data-theme="dark"] .bg-purple-50  { background:rgba(109,40,217,.15) !important; }
        [data-theme="dark"] .bg-purple-100 { background:rgba(109,40,217,.22) !important; }
        [data-theme="dark"] .bg-violet-50  { background:rgba(124,58,237,.16) !important; }
        [data-theme="dark"] .bg-violet-100 { background:rgba(124,58,237,.24) !important; }
        [data-theme="dark"] .bg-indigo-50  { background:rgba(79,70,229,.15) !important; }
        [data-theme="dark"] .bg-indigo-100 { background:rgba(79,70,229,.22) !important; }
        [data-theme="dark"] .bg-orange-50  { background:rgba(194,65,12,.15) !important; }
        [data-theme="dark"] .bg-orange-100 { background:rgba(194,65,12,.22) !important; }
        [data-theme="dark"] .bg-cyan-50    { background:rgba(8,145,178,.15) !important; }
        [data-theme="dark"] .bg-cyan-100   { background:rgba(8,145,178,.22) !important; }
        [data-theme="dark"] .bg-pink-50    { background:rgba(219,39,119,.15) !important; }
        [data-theme="dark"] .bg-teal-50    { background:rgba(15,118,110,.15) !important; }

        /* ── Badge borders (soften) ── */
        [data-theme="dark"] .border-blue-100    { border-color:rgba(37,99,235,.3) !important; }
        [data-theme="dark"] .border-blue-200    { border-color:rgba(37,99,235,.4) !important; }
        [data-theme="dark"] .border-emerald-100 { border-color:rgba(5,150,105,.3) !important; }
        [data-theme="dark"] .border-emerald-200 { border-color:rgba(5,150,105,.4) !important; }
        [data-theme="dark"] .border-emerald-300 { border-color:rgba(5,150,105,.5) !important; }
        [data-theme="dark"] .border-amber-100   { border-color:rgba(180,83,9,.3) !important; }
        [data-theme="dark"] .border-amber-200   { border-color:rgba(180,83,9,.4) !important; }
        [data-theme="dark"] .border-red-200     { border-color:rgba(185,28,28,.4) !important; }
        [data-theme="dark"] .border-purple-200  { border-color:rgba(109,40,217,.4) !important; }
        [data-theme="dark"] .border-violet-200  { border-color:rgba(124,58,237,.42) !important; }
        [data-theme="dark"] .border-violet-300  { border-color:rgba(124,58,237,.52) !important; }
        [data-theme="dark"] .border-indigo-200  { border-color:rgba(79,70,229,.4) !important; }
        [data-theme="dark"] .border-orange-100  { border-color:rgba(194,65,12,.3) !important; }
        [data-theme="dark"] .border-blue-50     { border-color:rgba(37,99,235,.2) !important; }
        [data-theme="dark"] .border-purple-100  { border-color:rgba(109,40,217,.3) !important; }

        /* ── Badge text — keep readable ── */
        [data-theme="dark"] .text-blue-700    { color:#7dd3fc !important; }
        [data-theme="dark"] .text-blue-600    { color:#60b4f8 !important; }
        [data-theme="dark"] .text-emerald-700 { color:#6ee7b7 !important; }
        [data-theme="dark"] .text-emerald-600 { color:#5eead4 !important; }
        [data-theme="dark"] .text-amber-700   { color:#fcd34d !important; }
        [data-theme="dark"] .text-amber-600   { color:#fbbf24 !important; }
        [data-theme="dark"] .text-amber-500   { color:#f59e0b !important; }
        [data-theme="dark"] .text-red-700     { color:#fca5a5 !important; }
        [data-theme="dark"] .text-red-600     { color:#f87171 !important; }
        [data-theme="dark"] .text-purple-700  { color:#d8b4fe !important; }
        [data-theme="dark"] .text-violet-700  { color:#c4b5fd !important; }
        [data-theme="dark"] .text-indigo-700  { color:#a5b4fc !important; }
        [data-theme="dark"] .text-orange-600  { color:#fb923c !important; }
        [data-theme="dark"] .text-cyan-700    { color:#67e8f9 !important; }
        [data-theme="dark"] .text-\\[\\#005A9E\\] { color:#60b4f8 !important; }
        [data-theme="dark"] .text-\\[\\#004880\\] { color:#3b9de8 !important; }

        /* ── Shadows ── */
        [data-theme="dark"] .shadow-2xl { box-shadow:0 25px 50px -12px rgba(0,0,0,.8) !important; }
        [data-theme="dark"] .shadow-xl  { box-shadow:0 20px 25px -5px rgba(0,0,0,.6) !important; }
        [data-theme="dark"] .shadow-lg  { box-shadow:0 10px 15px -3px rgba(0,0,0,.5) !important; }
        [data-theme="dark"] .shadow-md  { box-shadow:0 4px 6px -1px rgba(0,0,0,.4) !important; }
        [data-theme="dark"] .shadow-sm  { box-shadow:0 1px 2px rgba(0,0,0,.3) !important; }

        /* ── Gradient headers in modals/cards (darken) ── */
        [data-theme="dark"] .bg-gradient-to-r.from-\\[\\#005A9E\\] { background:linear-gradient(to right,#003d6e,#004880) !important; }
        [data-theme="dark"] .bg-gradient-to-br.from-\\[\\#005A9E\\] { background:linear-gradient(to bottom right,#003d6e,#004880) !important; }
        [data-theme="dark"] .from-emerald-600 { --tw-gradient-from:#065f46 !important; }
        [data-theme="dark"] .to-emerald-500   { --tw-gradient-to:#047857 !important; }
        [data-theme="dark"] .from-indigo-600  { --tw-gradient-from:#3730a3 !important; }
        [data-theme="dark"] .to-indigo-500    { --tw-gradient-to:#4338ca !important; }
        [data-theme="dark"] .from-cyan-600    { --tw-gradient-from:#0e7490 !important; }
        [data-theme="dark"] .to-cyan-500      { --tw-gradient-to:#0891b2 !important; }
        [data-theme="dark"] .from-amber-600   { --tw-gradient-from:#92400e !important; }
        [data-theme="dark"] .to-amber-500     { --tw-gradient-to:#b45309 !important; }
        [data-theme="dark"] .from-rose-600    { --tw-gradient-from:#9f1239 !important; }

        /* ── Tab switcher pills ── */
        [data-theme="dark"] .bg-slate-100.rounded-xl { background:#162032 !important; }
        [data-theme="dark"] .bg-white.text-\\[\\#005A9E\\].shadow-sm { background:#1e3048 !important; }

        /* ── Active row highlights ── */
        [data-theme="dark"] .border-\\[\\#005A9E\\].bg-blue-50 { background:#0f2d4a !important; border-color:#1d6fa8 !important; }
        [data-theme="dark"] .bg-amber-50\\/50 { background:rgba(120,53,15,.12) !important; }
        [data-theme="dark"] .bg-emerald-50\\/60 { background:rgba(5,120,80,.1) !important; }

        /* ── Global search results dropdown ── */
        [data-theme="dark"] .bg-white.border.border-slate-200.rounded-2xl.shadow-2xl { background:#1e293b !important; }

        /* ── Scrollbar ── */
        [data-theme="dark"] { scrollbar-color: #475569 #0f172a; }
        [data-theme="dark"] ::-webkit-scrollbar-track  { background:#0f172a; }
        [data-theme="dark"] ::-webkit-scrollbar-thumb  { background:#64748B; border:2px solid transparent; background-clip: content-box; }
        [data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background:#94A3B8; }
        @media (hover: none), (pointer: coarse) {
          [data-theme="dark"] ::-webkit-scrollbar-thumb  { background:#94A3B8; }
          [data-theme="dark"] .scrollbar-mobile-strong::-webkit-scrollbar-thumb  { background:#94A3B8; }
        }

        /* ── Login page ── */
        [data-theme="dark"] .bg-gradient-to-br.from-\\[\\#003d6e\\] { background:linear-gradient(to bottom right,#020c14,#0a1929) !important; }
        [data-theme="dark"] .bg-white\\/10 { background:rgba(255,255,255,.06) !important; }
        [data-theme="dark"] .bg-white\\/20 { background:rgba(255,255,255,.1) !important; }
        [data-theme="dark"] .border-white\\/20 { border-color:rgba(255,255,255,.1) !important; }
        [data-theme="dark"] .border-white\\/40 { border-color:rgba(255,255,255,.2) !important; }
        [data-theme="dark"] .bg-white\\/5  { background:rgba(255,255,255,.04) !important; }

        /* ── Confirm dialog ── */
        [data-theme="dark"] .bg-slate-50.border-slate-200.rounded-2xl.shadow-2xl { background:#1e293b !important; }

        /* ── Ring chart SVG text ── */
        [data-theme="dark"] svg text { fill:#e2e8f0 !important; }

        /* ── FAT recommendation panel readability ── */
        [data-theme="dark"] .fat-reco-panel {
          background: linear-gradient(to right, #0c2e3b, #132a4a) !important;
          border-color: #1f6f8f !important;
        }
        [data-theme="dark"] .fat-reco-panel .text-slate-500 { color:#9eb6cc !important; }
        [data-theme="dark"] .fat-reco-panel .text-slate-400 { color:#89a2bb !important; }
        [data-theme="dark"] .fat-reco-main {
          background: rgba(12, 116, 147, 0.28) !important;
          border-color: rgba(56, 189, 248, 0.45) !important;
          box-shadow: inset 0 1px 0 rgba(186, 230, 253, 0.12), 0 10px 24px -18px rgba(34, 211, 238, 0.7) !important;
        }
        [data-theme="dark"] .fat-reco-main .text-cyan-900 { color:#d7f4ff !important; }
        [data-theme="dark"] .fat-reco-main .text-cyan-800 { color:#bcecff !important; }
        [data-theme="dark"] .fat-reco-main .text-cyan-700 { color:#8edfff !important; }
        [data-theme="dark"] .fat-reco-backup {
          background: rgba(30, 41, 59, 0.72) !important;
          border-color: rgba(56, 189, 248, 0.3) !important;
          box-shadow: inset 0 1px 0 rgba(226, 232, 240, 0.08) !important;
        }
        [data-theme="dark"] .fat-reco-backup .text-slate-800 { color:#dbeafe !important; }
        [data-theme="dark"] .fat-reco-backup .text-slate-500 { color:#9ab0c5 !important; }
        [data-theme="dark"] .fat-priority-panel { border-color:#32506a !important; background:#18293f !important; }
        [data-theme="dark"] .fat-priority-chip { background:#1d3147 !important; border-color:#33506a !important; }
        [data-theme="dark"] .fat-priority-chip.ring-2.ring-cyan-300 {
          border-color:#38bdf8 !important;
          box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.45), 0 0 20px -10px rgba(34, 211, 238, 0.9) !important;
        }
        [data-theme="dark"] .fat-priority-chip .bg-cyan-200.text-cyan-800 {
          background: rgba(14, 165, 233, 0.26) !important;
          color: #bff3ff !important;
          border: 1px solid rgba(56, 189, 248, 0.42) !important;
        }
        [data-theme="dark"] .fat-priority-chip .bg-amber-200.text-amber-700 {
          background: rgba(245, 158, 11, 0.2) !important;
          color: #fde68a !important;
          border: 1px solid rgba(251, 191, 36, 0.4) !important;
        }
        [data-theme="dark"] .fat-main-name,
        [data-theme="dark"] .fat-main-count {
          color: #ffffff !important;
        }

        /* ── Dashboard fine-tune readability in dark mode ── */
        [data-theme="dark"] .dashboard-kpi-subtext {
          color: #8ea4ba !important;
        }
        [data-theme="dark"] .dashboard-kpi-card {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04) !important;
        }
        [data-theme="dark"] .dashboard-kpi-card--users {
          background: linear-gradient(180deg, rgba(30,64,108,0.9), rgba(24,48,84,0.9)) !important;
          border-color: rgba(56, 189, 248, 0.3) !important;
        }
        [data-theme="dark"] .dashboard-kpi-card--overseas {
          background: linear-gradient(180deg, rgba(8,67,73,0.9), rgba(7,52,58,0.9)) !important;
          border-color: rgba(45, 212, 191, 0.28) !important;
        }
        [data-theme="dark"] .dashboard-kpi-card--leave {
          background: linear-gradient(180deg, rgba(91,52,20,0.88), rgba(70,40,16,0.88)) !important;
          border-color: rgba(251, 191, 36, 0.26) !important;
        }
        [data-theme="dark"] .dashboard-kpi-card--izin {
          background: linear-gradient(180deg, rgba(74,58,128,0.88), rgba(57,44,99,0.88)) !important;
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        [data-theme="dark"] .dashboard-kpi-card--fat {
          background: linear-gradient(180deg, rgba(17,76,92,0.9), rgba(13,58,71,0.9)) !important;
          border-color: rgba(34, 211, 238, 0.28) !important;
        }

        /* ── Chat dark-mode readability ── */
        [data-theme="dark"] .chat-widget-shell,
        [data-theme="dark"] .chat-page-header,
        [data-theme="dark"] .chat-page-body {
          background: #132338 !important;
          border-color: #2b4159 !important;
        }
        [data-theme="dark"] .chat-widget-toolbar,
        [data-theme="dark"] .chat-page-compose,
        [data-theme="dark"] .chat-widget-compose,
        [data-theme="dark"] .chat-widget-emoji {
          background: #102033 !important;
          border-color: #294056 !important;
        }
        [data-theme="dark"] .chat-widget-messages,
        [data-theme="dark"] .chat-page-messages {
          background: #0f1b2b !important;
        }
        [data-theme="dark"] .chat-widget-bubble--other,
        [data-theme="dark"] .chat-page-bubble--other {
          background: #182b42 !important;
          border-color: #2f4863 !important;
          color: #d7e5f5 !important;
        }
        [data-theme="dark"] .chat-widget-bubble--mine,
        [data-theme="dark"] .chat-page-bubble--mine {
          background: linear-gradient(135deg, #0b5fa7, #0a4f90) !important;
          color: #f3f8ff !important;
        }
        [data-theme="dark"] .chat-widget-quote {
          background: rgba(148, 163, 184, 0.14) !important;
          border-color: rgba(148, 163, 184, 0.28) !important;
          color: #b9cee3 !important;
        }
        [data-theme="dark"] .chat-widget-input {
          background: #0f2134 !important;
          border-color: #2e4862 !important;
          color: #dbeafe !important;
        }
        [data-theme="dark"] .chat-widget-input::placeholder {
          color: #67819d !important;
        }

        /* ── Calendar dark-mode readability ── */
        [data-theme="dark"] .calendar-board {
          background: #111f33 !important;
          border-color: #2a3f57 !important;
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
        }
        [data-theme="dark"] .calendar-detail {
          background: #13243a !important;
          border-color: #2b415b !important;
        }
        [data-theme="dark"] .calendar-dow {
          background: #15273c !important;
          color: #8ea5bf !important;
          border-color: #25384f !important;
        }
        [data-theme="dark"] .calendar-grid-cell {
          background: #14253a !important;
          border-color: #22364b !important;
        }
        [data-theme="dark"] .calendar-grid-cell:hover {
          background: #19324c !important;
        }
        [data-theme="dark"] .calendar-grid-cell--adjacent {
          background: #0f1c2d !important;
        }
        [data-theme="dark"] .calendar-grid-cell--adjacent:hover {
          background: #13243a !important;
        }
        [data-theme="dark"] .calendar-kpi-card {
          background: linear-gradient(180deg, rgba(18, 34, 53, 0.95), rgba(14, 27, 44, 0.95)) !important;
          border-color: #2a3f57 !important;
        }
        [data-theme="dark"] .calendar-badge {
          border: 1px solid transparent;
        }
        [data-theme="dark"] .calendar-badge--cuti {
          background: rgba(56, 189, 248, 0.18) !important;
          color: #a5e8ff !important;
          border-color: rgba(125, 211, 252, 0.35) !important;
        }
        [data-theme="dark"] .calendar-badge--izin {
          background: rgba(251, 146, 60, 0.2) !important;
          color: #ffd3a3 !important;
          border-color: rgba(251, 146, 60, 0.4) !important;
        }
        [data-theme="dark"] .calendar-badge--overseas {
          background: rgba(16, 185, 129, 0.18) !important;
          color: #9cf6d0 !important;
          border-color: rgba(52, 211, 153, 0.4) !important;
        }
        [data-theme="dark"] .calendar-badge--fat {
          background: rgba(34, 211, 238, 0.2) !important;
          color: #a5f3fc !important;
          border-color: rgba(34, 211, 238, 0.4) !important;
        }
        [data-theme="dark"] .calendar-badge--holiday {
          background: rgba(251, 113, 133, 0.2) !important;
          color: #fecdd3 !important;
          border-color: rgba(251, 113, 133, 0.38) !important;
        }

        /* ── Absensi (Attendance) — readable surfaces & gradients in dark mode ── */
        [data-theme="dark"] .att-page { color-scheme: dark; }

        [data-theme="dark"] .att-page .shadow-lg.shadow-slate-200\\/60 {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,.45), 0 4px 6px -4px rgba(0,0,0,.32) !important;
        }

        [data-theme="dark"] .att-page .bg-gradient-to-br.from-amber-50.to-white {
          background: linear-gradient(to bottom right, rgba(120,53,15,.28), #1e293b) !important;
        }
        [data-theme="dark"] .att-page .bg-gradient-to-br.from-rose-50.to-white {
          background: linear-gradient(to bottom right, rgba(190,18,60,.2), #1e293b) !important;
        }

        [data-theme="dark"] .att-page thead tr.bg-slate-100\\/90 {
          background: rgba(23,33,53,.95) !important;
        }

        [data-theme="dark"] .att-page tbody tr.ring-1.ring-amber-300 {
          background: rgba(120,53,15,.22) !important;
          --tw-ring-color: rgba(251,191,36,.45) !important;
        }
`;
