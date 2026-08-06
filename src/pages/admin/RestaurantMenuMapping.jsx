import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Link2, Unlink, Check, AlertTriangle } from 'lucide-react';
import {
  getItemsForRestaurant, updateItem, searchTamamProducts, suggestMappings,
  resolveItemDisplayImage,
} from '@/lib/restaurantMenuApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const MAPPING_LABEL = { unmapped: 'غير مربوط', suggested: 'مقترح', mapped: 'مربوط', needs_review: 'يحتاج مراجعة', rejected: 'مرفوض' };
const MAPPING_CLS = { unmapped: 'bg-gray-100 text-gray-600', suggested: 'bg-blue-100 text-blue-700', mapped: 'bg-green-100 text-green-700', needs_review: 'bg-orange-100 text-orange-700', rejected: 'bg-red-100 text-red-600' };

export default function RestaurantMenuMapping() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    const its = await getItemsForRestaurant(id);
    setItems(its || []);
    if (its?.length && !selectedId) setSelectedId(its[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const selected = items.find((i) => i.id === selectedId);

  const runSearch = async (q) => {
    setSearchQ(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchTamamProducts(q)); } finally { setSearching(false); }
  };

  useEffect(() => {
    if (selected && !selected.meal_id) {
      setSuggestions(selected.restaurant_product_name ? suggestMappings(selected.restaurant_product_name, results) : []);
    } else setSuggestions([]);
  }, [selectedId, results]);

  const map = async (product, confidence = 100) => {
    await updateItem(selected.id, { meal_id: Number(product.id), meal_name_snapshot: product.name_ar || product.name, mapping_status: 'mapped', mapping_confidence: confidence });
    setToast(`هذه الوجبة ستظهر كخيار مطعم للمنتج: ${product.name_ar || product.name}`);
    setTimeout(() => setToast(''), 3500);
    load();
  };
  const unmap = async () => {
    await updateItem(selected.id, { meal_id: null, meal_name_snapshot: '', mapping_status: 'unmapped', mapping_confidence: 0 });
    load();
  };
  const setStatus = async (s) => { await updateItem(selected.id, { mapping_status: s }); load(); };

  return (
    <div dir="rtl" className="font-tamam max-w-3xl space-y-3">
      <button onClick={() => navigate(`/admin/restaurants/${id}/menu`)} className="flex items-center gap-1 text-on-surface-variant text-sm"><ArrowRight size={16} /> مينيو المطعم</button>
      <h1 className="text-xl font-bold">ربط مينيو المطعم بمينيو TAMAM</h1>
      <p className="text-xs text-on-surface-variant">المقترحات لا تُطبق تلقائيًا — أكّد كل ربط. الربط لا يغيّر بيانات TAMAM.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Right (RTL first): restaurant items */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-on-surface-variant">وجبات المطعم ({items.length})</p>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {loading && <p className="text-xs text-on-surface-variant text-center py-4">عم نحمّل...</p>}
            {items.map((it) => (
              <button key={it.id} onClick={() => setSelectedId(it.id)} className={`w-full text-right flex items-center gap-2 p-2 rounded-xl border ${selectedId === it.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container'}`}>
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                  {resolveItemDisplayImage(it, null) ? <img src={resolveItemDisplayImage(it, null)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{it.restaurant_product_name || 'بدون اسم'}</p>
                  <p className="text-[10px] text-on-surface-variant">₪{it.price} {it.restaurant_category_name ? `· ${it.restaurant_category_name}` : ''}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${MAPPING_CLS[it.mapping_status] || MAPPING_CLS.unmapped}`}>{MAPPING_LABEL[it.mapping_status] || 'غير مربوط'}</span>
              </button>
            ))}
            {!loading && !items.length && <p className="text-xs text-on-surface-variant text-center py-4">لا توجد وجبات بعد</p>}
          </div>
        </div>

        {/* Left: TAMAM search + suggestions */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-on-surface-variant">منتجات TAMAM (للربط)</p>
          <div className="relative">
            <input value={searchQ} onChange={(e) => runSearch(e.target.value)} placeholder="ابحث عن منتج TAMAM..." className="inp text-sm" />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
          {searching && <p className="text-xs text-on-surface-variant">عم نبحث...</p>}

          {selected && (
            <div className="bg-surface-container rounded-xl p-2">
              <p className="text-[11px] text-on-surface-variant mb-1">المحدد: <span className="font-bold">{selected.restaurant_product_name}</span></p>
              {selected.meal_id ? (
                <div className="bg-green-50 rounded-lg p-2 text-xs">
                  <p className="font-bold text-green-700 flex items-center gap-1"><Check size={13} /> مربوط بـ: {selected.meal_name_snapshot} (#{selected.meal_id})</p>
                  <button onClick={unmap} className="text-red-500 flex items-center gap-1 mt-1"><Unlink size={11} /> إلغاء الربط</button>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-on-surface-variant">مقترحات:</p>
                  {suggestions.map((s) => (
                    <button key={s.product.id} onClick={() => map(s.product, s.confidence)} className="w-full flex justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                      <span>{s.product.name_ar || s.product.name}</span><span className="font-bold text-blue-700">{s.confidence}%</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-on-surface-variant">اختر من نتائج البحث بالأسفل</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(MAPPING_LABEL).map(([k, l]) => (
                  <button key={k} onClick={() => setStatus(k)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selected.mapping_status === k ? 'ring-2 ring-primary ' + MAPPING_CLS[k] : MAPPING_CLS[k]}`}>{l}</button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {results.map((p) => (
              <button key={p.id} onClick={() => map(p)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-right">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">🍽️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.name_ar || p.name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{p.category_name} · ₪{p.price}</p>
                </div>
                <Link2 size={14} className="text-primary flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2.5 rounded-full text-sm font-bold z-50 flex items-center gap-2 shadow-lg">
          <Check size={15} /> {toast}
        </div>
      )}
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:10px;padding:8px 10px;font-size:13px;color:inherit;outline:none}`}</style>
    </div>
  );
}