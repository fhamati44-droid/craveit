import { useState } from 'react';
import { listVersions, rollbackToVersion } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function VersionHistory({ onRefresh }) {
  const [versions, setVersions] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => { setOpen(true); listVersions().then(setVersions); };
  const rollback = async (id, num) => {
    if (!confirm(`استرجاع النسخة ${num}؟ سيتم استبدال المسودة الحالية.`)) return;
    setBusy(true);
    try { await rollbackToVersion(id); await load(); onRefresh?.(); } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface"><Icon name="history" />سجل النسخ</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-surface w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">سجل النسخ المنشورة</h3>
              <button onClick={() => setOpen(false)}><Icon name="close" /></button>
            </div>
            {!versions && <p className="text-sm text-on-surface-variant text-center py-8">عم نحمّل...</p>}
            {versions && !versions.length && <p className="text-sm text-on-surface-variant text-center py-8">لا توجد نسخ منشورة بعد</p>}
            {versions?.map((v) => (
              <div key={v.id} className={`bg-surface-container rounded-xl p-3 mb-2 border ${v.is_active ? 'border-primary' : 'border-outline-variant/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm flex items-center gap-2">نسخة {v.version_number} {v.is_rollback && <span className="text-[10px] bg-tertiary/20 text-tertiary px-1.5 py-0.5 rounded">استرجاع</span>}</p>
                    {v.label && <p className="text-[11px] text-on-surface-variant">{v.label}</p>}
                    <p className="text-[10px] text-on-surface-variant/70">{v.published_by_name || ''} · {v.created_date ? new Date(v.created_date).toLocaleString('ar') : ''}</p>
                  </div>
                  {v.is_active ? <span className="text-[10px] bg-primary/15 text-primary px-2 py-1 rounded-full font-bold">نشطة</span> : (
                    <button onClick={() => rollback(v.id, v.version_number)} disabled={busy} className="text-[11px] bg-surface-high px-3 py-1.5 rounded-lg font-bold hover:bg-outline-variant/20 disabled:opacity-50">استرجاع</button>
                  )}
                </div>
                {v.change_summary && <p className="text-[11px] text-on-surface-variant mt-2">{v.change_summary}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}