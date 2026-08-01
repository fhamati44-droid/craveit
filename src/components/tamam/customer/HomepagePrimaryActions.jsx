import { useNavigate } from 'react-router-dom';
import { PACKAGE_LABEL, PACKAGES } from '@/lib/packageUtils';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

/**
 * Permanent core homepage actions — always visible regardless of CMS config.
 * Contains: TAMAM game, browse restaurants, all suggestions, package tabs (Classic/Mix/Plus).
 * This component must NEVER be removed by CMS section configuration.
 */
export default function HomepagePrimaryActions() {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-headline-lg font-bold leading-tight">
          محتار شو <span className="text-primary italic underline decoration-2">تاكل اليوم؟</span>
        </h1>
        <p className="text-body-md text-on-surface-variant leading-relaxed">
          اختار مودك، وTAMAM يرتّبلك اقتراحات مناسبة بذكاء لمزاجك وميزانيتك.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/tamam-game')}
          className="h-12 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Icon name="auto_awesome" className="text-[20px]" />
          ساعدني أختار
        </button>
        <button
          type="button"
          onClick={() => navigate('/restaurants')}
          className="h-12 bg-surface border border-outline-variant/30 font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Icon name="restaurant" className="text-[20px]" />
          تصفح المطاعم
        </button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-headline-sm font-bold">اقتراحات TAMAM</h2>
          <button
            type="button"
            onClick={() => navigate('/tamam-suggestions?package=all')}
            className="text-primary text-xs font-bold"
          >
            كل الاقتراحات
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {PACKAGES.filter((p) => p !== 'all').map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => navigate(`/tamam-suggestions?package=${p}`)}
              className="flex-none px-5 py-2.5 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant active:scale-95 transition-transform"
            >
              {PACKAGE_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}