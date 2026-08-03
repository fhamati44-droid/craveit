import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Clickable assurance items — each links to its relevant info page.
 * Replaces the non-interactive AssuranceSection.
 */
const ITEMS = [
  { key: 'clear_confirmation', route: '/how-tamam-works/order-confirmation' },
  { key: 'order_number', route: '/how-tamam-works/order-number' },
  { key: 'delivery', route: '/how-tamam-works/delivery' },
  { key: 'post_purchase_tracking', route: '/how-tamam-works/live-tracking' },
  { key: 'order_updates', route: '/how-tamam-works/order-updates' },
  { key: 'points_coupons', route: '/tamam-points' },
  { key: 'support', route: '/how-tamam-works/support' },
];

export default function ClickableAssuranceSection() {
  const { t } = useLanguage();

  const onClick = (key) => track('trust_card_clicked', { card_key: key });

  return (
    <section className="px-4 py-8">
      <h2 className="text-headline-md font-bold mb-4">{t('home.assurance.title')}</h2>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.route}
            onClick={() => onClick(item.key)}
            aria-label={t(`home.assurance.${item.key}`)}
            className="flex items-center gap-2 bg-surface-container/50 rounded-xl p-3 active:scale-95 transition-transform hover:bg-surface-container"
          >
            <Icon name="check_circle" className="text-primary text-[18px] flex-shrink-0" />
            <span className="text-xs leading-snug">{t(`home.assurance.${item.key}`)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}