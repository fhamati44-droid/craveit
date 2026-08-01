import { useState } from 'react';
import { resolvePublicImage } from '@/lib/imageUtils';
import PublicImage from '@/components/shared/PublicImage';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Homepage hero video with poster image fallback.
 * Resolves persistent video URLs and shows the poster image if video fails.
 */
export default function HomepageHeroVideo({ videoUrl, posterUrl, autoPlay = true, loop = true, muted = true, controls = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  const resolvedVideo = resolvePublicImage(videoUrl);
  const resolvedPoster = resolvePublicImage(posterUrl);

  if (failed || !resolvedVideo) {
    return resolvedPoster
      ? <PublicImage src={resolvedPoster} alt="hero" className={className} />
      : (
        <div className={`flex items-center justify-center bg-surface-container-high ${className}`}>
          <Icon name="image" className="text-on-surface-variant text-4xl" />
        </div>
      );
  }

  return (
    <video
      src={resolvedVideo}
      poster={resolvedPoster || undefined}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      controls={controls}
      playsInline
      onError={() => setFailed(true)}
      className={className}
    />
  );
}