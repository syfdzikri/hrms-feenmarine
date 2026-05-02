import React from 'react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: string; msg: string; kind: ToastKind; }

const TSTYLE: Record<ToastKind, { wrap: string; icon: string; dot: string }> = {
  success: { wrap: 'bg-white border border-emerald-200 shadow-emerald-100', icon: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
  error: { wrap: 'bg-white border border-red-200 shadow-red-100', icon: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  warning: { wrap: 'bg-white border border-amber-200 shadow-amber-100', icon: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  info: { wrap: 'bg-white border border-blue-200 shadow-blue-100', icon: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
};

const ToastIcons: Record<ToastKind, React.FC> = {
  success: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  error: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  warning: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  info: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-20 sm:bottom-5 right-3 sm:right-5 z-[99999] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => {
        const s = TSTYLE[t.kind];
        const Icon = ToastIcons[t.kind];
        return (
          <div key={t.id} onClick={() => onRemove(t.id)} className={`flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-[320px] cursor-pointer hover:opacity-90 transition ${s.wrap}`} style={{ animation: 'slideUp .25s ease-out' }}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}><Icon /></div>
            <span className="text-sm font-semibold text-slate-800 leading-snug">{t.msg}</span>
            <button className="ml-auto text-slate-400 hover:text-slate-600 flex-shrink-0 transition" onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 35}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-5/6" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </tbody>
  );
}
