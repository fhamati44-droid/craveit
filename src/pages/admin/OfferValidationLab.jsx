import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDemoStatus, listOffers, getOffer } from '@/lib/campaignApi';
import { resolveUnifiedOfferByMealSet, revalidateUnifiedCheckout, consumeUnifiedQuota, unlockUnifiedOffer, getUnifiedOffer, UNIFIED_CARD_STATE_LABEL, effectivePrice } from '@/lib/unifiedOfferApi';
import { setDemoCheckoutContext, clearDemoCheckoutContext } from '@/lib/checkoutRevalidation';
import { RefreshCw, FlaskConical, Lock, LockOpen, ShoppingCart, Clock } from 'lucide-react';

const DEMO_PHONE = '0500000000';
const VARIANT_LABEL = { classic: 'كلاسيك', mix: 'ميكس', plus: 'بلس' };

const TIME_PRESETS = [
  { label: '14:59 (قبل البدء)', off: -60000 },
  { label: '15:00 (بدء)', off: 0 },
  { label: '16:00', off: 'mid' },
  { label: '16:59 (قبل الانتهاء)', off: -60000, fromEnd: true },
  { label: '17:00 (انتهاء)', off: 0, fromEnd: true },
  { label: '17:01 (بعد الانتهاء)', off: 60000, fromEnd: true },
];

export default function OfferValidationLab() {
  const [status, setStatus] = useState(null);
  const [offers, setOffers] = useState([]);
  const [mixOffer, setMixOffer] = useState(null);

  const [entry, setEntry] = useState('mood'); // mood | browse | offer_id | deep_link
  const [variant, setVariant] = useState('mix');
  const [restaurantId, setRestaurantId] = useState('');
  const [offerIdInput, setOfferIdInput] = useState('');
  const [testTime, setTestTime] = useState('');
  const [pointsBalance, setPointsBalance] = useState(null);
  const [segments, setSegments] = useState([]);

  const [resolveResult, setResolveResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [unlockResult, setUnlockResult] = useState(null);
  const [quotaResult, setQuotaResult] = useState(null);
  const [revalResult, setRevalResult] = useState(null);
  const [walkResults, setWalkResults] = useState([]);

  const load = useCallback(async () => {
    const s = await getDemoStatus().catch(() => null);
    setStatus(s);
    if (s?.restaurant) {
      const list = await listOffers(s.restaurant).catch(() => []);
      setOffers(list || []);
      const mx = (list || []).find((o) => o.mealset_variant_id === 'mix' && o.customer_price === 51 && o.quota_total > 1);
      setMixOffer(mx || (list || [])[0] || null);
      setRestaurantId(s.restaurant);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // pull points balance + segments from a resolve call
  const refreshPoints = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const r = await resolveUnifiedOfferByMealSet({ tamam_product_id: 1001, variant, phone: DEMO_PHONE, include_demo: true, test_time: testTime || undefined });
      const opt = (r?.options || [])[0];
      const off = opt?.offer;
      setPointsBalance(off?.points_balance ?? null);
      // segments not returned by mealset resolver; fetch via a unifiedGet on the mix offer
      if (mixOffer) {
        const u = await getUnifiedOffer({ source_type: 'CAMPAIGN', id: mixOffer.id, phone: DEMO_PHONE, include_demo: true, test_time: testTime || undefined });
        setSegments(u ? ['(resolved)'] : []);
      }
    } catch {}
  }, [restaurantId, variant, testTime, mixOffer]);

  const isoFromOffer = (offer, offMs, fromEnd) => {
    if (!offer) return '';
    const base = fromEnd ? new Date(offer.end_at).getTime() : new Date(offer.start_at).getTime();
    return new Date(base + offMs).toISOString();
  };

  const runResolve = async () => {
    setBusy(true); setError(''); setResolveResult(null);
    try {
      if (entry === 'mood') {
        const r = await resolveUnifiedOfferByMealSet({ tamam_product_id: 1001, variant, phone: DEMO_PHONE, include_demo: true, test_time: testTime || undefined });
        setResolveResult(r);
        const opt = (r?.options || [])[0];
        setPointsBalance(opt?.offer?.points_balance ?? null);
      } else if (entry === 'browse') {
        if (!restaurantId) throw new Error('اختر مطعم');
        const { resolveUnifiedOffer } = await import('@/lib/unifiedOfferApi');
        const r = await resolveUnifiedOffer({ restaurant_id: restaurantId, variant, phone: DEMO_PHONE, include_demo: true, test_time: testTime || undefined });
        setResolveResult({ selected: r?.selected, alternatives: r?.alternatives, selection_reason: r?.selection_reason, conflicting_offer_ids: r?.conflicting_offer_ids, server_time: r?.server_time });
        setPointsBalance(r?.selected?.points_balance ?? null);
      } else if (entry === 'offer_id' || entry === 'deep_link') {
        const id = offerIdInput || mixOffer?.id || '';
        if (!id) throw new Error('أدخل معرّف العرض');
        const u = await getUnifiedOffer({ source_type: 'CAMPAIGN', id, phone: DEMO_PHONE, include_demo: true, test_time: testTime || undefined });
        setResolveResult({ selected: u, alternatives: [], selection_reason: 'unifiedGet', server_time: null });
        setPointsBalance(u?.points_balance ?? null);
      }
    } catch (e) { setError(e?.message || 'resolve_failed'); }
    finally { setBusy(false); }
  };

  const runUnlock = async () => {
    setBusy(true); setUnlockResult(null);
    try {
      const id = mixOffer?.id || offerIdInput;
      const off = mixOffer || (id ? await getOffer(id).catch(() => null) : null);
      if (!off) throw new Error('no offer');
      const tt = testTime || isoFromOffer(off, 60000);
      const r = await unlockUnifiedOffer({ source_type: 'CAMPAIGN', id: off.id, phone: DEMO_PHONE, channel: 'mood_game', include_demo: true, test_time: tt });
      setUnlockResult(r);
      await refreshPoints();
    } catch (e) { setUnlockResult({ error: e?.message || 'unlock_failed' }); }
    finally { setBusy(false); }
  };

  const runConsume = async () => {
    setBusy(true); setQuotaResult(null);
    try {
      const off = mixOffer;
      if (!off) throw new Error('no offer');
      const tt = testTime || isoFromOffer(off, 60000);
      const r = await consumeUnifiedQuota({ source_type: 'CAMPAIGN', id: off.id, include_demo: true, test_time: tt });
      setQuotaResult(r);
    } catch (e) { setQuotaResult({ error: e?.message }); }
    finally { setBusy(false); }
  };

  const runRevalidate = async () => {
    setBusy(true); setRevalResult(null);
    try {
      const off = mixOffer;
      if (!off) throw new Error('no offer');
      const tt = testTime || isoFromOffer(off, 60000);
      const r = await revalidateUnifiedCheckout({ source_type: 'CAMPAIGN', id: off.id, restaurant_id: restaurantId || null, restaurant_item_id: null, phone: DEMO_PHONE, include_demo: true, test_time: tt });
      setRevalResult(r);
    } catch (e) { setRevalResult({ error: e?.message }); }
    finally { setBusy(false); }
  };

  const runWalkthrough = async () => {
    setBusy(true); setWalkResults([]);
    try {
      const off = mixOffer;
      if (!off) throw new Error('no mix demo offer');
      const start = new Date(off.start_at).getTime();
      const end = new Date(off.end_at).getTime();
      const steps = [
        { label: '14:59 → قبل البدء', t: start - 60000 },
        { label: '15:00 → بدء العرض', t: start },
        { label: '16:59 → قبل الانتهاء', t: end - 60000 },
        { label: '17:00 → انتهاء', t: end },
        { label: '17:01 → بعد الانتهاء', t: end + 60000 },
      ];
      const out = [];
      for (const s of steps) {
        const r = await revalidateUnifiedCheckout({ source_type: 'CAMPAIGN', id: off.id, restaurant_id: restaurantId || null, phone: DEMO_PHONE, include_demo: true, test_time: new Date(s.t).toISOString() });
        out.push({ label: s.label, valid: r?.valid, card_state: r?.card_state, price: r?.authoritative_price, normal: r?.normal_price, reason: r?.reason_if_unavailable });
      }
      setWalkResults(out);
    } catch (e) { setError(e?.message); }
    finally { setBusy(false); }
  };

  const enableDemoCheckout = () => {
    setDemoCheckoutContext({ include_demo: true, test_time: testTime || undefined });
    alert('تم تفعيل سياق الدفع التجريبي. الآن أي عملية دفع حقيقية ستعمل بوقت الاختبار المحدد. افتح /checkout/review من تطبيق العميل لتجربة المسار الحقيقي.');
  };
  const disableDemoCheckout = () => { clearDemoCheckoutContext(); alert('تم إلغاء سياق الدفع التجريبي — العودة لوقت الخادم الحقيقي.'); };

  return (
    <div className="min-h-screen bg-[#F5F5F5] max-w-3xl mx-auto" dir="rtl">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Link to="/admin/campaigns" className="text-gray-500 text-sm">← محرك الحملات</Link>
          <Link to="/admin/phase2-readiness" className="text-purple-600 text-sm font-bold">لوحة الجاهزية ←</Link>
        </div>
        <h1 className="text-lg font-extrabold flex items-center gap-2"><FlaskConical size={18} /> TAMAM — مختبر التحقق من العروض</h1>
        <p className="text-xs text-amber-600 mt-1">داخلي / تجريبي فقط — للاختبار. لا يُعرض للعملاء أو الشركاء.</p>
      </div>

      <div className="p-4 space-y-4">
        {status && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
            <b className="text-amber-700">مطعم البرك التجريبي</b> · {status.offers} عرض تجريبي · المطعم: <code className="text-[10px]" dir="ltr">{status.restaurant}</code>
          </div>
        )}

        {/* CONTROLS */}
        <div className="bg-white rounded-2xl p-4 border space-y-4">
          <h2 className="font-bold text-sm">أدوات التحكم</h2>

          {/* Demo user */}
          <div>
            <p className="text-xs text-gray-500 mb-1">العميل التجريبي</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <code className="bg-gray-100 px-2 py-1 rounded" dir="ltr">{DEMO_PHONE}</code>
              <span className="bg-gray-100 px-2 py-1 rounded">رصيد النقاط: {pointsBalance ?? '—'}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">القطاعات: {segments.length || '—'}</span>
            </div>
          </div>

          {/* Test time */}
          <div>
            <p className="text-xs text-gray-500 mb-1">وقت الاختبار — تجريبي فقط ⚠️</p>
            <div className="flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((p, i) => (
                <button key={i} onClick={() => { if (mixOffer) setTestTime(isoFromOffer(mixOffer, p.off, p.fromEnd)); }}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${testTime ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{p.label}</button>
              ))}
              <button onClick={() => setTestTime('')} className="text-[11px] px-2.5 py-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-500">وقت حقيقي</button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">الإنتاج يستخدم دائمًا وقت الخادم الحقيقي.</p>
            {testTime && <p className="text-[10px] text-blue-600 mt-1" dir="ltr">test_time: {testTime}</p>}
          </div>

          {/* Entry path */}
          <div>
            <p className="text-xs text-gray-500 mb-1">مسار الدخول</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              {[['mood', 'مود / MealSet'], ['browse', 'تصفح مباشر'], ['offer_id', 'معرّف عرض'], ['deep_link', 'رابط عميق']].map(([v, l]) => (
                <button key={v} onClick={() => setEntry(v)} className={`flex-1 py-2 rounded-lg font-bold ${entry === v ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Variant */}
          <div>
            <p className="text-xs text-gray-500 mb-1">الباقة</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              {['classic', 'mix', 'plus'].map((v) => (
                <button key={v} onClick={() => setVariant(v)} className={`flex-1 py-2 rounded-lg font-bold ${variant === v ? 'bg-white shadow text-blue' : 'text-gray-500'}`}>{VARIANT_LABEL[v]}</button>
              ))}
            </div>
          </div>

          {/* Restaurant (optional) */}
          <div>
            <p className="text-xs text-gray-500 mb-1">المطعم (اختياري — اتركه فارغًا لفحص حل المود قبل المطعم)</p>
            <input value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} placeholder="بدون مطعم" className="w-full px-3 py-2 rounded-lg border text-sm" dir="ltr" />
          </div>

          {(entry === 'offer_id' || entry === 'deep_link') && (
            <div>
              <p className="text-xs text-gray-500 mb-1">معرّف العرض</p>
              <input value={offerIdInput} onChange={(e) => setOfferIdInput(e.target.value)} placeholder={mixOffer?.id || ''} className="w-full px-3 py-2 rounded-lg border text-sm" dir="ltr" />
            </div>
          )}

          <button onClick={runResolve} disabled={busy} className="w-full bg-blue text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} حل العرض
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* RESOLVE OUTPUT */}
        {resolveResult && (
          <div className="bg-white rounded-2xl p-4 border space-y-3">
            <h2 className="font-bold text-sm">نتيجة الحل (من الخادم)</h2>
            {resolveResult.options ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">خيالات التنيجة ({resolveResult.options.length}):</p>
                {resolveResult.options.map((o, i) => <CandidateRow key={i} o={o} />)}
              </div>
            ) : (
              <div className="space-y-2">
                <UnifiedDetail u={resolveResult.selected} />
                {resolveResult.selection_reason && <p className="text-xs text-purple-600">سبب الاختيار: <code dir="ltr">{resolveResult.selection_reason}</code></p>}
                {resolveResult.conflicting_offer_ids?.length > 0 && <p className="text-xs text-amber-600">عروض متعارضة: {resolveResult.conflicting_offer_ids.join('، ')}</p>}
                {(resolveResult.alternatives || []).length > 0 && <p className="text-xs text-gray-500">بدائل: {(resolveResult.alternatives || []).length}</p>}
              </div>
            )}
          </div>
        )}

        {/* POINTS TEST */}
        <div className="bg-white rounded-2xl p-4 border space-y-2">
          <h2 className="font-bold text-sm flex items-center gap-2"><Lock size={14} /> فحص فتح النقاط</h2>
          <p className="text-xs text-gray-500">قبل: رصيد {pointsBalance ?? '—'} · تكلفة الفتح {mixOffer?.unlock_points || 0} نقطة · حالة العرض {mixOffer ? UNIFIED_CARD_STATE_LABEL[resolveResult?.selected?.card_state] || '—' : '—'}</p>
          <button onClick={runUnlock} disabled={busy} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"><LockOpen size={14} /> اختبر فتح النقاط</button>
          {unlockResult && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs">
              <pre className="overflow-x-auto" dir="ltr">{JSON.stringify(unlockResult, null, 2)}</pre>
              <p className="text-[11px] text-gray-500 mt-1">متوقع: أول مرة → unlocked، ثاني مرة → already_unlocked (بدون خصم ثانٍ).</p>
            </div>
          )}
        </div>

        {/* QUOTA TEST */}
        <div className="bg-white rounded-2xl p-4 border space-y-2">
          <h2 className="font-bold text-sm flex items-center gap-2"><ShoppingCart size={14} /> فحص الكمية</h2>
          <p className="text-xs text-gray-500">العرض: {mixOffer?.offer_title || '—'} · total {mixOffer?.quota_total ?? '∞'} · used {mixOffer?.quota_used ?? 0}</p>
          <button onClick={runConsume} disabled={busy} className="bg-green text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"><RefreshCw size={14} /> اختبر استهلاك الكمية</button>
          {quotaResult && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs">
              <pre className="overflow-x-auto" dir="ltr">{JSON.stringify(quotaResult, null, 2)}</pre>
              <p className="text-[11px] text-gray-500 mt-1">متوقع: consumed أو sold_out (لا بيع زائد).</p>
            </div>
          )}
        </div>

        {/* CHECKOUT REVALIDATION */}
        <div className="bg-white rounded-2xl p-4 border space-y-2">
          <h2 className="font-bold text-sm flex items-center gap-2"><RefreshCw size={14} /> إعادة تحقق الدفع</h2>
          <p className="text-xs text-gray-500">المطعم: {restaurantId || '—'} · العرض: {mixOffer?.id || '—'} · سعر السلة: {mixOffer?.customer_price ?? '—'} ₪</p>
          <button onClick={runRevalidate} disabled={busy} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">شغّل إعادة التحقق</button>
          {revalResult && (
            <div className="bg-gray-50 rounded-lg p-2 text-xs">
              <pre className="overflow-x-auto" dir="ltr">{JSON.stringify(revalResult, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* TIME WALKTHROUGH */}
        <div className="bg-white rounded-2xl p-4 border space-y-2">
          <h2 className="font-bold text-sm flex items-center gap-2"><Clock size={14} /> جولة الوقت (عرض الميكس)</h2>
          <button onClick={runWalkthrough} disabled={busy} className="bg-blue text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">شغّل الجولة</button>
          {walkResults.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {walkResults.map((w, i) => (
                <div key={i} className={`rounded-lg p-2 text-xs border ${w.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between"><b>{w.label}</b><span className="font-bold">{w.valid ? 'valid ✅' : 'invalid ❌'}</span></div>
                  <p className="text-gray-500">state: {w.card_state} · price: {w.price ?? '—'} · normal: {w.normal ?? '—'} · reason: {w.reason || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEMO CHECKOUT HOOK */}
        <div className="bg-white rounded-2xl p-4 border space-y-2">
          <h2 className="font-bold text-sm">ربط مسار الدفع الحقيقي (تجريبي)</h2>
          <p className="text-xs text-gray-500">فعّل سياق الدفع التجريبي بالوقت المحدد، ثم افتح صفحة مراجعة الدفع من تطبيق العميل لتجربة المسار الحقيقي (إعادة التحقق + الاستهلاك الذري + منع السعر الموقوت).</p>
          <div className="flex gap-2">
            <button onClick={enableDemoCheckout} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold">فعّل سياق الدفع التجريبي</button>
            <button onClick={disableDemoCheckout} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ o }) {
  const off = o.offer;
  return (
    <div className={`rounded-lg p-2.5 border text-xs ${o.has_offer ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex justify-between font-bold">
        <span>{o.restaurant_fulfillment?.name || o.restaurant_id}</span>
        <span>{o.has_offer ? `${off?.customer_price} ₪` : `${o.normal_price} ₪`}</span>
      </div>
      <p className="text-gray-500 mt-1">
        مطعم: {o.restaurant_id ? '✓' : '✗'} · item: <code dir="ltr">{o.restaurant_item_id || '—'}</code> · توفّر: {o.restaurant_fulfillment ? 'متاح' : 'غير متاح'}
      </p>
      {off ? (
        <p className="text-gray-600 mt-1">
          مصدر: {off.source_type} · state: <b>{off.card_state}</b> · eligible: {String(off.eligible)} · locked: {String(off.locked)} · سعر: {off.customer_price} ₪
          <br />unlock: {off.unlock_type} ({off.unlock_points} نقطة) · quota_remaining: {off.quota_remaining ?? '∞'} · {off.start_at} → {off.end_at}
        </p>
      ) : (
        <p className="text-gray-500 mt-1">عرض: لا يوجد · state: {o.card_state}</p>
      )}
    </div>
  );
}

function UnifiedDetail({ u }) {
  if (!u) return <p className="text-xs text-gray-400">لا يوجد عرض محلوظ</p>;
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-xs space-y-1">
      <p><b>{u.title}</b> · {u.source_type} · <code dir="ltr">{u.id}</code></p>
      <p>state: <b>{u.card_state}</b> ({UNIFIED_CARD_STATE_LABEL[u.card_state]}) · eligible: {String(u.eligible)} · locked: {String(u.locked)}</p>
      <p>سعر العميل: {u.customer_price} ₪ · عادي: {u.normal_price} ₪ · value_add: {u.value_add || '—'}</p>
      <p>unlock: {u.unlock_type} ({u.unlock_points} نقطة) · quota: {u.quota_total ?? '∞'} / remaining {u.quota_remaining ?? '∞'}</p>
      <p>وقت: {u.start_at} → {u.end_at}</p>
      <p>مطعم: {u.restaurant_id || '—'} · item: <code dir="ltr">{u.restaurant_item_id || '—'}</code> · رصيد النقاط: {u.points_balance ?? '—'}</p>
      <p>سبب: {u.reason_if_unavailable || '—'}</p>
    </div>
  );
}