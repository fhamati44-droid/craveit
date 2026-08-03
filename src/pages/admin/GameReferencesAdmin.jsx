import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Check, X, Eye, EyeOff, Video } from 'lucide-react';
import { adminListReferences, adminAddReference, adminUpdateReference, adminDeleteReference } from '@/lib/communityMoodApi';

const REF_TYPES = [
  { key: 'camera', label: 'حركة كاميرا' },
  { key: 'hand_interaction', label: 'تفاعل اليد' },
  { key: 'table_transformation', label: 'تحول الطاولة' },
  { key: 'food_movement', label: 'حركة الطعام' },
  { key: 'social_reaction', label: 'تفاعل اجتماعي' },
  { key: 'lighting', label: 'إضاءة' },
  { key: 'final_scene', label: 'المشهد النهائي' },
];

export default function GameReferencesAdmin() {
  const navigate = useNavigate();
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    adminListReferences().then((data) => setRefs(data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin/community-moods')} className="text-gray-500 text-sm">← رجوع</button>
            <h1 className="text-xl font-bold">فيديوهات المرجع للعبة</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-1">
            <Plus size={16} /> إضافة فيديو
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800">
          ℹ️ هذه الفيديوهات مراجع تصميمية فقط ولا تُعرض للعملاء. لتفعيل فيديو كمعاينة عامة، فعّل خيار "معاينة عامة".
        </div>

        {loading ? <p className="text-center text-gray-500 py-8">جاري التحميل...</p> : (
          <div className="space-y-3">
            {refs.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {r.file_url && (
                      <video src={r.file_url} className="w-full h-full object-cover" muted preload="metadata" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm">{r.title}</h3>
                    <span className="inline-block bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded mt-1">
                      {REF_TYPES.find((t) => t.key === r.reference_type)?.label || r.reference_type}
                    </span>
                    {r.internal_notes && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{r.internal_notes}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_enabled ? 'مفعّل' : 'معطّل'}
                      </span>
                      {r.is_public_preview && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">معاينة عامة</span>}
                      <span className="text-[10px] text-gray-400">أولوية: {r.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => adminUpdateReference({ id: r.id, is_enabled: !r.is_enabled }).then(load)} className="text-xs px-2 py-1 rounded bg-gray-100">
                    {r.is_enabled ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => adminUpdateReference({ id: r.id, is_public_preview: !r.is_public_preview }).then(load)} className={`text-xs px-2 py-1 rounded ${r.is_public_preview ? 'bg-purple-200 text-purple-700' : 'bg-gray-100'}`}>
                    معاينة عامة
                  </button>
                  <button onClick={() => setEditingId(r.id)} className="text-xs px-2 py-1 rounded bg-gray-100"><Edit2 size={12} /></button>
                  <button onClick={() => confirm('متأكد؟') && adminDeleteReference(r.id).then(load)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {!refs.length && <p className="text-center text-gray-400 py-8">لا يوجد فيديوهات مرجعية بعد</p>}
          </div>
        )}
      </div>

      <AddReferenceSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (data) => { await adminAddReference(data); setShowAdd(false); load(); }}
      />
    </div>
  );
}

function AddReferenceSheet({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ title: '', file_url: '', reference_type: 'camera', internal_notes: '', is_enabled: true, priority: 0 });

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-4 pb-safe" dir="rtl">
            <h2 className="font-bold text-lg mb-3">إضافة فيديو مرجعي</h2>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="العنوان" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="رابط الفيديو" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select value={form.reference_type} onChange={(e) => setForm({ ...form, reference_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                {REF_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} placeholder="ملاحظات داخلية" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              <button onClick={() => onAdd(form)} className="w-full bg-blue-600 text-white font-bold text-sm py-2.5 rounded-lg">إضافة</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}