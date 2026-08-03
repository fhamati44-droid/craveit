import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getSupportWhatsApp, normalizeWhatsAppNumber } from '@/lib/siteConfig';
import { track } from '@/lib/analytics';

/**
 * WhatsApp support CTA — localized, prefilled message.
 * Shows a fallback when no number is configured.
 */
export default function WhatsAppCTA({ topic, orderNumber }) {
  const { t, locale } = useLanguage();
  const raw = getSupportWhatsApp();
  const num = normalizeWhatsAppNumber(raw);

  const message = locale === 'he'
    ? `שלום, אני צריך עזרה בנושא ${topic || ''}. מספר הזמנה אם קיים: ${orderNumber || ''}`
    : `مرحبا، بدي مساعدة بخصوص ${topic || ''}. رقم الطلب إذا موجود: ${orderNumber || ''}`;

  const handleClick = () => {
    track('whatsapp_support_clicked', { topic, locale });
  };

  if (!num) {
    return (
      <div className="px-4 py-2 text-center">
        <p className="text-[11px] text-tamam-text-muted mb-2">{t('common.no_whatsapp')}</p>
        <span className="inline-flex items-center gap-2 bg-tertiary/15 text-tertiary px-5 py-2.5 rounded-full text-sm font-bold opacity-60">
          <span className="material-symbols-outlined text-[18px]">chat</span>
          {t('common.whatsapp_cta')}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <a
        href={`https://wa.me/${num}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 h-12 bg-tertiary text-on-tertiary rounded-xl font-bold text-sm active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-[20px]">chat</span>
        {t('common.whatsapp_cta')}
      </a>
    </div>
  );
}