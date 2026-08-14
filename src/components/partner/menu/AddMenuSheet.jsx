import { Sheet, SheetContent } from '@/components/ui/sheet';

const OPTIONS = [
  { key: 'catalog', icon: 'apps', label: 'اختار من كتالوج تمام', sub: 'أصناف مرتبة وجاهزة تختار منها.', to: '/partner/menu/add/catalog' },
  { key: 'template', icon: 'dashboard_customize', label: 'استخدم نموذج منيو', sub: 'ابدأ من منيو نموذجي وعدّله لمطعمك.', to: '/partner/menu/add/template' },
  { key: 'branch', icon: 'fork_right', label: 'انسخ من فرع تابع إلي', sub: 'انسخ منيو من فرع آخر لنفس المطعم.', to: '/partner/menu/add/branch' },
  { key: 'file', icon: 'upload_file', label: 'ارفع ملف أو صورة', sub: 'CSV، Excel، PDF أو صورة منيو.', to: '/partner/menu/import' },
  { key: 'manual', icon: 'edit_note', label: 'أضف يدوي', sub: 'أنشئ صنف واحد من الصفر.', to: '/partner/menu/items/new' },
];

/** "كيف بدك تضيف الأصناف؟" bottom sheet — 5 clearly visible options. */
export default function AddMenuSheet({ open, onClose, onNavigate }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
      <SheetContent side="bottom" className="bg-tamam-surface text-tamam-text font-tamam" dir="rtl">
        <h2 className="font-bold text-base mb-1">كيف بدك تضيف الأصناف؟</h2>
        <p className="text-[11px] text-tamam-text-muted mb-3">كل صنف بيدخل كمسودة أولًا، وانت تراجعه قبل النشر.</p>
        <div className="grid grid-cols-1 gap-2">
          {OPTIONS.map((o) => (
            <button key={o.key} onClick={() => { onClose?.(); onNavigate?.(o.to); }} className="flex items-center gap-3 rounded-2xl p-3 bg-tamam-surface-low border border-tamam-outline/30 text-right active:scale-[0.99] transition-transform">
              <span className="w-11 h-11 rounded-xl bg-tamam-surface-high flex items-center justify-center text-tamam-green-bright shrink-0"><span className="material-symbols-outlined text-[22px]">{o.icon}</span></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-tamam-text">{o.label}</span>
                <span className="block text-[11px] text-tamam-text-muted leading-snug">{o.sub}</span>
              </span>
              <span className="material-symbols-outlined text-tamam-text-muted text-[20px]" style={{ transform: 'scaleX(-1)' }}>arrow_forward</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}