import { useState, useMemo } from 'react';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

function tierLabel(t) {
  if (!t) return '—';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function MappingPreviewCard({ items }) {
  const mapped = useMemo(() => items.filter((i) => i.mapped_tamam_product_id || i.meal_id), [items]);
  const [selId, setSelId] = useState('');
  const selected = mapped.find((i) => i.id === selId) || mapped[0] || null;

  return (
    <div className="bg-white rounded-2xl border border-[#e8efeb] overflow-hidden flex flex-col">
      <div className="p-4 bg-[#f1f5f1] border-b border-[#e8efeb] flex items-center gap-1">
        <Icon name="compare_arrows" className="text-[#1c6d17]" />
        <h3 className="text-lg font-semibold text-[#181d1a]">معاينة الربط</h3>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {mapped.length > 1 && (
          <select value={selId} onChange={(e) => setSelId(e.target.value)} className="w-full text-sm rounded-lg border border-[#c0cab8] bg-white px-2 py-1.5 text-[#181d1a]">
            {mapped.map((i) => <option key={i.id} value={i.id}>{i.restaurant_product_name || i.name_ar}</option>)}
          </select>
        )}

        {!selected ? (
          <p className="text-sm text-[#40493c] text-center py-4">لا يوجد ربط بعد. اربط وجبة لمعاينة الفرق بين نسخة المطعم ونسخة TAMAM.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-[#40493c] uppercase tracking-wider">نسخة المطعم</span>
              <div className="flex items-center gap-2 bg-[#f6faf6] p-2 rounded-lg border border-[#e8efeb]">
                <div className="w-12 h-12 rounded bg-[#dfe3e0] shrink-0 overflow-hidden flex items-center justify-center">
                  {selected.primary_image
                    ? <img src={selected.primary_image} alt="" className="w-full h-full object-cover" />
                    : <Icon name="image" className="text-[#707a6b]" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-[#181d1a] truncate">{selected.restaurant_product_name || selected.name_ar}</span>
                  <span className="text-xs text-[#1c6d17]">{selected.price ? `₪${selected.price}` : 'سعر غير متوفر'}</span>
                </div>
              </div>
              <span className="text-[11px] text-[#40493c]">تظهر بعد اختيار المطعم</span>
            </div>

            <div className="flex justify-center -my-2 z-10">
              <div className="w-8 h-8 rounded-full bg-[#1c6d17]/10 flex items-center justify-center text-[#1c6d17]">
                <Icon name="link" className="text-[16px]" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-[#40493c] uppercase tracking-wider">نسخة TAMAM</span>
              <div className="flex items-center gap-2 bg-[#f6faf6] p-2 rounded-lg border border-[#e8efeb]">
                <div className="w-12 h-12 rounded bg-[#1c6d17]/10 flex items-center justify-center shrink-0">
                  <Icon name="fastfood" className="text-[#1c6d17]" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-[#181d1a] truncate">{selected.meal_name_snapshot || 'منتج TAMAM'}</span>
                  <div className="flex items-center gap-1 text-xs text-[#40493c]">
                    <span>ID: #{selected.mapped_tamam_product_id || selected.meal_id}</span>
                    <span>•</span>
                    <span>{tierLabel(selected.mapped_tier || selected.package_id)}</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#40493c]">تظهر قبل اختيار المطعم</span>
            </div>
          </>
        )}

        <p className="text-xs text-[#40493c] bg-[#f1f5f1] rounded-lg p-2 text-center">ربط الوجبة لا يغيّر صورة أو وصف أو سعر منتج TAMAM الرئيسي.</p>
      </div>
    </div>
  );
}