import csv, json, re, sys
D = sys.argv[1]
rows = list(csv.DictReader(open(f"{D}/export.csv", encoding="utf-8")))
N = lambda v: None if v in (None, "", "null") else v.strip()
heb = re.compile("[֐-׿]"); ara = re.compile("[؀-ۿ]")

need_en = json.load(open(f"{D}/need_en.json"))
need_both = json.load(open(f"{D}/need_both.json"))
en = {}; both = {}
for f in ["en_0", "en_1", "en_2", "en_3"]: en.update(json.load(open(f"{D}/{f}.json")))
for f in ["both_0", "both_1"]: both.update(json.load(open(f"{D}/{f}.json")))
EN = {h: en[str(i)] for i, (h, a) in enumerate(need_en)}          # hebrew -> english
BOTH = {h: both[str(i)] for i, h in enumerate(need_both)}         # hebrew -> [ar, en]
AR_FIX = json.load(open(f"{D}/ar_fix.json"))                      # hebrew -> corrected arabic
ar_src = json.load(open(f"{D}/ar_src.json"))
T = json.load(open(f"{D}/tamam_tr.json"))
TAM = {s: T[str(i)] for i, s in enumerate(ar_src)}                 # arabic -> [he, en, ar_fix?]
EN_TITLES = {
  "Sushi, Kept Simple": ["سوشي ببساطة", "סושי, פשוט"],
  "More Variety, Better Mood": ["تنويع أكثر، مزاج أحلى", "יותר גיוון, מצב רוח טוב יותר"],
  "Sushi, Upgraded": ["سوشي بمستوى أعلى", "סושי בגרסה משודרגת"],
  "Classic Sushi for the Road": ["سوشي كلاسيك للطريق", "סושי קלאסי לדרך"],
  "More Variety, Same Easy Mood": ["تنويع أكثر، بنفس المزاج الرايق", "יותר גיוון, אותו מצב רוח רגוע"],
  "A Full Sushi Stop, On the Go": ["وقفة سوشي كاملة عالطريق", "עצירת סושי מלאה, בדרך"],
  "Classic Pizza": ["بيتزا كلاسيك", "פיצה קלאסית"],
  "Mix Pizza": ["بيتزا ميكس", "פיצה מיקס"],
  "Plus Pizza Feast": ["وليمة بيتزا بلس", "סעודת פיצה פלוס"],
}
SPECIAL_NAMES = {"Grilled Chicken Burger": ("برغر دجاج مشوي", "המבורגר עוף על הגריל")}

def he_text(he, cur_ar):
    """Hebrew source -> (arabic, english). Keeps good existing Arabic."""
    if he in AR_FIX: ar = AR_FIX[he]
    elif cur_ar and ara.search(cur_ar) and not heb.search(cur_ar): ar = cur_ar
    elif he in BOTH: ar = BOTH[he][0]
    else: ar = cur_ar if cur_ar and not heb.search(cur_ar) else None
    e = EN.get(he) or (BOTH.get(he) or [None, None])[1]
    return ar, e

def q(v):
    if v is None: return "null"
    assert "$t$" not in v
    return f"$t${v}$t$"

out = ["-- TAMAM translations, step 2 of 2. Generated from your export.",
       "-- Paste into Supabase → SQL Editor → Run. Only fills translation columns",
       "-- (and fixes Arabic that had Hebrew letters or typos). Safe to re-run.",
       "begin;", ""]
stats = {}
shared = {"restaurants": True, "menu_items": True, "menu_categories": False,
          "menu_extra_groups": False, "menu_extras": False}
for tbl, has_desc in shared.items():
    vals = []
    for r in (x for x in rows if x["tbl"] == tbl):
        name, name_ar, desc, desc_ar = N(r["name"]), N(r["name_ar"]), N(r["description"]), N(r["description_ar"])
        if name in ("FADI",) or desc == "AAAAAAA": desc = None   # test data
        n_ar = n_en = n_he = d_ar = d_en = None
        if name and heb.search(name): n_ar, n_en = he_text(name, name_ar)
        elif name in SPECIAL_NAMES: n_ar, n_he = SPECIAL_NAMES[name]; n_en = name
        elif name: n_en = name
        if has_desc and desc and heb.search(desc): d_ar, d_en = he_text(desc, desc_ar)
        # only write Arabic when it changes (missing or corrected)
        if n_ar == name_ar: n_ar = None
        if d_ar == desc_ar: d_ar = None
        cols = [r["id"], n_ar, n_he, n_en] + ([d_ar, d_en] if has_desc else [])
        if any(c is not None for c in cols[1:]):
            vals.append("(" + ", ".join([r["id"]] + [q(c) for c in cols[1:]]) + ")")
    stats[tbl] = len(vals)
    if not vals: continue
    names = "id, name_ar, name_he, name_en" + (", description_ar, description_en" if has_desc else "")
    sets = ["name_ar = coalesce(v.name_ar, t.name_ar)", "name_he = coalesce(v.name_he, t.name_he)",
            "name_en = coalesce(v.name_en, t.name_en)"]
    if has_desc:
        sets += ["description_ar = coalesce(v.description_ar, t.description_ar)",
                 "description_en = coalesce(v.description_en, t.description_en)"]
    out.append(f"-- {tbl}: {len(vals)} rows")
    out.append(f"update public.{tbl} t set\n  " + ",\n  ".join(sets) +
               f"\nfrom (values\n  " + ",\n  ".join(vals) +
               f"\n) as v({names})\nwhere t.id = v.id::bigint;\n")

# TAMAM moods
vals = []
for r in (x for x in rows if x["tbl"] == "tamam_moods"):
    ar = N(r["name_ar"]); d = N(r["description_ar"])
    he_n, en_n = (TAM.get(ar) or [None, None])[:2] if ar else (None, None)
    he_d, en_d = (TAM.get(d) or [None, None])[:2] if d else (None, None)
    vals.append(f"({q(r['id'])}, {q(he_n)}, {q(en_n)}, {q(he_d)}, {q(en_d)})")
stats["tamam_moods"] = len(vals)
out.append(f"-- tamam_moods: {len(vals)} rows")
out.append("update public.tamam_moods t set\n  name_he = coalesce(v.name_he, t.name_he),\n  name_en = coalesce(v.name_en, t.name_en),\n  description_he = coalesce(v.description_he, t.description_he),\n  description_en = coalesce(v.description_en, t.description_en)\nfrom (values\n  " + ",\n  ".join(vals) + "\n) as v(id, name_he, name_en, description_he, description_en)\nwhere t.id = v.id;\n")

# TAMAM packages
vals = []; skipped = []
for r in (x for x in rows if x["tbl"] == "tamam_suggestion_sets"):
    t_ar = N(r["name_ar"]); d_ar = N(r["description_ar"])
    nt_ar = t_he = t_en = nd_ar = d_he = d_en = None
    if t_ar and t_ar in TAM:
        e = TAM[t_ar]; t_he, t_en = e[0], e[1]; nt_ar = e[2] if len(e) > 2 else None
    elif t_ar in EN_TITLES:
        nt_ar, t_he = EN_TITLES[t_ar]; t_en = t_ar
    elif t_ar: skipped.append(t_ar)
    if d_ar and d_ar in TAM:
        e = TAM[d_ar]; d_he, d_en = e[0], e[1]; nd_ar = e[2] if len(e) > 2 else None
    if any([nt_ar, t_he, t_en, nd_ar, d_he, d_en]):
        vals.append(f"({q(r['id'])}, {q(nt_ar)}, {q(t_he)}, {q(t_en)}, {q(nd_ar)}, {q(d_he)}, {q(d_en)})")
stats["tamam_suggestion_sets"] = len(vals)
out.append(f"-- tamam_suggestion_sets: {len(vals)} rows (test rows left as-is: {', '.join(sorted(set(skipped)))})")
out.append("update public.tamam_suggestion_sets t set\n  title_ar = coalesce(v.title_ar, t.title_ar),\n  title_he = coalesce(v.title_he, t.title_he),\n  title_en = coalesce(v.title_en, t.title_en),\n  description_ar = coalesce(v.description_ar, t.description_ar),\n  description_he = coalesce(v.description_he, t.description_he),\n  description_en = coalesce(v.description_en, t.description_en)\nfrom (values\n  " + ",\n  ".join(vals) + "\n) as v(id, title_ar, title_he, title_en, description_ar, description_he, description_en)\nwhere t.id = v.id;\n")
out.append("commit;")
open(f"{D}/2-translations.sql", "w", encoding="utf-8").write("\n".join(out) + "\n")
print(stats, "skipped:", sorted(set(skipped)))
