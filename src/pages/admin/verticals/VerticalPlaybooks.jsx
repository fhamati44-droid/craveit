import { useState, useEffect } from "react";
import VerticalAdminShell, { Field, ChipMulti } from "@/components/admin/verticals/VerticalAdminShell";
import { listVerticals, listPlaybooks, createPlaybook, updatePlaybook, deletePlaybook, DAYPART_OPTIONS, TIER_OPTIONS, OBJECTIVE_OPTIONS, MECHANIC_OPTIONS } from "@/lib/verticalApi";

export default function VerticalPlaybooks() {
  const params = new URLSearchParams(window.location.search);
  const vId = params.get("v");
  const [verticals, setVerticals] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { listVerticals().then(setVerticals); }, []);
  const load = () => { setLoading(true); listPlaybooks(vId).then(setRows).finally(() => setLoading(false)); };
  useEffect(load, [vId]);

  const vName = (id) => verticals.find((x) => x.id === id)?.name_ar || id?.slice(-4) || "—";
  const blank = { vertical_id: vId || "", name: "", objective: "IMMEDIATE_DEMAND", mechanic: "VALUE_ADD", allowed_dayparts: [], preferred_tiers: [], preferred_mood_ids: [], audience_segments: [], recommended_component_types: [], commercial_rules_json: "", minimum_data_requirements_json: "", priority: 0, active: true };
  const save = async () => { setSaving(true); try { if (editing.id) await updatePlaybook(editing.id, editing); else await createPlaybook(editing); setEditing(null); load(); } catch (e) { alert(e.message); } finally { setSaving(false); } };
  const remove = async (id) => { if (!confirm("حذف؟")) return; await deletePlaybook(id); load(); };

  return (
    <VerticalAdminShell title="Vertical Campaign Playbooks" subtitle="قوالب توصيات قابلة للتعديل — لا تنشر تلقائيا"
      actions={<button onClick={() => setEditing(blank)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold">+ playbook</button>}>
      {editing && (
        <div className="mb-5 p-4 rounded-xl border bg-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vertical">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.vertical_id} onChange={(e) => setEditing({ ...editing, vertical_id: e.target.value })}>
                <option value="">—</option>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name_ar}</option>)}
              </select>
            </Field>
            <Field label="Name (AR)"><input className="w-full h-9 px-2 rounded-lg border" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Objective">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.objective} onChange={(e) => setEditing({ ...editing, objective: e.target.value })}>
                {OBJECTIVE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Mechanic">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.mechanic} onChange={(e) => setEditing({ ...editing, mechanic: e.target.value })}>
                {MECHANIC_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Priority"><input type="number" className="w-full h-9 px-2 rounded-lg border" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Allowed dayparts"><ChipMulti options={DAYPART_OPTIONS} value={editing.allowed_dayparts} onChange={(v) => setEditing({ ...editing, allowed_dayparts: v })} /></Field>
          <Field label="Preferred tiers"><ChipMulti options={TIER_OPTIONS} value={editing.preferred_tiers} onChange={(v) => setEditing({ ...editing, preferred_tiers: v })} /></Field>
          <Field label="Audience segments"><ChipMulti options={["public", "targeted", "first_restaurant_order", "returning_customer", "lapsed_customer", "family", "workplace", "new_customers"]} value={editing.audience_segments} onChange={(v) => setEditing({ ...editing, audience_segments: v })} /></Field>
          <Field label="Component types"><ChipMulti options={["side", "drink", "addon"]} value={editing.recommended_component_types} onChange={(v) => setEditing({ ...editing, recommended_component_types: v })} /></Field>
          <Field label="Commercial rules (JSON)"><textarea className="w-full min-h-[60px] px-2 py-1 rounded-lg border font-mono text-xs" value={editing.commercial_rules_json} onChange={(e) => setEditing({ ...editing, commercial_rules_json: e.target.value })} placeholder='{"max_discount_percent":15}' /></Field>
          <Field label="Min data requirements (JSON)"><textarea className="w-full min-h-[50px] px-2 py-1 rounded-lg border font-mono text-xs" value={editing.minimum_data_requirements_json} onChange={(e) => setEditing({ ...editing, minimum_data_requirements_json: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> نشط</label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold">{saving ? "..." : "حفظ"}</button>
            <button onClick={() => setEditing(null)} className="h-9 px-4 rounded-lg border text-sm">إلغاء</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-muted-foreground">عم نحمّل...</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="p-3 rounded-xl border bg-card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{r.name}</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{vName(r.vertical_id)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.objective} · {r.mechanic} · tiers: {(r.preferred_tiers || []).join("/") || "—"} · dayparts: {(r.allowed_dayparts || []).join(", ") || "any"}</p>
              </div>
              <button onClick={() => setEditing(r)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">edit</span></button>
              <button onClick={() => remove(r.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px] text-destructive">delete</span></button>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">ما في playbooks.</p>}
        </div>
      )}
    </VerticalAdminShell>
  );
}