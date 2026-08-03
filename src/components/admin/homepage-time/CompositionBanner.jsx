/**
 * Composition banner — shows dynamic content percentage and warns when >30%.
 */
export default function CompositionBanner({ stats }) {
  if (!stats) return null;
  const { percentage, time_aware_blocks, total_blocks, warning_ar } = stats;
  const isOver = percentage > 30;

  return (
    <div className={`rounded-xl p-3 mb-4 border ${isOver ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">
          المحتوى المرتبط بالوقت: {time_aware_blocks} من {total_blocks} قسم
        </span>
        <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>{percentage}%</span>
      </div>
      <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      {isOver && warning_ar && (
        <p className="mt-2 text-xs text-red-600 font-medium">{warning_ar}</p>
      )}
    </div>
  );
}