import { useEffect, useMemo, useState } from 'react';
import { IzinEntriesList } from '../../components/izin/IzinEntriesList';
import { IzinFormModal } from '../../components/izin/IzinFormModal';
import { IzinHeaderFilters } from '../../components/izin/IzinHeaderFilters';
import { IzinRejectDialog } from '../../components/izin/IzinRejectDialog';
import { useI18n } from '../../i18n/store';
import type { AppUser as AppUserLite, Employee as EmployeeLite, IzinEntry, LogEntry as LogEntryLite, Notification as NotificationLite, ToastKind } from '../../types';
import { fmtDate, nowTs, todayStr, uid } from '../../utils/common';
import { can } from '../../utils/permissions';
import { getCurrentIzinPeriode, getIzinPeriode } from '../../utils/izinPeriod';

export function IzinPage({
  employees, izinEntries, currentUser, izinCutoffDay, izinMaxPerPeriode, fbSaveIzin, fbDeleteIzin, fbAddLog, addNotification, toast,
}: {
  employees: EmployeeLite[];
  izinEntries: IzinEntry[];
  currentUser: AppUserLite;
  izinCutoffDay: number;
  izinMaxPerPeriode: number;
  fbSaveIzin: (iz: IzinEntry) => Promise<void>;
  fbDeleteIzin: (id: string) => Promise<void>;
  fbAddLog: (entry: Omit<LogEntryLite, 'id'>) => Promise<void>;
  addNotification: (notif: Omit<NotificationLite, 'id' | 'timestamp' | 'read'>) => Promise<NotificationLite>;
  toast: (msg: string, kind?: ToastKind) => void;
}) {
  const { t, language } = useI18n();
  const canWrite = can(currentUser.role, 'write');
  const isSuperAdmin = currentUser.role === 'superadmin';
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<IzinEntry | null>(null);
  const [filterPeriode, setFilterPeriode] = useState(getCurrentIzinPeriode(izinCutoffDay));
  const [filterTipe, setFilterTipe] = useState<'all' | 'terlambat' | 'pulang_cepat' | 'sakit'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQ, setSearchQ] = useState('');

  const [fEmpId, setFEmpId] = useState('');
  const [fEmpSearch, setFEmpSearch] = useState('');
  const [fTipe, setFTipe] = useState<'terlambat' | 'pulang_cepat' | 'sakit'>('terlambat');
  const [fTanggal, setFTanggal] = useState(todayStr());
  const [fJam, setFJam] = useState('');
  const [fMcRef, setFMcRef] = useState('');
  const [fAlasan, setFAlasan] = useState('');
  const [fSaving, setFSaving] = useState(false);

  const MAX_PER_PERIODE = Math.max(1, izinMaxPerPeriode || 3);
  const WORK_END = '17:00';
  const MAX_DELAY_HOURS = 4;
  const normalizeMcRef = (raw: string) => {
    const v = raw.trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
    return v;
  };

  useEffect(() => {
    if (editEntry) {
      const emp = employees.find((e) => e.id === editEntry.employeeId || e.nama === editEntry.employeeName);
      setFEmpId(emp?.id || '');
      setFTipe(editEntry.tipe);
      setFTanggal(editEntry.tanggal);
      setFJam(editEntry.tipe === 'terlambat' ? (editEntry.jamMasukSesungguhnya || '') : editEntry.tipe === 'pulang_cepat' ? (editEntry.jamPulangLebihAwal || '') : '');
      setFMcRef(editEntry.mcRef || '');
      setFAlasan(editEntry.alasan);
    } else {
      if (currentUser.role === 'admin' && currentUser.linkedEmployeeName) {
        const linked = employees.find((e) => e.nama === currentUser.linkedEmployeeName);
        setFEmpId(linked?.id || '');
      } else {
        setFEmpId('');
      }
      setFTipe('terlambat'); setFTanggal(todayStr()); setFJam(''); setFMcRef(''); setFAlasan('');
    }
    setFEmpSearch('');
  }, [editEntry, showForm, currentUser.role, currentUser.linkedEmployeeName, employees]);

  const getJamError = (): string => {
    if (fTipe === 'sakit') return '';
    if (!fJam) return '';
    const [h, m] = fJam.split(':').map(Number);
    const mins = h * 60 + m;
    if (fTipe === 'terlambat') {
      const workStartMins = 8 * 60;
      const toleranceMins = 5;
      const maxLateMins = workStartMins + MAX_DELAY_HOURS * 60;
      if (mins <= workStartMins + toleranceMins) return t('Izin terlambat mulai jam 08:06 (toleransi 5 menit).', 'Late permit starts at 08:06 (5-minute grace period).');
      if (mins > maxLateMins) return t('Izin terlambat max 4 jam (paling lambat 12:00)', 'Late permit max 4 hours (latest 12:00)');
    } else {
      const workEndMins = 17 * 60;
      const minEarlyMins = workEndMins - MAX_DELAY_HOURS * 60;
      if (mins >= workEndMins) return `${t('Jam pulang harus sebelum', 'Departure time must be before')} ${WORK_END} (${t('jam pulang normal', 'regular end time')})`;
      if (mins < minEarlyMins) return t('Izin pulang cepat max 4 jam (paling awal 13:00)', 'Early-leave permit max 4 hours (earliest 13:00)');
    }
    return '';
  };

  const getUsedCount = (empName: string, periode: string, excludeId?: string): number => izinEntries.filter((iz) =>
    iz.employeeName === empName &&
    iz.periode === periode &&
    iz.status !== 'rejected' &&
    iz.id !== excludeId
  ).length;

  const canSubmitIzin = canWrite && (currentUser.role !== 'admin' || !!currentUser.linkedEmployeeName);
  const currentUserEmployeeName = currentUser.linkedEmployeeName || '';
  const isIzinStillPlanned = (iz: IzinEntry) => {
    const jam = iz.tipe === 'terlambat' ? iz.jamMasukSesungguhnya : iz.jamPulangLebihAwal;
    if (!jam) return todayStr() <= iz.tanggal;
    const eventAt = new Date(`${iz.tanggal}T${jam}:00`);
    if (Number.isNaN(eventAt.getTime())) return todayStr() <= iz.tanggal;
    return eventAt.getTime() > Date.now();
  };
  const canManageOwnPlannedIzin = (iz: IzinEntry) =>
    (!!currentUserEmployeeName && iz.employeeName === currentUserEmployeeName) && iz.status !== 'rejected' && isIzinStillPlanned(iz);

  const handleSave = async () => {
    if (!canSubmitIzin) { toast(t('Anda tidak punya izin untuk mengajukan izin.', 'You do not have permission to submit permits.'), 'error'); return; }
    if (!fEmpId) { toast(t('Pilih karyawan!', 'Select an employee!'), 'error'); return; }
    if (!fTanggal) { toast(t('Pilih tanggal!', 'Select a date!'), 'error'); return; }
    if (fTipe !== 'sakit' && !fJam) { toast(t('Isi jam!', 'Fill in the time!'), 'error'); return; }
    const jamErr = getJamError();
    if (jamErr) { toast(jamErr, 'error'); return; }
    const normalizedMcRef = normalizeMcRef(fMcRef);
    if (fTipe === 'sakit' && !normalizedMcRef) {
      toast(t('Lampiran/nomor MC dokter wajib diisi untuk izin sakit.', 'Doctor MC attachment/reference is required for sick permit.'), 'error');
      return;
    }
    if (!fAlasan.trim()) { toast(t('Alasan harus diisi!', 'Reason is required!'), 'error'); return; }

    const emp = employees.find((e) => e.id === fEmpId);
    if (!emp) { toast(t('Karyawan tidak ditemukan!', 'Employee not found!'), 'error'); return; }
    if (currentUser.role === 'admin') {
      if (!currentUser.linkedEmployeeName || emp.nama !== currentUser.linkedEmployeeName) {
        toast(t('Admin hanya dapat mengajukan izin untuk data dirinya sendiri.', 'Admin can only submit permit for their own linked employee.'), 'error');
        return;
      }
    }
    const periode = getIzinPeriode(fTanggal, izinCutoffDay);
    const usedCount = getUsedCount(emp.nama, periode, editEntry?.id);
    if (usedCount >= MAX_PER_PERIODE) { toast(`${t('Jatah izin periode ini sudah habis', 'Permit quota for this period is exhausted')} (${MAX_PER_PERIODE}x)`, 'error'); return; }

    setFSaving(true);
    try {
      const now = nowTs();
      const isNewSubmission = !editEntry;
      const izin: IzinEntry = {
        id: editEntry?.id || uid('izin'),
        employeeId: emp.id,
        employeeName: emp.nama,
        department: emp.departemen,
        tipe: fTipe,
        tanggal: fTanggal,
        alasan: fAlasan.trim(),
        status: editEntry ? editEntry.status : 'pending',
        createdAt: editEntry?.createdAt || now,
        createdBy: editEntry?.createdBy || currentUser.displayName,
        periode,
        ...(fTipe === 'terlambat' ? { jamMasukSesungguhnya: fJam } : {}),
        ...(fTipe === 'pulang_cepat' ? { jamPulangLebihAwal: fJam } : {}),
        ...(fTipe === 'sakit' ? { mcRef: normalizedMcRef } : {}),
      };
      await fbSaveIzin(izin);
      if (isNewSubmission) {
        await addNotification({
          type: 'warning',
          title: t('Pengajuan izin baru', 'New permit request'),
          message: `${emp.nama} ${t('mengajukan izin', 'submitted')} ${fTipe === 'terlambat' ? t('datang terlambat', 'late arrival') : fTipe === 'pulang_cepat' ? t('pulang cepat', 'early leave') : t('sakit', 'sick')} ${t('pada', 'on')} ${fmtDate(fTanggal)}.`,
          targetRole: 'superadmin',
          relatedId: izin.id,
          action: 'openIzin',
        });
      }
      fbAddLog({
        timestamp: now,
        nama: emp.nama,
        departemen: emp.departemen,
        tglCuti: fTanggal,
        keterangan: fTipe === 'sakit'
          ? `Pengajuan izin sakit oleh ${currentUser.displayName}: MC ${normalizedMcRef} — ${fAlasan.trim()}`
          : `Pengajuan izin ${fTipe === 'terlambat' ? 'datang terlambat' : 'pulang cepat'} oleh ${currentUser.displayName}: ${fTipe === 'terlambat' ? `Masuk jam ${fJam}` : `Pulang jam ${fJam}`} — ${fAlasan.trim()}`,
        logType: 'izin',
      }).catch((e) => console.warn('[IzinPage] log write failed:', e));
      toast(editEntry ? t('Izin diperbarui.', 'Permit updated.') : t('Pengajuan izin berhasil dikirim!', 'Permit request submitted successfully!'), 'success');
      setShowForm(false); setEditEntry(null);
    } catch (err: any) {
      const msg = err?.message || String(err) || '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        toast(t('Akses ditolak Firebase (permission denied). Tambahkan rule: "izinEntries": {".read": true, ".write": true} di database rules.', 'Firebase permission denied. Add rule: "izinEntries": {".read": true, ".write": true} in database rules.'), 'error');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('offline')) {
        toast(t('Tidak ada koneksi internet. Coba lagi.', 'No internet connection. Please try again.'), 'error');
      } else {
        toast(`${t('Gagal menyimpan:', 'Failed to save:')} ${msg.slice(0, 80) || t('Coba lagi.', 'Try again.')}`, 'error');
      }
    } finally {
      setFSaving(false);
    }
  };

  const handleApprove = async (iz: IzinEntry) => {
    if (!isSuperAdmin) { toast(t('Hanya Super Admin yang bisa menyetujui.', 'Only Super Admin can approve.'), 'error'); return; }
    const updated: IzinEntry = { ...iz, status: 'approved', approvedBy: currentUser.displayName, approvedAt: nowTs() };
    await fbSaveIzin(updated);
    await fbAddLog({ timestamp: nowTs(), nama: iz.employeeName, departemen: iz.department, tglCuti: iz.tanggal, keterangan: `Izin ${iz.tipe === 'terlambat' ? 'datang terlambat' : iz.tipe === 'pulang_cepat' ? 'pulang cepat' : 'sakit'} DISETUJUI oleh ${currentUser.displayName}`, logType: 'izin' });
    toast(t('Izin disetujui.', 'Permit approved.'), 'success');
  };

  const [rejectTarget, setRejectTarget] = useState<IzinEntry | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const handleReject = (iz: IzinEntry) => {
    if (!isSuperAdmin) { toast(t('Hanya Super Admin yang bisa menolak.', 'Only Super Admin can reject.'), 'error'); return; }
    setRejectTarget(iz);
    setRejectNote('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const updated: IzinEntry = { ...rejectTarget, status: 'rejected', rejectedBy: currentUser.displayName, rejectedAt: nowTs(), rejectionNote: rejectNote.trim() || undefined };
    await fbSaveIzin(updated);
    await fbAddLog({ timestamp: nowTs(), nama: rejectTarget.employeeName, departemen: rejectTarget.department, tglCuti: rejectTarget.tanggal, keterangan: `Izin ${rejectTarget.tipe === 'terlambat' ? 'datang terlambat' : rejectTarget.tipe === 'pulang_cepat' ? 'pulang cepat' : 'sakit'} DITOLAK oleh ${currentUser.displayName}${rejectNote.trim() ? ': ' + rejectNote.trim() : ''}`, logType: 'izin' });
    toast(t('Izin ditolak.', 'Permit rejected.'), 'warning');
    setRejectTarget(null); setRejectNote('');
  };

  const handleDelete = async (iz: IzinEntry) => {
    if (!isSuperAdmin) { toast(t('Tidak punya izin.', 'No permission.'), 'error'); return; }
    await fbDeleteIzin(iz.id);
    toast(t('Izin dihapus.', 'Permit deleted.'), 'warning');
  };

  const handleCancelOwn = async (iz: IzinEntry) => {
    if (!canManageOwnPlannedIzin(iz)) { toast(t('Izin yang sudah melewati tanggal/jam tidak bisa dibatalkan.', 'Permits that already passed date/time cannot be canceled.'), 'error'); return; }
    await fbDeleteIzin(iz.id);
    await fbAddLog({
      timestamp: nowTs(),
      nama: iz.employeeName,
      departemen: iz.department,
      tglCuti: iz.tanggal,
      keterangan: `Pengajuan izin (rencana) dibatalkan oleh ${currentUser.displayName}.`,
      logType: 'izin',
    });
    toast(t('Pengajuan izin dibatalkan.', 'Permit request canceled.'), 'warning');
  };

  const periods = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: 'all', label: language === 'en' ? 'All Periods' : 'Semua Periode' },
    ];
    const currentPeriod = getCurrentIzinPeriode(izinCutoffDay);
    const [curY, curM] = currentPeriod.split('-').map(Number);
    const anchorMonth = Number.isFinite(curY) && Number.isFinite(curM)
      ? new Date(curY, curM - 1, 1)
      : new Date();
    const cutoff = Math.min(28, Math.max(1, izinCutoffDay || 21));
    for (let i = 0; i < 3; i++) {
      const d = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const M = language === 'en'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      if (cutoff === 1) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        list.push({ value: val, label: `1 ${M[d.getMonth()]} – ${lastDay} ${M[d.getMonth()]} ${d.getFullYear()}` });
      } else {
        const prevM = new Date(d.getFullYear(), d.getMonth() - 1, cutoff);
        list.push({ value: val, label: `${cutoff} ${M[prevM.getMonth()]} – ${cutoff - 1} ${M[d.getMonth()]} ${d.getFullYear()}` });
      }
    }
    return list;
  }, [language, izinCutoffDay]);

  const filteredEntries = useMemo(() => izinEntries.filter((iz) => {
    if (filterPeriode !== 'all' && iz.periode !== filterPeriode) return false;
    if (filterTipe !== 'all' && iz.tipe !== filterTipe) return false;
    if (filterStatus !== 'all' && iz.status !== filterStatus) return false;
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      return iz.employeeName.toLowerCase().includes(q) || iz.department.toLowerCase().includes(q) || iz.alasan.toLowerCase().includes(q);
    }
    return true;
  }), [izinEntries, filterPeriode, filterTipe, filterStatus, searchQ]);

  const empSummary = useMemo(() => {
    const map: Record<string, { name: string; dept: string; used: number; approved: number; pending: number; rejected: number }> = {};
    izinEntries
      .filter((iz) => filterPeriode === 'all' || iz.periode === filterPeriode)
      .forEach((iz) => {
      const k = iz.employeeName;
      if (!map[k]) map[k] = { name: k, dept: iz.department, used: 0, approved: 0, pending: 0, rejected: 0 };
      map[k].used++;
      if (iz.status === 'approved') map[k].approved++;
      else if (iz.status === 'pending') map[k].pending++;
      else if (iz.status === 'rejected') map[k].rejected++;
      });
    return Object.values(map).sort((a, b) => b.used - a.used);
  }, [izinEntries, filterPeriode]);

  const linkedEmpName = currentUser.linkedEmployeeName;
  const myUsedCount = linkedEmpName ? getUsedCount(linkedEmpName, getCurrentIzinPeriode(izinCutoffDay)) : 0;
  const myRemaining = MAX_PER_PERIODE - myUsedCount;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-4 gap-3">
      <div className="flex-shrink-0 min-w-0">
      <IzinHeaderFilters
        canSubmitIzin={canSubmitIzin}
        currentUserRole={currentUser.role}
        onOpenCreate={() => { setEditEntry(null); setShowForm(true); }}
        linkedEmpName={linkedEmpName}
        myUsedCount={myUsedCount}
        myRemaining={myRemaining}
        izinCutoffDay={izinCutoffDay}
        filterPeriode={filterPeriode}
        setFilterPeriode={setFilterPeriode}
        periods={periods}
        filterTipe={filterTipe}
        setFilterTipe={setFilterTipe}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        empSummary={empSummary}
        maxPerPeriode={MAX_PER_PERIODE}
      />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <IzinEntriesList
        filteredEntries={filteredEntries}
        canSubmitIzin={canSubmitIzin}
        currentUserRole={currentUser.role}
        linkedEmpName={linkedEmpName}
        onOpenCreate={() => { setEditEntry(null); setShowForm(true); }}
        getUsedCount={getUsedCount}
        maxPerPeriode={MAX_PER_PERIODE}
        todayStr={todayStr}
        fmtDate={fmtDate}
        isSuperAdmin={isSuperAdmin}
        canManageOwnPlannedIzin={canManageOwnPlannedIzin}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        onEdit={(iz) => { setEditEntry(iz as IzinEntry); setShowForm(true); }}
        onCancelOwn={handleCancelOwn}
      />
      </div>

      <IzinRejectDialog
        rejectTarget={rejectTarget}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
        onClose={() => { setRejectTarget(null); setRejectNote(''); }}
        onConfirm={confirmReject}
        fmtDate={fmtDate}
      />

      <IzinFormModal
        open={showForm}
        editMode={!!editEntry}
        onClose={() => { setShowForm(false); setEditEntry(null); }}
        employees={employees}
        currentUser={currentUser}
        fEmpSearch={fEmpSearch}
        setFEmpSearch={setFEmpSearch}
        fEmpId={fEmpId}
        setFEmpId={setFEmpId}
        fTipe={fTipe}
        setFTipe={setFTipe}
        fTanggal={fTanggal}
        setFTanggal={setFTanggal}
        fJam={fJam}
        setFJam={setFJam}
        fMcRef={fMcRef}
        setFMcRef={setFMcRef}
        fAlasan={fAlasan}
        setFAlasan={setFAlasan}
        getJamError={getJamError}
        getUsedCount={getUsedCount}
        getCurrentIzinPeriode={() => getCurrentIzinPeriode(izinCutoffDay)}
        izinCutoffDay={izinCutoffDay}
        maxPerPeriode={MAX_PER_PERIODE}
        onSave={handleSave}
        fSaving={fSaving}
      />
    </div>
  );
}
