import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { trackEvent, getPublicSuggestionSet } from '@/lib/tamamApi';
import { useCart } from '@/lib/CartContext';
import { resolvePublicMedia, handleImageError } from '@/lib/imageUtils';
import AddToCartSuccessSheet from '@/components/tamam/customer/AddToCartSuccessSheet';

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
  const { addItem, totalItems } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { set: s, items: rawItems, mood: m } = await getPublicSuggestionSet(suggestionSetId);
        setSet(s);
        setMood(m);
        const its = [...(rawItems || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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

  const addToCart = () => {
    if (submitting) return; // idempotency lock — prevent double-add
    const unavailable = items.some(it => {
      const m = mealFor(it);
      return m && m.is_available === false;
    });
    if (unavailable) { alert('بعض الوجبات غير متاحة حاليًا. عدّل الكميات أو جرّب لاحقًا.'); return; }
    setSubmitting(true);
    try {
      const restId = items[0]?.restaurant_id;
      const restObj = restId ? restaurants[restId] : null;
      const restInfo = restObj
        ? { id: restId, name: restObj.name || restObj.name_ar || 'TAMAM', ...restObj }
        : { id: restId || 0, name: 'TAMAM' };
      let addedQty = 0;
      items.forEach(it => {
        const m = mealFor(it);
        const qty = quantities[it.id] || 1;
        addItem({
          id: it.meal_id,
          name: m?.name_ar || m?.name || '—',
          price: unitPrice(it),
          image_url: m?.image_url,
          quantity: qty,
          extras: [],
          note: notes[it.id] || '',
          suggestion_id: suggestionSetId,
          package_type: set?.package_level,
          mood_id: set?.mood_id,
          restaurant_id: it.restaurant_id,
        }, restInfo);
        addedQty += qty;
      });
      trackEvent({ action: 'order_started', mood_id: mood?.id, suggestion_set_id: suggestionSetId, package_level: set?.package_level });
      setAdded({ title: set?.title_ar || 'اقتراح TAMAM', quantity: addedQty, subtotal: total });
    } finally { setSubmitting(false); }
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
                {m?.image_url ? <img src={resolvePublicMedia(m.image_url)} alt="" className="w-full h-full object-cover" onError={handleImageError} referrerPolicy="no-referrer" />
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
          <button onClick={addToCart} disabled={submitting}
            className="flex-1 bg-[#3DEB8B] text-black font-extrabold py-3.5 rounded-2xl disabled:opacity-60">
            {submitting ? 'جاري الإضافة...' : 'أضف للسلة'}
          </button>
        </div>
      </div>

      <AddToCartSuccessSheet
        open={!!added}
        title={added?.title}
        quantity={added?.quantity}
        subtotal={added?.subtotal}
        cartCount={totalItems}
        onClose={() => setAdded(null)}
        onContinue={() => { setAdded(null); navigate('/cart'); }}
        onKeepBrowsing={() => setAdded(null)}
      />
    </div>
  );
}