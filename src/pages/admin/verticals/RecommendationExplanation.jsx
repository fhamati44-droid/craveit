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
            <h3 className="font-bold text-sm mb-2">النتيجة النهائية + سلسلة الأسبقية</h3>
            <div className="mb-3 p-2.5 rounded-lg bg-primary/8 border border-primary/20">
              <p className="text-[11px] text-muted-foreground">FINAL</p>
              <p className="font-bold text-sm text-primary">{rec.recommended_objective || "—"} {rec.recommended_mechanic ? `· ${rec.recommended_mechanic}` : ""}</p>
            </div>
            <div className="space-y-1.5">
              {[
                ["1. الأمان التشغيلي", signals.precedence_chain?.operational_safety],
                ["2. الأمان التجاري/التنفيذي", signals.precedence_chain?.commercial_execution_safety],
                ["3. وقائع المطعم الحالية", signals.precedence_chain?.restaurant_current_facts],
                ["4. تجاوز استراتيجي للمطعم", signals.precedence_chain?.restaurant_override],
                ["5. playbook الفيرتكال", signals.precedence_chain?.vertical_playbook],
                ["6. استراتيجية الفترة", signals.precedence_chain?.daypart_strategy],
                ["7. احتياطي عام", signals.precedence_chain?.generic_fallback],
              ].map(([label, layer]) => {
                if (!layer) return null;
                const applied = layer.applied;
                const superseded = layer.superseded;
                return (
                  <div key={label} className="flex items-start gap-2">
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${applied ? "bg-primary border-primary" : "border-muted"}`}>
                      {applied && <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}
                    </span>
                    <div className="min-w-0">
                      <span className={`text-xs ${superseded ? "line-through text-muted-foreground" : "text-foreground"}`}>{label}</span>
                      {layer.detail && <span className="text-[11px] text-muted-foreground mr-1">— {layer.detail}</span>}
                      {superseded && <span className="text-[10px] text-amber-600 font-bold mr-1">[تم تجاوزه]</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground pt-2 mt-2 border-t">المصدر الفائز للطلب: <span className="font-bold text-primary">{signals.demand_source}</span> → {signals.demand_level}</p>
            {signals.source_labels?.length > 0 && (
              <p className="text-[11px] text-muted-foreground pt-1">مصادر التوصية: {signals.source_labels.join(" · ")}</p>
            )}
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