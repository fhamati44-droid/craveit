import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMedia, saveMedia, deleteMedia, uploadFile } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function HomepageMedia() {
  const navigate = useNavigate();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(() => { listMedia().then((list) => setMedia(list || [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      await saveMedia({ media_type: type, internal_name: file.name, file_url, file_size: file.size, status: 'active' });
      await load();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const archive = async (m) => { await saveMedia({ id: m.id, status: 'archived' }); load(); };
  const remove = async (m) => { if (!confirm('حذف هذا الملف؟')) return; await deleteMedia(m.id); load(); };

  const filtered = media.filter((m) => !query || (m.internal_name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface max-w-2xl mx-auto pb-16">
      <div className="sticky top-0 bg-background/90 backdrop-blur z-20 border-b border-outline-variant/20 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/admin/homepage')} className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center"><Icon name="arrow_back" /></button>
        <h1 className="font-bold text-base flex-1">مكتبة الوسائط</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Upload buttons */}
        <div className="flex gap-2">
          <label className="flex-1 h-12 bg-surface-container border-2 border-dashed border-outline-variant/30 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cursor-pointer">
            <Icon name="image" className="text-primary" />{uploading ? 'عم نرفع...' : 'رفع صورة'}
            <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'image')} className="hidden" disabled={uploading} />
          </label>
          <label className="flex-1 h-12 bg-surface-container border-2 border-dashed border-outline-variant/30 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cursor-pointer">
            <Icon name="movie" className="text-primary" />رفع فيديو
            <input type="file" accept="video/*" onChange={(e) => handleUpload(e, 'video')} className="hidden" disabled={uploading} />
          </label>
        </div>

        {/* Search */}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الملف" className="w-full bg-surface-container rounded-xl p-3 text-sm outline-none border border-outline-variant/30" />

        {/* Grid */}
        {loading ? <p className="text-center text-on-surface-variant py-8">عم نحمّل...</p> : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((m) => (
              <div key={m.id} className="bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden">
                <div className="h-28 bg-surface-container-high">
                  {m.media_type === 'image' ? <img src={m.file_url} alt={m.alt_text || ''} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="movie" className="text-on-surface-variant text-3xl" /></div>}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-bold truncate">{m.internal_name || 'بدون اسم'}</p>
                  <p className="text-[10px] text-on-surface-variant">{m.media_type === 'image' ? 'صورة' : 'فيديو'} · {m.file_size ? `${Math.round(m.file_size / 1024)}KB` : ''}{m.width ? ` · ${m.width}×${m.height}` : ''}{m.duration ? ` · ${m.duration}s` : ''}</p>
                  {m.status === 'archived' && <span className="text-[10px] bg-surface-high px-1.5 py-0.5 rounded">مؤرشف</span>}
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => archive(m)} className="flex-1 text-[10px] bg-surface-high rounded-lg py-1 font-bold">{m.status === 'archived' ? 'تفعيل' : 'أرشفة'}</button>
                    <button onClick={() => remove(m)} className="w-7 h-7 bg-error/10 text-error rounded-lg flex items-center justify-center"><Icon name="delete" className="text-sm" /></button>
                  </div>
                </div>
              </div>
            ))}
            {!filtered.length && !loading && <p className="col-span-2 text-center text-on-surface-variant py-8">لا توجد وسائط</p>}
          </div>
        )}
      </div>
    </div>
  );
}