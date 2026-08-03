import { TAMAM_COLORS, SKIN_TONES, HAIR_COLORS, hashKey } from '@/lib/avatarSystem';

/**
 * Renders an SVG avatar as a React element.
 * @param {string} avatarKey - e.g. "f1", "m3", "n5"
 * @param {number} size - pixel diameter
 */
export default function TamamAvatarSVG({ avatarKey = 'n1', size = 48, className = '' }) {
  const { gender, idx } = hashKey(avatarKey);
  const skinTone = SKIN_TONES[(idx - 1) % SKIN_TONES.length];
  const hairColor = HAIR_COLORS[(idx + 2) % HAIR_COLORS.length];
  const bgColors = [TAMAM_COLORS.green, TAMAM_COLORS.greenDark, TAMAM_COLORS.teal, TAMAM_COLORS.gold, TAMAM_COLORS.greenBright, TAMAM_COLORS.surfaceHigh, TAMAM_COLORS.green, TAMAM_COLORS.surfaceHigh];
  const bgColor = bgColors[(idx - 1) % 8];
  const ringColor = TAMAM_COLORS.cream;
  const cx = 50, cy = 50, r = 50;

  let hairPath = null;
  let accessory = null;

  if (gender === 'f') {
    const styles = [
      <path key="h" d="M 20 45 Q 20 25 50 20 Q 80 25 80 45 L 82 80 L 72 75 L 72 50 Q 70 35 50 32 Q 30 35 28 50 L 28 75 L 18 80 Z" fill={hairColor} />,
      <path key="h" d="M 22 42 Q 22 22 50 18 Q 78 22 78 42 L 78 58 Q 78 62 74 60 L 72 45 Q 68 32 50 30 Q 32 32 28 45 L 26 60 Q 22 62 22 58 Z" fill={hairColor} />,
      <>
        <path key="h" d="M 24 40 Q 24 20 50 16 Q 76 20 76 40 L 74 48 Q 70 34 50 32 Q 30 34 26 48 Z" fill={hairColor} />
        <ellipse key="p" cx="78" cy="55" rx="8" ry="18" fill={hairColor} transform="rotate(15 78 55)" />
      </>,
      <>
        <circle key="h" cx="30" cy="32" r="10" fill={hairColor} />
        <circle key="h2" cx="50" cy="24" r="11" fill={hairColor} />
        <circle key="h3" cx="70" cy="32" r="10" fill={hairColor} />
      </>,
      <>
        <path key="h" d="M 24 38 Q 24 20 50 16 Q 76 20 76 38 L 74 46 Q 70 32 50 30 Q 30 32 26 46 Z" fill={hairColor} />
        <rect key="hb" x="22" y="36" width="56" height="5" rx="2.5" fill={TAMAM_COLORS.green} />
      </>,
      <path key="h" d="M 20 42 Q 20 22 50 18 Q 80 22 80 42 L 82 70 L 72 72 L 72 48 Q 70 34 50 32 Q 30 34 28 48 L 28 72 L 18 70 Z M 30 30 L 45 22 L 48 26 Z" fill={hairColor} />,
      <>
        <path key="h" d="M 24 40 Q 24 22 50 18 Q 76 22 76 40 L 74 48 Q 70 34 50 32 Q 30 34 26 48 Z" fill={hairColor} />
        <circle key="b" cx="50" cy="14" r="10" fill={hairColor} />
      </>,
      <path key="h" d="M 18 46 Q 18 24 50 20 Q 82 24 82 46 L 84 88 L 76 84 L 76 50 Q 74 34 50 32 Q 26 34 24 50 L 24 84 L 16 88 Z" fill={hairColor} />,
    ];
    hairPath = styles[(idx - 1) % styles.length];
    if (idx % 4 === 0) {
      accessory = <circle cx="68" cy="48" r="4" fill="none" stroke={TAMAM_COLORS.gold} strokeWidth="2" />;
    }
  } else if (gender === 'm') {
    const styles = [
      <path key="h" d="M 26 38 Q 26 22 50 18 Q 74 22 74 38 L 72 42 Q 68 32 50 30 Q 32 32 28 42 Z" fill={hairColor} />,
      <path key="h" d="M 28 36 Q 28 24 50 20 Q 72 24 72 36 L 70 40 Q 66 32 50 30 Q 34 32 30 40 Z" fill={hairColor} />,
      <path key="h" d="M 24 40 Q 24 20 50 16 Q 76 20 76 40 L 74 42 Q 70 28 50 26 Q 30 28 26 42 Z M 30 22 L 46 18 L 50 24 L 34 28 Z" fill={hairColor} />,
      <>
        <circle key="h" cx="32" cy="28" r="8" fill={hairColor} />
        <circle key="h2" cx="50" cy="22" r="9" fill={hairColor} />
        <circle key="h3" cx="68" cy="28" r="8" fill={hairColor} />
      </>,
      <>
        <path key="h" d="M 26 38 Q 26 22 50 18 Q 74 22 74 38 L 72 42 Q 68 32 50 30 Q 32 32 28 42 Z" fill={hairColor} />
        <path key="bd" d="M 32 55 Q 50 68 68 55 L 66 68 Q 50 74 34 68 Z" fill={hairColor} opacity="0.85" />
      </>,
      <path key="h" d="M 24 36 Q 24 20 50 16 Q 76 20 76 36 L 74 40 Q 70 30 50 28 Q 30 30 26 40 Z" fill={hairColor} />,
      <>
        <path key="h" d="M 26 38 Q 26 26 50 22 Q 74 26 74 38 L 72 42 Q 68 34 50 32 Q 32 34 28 42 Z" fill={hairColor} />
        <path key="cap" d="M 20 30 Q 50 14 80 30 L 80 36 L 20 36 Z" fill={TAMAM_COLORS.surface} />
        <path key="capBrim" d="M 16 36 L 84 36 L 84 40 L 16 40 Z" fill={TAMAM_COLORS.surfaceHigh} />
      </>,
      <>
        <path key="h" d="M 20 42 Q 20 20 50 16 Q 80 20 80 42 L 82 68 L 72 70 L 72 46 Q 70 32 50 30 Q 30 32 28 46 L 28 70 L 18 68 Z" fill={hairColor} />
        <path key="bd" d="M 32 55 Q 50 70 68 55 L 66 70 Q 50 76 34 70 Z" fill={hairColor} opacity="0.85" />
      </>,
    ];
    hairPath = styles[(idx - 1) % styles.length];
    if (idx === 2 || idx === 6) {
      accessory = (
        <>
          <rect x="30" y="44" width="16" height="3" rx="1.5" fill={TAMAM_COLORS.gold} />
          <rect x="54" y="44" width="16" height="3" rx="1.5" fill={TAMAM_COLORS.gold} />
        </>
      );
    }
  } else {
    const styles = [
      <path key="h" d="M 26 38 Q 26 22 50 18 Q 74 22 74 38 L 72 42 Q 68 32 50 30 Q 32 32 28 42 Z" fill={hairColor} />,
      <>
        <path key="h" d="M 28 36 Q 28 26 50 22 Q 72 26 72 36 L 70 40 Q 66 34 50 32 Q 34 34 30 40 Z" fill={hairColor} />
        <path key="cap" d="M 22 30 Q 50 14 78 30 L 78 36 L 22 36 Z" fill={TAMAM_COLORS.green} />
      </>,
      <>
        <path key="h" d="M 26 38 Q 26 20 50 16 Q 74 20 74 38 L 72 42 Q 68 30 50 28 Q 32 30 28 42 Z" fill={hairColor} />
        <rect key="hb" x="24" y="34" width="52" height="5" rx="2.5" fill={TAMAM_COLORS.greenBright} />
      </>,
      <>
        <path key="h" d="M 28 38 Q 28 24 50 20 Q 72 24 72 38 L 70 42 Q 66 32 50 30 Q 34 32 30 42 Z" fill={hairColor} />
        <circle key="tk" cx="50" cy="16" r="8" fill={hairColor} />
      </>,
      <>
        <circle key="h" cx="34" cy="28" r="8" fill={hairColor} />
        <circle key="h2" cx="50" cy="22" r="9" fill={hairColor} />
        <circle key="h3" cx="66" cy="28" r="8" fill={hairColor} />
      </>,
      <path key="h" d="M 30 34 Q 30 26 50 22 Q 70 26 70 34 L 68 38 Q 64 32 50 30 Q 36 32 32 38 Z" fill={hairColor} />,
      <>
        <path key="h" d="M 28 38 Q 28 28 50 24 Q 72 28 72 38 L 70 42 Q 66 34 50 32 Q 34 34 30 42 Z" fill={hairColor} />
        <ellipse key="hat" cx="50" cy="22" rx="26" ry="4" fill={TAMAM_COLORS.surfaceHigh} />
        <rect key="hatTop" x="34" y="10" width="32" height="14" rx="3" fill={TAMAM_COLORS.surface} />
      </>,
      <path key="h" d="M 24 40 Q 24 20 50 16 Q 76 20 76 40 L 74 42 Q 70 28 50 26 Q 30 28 26 42 Z M 30 24 L 46 18 L 50 26 L 34 30 Z" fill={hairColor} />,
    ];
    hairPath = styles[(idx - 1) % styles.length];
    if (idx === 3 || idx === 7) {
      accessory = <circle cx="68" cy="48" r="4" fill="none" stroke={TAMAM_COLORS.greenBright} strokeWidth="2" />;
    }
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill={bgColor} />
      <circle cx={cx} cy={cy} r={r - 1.5} fill="none" stroke={ringColor} strokeWidth="1" opacity="0.3" />
      {hairPath}
      <ellipse cx="50" cy="52" rx="18" ry="20" fill={skinTone} />
      <circle cx="43" cy="49" r="2.2" fill="#1A1A1A" />
      <circle cx="57" cy="49" r="2.2" fill="#1A1A1A" />
      <path d="M 44 60 Q 50 64 56 60" stroke="#8B5A3C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {accessory}
    </svg>
  );
}