import { useNavigate } from 'react-router-dom';
import { fmtRange, fmtRemaining, TRAFFIC_DOT, TRAFFIC_LABEL_AR } from '@/lib/partnerDemoLabels';

// A. الوضع إسا
export function LiveStatusCard({ liveStatus, restaurant }) {
  const toneCls = {
    green: 'from-tamam-green/15 to-tamam-surface border-tamam-green/30',
    red: 'from-tamam-error/15 to-tamam-surface border-tamam-error/30',
    gray: 'from-tamam-surface-high/30 to-tamam-surface border-tamam-outline/30',
  }[liveStatus.tone] || '';
  return (
    <section className={`bg-gradient-to-b ${toneCls} border rounded-2xl p-4`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{liveStatus.dot}</span>
        <div className="flex-1">
          <h2 className="font-bold text-base text-tamam-text">الوضع إسا</h2>
          <p className="text-tamam-green-bright font-bold text-lg leading-tight">{liveStatus.label}</p>
        </div>
      </div>
      <p className="text-tamam-text-muted text-xs mt-2 leading-snug">{liveStatus.desc}</p>
    </section>
  );
}

// B. شو تغير عندك؟ — quick actions (uses existing signal flow)
export function QuickActionsCard({ onFlow }) {
  const actions = [
    { flow: 'pressure', icon: 'warning', label: 'عندي ضغط', circle: 'bg-tamam-error/20 text-tamam-error' },
    { flow: 'surplus', icon: 'inventory', label: 'عندي كمية', circle: 'bg-tamam-green/20 text-tamam-green-bright' },
    { flow: 'strengthen', icon: 'trending_up', label: 'بدي أقوّي وجبة', circle: 'bg-tamam-gold/20 text-tamam-gold' },
    { flow: 'sold_out', icon: 'block', label: 'صنف خلص', circle: 'bg-tamam-surface-highest text-tamam-text-muted' },
  ];
  return (
    <section className="space-y-2">
      <h3 className="font-bold text-sm text-tamam-text px-1">شو تغير عندك؟</h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <button key={a.flow} onClick={() => onFlow(a.flow)} className="flex flex-col items-center gap-1.5 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.circle}`}><span className="material-symbols-outlined text-[20px]">{a.icon}</span></div>
            <span className="text-[10px] font-bold text-tamam-text text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// C. TAMAM شغالة إسا — active campaign
export function ActiveCampaignCard({ campaign }) {
  const navigate = useNavigate();
  if (!campaign) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-bold text-sm text-tamam-text px-1">TAMAM شغالة إسا</h3>
      <div className="bg-gradient-to-b from-tamam-green/15 to-tamam-surface border border-tamam-green/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-tamam-text text-sm">{campaign.title}</span>
          <span className="bg-tamam-green text-tamam-ink text-[10px] font-bold px-2 py-0.5 rounded-full">شغّالة</span>
        </div>
        {campaign.start_at && (
          <div className="flex items-center gap-2 text-tamam-text-muted text-xs">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>{fmtRange(campaign.start_at, campaign.end_at)}</span>
          </div>
        )}
        {campaign.objective_label && <Row label="الهدف" value={campaign.objective_label} />}
        {campaign.audience?.length > 0 && <Row label="الجمهور" value={campaign.audience.join('، ')} />}
        {campaign.normal_price != null && (
          <Row label="السعر" value={
            campaign.normal_price > campaign.customer_price
              ? `${campaign.customer_price} ₪ (بدل ${campaign.normal_price})`
              : `${campaign.customer_price} ₪`
          } />
        )}
        {campaign.quota_total != null && (
          <Row label="الحد" value={`${campaign.quota_total} طلب (${campaign.quota_used} طلبوا)`} />
        )}
        <div className="flex items-center gap-1.5 text-tamam-green-bright text-xs font-semibold">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>ضمن الحدود المتفق عليها ✓</span>
        </div>
        <button onClick={() => navigate(`/partner/campaigns/${campaign.id}`)} className="w-full bg-tamam-green-bright text-tamam-ink py-2.5 rounded-xl font-bold text-sm active:scale-95 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[18px]">visibility</span>شوف التفاصيل
        </button>
      </div>
    </section>
  );
}

// D. TAMAM لقت فرصة
export function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();
  if (!opportunity) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-bold text-sm text-tamam-text px-1">TAMAM لقت فرصة</h3>
      <div className="bg-tamam-surface rounded-2xl p-4 space-y-2 border border-tamam-outline/30">
        {opportunity.window_start && (
          <div className="flex items-center gap-2 text-tamam-green-bright text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
            <span>{fmtRange(opportunity.window_start, opportunity.window_end)}</span>
          </div>
        )}
        <p className="text-tamam-text text-sm leading-snug">{opportunity.explanation}</p>
        <button onClick={() => navigate(`/partner/why-tamam/${opportunity.id}`)} className="w-full bg-tamam-surface-high text-tamam-green-bright py-2.5 rounded-xl font-bold text-sm active:scale-95 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[18px]">psychology</span>شوف كيف TAMAM فكرت فيها
        </button>
      </div>
    </section>
  );
}

// E. محتاجين منك شغلة — approvals
export function ApprovalsCard({ approvals }) {
  const navigate = useNavigate();
  if (!approvals || approvals.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-bold text-sm text-tamam-text px-1">محتاجين منك شغلة</h3>
      {approvals.map((a) => (
        <div key={a.id} className="bg-tamam-gold/10 border border-tamam-gold/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-tamam-gold text-xs font-bold">
            <span className="material-symbols-outlined text-[18px]">priority_high</span>
            <span>محتاجين موافقتك</span>
          </div>
          <p className="text-tamam-text text-sm leading-snug">{a.explanation}</p>
          <button onClick={() => navigate('/partner/offers/request')} className="w-full bg-tamam-gold text-tamam-ink py-2.5 rounded-xl font-bold text-sm active:scale-95">راجع الطلب</button>
        </div>
      ))}
    </section>
  );
}

// F. خطة اليوم — vertical timeline
export function TodayPlanCard({ plan }) {
  if (!plan || !plan.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="font-bold text-sm text-tamam-text px-1">خطة اليوم</h3>
      <div className="bg-tamam-surface rounded-2xl p-4 space-y-3 border border-tamam-outline/30">
        {plan.map((block, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span className="text-lg">{TRAFFIC_DOT[block.light]}</span>
              {i < plan.length - 1 && <span className="w-px h-6 bg-tamam-outline/40 mt-1" />}
            </div>
            <div className="flex-1 pb-1">
              <p className="text-tamam-text text-sm font-bold">{block.time}</p>
              <p className="text-tamam-text-muted text-xs">{block.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Capacity + data status quick links
export function QuickLinksCard({ capacity, navigate }) {
  return (
    <section className="grid grid-cols-2 gap-2">
      <button onClick={() => navigate('/partner/time-map')} className="flex flex-col items-start gap-1 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-tamam-green-bright text-[22px]">schedule</span>
        <span className="text-[11px] font-bold text-tamam-text">ساعات الشغل مع TAMAM</span>
      </button>
      <button onClick={() => navigate('/partner/story')} className="flex flex-col items-start gap-1 bg-tamam-surface rounded-2xl p-3 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-tamam-green-bright text-[22px]">auto_awesome</span>
        <span className="text-[11px] font-bold text-tamam-text">كيف TAMAM بتشتغل</span>
      </button>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-tamam-text-muted text-xs">{label}</span>
      <span className="text-tamam-text text-xs font-bold">{value}</span>
    </div>
  );
}