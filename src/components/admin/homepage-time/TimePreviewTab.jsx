import { useState, useEffect } from 'react';
import { getPeriods, previewPeriod } from '@/lib/homepageTimeApi';
import PublicImage from '@/components/shared/PublicImage';

/**
 * Preview tab — preview resolved content for a specific period and simulated time.
 */
export default function TimePreviewTab() {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [simTime, setSimTime] = useState('');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPeriods().then((res) => { setPeriods(res?.periods || []); if (res?.periods?.[0]) setPeriodId(res.periods[0].id); }).catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const data = await previewPeriod(periodId, simTime || undefined);
      setContent(data);
    } catch (e) { console.error(e); alert('فشل التحميل'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">الفترة</label>
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white">
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="block text-xs text-gray-500 mb-1">وقت محاكى (اختياري)</label>
          <input type="time" value={simTime} onChange={(e) => setSimTime(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button onClick={handlePreview} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{loading ? 'جاري...' : 'معاينة'}</button>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 mb-4">
        أوقات اختبار مقترحة: 06:30 (أول النهار) | 12:30 (الغدا) | 17:00 (بعد الظهر) | 20:30 (العشا) | 00:30 (آخر الليل)
      </div>

      {content && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <span className="text-sm font-bold">الفترة النشطة: </span>
            <span>{content.current_period?.name_ar} ({content.current_period?.time_str})</span>
          </div>

          {/* Hero preview */}
          {content.hero && (
            <div className="border rounded-xl p-3">
              <h4 className="font-bold text-sm mb-2">البانر الرئيسي</h4>
              <div className="relative h-[120px] rounded-xl overflow-hidden bg-gray-100">
                {content.hero.image_url && <PublicImage source={content.hero.image_url} className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 right-2 text-white">
                  <span className="text-[10px] font-bold text-green-300">{content.hero.headline}</span>
                  <p className="text-xs font-bold">{content.hero.title}</p>
                </div>
              </div>
            </div>
          )}

          {/* Top suggestions preview */}
          {content.top_suggestions?.length > 0 && (
            <div className="border rounded-xl p-3">
              <h4 className="font-bold text-sm mb-2">اقتراحات TAMAM ({content.top_suggestions.length})</h4>
              <div className="grid grid-cols-3 gap-2">
                {content.top_suggestions.map((s) => (
                  <div key={s.id} className="rounded-lg overflow-hidden bg-gray-100 h-[80px] relative">
                    {s.image_url && <PublicImage source={s.image_url} className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold">{s.package_label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banners preview */}
          {content.banners?.filter(Boolean).length > 0 && (
            <div className="border rounded-xl p-3">
              <h4 className="font-bold text-sm mb-2">البنرات الزمنية</h4>
              <div className="space-y-2">
                {content.banners.filter(Boolean).map((b) => (
                  <div key={b.key} className="relative h-[60px] rounded-lg overflow-hidden bg-gray-100">
                    {b.image_url && <PublicImage source={b.image_url} className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center px-3 text-white">
                      <div><span className="text-xs font-bold">{b.headline}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carousels preview */}
          {content.carousels?.filter(Boolean).length > 0 && (
            <div className="border rounded-xl p-3">
              <h4 className="font-bold text-sm mb-2">الكروسولات الزمنية</h4>
              <div className="space-y-3">
                {content.carousels.filter(Boolean).map((c) => (
                  <div key={c.key}>
                    <p className="text-xs font-bold mb-1">{c.title} ({c.meals.length} وجبات)</p>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {c.meals.map((m) => (
                        <div key={m.meal_id} className="flex-shrink-0 w-[60px] h-[60px] rounded-lg overflow-hidden bg-gray-100">
                          {m.image_url && <PublicImage source={m.image_url} className="w-full h-full object-cover" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!content.hero && !content.top_suggestions?.length && !content.banners?.filter(Boolean).length && !content.carousels?.filter(Boolean).length && (
            <div className="text-center py-8 text-gray-500">لا يوجد محتوى مُعد لهذه الفترة. سيتم استخدام المحتوى الثابت.</div>
          )}
        </div>
      )}
    </div>
  );
}