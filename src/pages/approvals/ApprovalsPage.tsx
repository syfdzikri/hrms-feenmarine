import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Lightbulb, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
import { ContentLucideIcon } from '../../components/icons/ContentLucideIcon';
import { useI18n } from '../../i18n/store';
import type { AppUser, ApprovalRequest, Employee } from '../../types';
import { fmtDateTime } from '../../utils/common';

export function ApprovalsPage({
  approvals,
  employees,
  currentUser,
  onApprove,
  onReject,
  focusApprovalId,
  onFocusHandled,
}: {
  approvals: ApprovalRequest[];
  employees: Employee[];
  currentUser: AppUser;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, note?: string) => void;
  focusApprovalId?: string | null;
  onFocusHandled?: () => void;
}) {
  const { t } = useI18n();
  const pending = approvals.filter((a) => a.status === 'pending');
  const history = approvals.filter((a) => a.status !== 'pending').slice(0, 50);
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [expandNote, setExpandNote] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [listDensity, setListDensity] = useState<'comfy' | 'compact'>('comfy');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hrms_approvals_density');
      if (saved === 'compact' || saved === 'comfy') {
        setListDensity(saved);
      }
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hrms_approvals_density', listDensity);
    } catch {
      void 0;
    }
  }, [listDensity]);

  useEffect(() => {
    if (!focusApprovalId) return;
    const el = document.getElementById(`approval-${focusApprovalId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(focusApprovalId);
      const tid = window.setTimeout(() => setHighlightId((prev) => (prev === focusApprovalId ? null : prev)), 2200);
      onFocusHandled?.();
      return () => window.clearTimeout(tid);
    }
    onFocusHandled?.();
  }, [focusApprovalId, onFocusHandled]);

  const changedKeys = (a: ApprovalRequest) => Object.keys(a.changes || {});
  const fieldLabel: Record<string, string> = {
    nama: t('Nama', 'Name'),
    departemen: t('Departemen', 'Department'),
    tglKontrak: t('Tanggal Kontrak', 'Contract Date'),
    jatahAwal: t('Jatah Cuti', 'Leave Quota'),
    posisi: t('Posisi/Jabatan', 'Position/Title'),
    gender: t('Gender', 'Gender'),
  };
  const currentEmpName = (id: string) => employees.find((e) => e.id === id)?.nama;
  const latestActivityTs = approvals[0]?.requestedAt || '';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-extrabold text-slate-800">{t('Approval Perubahan Data Karyawan', 'Employee Data Change Approval')}</div>
            <div className="text-xs text-slate-400 mt-0.5">{t('Khusus Super Admin. Admin wajib ajukan approval sebelum perubahan diterapkan.', 'For Super Admin only. Admins must submit approval before changes are applied.')}</div>
          </div>
          <span className="text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">{t('Pending', 'Pending')}: {pending.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('Request Pending', 'Pending Requests')}</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-800">{pending.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('Riwayat', 'History')}</div>
            <div className="mt-0.5 text-lg font-extrabold text-slate-800">{history.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('Aktivitas Terakhir', 'Latest Activity')}</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-700">{latestActivityTs ? fmtDateTime(latestActivityTs) : '-'}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('Request Pending', 'Pending Requests')}</div>
        </div>
        <div className="inline-flex items-center gap-2">
          <div className="h-8 p-1 rounded-xl border border-slate-200 bg-slate-50 inline-flex items-center">
            <button
              type="button"
              onClick={() => setListDensity('comfy')}
              className={`h-6 px-2.5 rounded-lg text-[11px] font-bold transition ${
                listDensity === 'comfy' ? 'bg-[#005A9E] text-white' : 'text-slate-500 hover:bg-white'
              }`}
            >
              {t('Comfy', 'Comfy')}
            </button>
            <button
              type="button"
              onClick={() => setListDensity('compact')}
              className={`h-6 px-2.5 rounded-lg text-[11px] font-bold transition ${
                listDensity === 'compact' ? 'bg-[#005A9E] text-white' : 'text-slate-500 hover:bg-white'
              }`}
            >
              {t('Compact', 'Compact')}
            </button>
          </div>
          <span className="text-[11px] text-slate-400">{t('Login', 'Login')}: {currentUser.displayName}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {pending.length === 0 ? (
          <div className="py-14 text-center text-slate-400 px-4">
            <div className="text-5xl mb-3 inline-flex text-emerald-500"><ContentLucideIcon icon={ShieldCheck} size={40} className="text-emerald-500" /></div>
            <p className="text-sm font-semibold text-slate-600">{t('Tidak ada request approval', 'No approval requests')}</p>
            <p className="text-xs mt-1">{t('Semua pengajuan perubahan sudah ditangani.', 'All submitted changes have been handled.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((a) => {
              const keys = changedKeys(a);
              const empNow = currentEmpName(a.employeeId);
              const stale = empNow && empNow !== a.employeeName;
              const noteVal = decisionNote[a.id] || '';
              const showNoteBox = expandNote === a.id;
              return (
                <div id={`approval-${a.id}`} key={a.id} className={`px-4 transition ${listDensity === 'compact' ? 'py-2.5' : 'py-4'} ${highlightId === a.id ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : ''}`}>
                  <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-slate-800 ${listDensity === 'compact' ? 'text-sm' : ''}`}>
                        {a.employeeName}
                        {stale && <span className="ml-2 text-[10px] text-amber-600 font-semibold inline-flex items-center gap-1"><ContentLucideIcon icon={AlertTriangle} size={10} variant="toolbar" /> {t('data berubah', 'data changed')}: {empNow}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">{a.department}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1.5">
                        <ContentLucideIcon icon={Clock3} size={11} variant="toolbar" />
                        {t('Pemohon', 'Requester')}: <strong>{a.requestedByName}</strong> · {fmtDateTime(a.requestedAt)}
                      </div>
                      <div className={`${listDensity === 'compact' ? 'mt-1.5 space-y-0.5' : 'mt-2 space-y-1'}`}>
                        {keys.slice(0, 4).map((k) => (
                          <div key={k} className={`${listDensity === 'compact' ? 'text-[11px]' : 'text-[12px]'} text-slate-700`}>
                            <span className="font-bold text-slate-500">{fieldLabel[k] || k}</span>
                            <span className="text-slate-400">: </span>
                            <span className="line-through text-slate-400">{String((a.before as Record<string, unknown>)[k] ?? '-')}</span>
                            <span className="text-slate-400"> → </span>
                            <span className="font-semibold text-slate-800">{String((a.changes as Record<string, unknown>)[k] ?? '-')}</span>
                          </div>
                        ))}
                        {keys.length > 4 && <div className="text-[11px] text-slate-400">+{keys.length - 4} {t('perubahan lain', 'other changes')}</div>}
                      </div>
                    </div>
                    <div className={`flex flex-col gap-2 flex-shrink-0 ${listDensity === 'compact' ? 'min-w-[170px]' : 'min-w-[190px]'}`}>
                      <button type="button" onClick={() => setExpandNote(showNoteBox ? null : a.id)} className={`${listDensity === 'compact' ? 'h-6 text-[10px]' : 'h-7 text-[11px]'} px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition flex items-center justify-center gap-1`}>
                        <ContentLucideIcon icon={MessageCircle} size={11} variant="toolbar" /> {showNoteBox ? t('Tutup Catatan', 'Close Note') : t('Tulis Catatan', 'Write Note')}
                      </button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onApprove(a.id, noteVal)} className={`flex-1 ${listDensity === 'compact' ? 'h-7 text-[10px]' : 'h-8 text-[11px]'} px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition active:scale-95 inline-flex items-center justify-center gap-1`}>
                          <ContentLucideIcon icon={CheckCircle2} size={13} variant="toolbar" className="text-white" /> {t('Setujui', 'Approve')}
                        </button>
                        <button type="button" onClick={() => onReject(a.id, noteVal)} className={`flex-1 ${listDensity === 'compact' ? 'h-7 text-[10px]' : 'h-8 text-[11px]'} px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition active:scale-95 inline-flex items-center justify-center gap-1`}>
                          <ContentLucideIcon icon={XCircle} size={13} variant="toolbar" className="text-white" /> {t('Tolak', 'Reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                  {showNoteBox && (
                    <div className="mt-3">
                      <textarea
                        className="w-full h-20 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-slate-700 outline-none focus:border-amber-400 resize-none"
                        placeholder={t('Tulis catatan/alasan keputusan (opsional, terlihat oleh pemohon)…', 'Write decision note/reason (optional, visible to requester)…')}
                        value={noteVal}
                        onChange={(e) => setDecisionNote((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1"><ContentLucideIcon icon={Lightbulb} size={10} variant="toolbar" /> {t('Catatan ini akan ditampilkan di notifikasi dan riwayat approval.', 'This note will be shown in notifications and approval history.')}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Riwayat (50 terakhir)', 'History (latest 50)')}</span>
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">{t('Belum ada riwayat', 'No history yet')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div id={`approval-${h.id}`} key={h.id} className={`px-5 py-3 transition ${highlightId === h.id ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-sm">{h.employeeName}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${h.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {h.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {h.requestedByName} · {fmtDateTime(h.requestedAt)} {h.decisionBy ? `→ ${h.decisionBy} (${fmtDateTime(h.decisionAt)})` : ''}
                </div>
                {h.decisionNote && (
                  <div className="mt-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                    <span className="inline-flex items-center gap-1"><ContentLucideIcon icon={MessageCircle} size={11} variant="toolbar" /> <em>{h.decisionNote}</em></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
