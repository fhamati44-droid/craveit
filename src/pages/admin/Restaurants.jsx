import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, UtensilsCrossed, Trash2, Power, BadgePercent, Store } from 'lucide-react';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

const STATUS_LABEL = { open: 'مفتوح', closed: 'مغلق', busy: 'مشغول', temporarily_unavailable: 'غير متاح مؤقتًا' };
const STATUS_TONE = { open: 'bg-primary/15 text-primary', closed: 'bg-error/15 text-error', busy: 'bg-tertiary/15 text-tertiary', temporarily_unavailable: 'bg-error/15 text-error' };

export default function Restaurants() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Restaurant.list('-created_date', 200).catch(() => []),
      base44.entities.RestaurantMealOffer.list('-created_date', 500).catch(() => []),
    ]).then(([r, o]) => {
      setRows(r || []);
      setOffers(o || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const offerCountFor = (rid) => offers.filter((o) => o.restaurant_id === rid).length;
  const toggleActive = async (r) => { await base44.entities.Restaurant.update(r.id, { active: !r.active }); load(); };
  const remove = async (r) => {
    const used = offers.filter((o) => o.restaurant_id === r.id).length;
    if (used > 0 && !confirm(`المطعم مرتبط بـ ${used} وجبة. تأكيد الحذف؟ (لن تُحذف الوجبات)`)) return;
    await base44.entities.Restaurant.delete(r.id); setConfirmId(null); load();
  };

  const mealsWithoutOffer = offers.filter((o) => !o.price || o.price <= 0).length;
  const activeOffers = offers.filter((o) => o.active && o.available && o.price > 0).length;

  return (
    <div dir="rtl" className="font-tamam space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Store size={22} className="text-primary" /> المطاعم</h1>
        <button onClick={() => navigate('/admin/restaurants/new')} className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
          <Plus size={16} /> إضافة مطعم
        </button>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-3 gap-3">
        <Widget label="عدد المطاعم" value={rows.length} />
        <Widget label="عروض نشطة" value={activeOffers} />
        <Widget label="عروض بدون سعر" value={mealsWithoutOffer} tone="error" />
      </div>

      {loading ? (
        <p className="text-center text-on-surface-variant py-10">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="storefront" className="text-5xl text-on-surface-variant" />
          <p className="text-on-surface-variant mt-2">لا يوجد مطاعم بعد. أضف أول مطعم.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0">
                  {r.logo_url ? <img src={r.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{r.name_ar || r.name}</h3>
                    {r.verified && <Icon name="verified" className="text-primary text-[18px]" />}
                    {r.featured && <Star />}
                    {!r.active && <span className="text-[10px] bg-error/15 text-error px-1.5 py-0.5 rounded font-bold">معطّل</span>}
                  </div>
                  <p className="text-xs text-on-surface-variant">{r.city || '—'} · {STATUS_LABEL[r.current_status] || r.current_status}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${STATUS_TONE[r.current_status] || 'bg-surface-container-high'}`}>{STATUS_LABEL[r.current_status] || r.current_status}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">رسوم التوصيل ₪{r.delivery_fee || 0}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">{offerCountFor(r.id)} وجبة</span>
                    {(r.menu_types || []).length > 0 && <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container">{r.menu_types.length} قوائم</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button onClick={() => navigate(`/admin/restaurants/${r.id}/edit`)} className="text-xs bg-surface-container-high text-on-surface font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Pencil size={12} /> تعديل</button>
                <button onClick={() => navigate(`/admin/restaurants/${r.id}/menu`)} className="text-xs bg-primary text-on-primary font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><UtensilsCrossed size={12} /> مينيو المطعم</button>
                <button onClick={() => navigate(`/admin/restaurants/${r.id}/edit`)} className="text-xs bg-surface-container-high text-on-surface font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Pencil size={12} /> بيانات المطعم</button>
                <button onClick={() => toggleActive(r)} className="text-xs bg-surface-container-high text-on-surface font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Power size={12} /> {r.active ? 'تعطيل' : 'تفعيل'}</button>
                {confirmId === r.id ? (
                  <button onClick={() => remove(r)} className="text-xs bg-error text-on-error font-bold px-3 py-1.5 rounded-lg">تأكيد الحذف</button>
                ) : (
                  <button onClick={() => setConfirmId(r.id)} className="text-xs bg-error/10 text-error font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Trash2 size={12} /> حذف</button>
                )}
                {confirmId === r.id && <button onClick={() => setConfirmId(null)} className="text-xs text-on-surface-variant px-2 py-1.5">إلغاء</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Widget({ label, value, tone }) {
  return (
    <div className="bg-surface-container rounded-2xl p-3 text-center">
      <div className={`text-2xl font-bold ${tone === 'error' ? 'text-error' : 'text-primary'}`}>{value}</div>
      <div className="text-[11px] text-on-surface-variant mt-0.5">{label}</div>
    </div>
  );
}

function Star() {
  return <BadgePercent size={14} className="text-tertiary" />;
}