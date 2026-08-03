/**
 * Mood route helper — builds the deep link for a specific TAMAM mood.
 * Uses mood slug > key > id, falling back to the game when no identifier exists.
 */
export function getMoodRoute(mood) {
  const id = mood?.slug ?? mood?.key ?? mood?.id;
  if (!id) return '/tamam-game';
  return `/tamam-suggestions?mood=${encodeURIComponent(id)}`;
}