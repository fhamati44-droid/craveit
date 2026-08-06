import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, Check, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getItemsForRestaurant, updateItem } from '@/lib/restaurantMenuApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantMenuImages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploaded, setUploaded] = useState([]); // [{ url, name, matchedItemId? }]
  const [filter, setFilter] = useState('all'); // all | missing | has | unmatched
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setItems((await getItemsForRestaurant(id)) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  // Auto-match uploaded image to an item by SKU or name contained in filename
  const autoMatch = (url, fileName) => {
    const base = fileName.replace(/\.[^.]+$/, '').toLowerCase();
    return items.find((it) => {
      const sku = (it.restaurant_sku || '').toLowerCase();
      if (sku && base.includes(sku)) return true;
      const name = (it.restaurant_product_name || '').toLowerCase();
      const tokens = name.split(/\s+/).filter((t) => t.length > 2);
      return tokens.some((t) => base.includes(t));
    });
  };

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [];
    for (const f of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        const match = autoMatch(file_url, f.name);
        next.push({ url: file_url, name: f.name, matchedItemId: match?.id || null });
      } catch (err) { /* skip */ }
    }
    setUploaded((u) => [...u, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const assign = (imgIdx, itemId) => {
    setUploaded((u) => u.map((x, i) => i === imgIdx ? { ...x, matchedItemId: itemId } : x));
  };
  const unassign = (imgIdx) => setUploaded((u) => u.map((x, i) => i === imgIdx ? { ...x, matchedItemId: null } : x));

  const save = async () => {
    setSaving(true);
    try {
      for (const img of uploaded) {
        if (img.matchedItemId) await updateItem(img.matchedItemId, { primary_image: img.url });
      }
      setUploaded([]);
      load();
      alert('تم حفظ الصور. لا تغيّر بيانات TAMAM.');
    } finally { setSaving(false); }
  };

  const filteredItems = items.filter((it) => {
    if (filter === 'missing') return !it.primary_image;
    if (filter === 'has') return !!it.primary_image;
    return true;
  });
  const unmatchedImgs = uploaded.filter((u) => !u.matchedItemId);

  return (
    <div dir="rtl" className="font-tamam max-w-2xl space-y-4">
      <button onClick={() => navigate(`/admin/restaurants/${id}/menu`)} className="flex items-center gap-1 text-on-surface-variant text-sm"><ArrowRight size={16} /> مينيو المطعم</button>
      <h1 className="text-xl font-bold">رفع صور وجبات المطعم</h1>
      <p className="text-xs text-on-surface-variant">الصور تُحفظ داخل تخزين TAMAM. لا تغيّر صور TAMAM التسويقية.</p>

      <label className="block border-2 border-dashed border-outline-variant/40 rounded-2xl p-6 text-center cursor-pointer hover:border-primary">
        <Upload size={28} className="mx-auto text-on-surface-variant mb-1" />
        <p className="text-sm font-bold">رفع عدة صور</p>
        <p className="text-xs text-on-surface-variant">يطابق تلقائيًا حسب SKU أو اسم الوجبة</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
      </label>

      {unmatchedImgs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-xs text-orange-700 flex items-center gap-1"><AlertTriangle size={13} /> {unmatchedImgs.length} صورة غير مطابقة — اربطها يدويًا.</div>
      )}

      {uploaded.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-on-surface-variant">الصور المرفوعة ({uploaded.length})</p>
          {uploaded.map((img, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface-container rounded-xl p-2">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"><img src={img.url} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate text-on-surface-variant">{img.name}</p>
                <select value={img.matchedItemId || ''} onChange={(e) => assign(i, e.target.value || null)} className="inp text-xs mt-0.5">
                  <option value="">— اختر وجبة —</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.restaurant_product_name}{it.restaurant_sku ? ` (${it.restaurant_sku})` : ''}</option>)}
                </select>
              </div>
              {img.matchedItemId && <button onClick={() => unassign(i)} className="text-[11px] text-on-surface-variant">إلغاء</button>}
            </div>
          ))}
          <button onClick={save} disabled={saving} className="w-full bg-primary text-on-primary h-11 rounded-full font-bold text-sm disabled:opacity-50">{saving ? '...' : 'حفظ الصور'}</button>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {[{ k: 'all', l: 'الكل' }, { k: 'missing', l: 'بدون صورة' }, { k: 'has', l: 'لها صورة' }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`text-xs px-3 py-1.5 rounded-full font-bold ${filter === f.k ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{f.l}</button>
        ))}
      </div>

      {loading && <p className="text-xs text-on-surface-variant text-center py-4">عم نحمّل...</p>}
      <div className="grid grid-cols-3 gap-2">
        {filteredItems.map((it) => (
          <div key={it.id} className="bg-surface-container rounded-xl p-1.5 text-center">
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-surface-container-high mb-1">
              {it.primary_image ? <img src={it.primary_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg text-on-surface-variant">🖼️</div>}
            </div>
            <p className="text-[10px] truncate font-bold">{it.restaurant_product_name}</p>
            {it.primary_image ? <span className="text-[9px] text-green-600 flex items-center justify-center gap-0.5"><Check size={9} /> لها صورة</span> : <span className="text-[9px] text-on-surface-variant">بدون</span>}
          </div>
        ))}
      </div>
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:10px;padding:8px 10px;font-size:13px;color:inherit;outline:none}`}</style>
    </div>
  );
}