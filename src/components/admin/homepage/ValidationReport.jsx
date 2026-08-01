const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function ValidationReport({ report, onPublish, onClose, publishing }) {
  const { canPublish, errors = [], warnings = [] } = report || {};
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-surface w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Icon name="verified" className="text-primary" />تقرير التحقق قبل النشر</h3>
          <button onClick={onClose}><Icon name="close" /></button>
        </div>
        {errors.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-bold text-error mb-2 flex items-center gap-1"><Icon name="error" className="text-xl" />أخطاء تمنع النشر ({errors.length})</p>
            <ul className="space-y-1">{errors.map((e, i) => <li key={i} className="text-xs text-error bg-error/10 rounded-lg p-2">{e}</li>)}</ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-bold text-tertiary mb-2 flex items-center gap-1"><Icon name="warning" className="text-xl" />تحذيرات ({warnings.length})</p>
            <ul className="space-y-1">{warnings.map((w, i) => <li key={i} className="text-xs text-tertiary bg-tertiary/10 rounded-lg p-2">{w}</li>)}</ul>
          </div>
        )}
        {canPublish && errors.length === 0 && (
          <div className="bg-primary/10 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm font-bold text-primary">كل شيء جاهز للنشر ✅</p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 bg-surface-high rounded-xl font-bold text-sm">إغلاق</button>
          <button onClick={onPublish} disabled={!canPublish || publishing} className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-bold text-sm disabled:opacity-50">{publishing ? 'عم ننشر...' : 'نشر التغييرات'}</button>
        </div>
      </div>
    </div>
  );
}