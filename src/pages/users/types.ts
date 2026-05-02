import type { Dispatch, SetStateAction } from 'react';
import type { AppUser, Employee, UserRole } from '../../types';

export type UsersPageProps = {
  currentUser: AppUser;
  currentUserFirebaseUid: string;
  employees: Employee[];
  setAddEmpOpen: (open: boolean) => void;
  doOpenEdit: (id: string) => void;
  doDelete: (id: string) => void;
  doPickImportEmployeesCsv: () => void;
  doDownloadEmployeesCsvTemplate: () => void;
  ownEmployee: Employee | null;
  ownVisaActive: boolean;
  setOwnVisaActive: (active: boolean) => void;
  activeVisaOptions: string[];
  ownVisaTypes: string[];
  setOwnVisaTypes: Dispatch<SetStateAction<string[]>>;
  doSaveOwnVisa: () => void;
  ownVisaSaving: boolean;
  roleLabel: Record<UserRole, string>;
  showOwnPwOld: boolean;
  setShowOwnPwOld: Dispatch<SetStateAction<boolean>>;
  ownPwOld: string;
  setOwnPwOld: (v: string) => void;
  showOwnPwNew: boolean;
  setShowOwnPwNew: Dispatch<SetStateAction<boolean>>;
  ownPwNew: string;
  setOwnPwNew: (v: string) => void;
  showOwnPwConfirm: boolean;
  setShowOwnPwConfirm: Dispatch<SetStateAction<boolean>>;
  ownPwConfirm: string;
  setOwnPwConfirm: (v: string) => void;
  ownPwLoading: boolean;
  doChangeOwnPassword: () => void;
  newUserDisplay: string;
  setNewUserDisplay: (v: string) => void;
  newUserName: string;
  setNewUserName: (v: string) => void;
  showNewUserPw: boolean;
  setShowNewUserPw: Dispatch<SetStateAction<boolean>>;
  newUserPw: string;
  setNewUserPw: (v: string) => void;
  newUserRole: UserRole;
  setNewUserRole: (r: UserRole) => void;
  newUserLinked: string;
  setNewUserLinked: (v: string) => void;
  newUserFirebaseUid: string;
  setNewUserFirebaseUid: (v: string) => void;
  newUserCanEditEmployeeData: boolean;
  setNewUserCanEditEmployeeData: (v: boolean) => void;
  doAddUser: () => void;
  roleBadge: Record<UserRole, string>;
  appUsers: AppUser[];
  editUserId: string | null;
  editUserDisplay: string;
  setEditUserDisplay: (v: string) => void;
  editUserName: string;
  setEditUserName: (v: string) => void;
  showEditUserPw: boolean;
  setShowEditUserPw: Dispatch<SetStateAction<boolean>>;
  editUserPw: string;
  setEditUserPw: (v: string) => void;
  editUserRole: UserRole;
  setEditUserRole: (r: UserRole) => void;
  editUserLinked: string;
  setEditUserLinked: (v: string) => void;
  editUserFirebaseUid: string;
  setEditUserFirebaseUid: (v: string) => void;
  editUserCanEditEmployeeData: boolean;
  setEditUserCanEditEmployeeData: (v: boolean) => void;
  doSaveEditUser: () => void;
  doCancelEditUser: () => void;
  doStartEditUser: (id: string) => void;
  doDeleteUser: (id: string) => void;
  doToggleUserEmployeeEdit: (id: string, enabled: boolean) => void;
};

export type EmployeeManagementCardProps = Pick<UsersPageProps, 'currentUser' | 'employees' | 'setAddEmpOpen' | 'doOpenEdit' | 'doDelete' | 'doPickImportEmployeesCsv' | 'doDownloadEmployeesCsvTemplate'>;

export type OwnAccountSectionProps = Pick<UsersPageProps,
  'currentUser' | 'currentUserFirebaseUid' | 'ownEmployee' | 'ownVisaActive' | 'setOwnVisaActive' | 'activeVisaOptions' | 'ownVisaTypes' | 'setOwnVisaTypes' |
  'doSaveOwnVisa' | 'ownVisaSaving' | 'roleLabel' | 'showOwnPwOld' | 'setShowOwnPwOld' | 'ownPwOld' | 'setOwnPwOld' | 'showOwnPwNew' |
  'setShowOwnPwNew' | 'ownPwNew' | 'setOwnPwNew' | 'showOwnPwConfirm' | 'setShowOwnPwConfirm' | 'ownPwConfirm' | 'setOwnPwConfirm' |
  'ownPwLoading' | 'doChangeOwnPassword'
>;

export type UserManagementSectionProps = Pick<UsersPageProps,
  'currentUser' | 'currentUserFirebaseUid' | 'employees' | 'newUserDisplay' | 'setNewUserDisplay' | 'newUserName' | 'setNewUserName' | 'showNewUserPw' | 'setShowNewUserPw' |
  'newUserPw' | 'setNewUserPw' | 'newUserRole' | 'setNewUserRole' | 'newUserLinked' | 'setNewUserLinked' | 'newUserFirebaseUid' | 'setNewUserFirebaseUid' | 'newUserCanEditEmployeeData' |
  'setNewUserCanEditEmployeeData' | 'doAddUser' | 'roleBadge' | 'roleLabel' | 'appUsers' | 'editUserId' | 'editUserDisplay' | 'setEditUserDisplay' |
  'editUserName' | 'setEditUserName' | 'showEditUserPw' | 'setShowEditUserPw' | 'editUserPw' | 'setEditUserPw' | 'editUserRole' | 'setEditUserRole' |
  'editUserLinked' | 'setEditUserLinked' | 'editUserFirebaseUid' | 'setEditUserFirebaseUid' | 'editUserCanEditEmployeeData' | 'setEditUserCanEditEmployeeData' | 'doSaveEditUser' | 'doCancelEditUser' |
  'doStartEditUser' | 'doDeleteUser' | 'doToggleUserEmployeeEdit'
> & { canManageUsers: boolean };
