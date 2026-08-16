import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutionHeader, ExecutionTabs, ExecutionFilters, TodayTimeline, CenterEmptyState, CenterErrorState } from '@/components/admin/execution/ExecutionChrome';
import ExecutionCard from '@/components/admin/execution/ExecutionCard';
import { getExecutionCenter, seedExecutionDemo, resetExecutionDemo, getAutomationControl, setAutomationControl } from '@/lib/demandExecutionApi';

export default function ExecutionCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('READY');
  const [filters, setFilters] = useState({});
  const [showTimeline, setShowTimeline] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await getExecutionCenter(filters);
      setData(d);
    } catch (e) { setError(e.message || 'load_error'); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // safe periodic refresh (45s) — not aggressive
  useEffect(() => {
    const t = setInterval(() => { if (!loading) load(); }, 45000);
    return () => clearInterval(t);
  }, [load, loading]);

  const onToggleKill = async (paused, reason) => {
    try { await setAutomationControl(paused, reason); await load(); } catch (e) { setError(e.message); }
  };
  const onSeed = async () => { setLoading(true); try { await seedExecutionDemo(); await load(); } catch (e) { setError(e.message); } setLoading(false); };
  const onReset = async () => { setLoading(true); try { await resetExecutionDemo(); await load(); } catch (e) { setError(e.message); } setLoading(false); };

  const counts = data?.counts || {};
  const plans = (data?.groups?.[activeTab]) || [];

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <ExecutionHeader control={data?.automation_control} onToggle={onToggleKill} onSeed={onSeed} onReset={onReset} onRefresh={load} loading={loading} />
      <ExecutionTabs active={activeTab} counts={counts} onChange={setActiveTab} />
      <ExecutionFilters filters={filters} onChange={setFilters} restaurants={data?.restaurants} />
      <div className="px-5 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <button onClick={() => setShowTimeline(!showTimeline)} className="text-xs font-bold text-gray-600 flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${showTimeline ? 'bg-tamam-green' : 'bg-gray-300'}`} /> خط الزمن
        </button>
        <span className="text-[11px] text-gray-400">{data?.total ?? 0} خطة{data?.automation_control?.paused ? ' · التشغيل الآلي موقوف' : ''}</span>
      </div>
      {showTimeline && <TodayTimeline timeline={data?.timeline} onPick={(id) => navigate(`/admin/demand-execution/${id}`)} />}

      <div className="max-w-[1400px] mx-auto px-5 py-5">
        {error && !data ? <CenterErrorState message={error} onRetry={load} />
          : !data && loading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white border border-gray-200 animate-pulse" />)}</div>
          : plans.length === 0 ? <CenterEmptyState tab={activeTab} />
          : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{plans.map((p) => <ExecutionCard key={p.id} plan={p} />)}</div>}
      </div>
    </div>
  );
}