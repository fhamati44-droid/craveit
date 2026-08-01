import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function AdminRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | admin | denied

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (user && user.role === 'admin') setState('admin');
        else setState('denied');
      } catch {
        setState('denied');
      }
    })();
  }, []);

  if (state === 'loading')
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (state === 'denied')
    return (
      <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-error/15 flex items-center justify-center mb-4">
          <Icon name="lock" className="text-error text-4xl" />
        </div>
        <h1 className="text-xl font-bold mb-2">غير مصرح</h1>
        <p className="text-on-surface-variant text-sm mb-6">هذه الصفحة مخصصة للمشرفين فقط.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold">
          العودة للصفحة الرئيسية
        </button>
      </div>
    );

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface">
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/admin/group-deals" className="flex items-center gap-2 font-bold text-primary">
            <Icon name="shield_lock" /> لوحة TAMAM للعروض الجماعية
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-on-surface-variant flex items-center gap-1">
              <Icon name="home" className="text-[18px]" /> الموقع
            </Link>
            <Link to="/tamam-admin" className="text-on-surface-variant flex items-center gap-1">
              <Icon name="dashboard" className="text-[18px]" /> لوحة TAMAM
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}