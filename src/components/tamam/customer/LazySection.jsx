import { useState, useEffect, useRef } from 'react';

/** Lazily renders children only when the section approaches the viewport. */
export default function LazySection({ children, minHeight = 200, placeholder = null }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: '300px 0px' });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (visible) return children;
  return <div ref={ref} style={{ minHeight }} className="flex items-center justify-center">{placeholder || <div className="h-32 w-full" />}</div>;
}