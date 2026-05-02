import { createContext, useContext } from 'react';

export type AppLanguage = 'id' | 'en';

export type I18nContextValue = {
  language: AppLanguage;
  t: (id: string, en: string) => string;
};

export const I18nContext = createContext<I18nContextValue>({
  language: 'id',
  t: (id, en) => id || en,
});

export function useI18n() {
  return useContext(I18nContext);
}
