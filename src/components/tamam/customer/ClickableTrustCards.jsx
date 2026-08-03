import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { track } from '@/lib/analytics';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Clickable trust cards — each card links to its relevant info page.
 * Replaces the non-interactive PurchaseJourneyTrustSection.
 */
const CARDS = [
  { icon: 'lock', key: 'secure_payment', route: '/how-tamam-works/secure-payment' },
  { icon: 'my_location', key: 'live_tracking', route: '/how-tamam-works/live-tracking' },
  { icon: 'support_agent', key: 'contact_support', route: '/how-tamam-works/support' },
  { icon: 'redeem', key: 'order_rewards', route: '/tamam-points' },
];

export default function ClickableTrustCards() {
  const { t } = useLanguage();

  const onClick = (key) => track('trust_card_clicked', { card_key: key });

  return (
    <section className="px-4 py-8">
      <h2 className="text-headline-md font-bold mb-4">{t('home.trust.title')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            to={c.route}
            onClick={() => onClick(c.key)}
            aria-label={t(`home.trust.${c.key}`)}
            className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 active:scale-95 transition-transform hover:border-primary/30 block"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
              <Icon name={c.icon} className="text-primary" />
            </div>
            <h3 className="font-bold text-sm">{t(`home.trust.${c.key}`)}</h3>
            <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{t(`home.trust.${c.key}.desc`)}</p>
            <div className="flex items-center gap-0.5 mt-1.5 text-primary text-[10px] font-bold">
              {t('common.learn_more')}
              <Icon name="chevron_left" className="text-[14px]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}