import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import TamamInfoPage from '@/components/tamam/customer/TamamInfoPage';
import { getLoyaltyConfig } from '@/lib/loyaltyApi';
import { track } from '@/lib/analytics';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * TAMAM Points — public explanation page.
 * Reads real loyalty config to show actual earn/redeem/expiry rules.
 * CTA connects to the user's points account (/account/points).
 */
export default function TamamPoints() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('points_page_viewed', { locale });
    getLoyaltyConfig().then((c) => setConfig(c)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hasConfig = !!config && config.points_per_currency;
  const eligibleLabel = config?.eligible_event === 'delivered'
    ? (locale === 'he' ? 'עם מסירת ההזמנה בהצלחה' : 'عند توصيل الطلب بنجاح')
    : (locale === 'he' ? 'לאחר תשלום' : 'بعد الدفع');

  const goToBalance = async () => {
    track('points_balance_clicked', { locale });
    try {
      const ok = await base44.auth.isAuthenticated();
      if (ok) navigate('/account/points');
      else base44.auth.redirectToLogin('/account/points');
    } catch {
      base44.auth.redirectToLogin('/account/points');
    }
  };

  const sections = [
    { icon: 'add_circle', title: t('points.earn_title'), body: hasConfig ? `${t('points.earn_body')}` : t('points.config_generic') },
    { icon: 'schedule', title: t('points.when_title'), body: hasConfig ? eligibleLabel : t('points.config_generic') },
    { icon: 'redeem', title: t('points.redeem_title'), body: t('points.redeem_body') },
    { icon: 'confirmation_number', title: t('points.coupons_title'), body: t('points.coupons_body') },
    { icon: 'account_balance_wallet', title: t('points.balance_title'), body: t('points.balance_body') },
    { icon: 'support_agent', title: t('points.contact_title'), body: t('points.contact_body') },
  ];

  const faq = [
    { question: t('points.faq1_q'), answer: t('points.faq1_a') },
    { question: t('points.faq2_q'), answer: t('points.faq2_a') },
  ];

  return (
    <TamamInfoPage
      title={t('points.title')}
      subtitle={t('points.subtitle')}
      icon="stars"
      sections={sections}
      faq={faq}
      whatsappTopic={t('points.title')}
      relatedLinks={[
        { label: t('how.support.title'), to: '/how-tamam-works/support' },
        { label: t('how.title'), to: '/how-tamam-works' },
      ]}
    >
      {/* Loyalty config details */}
      {loading ? (
        <div className="px-4 mt-4 space-y-2">
          <div className="h-16 skeleton-t rounded-2xl" />
        </div>
      ) : hasConfig ? (
        <div className="px-4 mt-4">
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 space-y-2">
            {config.points_per_currency != null && (
              <Row label={locale === 'he' ? 'נקודות לכל ₪' : 'نقاط لكل ₪'} value={`${config.points_per_currency}`} />
            )}
            {config.expiry_days != null && (
              <Row label={locale === 'he' ? 'תוקף הנקודות' : 'صلاحية النقاط'} value={`${config.expiry_days} ${locale === 'he' ? 'ימים' : 'يوم'}`} />
            )}
            {config.reward_coupon_enabled && config.reward_coupon_value != null && (
              <Row label={locale === 'he' ? 'קופון תגמול' : 'كوبون مكافأة'} value={`₪${config.reward_coupon_value}`} />
            )}
            {config.reward_coupon_min_order != null && (
              <Row label={locale === 'he' ? 'מינימום הזמנה לקופון' : 'أدنى طلب للكوبون'} value={`₪${config.reward_coupon_min_order}`} />
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 mt-4">
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
            <p className="text-on-surface-variant text-sm">{t('points.config_generic')}</p>
          </div>
        </div>
      )}

      {/* CTA to account points */}
      <div className="px-4 mt-4">
        <button onClick={goToBalance} className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
          <Icon name="account_balance_wallet" className="text-[20px]" />
          {t('common.view_balance')}
        </button>
      </div>
    </TamamInfoPage>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className="font-bold text-sm" dir="ltr">{value}</span>
    </div>
  );
}