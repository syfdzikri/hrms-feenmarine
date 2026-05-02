import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hrms_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('hrms_theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('hrms_theme', 'light');
    }
  }, [dark]);

  return { dark, toggleDark: () => setDark((d) => !d) };
}
