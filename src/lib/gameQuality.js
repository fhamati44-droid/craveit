/**
 * Game quality detection — chooses auto/high/balanced/lite based on device capability.
 */

export function detectQualityMode() {
  if (typeof window === 'undefined') return 'balanced';

  try {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return 'lite';

    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const hasWebGL = !!(window.WebGLRenderingContext || window.WebGL2RenderingContext);
    const isMobile = /iPhone|Android|Mobile/i.test(navigator.userAgent);
    const screenSmall = window.innerWidth <= 430;

    if (!hasWebGL) return 'lite';
    if (cores <= 2 || memory <= 2) return 'lite';
    if (isMobile && screenSmall && dpr >= 3 && cores <= 4) return 'balanced';
    if (cores >= 6 && memory >= 4 && dpr >= 2) return 'high';

    return 'balanced';
  } catch {
    return 'balanced';
  }
}

export function getQualitySettings(mode) {
  const m = mode === 'auto' ? detectQualityMode() : mode;
  switch (m) {
    case 'high':
      return {
        mode: 'high',
        use3D: true,
        shadows: true,
        particles: true,
        dpr: Math.min(window.devicePixelRatio || 2, 3),
        animDuration: 0.4,
        tablePerspective: 'perspective(1000px) rotateX(18deg)',
      };
    case 'balanced':
      return {
        mode: 'balanced',
        use3D: true,
        shadows: false,
        particles: false,
        dpr: Math.min(window.devicePixelRatio || 2, 2),
        animDuration: 0.25,
        tablePerspective: 'perspective(1200px) rotateX(12deg)',
      };
    case 'lite':
      return {
        mode: 'lite',
        use3D: false,
        shadows: false,
        particles: false,
        dpr: 1,
        animDuration: 0.15,
        tablePerspective: 'none',
      };
    default:
      return getQualitySettings('balanced');
  }
}

export const QUALITY_LABELS_AR = { auto: 'تلقائي', high: 'عالية', balanced: 'متوازنة', lite: 'موفّرة' };
export const QUALITY_LABELS_HE = { auto: 'אוטומטי', high: 'גבוהה', balanced: 'מאוזן', lite: 'חיסכון' };