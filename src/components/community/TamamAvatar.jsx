import { getAvatarDisplay } from '@/lib/avatarSystem';
import TamamAvatarSVG from '@/components/community/TamamAvatarSVG';
import { resolvePublicImage } from '@/lib/imageUtils';

export default function TamamAvatar({ type = 'tamam', avatarKey = 'n1', url, size = 40, className = '', ring = false }) {
  const display = getAvatarDisplay(type, avatarKey, url);
  const ringClass = ring ? 'ring-2 ring-tamam-green/60' : '';
  if (display.type === 'profile' && display.url) {
    return (
      <img
        src={resolvePublicImage(display.url)}
        alt=""
        className={`rounded-full object-cover flex-shrink-0 ${ringClass} ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${ringClass} ${className}`} style={{ width: size, height: size }}>
      <TamamAvatarSVG avatarKey={display.key} size={size} />
    </div>
  );
}