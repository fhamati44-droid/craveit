import { useNavigate } from 'react-router-dom';

const VARIANTS = {
  error: { icon: 'cloud_off', title: 'عذراً، حدث خطأ!', message: 'صار مشكلة تقنية وإحنا بنعالج طلبك. تأكد من اتصالك بالإنترنت وحاول مرة ثانية.' },
  offline: { icon: 'wifi_off', title: 'ما في اتصال', message: 'تأكد من اتصالك بالإنترنت وحاول مرة ثانية.' },
  denied: { icon: 'lock', title: 'ما عندك صلاحية', message: 'ما تقدر توصل لهذا القسم. تواصل مع إدارة المطعم إذا بتعتقد إنه خطأ.' },
  not_found: { icon: 'search_off', title: 'ما لقينا السجل', message: 'هذا العنصر غير موجود أو ما عاد متاح.' },
  server: { icon: 'dns', title: 'مشكلة بالخادم', message: 'صار خطأ مؤقت بالخادم. جرّب مرة ثانية بعد شوية.' },
};

export default function PartnerErrorState({ variant = 'error', title, message, onRetry, onBack }) {
  const navigate = useNavigate();
  const v = VARIANTS[variant] || VARIANTS.error;
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-4">
      <div className="w-20 h-20 rounded-full bg-tamam-error/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-tamam-error text-[40px]">{v.icon}</span>
      </div>
      <h2 className="font-bold text-lg text-tamam-text">{title || v.title}</h2>
      <p className="text-tamam-text-muted text-sm max-w-[280px]">{message || v.message}</p>
      <div className="flex flex-col gap-2 w-full max-w-[260px] mt-2">
        {onRetry && (
          <button onClick={onRetry} className="bg-tamam-green-bright text-tamam-ink py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">refresh</span>حاول مرة ثانية
          </button>
        )}
        {onBack && (
          <button onClick={onBack} className="bg-tamam-surface text-tamam-text py-3 rounded-xl font-bold text-sm active:scale-95">رجوع</button>
        )}
        <button onClick={() => navigate('/partner/home')} className="text-tamam-green-bright text-xs font-bold py-2">العودة للرئيسية</button>
      </div>
    </div>
  );
}