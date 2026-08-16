import { useState, useEffect } from "react";
import VerticalAdminShell from "@/components/admin/verticals/VerticalAdminShell";
import { listVerticals, listRecommendations } from "@/lib/verticalApi";

/** Compare verticals by recommendation volume + confidence (section 12). */
export default function VerticalPerformanceComparison() {
  const [verticals, setVerticals] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listVerticals(), listRecommendations()]).then(([v, r]) => { setVerticals(v); setRecs(r); }).finally(() => setLoading(false));
  }, []);

  const stats = verticals.map((v) => {
    const vRecs = recs.filter((r) => r.vertical_id === v.id);
    const conf = vRecs.length ? vRecs.reduce((s, r) => s + (r.confidence_score || 0), 0) / vRecs.length : 0;
    const approved = vRecs.filter((r) => r.status === "approved").length;
    return { v, count: vRecs.length, confidence: conf, approved };
  }).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  return (
    <VerticalAdminShell title="Vertical Performance Comparison" subtitle="مقارنة أداء الفيرتكالات حسب التوصيات والثقة">
      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : (
        <div className="space-y-2">
          {stats.map(({ v, count, confidence, approved }) => (
            <div key={v.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><span className="font-bold">{v.name_ar}</span><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v.code}</code></div>
                <span className="text-xs text-muted-foreground">{count} توصية · {approved} موافقة</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
              <p className="text-[11px] text-muted-foreground mt-1">متوسط الثقة: {confidence ? (confidence * 100).toFixed(0) + "%" : "—"}</p>
            </div>
          ))}
          {!stats.length && <p className="text-sm text-muted-foreground">ما في فيرتكالات.</p>}
        </div>
      )}
    </VerticalAdminShell>
  );
}