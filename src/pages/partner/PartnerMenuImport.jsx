import { useState, useEffect } from 'react';
import { usePartner } from '@/lib/partnerContext';
import { base44 } from '@/api/base44Client';
import { createImportJob, listImportJobs } from '@/lib/partnerApi';
import { downloadCsvTemplate } from '@/lib/restaurantMenuApi';
import { Button } from '@/components/ui/button';

export default function PartnerMenuImport() {
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const [jobs, setJobs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = () => { if (rid) listImportJobs(rid).then(setJobs).catch(() => {}); };
  useEffect(load, [rid]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null); setMsg(null);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = res?.file_url;
      if (!fileUrl) throw new Error('no_url');
      const ext = (file.name.split('.').pop() || 'csv').toLowerCase();
      const file_type = ['xlsx', 'xls'].includes(ext) ? ext : 'csv';
      await createImportJob(rid, { file_url: fileUrl, file_name: file.name, file_type });
      setMsg('تم رفع الملف — بانتظار المعالجة من فريق TAMAM.');
      load();
    } catch {
      setError('صار خطأ بالرفع');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="font-bold text-lg">استيراد المنيو</h1>
      <p className="text-[11px] text-tamam-text-muted">ارفع ملف CSV/Excel. ما بيتعدّل المنيو مباشرة — بيتم استيراد الملف ومراجعته ضمن حدودك التجارية.</p>
      <Button onClick={downloadCsvTemplate} variant="outline" className="w-full border-tamam-outline/40 text-tamam-text">تنزيل نموذج CSV</Button>
      <label className="block">
        <span className={`block w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center cursor-pointer ${uploading ? 'bg-tamam-green-dark text-tamam-ink' : 'bg-tamam-green text-tamam-ink'}`}>
          {uploading ? 'جاري الرفع…' : 'رفع ملف المنيو'}
        </span>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" />
      </label>
      {msg && <p className="text-tamam-green-bright text-xs">{msg}</p>}
      {error && <p className="text-error text-xs">{error}</p>}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold text-tamam-text-muted">ملفات سابقة</p>
        {jobs.length === 0 ? <p className="text-tamam-text-muted text-xs">ما في استيرادات بعد.</p> : jobs.map((j) => (
          <div key={j.id} className="bg-tamam-surface border border-tamam-outline/30 rounded-2xl p-3 text-sm">
            <div className="flex justify-between"><span className="truncate">{j.file_name}</span><span className="text-[10px] text-tamam-text-muted">{j.status}</span></div>
            {j.total_rows ? <p className="text-[11px] text-tamam-text-muted mt-1">{j.valid_rows} صحيح · {j.invalid_rows} خطأ</p> : null}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-tamam-text-muted text-center pt-2">مرحلة المراجعة وحل التعارضات قيد التطوير — رح يتم إشعارك عند توفرها.</p>
    </div>
  );
}