import { useState, useEffect } from 'react';
import { X, Upload, Search, Link2, Unlink, AlertCircle, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  createItem, updateItem, deleteItem, searchTamamProducts, suggestMappings,
} from '@/lib/restaurantMenuApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const MAPPING_STATUS = {
  unmapped: { label: 'غير مربوط', cls: 'bg-gray-100 text-gray-600' },
  suggested: { label: 'مقترح', cls: 'bg-blue-100 text-blue-700' },
  mapped: { label: 'مربوط', cls: 'bg-green-100 text-green-700' },
  needs_review: { label: 'يحتاج مراجعة', cls: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-600' },
};

const EMPTY = {
  restaurant_product_name: '', name_en: '', restaurant_sku: '',
  restaurant_category_name: '', restaurant_subcategory_name: '', menu_section_name: '',
  display_order: 0, active: true, available: true, sold_out: false,
  primary_image: '', gallery_images: [], thumbnail_image: '',
  customer_visible_description: '', full_description_ar: '', ingredients_ar: '',
  included_items: '', allergens_ar: '', portion_description_ar: '', packaging_description_ar: '',
  price: '', compare_at_price: '', discount_amount: '', currency: 'ILS', tax_included: true,
  available_quantity: '', daily_capacity: '', available_days: [], available_from_time: '', available_until_time: '',
  preparation_time_override: '', delivery_fee_override: '', minimum_order_override: '', free_delivery_threshold_override: '',
  meal_id: '', meal_name_snapshot: '', mapped_meal_set_variant_id: '',
  mapping_status: 'unmapped', mapping_confidence: 0, restaurant_notes: '', external_id: '',
};

export default function RestaurantMenuItemEditor({ restaurant, menus, item, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!item?.id;

  useEffect(() => {
    if (item) setForm({ ...EMPTY, ...item, gallery_images: item.gallery_images || [], available_days: item.available_days || [] });
  }, [item?.id]);

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v) => (v === '' || v == null ? null : Number(v));

  const runSearch = async (q) => {
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchTamamProducts(q);
      setSearchResults(results);
    } finally { setSearching(false); }
  };

  // auto-suggestions based on the restaurant item name
  const suggestions = form.restaurant_product_name ? suggestMappings(form.restaurant_product_name, searchResults) : [];

  const selectTamam = (p, confidence = 100) => {
    up('meal_id', p.id);
    up('meal_name_snapshot', p.name_ar || p.name);
    up('mapping_status', 'mapped');
    up('mapping_confidence', confidence);
    setSearchResults([]);
  };
  const clearMapping = () => {
    up('meal_id', null); up('meal_name_snapshot', ''); up('mapping_status', 'unmapped'); up('mapping_confidence', 0);
  };
  const setStatus = (s) => up('mapping_status', s);

  const uploadImage = async (file, field) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (field === 'gallery') up('gallery_images', [...(form.gallery_images || []), file_url]);
      else up(field, file_url);
    } catch (e) { setError('فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setError('');
    const name = (form.restaurant_product_name || '').trim();
    if (!name) { setError('اسم الوجبة مطلوب'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('السعر مطلوب ويجب أن يكون موجبًا'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        restaurant_id: restaurant.id,
        price: Number(form.price),
        compare_at_price: num(form.compare_at_price),
        discount_amount: num(form.discount_amount),
        available_quantity: num(form.available_quantity),
        daily_capacity: num(form.daily_capacity),
        preparation_time_override: num(form.preparation_time_override),
        delivery_fee_override: num(form.delivery_fee_override),
        minimum_order_override: num(form.minimum_order_override),
        free_delivery_threshold_override: num(form.free_delivery_threshold_override),
        display_order: Number(form.display_order) || 0,
        meal_id: form.meal_id ? Number(form.meal_id) : null,
        mapping_confidence: num(form.mapping_confidence),
      };
      if (isEdit) await updateItem(item.id, payload);
      else await createItem(payload);
      onSave();
    } catch (e) { setError(e?.message || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!confirm('حذف هذه الوجبة من مينيو المطعم؟')) return;
    await deleteItem(item.id).catch(() => {});
    onSave();
  };

  const tamamProduct = form.meal_id ? { id: form.meal_id, name_ar: form.meal_name_snapshot, image_url: null } : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface/95 backdrop-blur p-4 border-b border-outline-variant/30 flex items-center justify-between z-10">
          <h2 className="font-bold">{isEdit ? 'تعديل وجبة المطعم' : 'إضافة وجبة لمينيو المطعم'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-5">
          {error && <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error flex items-center gap-2"><AlertCircle size={15} /> {error}</div>}

          {/* A. Basic */}
          <S title="أ. المعلومات الأساسية">
            <div className="grid grid-cols-2 gap-2">
              <I label="اسم الوجبة عند المطعم" value={form.restaurant_product_name} onChange={(v) => up('restaurant_product_name', v)} />
              <I label="الاسم بالإنجليزية" value={form.name_en} onChange={(v) => up('name_en', v)} />
              <I label="SKU" value={form.restaurant_sku} onChange={(v) => up('restaurant_sku', v)} />
              <I label="قسم المطعم" value={form.restaurant_category_name} onChange={(v) => up('restaurant_category_name', v)} />
              <I label="القسم الفرعي" value={form.restaurant_subcategory_name} onChange={(v) => up('restaurant_subcategory_name', v)} />
              <I label="اسم القائمة بالمينيو" value={form.menu_section_name} onChange={(v) => up('menu_section_name', v)} />
              <I label="ترتيب العرض" type="number" value={form.display_order} onChange={(v) => up('display_order', v)} />
              <I label="المينيو" type="select" value={form.restaurant_menu_id || ''} onChange={(v) => up('restaurant_menu_id', v)} options={[{ v: '', l: '— بدون —' }, ...(menus || []).map((m) => ({ v: m.id, l: m.name_ar || m.internal_name || m.id }))]} />
            </div>
            <div className="flex gap-3 mt-1">
              <Toggle label="فعّال" checked={form.active} onChange={(v) => up('active', v)} />
              <Toggle label="متوفر" checked={form.available} onChange={(v) => up('available', v)} />
              <Toggle label="نفد" checked={form.sold_out} onChange={(v) => up('sold_out', v)} />
            </div>
          </S>

          {/* B. Images */}
          <S title="ب. الصور">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-high flex items-center justify-center">
                {form.primary_image ? <img src={form.primary_image} alt="" className="w-full h-full object-cover" /> : <Icon name="image" className="text-on-surface-variant" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <I label="رابط الصورة الرئيسية" value={form.primary_image} onChange={(v) => up('primary_image', v)} />
                <label className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg cursor-pointer">
                  <Upload size={13} /> رفع صورة
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'primary_image')} />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.gallery_images || []).map((g, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-container-high">
                  <img src={g} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => up('gallery_images', form.gallery_images.filter((_, j) => j !== i))} className="absolute top-0.5 left-0.5 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-outline-variant/40 flex items-center justify-center cursor-pointer">
                <Upload size={16} className="text-on-surface-variant" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0], 'gallery')} />
              </label>
            </div>
            {uploading && <p className="text-xs text-on-surface-variant">عم يرفع الصورة...</p>}
            <p className="text-[11px] text-on-surface-variant">لا تشترط أبعادًا موحّدة. يُفضّل JPG/PNG/WebP.</p>
          </S>

          {/* C. Description */}
          <S title="ج. الوصف والمكونات">
            <I label="وصف قصير" value={form.customer_visible_description} onChange={(v) => up('customer_visible_description', v)} />
            <I label="وصف كامل" value={form.full_description_ar} onChange={(v) => up('full_description_ar', v)} ta />
            <I label="المكونات" value={form.ingredients_ar} onChange={(v) => up('ingredients_ar', v)} ta />
            <I label="العناصر المشمولة" value={form.included_items} onChange={(v) => up('included_items', v)} />
            <div className="grid grid-cols-2 gap-2">
              <I label="المسببات" value={form.allergens_ar} onChange={(v) => up('allergens_ar', v)} />
              <I label="حجم الحصة" value={form.portion_description_ar} onChange={(v) => up('portion_description_ar', v)} />
            </div>
            <I label="التغليف" value={form.packaging_description_ar} onChange={(v) => up('packaging_description_ar', v)} />
          </S>

          {/* D. Price */}
          <S title="د. السعر">
            <div className="grid grid-cols-3 gap-2">
              <I label="السعر ₪" type="number" value={form.price} onChange={(v) => up('price', v)} />
              <I label="قارن مع ₪" type="number" value={form.compare_at_price} onChange={(v) => up('compare_at_price', v)} />
              <I label="خصم ₪" type="number" value={form.discount_amount} onChange={(v) => up('discount_amount', v)} />
            </div>
            <div className="flex gap-3">
              <Toggle label="السعر شامل الضريبة" checked={form.tax_included} onChange={(v) => up('tax_included', v)} />
            </div>
            <p className="text-[11px] text-error">هذا سعر المطعم الحقيقي. لا يُستخدم سعر TAMAM التسويقي للدفع أبدًا.</p>
          </S>

          {/* E. Availability */}
          <S title="هـ. التوفر">
            <div className="grid grid-cols-3 gap-2">
              <I label="الكمية اليومية" type="number" value={form.daily_capacity} onChange={(v) => up('daily_quantity', v)} />
              <I label="الكمية المتاحة" type="number" value={form.available_quantity} onChange={(v) => up('available_quantity', v)} />
              <I label="من الساعة" value={form.available_from_time} onChange={(v) => up('available_from_time', v)} />
              <I label="إلى الساعة" value={form.available_until_time} onChange={(v) => up('available_until_time', v)} />
            </div>
          </S>

          {/* F. Fulfillment */}
          <S title="و. التجهيز والتوصيل">
            <div className="grid grid-cols-2 gap-2">
              <I label="تجهيز (د)" type="number" value={form.preparation_time_override} onChange={(v) => up('preparation_time_override', v)} />
              <I label="رسوم توصيل مغايرة ₪" type="number" value={form.delivery_fee_override} onChange={(v) => up('delivery_fee_override', v)} />
              <I label="أدنى طلب مغاير ₪" type="number" value={form.minimum_order_override} onChange={(v) => up('minimum_order_override', v)} />
              <I label="حد توصيل مجاني مغاير ₪" type="number" value={form.free_delivery_threshold_override} onChange={(v) => up('free_delivery_threshold_override', v)} />
            </div>
          </S>

          {/* G. TAMAM Mapping */}
          <S title="ز. ربط الوجبة بالمينيو الرئيسي لـ TAMAM">
            <div className="relative">
              <I label="ابحث عن منتج TAMAM (بالاسم/القسم/المينيو)" value={searchQ} onChange={(v) => runSearch(v)} icon={<Search size={14} />} />
              {searching && <p className="text-xs text-on-surface-variant mt-1">عم نبحث...</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto border border-outline-variant/30 rounded-xl p-2 bg-surface-container-low">
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => selectTamam(p)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-high text-right">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                        {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name_ar || p.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{p.category_name} · {p.restaurant_name} · ₪{p.price}</p>
                      </div>
                      <Link2 size={14} className="text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {suggestions.length > 0 && !form.meal_id && (
              <div className="mt-2">
                <p className="text-[11px] text-on-surface-variant mb-1">اقتراحات (تأكيد المطلوب):</p>
                <div className="space-y-1">
                  {suggestions.map((s) => (
                    <button key={s.product.id} onClick={() => selectTamam(s.product, s.confidence)} className="w-full flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded-lg text-xs">
                      <span>{s.product.name_ar || s.product.name}</span>
                      <span className="font-bold text-blue-700">{s.confidence}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.meal_id ? (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-green-700 flex items-center gap-1"><Check size={14} /> مربوط بـ: {form.meal_name_snapshot} (#{form.meal_id})</span>
                  <button onClick={clearMapping} className="text-xs text-red-500 flex items-center gap-1"><Unlink size={12} /> إلغاء الربط</button>
                </div>
                <p className="text-[11px] text-green-600 mt-1">هذه الوجبة ستظهر كخيار مطعم للمنتج: {form.meal_name_snapshot}</p>
              </div>
            ) : (
              <p className="text-[11px] text-orange-600 mt-1 flex items-center gap-1"><AlertCircle size={12} /> غير مربوط — لن يكون قابلاً للشراء حتى يتم الربط.</p>
            )}

            <div className="flex gap-1.5 mt-2 flex-wrap">
              {Object.entries(MAPPING_STATUS).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)} className={`text-[11px] px-2 py-1 rounded-full font-bold ${form.mapping_status === k ? 'ring-2 ring-primary ' + v.cls : v.cls}`}>{v.label}</button>
              ))}
            </div>
          </S>

          {/* Side-by-side preview (Part 14) */}
          <S title="معاينة قبل/بعد اختيار المطعم">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container-low rounded-xl p-2 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant mb-1">يظهر قبل اختيار المطعم — TAMAM</p>
                <div className="w-full aspect-square rounded-lg bg-surface-container-high flex items-center justify-center mb-1">
                  {tamamProduct?.image_url ? <img src={tamamProduct.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="text-2xl">🍱</span>}
                </div>
                <p className="text-xs font-bold">{tamamProduct?.name_ar || 'منتج TAMAM (بعد الربط)'}</p>
                <p className="text-[10px] text-on-surface-variant">صورة وعنوان وسعر تسويقي</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-2 border border-outline-variant/20">
                <p className="text-[10px] font-bold text-on-surface-variant mb-1">يظهر بعد اختيار المطعم — {restaurant.name_ar || restaurant.name}</p>
                <div className="w-full aspect-square rounded-lg bg-surface-container-high flex items-center justify-center mb-1 overflow-hidden">
                  {form.primary_image ? <img src={form.primary_image} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="text-2xl">🍔</span>}
                </div>
                <p className="text-xs font-bold">{form.restaurant_product_name || 'اسم الوجبة'}</p>
                <p className="text-[10px] text-on-surface-variant">{form.price ? `₪${form.price}` : 'السعر غير متوفر'}</p>
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> البيانات على اليمين لا تغيّر بيانات TAMAM الرئيسية.</p>
          </S>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-surface pb-4">
            <button onClick={save} disabled={saving} className="flex-1 bg-primary text-on-primary h-12 rounded-full font-bold disabled:opacity-50">{saving ? '...' : 'حفظ'}</button>
            {isEdit && <button onClick={remove} className="px-4 bg-error/10 text-error rounded-full font-bold text-sm">حذف</button>}
          </div>
        </div>
      </div>
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:10px;padding:8px 10px;font-size:13px;color:inherit;outline:none}`}</style>
    </div>
  );
}

function S({ title, children }) {
  return <div className="border border-outline-variant/20 rounded-2xl p-3 space-y-2"><p className="font-bold text-xs text-on-surface-variant">{title}</p>{children}</div>;
}
function I({ label, value, onChange, type, ta, icon, options }) {
  return (
    <label className="block">
      <span className="text-[11px] text-on-surface-variant block mb-0.5">{label}</span>
      <div className="relative">
        {icon && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>}
        {type === 'select' ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className="inp">
            {(options || []).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ) : type === 'number' ? (
          <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="inp" />
        ) : ta ? (
          <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={2} className="inp resize-none" />
        ) : (
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="inp" />
        )}
      </div>
    </label>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-1.5 text-xs">
      <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-surface-container-highest'}`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${checked ? '-translate-x-4' : ''}`} />
      </span>
      {label}
    </button>
  );
}