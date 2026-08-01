import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getGroupDeals, computeDealStatus, STATUS_LABELS, publishGroupDeal, transitionGroupDeal, duplicateGroupDeal } from '@/lib/groupDealApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TABS = ['active', 'scheduled', 'draft', 'ended', 'completed', 'cancelled', 'failed'];

export default function GroupDealsDashboard() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [parts, setParts] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  const load = async () => {
    setLoading(true);
    try {
      const [d, p, t] = await Promise.all([
        getGroupDeals(),
        base44.entities.GroupDealParticipation.list('-created_date', 300).catch(() => []),
        base44.entities.GroupDealThreshold.list('-created_date', 500).catch(() => []),
      ]);
      setDeals(d || []);
      setParts(p || []);
      setThresholds(t || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const partsByDeal = useMemo(() => {
    const map = {};
    (parts || []).forEach((p) => {
      if (p.participation_status === 'cancelled') return;
      (map[p.deal_id] = map[p.deal_id] || []).push(p);
    });
    return map;
  }, [parts]);

  const tiersByDeal = useMemo(() => {
    const map = {};
    (thresholds || []).forEach((t) => (map[t.deal_id] = map[t.deal_id] || []).push(t));
    return map;
  }, [thresholds]);

  const grouped = useMemo(() => {
    const map = {};
    (deals || []).forEach((d) => {
      const s = computeDealStatus(d);
      (map[s] = map[s] || []).push(d);
    });
    return map;
  }, [deals]);

  const list = grouped[tab] || [];

  const stats = (deal) => {
    const ps = partsByDeal[deal.id] || [];
    const participants = new Set(ps.map((p) => p.customer_id || p.phone || p.guest_session_id || p.id)).size;
    const qty = ps.reduce((s, p) => s + (p.quantity || 0), 0);
    const tiers = (tiersByDeal[deal.id] || []).sort((a, b) => (a.min_participants || 0) - (b.min_participants || 0));
    const cur = tiers.find((t) => participants >= (t.min_participants || 0)) || tiers[0];
    const next = tiers.find((t) => (t.min_participants || 0) > participants) || null;
    const revenue = ps.reduce((s, p) => s + (p.joined_price || 0) * (p.quantity || 1), 0);
    return { participants, qty, cur, next, revenue };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">عروض البيع الجماعي</h1>
          <p className="text-sm text-on-surface-variant">{deals.length} عرض إجمالًا</p>
        </div>
        <button onClick={() => navigate('/admin/group-deals/new')} className="bg-primary text-on-primary px-4 py-2.5 rounded-full font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
          <Icon name="add" className="text-[18px]" /> إنشاء عرض جديد
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-none px-4 py-2 rounded-full text-sm font-semibold ${tab === t ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'}`}>
            {STATUS_LABELS[t]} {(grouped[t] || []).length > 0 && <span className="opacity-70">· {grouped[t].length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Icon name="inbox" className="text-5xl mb-2 opacity-50" />
          <p>لا توجد عروض بهذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((deal) => {
            const s = stats(deal);
            return (
              <div key={deal.id} className="bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
                <div className="flex gap-3 p-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
                    {deal.hero_image ? <img src={deal.hero_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="celebration" className="text-on-surface-variant" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{deal.title}</h3>
                        <p className="text-[11px] text-on-surface-variant truncate">{deal.restaurant_name_snapshot}</p>
                      </div>
                      <StatusBadge status={computeDealStatus(deal)} />
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-2 text-[11px]">
                      <Stat label="مشتركين" value={s.participants} />
                      <Stat label="السعر" value={s.cur ? `₪${Math.round(s.cur.price)}` : '—'} />
                      <Stat label="الدخل" value={`₪${Math.round(s.revenue)}`} />
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-outline-variant/20 text-xs">
                  <Action label="عرض" icon="visibility" onClick={() => navigate(`/admin/group-deals/${deal.id}`)} />
                  <Action label="تعديل" icon="edit" onClick={() => navigate(`/admin/group-deals/${deal.id}/edit`)} />
                  {deal.status === 'draft' && <Action label="نشر" icon="publish" primary onClick={() => publishGroupDeal(deal.id).then(load)} />}
                  {deal.status === 'active' && <Action label="إيقاف" icon="pause" onClick={() => transitionGroupDeal(deal.id, 'paused', '').then(load)} />}
                  {deal.status === 'paused' && <Action label="استئناف" icon="play_arrow" onClick={() => transitionGroupDeal(deal.id, 'active', '').then(load)} />}
                  <Action label="نسخ" icon="content_copy" onClick={() => duplicateGroupDeal(deal.id).then(() => load())} />
                  {['active', 'paused', 'scheduled'].includes(deal.status) && <Action label="إلغاء" icon="cancel" danger onClick={() => { if (confirm('إلغاء العرض؟')) transitionGroupDeal(deal.id, 'cancelled', '').then(load); }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface-container-high rounded-lg px-2 py-1.5">
      <p className="text-on-surface-variant">{label}</p>
      <p className="font-bold text-on-surface">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { active: 'bg-primary/15 text-primary', scheduled: 'bg-tertiary/15 text-tertiary', draft: 'bg-surface-container-high text-on-surface-variant', ended: 'bg-surface-container-high text-on-surface-variant', completed: 'bg-primary/15 text-primary', failed: 'bg-error/15 text-error', cancelled: 'bg-surface-container-high text-on-surface-variant', paused: 'bg-tertiary/15 text-tertiary' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none ${map[status] || ''}`}>{STATUS_LABELS[status] || status}</span>;
}

function Action({ label, icon, onClick, primary, danger }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors ${primary ? 'text-primary font-bold' : danger ? 'text-error' : 'text-on-surface-variant'}`}>
      <Icon name={icon} className="text-[16px]" /> {label}
    </button>
  );
}