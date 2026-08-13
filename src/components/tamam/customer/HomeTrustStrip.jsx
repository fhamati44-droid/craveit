import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const ITEMS_AR = [
  { icon: 'lock', key: 'secure_payment', label: 'دفع آمن', route: '/how-tamam-works/secure-payment' },
  { icon: 'restaurant', key: 'curated_restaurants', label: 'مطاعم مختارة', route: '/restaurants' },
  { icon: 'support_agent', key: 'support', label: 'دعم سريع', route: '/how-tamam-works/support' },
];
const ITEMS_HE = [
  { icon: 'lock', key: 'secure_payment', label: 'תשלום מאובטח', route: '/how-tamam-works/secure-payment' },
  { icon: 'restaurant', key: 'curated_restaurants', label: 'מסעדות נבחרות', route: '/restaurants' },
  { icon: 'support_agent', key: 'support', label: 'תמיכה מהירה', route: '/how-tamam-works/support' },
];

/**
 * Consolidated trust area — merges the Home role of PaymentTrustStrip,
 * ClickableTrustCards and ClickableAssuranceSection into one compact strip.
 * Only claims already supported by the product.
 */
export default function HomeTrustStrip() {
  const { locale } = useLanguage();
  const items = locale === 'he' ? ITEMS_HE : ITEMS_AR;
  return (
    <section className="px-4 py-5">
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <Link
            key={it.key}
            to={it.route}
            onClick={() => track('trust_card_clicked', { card_key: it.key })}
            className="flex flex-col items-center justify-center gap-1.5 bg-surface-container border border-outline-variant/30 rounded-2xl py-3.5 min-h-[72px] active:scale-95 transition-transform"
          >
            <Icon name={it.icon} className="text-primary text-[22px]" />
            <span className="text-[11px] font-bold text-center leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}