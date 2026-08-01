import { useState, useEffect } from 'react';
import { saveSection, replaceSectionItems, listSectionItems, autoRankMostOrdered } from '@/lib/homepageApi';
import RestaurantSelector from '@/components/admin/deals/RestaurantSelector';
import MealSelector from '@/components/admin/homepage/selectors/MealSelector';
import SuggestionSelector from '@/components/admin/homepage/selectors/SuggestionSelector';
import GroupDealSelector from '@/components/admin/homepage/selectors/GroupDealSelector';
import FoodCategorySelector from '@/components/admin/homepage/selectors/FoodCategorySelector';
import MediaSelector from '@/components/admin/homepage/selectors/MediaSelector';
import InternalRouteSelector, { resolveRoute } from '@/components/admin/homepage/selectors/InternalRouteSelector';
import { base44 } from '@/api/base44Client';
import { SECTION_LABELS } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const pjson = (s, f = {}) => { try { return JSON.parse(s) || f; } catch { return f; } };

const TRUST_ITEMS = [
  { key: 'visa', label: 'فيزا' }, { key: 'googlepay', label: 'Google Pay' }, { key: 'paypal', label: 'PayPal (غير متاح)' },
  { key: 'cash', label: 'الدفع عند الاستلام' }, { key: 'secure', label: 'دفع آمن' }, { key: 'tracking', label: 'تتبع الطلب' },
  { key: 'restaurant_contact', label: 'تواصل مع المطعم' }, { key: 'courier_contact', label: 'تواصل مع المندوب' },
  { key: 'support', label: 'دعم TAMAM' }, { key: 'points', label: 'نقاط' }, { key: 'coupons', label: 'كوبونات' },
];

const REPORT_PERIODS = [{ d: 7, l: '7 أيام' }, { d: 30, l: '30 يوم' }, { d: 90, l: '90 يوم' }, { d: 365, l: 'كل الوقت' }];

export default function SectionEditor({ section, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...section, settings_json: section.settings_json || '' }));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const settings = pjson(form.settings_json, {});
  const setSettings = (patch) => setForm((f) => ({ ...f, settings_json: JSON.stringify({ ...pjson(f.settings_json, {}), ...patch }) }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!section.id) { setLoading(false); return; }
    listSectionItems(section.id).then((list) => { setItems(list || []); }).finally(() => setLoading(false));
  }, [section.id]);

  const itemType = form.section_type;

  // helpers for items
  const itemIds = (type) => items.filter((it) => it.item_type === type).map((it) => it.meal_id || it.restaurant_id || it.suggestion_id || it.deal_id || it.category_id || it.media_id || it.route_key || it.id);
  const buildItem = (type, id, extra = {}) => ({ item_type: type, [type === 'meal' ? 'meal_id' : type === 'restaurant' ? 'restaurant_id' : type === 'suggestion' ? 'suggestion_id' : type === 'deal' ? 'deal_id' : type === 'category' ? 'category_id' : type === 'media' ? 'media_id' : 'route_key']: id, display_order: items.length, enabled: true, ...extra });

  const save = async () => {
    setSaving(true);
    try {
      const sectionData = { ...form, settings_json: form.settings_json || '' };
      const saved = form.id ? await saveSection(sectionData) : await saveSection({ ...sectionData, display_order: form.display_order || 100 });
      const sid = saved.id;
      // Build items to persist based on type
      let toSave = [];
      if (itemType === 'hero' || itemType === 'promo_banner' || itemType === 'editorial_banner') {
        if (settings.media_id) toSave.push({ item_type: 'media', media_id: settings.media_id, display_order: 0, enabled: true });
        if (itemType === 'hero') {
          const sugg = items.filter((it) => it.item_type === 'suggestion').map((it, i) => ({ item_type: 'suggestion', suggestion_id: it.suggestion_id, display_order: i, enabled: true }));
          toSave = [...toSave, ...sugg];
        }
      } else if (itemType === 'most_ordered' || itemType === 'popular_meals') {
        if (form.selection_mode === 'manual') {
          toSave = items.filter((it) => it.item_type === 'meal').map((it, i) => ({ item_type: 'meal', meal_id: it.meal_id, restaurant_id: it.restaurant_id, display_order: i, enabled: true }));
          if (itemType === 'popular_meals') {
            const cats = items.filter((it) => it.item_type === 'category').map((it, i) => ({ item_type: 'category', category_id: it.category_id, display_order: items.filter((x) => x.item_type === 'meal').length + i, enabled: true }));
            toSave = [...toSave, ...cats];
          }
        }
      } else if (itemType === 'popular_categories') {
        toSave = items.filter((it) => it.item_type === 'category').map((it, i) => ({ item_type: 'category', category_id: it.category_id, display_order: i, enabled: true }));
      } else if (itemType === 'featured_restaurants') {
        if (form.selection_mode === 'manual') toSave = items.filter((it) => it.item_type === 'restaurant').map((it, i) => ({ item_type: 'restaurant', restaurant_id: it.restaurant_id, display_order: i, enabled: true }));
      } else if (itemType === 'suggestions' || itemType === 'recommended_suggestions' || itemType === 'mix_plus_ideas') {
        toSave = items.filter((it) => it.item_type === 'suggestion').map((it, i) => ({ item_type: 'suggestion', suggestion_id: it.suggestion_id, display_order: i, enabled: true }));
      } else if (itemType === 'active_deal' || itemType === 'upcoming_deal') {
        if (form.selection_mode === 'manual') toSave = items.filter((it) => it.item_type === 'deal').map((it, i) => ({ item_type: 'deal', deal_id: it.deal_id, display_order: i, enabled: true }));
      } else if (['tamam_picks', 'family_meals', 'quick_meals', 'home_style_meals', 'new_meals', 'desserts_snacks', 'lunch_meals', 'complete_order', 'time_now'].includes(itemType)) {
        if (form.selection_mode === 'manual') {
          toSave = items.filter((it) => it.item_type === 'meal').map((it, i) => ({ item_type: 'meal', meal_id: it.meal_id, restaurant_id: it.restaurant_id, display_order: i, enabled: true }));
        }
      } else if (itemType === 'budget_meals') {
        // config stored entirely in settings_json
      } else if (itemType === 'trust_payments' || itemType === 'tracking_trust') {
        toSave = items.filter((it) => it.item_type === 'trust_item').map((it, i) => ({ item_type: 'trust_item', category_id: it.category_id, display_order: i, enabled: true }));
      }
      await replaceSectionItems(sid, toSave);
      onSaved();
    } catch (e) { console.error(e); alert('خطأ بالحفظ: ' + e.message); }
    finally { setSaving(false); }
  };

  // Automatic preview for most_ordered
  const previewAuto = async () => {
    const days = settings.report_days || 30;
    const limit = form.max_items || 8;
    const res = await autoRankMostOrdered(days, limit);
    setPreview(res);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-surface w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-outline-variant/20 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-base">{SECTION_LABELS[itemType] || section.section_key}</h3>
          <button onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="p-4 space-y-5">
          {loading ? <p className="text-sm text-center py-8">عم نحمّل...</p> : (
            <>
              {/* Common fields */}
              <CommonFields form={form} set={set} />

              {/* Type-specific editor */}
              {renderTypeEditor(itemType, { form, set, settings, setSettings, items, setItems, itemIds, buildItem, preview, previewAuto })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-outline-variant/20 px-4 py-3 flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 bg-surface-high rounded-xl font-bold text-sm">إلغاء</button>
          <button onClick={save} disabled={saving} className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-bold text-sm disabled:opacity-50">{saving ? 'عم نحفظ...' : 'حفظ كمسودة'}</button>
        </div>
      </div>
    </div>
  );
}

function CommonFields({ form, set }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1"><label className="text-[11px] text-on-surface-variant block mb-1">عنوان القسم</label><input value={form.title || ''} onChange={(e) => set('title', e.target.value)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
        <div className="w-24"><label className="text-[11px] text-on-surface-variant block mb-1">الترتيب</label><input type="number" value={form.display_order || 0} onChange={(e) => set('display_order', Number(e.target.value))} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      </div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">نص مساعد</label><input value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-on-surface-variant block mb-1">بداية العرض</label><input type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ''} onChange={(e) => set('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
        <div><label className="text-[11px] text-on-surface-variant block mb-1">نهاية العرض</label><input type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ''} onChange={(e) => set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-on-surface-variant block mb-1">الجمهور</label><select value={form.audience || 'all'} onChange={(e) => set('audience', e.target.value)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30"><option value="all">الجميع</option><option value="logged_in">المسجلون فقط</option><option value="guests">الزوار فقط</option></select></div>
        <div><label className="text-[11px] text-on-surface-variant block mb-1">أقصى عدد عناصر</label><input type="number" value={form.max_items || 8} onChange={(e) => set('max_items', Number(e.target.value))} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      </div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">فلتر المنطقة/المدينة</label><input value={form.location_filter || ''} onChange={(e) => set('location_filter', e.target.value)} placeholder="اتركه فارغ للكل" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-on-surface-variant block mb-1">نص زر عرض الكل</label><input value={form.view_all_label || ''} onChange={(e) => set('view_all_label', e.target.value)} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
        <div><label className="text-[11px] text-on-surface-variant block mb-1">وجهة زر عرض الكل</label><input value={form.view_all_route || ''} onChange={(e) => set('view_all_route', e.target.value)} placeholder="/restaurants" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" dir="ltr" /></div>
      </div>
    </div>
  );
}

function renderTypeEditor(type, ctx) {
  const { form, set, settings, setSettings, items, setItems, itemIds, buildItem, preview, previewAuto } = ctx;
  const modeToggle = (
    <div className="flex gap-2">
      {[['automatic', 'اختيار تلقائي'], ['manual', 'اختيار يدوي']].map(([k, l]) => (
        <button key={k} onClick={() => set('selection_mode', k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${form.selection_mode === k ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
      ))}
    </div>
  );

  switch (type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نوع البانر</label><select value={settings.media_kind || 'image'} onChange={(e) => setSettings({ media_kind: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30"><option value="image">صورة</option><option value="video">فيديو</option><option value="image_text">صورة مع نص</option><option value="video_text">فيديو مع نص</option></select></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">{settings.media_kind?.includes('video') ? 'ملف الفيديو' : 'الصورة'}</label><MediaSelector value={settings.media_id || ''} onChange={(id) => setSettings({ media_id: id })} mediaType={settings.media_kind?.includes('video') ? 'video' : 'image'} /></div>
          {settings.media_kind?.includes('video') && <div><label className="text-[11px] text-on-surface-variant block mb-1">صورة الغلاف (Poster)</label><MediaSelector value={settings.poster_media_id || ''} onChange={(id) => setSettings({ poster_media_id: id })} mediaType="image" /></div>}
          <div><label className="text-[11px] text-on-surface-variant block mb-1">عنوان رئيسي</label><input value={settings.headline || ''} onChange={(e) => setSettings({ headline: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص مساعد</label><input value={settings.supporting_text || ''} onChange={(e) => setSettings({ supporting_text: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص زر الإجراء</label><input value={settings.cta_label || ''} onChange={(e) => setSettings({ cta_label: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">وجهة زر الإجراء</label><InternalRouteSelector routeKey={settings.cta_route_key || ''} routeParams={settings.cta_route_params || {}} onChange={(r) => setSettings({ cta_route_key: r.routeKey, cta_route_params: r.routeParams })} /></div>
          {settings.media_kind?.includes('video') && (
            <div className="flex flex-wrap gap-2">
              {[['muted', 'كتم الصوت'], ['loop', 'تكرار'], ['controls', 'إظهار أزرار التحكم'], ['autoplay', 'تشغيل تلقائي']].map(([k, l]) => (
                <button key={k} onClick={() => setSettings({ [k]: !settings[k] })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings[k] ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
              ))}
            </div>
          )}
          <div><label className="text-[11px] text-on-surface-variant block mb-1">قوة التعتيم (0-100)</label><input type="number" min="0" max="100" value={settings.overlay_strength ?? 40} onChange={(e) => setSettings({ overlay_strength: Number(e.target.value) })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div className="border-t border-outline-variant/20 pt-3 mt-3 space-y-3">
            <p className="text-xs font-bold">كاروسيل اقتراحات الهوم</p>
            <p className="text-[10px] text-on-surface-variant">اختر اقتراحات تظهر كشرائح تلقائية بالبانر. تُعرض أولًا، ثم تُكمّل تلقائيًا بواحد من كل باقة (كلاسيك/ميكس/بلس).</p>
            <div><label className="text-[11px] text-on-surface-variant block mb-2">اقتراحات مختارة للكاروسيل</label><SuggestionSelector selectedIds={itemIds('suggestion')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'suggestion'), ...ids.map((id) => ({ item_type: 'suggestion', suggestion_id: id, display_order: 0, enabled: true }))])} /></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSettings({ hero_autoplay: settings.hero_autoplay === false })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings.hero_autoplay !== false ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>تشغيل تلقائي</button>
              <button onClick={() => setSettings({ hero_show_badge: settings.hero_show_badge === false })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings.hero_show_badge !== false ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>إظهار شارة الباقة</button>
              <button onClick={() => setSettings({ hero_show_price: settings.hero_show_price === false })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings.hero_show_price !== false ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>إظهار السعر</button>
            </div>
            <div><label className="text-[11px] text-on-surface-variant block mb-1">فاصل التبديل (مللي ثانية)</label><input type="number" value={settings.hero_interval || 5000} onChange={(e) => setSettings({ hero_interval: Number(e.target.value) })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" dir="ltr" /></div>
            <div><label className="text-[11px] text-on-surface-variant block mb-1">نص زر الشريحة</label><input value={settings.hero_cta_label || ''} onChange={(e) => setSettings({ hero_cta_label: e.target.value })} placeholder="شوف الاقتراح" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          </div>
        </div>
      );
    case 'active_order':
      return <div className="bg-surface-container rounded-xl p-3 text-sm text-on-surface-variant">هذا القسم يُعرض تلقائيًا بناءً على حالة الطلب النشط للزبون. لا يمكن تعيينه يدويًا. استخدم الإعدادات العامة (العنوان، الجدولة، الجمهور).</div>;
    case 'game_promo':
      return <div className="bg-surface-container rounded-xl p-3 text-sm text-on-surface-variant">يروّج للعبة TAMAM. وجهة الزر: /tamam-game (في حقل "وجهة زر عرض الكل" بالأعلى).</div>;
    case 'suggestions':
    case 'recommended_suggestions':
      return (
        <div className="space-y-3">
          <div><label className="text-[11px] text-on-surface-variant block mb-1">فلتر الحزمة (للعرض التلقائي)</label><select value={settings.package_filter || 'all'} onChange={(e) => setSettings({ package_filter: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30"><option value="all">كل الحزم</option><option value="classic">كلاسيك</option><option value="mix">ميكس</option><option value="plus">بلس</option></select></div>
          <div className="space-y-2">
            <label className="text-[11px] text-on-surface-variant block">صور الباقات (تظهر في كروت كلاسيك/ميكس/بلس بالصفحة الرئيسية)</label>
            {[['classic', 'كلاسيك'], ['mix', 'ميكس'], ['plus', 'بلس']].map(([k, l]) => (
              <div key={k}><label className="text-[10px] text-on-surface-variant block mb-0.5">{l}</label><MediaSelector value={settings[`package_image_${k}`] || ''} onChange={(id) => setSettings({ [`package_image_${k}`]: id })} /></div>
            ))}
          </div>
          <div><label className="text-[11px] text-on-surface-variant block mb-2">اقتراحات محددة (اختياري)</label><SuggestionSelector selectedIds={itemIds('suggestion')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'suggestion'), ...ids.map((id) => ({ item_type: 'suggestion', suggestion_id: id, display_order: 0, enabled: true }))])} /></div>
        </div>
      );
    case 'active_deal':
    case 'upcoming_deal':
      return (
        <div className="space-y-3">
          {modeToggle}
          {form.selection_mode === 'manual' && <GroupDealSelector selectedIds={itemIds('deal')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'deal'), ...ids.map((id) => ({ item_type: 'deal', deal_id: id, display_order: 0, enabled: true }))])} statusFilter={type === 'active_deal' ? 'active' : 'scheduled'} />}
        </div>
      );
    case 'most_ordered':
      return (
        <div className="space-y-3">
          {modeToggle}
          {form.selection_mode === 'automatic' ? (
            <div className="space-y-3">
              <div><label className="text-[11px] text-on-surface-variant block mb-1">فترة التقرير</label><select value={settings.report_days || 30} onChange={(e) => setSettings({ report_days: Number(e.target.value) })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30">{REPORT_PERIODS.map((p) => <option key={p.d} value={p.d}>{p.l}</option>)}</select></div>
              <button onClick={previewAuto} className="w-full h-10 bg-surface-high rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Icon name="preview" />معاينة الترتيب التلقائي</button>
              {preview && <div className="bg-surface-container rounded-xl p-2 space-y-1 max-h-40 overflow-y-auto">{preview.length ? preview.map((m, i) => <div key={i} className="flex justify-between text-xs p-1.5"><span>{i + 1}. {m.name} · {m.restaurant?.name_ar || m.restaurant?.name}</span><span className="text-on-surface-variant">{m.count} طلب</span></div>) : <p className="text-xs text-center text-on-surface-variant p-2">لا توجد بيانات كافية</p>}</div>}
            </div>
          ) : (
            <ManualMealPicker items={items} setItems={setItems} itemIds={itemIds} />
          )}
        </div>
      );
    case 'popular_meals':
      return (
        <div className="space-y-3">
          {modeToggle}
          {form.selection_mode === 'manual' ? <ManualMealPicker items={items} setItems={setItems} itemIds={itemIds} /> : (
            <div><label className="text-[11px] text-on-surface-variant block mb-2">تصنيفات شعبية</label><FoodCategorySelector selectedIds={itemIds('category')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'category'), ...ids.map((id) => ({ item_type: 'category', category_id: id, display_order: 0, enabled: true }))])} /></div>
          )}
        </div>
      );
    case 'popular_categories':
      return <div><label className="text-[11px] text-on-surface-variant block mb-2">اختر التصنيفات</label><FoodCategorySelector selectedIds={itemIds('category')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'category'), ...ids.map((id) => ({ item_type: 'category', category_id: id, display_order: 0, enabled: true }))])} /></div>;
    case 'featured_restaurants':
      return (
        <div className="space-y-3">
          {modeToggle}
          {form.selection_mode === 'manual' && <RestaurantMultiPicker items={items} setItems={setItems} itemIds={itemIds} />}
        </div>
      );
    case 'trust_payments':
    case 'tracking_trust':
      return (
        <div className="space-y-2">
          <label className="text-[11px] text-on-surface-variant block">عناصر الثقة المفعّلة</label>
          <div className="flex flex-wrap gap-2">
            {TRUST_ITEMS.map((t) => {
              const active = itemIds('trust_item').includes(t.key);
              return (
                <button key={t.key} onClick={() => setItems((prev) => {
                  const others = prev.filter((it) => !(it.item_type === 'trust_item' && it.category_id === t.key));
                  return active ? others : [...others, { item_type: 'trust_item', category_id: t.key, display_order: 0, enabled: true }];
                })} className={`px-3 py-2 rounded-xl text-xs font-bold border ${active ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'} ${t.key === 'paypal' ? 'opacity-50' : ''}`}>{t.label}</button>
              );
            })}
          </div>
          {itemIds('trust_item').includes('paypal') && <p className="text-[11px] text-error bg-error/10 rounded-lg p-2">PayPal غير متاح حاليًا — لا تُظهره للزبون.</p>}
        </div>
      );
    case 'rewards':
      return (
        <div className="space-y-2">
          <label className="text-[11px] text-on-surface-variant block">إعدادات قسم النقاط</label>
          <div className="flex flex-wrap gap-2">
            {[['show_balance', 'عرض الرصيد'], ['show_pending', 'عرض النقاط المعلقة'], ['show_coupon_count', 'عدد الكوبونات'], ['show_progress', 'شريط التقدم للمكافأة']].map(([k, l]) => (
              <button key={k} onClick={() => setSettings({ [k]: !settings[k] })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings[k] ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
            ))}
          </div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص للزوار غير المسجلين</label><input value={settings.guest_text || ''} onChange={(e) => setSettings({ guest_text: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص للمسجلين</label><input value={settings.logged_in_text || ''} onChange={(e) => setSettings({ logged_in_text: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
        </div>
      );
    case 'support':
      return <div className="bg-surface-container rounded-xl p-3 text-sm text-on-surface-variant">قسم الدعم يعرض خيارات التواصل (واتساب، اتصال، مساعدة). الإعدادات العامة كافية.</div>;
    case 'promo_banner':
      return (
        <div className="space-y-3">
          <div><label className="text-[11px] text-on-surface-variant block mb-1">الوسائط</label><MediaSelector value={settings.media_id || ''} onChange={(id) => setSettings({ media_id: id })} /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">عنوان للزبون</label><input value={settings.headline || ''} onChange={(e) => setSettings({ headline: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص مساعد</label><input value={settings.supporting_text || ''} onChange={(e) => setSettings({ supporting_text: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نص الزر</label><input value={settings.cta_label || ''} onChange={(e) => setSettings({ cta_label: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
          <div><label className="text-[11px] text-on-surface-variant block mb-1">وجهة الزر</label><InternalRouteSelector routeKey={settings.cta_route_key || ''} routeParams={settings.cta_route_params || {}} onChange={(r) => setSettings({ cta_route_key: r.routeKey, cta_route_params: r.routeParams })} /></div>
        </div>
      );
    case 'editorial':
      return <div><label className="text-[11px] text-on-surface-variant block mb-1">محتوى تحريري</label><textarea value={settings.content || ''} onChange={(e) => setSettings({ content: e.target.value })} rows={4} className="w-full bg-surface-container rounded-xl p-3 text-sm outline-none border border-outline-variant/30 resize-none" /></div>;
    case 'tamam_picks':
    case 'family_meals':
    case 'quick_meals':
    case 'home_style_meals':
    case 'new_meals':
    case 'desserts_snacks':
    case 'lunch_meals':
    case 'complete_order':
      return <CuratedMealsEditor form={form} set={set} settings={settings} setSettings={setSettings} items={items} setItems={setItems} itemIds={itemIds} isTamamPicks={type === 'tamam_picks'} isLunch={type === 'lunch_meals'} />;
    case 'time_now':
      return <TimeNowEditor form={form} set={set} settings={settings} setSettings={setSettings} items={items} setItems={setItems} itemIds={itemIds} />;
    case 'mix_plus_ideas':
      return <MixPlusEditor form={form} set={set} settings={settings} setSettings={setSettings} items={items} setItems={setItems} itemIds={itemIds} />;
    case 'editorial_banner':
      return <EditorialBannerEditor form={form} set={set} settings={settings} setSettings={setSettings} />;
    case 'budget_meals':
      return <BudgetEditor settings={settings} setSettings={setSettings} />;
    default:
      return null;
  }
}

function ManualMealPicker({ items, setItems, itemIds }) {
  const [restaurant, setRestaurant] = useState(null);
  const selectedMeals = items.filter((it) => it.item_type === 'meal');
  const selectedIds = selectedMeals.map((it) => it.meal_id);

  return (
    <div className="space-y-3">
      <RestaurantSelector value={restaurant?.id || null} onChange={(r) => {
        if (restaurant && selectedMeals.some((it) => it.restaurant_id === restaurant.id) && r.id !== restaurant.id) {
          if (!confirm(`تغيير المطعم سيبقي الوجبات المختارة من "${restaurant.name_ar || restaurant.name}" مضافة. متابعة؟`)) return;
        }
        setRestaurant(r);
      }} />
      {restaurant && <MealSelector restaurantId={restaurant.id} selectedIds={selectedIds} onChange={(ids) => setItems((prev) => {
        const others = prev.filter((it) => !(it.item_type === 'meal' && it.restaurant_id === restaurant.id));
        const newMeals = ids.map((id) => ({ item_type: 'meal', meal_id: id, restaurant_id: restaurant.id, display_order: 0, enabled: true }));
        return [...prev.filter((it) => !(it.item_type === 'meal')), ...newMeals];
      })} />}
      {selectedMeals.length > 0 && (
        <div className="bg-surface-container rounded-xl p-2">
          <p className="text-[11px] text-on-surface-variant mb-1">{selectedMeals.length} وجبة مختارة:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedMeals.map((it, i) => <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-surface-high rounded-lg"><span>وجبة #{it.meal_id} · مطعم #{it.restaurant_id}</span><button onClick={() => setItems((prev) => prev.filter((x) => x !== it))} className="text-error"><Icon name="delete" className="text-base" /></button></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function RestaurantMultiPicker({ items, setItems, itemIds }) {
  const selected = items.filter((it) => it.item_type === 'restaurant');
  return (
    <div className="space-y-3">
      <RestaurantSelector value={null} onChange={(r) => {
        if (selected.some((it) => it.restaurant_id === r.id)) return;
        setItems((prev) => [...prev, { item_type: 'restaurant', restaurant_id: r.id, display_order: prev.length, enabled: true }]);
      }} />
      {selected.length > 0 && (
        <div className="bg-surface-container rounded-xl p-2 space-y-1">
          {selected.map((it, i) => (
            <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-surface-high rounded-lg">
              <span>مطعم #{it.restaurant_id}</span>
              <button onClick={() => setItems((prev) => prev.filter((x) => x !== it))} className="text-error"><Icon name="delete" className="text-base" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CuratedMealsEditor({ form, set, settings, setSettings, items, setItems, itemIds, isTamamPicks, isLunch }) {
  const autoMode = settings.auto_mode || 'manual';
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['automatic', 'اختيار تلقائي'], ['manual', 'اختيار يدوي']].map(([k, l]) => (
          <button key={k} onClick={() => set('selection_mode', k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${form.selection_mode === k ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
        ))}
      </div>
      {form.selection_mode === 'automatic' && (
        <div className="space-y-3">
          <div><label className="text-[11px] text-on-surface-variant block mb-1">نوع الاختيار التلقائي</label>
            <select value={autoMode} onChange={(e) => setSettings({ auto_mode: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30">
              <option value="category">حسب التصنيف</option>
              <option value="new">وجبات جديدة</option>
              <option value="random">تدوير عشوائي</option>
            </select>
          </div>
          {autoMode === 'category' && (
            <div><label className="text-[11px] text-on-surface-variant block mb-2">التصنيفات</label><FoodCategorySelector selectedIds={settings.category_names || []} onChange={(ids) => setSettings({ category_names: ids })} /></div>
          )}
          {autoMode === 'new' && (
            <div><label className="text-[11px] text-on-surface-variant block mb-1">آخر (أيام)</label>
              <select value={settings.new_days || 30} onChange={(e) => setSettings({ new_days: Number(e.target.value) })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30">
                <option value={7}>7 أيام</option><option value={30}>30 يوم</option><option value={60}>60 يوم</option>
              </select>
            </div>
          )}
          <div><label className="text-[11px] text-on-surface-variant block mb-1">شارة (اختياري)</label><input value={settings.badge || ''} onChange={(e) => setSettings({ badge: e.target.value })} placeholder="اختيار TAMAM / جديد" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
        </div>
      )}
      {form.selection_mode === 'manual' && <ManualMealPicker items={items} setItems={setItems} itemIds={itemIds} />}
      {form.selection_mode === 'manual' && items.filter((it) => it.item_type === 'meal').length > 0 && items.every((it) => it.item_type !== 'meal' || it.meal_id) && (
        <p className="text-[11px] text-amber-500 bg-amber-500/10 rounded-lg p-2">تأكد من توفّر كل الوجبات المختارة. إذا كانت كلها غير متاحة سيُخفى القسم.</p>
      )}
      {isLunch && (
        <div className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/30">
          <p className="text-xs font-bold">جدولة ساعات العرض (اختياري)</p>
          <div><label className="text-[10px] text-on-surface-variant block mb-0.5">ساعات نشاط القسم (HH:MM-HH:MM)</label><input value={settings.active_hours || ''} onChange={(e) => setSettings({ active_hours: e.target.value })} placeholder="10:30-16:30" dir="ltr" className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          <p className="text-[10px] text-on-surface-variant">اتركه فارغ لعرض القسم دائمًا. مثال: 10:30-16:30 يعرضه خلال ساعات الغدا فقط.</p>
        </div>
      )}
      {isTamamPicks && <MostOrderedThresholdEditor settings={settings} setSettings={setSettings} />}
    </div>
  );
}

function EditorialBannerEditor({ form, set, settings, setSettings }) {
  return (
    <div className="space-y-3">
      <div><label className="text-[11px] text-on-surface-variant block mb-1">نوع الوسائط</label><select value={settings.media_kind || 'image'} onChange={(e) => setSettings({ media_kind: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30"><option value="image">صورة</option><option value="video">فيديو</option></select></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">{settings.media_kind?.includes('video') ? 'ملف الفيديو' : 'الصورة'}</label><MediaSelector value={settings.media_id || ''} onChange={(id) => setSettings({ media_id: id })} mediaType={settings.media_kind?.includes('video') ? 'video' : 'image'} /></div>
      {settings.media_kind?.includes('video') && <div><label className="text-[11px] text-on-surface-variant block mb-1">صورة الغلاف (Poster)</label><MediaSelector value={settings.poster_media_id || ''} onChange={(id) => setSettings({ poster_media_id: id })} mediaType="image" /></div>}
      <div><label className="text-[11px] text-on-surface-variant block mb-1">نمط العرض</label><select value={settings.layout || 'large'} onChange={(e) => setSettings({ layout: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30"><option value="large">بانر كبير</option><option value="compact">بانر أفقي مصغر</option></select></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">عنوان رئيسي</label><input value={settings.headline || ''} onChange={(e) => setSettings({ headline: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">نص مساعد</label><input value={settings.subtitle || ''} onChange={(e) => setSettings({ subtitle: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">شارة (اختياري)</label><input value={settings.badge || ''} onChange={(e) => setSettings({ badge: e.target.value })} placeholder="مثال: جديد / عرض" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">نص الزر</label><input value={settings.cta_label || ''} onChange={(e) => setSettings({ cta_label: e.target.value })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-2">وجهة الزر (اختر مود لبانر آخر الليل)</label><InternalRouteSelector routeKey={settings.cta_route_key || ''} routeParams={settings.cta_route_params || {}} onChange={(r) => setSettings({ cta_route_key: r.routeKey, cta_route_params: r.routeParams })} /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">مود محدد (يغطي الوجهة أعلاه) — اكتب معرف المود</label><input value={settings.mood_id || ''} onChange={(e) => setSettings({ mood_id: e.target.value })} placeholder="اتركه فارغ لاستخدام الوجهة" dir="ltr" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
      <div><label className="text-[11px] text-on-surface-variant block mb-1">قوة التعتيم (0-100)</label><input type="number" min="0" max="100" value={settings.overlay_strength ?? 55} onChange={(e) => setSettings({ overlay_strength: Number(e.target.value) })} className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" /></div>
    </div>
  );
}

function MostOrderedThresholdEditor({ settings, setSettings }) {
  const th = settings.most_ordered_threshold || { enabled: false, min_orders: 100, period_days: 30, min_customers: 20 };
  const setTh = (patch) => setSettings({ most_ordered_threshold: { ...th, ...patch } });
  return (
    <div className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/30">
      <p className="text-xs font-bold">تفعيل «الأكثر طلبًا» عند توفّر بيانات كافية</p>
      <button onClick={() => setTh({ enabled: !th.enabled })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${th.enabled ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-high border-outline-variant/30'}`}>{th.enabled ? 'مفعّل' : 'غير مفعّل'}</button>
      {th.enabled && (
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-[10px] text-on-surface-variant block mb-0.5">أدنى عدد طلبات</label><input type="number" value={th.min_orders} onChange={(e) => setTh({ min_orders: Number(e.target.value) })} className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          <div><label className="text-[10px] text-on-surface-variant block mb-0.5">أدنى زبائن فريدين</label><input type="number" value={th.min_customers} onChange={(e) => setTh({ min_customers: Number(e.target.value) })} className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          <div><label className="text-[10px] text-on-surface-variant block mb-0.5">الفترة</label><select value={th.period_days} onChange={(e) => setTh({ period_days: Number(e.target.value) })} className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none"><option value={7}>7 أيام</option><option value={30}>30 يوم</option><option value={90}>90 يوم</option></select></div>
        </div>
      )}
      <p className="text-[10px] text-on-surface-variant">حتى الوصول للحد الأدنى، يظهر القسم كـ «اختيارات TAMAM».</p>
    </div>
  );
}

function BudgetEditor({ settings, setSettings }) {
  const ranges = settings.price_ranges || [];
  const update = (i, patch) => setSettings({ price_ranges: ranges.map((r, idx) => idx === i ? { ...r, ...patch } : r) });
  const add = () => setSettings({ price_ranges: [...ranges, { label: '', min: 0, max: null }] });
  const remove = (i) => setSettings({ price_ranges: ranges.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant">حدد نطاقات الأسعار. تُحمّل الوجبات حسب السعر الحقيقي عند تفاعل الزبون.</p>
      {ranges.map((r, i) => (
        <div key={i} className="bg-surface-container rounded-xl p-2 space-y-2 border border-outline-variant/30">
          <div><label className="text-[10px] text-on-surface-variant block mb-0.5">النص الظاهر</label><input value={r.label || ''} onChange={(e) => update(i, { label: e.target.value })} placeholder="لحد ₪40" className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-on-surface-variant block mb-0.5">أدنى سعر</label><input type="number" value={r.min ?? 0} onChange={(e) => update(i, { min: Number(e.target.value) })} className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
            <div><label className="text-[10px] text-on-surface-variant block mb-0.5">أقصى سعر (فارغ = مفتوح)</label><input type="number" value={r.max ?? ''} onChange={(e) => update(i, { max: e.target.value === '' ? null : Number(e.target.value) })} className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          </div>
          <button onClick={() => remove(i)} className="text-error text-xs flex items-center gap-1"><Icon name="delete" className="text-base" /> حذف النطاق</button>
        </div>
      ))}
      <button onClick={add} className="w-full h-10 bg-surface-high rounded-xl text-sm font-bold flex items-center justify-center gap-1"><Icon name="add" /> إضافة نطاق سعر</button>
    </div>
  );
}

function TimeNowEditor({ form, set, settings, setSettings, items, setItems, itemIds }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['automatic', 'تلقائي حسب الوقت'], ['manual', 'اختيار يدوي']].map(([k, l]) => (
          <button key={k} onClick={() => set('selection_mode', k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${form.selection_mode === k ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
        ))}
      </div>
      {form.selection_mode === 'manual' ? <ManualMealPicker items={items} setItems={setItems} itemIds={itemIds} /> : (
        <div className="space-y-3">
          <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/30">
            <p className="text-xs text-on-surface-variant">بدون تحديد تصنيفات، يختار القسم وجبات تلقائيًا حسب وقت اليوم (فطور / غدا / عشا / آخر الليل) حسب توقيت آسيا/القدس.</p>
          </div>
          <div><label className="text-[11px] text-on-surface-variant block mb-2">تصنيفات تتجاوز الاختيار الزمني (اختياري)</label><FoodCategorySelector selectedIds={settings.category_names || []} onChange={(ids) => setSettings({ category_names: ids })} /></div>
          <div className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/30">
            <p className="text-xs font-bold">ساعات العرض (اختياري)</p>
            <div><label className="text-[10px] text-on-surface-variant block mb-0.5">ساعات النشاط (HH:MM-HH:MM)</label><input value={settings.active_hours || ''} onChange={(e) => setSettings({ active_hours: e.target.value })} placeholder="اتركه فارغ دائمًا" dir="ltr" className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MixPlusEditor({ form, set, settings, setSettings, items, setItems, itemIds }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['automatic', 'تلقائي (ميكس+بلس)'], ['manual', 'اختيار يدوي']].map(([k, l]) => (
          <button key={k} onClick={() => set('selection_mode', k)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${form.selection_mode === k ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSettings({ include_classic: !settings.include_classic })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings.include_classic ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>تضمين كلاسيك</button>
        <button onClick={() => setSettings({ include_group_deals: !settings.include_group_deals })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${settings.include_group_deals ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container border-outline-variant/30'}`}>تضمين عروض جماعية مميزة</button>
      </div>
      {form.selection_mode === 'manual' && <div><label className="text-[11px] text-on-surface-variant block mb-2">اقتراحات محددة</label><SuggestionSelector selectedIds={itemIds('suggestion')} onChange={(ids) => setItems((prev) => [...prev.filter((it) => it.item_type !== 'suggestion'), ...ids.map((id) => ({ item_type: 'suggestion', suggestion_id: id, display_order: 0, enabled: true }))])} /></div>}
      <div className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/30">
        <p className="text-xs font-bold">ساعات العرض (اختياري)</p>
        <div><label className="text-[10px] text-on-surface-variant block mb-0.5">ساعات النشاط (HH:MM-HH:MM)</label><input value={settings.active_hours || ''} onChange={(e) => setSettings({ active_hours: e.target.value })} placeholder="اتركه فارغ دائمًا" dir="ltr" className="w-full bg-surface-high rounded-lg p-2 text-sm outline-none" /></div>
      </div>
    </div>
  );
}