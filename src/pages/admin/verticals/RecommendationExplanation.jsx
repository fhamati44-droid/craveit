import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import VerticalAdminShell from "@/components/admin/verticals/VerticalAdminShell";
import { getRecommendation, listVerticals, listRestaurants } from "@/lib/verticalApi";

export default function RecommendationExplanation() {
  const { id } = useParams();
  const [rec, setRec] = useState(null);
  const [verticals, setVerticals] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRecommendation(id), listVerticals(), listRestaurants()])
      .then(([r, v, rest]) => { setRec(r); setVerticals(v); setRestaurants(rest); })
      .finally(() => setLoading(false));
  }, [id]);

  const vName = (vid) => verticals.find((x) => x.id === vid)?.name_ar || "—";
  const rName = (rid) => restaurants.find((x) => x.id === rid)?.name_ar || restaurants.find((x) => x.id === rid)?.name || "—";
  let signals = {};
  try { signals = JSON.parse(rec?.source_signals_json || "{}"); } catch {}

  return (
    <VerticalAdminShell title="Recommendation Explanation" subtitle="تفسير التوصية وسلسلة الأسبقية"
      actions={<Link to="/admin/verticals/recommendations" className="h-9 px-3 rounded-lg border text-sm font-bold">رجوع للقائمة</Link>}>
      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : !rec ? <p>ما لقينا التوصية.</p> : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">{rName(rec.restaurant_id)} <span className="text-xs text-muted-foreground">· {vName(rec.vertical_id)}</span></h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rec.status === "draft" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>{rec.status}</span>
            </div>
            <p className="text-sm leading-relaxed bg-muted/40 p-3 rounded-lg">{rec.explanation_ar}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ["Objective", rec.recommended_objective], ["Mechanic", rec.recommended_mechanic], ["Tier", rec.recommended_tier],
              ["Quota", rec.recommended_quota], ["Confidence", rec.confidence_score], ["Daypart", signals.daypart],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-lg border bg-card">
                <p className="text-[11px] text-muted-foreground">{k}</p>
                <p className="font-bold text-sm">{v ?? "—"}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-bold text-sm mb-2">سلسلة الأسبقية (precedence)</h3>
            <div className="space-y-1 text-sm">
              <Row label="historical (طلبات سابقة)" on={signals.historical} />
              <Row label="demand_schedule (جدول يدوي)" on={signals.demand_schedule} />
              <Row label="operational_signal" on={signals.operational_signal} />
              <Row label="vertical_strategy (افتراضي)" on={signals.vertical_strategy} />
              <p className="text-xs text-muted-foreground pt-1">المصدر الفائز: <span className="font-bold text-primary">{signals.demand_source}</span> → {signals.demand_level}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border bg-card">
              <h3 className="font-bold text-sm mb-2">Reason codes</h3>
              <div className="flex flex-wrap gap-1.5">{(rec.reason_codes || []).map((c) => <span key={c} className="text-[11px] bg-muted px-2 py-0.5 rounded">{c}</span>)}</div>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <h3 className="font-bold text-sm mb-2">Missing data</h3>
              {rec.missing_data?.length ? <div className="flex flex-wrap gap-1.5">{rec.missing_data.map((c) => <span key={c} className="text-[11px] bg-destructive/10 text-destructive px-2 py-0.5 rounded">{c}</span>)}</div> : <p className="text-xs text-muted-foreground">كل شي موجود</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border bg-card">
              <h3 className="font-bold text-sm mb-2">Recommended audience</h3>
              <div className="flex flex-wrap gap-1.5">{(rec.recommended_audience || []).map((c) => <span key={c} className="text-[11px] bg-muted px-2 py-0.5 rounded">{c}</span>)}</div>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <h3 className="font-bold text-sm mb-2">Recommended placements</h3>
              <div className="flex flex-wrap gap-1.5">{(rec.recommended_placements || []).map((c) => <span key={c} className="text-[11px] bg-muted px-2 py-0.5 rounded">{c}</span>)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-bold text-sm mb-2">Window</h3>
            <p className="text-sm">{rec.recommended_start_at} → {rec.recommended_end_at}</p>
          </div>
        </div>
      )}
    </VerticalAdminShell>
  );
}

function Row({ label, on }) {
  return <div className="flex items-center gap-2"><span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${on ? "bg-primary border-primary" : "border-muted"}`}>{on && <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}</span><span className="text-xs">{label}</span></div>;
}