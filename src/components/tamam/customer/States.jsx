import { RefreshCw } from 'lucide-react';

/** Empty list / no-results state. */
export function EmptyState({ icon = '🍽️', title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-4xl mb-3 opacity-80">{icon}</div>
      <p className="text-tamam-text font-bold text-base mb-1">{title}</p>
      {subtitle && <p className="text-tamam-text-muted text-sm mb-4">{subtitle}</p>}
      {actionLabel && (
        <button onClick={onAction} className="bg-tamam-green text-tamam-ink font-bold text-sm px-5 py-2.5 rounded-full">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Error / load-failure state with retry. */
export function ErrorState({ title = 'صار خطأ', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-tamam-text font-bold mb-1">{title}</p>
      {message && <p className="text-tamam-text-muted text-sm mb-4">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 bg-tamam-surface text-tamam-text font-bold text-sm px-4 py-2.5 rounded-full">
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/** Dark skeleton card matching card dimensions. */
export function SkeletonCard({ kind = 'restaurant' }) {
  return (
    <div className="rounded-2xl bg-tamam-surface overflow-hidden border border-tamam-outline/20">
      <div className="h-28 skeleton-t" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 skeleton-t rounded" />
        <div className="h-3 w-1/2 skeleton-t rounded" />
        {kind === 'suggestion' && <div className="h-8 w-full skeleton-t rounded-xl mt-2" />}
      </div>
    </div>
  );
}