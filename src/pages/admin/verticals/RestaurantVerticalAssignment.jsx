import { useState, useEffect } from "react";
import VerticalAdminShell, { Field } from "@/components/admin/verticals/VerticalAdminShell";
import { listVerticals, listRestaurants, assignVertical, FULFILLMENT_OPTIONS } from "@/lib/verticalApi";

export default function RestaurantVerticalAssignment() {
  const [verticals, setVerticals] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    Promise.all([listVerticals(), listRestaurants()]).then(([v, r]) => { setVerticals(v); setRestaurants(r); }).finally(() => setLoading(false));
  }, []);

  const vName = (id) => verticals.find((x) => x.id === id)?.name_ar || "—";
  const draft = (r) => drafts[r.id] || { primary_vertical_id: r.primary_vertical_id || "", secondary_vertical_ids: r.secondary_vertical_ids || [], fulfillment_type: r.fulfillment_type || "" };
  const setD = (r, k, v) => setDrafts((p) => ({ ...p, [r.id]: { ...draft(r), [k]: v } }));
  const save = async (r) => {
    setSavingId(r.id);
    try { await assignVertical(r.id, draft(r)); setDrafts((p) => { const n = { ...p }; delete n[r.id]; return n; }); }
    catch (e) { alert(e.message); } finally { setSavingId(null); }
  };
  const toggleSecondary = (r, id) => { const d = draft(r); const has = d.secondary_vertical_ids.includes(id); setD(r, "secondary_vertical_ids", has ? d.secondary_vertical_ids.filter((x) => x !== id) : [...d.secondary_vertical_ids, id]); };

  return (
    <VerticalAdminShell title="Restaurant Vertical Assignment" subtitle="ربط كل مطعم بفيرتكاله الأساسي ونوع التوصيل">
      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : (
        <div className="space-y-2">
          {restaurants.map((r) => {
            const d = draft(r);
            const dirty = JSON.stringify(d) !== JSON.stringify({ primary_vertical_id: r.primary_vertical_id || "", secondary_vertical_ids: r.secondary_vertical_ids || [], fulfillment_type: r.fulfillment_type || "" });
            return (
              <div key={r.id} className="p-3 rounded-xl border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div><span className="font-bold">{r.name_ar || r.name}</span>{r.primary_vertical_id && <span className="text-xs text-muted-foreground mr-2">→ {vName(r.primary_vertical_id)}</span>}</div>
                  {dirty && <button onClick={() => save(r)} disabled={savingId === r.id} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold">{savingId === r.id ? "..." : "حفظ"}</button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Primary vertical">
                    <select className="w-full h-9 px-2 rounded-lg border" value={d.primary_vertical_id} onChange={(e) => setD(r, "primary_vertical_id", e.target.value)}>
                      <option value="">—</option>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name_ar}</option>)}
                    </select>
                  </Field>
                  <Field label="Fulfillment type">
                    <select className="w-full h-9 px-2 rounded-lg border" value={d.fulfillment_type} onChange={(e) => setD(r, "fulfillment_type", e.target.value)}>
                      <option value="">—</option>{FULFILLMENT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Secondary verticals">
                  <div className="flex flex-wrap gap-1.5">
                    {verticals.filter((v) => v.id !== d.primary_vertical_id).map((v) => (
                      <button key={v.id} type="button" onClick={() => toggleSecondary(r, v.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${d.secondary_vertical_ids.includes(v.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{v.name_ar}</button>
                    ))}
                  </div>
                </Field>
              </div>
            );
          })}
          {!restaurants.length && <p className="text-sm text-muted-foreground">ما في مطاعم.</p>}
        </div>
      )}
    </VerticalAdminShell>
  );
}