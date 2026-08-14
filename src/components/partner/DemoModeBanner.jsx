/** Amber, non-blocking banner shown across the partner portal when the active
 *  restaurant is a demo record (is_demo = true). Reminds the owner that nothing
 *  here reaches customers. */
export default function DemoModeBanner() {
  return (
    <div dir="rtl" className="mx-3 mt-2 rounded-xl bg-tamam-gold/15 border border-tamam-gold/40 px-3 py-2 flex items-center gap-2">
      <span className="shrink-0 inline-flex items-center gap-1 bg-tamam-gold/25 text-tamam-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
        <span className="material-symbols-outlined text-[12px]">science</span>وضع تجريبي
      </span>
      <span className="text-[11px] text-tamam-gold font-bold leading-snug truncate">البيانات لا تظهر للعملاء.</span>
    </div>
  );
}