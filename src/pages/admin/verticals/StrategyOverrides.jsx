import { useState, useEffect } from "react";
import VerticalAdminShell, { Field } from "@/components/admin/verticals/VerticalAdminShell";
import { listRestaurants, listVerticals, assignVertical } from "@/lib/verticalApi";

/** Per-restaurant vertical_strategy_override_json editor (section 6). */
export default function StrategyOverrides() {
  const [restaurants, setRestaurants] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { Promise.all([listRestaurants(), listVerticals()]).then(([r, v]) => { setRestaurants(r); setVerticals(v); }).finally(() => setLoading(false)); }, []);
  const vName = (id) => verticals.find((x) => x.id === id)?.name_ar || "—";

  const open = (r) => { setEditing(r); setJson(r.vertical_strategy_override_json || "{}"); };
  const save = async () => {
    setSaving(true);
    try { JSON.parse(json); } catch { alert("JSON مش صالح"); setSaving(false); return; }
    try { await assignVertical(editing.id, { vertical_strategy_override_json: json }); setEditing(null); } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <VerticalAdminShell title="Strategy Overrides" subtitle="تجاوزات استراتيجية الفيرتكال لكل مطعم (JSON)">
      {editing && (
        <div className="mb-5 p-4 rounded-xl border bg-card space-y-3">
          <h2 className="font-bold">{editing.name_ar || editing.name} <span className="text-xs text-muted-foreground">→ {vName(editing.primary_vertical_id)}</span></h2>
          <Field label="Override JSON" hint="تجاوز daypart/playbook لهاد المطعم فقط">
            <textarea className="w-full min-h-[160px] px-2 py-1 rounded-lg border font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold">{saving ? "..." : "حفظ"}</button>
            <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg border text-sm">إلغاء</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : (
        <div className="space-y-2">
          {restaurants.map((r) => (
            <button key={r.id} onClick={() => open(r)} className="w-full p-3 rounded-xl border bg-card flex items-center gap-3 text-right">
              <div className="flex-1 min-w-0">
                <span className="font-bold">{r.name_ar || r.name}</span>
                <p className="text-[11px] text-muted-foreground truncate">{vName(r.primary_vertical_id)} · {r.vertical_strategy_override_json && r.vertical_strategy_override_json !== "{}" ? "في override" : "ما في override"}</p>
              </div>
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          ))}
        </div>
      )}
    </VerticalAdminShell>
  );
}