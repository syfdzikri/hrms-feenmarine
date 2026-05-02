import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './client';

export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface AuthResult {
  uid: string;
  email: string | null;
  role: UserRole;
}

const normalizeRole = (raw: unknown): UserRole => {
  if (raw === 'superadmin' || raw === 'admin' || raw === 'viewer') return raw;
  return 'viewer';
};

const buildCandidateEmails = (usernameOrEmail: string): string[] => {
  const val = usernameOrEmail.trim().toLowerCase();
  if (!val) return [];
  if (val.includes('@')) return [val];
  return [`${val}@feenmarine.local`, val];
};

export async function signInWithRole(usernameOrEmail: string, password: string): Promise<AuthResult> {
  const candidates = buildCandidateEmails(usernameOrEmail);
  let lastErr: unknown;
  for (const email of candidates) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdTokenResult(true);
      const role = normalizeRole(token.claims.role);
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        role,
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('Authentication failed');
}
