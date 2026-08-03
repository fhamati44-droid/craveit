import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CommunityMoodCard from '@/components/community/CommunityMoodCard';
import ShareSheet from '@/components/community/ShareSheet';
import { getPublishedProposals } from '@/lib/communityMoodApi';
import { ErrorState } from '@/components/tamam/customer/States';

const FILTERS = [
  { key: 'new', label: 'جديد' },
  { key: 'near_target', label: 'قريب من الهدف' },
  { key: 'tamam_picks', label: 'اختيارات TAMAM' },
  { key: 'reached_target', label: 'وصل للهدف' },
];

export default function CommunityMoods() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('new');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareProposal, setShareProposal] = useState(null);

  useEffect(() => {
    setLoading(true);
    getPublishedProposals(filter, 50)
      .then((data) => setProposals(data || []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="min-h-screen bg-tamam-bg text-tamam-text font-tamam pt-safe pb-safe" dir="rtl">
      <div className="max-w-[430px] mx-auto px-4 pt-4 pb-6">
        <h1 className="text-tamam-text font-bold text-xl mb-1">مودات الناس</h1>
        <p className="text-tamam-text-muted text-xs mb-4">شوف المودات اللي عملها الناس وادعم اللي يعجبك</p>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${filter === f.key ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-tamam-text-muted text-sm py-8">جاري التحميل...</div>
        ) : proposals.length === 0 ? (
          <ErrorState icon="🎨" title="لسه ما في مودات" subtitle="كن أول واحد ينشر مود!" actionLabel="ابدأ اللعبة" onAction={() => navigate('/mood-game')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proposals.map((p) => (
              <CommunityMoodCard key={p.id} proposal={p} onShare={setShareProposal} />
            ))}
          </div>
        )}
      </div>

      <ShareSheet proposal={shareProposal} open={!!shareProposal} onClose={() => setShareProposal(null)} />
    </div>
  );
}