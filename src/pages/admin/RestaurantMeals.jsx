import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Link2, Unlink, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getAllMenuCategories, getMenuItems } from '@/lib/api';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantMeals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [meals, setMeals] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [linkFilter, setLinkFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  const loadMeals = async () => {
    const cats = await getAllMenuCategories().catch(() => []);
    const flat = [];
    for (const c of cats || []) {
      const items = await getMenuItems(c.id).catch(() => []);
      for (const it of (items || [])) flat.push({ ...it, category_name: c.name || c.name_ar || '—', category_id: c.id });
    }
    setMeals(flat);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([
        base44.entities.Restaurant.get(id),
        base44.entities.RestaurantMealOffer.filter({ restaurant_id: id }),
      ]);
      setRestaurant(r);
      setOffers(o || []);
      await loadMeals();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const offerFor = (mealId) => offers.find((o) => o.meal_id === mealId);

  const filtered = meals.filter((m) => {
    if (q && !m.name?.includes(q) && !m.name_ar?.includes(q)) return false;
    if (catFilter !== 'all' && String(m.category_id) !== catFilter) return false;
    const linked = !!offerFor(m.id);
    if (linkFilter === 'linked' && !linked) return false;
    if (linkFilter === 'unlinked' && linked) return false;
    return true;
  });

  const categories = [...new Map(meals.map((m) => [m.category_id, { id: m.category_id, name: m.category_name }])).values()];

  const toggleSelect = (mid) => setSelected((s) => { const n = new Set(s); n.has(mid) ? n.delete(mid) : n.add(mid); return n; });

  // Link (create offer) with a default price from the meal's marketing price
  const link = async (m, price) => {
    const p = Number(price ?? m.price ?? 0);
    if (!p || p <= 0) { alert('أدخل سعرًا صالحًا أكبر من صفر'); return; }
    await base44.entities.RestaurantMealOffer.create({
      restaurant_id: id, meal_id: m.id, meal_name_snapshot: m.name || m.name_ar,
      category_id: m.category_id, category_name_snapshot: m.category_name,
      price: p, compare_at_price: m.price || null,
      active: true, available: true, minimum_quantity: 1,
    });
    await load();
  };

  const unlink = async (offerId) => { await base44.entities.RestaurantMealOffer.delete(offerId); await load(); };
  const updateOffer = async (offerId, patch) => { await base44.entities.RestaurantMealOffer.update(offerId, patch); await load(); };

  // Bulk
  const bulk = async (kind) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const ids = [...selected];
      if (kind === 'link') {
        const toCreate = ids.map((mid) => {
          const m = meals.find((x) => x.id === mid); const ex = offerFor(mid);
          return ex ? null : { restaurant_id: id, meal_id: mid, meal_name_snapshot: m?.name || m?.name_ar, category_id: m?.category_id, price: m?.price || 0, active: true, available: true, minimum_quantity: 1 };
        }).filter(Boolean);
        if (toCreate.length) await base44.entities.RestaurantMealOffer.bulkCreate(toCreate);
      } else if (kind === 'unlink') {
        for (const mid of ids) { const o = offerFor(mid); if (o) await base44.entities.RestaurantMealOffer.delete(o.id); }
      } else if (kind === 'avail') {
        for (const mid of ids) { const o = offerFor(mid); if (o) await base44.entities.RestaurantMealOffer.update(o.id, { available: true }); }
      } else if (kind === 'unavail') {
        for (const mid of ids) { const o = offerFor(mid); if (o) await base44.entities.RestaurantMealOffer.update(o.id, { available: false }); }
      }
      setSelected(new Set());
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div dir="rtl" className="font-tamam space-y-4">
      <button onClick={() => navigate('/admin/restaurants')} className="flex items-center gap-1 text-on-surface-variant text-sm">
        <ArrowRight size={16} /> المطاعم
      </button>

      {/* Restaurant header */}
      {restaurant && (
        <div className="bg-surface-container rounded-2xl p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0">
            {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>}
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{restaurant.name_ar || restaurant.name}</h1>
            <p className="text-xs text-on-surface-variant">وجبات المطعم · ربط وجبات TAMAM وتحديد الأسعار</p>
          </div>
          <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-full font-bold">{offers.length} مرتبطة</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث وجبة" className="w-full bg-surface-container rounded-lg pr-9 pl-3 py-2 text-sm" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-surface-container rounded-lg px-2 py-2 text-sm">
          <option value="all">كل التصنيفات</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)} className="bg-surface-container rounded-lg px-2 py-2 text-sm">
          <option value="all">الكل</option>
          <option value="linked">مرتبطة</option>
          <option value="unlinked">غير مرتبطة</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-surface-container rounded-xl p-2">
          <span className="text-xs text-on-surface-variant px-1">{selected.size} محدّد</span>
          <BulkBtn onClick={() => bulk('link')} disabled={busy}><Link2 size={13} /> ربط المحدّد</BulkBtn>
          <BulkBtn onClick={() => bulk('unlink')} disabled={busy}><Unlink size={13} /> فك المحدّد</BulkBtn>
          <BulkBtn onClick={() => bulk('avail')} disabled={busy}>متاح</BulkBtn>
          <BulkBtn onClick={() => bulk('unavail')} disabled={busy}>غير متاح</BulkBtn>
          <button onClick={() => setSelected(new Set())} className="text-xs text-on-surface-variant px-2">إلغاء التحديد</button>
        </div>
      )}

      {loading ? <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p> : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const o = offerFor(m.id);
            const sel = selected.has(m.id);
            return (
              <div key={m.id} className="bg-surface-container rounded-2xl p-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelect(m.id)} className={`w-6 h-6 rounded-md border-2 flex-shrink-0 mt-1 flex items-center justify-center ${sel ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                    {sel && <Check size={14} className="text-on-primary" />}
                  </button>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                    {m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🍽️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm truncate">{m.name || m.name_ar}</h3>
                      {o ? <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">مرتبطة</span> : <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded font-bold">غير مرتبطة</span>}
                    </div>
                    <p className="text-[11px] text-on-surface-variant">{m.category_name} · تسويق ₪{m.price || 0}</p>
                  </div>
                </div>

                {o ? (
                  <div className="grid grid-cols-2 gap-2 mt-2 items-end">
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant block">سعر المطعم ₪</span>
                      <input type="number" defaultValue={o.price} onBlur={(e) => { if (Number(e.target.value) !== o.price) updateOffer(o.id, { price: Number(e.target.value) }); }} className="w-full bg-surface-container-high rounded-lg px-2 py-1.5 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant block">تجهيز (د)</span>
                      <input type="number" defaultValue={o.preparation_time_override ?? ''} onBlur={(e) => updateOffer(o.id, { preparation_time_override: e.target.value ? Number(e.target.value) : null })} className="w-full bg-surface-container-high rounded-lg px-2 py-1.5 text-sm" />
                    </label>
                    <label className="block col-span-2">
                      <span className="text-[10px] text-on-surface-variant block">مخزون</span>
                      <input type="number" defaultValue={o.available_quantity ?? ''} onBlur={(e) => updateOffer(o.id, { available_quantity: e.target.value ? Number(e.target.value) : null })} className="w-full bg-surface-container-high rounded-lg px-2 py-1.5 text-sm" />
                    </label>
                    <div className="col-span-2 flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={o.available} onChange={(e) => updateOffer(o.id, { available: e.target.checked })} /> متاح
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={o.active} onChange={(e) => updateOffer(o.id, { active: e.target.checked })} /> فعّال
                      </label>
                      <button onClick={() => unlink(o.id)} className="text-xs text-error font-bold flex items-center gap-1"><X size={12} /> فك الربط</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" placeholder={`السعر (يبدأ من ₪${m.price || 0})`} defaultValue={m.price || ''} onKeyDown={(e) => { if (e.key === 'Enter') link(m, e.target.value); }} className="flex-1 bg-surface-container-high rounded-lg px-2 py-1.5 text-sm" />
                    <button onClick={(e) => link(m, e.target.previousElementSibling?.value)} className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Link2 size={12} /> ربط</button>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-on-surface-variant py-8">لا توجد وجبات مطابقة</p>}
        </div>
      )}
    </div>
  );
}

function BulkBtn({ children, ...props }) {
  return <button {...props} className="bg-surface-container-high text-on-surface text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">{children}</button>;
}