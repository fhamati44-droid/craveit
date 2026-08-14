import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveMoods } from '@/lib/tamamApi';
import { runMoodLab } from '@/lib/moodLabEngine';
import { useCart } from '@/lib/CartContext';
import { track } from '@/lib/analytics';
import MoodLabResultCard from '@/components/moodlab/MoodLabResultCard';
import MoodLabSkeleton from '@/components/moodlab/MoodLabSkeleton';
import HomeActiveDealBanner from '@/components/tamam/customer/HomeActiveDealBanner';

const STEPS = ['q1', 'q2', 'q3'];

const COMPANIONS = [
  { key: 'alone', label: 'لحالي', icon: 'person' },
  { key: 'person', label: 'مع شخص', icon: 'person_2' },
  { key: 'family', label: 'مع العيلة', icon: 'family_restroom' },
  { key: 'friends', label: 'مع الأصحاب', icon: 'groups' },
];

const PRIORITIES = [
  { key: 'fastest', label: 'أسرع توصيل', icon: 'bolt' },
  { key: 'budget', label: 'ضمن ميزانية', icon: 'savings' },
  { key: 'satisfying', label: 'وجبة مشبعة', icon: 'restaurant' },
  { key: 'surprise', label: 'اختيار مفاجئ', icon: 'casino' },
  { key: 'deal', label: 'عرض وتوفير', icon: 'local_offer' },
];

export default function MoodLab() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [step, setStep] = useState('q1');
  const [moods, setMoods] = useState([]);
  const [moodsLoading, setMoodsLoading] = useState(true);
  const [answers, setAnswers] = useState({ mood: null, companions: null, priority: null });
  const [computing, setComputing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    track('mood_lab_started', {});
    getActiveMoods().then((list) => setMoods(list || [])).catch(() => {}).finally(() => setMoodsLoading(false));
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const isQuestions = step !== 'results';

  const select = (field, value) => {
    setAnswers((a) => ({ ...a, [field]: value }));
    track('mood_question_answered', { question: field });
  };

  const canAdvance = () => {
    if (step === 'q1') return !!answers.mood;
    if (step === 'q2') return !!answers.companions;
    if (step === 'q3') return !!answers.priority;
    return false;
  };

  const compute = async (moodOverride) => {
    const mood = moodOverride || answers.mood;
    if (!mood) return;
    if (moodOverride) setAnswers((a) => ({ ...a, mood: moodOverride }));
    setStep('results');
    setComputing(true); setError(false);
    track('mood_lab_completed', { companions: answers.companions, priority: answers.priority });
    try {
      const res = await runMoodLab({ mood, companions: answers.companions, priority: answers.priority });
      setResults(res);
      if (res.picks.length) {
        res.picks.forEach((p, i) => track('mood_recommendation_viewed', { meal_id: p.mealId, position: i }));
      } else {
        track('mood_lab_empty', { mood_id: mood.id });
      }
    } catch (e) {
      setError(true);
      track('mood_lab_error', { mood_id: mood.id });
    } finally {
      setComputing(false);
    }
  };

  const next = () => {
    if (!canAdvance()) return;
    if (step === 'q1') setStep('q2');
    else if (step === 'q2') setStep('q3');
    else if (step === 'q3') compute();
  };

  const prev = () => {
    if (step === 'q1') { navigate(-1); return; }
    if (step === 'q2') setStep('q1');
    else if (step === 'q3') setStep('q2');
  };

  const changeMood = () => {
    track('mood_changed', {});
    setResults(null);
    setStep('q1'); // answers preserved so the user can edit them
  };

  const addToCart = (pick) => {
    addItem({
      id: pick.mealId, name: pick.title, price: pick.price, image_url: pick.image,
      quantity: 1, extras: [], mood_id: answers.mood?.id, meal_set_id: pick.setId,
      meal_set_variant_id: pick.variantId, selected_tier: pick.tier,
    }, { id: pick.restaurantId, name: pick.restaurantName });
    track('mood_recommendation_added_to_cart', { meal_id: pick.mealId, mood_id: answers.mood?.id });
    setAddedId(pick.id);
    setTimeout(() => setAddedId(null), 2500);
  };

  // ---------- Question flow (full-screen, hides bottom nav) ----------
  if (isQuestions) {
    const progress = ((stepIndex + 1) / 3) * 100;
    return (
      <div className="fixed inset-0 z-[70] bg-tamam-bg flex flex-col" dir="rtl">
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <button onClick={prev} aria-label="رجوع" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-tamam-surface-high">
            <span className="material-symbols-outlined text-tamam-text">arrow_forward</span>
          </button>
          <h1 className="font-bold text-tamam-text text-base">ساعدنا نلقط مودك</h1>
          <button onClick={() => navigate(-1)} aria-label="إغلاق والعودة للرئيسية" className="w-10 h-10 flex items-center justify-center rounded-full active:bg-tamam-surface-high">
            <span className="material-symbols-outlined text-tamam-text">close</span>
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-tamam-text-muted">{stepIndex + 1} من 3</span>
            <span className="text-xs text-tamam-green-bright font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-tamam-surface-high rounded-full overflow-hidden">
            <div className="h-full bg-tamam-green-bright rounded-full transition-all duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step === 'q1' && (
            <Question title="شو مودك هسا؟" subtitle="اختار المود اللي بقى إسا">
              {moodsLoading ? (
                <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 skeleton-t rounded-2xl" />)}</div>
              ) : moods.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-tamam-text-muted text-sm mb-4">ما في مودات متوفرة هسا.</p>
                  <button onClick={() => navigate('/tamam-suggestions')} className="bg-tamam-green-bright text-tamam-ink px-5 py-2.5 rounded-xl font-bold text-sm active:scale-95">تصفّح الأكل</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {moods.map((m) => {
                    const selected = answers.mood?.id === m.id;
                    return (
                      <button key={m.id} onClick={() => select('mood', m)} aria-pressed={selected}
                        className={`relative h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 p-2 border-2 transition-transform active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-tamam-green/40 ${selected ? 'bg-tamam-green/10 border-tamam-green-bright' : 'bg-tamam-surface border-tamam-outline/30'}`}>
                        {selected && <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-tamam-green-bright flex items-center justify-center"><span className="material-symbols-outlined text-tamam-ink text-[14px]">check</span></span>}
                        <span className="text-3xl">{m.icon || '🍽️'}</span>
                        <span className="text-xs font-bold text-tamam-text text-center leading-tight">{m.name_ar}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Question>
          )}

          {step === 'q2' && (
            <Question title="مع مين الأكلة؟" subtitle="عشان نختار الكمية والباقة المناسبة">
              <div className="grid grid-cols-2 gap-3">
                {COMPANIONS.map((o) => {
                  const selected = answers.companions === o.key;
                  return (
                    <button key={o.key} onClick={() => select('companions', o.key)} aria-pressed={selected}
                      className={`relative h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 border-2 transition-transform active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-tamam-green/40 ${selected ? 'bg-tamam-green/10 border-tamam-green-bright' : 'bg-tamam-surface border-tamam-outline/30'}`}>
                      {selected && <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-tamam-green-bright flex items-center justify-center"><span className="material-symbols-outlined text-tamam-ink text-[14px]">check</span></span>}
                      <span className="material-symbols-outlined text-tamam-green-bright text-[28px]">{o.icon}</span>
                      <span className="text-xs font-bold text-tamam-text">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}

          {step === 'q3' && (
            <Question title="شو الأهم إلك هسا؟" subtitle="نرجّح الاختيارات على أساسها">
              <div className="grid grid-cols-2 gap-3">
                {PRIORITIES.map((o) => {
                  const selected = answers.priority === o.key;
                  return (
                    <button key={o.key} onClick={() => select('priority', o.key)} aria-pressed={selected}
                      className={`relative h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 border-2 transition-transform active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-tamam-green/40 ${selected ? 'bg-tamam-green/10 border-tamam-green-bright' : 'bg-tamam-surface border-tamam-outline/30'}`}>
                      {selected && <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-tamam-green-bright flex items-center justify-center"><span className="material-symbols-outlined text-tamam-ink text-[14px]">check</span></span>}
                      <span className="material-symbols-outlined text-tamam-green-bright text-[26px]">{o.icon}</span>
                      <span className="text-xs font-bold text-tamam-text text-center leading-tight">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Question>
          )}
        </div>

        <div className="px-4 py-3 border-t border-tamam-outline/20 flex gap-2 pb-safe bg-tamam-bg">
          <button onClick={prev} className="h-12 px-5 bg-tamam-surface-high text-tamam-text font-bold rounded-xl active:scale-95 transition-transform motion-reduce:transition-none">
            {step === 'q1' ? 'رجوع' : 'السابق'}
          </button>
          <button onClick={next} disabled={!canAdvance()}
            className={`flex-1 h-12 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-transform motion-reduce:transition-none ${canAdvance() ? 'bg-tamam-green-bright text-tamam-ink active:scale-95' : 'bg-tamam-surface-high text-tamam-text-muted'}`}>
            {step === 'q3' ? <><span className="material-symbols-outlined text-[18px]">rocket_launch</span>انطلق — اختارلي</> : <>التالي <span className="material-symbols-outlined text-[18px]">arrow_back</span></>}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Results (normal page, bottom nav visible) ----------
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <div className="pb-28" dir="rtl">
      <div className="px-4 pt-4 pb-2">
        {answers.mood && (
          <div className="inline-flex items-center gap-2 bg-tamam-green/10 border border-tamam-green/30 rounded-full px-3 py-1 mb-3">
            <span className="text-lg">{answers.mood.icon || '🍽️'}</span>
            <span className="text-xs font-bold text-tamam-green-bright">{answers.mood.name_ar}</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-tamam-green-bright leading-tight">
          {answers.mood ? `لأنك اخترت: ${answers.mood.name_ar}` : 'اختيارات TAMAM إلك'}
        </h1>
        <p className="text-tamam-text-muted text-sm mt-1">جهزنا لك اقتراحات مناسبة لمودك والوقت هسا.</p>
        <button onClick={changeMood} className="mt-3 inline-flex items-center gap-1.5 bg-tamam-surface-high text-tamam-text text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform motion-reduce:transition-none">
          <span className="material-symbols-outlined text-[18px]">tune</span>غيّر المود
        </button>
      </div>

      {computing ? (
        <MoodLabSkeleton />
      ) : error ? (
        <div className="px-4 py-10 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-tamam-error/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-tamam-error text-[32px]">{online ? 'cloud_off' : 'wifi_off'}</span>
          </div>
          <h3 className="font-bold text-tamam-text">{online ? 'صار خلل بالتحميل' : 'ما في اتصال'}</h3>
          <p className="text-tamam-text-muted text-sm max-w-[280px]">{online ? 'جرّب مرة ثانية.' : 'تأكد من اتصالك بالإنترنت وحاول مرة ثانية.'}</p>
          <div className="flex flex-col gap-2 w-full max-w-[260px] mt-1">
            <button onClick={() => compute()} className="h-12 bg-tamam-green-bright text-tamam-ink font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">refresh</span>إعادة المحاولة
            </button>
            <button onClick={() => navigate('/how-tamam-works')} className="h-12 bg-tamam-surface text-tamam-text font-bold rounded-xl active:scale-95">المساعدة والدعم</button>
          </div>
        </div>
      ) : results && results.picks.length > 0 ? (
        <div className="px-4 space-y-4">
          {results.picks.map((p) => (
            <MoodLabResultCard key={p.id} pick={p} onAdd={() => addToCart(p)} added={addedId === p.id} />
          ))}

          {results.groupDeal && (
            <div className="pt-2">
              <HomeActiveDealBanner
                deal={results.groupDeal.deal}
                thresholds={results.groupDeal.thresholds}
                participants={results.groupDeal.participants}
                onOpen={() => { track('mood_lab_group_deal_opened', { deal_id: results.groupDeal.deal?.id }); navigate(`/deals/${results.groupDeal.deal.id}`); }}
              />
            </div>
          )}

          {/* Non-intrusive game CTA (existing mood game) */}
          <button onClick={() => { track('mood_lab_game_cta_clicked', {}); navigate('/tamam-game'); }}
            className="w-full bg-tamam-surface-low border border-tamam-outline/30 rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform motion-reduce:transition-none">
            <div className="w-10 h-10 rounded-xl bg-tamam-green/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tamam-green-bright">sports_esports</span>
            </div>
            <div className="text-right flex-1">
              <p className="text-sm font-bold text-tamam-text">ابني مودك على الطاولة</p>
              <p className="text-[11px] text-tamam-text-muted">لعبة المود جاهزة إذا بدك تتسلّى وتختار.</p>
            </div>
            <span className="material-symbols-outlined text-tamam-text-muted">arrow_back</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-10 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-tamam-surface-high flex items-center justify-center">
            <span className="material-symbols-outlined text-tamam-text-muted text-[32px]">search_off</span>
          </div>
          <h3 className="font-bold text-tamam-text">ما لقينا وجبات بتناسب هالمود هسا.</h3>
          <div className="flex flex-col gap-2 w-full max-w-[260px] mt-1">
            <button onClick={changeMood} className="h-12 bg-tamam-green-bright text-tamam-ink font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">tune</span>غيّر المود
            </button>
            <button onClick={() => navigate('/tamam-suggestions')} className="h-12 bg-tamam-surface text-tamam-text font-bold rounded-xl active:scale-95">تصفّح كل الأكل</button>
          </div>
          {moods.filter((m) => m.id !== answers.mood?.id).slice(0, 4).length > 0 && (
            <div className="mt-4 w-full">
              <p className="text-xs text-tamam-text-muted mb-2">أو جرّب مود ثاني:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {moods.filter((m) => m.id !== answers.mood?.id).slice(0, 4).map((m) => (
                  <button key={m.id} onClick={() => compute(m)}
                    className="inline-flex items-center gap-1.5 bg-tamam-surface border border-tamam-outline/30 rounded-full px-3 py-2 text-xs font-bold text-tamam-text active:scale-95">
                    <span>{m.icon || '🍽️'}</span>{m.name_ar}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Question({ title, subtitle, children }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-tamam-text mb-1">{title}</h2>
      <p className="text-sm text-tamam-text-muted mb-4">{subtitle}</p>
      {children}
    </div>
  );
}