import { useState, useEffect } from 'react';
import { listMedia, uploadFile, saveMedia } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MediaSelector({ value, onChange, mediaType = 'image' }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => listMedia().then((list) => setMedia((list || []).filter((m) => m.status === 'active'))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const selected = media.find((m) => m.id === value) || null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      const created = await saveMedia({
        media_type: mediaType,
        internal_name: file.name,
        file_url,
        file_size: file.size,
        status: 'active',
      });
      await load();
      onChange(created.id);
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center">
          {selected?.file_url ? <img src={selected.file_url} alt="" className="w-full h-full object-cover" /> : <Icon name="image" className="text-on-surface-variant" />}
        </div>
        <div className="flex-1 text-right">
          <p className="font-bold text-sm">{selected ? (selected.internal_name || 'وسائط مختارة') : 'اختار وسائط'}</p>
          <p className="text-[11px] text-on-surface-variant">{selected ? `${selected.media_type} · ${selected.file_size ? `${Math.round(selected.file_size / 1024)}KB` : ''}` : 'اضغط للاختيار'}</p>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-2 bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden">
          <label className="flex items-center gap-2 p-2 border-b border-outline-variant/20 cursor-pointer bg-primary/5">
            <Icon name="upload" className="text-primary" />
            <span className="text-sm text-primary font-bold">{uploading ? 'عم نرفع...' : 'رفع ملف جديد'}</span>
            <input type="file" accept={mediaType === 'video' ? 'video/*' : 'image/*'} onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          <div className="max-h-72 overflow-y-auto p-2 grid grid-cols-3 gap-2">
            {loading && <p className="col-span-3 text-sm text-on-surface-variant p-4 text-center">عم نحمّل...</p>}
            {!loading && !media.length && <p className="col-span-3 text-sm text-on-surface-variant p-4 text-center">لا توجد وسائط</p>}
            {media.filter((m) => m.media_type === mediaType).map((m) => (
              <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false); }} className={`relative rounded-lg overflow-hidden border-2 ${m.id === value ? 'border-primary' : 'border-transparent'}`}>
                {m.media_type === 'image' ? <img src={m.file_url} alt={m.alt_text || ''} className="w-full h-20 object-cover" /> : <div className="w-full h-20 bg-surface-container-high flex items-center justify-center"><Icon name="movie" className="text-on-surface-variant" /></div>}
                <p className="absolute bottom-0 inset-x-0 bg-background/80 text-[9px] p-1 truncate text-center">{m.internal_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}