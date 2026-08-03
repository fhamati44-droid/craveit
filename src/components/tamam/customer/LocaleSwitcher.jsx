import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';

/**
 * Compact RTL language switcher — العربية | עברית.
 * Persists to localStorage, updates document dir/lang immediately.
 */
export default function LocaleSwitcher() {
  const { locale, setLocale } = useLanguage();
  const switchTo = (l) => {
    if (l === locale) return;
    setLocale(l);
    track('language_changed', { from: locale, to: l });
  };
  return (
    <div className="flex items-center gap-1 bg-tamam-surface rounded-full p-0.5 flex-shrink-0">
      <button
        onClick={() => switchTo('ar')}
        aria-label="العربية"
        className={`px-2 py-1 rounded-full text-[11px] font-bold transition-colors ${locale === 'ar' ? 'bg-tamam-green text-tamam-ink' : 'text-tamam-text-muted'}`}
      >
        ع
      </button>
      <button
        onClick={() => switchTo('he')}
        aria-label="עברית"
        className={`px-2 py-1 rounded-full text-[11px] font-bold transition-colors ${locale === 'he' ? 'bg-tamam-green text-tamam-ink' : 'text-tamam-text-muted'}`}
      >
        עב
      </button>
    </div>
  );
}