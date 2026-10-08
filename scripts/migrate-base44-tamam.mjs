#!/usr/bin/env node
// One-time copy of TAMAM moods + packages from the published Base44 app into
// Supabase (tables from supabase/migrations/20261009000000_tamam.sql).
//
// Usage (run on your own computer; never commit the service key):
//   PowerShell:
//     $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-base44-tamam.mjs          # dry run
//     $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/migrate-base44-tamam.mjs --write  # copy
//
// Reads only Base44's public endpoints (active moods, active packages and
// their items). Re-running is safe: rows are upserted by their Base44 id.

const BASE44_URL = process.env.BASE44_APP_BASE_URL || "https://crave-it-delivery.base44.app";
const BASE44_APP_ID = process.env.BASE44_APP_ID || "69eb2d67d2208986b7d60a5d";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://dcpqgxlgiitrdozkykbq.supabase.co";

const pick = (row, keys) =>
  Object.fromEntries(keys.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]));
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

export function transform({ moods, sets, items }) {
  return {
    moods: moods.map((m) => ({
      ...pick(m, ["id", "name_ar", "slug", "icon", "description_ar", "image_url"]),
      is_active: m.is_active !== false,
      sort_order: Number(m.sort_order || 0),
    })),
    sets: sets.map((s) => ({
      ...pick(s, ["id", "mood_id", "package_level", "title_ar", "description_ar", "hero_image_url", "badge_text_ar"]),
      title_ar: s.title_ar || s.title || "باقة TAMAM",
      display_price: num(s.display_price),
      display_price_override: num(s.display_price_override),
      is_active: s.is_active !== false,
      sort_order: Number(s.sort_order || 0),
    })),
    items: items
      .filter((i) => i.meal_id && i.restaurant_id)
      .map((i) => ({
        ...pick(i, ["id", "suggestion_set_id", "item_note"]),
        restaurant_id: Number(i.restaurant_id),
        meal_id: Number(i.meal_id),
        variant_id: num(i.variant_id),
        quantity: Math.max(1, Number(i.quantity || 1)),
        selected_addon_ids: i.selected_addon_ids || [],
        selected_drink_ids: i.selected_drink_ids || [],
        is_required: i.is_required !== false,
        sort_order: Number(i.sort_order || 0),
      })),
  };
}

async function base44(action) {
  const res = await fetch(`${BASE44_URL}/api/apps/${BASE44_APP_ID}/functions/homepageEngine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Id": BASE44_APP_ID },
    body: JSON.stringify({ action, payload: {} }),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`Base44 ${action}: ${body.error || res.status}`);
  return body.data;
}

async function upsert(table, rows, key) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
}

export async function main(argv = process.argv.slice(2)) {
  const write = argv.includes("--write");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (write && !key) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY first (Supabase → Project Settings → API).");

  const [moods, catalog] = await Promise.all([base44("getPublicMoods"), base44("getPublicSuggestions")]);
  const data = transform({ moods: moods || [], sets: catalog?.sets || [], items: catalog?.items || [] });
  console.log(`Base44: ${data.moods.length} moods, ${data.sets.length} packages, ${data.items.length} package items`);
  if (!write) {
    console.log("Dry run only. Add --write to copy into Supabase.");
    return data;
  }
  await upsert("tamam_moods", data.moods, key);
  await upsert("tamam_suggestion_sets", data.sets, key);
  await upsert("tamam_suggestion_items", data.items, key);
  console.log("Done. The app now reads TAMAM from Supabase automatically.");
  return data;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate-base44-tamam.mjs")) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
