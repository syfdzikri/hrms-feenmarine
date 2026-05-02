import type { ReactNode } from 'react';
import { I18nContext, type AppLanguage } from './store';

export function I18nProvider({
  language,
  children,
}: {
  language: AppLanguage;
  children: ReactNode;
}) {
  const t = (id: string, en: string) => (language === 'id' ? id : en);
  return <I18nContext.Provider value={{ language, t }}>{children}</I18nContext.Provider>;
}
