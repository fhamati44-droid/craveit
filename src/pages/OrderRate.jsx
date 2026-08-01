import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const ASPECTS = [
  { id: 'food_rating', label: 'قيّم الطعام', icon: 'restaurant' },
  { id: 'restaurant_rating', label: 'قيّم المطعم', icon: 'storefront' },
  { id: 'delivery_rating', label: 'قيّم التوصيل', icon: 'delivery_dining' },
  { id: 'tamam_rating', label: 'قيّم تجربة TAMAM', icon: 'auto_awesome' },
];
const TAGS = ['طعم ممتاز', 'توصيل سريع', 'تغليف حلو', 'حجم كافي', 'بارد', 'تأخر', 'نظيف', 'يستاهل'];

export default function OrderRate() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState({ food_rating: 0, restaurant_rating: 0, delivery_rating: 0, tamam_rating: 0 });
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTag = (t) => setTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.OrderReview.create({ order_id: Number(orderId), ...ratings, tags, comment });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="pt-10 px-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-4"><Icon name="favorite" className="text-primary text-5xl" /></div>
        <h1 className="text-2xl font-bold mb-2">شكرًا على تقييمك!</h1>
        <p className="text-on-surface-variant mb-6">رأيك بيساعدنا نطوّر خدمتنا.</p>
        <button onClick={() => navigate('/orders')} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold">العودة لطلباتي</button>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8 px-4">
      <div className="flex items-center gap-2 mb-6"><button onClick={() => navigate(`/orders/${orderId}`)} className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center"><Icon name="arrow_forward" /></button><h1 className="text-xl font-bold">قيّم طلبك</h1></div>
      <div className="space-y-5 mb-6">
        {ASPECTS.map(a => (
          <div key={a.id} className="bg-surface-container rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3"><Icon name={a.icon} className="text-primary" /><span className="font-semibold text-sm">{a.label}</span></div>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRatings(r => ({ ...r, [a.id]: n }))}>
                  <Icon name="star" className={`text-4xl transition-all ${n <= ratings[a.id] ? 'text-tertiary' : 'text-outline-variant/50'}`} style={n <= ratings[a.id] ? { fontVariationSettings: "'FILL' 1" } : {}} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface-container rounded-2xl p-4 mb-4">
        <p className="font-semibold text-sm mb-2">وسوم</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(t => <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-full text-xs border ${tags.includes(t) ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant'}`}>{t}</button>)}
        </div>
      </div>
      <div className="bg-surface-container rounded-2xl p-4 mb-6">
        <p className="font-semibold text-sm mb-2">تعليق</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full bg-transparent outline-none resize-none text-sm" placeholder="أضف ملاحظتك..." />
      </div>
      <button onClick={submit} disabled={submitting} className="w-full h-14 bg-primary text-on-primary rounded-full font-bold disabled:opacity-50">إرسال التقييم</button>
    </div>
  );
}