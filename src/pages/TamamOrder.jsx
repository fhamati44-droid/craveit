import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createOrder } from '@/lib/api';
import { trackEvent } from '@/lib/tamamApi';
import TamamCheckoutSheet from '@/components/tamam/TamamCheckoutSheet';
import OrderSuccessSheet from '@/components/tamam/OrderSuccessSheet';

export default function TamamOrder() {
  const { suggestionSetId } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [mood, setMood] = useState(null);
  const [items, setItems] = useState([]);
  const [meals, setMeals] = useState({});
  const [restaurants, setRestaurants] = useState({});
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await base44.entities.TamamSuggestionSet.get(suggestionSetId);
        setSet(s);
        if (s?.mood_id) {
          const m = await base44.entities.TamamMood.get(s.mood_id).catch(() => null);
          setMood(m);
        }
        const its = await base44.entities.TamamSuggestionItem.filter({ suggestion_set_id: suggestionSetId });
        its.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setItems(its);
        const q = {};
        its.forEach(i => { q[i.id] = i.quantity || 1; });
        setQuantities(q);

        const mealIds = [...new Set(its.map(i => i.meal_id).filter(Boolean))];
        const restIds = [...new Set(its.map(i => i.restaurant_id).filter(Boolean))];
        if (mealIds.length) {
          const res = await base44.functions.invoke('supabaseProxy', { action: 'getMenuItemsByIds', payload: { ids: mealIds } });
          const byId = {};
          (res?.data?.data || []).forEach(m => { byId[m.id] = m; });
          setMeals(byId);
        }
        if (restIds.length) {
          const res = await base44.functions.invoke('supabaseProxy', { action: 'getRestaurantsByIds', payload: { ids: restIds } });
          const byId = {};
          (res?.data?.data || []).forEach(r => { byId[r.id] = r; });
          setRestaurants(byId);
        }
        trackEvent({ action: 'suggestion_viewed', mood_id: s?.mood_id, suggestion_set_id: suggestionSetId, package_level: s?.package_level });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [suggestionSetId]);

  const mealFor = (it) => meals[it.meal_id];
  const restFor = (it) => restaurants[it.restaurant_id];

  const unitPrice = (it) => {
    const m = mealFor(it);
    return m?.price || 0;
  };
  const lineTotal = (it) => unitPrice(it) * (quantities[it.id] || 1);

  const computedTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const total = set?.display_price_override != null ? set.display_price_override : computedTotal;

  const anyUnavailable = items.some(it => {
    const m = mealFor(it);
    return m && m.is_available === false;
  });

  const submitOrder = async ({ name, phone, orderType, address, location, notes: orderNotes }) => {
    const orderItems = items.map(it => {
      const m = mealFor(it);
      return {
        item_id: it.meal_id,
        name: m?.name || '—',
        quantity: quantities[it.id] || 1,
        price: unitPrice(it),
        extras: it.selected_addon_ids || [],
        notes: notes[it.id] || '',
        tamam: true,
        restaurant_id: it.restaurant_id,
      };
    });
    const itemsStr = items.map(it => {
      const m = mealFor(it);
      const r = restFor(it);
      return `${quantities[it.id] || 1}x ${m?.name || '—'}${r ? ' (' + r.name + ')' : ''}`;
    }).join(' | ');
    const restId = items[0]?.restaurant_id;
    const kitchenId = restId ? restaurants[restId]?.kitchen_id || 1 : 1;

    const typeLabel = { delivery: 'משלוח', pickup: 'איסוף עצמי', dinein: 'ישיבה במקום' }[orderType] || '';
    const fullNotes = [
      orderNotes || '',
      `סוג: ${typeLabel}`,
      location?.latitude ? `מיקום: ${location.latitude},${location.longitude}` : '',
    ].filter(Boolean).join(' · ');

    try {
      const order = await createOrder({
        customer_name: name,
        phone,
        address: orderType === 'delivery' ? address : null,
        notes: fullNotes || null,
        kitchen_id: kitchenId,
        courier_id: null,
        channel: 'TAMAM',
        items: itemsStr,
        order_items: orderItems,
        drinks: null,
        dessert: null,
        quantity: Object.values(quantities).reduce((a, b) => a + b, 0),
        amount: total,
        status: 'new',
      });
      trackEvent({ action: 'order_completed', mood_id: mood?.id, suggestion_set_id: suggestionSetId, package_level: set?.package_level });
      setShowCheckout(false);
      setSuccess({
        orderNumber: `NJ-${order?.id || ''}`,
        customerName: name,
        total,
      });
    } catch (err) {
      alert(`שגיאה בשליחת ההזמנה: ${err.message}`);
      setShowCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 0%, #0f2e2b, #051614)' }}>
        <div className="w-10 h-10 border-2 border-[#3DEB8B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-center px-6" style={{ background: 'radial-gradient(circle at 50% 0%, #0f2e2b, #051614)' }}>
        <div>
          <p className="text-3xl mb-2">🤔</p>
          <p className="text-white/70 mb-4">الاقتراح غير موجود</p>
          <button onClick={() => navigate('/tamam-game')} className="text-[#3DEB8B] underline">العودة للعبة</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pb-32" style={{ background: 'radial-gradient(circle at 50% 0%, #0f2e2b 0%, #051614 70%)' }}>
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/70">
          <ArrowRight size={18} /> رجوع
        </button>
        <span className="text-lg font-extrabold">TAMAM <span className="text-[#3DEB8B]">▲</span></span>
        <span className="w-10" />
      </div>

      <div className="px-4 mb-4 text-center">
        <h1 className="text-xl font-extrabold">{set.title_ar || 'اقتراح TAMAM'}</h1>
        {mood && <p className="text-white/50 text-xs mt-1">{mood.icon} {mood.name_ar} • {set.package_level}</p>}
      </div>

      <div className="px-3 space-y-3">
        {items.length === 0 && (
          <div className="text-center text-white/60 py-10">
            <p>لا توجد عناصر في هذا الاقتراح بعد</p>
          </div>
        )}
        {items.map(it => {
          const m = mealFor(it);
          const r = restFor(it);
          const unavailable = m && m.is_available === false;
          return (
            <div key={it.id} className="rounded-2xl bg-[#0B1A14]/80 border border-white/10 p-3 flex gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                {m?.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm leading-tight">{m?.name_ar || m?.name || '—'}</h3>
                {r && <p className="text-white/50 text-[11px] mt-0.5">{r.name}</p>}
                <p className="text-[#3DEB8B] font-bold text-sm mt-1">₪{unitPrice(it)}</p>
                {unavailable && (
                  <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> هذه الوجبة غير متاحة حاليًا
                  </p>
                )}
                <input
                  value={notes[it.id] || ''}
                  onChange={e => setNotes(p => ({ ...p, [it.id]: e.target.value }))}
                  placeholder="ملاحظة للطلب..."
                  className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-right text-white/90"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantities(p => ({ ...p, [it.id]: Math.max(1, (p[it.id] || 1) - 1) }))}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"><Minus size={14} /></button>
                    <span className="font-bold text-sm w-6 text-center">{quantities[it.id] || 1}</span>
                    <button onClick={() => setQuantities(p => ({ ...p, [it.id]: (p[it.id] || 1) + 1 }))}
                      className="w-7 h-7 rounded-lg bg-[#3DEB8B] text-black flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                  <span className="font-bold text-sm">₪{lineTotal(it)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {anyUnavailable && (
        <p className="text-amber-400 text-xs text-center mt-3 px-4">بعض الوجبات غير متاحة — يمكنك المتابعة مع المتاح.</p>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#051614]/95 backdrop-blur border-t border-white/10 p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-white/50 text-[11px]">الإجمالي التقديري</p>
            <p className="font-extrabold text-xl text-[#3DEB8B]">₪{Math.round(total)}</p>
          </div>
          <button onClick={() => { trackEvent({ action: 'order_started', mood_id: mood?.id, suggestion_set_id: suggestionSetId, package_level: set?.package_level }); setShowCheckout(true); }}
            className="flex-1 bg-[#3DEB8B] text-black font-extrabold py-3.5 rounded-2xl">
            متابعة الطلب
          </button>
        </div>
      </div>

      <TamamCheckoutSheet
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        total={total}
        mood={mood}
        packageLevel={set.package_level}
        suggestionTitle={set.title_ar}
        onSubmit={submitOrder}
      />

      <OrderSuccessSheet
        open={!!success}
        orderNumber={success?.orderNumber}
        customerName={success?.customerName}
        total={success?.total}
        onClose={() => { setSuccess(null); navigate('/'); }}
      />
    </div>
  );
}