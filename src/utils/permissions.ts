import type { AppUser, UserRole } from '../types';

export const can = (role: UserRole | null, action: 'write' | 'delete' | 'config' | 'manageUsers') => {
  if (!role) return false;
  if (role === 'superadmin') return true;
  if (role === 'admin') return action === 'write';
  return false;
};

export const canEditEmployeeRecord = (user: AppUser | null, empNama?: string | null) => {
  if (!user || !empNama) return false;
  if (user.role === 'superadmin') return true;
  if (user.role === 'admin') {
    if (!user.canEditEmployeeData) return false;
    return !!user.linkedEmployeeName && user.linkedEmployeeName === empNama;
  }
  return false;
};

export const canEditOwnLeave = (currentUser: AppUser | null, empNama: string): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'superadmin') return true;
  if (currentUser.role === 'admin') {
    const linkedName = currentUser.linkedEmployeeName?.trim().toLowerCase();
    const targetName = empNama?.trim().toLowerCase();
    if (!linkedName || !targetName) return false;
    return linkedName === targetName;
  }
  return false;
};

export const roleLabel: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  viewer: 'Viewer',
};

export const roleBadge: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
};
