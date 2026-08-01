import { SECTION_LABELS } from '@/lib/homepageApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function SectionCard({ section, itemSummary, onEdit, onToggle, onDuplicate, dragHandle }) {
  const label = SECTION_LABELS[section.section_type] || section.section_key;
  const now = Date.now();
  const scheduled = section.starts_at && new Date(section.starts_at).getTime() > now;
  const expired = section.ends_at && new Date(section.ends_at).getTime() < now;

  return (
    <div className={`bg-surface-container border rounded-2xl p-4 flex items-center gap-3 ${section.enabled ? 'border-outline-variant/30' : 'border-outline-variant/10 opacity-60'}`}>
      <button {...dragHandle} className="touch-none text-on-surface-variant cursor-grab active:cursor-grabbing"><Icon name="drag_indicator" /></button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm">{label}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${section.enabled ? 'bg-primary/15 text-primary' : 'bg-surface-high text-on-surface-variant'}`}>{section.enabled ? 'مفعّل' : 'مخفي'}</span>
          {scheduled && <span className="text-[10px] bg-tertiary/15 text-tertiary px-2 py-0.5 rounded-full">مجدول</span>}
          {expired && <span className="text-[10px] bg-error/15 text-error px-2 py-0.5 rounded-full">منتهي</span>}
        </div>
        <p className="text-[11px] text-on-surface-variant mt-1 truncate">{section.title || 'بدون عنوان'} · ترتيب {section.display_order} · {itemSummary || 'بدون محتوى'}</p>
        {section.updated_date && <p className="text-[10px] text-on-surface-variant/70 mt-0.5">آخر تحديث: {new Date(section.updated_date).toLocaleString('ar')}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onToggle} title={section.enabled ? 'إخفاء' : 'إظهار'} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-high"><Icon name={section.enabled ? 'visibility_off' : 'visibility'} className="text-on-surface-variant text-xl" /></button>
        <button onClick={onEdit} title="تعديل" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-high"><Icon name="edit" className="text-primary text-xl" /></button>
        <button onClick={onDuplicate} title="تكرار" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-high"><Icon name="content_copy" className="text-on-surface-variant text-xl" /></button>
      </div>
    </div>
  );
}