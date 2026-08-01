import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { listVersions, diagnoseMoods } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function SystemCheck() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(null);
  const [moodDiag, setMoodDiag] = useState(null);
  const [moodDiagLoading, setMoodDiagLoading] = useState(false);
  const [driveDiag, setDriveDiag] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveMigrating, setDriveMigrating] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const [moods, sets, items, deals, versions, media] = await Promise.all([
        base44.entities.TamamMood.list().catch(() => []),
        base44.entities.TamamSuggestionSet.list().catch(() => []),
        base44.entities.TamamSuggestionItem.list().catch(() => []),
        base44.entities.GroupDeal.list().catch(() => []),
        listVersions().catch(() => []),
        base44.entities.HomepageMedia.list().catch(() => []),
      ]);

      const activeMoods = (moods || []).filter(m => m.is_active);
      const moodsWithSuggestions = activeMoods.filter(m => (sets || []).some(s => s.is_active && s.mood_id === m.id));
      const activeSets = (sets || []).filter(s => s.is_active);
      const itemsWithMeals = (items || []).filter(i => i.meal_id);

      const activeDeals = (deals || []).filter(d => {
        if (d.finalized) return false;
        if (['paused', 'cancelled', 'draft'].includes(d.status)) return false;
        const now = Date.now();
        const s = d.start_at ? new Date(d.start_at).getTime() : 0;
        const e = d.end_at ? new Date(d.end_at).getTime() : Infinity;
        return now >= s && now < e;
      });
      const scheduledDeals = (deals || []).filter(d => {
        if (['paused', 'cancelled', 'draft', 'completed', 'failed'].includes(d.status)) return false;
        const s = d.start_at ? new Date(d.start_at).getTime() : 0;
        return Date.now() < s;
      });

      const dealsInvalidStart = (deals || []).filter(d => d.start_at && Number.isNaN(new Date(d.start_at).getTime()));
      const dealsInvalidEnd = (deals || []).filter(d => d.end_at && Number.isNaN(new Date(d.end_at).getTime()));
      const dealsEndBeforeStart = (deals || []).filter(d => d.start_at && d.end_at && new Date(d.end_at) <= new Date(d.start_at));

      // Broken image check
      const brokenImages = [];
      (deals || []).forEach(d => {
        if (d.hero_image && (/drive\.google\.com\/file\/d\//.test(d.hero_image) || d.hero_image.startsWith('blob:'))) {
          brokenImages.push({ type: 'deal', id: d.id, title: d.title, url: d.hero_image.substring(0, 60) });
        }
      });
      (sets || []).forEach(s => {
        if (s.hero_image_url && (s.hero_image_url.startsWith('blob:') || s.hero_image_url.startsWith('http://localhost'))) {
          brokenImages.push({ type: 'suggestion', id: s.id, title: s.title_ar, url: s.hero_image_url.substring(0, 60) });
        }
      });
      (moods || []).forEach(m => {
        if (m.image_url && (m.image_url.startsWith('blob:') || m.image_url.startsWith('http://localhost'))) {
          brokenImages.push({ type: 'mood', id: m.id, title: m.name_ar, url: m.image_url.substring(0, 60) });
        }
      });

      const activeVersion = (versions || []).find(v => v.is_active);

      setReport({
        publishedVersion: activeVersion ? { number: activeVersion.version_number, label: activeVersion.label, published_at: activeVersion.created_date } : null,
        totalMoods: (moods || []).length,
        activeMoods: activeMoods.length,
        moodsWithSuggestions: moodsWithSuggestions.length,
        totalSuggestionSets: (sets || []).length,
        activeSuggestionSets: activeSets.length,
        setsWithMeals: itemsWithMeals.length > 0 ? activeSets.length : 0,
        suggestionItems: (items || []).length,
        itemsWithMeals: itemsWithMeals.length,
        activeDeals: activeDeals.length,
        scheduledDeals: scheduledDeals.length,
        totalDeals: (deals || []).length,
        dealsInvalidStart: dealsInvalidStart.length,
        dealsInvalidEnd: dealsInvalidEnd.length,
        dealsEndBeforeStart: dealsEndBeforeStart.length,
        brokenImages: brokenImages.length,
        brokenImageDetails: brokenImages.slice(0, 5),
        totalMedia: (media || []).length,
        lastPublishTime: activeVersion?.created_date || null,
      });
    } catch (e) {
      console.error('SystemCheck error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  const checkImages = () => {
    setChecking('images');
    setTimeout(() => { run(); setChecking(null); }, 500);
  };
  const runMoodDiag = async () => {
    setMoodDiagLoading(true);
    try {
      const diag = await diagnoseMoods();
      setMoodDiag(diag);
    } catch (e) {
      console.error('Mood diagnostic error', e);
      setMoodDiag({ error: e?.message || 'فشل الفحص' });
    } finally {
      setMoodDiagLoading(false);
    }
  };
  const runDriveDiag = async () => {
    setDriveLoading(true);
    try {
      const res = await base44.functions.invoke('homepageEngine', { action: 'diagnoseDriveImages' });
      setDriveDiag(res?.data?.data || res?.data || null);
    } catch (e) {
      console.error('Drive diagnostic error', e);
      setDriveDiag({ error: e?.message || 'فشل الفحص' });
    } finally { setDriveLoading(false); }
  };
  const migrateDriveImages = async () => {
    if (!confirm('سيتم نسخ صور Google Drive إلى تخزين TAMAM وتحديث السجلات. متابعة؟')) return;
    setDriveMigrating(true);
    try {
      const res = await base44.functions.invoke('homepageEngine', { action: 'migrateDriveImages' });
      const data = res?.data?.data || res?.data || {};
      alert(`تم النسخ: ${data.migrated || 0}\nفشل: ${data.failed || 0}`);
      await runDriveDiag();
    } catch (e) {
      console.error('Drive migration error', e);
      alert('فشل النسخ: ' + (e?.message || ''));
    } finally { setDriveMigrating(false); }
  };
  const reloadPublished = async () => {
    setChecking('reload');
    try {
      // Trigger a re-fetch of published config by clearing any cache
      window.dispatchEvent(new Event('homepage-reload'));
      await run();
    } finally { setChecking(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const r = report || {};
  const Stat = ({ label, value, ok }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className={`font-bold text-sm ${ok === false ? 'text-error' : ok === true ? 'text-primary' : ''}`}>{value}</span>
    </div>
  );

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/admin/homepage')} className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"><Icon name="arrow_forward" /></button>
        <div>
          <h1 className="text-lg font-bold">فحص النظام</h1>
          <p className="text-xs text-on-surface-variant">فحص صحة البيانات المنشورة في الإنتاج</p>
        </div>
      </div>

      <div className="space-y-4">
        <section>
          <h2 className="text-sm font-bold mb-2 px-1">النسخة المنشورة</h2>
          <div className="space-y-1.5">
            <Stat label="النسخة المنشورة" value={r.publishedVersion ? `#${r.publishedVersion.number} — ${r.publishedVersion.label}` : 'لا توجد'} ok={!!r.publishedVersion} />
            <Stat label="آخر نشر" value={r.lastPublishTime ? new Date(r.lastPublishTime).toLocaleString('ar') : '—'} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-2 px-1">المودات</h2>
          <div className="space-y-1.5">
            <Stat label="إجمالي المودات" value={r.totalMoods} />
            <Stat label="المودات النشطة" value={r.activeMoods} ok={r.activeMoods > 0} />
            <Stat label="مودات لها اقتراحات" value={r.moodsWithSuggestions} ok={r.moodsWithSuggestions > 0} />
          </div>
          {moodDiag && !moodDiag.error && (
            <div className="mt-2 bg-surface-container/50 border border-outline-variant/20 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-on-surface-variant mb-1">فحص متعمّق للمودات</p>
              <Stat label="الكيان" value={moodDiag.entityName || 'TamamMood'} />
              <Stat label="مودات بدون أسماء" value={moodDiag.moodsMissingNames} ok={moodDiag.moodsMissingNames === 0} />
              <Stat label="مودات بدون صور" value={moodDiag.moodsMissingImages} ok={moodDiag.moodsMissingImages === 0} />
              <Stat label="مودات بدون اقتراحات" value={moodDiag.moodsWithoutSuggestions} ok={moodDiag.moodsWithoutSuggestions === 0} />
              <Stat label="اقتراحات يتيمة (mood_id مكسور)" value={moodDiag.orphanedSets} ok={moodDiag.orphanedSets === 0} />
              {moodDiag.orphanedSetDetails?.length > 0 && (
                <div className="mt-1 bg-error/10 border border-error/30 rounded-lg p-2 space-y-0.5">
                  {moodDiag.orphanedSetDetails.map((o, i) => (
                    <div key={i} className="text-[10px] text-error">{o.title} → mood_id: {o.mood_id?.substring(0, 12)}...</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {moodDiag?.error && (
            <div className="mt-2 bg-error/10 border border-error/30 rounded-xl p-3 text-xs text-error">{moodDiag.error}</div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold mb-2 px-1">الاقتراحات</h2>
          <div className="space-y-1.5">
            <Stat label="إجمالي Sets" value={r.totalSuggestionSets} />
            <Stat label="Sets نشطة" value={r.activeSuggestionSets} ok={r.activeSuggestionSets > 0} />
            <Stat label="عناصر اقتراح بوجبات" value={r.itemsWithMeals} ok={r.itemsWithMeals > 0} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-2 px-1">العروض الجماعية</h2>
          <div className="space-y-1.5">
            <Stat label="إجمالي العروض" value={r.totalDeals} />
            <Stat label="عروض نشطة" value={r.activeDeals} />
            <Stat label="عروض مجدولة" value={r.scheduledDeals} />
            <Stat label="أوقات بداية غير صالحة" value={r.dealsInvalidStart} ok={r.dealsInvalidStart === 0} />
            <Stat label="أوقات نهاية غير صالحة" value={r.dealsInvalidEnd} ok={r.dealsInvalidEnd === 0} />
            <Stat label="نهاية قبل البداية" value={r.dealsEndBeforeStart} ok={r.dealsEndBeforeStart === 0} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold mb-2 px-1">الصور</h2>
          <div className="space-y-1.5">
            <Stat label="مراجع صور مكسورة" value={r.brokenImages} ok={r.brokenImages === 0} />
            <Stat label="ملفات وسائط" value={r.totalMedia} />
          </div>
          {r.brokenImageDetails?.length > 0 && (
            <div className="mt-2 bg-error/10 border border-error/30 rounded-xl p-3 space-y-1">
              {r.brokenImageDetails.map((b, i) => (
                <div key={i} className="text-xs text-error">{b.type}: {b.title} — {b.url}...</div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold mb-2 px-1">صور Google Drive</h2>
          <div className="space-y-1.5">
            <Stat label="إجمالي روابط Drive" value={driveDiag?.total ?? '—'} />
            <Stat label="ملفات فريدة" value={driveDiag?.uniqueFiles ?? '—'} />
            <Stat label="عامة (تعمل)" value={driveDiag?.publicOk ?? '—'} ok={driveDiag ? driveDiag.publicOk > 0 : undefined} />
            <Stat label="خاصة/مكسورة" value={driveDiag?.private ?? '—'} ok={driveDiag ? driveDiag.private === 0 : undefined} />
            <Stat label="روابط مجلدات" value={driveDiag?.folders ?? '—'} ok={driveDiag ? driveDiag.folders === 0 : undefined} />
          </div>
          {driveDiag?.records?.filter(x => !x.publicOk).slice(0, 6).map((rec, i) => (
            <div key={i} className="mt-2 bg-surface-container/50 border border-outline-variant/20 rounded-lg p-2 text-[10px] space-y-0.5">
              <div className="font-bold text-on-surface-variant">{rec.entity}: {rec.title || rec.id?.substring(0, 8)}</div>
              <div className="text-error">HTTP {rec.httpStatus} · {rec.contentType || '—'}</div>
              <div className="text-on-surface-variant truncate" dir="ltr">{rec.url?.substring(0, 80)}</div>
            </div>
          ))}
          {driveDiag?.error && <div className="mt-2 bg-error/10 border border-error/30 rounded-xl p-3 text-xs text-error">{driveDiag.error}</div>}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={runDriveDiag} disabled={driveLoading} className="px-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              <Icon name="image_search" className="text-[18px]" /> {driveLoading ? 'جاري...' : 'فحص صور Drive'}
            </button>
            <button onClick={migrateDriveImages} disabled={driveMigrating} className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              <Icon name="cloud_upload" className="text-[18px]" /> {driveMigrating ? 'جاري النسخ...' : 'نسخ إلى تخزين TAMAM'}
            </button>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={checkImages} disabled={checking === 'images'} className="px-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <Icon name="image" className="text-[18px]" /> فحص روابط الصور
          </button>
          <button onClick={runMoodDiag} disabled={moodDiagLoading} className="px-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <Icon name="mood" className="text-[18px]" /> {moodDiagLoading ? 'جاري الفحص...' : 'فحص المودات'}
          </button>
          <button onClick={run} className="px-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-bold flex items-center gap-2">
            <Icon name="restaurant" className="text-[18px]" /> فحص الاقتراحات
          </button>
          <button onClick={run} className="px-4 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-sm font-bold flex items-center gap-2">
            <Icon name="schedule" className="text-[18px]" /> فحص أوقات العروض
          </button>
          <button onClick={reloadPublished} disabled={checking === 'reload'} className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <Icon name="refresh" className="text-[18px]" /> إعادة تحميل النسخة المنشورة
          </button>
        </div>
      </div>
    </div>
  );
}