import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getPartnerDemo, createSignal, resolveSignal, resetPartnerDemo, applyDemoPressure, clearDemoPressure } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';
import QuickActionFlow from '@/components/partner/QuickActionFlow';
import { listMenuItems } from '@/lib/partnerApi';
import {
  LiveStatusCard, QuickActionsCard, ActiveCampaignCard, OpportunityCard,
  ApprovalsCard, TodayPlanCard, QuickLinksCard, HeroCardsSection, PerformanceStoryCard,
} from '@/components/partner/demo/DemoHomeSections';

export default function PartnerDemoHome() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [demo, setDemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [flow, setFlow] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [pressureActive, setPressureActive] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(() => {
    if (!rid) return;
    setLoading(true); setError(false);
    getPartnerDemo(rid).then((d) => {
      setDemo(d);
      setPressureActive(d?.signals?.hasPressure || false);
    }).catch(() => setError(true)).finally(() => setLoading(false));
    listMenuItems(rid, 'all').then(setMenuItems).catch(() => {});
  }, [rid]);
  useEffect(() => { load(); }, [load]);

  // When pressure is active, show the "الضغط خلص" clear action
  const clearPressure = async () => {
    if (!demo?.signals?.active?.length) return;
    setClearing(true);
    try {
      for (const s of demo.signals.active.filter((x) => x.type === 'pressure')) {
        await resolveSignal(rid, s.id);
      }
      setPressureActive(false);
      setTimeout(load, 300);
    } catch {} finally { setClearing(false); }
  };

  const onFlow = (f) => {
    if (f === 'pressure') {
      // Create pressure signal immediately + update restaurant status
      createSignal(rid, { type: 'pressure', reason: 'ضغط بالمطبخ' }).then(() => {
        setPressureActive(true);
        load();
      }).catch(() => setFlow('pressure'));
    } else {
      setFlow(f);
    }
  };

  if (loading) return <SkeletonBlock />;
  if (error) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل البيانات" actionLabel="إعادة" onAction={load} />;

  return (
    <div className="px-4 py-4 space-y-5">
      {demo?.is_demo && (
        <div className="flex items-center justify-between bg-tamam-surface-high rounded-xl px-3 py-2">
          <span className="text-[10px] text-tamam-text-muted">تجربة عرض — مطعم البركة التجريبي</span>
          <button onClick={() => resetPartnerDemo(rid).then(load)} className="text-[10px] text-tamam-gold font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">restart_alt</span>إعادة ضبط الديمو
          </button>
        </div>
      )}

      {/* A. الوضع إسا */}
      {demo?.live_status && <LiveStatusCard liveStatus={demo.live_status} restaurant={demo.restaurant} />}

      {/* B. شو تغير عندك؟ */}
      <QuickActionsCard onFlow={onFlow} />

      {/* Pressure clear demo */}
      {pressureActive && (
        <div className="bg-tamam-error/10 border border-tamam-error/30 rounded-2xl p-4 space-y-2">
          <p className="text-tamam-error text-sm font-bold">TAMAM وقفت جلب طلبات جديدة مؤقتاً</p>
          <button onClick={clearPressure} disabled={clearing} className="w-full bg-tamam-green-bright text-tamam-ink py-2.5 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50">
            {clearing ? 'TAMAM عم تراجع الوضع...' : 'الضغط خلص'}
          </button>
        </div>
      )}

      {/* C. TAMAM شغالة إسا */}
      {demo?.active_campaign && (
        <ActiveCampaignCard
          campaign={demo.active_campaign}
          onWhy={demo?.opportunity ? () => navigate(`/partner/why-tamam/${demo.opportunity.id}`) : undefined}
        />
      )}
      {demo?.paused_campaign && (
        <section className="bg-tamam-error/10 border border-tamam-error/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-tamam-error text-xs font-bold">
            <span className="material-symbols-outlined text-[18px]">pause_circle</span>
            <span>TAMAM وقفت حملة بسبب الضغط</span>
          </div>
          <p className="text-tamam-text text-sm">{demo.paused_campaign.title}</p>
          <p className="text-tamam-text-muted text-xs">رح ترجع شغّالة أول ما يخف الضغط.</p>
        </section>
      )}

      {/* D. شو بدك تقوّي اليوم؟ — demo hero cards */}
      {demo?.hero_cards && (
        <HeroCardsSection
          cards={demo.hero_cards}
          onSeeOpportunity={demo?.opportunity ? () => navigate(`/partner/why-tamam/${demo.opportunity.id}`) : undefined}
        />
      )}

      {/* E. TAMAM لقت فرصة */}
      {demo?.opportunity && <OpportunityCard opportunity={demo.opportunity} />}

      {/* E. محتاجين منك شغلة */}
      {demo?.approvals_needed?.length > 0 && <ApprovalsCard approvals={demo.approvals_needed} />}

      {/* F. خطة اليوم */}
      {demo?.today_plan && <TodayPlanCard plan={demo.today_plan} />}

      {/* Quick links */}
      <QuickLinksCard capacity={demo?.capacity} navigate={navigate} />

      {/* Performance summary — non-zero demo story */}
      <PerformanceStoryCard perf={demo?.performance} />

      <QuickActionFlow open={!!flow} flow={flow} restaurantId={rid} menuItems={menuItems} prepTime={15} onClose={() => setFlow(null)} onDone={load} />
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-24 skeleton-t rounded-2xl" />
      <div className="h-28 skeleton-t rounded-2xl" />
      <div className="h-40 skeleton-t rounded-2xl" />
    </div>
  );
}