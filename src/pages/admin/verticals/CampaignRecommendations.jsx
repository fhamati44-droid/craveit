import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import VerticalAdminShell, { Field } from "@/components/admin/verticals/VerticalAdminShell";
import { listRestaurants, listRecommendations, generateRecommendation, updateRecommendation } from "@/lib/verticalApi";

export default function CampaignRecommendations() {
  const [restaurants, setRestaurants] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState({ rid: "", test_time: "" });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = () => { setLoading(true); Promise.all([listRestaurants(), listRecommendations()]).then(([r, rec]) => { setRestaurants(r); setRows(rec); }).finally(() => setLoading(false)); };
  useEffect(load, []);

  const rName = (id) => restaurants.find((x) => x.id === id)?.name_ar || restaurants.find((x) => x.id === id)?.name || id?.slice(-4) || "—";

  const run = async () => {
    if (!gen.rid) { alert("اختار مطعم"); return; }
    setGenerating(true); setError(null);
    try {
      await generateRecommendation(gen.rid, gen.test_time || undefined);
      load();
    } catch (e) { setError(e?.response?.data?.error || e.message || "خطأ بالتوليد"); }
    finally { setGenerating(false); }
  };

  const setStatus = async (r, status) => { await updateRecommendation(r.id, { status }); load(); };

  return (
    <VerticalAdminShell title="Campaign Recommendations" subtitle="توصيات مولّدة كمسودات — تبقى draft لحد موافقة الأدمن"
      actions={null}>
      <div className="mb-5 p-4 rounded-xl border bg-card space-y-3">
        <h2 className="font-bold text-sm">ولّد توصية جديدة</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Restaurant">
            <select className="w-full h-9 px-2 rounded-lg border" value={gen.rid} onChange={(e) => setGen({ ...gen, rid: e.target.value })}>
              <option value="">—</option>{restaurants.map((r) => <option key={r.id} value={r.id}>{r.name_ar || r.name}</option>)}
            </select>
          </Field>
          <Field label="Test time (optional ISO)" hint="للتجربة بوقت مختلف">
            <input className="w-full h-9 px-2 rounded-lg border" value={gen.test_time} onChange={(e) => setGen({ ...gen, test_time: e.target.value })} placeholder="2026-08-16T13:00:00" />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button onClick={run} disabled={generating} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold">{generating ? "عم يولّد..." : "ولّد توصية"}</button>
      </div>

      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/admin/verticals/recommendations/${r.id}`} className="font-bold hover:underline truncate">{rName(r.restaurant_id)}</Link>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.status === "draft" ? "bg-muted" : r.status === "approved" ? "bg-primary text-primary-foreground" : r.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{r.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.explanation_ar}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{r.recommended_objective}</span>
                <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{r.recommended_mechanic}</span>
                <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{r.recommended_tier}</span>
                <span className="text-[11px] text-muted-foreground">confidence: {r.confidence_score}</span>
              </div>
              {r.status === "draft" && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setStatus(r, "approved")} className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold">موافقة</button>
                  <button onClick={() => setStatus(r, "rejected")} className="h-7 px-3 rounded-lg border text-xs font-bold">رفض</button>
                </div>
              )}
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">ما في توصيات لحد إسا — ولّد وحدة من فوق.</p>}
        </div>
      )}
    </VerticalAdminShell>
  );
}