export default function PaymentTrustStrip() {
  const items = ['Visa', 'Google Pay', 'PayPal', 'نقدًا'];
  return (
    <section className="px-4 py-6">
      <h2 className="text-headline-md font-bold mb-1">ادفع بالطريقة اللي بتريحك</h2>
      <p className="text-xs text-on-surface-variant mb-4">الدفع آمن وواضح، وما في رسوم مخفية.</p>
      <div className="flex flex-wrap gap-2">
        {items.map(it => (
          <span key={it} className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-bold">{it}</span>
        ))}
      </div>
    </section>
  );
}