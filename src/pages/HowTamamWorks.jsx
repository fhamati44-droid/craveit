import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import TamamInfoPage from '@/components/tamam/customer/TamamInfoPage';
import { track } from '@/lib/analytics';

/**
 * How TAMAM Works — main page + sub-topic pages.
 * Route: /how-tamam-works (main) or /how-tamam-works/:topic
 */
export default function HowTamamWorks() {
  const { topic } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');

  useEffect(() => {
    track('info_page_viewed', { topic: topic || 'main', locale: localStorage.getItem('tamam_locale') || 'ar' });
  }, [topic]);

  const commonLinks = (t) => [
    { label: t('how.order_confirmation.title'), to: '/how-tamam-works/order-confirmation' },
    { label: t('how.live_tracking.title'), to: '/how-tamam-works/live-tracking' },
    { label: t('how.delivery.title'), to: '/how-tamam-works/delivery' },
    { label: t('how.support.title'), to: '/how-tamam-works/support' },
  ];

  // Build content per topic
  let content;

  if (!topic) {
    // Main page — 10 steps
    content = {
      title: t('how.title'),
      subtitle: t('how.subtitle'),
      icon: 'route',
      sections: [
        'restaurant_menu', 'list_alt', 'local_shipping', 'location_on', 'fact_check',
        'payments', 'receipt_long', 'my_location', 'support_agent', 'redeem',
      ].map((ic, i) => ({
        icon: ic,
        title: `${i + 1}.`,
        body: t(`how.step${i + 1}`),
      })),
      relatedLinks: commonLinks(t),
      whatsappTopic: t('how.title'),
    };
  } else if (topic === 'secure-payment') {
    content = {
      title: t('how.secure_payment.title'),
      subtitle: t('how.secure_payment.subtitle'),
      icon: 'lock',
      sections: [1, 2, 3, 4, 5, 6].map((i) => ({ body: t(`how.secure_payment.s${i}`) })),
      relatedLinks: commonLinks(t),
      whatsappTopic: t('how.secure_payment.title'),
    };
  } else if (topic === 'order-confirmation') {
    content = {
      title: t('how.order_confirmation.title'),
      subtitle: t('how.order_confirmation.subtitle'),
      icon: 'fact_check',
      sections: [1, 2, 3, 4, 5, 6, 7].map((i) => ({ body: t(`how.order_confirmation.s${i}`) })),
      relatedLinks: [
        { label: t('how.secure_payment.title'), to: '/how-tamam-works/secure-payment' },
        { label: t('how.order_number.title'), to: '/how-tamam-works/order-number' },
        ...commonLinks(t),
      ],
      whatsappTopic: t('how.order_confirmation.title'),
      children: (
        <div className="px-4 mt-4">
          <button onClick={() => navigate('/restaurants')} className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm active:scale-95 transition-transform">
            {t('common.start_order')}
          </button>
        </div>
      ),
    };
  } else if (topic === 'order-number') {
    content = {
      title: t('how.order_number.title'),
      subtitle: t('how.order_number.subtitle'),
      icon: 'receipt_long',
      sections: [1, 2, 3, 4].map((i) => ({ body: t(`how.order_number.s${i}`) })),
      relatedLinks: [
        { label: t('how.live_tracking.title'), to: '/how-tamam-works/live-tracking' },
        ...commonLinks(t),
      ],
      whatsappTopic: t('how.order_number.title'),
      children: (
        <div className="px-4 mt-4">
          <button onClick={() => navigate('/orders')} className="w-full h-12 bg-surface-container border border-outline-variant/30 text-on-surface rounded-xl font-bold text-sm active:scale-95 transition-transform">
            {t('common.track_order')}
          </button>
        </div>
      ),
    };
  } else if (topic === 'delivery') {
    content = {
      title: t('how.delivery.title'),
      subtitle: t('how.delivery.subtitle'),
      icon: 'local_shipping',
      sections: [1, 2, 3, 4, 5].map((i) => ({ body: t(`how.delivery.s${i}`) })),
      relatedLinks: [
        { label: t('how.live_tracking.title'), to: '/how-tamam-works/live-tracking' },
        { label: t('how.order_confirmation.title'), to: '/how-tamam-works/order-confirmation' },
        ...commonLinks(t),
      ],
      whatsappTopic: t('how.delivery.title'),
    };
  } else if (topic === 'live-tracking') {
    content = {
      title: t('how.live_tracking.title'),
      subtitle: t('how.live_tracking.subtitle'),
      icon: 'my_location',
      sections: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ body: t(`how.live_tracking.stage${i}`) })),
      relatedLinks: [
        { label: t('how.order_updates.title'), to: '/how-tamam-works/order-updates' },
        ...commonLinks(t),
      ],
      whatsappTopic: t('how.live_tracking.title'),
      children: (
        <div className="px-4 mt-4">
          <button onClick={() => navigate('/orders')} className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm active:scale-95 transition-transform">
            {t('common.track_order')}
          </button>
        </div>
      ),
    };
  } else if (topic === 'order-updates') {
    content = {
      title: t('how.order_updates.title'),
      subtitle: t('how.order_updates.subtitle'),
      icon: 'notifications',
      sections: [1, 2, 3, 4].map((i) => ({ body: t(`how.order_updates.s${i}`) })),
      relatedLinks: [
        { label: t('how.live_tracking.title'), to: '/how-tamam-works/live-tracking' },
        { label: t('how.support.title'), to: '/how-tamam-works/support' },
        ...commonLinks(t),
      ],
      whatsappTopic: t('how.order_updates.title'),
    };
  } else if (topic === 'support') {
    const reasons = ['pre_order', 'payment', 'edit', 'track', 'delivery', 'points', 'other'];
    content = {
      title: t('how.support.title'),
      subtitle: t('how.support.subtitle'),
      icon: 'support_agent',
      sections: [1, 2, 4].map((i) => ({ body: t(`how.support.s${i}`) })),
      whatsappTopic: reason || t('how.support.title'),
      relatedLinks: commonLinks(t),
      children: (
        <div className="px-4 mt-2 space-y-3">
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1">{t('how.support.reason_label')}</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30">
              <option value="">{t('how.support.reason_label')}</option>
              {reasons.map((r) => <option key={r} value={t(`how.support.reason_${r}`)}>{t(`how.support.reason_${r}`)}</option>)}
            </select>
          </div>
        </div>
      ),
    };
  } else {
    content = { title: t('how.title'), subtitle: t('how.subtitle'), icon: 'route', sections: [], relatedLinks: commonLinks(t) };
  }

  return <TamamInfoPage {...content} />;
}