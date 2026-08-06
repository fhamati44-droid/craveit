import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Pencil, Download, AlertCircle, Check, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RestaurantMenuItemEditor from '@/components/admin/restaurant/RestaurantMenuItemEditor';
import {
  getItemsForRestaurant, getMenusForRestaurant, createMenu,
  resolveItemDisplayImage, resolveItemDisplayTitle, resolveItemPayablePrice, downloadCsvTemplate,
} from '@/lib/restaurantMenuApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const MAPPING_LABEL = { unmapped: 'غير مربوط', suggested: 'مقترح', mapped: 'مربوط', needs_review: 'يحتاج مراجعة', rejected: 'مرفوض' };
const MAPPING_CLS = { unmapped: 'bg-gray-100 text-gray-600', suggested: 'bg-blue-100 text-blue-700', mapped: 'bg-green-100 text-green-700', needs_review: 'bg-orange-100 text-orange-700', rejected: 'bg-red-100 text-red-600' };

export default function RestaurantMenuItems() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unmapped | mapped | soldout
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [menuName, setMenuName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, ms, its] = await Promise.all([
        base44.entities.Restaurant.get(id),
        getMenusForRestaurant(id),
        getItemsForRestaurant(id),
      ]);
      setRestaurant(r); setMenus(ms || []); setItems(its || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const addMenu = async () => {
    if (!menuName.trim()) return;
    await createMenu({ restaurant_id: id, name_ar: menuName, internal_name: menuName, active: true });
    setMenuName(''); setCreatingMenu(false); load();
  };

  const filtered = items.filter((it) => {
    if (filter === 'unmapped') return it.mapping_status === 'unmapped';
    if (filter === 'mapped') return it.mapping_status === 'mapped';
    if (filter === 'soldout') return it.sold_out;
    return true;
  });

  return (
    <div dir="rtl" className="font-tamam max-w-2xl space-y-4">
      <button onClick={() => navigate('/admin/restaurants')} className="flex items-center gap-1 text-on-surface-variant text-sm"><ArrowRight size={16} /> المطاعم</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{restaurant?.name_ar || restaurant?.name || 'مطعم'} — مينيو المطعم</h1>
          <p className="text-xs text-on-surface-variant">الطبقة الثانية: منيو التجهيز الحقيقي (مستقل عن مينيو TAMAM التسويقي)</p>
        </div>
      </div>

      {/* Menus */}
      <div className="bg-surface-container rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">قوائم المطعم ({menus.length})</p>
          <button onClick={() => setCreatingMenu((v) => !v)} className="text-xs text-primary flex items-center gap-1"><Plus size={13} /> إضافة مينيو</button>
        </div>
        {creatingMenu && (
          <div className="flex gap-2 mb-2">
            <input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="اسم المينيو" className="flex-1 inp" />
            <button onClick={addMenu} className="bg-primary text-on-primary px-3 rounded-lg text-sm font-bold">حفظ</button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {menus.length === 0 && <span className="text-xs text-on-surface-variant">لا توجد قوائم بعد. أنشئ واحدة.</span>}
          {menus.map((m) => (
            <span key={m.id} className={`text-xs px-2.5 py-1 rounded-full ${m.active ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{m.name_ar || m.internal_name} {m.active ? '🟢' : '⚪'}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setEditing({})} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm"><Plus size={16} /> إضافة وجبة يدويًا</button>
        <button onClick={downloadCsvTemplate} className="flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 py-2.5 px-3 rounded-xl text-sm font-bold"><Download size={15} /> قالب CSV</button>
        <button onClick={() => alert('استيراد CSV — قيد الإنجاز')} className="flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 py-2.5 px-3 rounded-xl text-sm font-bold">استيراد CSV</button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {[{ k: 'all', l: 'الكل' }, { k: 'mapped', l: 'مربوط' }, { k: 'unmapped', l: 'غير مربوط' }, { k: 'soldout', l: 'نفد' }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === f.k ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{f.l}</button>
        ))}
      </div>

      {loading && <p className="text-center text-on-surface-variant py-8 text-sm">عم نحمّل...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-on-surface-variant">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-sm mb-1">لا توجد وجبات {filter !== 'all' ? 'بهذا الفلتر' : 'في مينيو المطعم بعد'}</p>
          <p className="text-xs">أضف وجبة يدويًا أو استورد ملف CSV. المطعم بدون مينيو لا يظهر كموفّر تجهيز.</p>
        </div>
      )}

      {filtered.map((it) => {
        const price = resolveItemPayablePrice(it);
        const img = resolveItemDisplayImage(it, null);
        return (
          <div key={it.id} className="bg-surface-container rounded-2xl p-3 flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
              {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm truncate">{resolveItemDisplayTitle(it, null)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${MAPPING_CLS[it.mapping_status] || MAPPING_CLS.unmapped}`}>{MAPPING_LABEL[it.mapping_status] || 'غير مربوط'}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate">{it.restaurant_sku ? `SKU: ${it.restaurant_sku} · ` : ''}{it.restaurant_category_name || 'بدون قسم'}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px]">
                <span className={price == null ? 'text-error font-bold' : 'text-primary font-bold'}>{price != null ? `₪${price}` : 'سعر غير متوفر'}</span>
                {it.meal_id && <span className="text-on-surface-variant flex items-center gap-0.5"><Link2 size={10} /> TAMAM #{it.meal_id}</span>}
                {it.sold_out && <span className="text-error">نفد</span>}
                {price == null || it.mapping_status === 'unmapped' ? <span className="text-orange-600 flex items-center gap-0.5"><AlertCircle size={10} /> غير قابل للشراء</span> : <span className="text-green-600 flex items-center gap-0.5"><Check size={10} /> جاهز</span>}
              </div>
            </div>
            <button onClick={() => setEditing(it)} className="p-1.5 hover:bg-surface-container-high rounded"><Pencil size={14} /></button>
          </div>
        );
      })}

      {editing && (
        <RestaurantMenuItemEditor
          restaurant={restaurant}
          menus={menus}
          item={editing.id ? editing : null}
          onSave={() => { setEditing(null); load(); }}
          onClose={() => setEditing(null)}
        />
      )}
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:10px;padding:8px 10px;font-size:13px;color:inherit;outline:none}`}</style>
    </div>
  );
}