import { useNavigate } from 'react-router-dom';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function MenuImportZone({ restaurantId, onTemplate, onExample, onTamam, onZip, onAddManual, exporting }) {
  const navigate = useNavigate();
  const goImport = () => navigate(`/admin/restaurants/${restaurantId}/import`);

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone — opens the multi-step CSV importer */}
      <button
        onClick={goImport}
        className="group bg-[#1c6d17]/5 rounded-2xl border-2 border-dashed border-[#1c6d17]/30 p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-[#1c6d17]/10 transition-colors cursor-pointer"
      >
        <div className="w-16 h-16 rounded-full bg-[#1c6d17]/20 flex items-center justify-center text-[#1c6d17] mb-1 group-hover:scale-110 transition-transform">
          <Icon name="cloud_upload" className="text-[32px]" />
        </div>
        <h3 className="text-xl font-semibold text-[#181d1a]">استيراد مينيو المطعم</h3>
        <p className="text-sm text-[#40493c] max-w-lg">ارفع ملف CSV فيه أسماء الوجبات، صور المطعم، الوصف، المكونات، السعر الحقيقي وربط كل وجبة بمنتج TAMAM.</p>
        <div className="text-lg text-[#1c6d17] font-medium mt-1">اسحب ملف CSV لهون أو اضغط للرفع</div>
        <p className="text-xs text-[#40493c]/70">CSV بصيغة UTF-8 · الحد الأقصى 10MB</p>
      </button>

      {/* Action links */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#e8efeb]">
        <div className="flex flex-wrap items-center gap-2">
          <ActionLink icon="download" label="تحميل نموذج CSV" onClick={onTemplate} primary />
          <Divider />
          <ActionLink icon="file_present" label="تحميل ملف مثال" onClick={onExample} />
          <Divider />
          <ActionLink icon="list_alt" label={exporting ? 'جاري التحضير...' : 'قائمة منتجات TAMAM'} onClick={onTamam} disabled={exporting} />
          <Divider />
          <ActionLink icon="folder_zip" label="رفع ZIP الصور" onClick={onZip} />
        </div>
        <button onClick={onAddManual} className="px-4 py-2 rounded-lg text-sm font-medium text-[#1c6d17] bg-[#1c6d17]/10 hover:bg-[#1c6d17]/20 transition-colors flex items-center gap-1 shrink-0">
          <Icon name="add" className="text-[20px]" /> إضافة وجبة يدويًا
        </button>
      </div>
    </div>
  );
}

function ActionLink({ icon, label, onClick, primary, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition-colors disabled:opacity-50 ${primary ? 'text-[#1c6d17] hover:bg-[#1c6d17]/5' : 'text-[#40493c] hover:bg-[#ebefeb]'}`}
    >
      <Icon name={icon} className="text-[18px]" /> {label}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-[#c0cab8] hidden sm:block" />;
}