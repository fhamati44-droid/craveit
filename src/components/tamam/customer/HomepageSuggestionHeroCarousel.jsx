import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicImage from '@/components/shared/PublicImage';
import { base44 } from '@/api/base44Client';
import HomeHero from '@/components/tamam/customer/HomeHero';

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80';

/**
 * HomepageSuggestionHeroCarousel — replaces the static "محتار شو تأكل؟" hero with
 * an automatic carousel of real published TAMAM suggestions. Preserves the hero's
 * dimensions (aspect-[4/3], rounded-2xl), position, and TAMAM design language.
 * Falls back to the original static hero when no valid slide exists or while loading.
 */
export default function HomepageSuggestionHeroCarousel({ fallbackHero }) {
  const [slides, setSlides] = useState(null);
  const [settings, setSettings] = useState({ autoplay: true, interval: 5000, show_badge: true, show_price: true, cta_label: 'شوف الاقتراح' });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef(null);
  const touchX = useRef(null);
  const resumeTimer = useRef(null);

  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('homepageEngine', { action: 'getHeroSuggestions' })
      .then((r) => {
        const d = r?.data?.data || r?.data;
        if (cancelled || !d) return;
        setSlides(d.slides || []);
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => { if (!cancelled) setSlides([]); });
    return () => { cancelled = true; };
  }, []);

  // Autoplay — pauses on hover, offscreen, interaction, reduced-motion, single slide, or autoplay disabled
  useEffect(() => {
    if (paused || !slides || slides.length <= 1 || prefersReduced || !settings.autoplay) return;
    const t = window.setInterval(() => setActive((c) => (c + 1) % slides.length), settings.interval || 5000);
    return () => window.clearInterval(t);
  }, [paused, slides, prefersReduced, settings.autoplay, settings.interval]);

  // Pause when the hero leaves the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => setPaused(!entries[0]?.isIntersecting), { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [slides]);

  const poke = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 4500);
  };
  const go = (n) => { poke(); setActive((p) => (p + n + slides.length) % slides.length); };
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1); // RTL: swipe right → previous
    touchX.current = null;
  };

  // Loading or no valid slides → keep the original static hero in place
  if (slides === null || slides.length === 0) return <HomeHero hero={fallbackHero} />;

  const count = slides.length;
  const slide = slides[active];

  return (
    <section className="px-4 pt-4 space-y-4">
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-outline-variant/20"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((s, i) => (
          <div key={s.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 2 : 1 }}>
            <PublicImage source={s.displayImage} fallback={FALLBACK_HERO} alt={s.title} className="w-full h-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" style={{ zIndex: 3 }} />
        {count > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 5 }}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`شريحة ${i + 1}`}
                onClick={() => { poke(); setActive(i); }}
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-tertiary' : 'w-1.5 bg-on-surface/40'}`}
              />
            ))}
          </div>
        )}
        <div className="absolute bottom-4 right-4 left-4 space-y-1.5" style={{ zIndex: 4 }}>
          {settings.show_badge && slide.package_label && (
            <span className="inline-block bg-tertiary text-on-tertiary text-[11px] font-bold px-2.5 py-1 rounded-full mb-1">{slide.package_label}</span>
          )}
          <h1 className="text-headline-lg font-bold leading-tight text-on-surface">{slide.title}</h1>
          {slide.mealPreview?.length > 0 && <p className="text-body-sm text-on-surface-variant leading-snug line-clamp-1">{slide.mealPreview.join(' · ')}</p>}
          {settings.show_price && slide.display_price != null && <p className="text-primary font-bold text-headline-sm">₪{Math.round(slide.display_price)}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Link to={slide.route} className="h-12 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">visibility</span>
          {settings.cta_label}
        </Link>
        <Link to="/tamam-game" className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          ساعدني أختار
        </Link>
      </div>
    </section>
  );
}