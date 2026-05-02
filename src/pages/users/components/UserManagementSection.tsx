import type { UserRole } from '../../../types';
import { Eye, EyeOff, Link, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { ContentLucideIcon } from '../../../components/icons/ContentLucideIcon';
import { useI18n } from '../../../i18n/store';
import type { UserManagementSectionProps } from '../types';

export function UserManagementSection(props: UserManagementSectionProps) {
  const { t } = useI18n();
  const { currentUser, canManageUsers, employees, newUserDisplay, setNewUserDisplay, newUserName, setNewUserName, showNewUserPw, setShowNewUserPw, newUserPw, setNewUserPw, newUserRole, setNewUserRole, newUserLinked, setNewUserLinked, newUserCanEditEmployeeData, setNewUserCanEditEmployeeData, doAddUser, roleBadge, roleLabel, appUsers, editUserId, editUserDisplay, setEditUserDisplay, editUserName, setEditUserName, showEditUserPw, setShowEditUserPw, editUserPw, setEditUserPw, editUserRole, setEditUserRole, editUserLinked, setEditUserLinked, editUserCanEditEmployeeData, setEditUserCanEditEmployeeData, doSaveEditUser, doCancelEditUser, doStartEditUser, doDeleteUser, doToggleUserEmployeeEdit } = props;
  if (!canManageUsers) return null;
  const superadminCount = appUsers.filter((u) => u.role === 'superadmin').length;
  const adminCount = appUsers.filter((u) => u.role === 'admin').length;
  const viewerCount = appUsers.filter((u) => u.role === 'viewer').length;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" /></div>
            <h3 className="font-bold text-slate-800">{t('Tambah User Baru', 'Add New User')}</h3>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">{t('Isi data akun dengan benar sebelum menyimpan.', 'Fill account data correctly before saving.')}</div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Nama Lengkap', 'Full Name')}</label><input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Nama ditampilkan', 'Displayed name')} value={newUserDisplay} onChange={(e) => setNewUserDisplay(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Username', 'Username')}</label><input className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Username untuk login', 'Username for login')} value={newUserName} onChange={(e) => setNewUserName(e.target.value.toLowerCase())} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Password', 'Password')}</label><div className="relative"><input type={showNewUserPw ? 'text' : 'password'} className="w-full h-11 px-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Minimal 6 karakter', 'Minimum 6 characters')} value={newUserPw} onChange={(e) => setNewUserPw(e.target.value)} /><button type="button" onClick={() => setShowNewUserPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-base select-none" title={showNewUserPw ? t('Sembunyikan', 'Hide') : t('Tampilkan', 'Show')}>{showNewUserPw ? <ContentLucideIcon icon={EyeOff} size={14} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={14} variant="toolbar" />}</button></div></div>
            <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Role', 'Role')}</label><select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)}><option value="viewer">Viewer — {t('Hanya lihat', 'Read-only')}</option><option value="admin">Admin — {t('Dapat edit data', 'Can edit records')}</option><option value="superadmin">Super Admin — {t('Akses penuh', 'Full access')}</option></select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Link ke Karyawan', 'Link to Employee')} <span className="text-slate-300 font-normal">({t('opsional — untuk menghubungkan akun dengan data karyawan', 'optional — to link account with employee data')})</span></label><select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={newUserLinked} onChange={(e) => setNewUserLinked(e.target.value)}><option value="">-- {t('Tidak di-link', 'Not linked')} --</option>{employees.sort((a, b) => a.nama.localeCompare(b.nama)).map((e) => <option key={e.id} value={e.nama}>{e.nama} ({e.departemen})</option>)}</select></div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><div><div className="text-sm font-semibold text-slate-700">{t('Boleh edit data karyawan sendiri', 'Can edit own employee data')}</div><div className="text-[11px] text-slate-400">{t('Izin khusus untuk edit data karyawan dan jatah cuti yang terhubung ke akun ini saja.', 'Special permission to edit only employee data and leave quota linked to this account.')}</div></div><input type="checkbox" checked={newUserRole === 'superadmin' ? true : newUserCanEditEmployeeData} disabled={newUserRole === 'superadmin'} onChange={(e) => setNewUserCanEditEmployeeData(e.target.checked)} /></label>
          <button type="button" onClick={doAddUser} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition active:scale-95 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Plus} size={14} variant="toolbar" className="text-white" /> {t('Tambah User', 'Add User')}</button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Keterangan Role', 'Role Description')}</span>
        </div>
        <div className="px-5 py-4 space-y-2 text-sm">
          {[{ role: 'superadmin', label: 'Super Admin', desc: t('Akses penuh: CRUD karyawan, overseas, config, manajemen user', 'Full access: CRUD employees, overseas, config, user management') }, { role: 'admin', label: 'Admin', desc: t('Dapat mengelola modul operasional. Izin edit data karyawan & jatah cuti bisa diatur per user.', 'Can manage operational modules. Employee data edit permission can be configured per user.') }, { role: 'viewer', label: 'Viewer', desc: t('Hanya dapat melihat data. Izin edit data karyawan & jatah cuti hanya bisa aktif jika toggle per user dinyalakan.', 'Read-only by default. Employee data edit permission can be enabled via per-user toggle.') }].map((r) => <div key={r.role} className="flex items-start gap-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${roleBadge[r.role as UserRole]}`}>{r.label}</span><span className="text-slate-500 text-xs">{r.desc}</span></div>)}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('User Terdaftar', 'Registered Users')} · {appUsers.length}</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border font-bold ${roleBadge.superadmin}`}>SA {superadminCount}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border font-bold ${roleBadge.admin}`}>AD {adminCount}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border font-bold ${roleBadge.viewer}`}>VW {viewerCount}</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
          {appUsers.map((u) => {
            const isEditing = editUserId === u.id;
            if (isEditing) {
              return (
                <div key={u.id} className="px-5 py-4 bg-amber-50/50 space-y-3">
                  <div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold text-amber-700 uppercase tracking-wider inline-flex items-center gap-1"><ContentLucideIcon icon={Pencil} size={11} variant="toolbar" /> {t('Mengedit User', 'Editing User')}</span>{u.id === currentUser.id && <span className="text-[10px] text-slate-400">({t('akun Anda', 'your account')})</span>}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Nama Lengkap', 'Full Name')}</label><input className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Nama ditampilkan', 'Displayed name')} value={editUserDisplay} onChange={(e) => setEditUserDisplay(e.target.value)} /></div><div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Username', 'Username')}</label><input className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder={t('Username untuk login', 'Username for login')} value={editUserName} onChange={(e) => setEditUserName(e.target.value.toLowerCase())} /></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Password Baru', 'New Password')} <span className="text-slate-300 font-normal">({t('kosongkan jika tidak diubah', 'leave blank if unchanged')})</span></label><div className="relative"><input type={showEditUserPw ? 'text' : 'password'} className="w-full h-10 px-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" placeholder="••••••" value={editUserPw} onChange={(e) => setEditUserPw(e.target.value)} /><button type="button" onClick={() => setShowEditUserPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition text-sm" title={showEditUserPw ? t('Sembunyikan password', 'Hide password') : t('Tampilkan password', 'Show password')}>{showEditUserPw ? <ContentLucideIcon icon={EyeOff} size={13} variant="toolbar" /> : <ContentLucideIcon icon={Eye} size={13} variant="toolbar" />}</button></div></div><div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Role', 'Role')}</label><select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as UserRole)}><option value="viewer">Viewer — {t('Hanya lihat', 'Read-only')}</option><option value="admin">Admin — {t('Dapat edit data', 'Can edit records')}</option><option value="superadmin">Super Admin — {t('Akses penuh', 'Full access')}</option></select></div></div>
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{t('Link ke Karyawan', 'Link to Employee')} <span className="text-slate-300 font-normal">({t('opsional', 'optional')})</span></label><select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005A9E] focus:ring-2 focus:ring-[#005A9E]/10 transition" value={editUserLinked} onChange={(e) => setEditUserLinked(e.target.value)}><option value="">-- {t('Tidak di-link', 'Not linked')} --</option>{employees.slice().sort((a, b) => a.nama.localeCompare(b.nama)).map((e) => <option key={e.id} value={e.nama}>{e.nama} ({e.departemen})</option>)}</select></div>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><div><div className="text-sm font-semibold text-slate-700">{t('Boleh edit data karyawan sendiri', 'Can edit own employee data')}</div><div className="text-[11px] text-slate-400">{t('Jika aktif, user ini hanya bisa edit data karyawan yang terhubung ke akunnya.', 'If enabled, this user can only edit employee data linked to their account.')}</div></div><input type="checkbox" checked={editUserRole === 'superadmin' ? true : editUserCanEditEmployeeData} disabled={editUserRole === 'superadmin'} onChange={(e) => setEditUserCanEditEmployeeData(e.target.checked)} /></label>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1"><button type="button" onClick={doSaveEditUser} className="flex-1 h-10 bg-[#005A9E] hover:bg-[#004a82] text-white rounded-xl font-bold text-sm transition active:scale-95 inline-flex items-center justify-center gap-1"><ContentLucideIcon icon={Save} size={13} variant="toolbar" className="text-white" /> {t('Simpan Perubahan', 'Save Changes')}</button><button onClick={doCancelEditUser} className="h-10 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition">{t('Batal', 'Cancel')}</button></div>
                </div>
              );
            }
            return (
              <div key={u.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 flex-shrink-0">{u.displayName.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><div className="font-semibold text-slate-800 text-sm">{u.displayName}</div><div className="text-xs text-slate-400">@{u.username} · {t('Bergabung', 'Joined')} {u.createdAt?.slice(0, 10)}</div>{u.linkedEmployeeName && <div className="text-[10px] text-emerald-600 font-medium inline-flex items-center gap-1"><ContentLucideIcon icon={Link} size={10} variant="toolbar" /> {u.linkedEmployeeName}</div>}<div className="text-[10px] mt-1"><span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold border ${(u.role === 'superadmin' || u.canEditEmployeeData) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{(u.role === 'superadmin' || u.canEditEmployeeData) ? `${t('Boleh edit data sendiri', 'Can edit own employee data')}` : `${t('Read-only data karyawan', 'Employee data read-only')}`}</span></div></div>
                <div className="flex items-center gap-2 sm:gap-1.5 flex-wrap sm:flex-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadge[u.role]}`}>{roleLabel[u.role]}</span>
                  <label className="flex items-center gap-2 text-[11px] text-slate-500 mr-1"><span>{t('Edit Sendiri', 'Self Edit')}</span><input type="checkbox" checked={u.role === 'superadmin' ? true : !!u.canEditEmployeeData} disabled={u.role === 'superadmin'} onChange={(e) => doToggleUserEmployeeEdit(u.id, e.target.checked)} /></label>
                  <button type="button" onClick={() => doStartEditUser(u.id)} title={t('Edit user', 'Edit user')} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition text-sm"><ContentLucideIcon icon={Pencil} size={13} variant="toolbar" /></button>
                  {u.id === currentUser.id ? <span className="text-[10px] text-slate-400 px-1">({t('Anda', 'You')})</span> : <button type="button" onClick={() => doDeleteUser(u.id)} title={t('Hapus user', 'Delete user')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition text-sm"><ContentLucideIcon icon={Trash2} size={13} variant="toolbar" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
