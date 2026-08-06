import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Plus, FileSpreadsheet, Check } from 'lucide-react';
import {
  getItemsForRestaurant,
  downloadCsvTemplate, downloadCsvExample,
  exportRestaurantMenuCsv, exportTamamProductsReferenceCsv,
} from '@/lib/restaurantMenuApi';

export default function RestaurantMenuSection({ restaurantId, restaurant }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    getItemsForRestaurant(restaurantId)
      .then((its) => setItems(its || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [restaurantId]);

  const total = items.length;
  const mapped = items.filter((i) => i.mapping_status === 'mapped').length;
  const unmapped = items.filter((i) => i.mapping_status === 'unmapped' || i.mapping_status === 'needs_review').length;
  const missingImage = items.filter((i) => !i.primary_image && !(i.gallery_images || []).length).length;
  const missingPrice = items.filter((i) => i.price == null || Number(i.price) <= 0).length;
  const unavailable = items.filter((i) => !i.available || i.sold_out).length;

  return (
    <div className="border-t border-outline-variant/20 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">תפריט המסעדה / مينيو المطعم</h3>
          <p className="text-xs text-on-surface-variant">منيو التجهيز الحقيقي للمطعم — مستقل عن مينيو TAMAM التسويقي.</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="bg-surface-container rounded-2xl p-3">
        {loading ? (
          <p className="text-xs text-on-surface-variant text-center py-2">عم نحمّل المينيو...</p>
        ) : total === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-2">لا توجد وجبات بعد — أضف وجبة يدويًا أو استورد CSV.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat n={total} label="وجبات" cls="text-on-surface" />
            <Stat n={mapped} label="مربوط بـ TAMAM" cls="text-green-600" />
            <Stat n={unmapped} label="غير مربوط" cls="text-orange-600" />
            <Stat n={missingImage} label="بدون صورة" cls="text-on-surface-variant" />
            <Stat n={missingPrice} label="بدون سعر" cls="text-error" />
            <Stat n={unavailable} label="غير متاح" cls="text-on-surface-variant" />
          </div>
        )}
      </div>

      {/* 4 buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate(`/admin/restaurants/${restaurantId}/import`)}
          className="flex items-center justify-center gap-1.5 bg-primary text-on-primary py-3 rounded-xl text-sm font-bold"
        >
          <Upload size={16} /> ייבוא תפריט CSV / استيراد مينيو CSV
        </button>
        <button
          onClick={downloadCsvTemplate}
          className="flex items-center justify-center gap-1.5 bg-surface-container border border-outline-variant/30 py-3 rounded-xl text-sm font-bold"
        >
          <Download size={16} /> הורדת תבנית CSV / تحميل نموذج CSV
        </button>
        <button
          onClick={downloadCsvExample}
          className="flex items-center justify-center gap-1.5 bg-surface-container border border-outline-variant/30 py-3 rounded-xl text-sm font-bold"
        >
          <FileSpreadsheet size={16} /> הורדת קובץ לדוגמה / ملف مثال
        </button>
        <button
          onClick={() => navigate(`/admin/restaurants/${restaurantId}/menu`)}
          className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary py-3 rounded-xl text-sm font-bold"
        >
          <Plus size={16} /> הוספת מנה ידנית / إضافة وجبة يدويًا
        </button>
      </div>
      <button
        onClick={() => exportRestaurantMenuCsv(items)}
        disabled={total === 0}
        className="w-full flex items-center justify-center gap-1.5 bg-surface-container border border-outline-variant/30 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
      >
        <Download size={15} /> ייצוא התפריט הנוכחי / تصدير المينيو الحالي
      </button>
    </div>
  );
}

function Stat({ n, label, cls }) {
  return (
    <div>
      <p className={`text-xl font-bold ${cls}`}>{n}</p>
      <p className="text-[10px] text-on-surface-variant">{label}</p>
    </div>
  );
}

export function RestaurantCreatedSuccess({ restaurantId, navigate }) {
  return (
    <div dir="rtl" className="font-tamam max-w-2xl space-y-4 text-center">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
        <Check size={40} className="mx-auto text-green-600 mb-3" />
        <h1 className="text-lg font-bold mb-1">המסעדה נשמרה. עכשיו הוסף את התפריט שלה.</h1>
        <p className="text-sm text-on-surface-variant">تم حفظ بيانات المطعم. هلق أضف مينيو المطعم. المطعم بدون مينيو مربوط لا يظهر كموفّر تجهيز.</p>
        <p className="text-[11px] text-on-surface-variant mt-2">معرف المطعم: <span className="font-bold" dir="ltr">{restaurantId}</span></p>
      </div>
      <div className="grid gap-2">
        <button
          onClick={() => navigate(`/admin/restaurants/${restaurantId}/import`)}
          className="flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-xl font-bold"
        >
          <Upload size={18} /> ייבוא תפריט CSV / استيراد مينيو CSV
        </button>
        <button
          onClick={() => navigate(`/admin/restaurants/${restaurantId}/menu`)}
          className="flex items-center justify-center gap-2 bg-primary/10 text-primary py-4 rounded-xl font-bold"
        >
          <Plus size={18} /> הוספת מנה ידנית / إضافة وجبة يدويًا
        </button>
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="flex items-center justify-center gap-2 bg-surface-container border border-outline-variant/30 py-4 rounded-xl font-bold text-on-surface-variant"
        >
          אעשה זאת מאוחר יותר / سأفعل ذلك لاحقًا
        </button>
      </div>
    </div>
  );
}