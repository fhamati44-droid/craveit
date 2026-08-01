const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const CARDS = [
  { icon: 'lock', title: 'دفع آمن', text: 'Visa، Google Pay، PayPal أو نقدًا عند الاستلام.' },
  { icon: 'my_location', title: 'متابعة مباشرة', text: 'بتعرف وين وصل طلبك وشو المرحلة الجاية.' },
  { icon: 'support_agent', title: 'تواصل وقت ما تحتاج', text: 'تواصل مع TAMAM، المطعم أو المندوب حسب مرحلة الطلب.' },
  { icon: 'redeem', title: 'كل طلب إله مكافأة', text: 'بتجمع نقاط وبتحصل على كوبونات تستخدمها بالطلبات الجاية.' },
];

export default function PurchaseJourneyTrustSection() {
  return (
    <section className="px-4 py-8">
      <h2 className="text-headline-md font-bold mb-4">طلبك معنا من أول كبسة لحد باب البيت</h2>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map(c => (
          <div key={c.title} className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2"><Icon name={c.icon} className="text-primary" /></div>
            <h3 className="font-bold text-sm">{c.title}</h3>
            <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}