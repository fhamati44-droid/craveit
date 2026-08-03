import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import WhatsAppCTA from './WhatsAppCTA';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Reusable TAMAM info page — title, subtitle, icon, sections, FAQ,
 * WhatsApp CTA, related links. Used by all /how-tamam-works/* routes.
 */
export default function TamamInfoPage({ title, subtitle, icon, sections = [], faq = [], whatsappTopic, relatedLinks = [], children }) {
  const { t } = useLanguage();

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-on-surface-variant text-sm mb-4 active:opacity-60">
          <Icon name="arrow_forward" className="text-[18px]" />
          {t('common.back_home')}
        </Link>
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Icon name={icon} className="text-primary text-[28px]" />
            </div>
          )}
          <h1 className="text-headline-lg font-bold">{title}</h1>
        </div>
        {subtitle && <p className="text-on-surface-variant text-sm">{subtitle}</p>}
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <div className="px-4 space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
              {s.icon && (
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Icon name={s.icon} className="text-primary text-[20px]" />
                </div>
              )}
              {s.title && <h3 className="font-bold text-sm mb-1">{s.title}</h3>}
              <p className="text-on-surface-variant text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Custom children (for dynamic content like points config) */}
      {children}

      {/* FAQ */}
      {faq.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-headline-sm font-bold mb-3">{t('common.faq')}</h2>
          <div className="space-y-2">
            {faq.map((f, i) => (
              <details key={i} className="bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
                <summary className="cursor-pointer p-3 font-semibold text-sm flex items-center justify-between">
                  {f.question}
                  <Icon name="expand_more" className="text-on-surface-variant" />
                </summary>
                <div className="px-3 pb-3 text-on-surface-variant text-sm leading-relaxed">{f.answer}</div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp CTA */}
      {whatsappTopic && <div className="mt-6"><WhatsAppCTA topic={whatsappTopic} /></div>}

      {/* Related links */}
      {relatedLinks.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-headline-sm font-bold mb-3">{t('common.related')}</h2>
          <div className="space-y-2">
            {relatedLinks.map((r, i) => (
              <Link
                key={i}
                to={r.to}
                onClick={() => track('info_page_viewed', { topic: r.to, locale: t('locale.' + (localStorage.getItem('tamam_locale') || 'ar')) })}
                className="flex items-center justify-between bg-surface-container border border-outline-variant/30 rounded-xl p-3 active:scale-95 transition-transform"
              >
                <span className="text-sm font-semibold">{r.label}</span>
                <Icon name="chevron_left" className="text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}