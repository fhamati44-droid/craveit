import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Info footer — links to key info pages. Added at the bottom of the homepage.
 */
export default function InfoFooter() {
  const { t } = useLanguage();
  const links = [
    { to: '/how-tamam-works', label: t('footer.how_tamam_works') },
    { to: '/tamam-points', label: t('footer.points') },
    { to: '/how-tamam-works/secure-payment', label: t('footer.secure_payment') },
    { to: '/how-tamam-works/live-tracking', label: t('footer.track_order') },
    { to: '/how-tamam-works/support', label: t('footer.support') },
  ];
  return (
    <footer className="px-4 py-6 border-t border-outline-variant/20 mt-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((l, i) => (
          <Link key={i} to={l.to} className="text-on-surface-variant text-xs hover:text-primary transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}