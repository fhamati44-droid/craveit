import { useState, useEffect } from "react";
import VerticalAdminShell, { Field, ChipMulti } from "@/components/admin/verticals/VerticalAdminShell";
import { listVerticals, listDaypartStrategies, createDaypartStrategy, updateDaypartStrategy, deleteDaypartStrategy, DAYPART_OPTIONS, TIER_OPTIONS, OBJECTIVE_OPTIONS, MECHANIC_OPTIONS } from "@/lib/verticalApi";

export default function VerticalDaypartStrategies() {
  const params = new URLSearchParams(window.location.search);
  const vId = params.get("v");
  const [verticals, setVerticals] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { listVerticals().then(setVerticals); }, []);
  const load = () => { setLoading(true); listDaypartStrategies(vId).then(setRows).finally(() => setLoading(false)); };
  useEffect(load, [vId]);

  const vName = (id) => verticals.find((x) => x.id === id)?.name_ar || id?.slice(-4) || "—";
  const blank = { vertical_id: vId || "", day_of_week: null, start_time: "", end_time: "", daypart_type: "LUNCH", demand_expectation: "unknown", recommended_objectives: [], recommended_mechanics: [], preferred_tiers: [], preferred_mood_ids: [], avoid_discounting: false, maximum_discount_percent: 0, priority: 0, active: true };
  const save = async () => { setSaving(true); try { if (editing.id) await updateDaypartStrategy(editing.id, editing); else await createDaypartStrategy(editing); setEditing(null); load(); } catch (e) { alert(e.message); } finally { setSaving(false); } };
  const remove = async (id) => { if (!confirm("حذف؟")) return; await deleteDaypartStrategy(id); load(); };

  return (
    <VerticalAdminShell title="Vertical Daypart Strategies" subtitle="استراتيجيات الفترات الزمنية لكل فيرتكال"
      actions={<button onClick={() => setEditing(blank)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold">+ استراتيجية</button>}>
      {editing && (
        <div className="mb-5 p-4 rounded-xl border bg-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vertical">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.vertical_id} onChange={(e) => setEditing({ ...editing, vertical_id: e.target.value })}>
                <option value="">—</option>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name_ar}</option>)}
              </select>
            </Field>
            <Field label="Daypart Type">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.daypart_type} onChange={(e) => setEditing({ ...editing, daypart_type: e.target.value })}>
                {DAYPART_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Day of week (0=Sun, null=any)"><input type="number" className="w-full h-9 px-2 rounded-lg border" value={editing.day_of_week ?? ""} onChange={(e) => setEditing({ ...editing, day_of_week: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Demand Expectation">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.demand_expectation} onChange={(e) => setEditing({ ...editing, demand_expectation: e.target.value })}>
                {["quiet", "medium", "busy", "unknown"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Start (HH:MM)"><input className="w-full h-9 px-2 rounded-lg border" value={editing.start_time} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} /></Field>
            <Field label="End (HH:MM)"><input className="w-full h-9 px-2 rounded-lg border" value={editing.end_time} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} /></Field>
            <Field label="Max discount %"><input type="number" className="w-full h-9 px-2 rounded-lg border" value={editing.maximum_discount_percent} onChange={(e) => setEditing({ ...editing, maximum_discount_percent: Number(e.target.value) })} /></Field>
            <Field label="Priority"><input type="number" className="w-full h-9 px-2 rounded-lg border" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Recommended objectives"><ChipMulti options={OBJECTIVE_OPTIONS} value={editing.recommended_objectives} onChange={(v) => setEditing({ ...editing, recommended_objectives: v })} /></Field>
          <Field label="Recommended mechanics"><ChipMulti options={MECHANIC_OPTIONS} value={editing.recommended_mechanics} onChange={(v) => setEditing({ ...editing, recommended_mechanics: v })} /></Field>
          <Field label="Preferred tiers"><ChipMulti options={TIER_OPTIONS} value={editing.preferred_tiers} onChange={(v) => setEditing({ ...editing, preferred_tiers: v })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.avoid_discounting} onChange={(e) => setEditing({ ...editing, avoid_discounting: e.target.checked })} /> تجنّب الخصم المباشر</label>
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
                  <span className="font-bold">{r.daypart_type}</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{vName(r.vertical_id)}</span>
                  <span className="text-xs text-muted-foreground">{r.start_time}–{r.end_time}</span>
                  <span className="text-xs font-semibold text-primary">{r.demand_expectation}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">obj: {(r.recommended_objectives || []).join(", ") || "—"} · mech: {(r.recommended_mechanics || []).join(", ") || "—"} · tiers: {(r.preferred_tiers || []).join("/")}</p>
              </div>
              <button onClick={() => setEditing(r)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">edit</span></button>
              <button onClick={() => remove(r.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px] text-destructive">delete</span></button>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">ما في استراتيجيات لهاد الفيرتكال.</p>}
        </div>
      )}
    </VerticalAdminShell>
  );
}