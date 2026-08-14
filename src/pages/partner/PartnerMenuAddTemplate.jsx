import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { listMenuTemplates, getMenuTemplate, createMenuSession } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';

const SOURCE_LABEL = { tamam_generic: 'نموذج عام من تمام', own_organization: 'من مؤسستك', licensed_partner: 'نموذج مرخّص', reference_only: 'للمراجعة فقط' };

/** TAMAM Menu Templates browser — templates are reusable collections of catalog products. */
export default function PartnerMenuAddTemplate() {
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(null);

  useEffect(() => {
    listMenuTemplates().then(setTemplates).catch(() => setTemplates([])).finally(() => setLoading(false));
  }, []);

  const applyTemplate = async (t) => {
    if (using || !rid) return;
    setUsing(t.id);
    try {
      const { items } = await getMenuTemplate(t.id);
      const selected = items.filter((i) => i.tamam_master_catalog_product_id).map((i) => ({
        id: i.tamam_master_catalog_product_id, name_ar: i.generic_name_ar, description: i.generic_description_ar,
        category_name: i.default_category_name, image_url: i.approved_image_url,
      }));
      const { session_id } = await createMenuSession(rid, { source_type: 'menu_template', source_template_id: t.id });
      navigate('/partner/menu/add/review', { state: { session_id, source_type: 'menu_template', selected } });
    } catch { setUsing(null); }
  };

  return (
    <div className="pb-6" dir="rtl">
      <div className="sticky top-0 z-20 bg-tamam-bg/95 backdrop-blur-xl border-b border-tamam-outline/20 px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-xl bg-tamam-surface"><span className="material-symbols-outlined text-tamam-text text-[22px]">arrow_forward</span></button>
        <div className="flex-1"><h1 className="font-bold text-sm text-tamam-text">نماذج المنيو</h1><p className="text-[10px] text-tamam-text-muted">ابدأ من نموذج جاهز وعدّله لمطعمك.</p></div>
      </div>
      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
        ) : templates.length === 0 ? (
          <EmptyState icon="📝" title="ما في نماذج متاحة بعد" subtitle="فريق تمام بنشئ نماذج جاهزة (شاورما، برجر، فطور…) قريبًا. هلق تقدر تختار أصنافك من الكتالوج مباشرة." actionLabel="اختار من الكتالوج" onAction={() => navigate('/partner/menu/add/catalog')} />
        ) : (
          templates.map((t) => (
            <div key={t.id} className="bg-tamam-surface-low rounded-2xl border border-tamam-outline/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-tamam-text">{t.name_ar}</p>
                  <p className="text-[11px] text-tamam-text-muted line-clamp-2 leading-snug mt-0.5">{t.description_ar || t.restaurant_type || ''}</p>
                </div>
                <span className="text-[9px] bg-tamam-surface-high text-tamam-text-muted px-2 py-1 rounded-full shrink-0">{t.item_count || 0} صنف</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-tamam-text-muted">
                <span className="material-symbols-outlined text-[13px]">info</span>
                <span>{SOURCE_LABEL[t.source_type] || 'نموذج'}</span>
              </div>
              <button onClick={() => applyTemplate(t)} disabled={using === t.id} className="w-full mt-2.5 h-11 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm active:scale-95 transition-transform">{using === t.id ? 'جاري…' : 'استخدم هذا النموذج'}</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}