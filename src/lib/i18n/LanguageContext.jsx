import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

/**
 * Bilingual i18n context — Arabic (default) + Hebrew, both RTL.
 * Persists to localStorage, falls back to browser language, defaults to Arabic.
 */
const LanguageContext = createContext({ locale: 'ar', setLocale: () => {}, t: (k) => k, getLocalizedValue: () => '' });

function detectInitialLocale() {
  try {
    const saved = localStorage.getItem('tamam_locale');
    if (saved === 'ar' || saved === 'he') return saved;
  } catch {}
  const browser = (typeof navigator !== 'undefined' && navigator.language) || '';
  if (browser.startsWith('he')) return 'he';
  return 'ar';
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  const setLocale = useCallback((l) => {
    setLocaleState(l);
    try { localStorage.setItem('tamam_locale', l); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'rtl'; // Both Arabic and Hebrew are RTL
  }, [locale]);

  const t = useCallback((key, params = {}) => {
    let str = translations[locale]?.[key] || translations.ar?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [locale]);

  const getLocalizedValue = useCallback((record, field) => {
    if (!record) return '';
    return record[`${field}_${locale}`] || record[`${field}_ar`] || record[field] || '';
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, getLocalizedValue }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t } = useContext(LanguageContext);
  return t;
}

/** Standalone version for use outside React components. */
export function getLocalizedValue(record, field, locale) {
  if (!record) return '';
  return record[`${field}_${locale}`] || record[`${field}_ar`] || record[field] || '';
}