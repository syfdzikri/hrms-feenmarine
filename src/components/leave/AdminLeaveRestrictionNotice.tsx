import { useI18n } from '../../i18n/store';
import type { UserRole } from '../../types';

export function AdminLeaveRestrictionNotice({ role, linkedEmployeeName }: { role: UserRole; linkedEmployeeName?: string }) {
  const { t } = useI18n();
  if (role !== 'admin') return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
      {t('Akses admin dibatasi: Anda hanya dapat mengelola pengajuan cuti untuk akun Anda sendiri', 'Admin access is limited: you can only manage leave requests for your own account')}
      {linkedEmployeeName ? ` (${linkedEmployeeName})` : '.'}
    </div>
  );
}
