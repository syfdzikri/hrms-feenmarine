import{n as e}from"./rolldown-runtime-jpDsebLB.js";import{r as t,t as n}from"./vendor-react-CX8OipY-.js";import{Ct as r,G as i,R as a,Z as o,_ as s,et as c,ft as l,pt as u,u as d}from"./vendor-ui-C0k7Z5iu.js";import{n as f}from"./vendor-firebase-CUrt--ZD.js";import{b as p,i as m,n as h,r as g}from"./index-D77TBE5E.js";import{t as _}from"./ContentLucideIcon-CH57j9u-.js";var v=e(t(),1),y=e=>e===`superadmin`||e===`admin`||e===`viewer`?e:`viewer`,b=e=>{let t=e.trim().toLowerCase();return t?t.includes(`@`)?[t]:[`${t}@feenmarine.local`,t]:[]};async function x(e,t){let n=b(e),r;for(let e of n)try{let n=await f(p,e,t),r=y((await n.user.getIdTokenResult(!0)).claims.role);return{uid:n.user.uid,email:n.user.email,role:r}}catch(e){r=e}throw r??Error(`Authentication failed`)}var S=n(),C=`hrms_login_attempts`,w=`hrms_username_history`,T=5,E=600*1e3,D=6,O=()=>{let e=new Date(new Date().toLocaleString(`en-US`,{timeZone:`Asia/Jakarta`}));return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)} ${String(e.getHours()).padStart(2,`0`)}:${String(e.getMinutes()).padStart(2,`0`)}`},k=e=>{try{let t=localStorage.getItem(`${C}_${e}`);return t?JSON.parse(t):{count:0,firstAttemptAt:Date.now()}}catch{return{count:0,firstAttemptAt:Date.now()}}},A=(e,t)=>{try{localStorage.setItem(`${C}_${e}`,JSON.stringify(t))}catch{}},j=e=>{try{localStorage.removeItem(`${C}_${e}`)}catch{}},M=()=>{try{let e=localStorage.getItem(w);if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t.filter(e=>typeof e==`string`):[]}catch{return[]}},N=e=>{let t=e.trim();if(t)try{let e=[t,...M().filter(e=>e.toLowerCase()!==t.toLowerCase())].slice(0,D);localStorage.setItem(w,JSON.stringify(e))}catch{}},P=e=>{let t=e.trim().toLowerCase();if(t)try{let e=M().filter(e=>e.trim().toLowerCase()!==t);localStorage.setItem(w,JSON.stringify(e))}catch{}};function F({appUsers:e,onLogin:t,companyName:n,verifyLegacyPassword:f,dark:p,onToggleTheme:y}){let{t:b}=h(),[C,w]=(0,v.useState)(``),[D,F]=(0,v.useState)(``),[I,L]=(0,v.useState)(!1),[R,z]=(0,v.useState)(``),[B,V]=(0,v.useState)(!1),[H,U]=(0,v.useState)(0),[W,G]=(0,v.useState)(()=>M()),[K,q]=(0,v.useState)(!1);(0,v.useEffect)(()=>{if(H<=0)return;let e=setInterval(()=>{U(t=>{let n=t-1;return n<=0&&clearInterval(e),Math.max(0,n)})},1e3);return()=>clearInterval(e)},[H]),(0,v.useEffect)(()=>{if(!C){U(0);return}let e=k(C);e.lockedUntil&&Date.now()<e.lockedUntil?U(Math.ceil((e.lockedUntil-Date.now())/1e3)):U(0)},[C]);let J=async()=>{if(!C||!D){z(b(`Username dan password harus diisi.`,`Username and password are required.`));return}let n=k(C);if(n.lockedUntil&&Date.now()<n.lockedUntil){let e=Math.ceil((n.lockedUntil-Date.now())/1e3);U(e),z(`${b(`Akun dikunci sementara. Coba lagi dalam`,`Account is temporarily locked. Try again in`)} ${Math.ceil(e/60)} ${b(`menit.`,`minutes.`)}`);return}V(!0),z(``),await new Promise(e=>setTimeout(e,300));try{let n=await x(C,D),r=e.find(e=>e.firebaseUid===n.uid||e.email===n.email||e.username.toLowerCase()===C.toLowerCase())||{id:n.uid,firebaseUid:n.uid,username:n.email||C,email:n.email||void 0,passwordHash:``,role:n.role,displayName:n.email?.split(`@`)[0]||C,createdAt:O()};j(C),U(0),N(C),G(M()),t(r),V(!1);return}catch{}let r=C.trim().toLowerCase(),i=e.find(e=>e.username.trim().toLowerCase()===r);if(!i){z(b(`Username atau password salah.`,`Invalid username or password.`)),V(!1);return}if(await f(D,i.passwordHash))j(C),U(0),N(C),G(M()),t(i);else{let e=(n.count||0)+1,t=n.firstAttemptAt||Date.now(),r=T-e;e>=T?(A(C,{count:e,firstAttemptAt:t,lockedUntil:Date.now()+E}),U(E/1e3),z(b(`Terlalu banyak percobaan gagal. Akun dikunci selama 10 menit.`,`Too many failed attempts. Account is locked for 10 minutes.`))):(A(C,{count:e,firstAttemptAt:t}),z(`${b(`Username atau password salah.`,`Invalid username or password.`)} ${r} ${b(`percobaan tersisa.`,`attempts remaining.`)}`))}V(!1)},Y=`w-full h-12 px-4 bg-white/80 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition placeholder:text-slate-400`;return(0,S.jsxs)(`div`,{className:`login-shell h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-[#003d6e] via-[#005A9E] to-[#0077CC] flex items-center justify-center p-4 overflow-hidden overscroll-none transition-[background] duration-200 ease-out`,style:{fontFamily:`'DM Sans',sans-serif`},children:[(0,S.jsx)(`div`,{className:`login-grid absolute inset-0 opacity-10`,style:{backgroundImage:`radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,backgroundSize:`50px 50px`}}),(0,S.jsx)(`div`,{className:`absolute -top-16 -left-16 w-64 h-64 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none`,style:{animation:`floatBlob 12s ease-in-out infinite`}}),(0,S.jsx)(`div`,{className:`absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-blue-200/20 blur-3xl pointer-events-none`,style:{animation:`floatBlob 14s ease-in-out infinite reverse`}}),(0,S.jsxs)(`button`,{type:`button`,onClick:y,className:`absolute top-4 right-4 z-20 h-10 px-3 rounded-xl border border-white/30 bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xs font-semibold transition inline-flex items-center gap-2`,title:p?b(`Ganti ke mode terang`,`Switch to light mode`):b(`Ganti ke mode gelap`,`Switch to dark mode`),children:[(0,S.jsx)(_,{icon:p?s:a,size:14,variant:`toolbar`,className:`text-white`}),p?b(`Light`,`Light`):b(`Dark`,`Dark`)]}),(0,S.jsxs)(`div`,{className:`w-full max-w-sm relative`,style:{animation:`slideUp .55s ease-out`},children:[(0,S.jsxs)(`div`,{className:`text-center mb-8`,style:{animation:`fadeIn .6s ease-out`},children:[(0,S.jsx)(`div`,{className:`inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-xl`,style:{animation:`softPulse 3.5s ease-in-out infinite`},children:(0,S.jsx)(`img`,{src:`/fmlogo.png`,alt:`FM Logo`,className:`w-14 h-14`})}),(0,S.jsx)(`h1`,{className:`text-2xl font-extrabold text-white tracking-tight transition-colors duration-200 ease-out`,children:n}),(0,S.jsx)(`p`,{className:`login-title-sub text-blue-200 text-sm mt-1 transition-colors duration-200 ease-out`,children:b(`HR Management System`,`HR Management System`)})]}),(0,S.jsxs)(`div`,{className:`login-card bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/50 relative transition-[background-color,border-color,box-shadow] duration-200 ease-out`,style:{animation:`scaleIn .45s ease-out`},children:[(0,S.jsx)(`div`,{className:`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#005A9E]/35 to-transparent`}),(0,S.jsxs)(`div`,{className:`px-6 pt-6 pb-2`,children:[(0,S.jsx)(`h2`,{className:`login-card-title text-lg font-bold text-slate-800 transition-colors duration-200 ease-out`,children:b(`Selamat Datang`,`Welcome`)}),(0,S.jsx)(`p`,{className:`login-card-subtitle text-sm text-slate-400 mt-0.5 transition-colors duration-200 ease-out`,children:b(`Masuk untuk melanjutkan`,`Sign in to continue`)})]}),(0,S.jsxs)(`div`,{className:`px-6 py-5 space-y-4`,children:[(0,S.jsxs)(`div`,{children:[(0,S.jsx)(`label`,{className:`block text-xs font-semibold text-slate-500 mb-1.5`,children:`Username`}),(0,S.jsxs)(`div`,{className:`relative`,children:[(0,S.jsx)(`input`,{className:`${Y} pr-10 focus:scale-[1.01]`,placeholder:b(`Masukkan username`,`Enter username`),value:C,onChange:e=>{w(e.target.value),z(``),q(!0)},onFocus:()=>q(!0),onBlur:()=>setTimeout(()=>q(!1),120),onKeyDown:e=>e.key===`Enter`&&J()}),(0,S.jsx)(`button`,{type:`button`,onMouseDown:e=>e.preventDefault(),onClick:()=>q(e=>!e),className:`absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center`,children:(0,S.jsx)(_,{icon:r,size:14,variant:`toolbar`})}),K&&W.length>0&&(0,S.jsx)(`div`,{className:`absolute z-30 mt-1 w-full rounded-xl border border-slate-200/80 bg-slate-50/95 overflow-hidden shadow-lg`,children:(0,S.jsx)(`div`,{className:`max-h-36 overflow-y-auto`,children:W.slice(0,6).map(e=>(0,S.jsxs)(`div`,{className:`h-8 px-2.5 border-b last:border-b-0 border-slate-200/70 flex items-center gap-2`,children:[(0,S.jsx)(`button`,{type:`button`,onClick:()=>{w(e),z(``),q(!1)},className:`flex-1 text-left text-[12px] text-slate-700 font-semibold hover:text-[#005A9E] truncate transition`,title:e,children:e}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>{P(e),G(M())},className:`w-5 h-5 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[11px] leading-none inline-flex items-center justify-center transition`,"aria-label":`${b(`Hapus`,`Remove`)} ${e}`,title:b(`Hapus dari riwayat`,`Remove from history`),children:`×`})]},e))})})]})]}),(0,S.jsxs)(`div`,{className:`relative`,children:[(0,S.jsx)(`label`,{className:`block text-xs font-semibold text-slate-500 mb-1.5`,children:b(`Password`,`Password`)}),(0,S.jsx)(`input`,{type:I?`text`:`password`,className:`${Y} focus:scale-[1.01]`,placeholder:b(`Masukkan password`,`Enter password`),value:D,onChange:e=>{F(e.target.value),z(``)},onKeyDown:e=>e.key===`Enter`&&J()}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>L(!I),className:`absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition text-sm`,children:I?(0,S.jsx)(_,{icon:u,size:14,variant:`toolbar`}):(0,S.jsx)(_,{icon:l,size:14,variant:`toolbar`})})]}),R&&(0,S.jsxs)(`div`,{className:`flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600`,children:[(0,S.jsx)(_,{icon:d,size:14,variant:`toolbar`}),` `,R]}),H>0&&(0,S.jsxs)(`div`,{className:`flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-700 font-semibold`,children:[(0,S.jsx)(_,{icon:i,size:14,variant:`toolbar`}),b(`Akun dikunci · Buka dalam`,`Account locked · Unlock in`),` `,(0,S.jsxs)(`span`,{className:`font-bold font-mono`,children:[Math.floor(H/60),`:`,String(H%60).padStart(2,`0`)]})]}),(0,S.jsxs)(`button`,{type:`button`,onClick:J,disabled:B||H>0,className:`w-full h-12 bg-[#005A9E] hover:bg-[#004880] text-white rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#005A9E]/30 hover:shadow-xl hover:shadow-[#005A9E]/40`,children:[B?(0,S.jsx)(`span`,{className:`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin`}):null,H>0?(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(_,{icon:i,size:14,variant:`toolbar`,className:`text-white`}),` `,b(`Akun Dikunci`,`Account Locked`)]}):B?b(`Memverifikasi...`,`Verifying...`):(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(_,{icon:c,size:14,variant:`toolbar`,className:`text-white`}),` `,b(`Masuk`,`Sign In`)]})]})]}),(0,S.jsx)(`div`,{className:`login-help px-6 pb-5 text-center text-xs text-slate-400 transition-colors duration-200 ease-out`,children:b(`Hubungi administrator untuk reset password`,`Contact administrator to reset password`)})]}),e.length===0&&(0,S.jsxs)(`div`,{className:`mt-4 px-4 py-3 bg-amber-500/20 backdrop-blur rounded-xl text-amber-100 text-xs text-center inline-flex items-center justify-center gap-1`,children:[(0,S.jsx)(_,{icon:o,size:12,variant:`toolbar`,className:`text-amber-100`}),` `,b(`Silakan hubungi administrator untuk akun pertama`,`Please contact administrator for the first account`)]}),(0,S.jsxs)(`p`,{className:`login-footnote text-center text-blue-200/60 text-[11px] mt-6 transition-colors duration-200 ease-out`,children:[n,` · `,g,` · `,m]})]}),(0,S.jsx)(`style`,{children:`
        @keyframes scaleIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes softPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }
        @keyframes floatBlob { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-16px,0)} }
        [data-theme="dark"] .login-shell {
          background:
            radial-gradient(1200px 520px at 82% -8%, rgba(59,130,246,.22) 0%, rgba(59,130,246,0) 58%),
            radial-gradient(900px 460px at -6% 10%, rgba(14,165,233,.16) 0%, rgba(14,165,233,0) 62%),
            linear-gradient(135deg, #050b14 0%, #0a1424 45%, #0f1b2f 100%);
        }
        [data-theme="dark"] .login-grid { opacity: .1; }
        [data-theme="dark"] .login-card {
          background: linear-gradient(180deg, rgba(12, 21, 38, .92), rgba(11, 27, 48, .9));
          border-color: rgba(100, 116, 139, .34);
          box-shadow: 0 24px 48px -20px rgba(2, 6, 23, .85), inset 0 1px 0 rgba(148, 163, 184, .18);
        }
        [data-theme="dark"] .login-card-title { color: #e2e8f0; }
        [data-theme="dark"] .login-card-subtitle { color: #9fb1c9; }
        [data-theme="dark"] .login-title-sub { color: #9ec5ff; }
        [data-theme="dark"] .login-help { color: #8ea4ba !important; }
        [data-theme="dark"] .login-footnote { color: rgba(148, 163, 184, .78); }
        [data-theme="dark"] .login-shell input,
        [data-theme="dark"] .login-shell textarea,
        [data-theme="dark"] .login-shell select {
          background: rgba(15, 30, 52, .78) !important;
          border-color: rgba(71, 85, 105, .62) !important;
          color: #e2e8f0 !important;
        }
        [data-theme="dark"] .login-shell input::placeholder,
        [data-theme="dark"] .login-shell textarea::placeholder {
          color: #7f93ab !important;
        }
        [data-theme="dark"] .login-shell input:focus,
        [data-theme="dark"] .login-shell textarea:focus,
        [data-theme="dark"] .login-shell select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,.22) !important;
        }
        [data-theme="dark"] .login-shell button.bg-\\[\\#005A9E\\] {
          background: linear-gradient(135deg, #0b5fa7, #0a4f90) !important;
          box-shadow: 0 12px 24px -14px rgba(14, 116, 214, .75) !important;
        }
        [data-theme="dark"] .login-shell button.bg-\\[\\#005A9E\\]:hover {
          background: linear-gradient(135deg, #0c6dbe, #0b5b9f) !important;
        }
        [data-theme="dark"] .login-shell .bg-slate-50\\/80 {
          background: rgba(22, 37, 62, .78) !important;
        }
        [data-theme="dark"] .login-shell .border-slate-200\\/80 {
          border-color: rgba(71, 85, 105, .5) !important;
        }
        [data-theme="dark"] .login-shell .bg-slate-100 {
          background: rgba(30, 47, 74, .88) !important;
        }
        [data-theme="dark"] .login-shell .hover\\:bg-slate-200:hover {
          background: rgba(42, 63, 94, .95) !important;
        }
        [data-theme="dark"] .login-shell .bg-white {
          background: rgba(228, 236, 247, .92) !important;
        }
        [data-theme="dark"] .login-shell .text-slate-600 {
          color: #4e6178 !important;
        }
        [data-theme="dark"] .login-shell .border-white\\/30 {
          border-color: rgba(148, 163, 184, .32) !important;
        }
        [data-theme="dark"] .login-shell .bg-white\\/15 {
          background: rgba(15, 30, 52, .62) !important;
        }
        [data-theme="dark"] .login-shell .hover\\:bg-white\\/25:hover {
          background: rgba(30, 47, 74, .82) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `})]})}export{F as LoginPage};