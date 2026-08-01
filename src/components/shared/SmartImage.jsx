import { useState } from 'react';
import { resolvePublicImage, PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

/**
 * Image component that resolves public URLs safely and shows a fallback on error.
 * Props: src, alt, className, fallback (optional element), imgClassName
 */
export default function SmartImage({ src, alt = '', className = '', fallback = null, ...rest }) {
  const [errored, setErrored] = useState(false);
  const resolved = resolvePublicImage(src);

  if (!resolved || errored) {
    return (
      fallback || (
        <div className={`${className} bg-surface-container-high flex items-center justify-center`}>
          <span className="material-symbols-outlined text-on-surface-variant text-2xl">image</span>
        </div>
      )
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}