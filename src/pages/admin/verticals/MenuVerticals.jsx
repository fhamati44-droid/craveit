import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import VerticalAdminShell, { Field } from "@/components/admin/verticals/VerticalAdminShell";
import { listVerticals, createVertical, updateVertical, deleteVertical, FULFILLMENT_OPTIONS } from "@/lib/verticalApi";

export default function MenuVerticals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); listVerticals().then((r) => setRows(r)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const blank = { code: "", name_ar: "", name_he: "", description: "", active: true, default_fulfillment_type: "ON_DEMAND_PREPARED_FOOD", default_preparation_model: "made_to_order", sort_order: 0 };
  const save = async () => {
    setSaving(true);
    try {
      if (editing.id) await updateVertical(editing.id, editing);
      else await createVertical(editing);
      setEditing(null); load();
    } catch (e) { alert(e.message || "خطأ بالحفظ"); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (!confirm("متأكد من حذف هاد الفيرتكال؟")) return; await deleteVertical(id); load(); };

  return (
    <VerticalAdminShell title="Menu Verticals" subtitle="أنواع الأعمال والمنيوهات — طبقة الأعمال الأساسية"
      actions={<button onClick={() => setEditing(blank)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold">+ فيرتكال جديد</button>}>
      {editing && (
        <div className="mb-5 p-4 rounded-xl border bg-card space-y-3">
          <h2 className="font-bold">{editing.id ? "تعديل" : "فيرتكال جديد"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><input className="w-full h-9 px-2 rounded-lg border" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
            <Field label="ترتيب"><input type="number" className="w-full h-9 px-2 rounded-lg border" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            <Field label="الاسم (عربي)"><input className="w-full h-9 px-2 rounded-lg border" value={editing.name_ar} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} /></Field>
            <Field label="الاسم (عبري)"><input className="w-full h-9 px-2 rounded-lg border" value={editing.name_he} onChange={(e) => setEditing({ ...editing, name_he: e.target.value })} /></Field>
            <Field label="Fulfillment Type">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.default_fulfillment_type} onChange={(e) => setEditing({ ...editing, default_fulfillment_type: e.target.value })}>
                {FULFILLMENT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Preparation Model">
              <select className="w-full h-9 px-2 rounded-lg border" value={editing.default_preparation_model} onChange={(e) => setEditing({ ...editing, default_preparation_model: e.target.value })}>
                {["made_to_order", "batch_prepared", "pre_packaged", "weight_based", "scheduled_prep"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="الوصف"><input className="w-full h-9 px-2 rounded-lg border" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
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
                <div className="flex items-center gap-2">
                  <span className="font-bold">{r.name_ar}</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.code}</code>
                  {!r.active && <span className="text-xs text-destructive">غير نشط</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.description || "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{r.default_fulfillment_type} · {r.default_preparation_model}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Link to={`/admin/verticals/dayparts?v=${r.id}`} className="text-[11px] text-primary font-semibold">Dayparts</Link>
                <Link to={`/admin/verticals/playbooks?v=${r.id}`} className="text-[11px] text-primary font-semibold">Playbooks</Link>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(r)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                <button onClick={() => remove(r.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center"><span className="material-symbols-outlined text-[16px] text-destructive">delete</span></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </VerticalAdminShell>
  );
}