import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getMenuItem, updateMenuItem } from '@/lib/partnerApi';
import PartnerErrorState from '@/components/partner/PartnerErrorState';
import MenuItemForm from '@/components/partner/MenuItemForm';
import Toggle from '@/components/partner/Toggle';

export default function PartnerMenuItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    if (!rid || !itemId) return;
    setLoading(true); setError(false);
    getMenuItem(rid, itemId).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [rid, itemId]);

  if (loading) return <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 skeleton-t rounded-2xl" />)}</div>;
  if (error) return <PartnerErrorState variant="error" onRetry={load} onBack={() => navigate('/partner/menu')} />;
  if (!data?.item) return <PartnerErrorState variant="not_found" onBack={() => navigate('/partner/menu')} />;

  if (editing) {
    return (
      <div className="px-4 py-4 pb-28 space-y-4">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-tamam-text-muted text-sm"><span className="material-symbols-outlined">chevron_right</span> عرض الوجبة</button>
        <MenuItemForm restaurantId={rid} item={data.item} guardrail={data.guardrail} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  const { item, linked_offer, guardrail } = data;
  const ingredients = (item.ingredients_ar || '').split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const toggleAvailable = async () => {
    setToggling(true);
    try { await updateMenuItem(rid, itemId, { available: !item.available }); load(); } catch {} finally { setToggling(false); }
  };

  return (
    <div className="pb-28">
      <div className="relative h-52 bg-tamam-surface">
        {item.primary_image ? <img src={item.primary_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text-muted opacity-40 text-[48px]">image</span></div>}
        <button onClick={() => navigate('/partner/menu')} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-tamam-bg/70 backdrop-blur flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text">chevron_right</span></button>
        <button onClick={() => setEditing(true)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-tamam-bg/70 backdrop-blur flex items-center justify-center"><span className="material-symbols-outlined text-tamam-text">edit</span></button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <h1 className="font-bold text-xl text-tamam-text">{item.restaurant_product_name || item.name_ar || 'صنف'}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.restaurant_category_name && <span className="text-[11px] bg-tamam-surface text-tamam-text-muted px-2 py-0.5 rounded-full">{item.restaurant_category_name}</span>}
            {item.restaurant_sku && <span className="text-[11px] text-tamam-text-muted">SKU: {item.restaurant_sku}</span>}
          </div>
        </div>

        {item.short_description_ar && <p className="text-tamam-text-muted text-sm leading-relaxed">{item.short_description_ar}</p>}

        <div className="flex items-center justify-between bg-tamam-surface rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${item.available ? 'text-tamam-green-bright' : 'text-tamam-text-muted'}`}>{item.available ? 'check_circle' : 'cancel'}</span>
            <span className="text-sm font-medium text-tamam-text">متوفر للطلب</span>
          </div>
          <Toggle checked={!!item.available} onChange={toggleAvailable} disabled={toggling} />
        </div>

        <Card icon="payments" title="بيانات البيع الأساسية">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-2xl text-tamam-text">{item.price != null ? item.price : '—'}</span>
            <span className="text-tamam-text-muted text-xs">₪</span>
          </div>
          <p className="text-[11px] text-tamam-text-muted mt-1">السعر العادي في قائمة المطعم.</p>
        </Card>

        <Card icon="tune" title="حدود TAMAM التجارية">
          <div className="grid grid-cols-2 gap-2">
            <Mini label="أدنى سعر عرض للزبون" value={guardrail?.minimum_customer_offer_price} />
            <Mini label="الحد الأدنى للصافي للمطعم" value={guardrail?.minimum_restaurant_net} />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {guardrail?.pickup_allowed !== false && <Tag>استلام</Tag>}
            {guardrail?.delivery_allowed !== false && <Tag>توصيل</Tag>}
            {!guardrail && <p className="text-[11px] text-tamam-text-muted">ما في حدود محددة لهذه الوجبة بعد.</p>}
          </div>
          <button onClick={() => navigate('/partner/guardrails')} className="text-tamam-green-bright text-xs font-bold mt-3 flex items-center gap-1">اطلب تعديل الحدود <span className="material-symbols-outlined text-[16px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span></button>
        </Card>

        <Card icon="inventory_2" title="تفاصيل التشغيل">
          <Row label="وقت التحضير" value={item.preparation_time_override ? `${item.preparation_time_override} دقيقة` : 'حسب الإعداد العام'} />
          <Row label="الكمية المتوفرة" value={item.available_quantity != null ? item.available_quantity : 'غير محدد'} />
          {ingredients.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] text-tamam-text-muted mb-1">المكونات</p>
              <div className="flex flex-wrap gap-1.5">{ingredients.map((ing, i) => <span key={i} className="text-[11px] bg-tamam-surface-low text-tamam-text px-2 py-1 rounded">{ing}</span>)}</div>
            </div>
          )}
        </Card>

        {linked_offer && (
          <div className="bg-tamam-green/10 rounded-2xl p-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tamam-green-bright">spark</span>
            <p className="text-sm text-tamam-text">هاي الوجبة داخلة بعرض شغّال: <span className="font-bold">{linked_offer.title}</span></p>
          </div>
        )}

        {item.mapping_status === 'unmapped' && (
          <p className="text-[11px] text-tamam-gold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">info</span>TAMAM راح تراجع ربطها.</p>
        )}

        <button onClick={() => setEditing(true)} className="w-full bg-tamam-surface-high text-tamam-text py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95">
          <span className="material-symbols-outlined text-[20px]">edit</span>تعديل الوجبة
        </button>
      </div>
    </div>
  );
}

function Card({ icon, title, children }) {
  return <div className="bg-tamam-surface rounded-2xl p-4 space-y-2"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-tamam-green-bright text-[20px]">{icon}</span><h3 className="font-bold text-sm text-tamam-text">{title}</h3></div>{children}</div>;
}
function Mini({ label, value }) {
  return <div className="bg-tamam-surface-low rounded-xl px-3 py-2"><p className="text-[10px] text-tamam-text-muted">{label}</p><p className="font-bold text-tamam-text text-sm">{value != null ? `${value} ₪` : '—'}</p></div>;
}
function Tag({ children }) {
  return <span className="text-[11px] bg-tamam-green/15 text-tamam-green-bright px-2 py-1 rounded-full">{children}</span>;
}
function Row({ label, value }) {
  return <div className="flex justify-between items-center"><span className="text-tamam-text-muted text-xs">{label}</span><span className="text-tamam-text font-medium text-xs">{value}</span></div>;
}