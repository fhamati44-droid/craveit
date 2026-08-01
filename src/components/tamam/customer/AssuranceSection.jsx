const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const ITEMS = [
  'تأكيد واضح قبل الدفع',
  'رقم طلب ومرجع توصيل',
  'متابعة مباشرة بعد الشراء',
  'تواصل حسب مرحلة الطلب',
  'نقاط وكوبونات على طلباتك',
  'دعم إذا صار أي إشي',
];

export default function AssuranceSection() {
  return (
    <section className="px-4 py-8">
      <h2 className="text-headline-md font-bold mb-4">إحنا معك بكل مرحلة</h2>
      <div className="grid grid-cols-2 gap-2">
        {ITEMS.map(t => (
          <div key={t} className="flex items-center gap-2 bg-surface-container/50 rounded-xl p-3">
            <Icon name="check_circle" className="text-primary text-[18px] flex-shrink-0" />
            <span className="text-xs">{t}</span>
          </div>
        ))}
      </div>
    </section>
  );
}