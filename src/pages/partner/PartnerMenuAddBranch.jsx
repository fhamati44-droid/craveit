import { useNavigate } from 'react-router-dom';

/** Copy-from-own-branch flow — deferred to a later Phase 2 turn. */
export default function PartnerMenuAddBranch() {
  const navigate = useNavigate();
  return (
    <div className="p-6 text-center" dir="rtl">
      <span className="material-symbols-outlined text-[36px] text-tamam-text-muted">fork_right</span>
      <h1 className="font-bold text-base text-tamam-text mt-2">نسخ منيو من فرع تابع إلي</h1>
      <p className="text-[12px] text-tamam-text-muted leading-snug mt-1 mb-4 max-w-xs mx-auto">هالخاصية قيد التطوير ضمن المرحلة الثانية. قريبًا رح تقدر تنسخ منيو فرع ثاني لنفس المطعم مع مراجعة التعارض. هلق تقدر تختار أصنافك من الكتالوج.</p>
      <button onClick={() => navigate('/partner/menu/add/catalog')} className="h-12 px-5 rounded-xl bg-tamam-green text-tamam-ink font-bold text-sm">اختار من الكتالوج</button>
      <button onClick={() => navigate('/partner/menu')} className="block mx-auto mt-3 h-11 px-4 text-tamam-text-muted font-bold text-sm">رجوع للمنيو</button>
    </div>
  );
}