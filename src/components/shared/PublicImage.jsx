import { resolvePublicImage, PLACEHOLDER_IMAGE, handleImageError } from '@/lib/imageUtils';

/**
 * Shared public image component.
 * Resolves media values (string, object, array) and shows a fallback on error.
 * Prevents infinite onError loops.
 */
export default function PublicImage({ src, fallback = PLACEHOLDER_IMAGE, alt = '', className = '', ...props }) {
  const resolved = resolvePublicImage(src, fallback);
  return (
    <img
      {...props}
      src={resolved || fallback}
      alt={alt}
      className={className}
      onError={(e) => handleImageError(e, fallback)}
    />
  );
}