export const sha256 = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Legacy hash kept for backward compatibility with old accounts.
export const legacyHash = (s: string): string => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
  if (stored.startsWith('sha256:')) {
    const hash = await sha256(plain);
    return hash === stored.slice(7);
  }
  return legacyHash(plain) === stored;
};

export const hashPassword = async (plain: string): Promise<string> => {
  const hash = await sha256(plain);
  return `sha256:${hash}`;
};
