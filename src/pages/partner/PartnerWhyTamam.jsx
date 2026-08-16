import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartner } from '@/lib/partnerContext';
import { getWhyTamam } from '@/lib/partnerApi';
import { EmptyState } from '@/components/tamam/customer/States';

export default function PartnerWhyTamam() {
  const { decisionId } = useParams();
  const { activeRestaurant } = usePartner();
  const rid = activeRestaurant?.id;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!rid || !decisionId) return;
    setLoading(true);
    getWhyTamam(rid, decisionId).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, [rid, decisionId]);

  if (loading) return <div className="p-4 space-y-3"><div className="h-40 skeleton-t rounded-2xl" /><div className="h-40 skeleton-t rounded-2xl" /></div>;
  if (error || !data) return <EmptyState icon="⚠️" title="ما قدرنا نحمّل التفاصيل" />;

  const steps = [
    { icon: 'record_voice_over', label: 'إنت قلتلنا', value: data.why.input, tint: 'bg-tamam-green/15 text-tamam-green-bright' },
    { icon: 'flag', label: 'هدفك', value: data.why.goal, tint: 'bg-tamam-gold/15 text-tamam-gold' },
    { icon: 'shield', label: 'حدودك', value: data.why.limits, tint: 'bg-tamam-surface-high text-tamam-text-muted' },
    { icon: 'auto_awesome', label: 'TAMAM عملت', value: data.why.action, tint: 'bg-tamam-green/20 text-tamam-green-bright' },
  ];

  return (
    <div className="px-4 py-4 space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-tamam-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-tamam-text text-[20px]">arrow_forward</span>
        </button>
        <h1 className="font-bold text-lg text-tamam-text">ليش TAMAM اختارت هالفكرة؟</h1>
      </div>

      <p className="text-tamam-text-muted text-xs px-1">TAMAM بتفكر ببيانات مطعمك، مش بس بتشغّل عرض.</p>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="bg-tamam-surface rounded-2xl p-4 flex items-start gap-3 border border-tamam-outline/30">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${s.tint}`}>
                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-tamam-text-muted text-[11px] font-bold">{s.label}</p>
                <p className="text-tamam-text text-sm leading-snug mt-0.5">{s.value}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">arrow_downward</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.explanation && (
        <div className="bg-tamam-surface rounded-2xl p-4 border border-tamam-outline/30">
          <p className="text-tamam-text text-sm leading-relaxed">{data.explanation}</p>
        </div>
      )}

      <div className="bg-tamam-green/10 border border-tamam-green/30 rounded-2xl p-4 flex items-start gap-2">
        <span className="material-symbols-outlined text-tamam-green-bright text-[20px]">lightbulb</span>
        <p className="text-tamam-text-muted text-xs leading-snug">TAMAM ما بتحرق سعر وجبتك الأساسية. بتختار الطريقة المناسبة لهدفك وحدودك.</p>
      </div>
    </div>
  );
}