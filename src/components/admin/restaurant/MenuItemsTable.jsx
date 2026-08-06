import { useState } from 'react';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const TIER_LABEL = { classic: 'Classic', mix: 'Mix', plus: 'Plus' };

function relAr(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) { const h = Math.floor(diff / 3600000); return h <= 0 ? 'الآن' : `قبل ${h} س`; }
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  if (d < 30) return 'منذ أسبوع';
  return `منذ ${Math.floor(d / 30)} شهر`;
}

export default function MenuItemsTable({ items, onEdit, onLink, onToggleAvailable }) {
  const [tab, setTab] = useState('all');
  const isMapped = (it) => !!(it.mapped_tamam_product_id || it.meal_id);
  const hasImg = (it) => !!(it.primary_image || (it.gallery_images || []).length);

  const tabs = [
    { k: 'all', l: 'كل الوجبات', count: items.length, badge: false },
    { k: 'mapped', l: 'مربوطة مع TAMAM', count: items.filter(isMapped).length, badge: false },
    { k: 'unmapped', l: 'بحاجة للربط', count: items.filter((i) => !isMapped(i)).length, badge: true },
    { k: 'noimage', l: 'بدون صور', count: items.filter((i) => !hasImg(i)).length, badge: false },
    { k: 'unavailable', l: 'غير متوفرة', count: items.filter((i) => !i.available || i.sold_out).length, badge: false },
  ];

  const filtered = items.filter((it) => {
    if (tab === 'mapped') return isMapped(it);
    if (tab === 'unmapped') return !isMapped(it);
    if (tab === 'noimage') return !hasImg(it);
    if (tab === 'unavailable') return !it.available || it.sold_out;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#e8efeb] overflow-hidden flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-4 px-6 pt-4 border-b border-[#e8efeb] overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`pb-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${tab === t.k ? 'text-[#1c6d17] border-[#1c6d17]' : 'text-[#40493c] border-transparent hover:border-[#c0cab8]'}`}
          >
            {t.l}
            {t.badge && t.count > 0 && <span className="w-5 h-5 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] text-[10px] flex items-center justify-center">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-[#f1f5f1] text-xs text-[#40493c] border-b border-[#e8efeb]">
              <th className="py-2 px-4 font-medium w-16">الصورة</th>
              <th className="py-2 px-4 font-medium min-w-[200px]">اسم الوجبة</th>
              <th className="py-2 px-4 font-medium w-24">السعر</th>
              <th className="py-2 px-4 font-medium min-w-[150px]">منتج TAMAM</th>
              <th className="py-2 px-4 font-medium w-24">المستوى</th>
              <th className="py-2 px-4 font-medium w-24">التوفر</th>
              <th className="py-2 px-4 font-medium w-32">آخر تحديث</th>
              <th className="py-2 px-4 font-medium w-28 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="text-sm text-[#181d1a] divide-y divide-[#e8efeb]">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-[#40493c]">لا توجد وجبات {tab !== 'all' ? 'بهذا الفلتر' : 'في مينيو المطعم بعد'}.</td></tr>
            )}
            {filtered.map((it) => {
              const mapped = isMapped(it);
              const img = hasImg(it);
              const tier = it.mapped_tier || it.package_id;
              return (
                <tr key={it.id} className={`hover:bg-[#f6faf6] transition-colors group ${!mapped ? 'bg-[#ba1a1a]/5' : ''}`}>
                  <td className="py-2 px-4">
                    <div className="w-10 h-10 rounded bg-[#dfe3e0] overflow-hidden flex items-center justify-center">
                      {img
                        ? <img src={it.primary_image || it.gallery_images[0]} alt="" className="w-full h-full object-cover" />
                        : <Icon name="image" className="text-[#707a6b]" />}
                    </div>
                  </td>
                  <td className="py-2 px-4 font-medium">{it.restaurant_product_name || it.name_ar || 'وجبة'}</td>
                  <td className="py-2 px-4">{it.price ? `₪${it.price}` : <span className="text-[#ba1a1a]">—</span>}</td>
                  <td className="py-2 px-4">
                    {mapped ? (
                      <div className="flex items-center gap-1 text-[#1c6d17]">
                        <Icon name="check_circle" className="text-[16px]" /> {it.meal_name_snapshot || `#${it.mapped_tamam_product_id || it.meal_id}`}
                      </div>
                    ) : (
                      <span className="px-2 py-1 rounded-md bg-[#ba1a1a]/10 text-[#ba1a1a] text-xs inline-flex items-center gap-1">
                        <Icon name="link_off" className="text-[14px]" /> بحاجة للربط
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    {tier ? <span className="px-1 py-0.5 rounded bg-[#dfe3e0] text-[#40493c] text-xs">{TIER_LABEL[tier] || tier}</span> : <span className="text-[#707a6b]">—</span>}
                  </td>
                  <td className="py-2 px-4">
                    {it.sold_out ? <span className="text-[#ba1a1a] text-xs">نفد</span>
                      : it.available ? <span className="text-[#1c6d17] text-xs">متوفر</span>
                      : <span className="text-[#ba1a1a] text-xs">غير متوفر</span>}
                  </td>
                  <td className="py-2 px-4 text-[#40493c] text-xs">{relAr(it.updated_date)}</td>
                  <td className="py-2 px-4 text-center">
                    {!mapped ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onLink()} className="px-2 py-1 rounded bg-[#1c6d17]/10 text-[#1c6d17] hover:bg-[#1c6d17]/20 text-xs font-medium transition-colors">ربط الآن</button>
                        <button onClick={() => onEdit(it)} className="w-8 h-8 rounded hover:bg-[#ebefeb] text-[#40493c] flex items-center justify-center" title="تعديل"><Icon name="edit" className="text-[18px]" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(it)} className="w-8 h-8 rounded hover:bg-[#ebefeb] text-[#40493c] flex items-center justify-center" title="تعديل"><Icon name="edit" className="text-[18px]" /></button>
                        <button onClick={() => onLink()} className="w-8 h-8 rounded hover:bg-[#ebefeb] text-[#40493c] flex items-center justify-center" title="تغيير الربط"><Icon name="link" className="text-[18px]" /></button>
                        <button onClick={() => onToggleAvailable(it)} className="w-8 h-8 rounded hover:bg-[#ebefeb] text-[#40493c] flex items-center justify-center" title={it.available ? 'تعطيل' : 'تفعيل'}><Icon name="power_settings_new" className="text-[18px]" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-2 flex items-center justify-between border-t border-[#e8efeb] bg-white">
        <span className="text-xs text-[#40493c]">عرض {filtered.length} من {items.length}</span>
      </div>
    </div>
  );
}