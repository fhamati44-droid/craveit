import { useNavigate } from 'react-router-dom';

const STEPS = [
  { icon: 'record_voice_over', label: 'إنت تعطينا الحقيقة', desc: 'ساعاتك، قدرة مطبخك، وجباتك، حدودك', tint: 'bg-tamam-green/15 text-tamam-green-bright' },
  { icon: 'insights', label: 'TAMAM تفهم الوقت والقدرة والوجبات', desc: 'بتعرف إمتى هادئ وإمتى ضغط', tint: 'bg-tamam-gold/15 text-tamam-gold' },
  { icon: 'search', label: 'TAMAM تلاقي فرصة', desc: 'بتشوف فترة هادية فيها قدرة وجمهور مناسب', tint: 'bg-tamam-green/15 text-tamam-green-bright' },
  { icon: 'groups', label: 'TAMAM تختار الجمهور والطريقة', desc: 'مين تعرض له، وشو الطريقة المناسبة', tint: 'bg-tamam-surface-high text-tamam-text-muted' },
  { icon: 'rocket_launch', label: 'TAMAM تشغّل الخطة', desc: 'ضمن حدودك، بدون ما تحرق سعر', tint: 'bg-tamam-green/20 text-tamam-green-bright' },
  { icon: 'restaurant', label: 'إنت تجهز الطلب', desc: 'TAMAM بتجيب الزبون، إنت بتعمل الأكلة', tint: 'bg-tamam-gold/15 text-tamam-gold' },
  { icon: 'trending_up', label: 'TAMAM تقيس وتتعلم', desc: 'بتشوف شو اشتغل وبتحسّن المرة الجاية', tint: 'bg-tamam-green/15 text-tamam-green-bright' },
];

export default function PartnerStory() {
  const navigate = useNavigate();
  return (
    <div className="px-4 py-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-text text-[20px]">arrow_forward</span>
        </button>
        <h1 className="font-bold text-lg text-tamam-text">كيف TAMAM بتشتغل مع مطعمك؟</h1>
      </div>

      <div className="space-y-3">
        {STEPS.map((s, i) => (
          <div key={i}>
            <div className="bg-tamam-surface rounded-2xl p-4 flex items-center gap-3 border border-tamam-outline/30">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${s.tint}`}>
                <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-tamam-text leading-tight">{s.label}</p>
                <p className="text-tamam-text-muted text-xs leading-snug mt-0.5">{s.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex justify-center py-1">
                <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">arrow_downward</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}