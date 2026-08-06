import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, Download, FileSpreadsheet, Check, AlertTriangle, X, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  parseCsv, downloadCsvTemplate, downloadCsvExample, searchTamamProducts, suggestMappings,
  getMenusForRestaurant, createMenu, createItem, updateItem, createImportBatch,
  buildMappingFields, buildSkuIndex, exportTamamProductsReferenceCsv,
} from '@/lib/restaurantMenuApi';
import { getItemsForRestaurant } from '@/lib/restaurantMenuApi';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

// Destination fields the importer can populate
const DEST_FIELDS = [
  { f: 'restaurant_product_name', aliases: ['name_ar', 'restaurant_product_name', 'اسم الصنف', 'اسم الوجبة', 'الاسم'] },
  { f: 'restaurant_sku', aliases: ['restaurant_sku', 'sku', 'كود', 'رمز'] },
  { f: 'price', aliases: ['price', 'السعر', 'السعر الجديد', 'سعر'] },
  { f: 'compare_at_price', aliases: ['compare_at_price', 'قارن'] },
  { f: 'customer_visible_description', aliases: ['short_description_ar', 'وصف قصير', 'الوصف'] },
  { f: 'full_description_ar', aliases: ['full_description_ar', 'وصف كامل'] },
  { f: 'ingredients_ar', aliases: ['ingredients_ar', 'المكونات'] },
  { f: 'included_items', aliases: ['included_items_ar', 'المشمولات', 'يشمل'] },
  { f: 'allergens_ar', aliases: ['allergens_ar', 'المسببات'] },
  { f: 'portion_description_ar', aliases: ['portion_description_ar', 'الحصة'] },
  { f: 'restaurant_category_name', aliases: ['category', 'القسم', 'category'] },
  { f: 'restaurant_subcategory_name', aliases: ['subcategory', 'القسم الفرعي'] },
  { f: 'menu_section_name', aliases: ['menu_section', 'قائمة'] },
  { f: 'primary_image', aliases: ['primary_image_url', 'صورة', 'الصورة'] },
  { f: 'currency', aliases: ['currency', 'العملة'] },
  { f: 'tax_included', aliases: ['tax_included', 'شامل الضريبة'] },
  { f: 'available_quantity', aliases: ['available_quantity', 'الكمية'] },
  { f: 'preparation_time_override', aliases: ['preparation_time_min', 'تجهيز'] },
  { f: 'delivery_fee_override', aliases: ['delivery_fee_override', 'توصيل'] },
  { f: 'minimum_order_override', aliases: ['minimum_order_override', 'أدنى طلب'] },
  { f: 'available_days', aliases: ['available_days', 'الأيام'] },
  { f: 'available_from_time', aliases: ['available_from_time', 'من ساعة'] },
  { f: 'available_until_time', aliases: ['available_until_time', 'إلى ساعة'] },
  { f: 'meal_id', aliases: ['tamam_product_id', 'tamam', 'id المنتج'] },
  { f: 'meal_name_snapshot', aliases: ['tamam_product_name', 'اسم تمام'] },
  { f: 'internal_notes', aliases: ['internal_notes', 'ملاحظات'] },
];

function guessMapping(headers) {
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, '');
  const map = {};
  for (const d of DEST_FIELDS) {
    const found = headers.find((h) => d.aliases.some((a) => norm(h) === norm(a)));
    if (found) map[d.f] = found;
  }
  return map;
}

function buildRow(raw, mapping) {
  const data = {};
  for (const d of DEST_FIELDS) {
    const src = mapping[d.f];
    if (src && raw[src] != null) data[d.f] = String(raw[src]).trim();
  }
  data.__row = raw.__row;
  return data;
}

function validateRow(data, allSkus) {
  const errors = [];
  const name = data.restaurant_product_name;
  if (!name) errors.push('الاسم مطلوب');
  const price = Number(data.price);
  if (data.price === '' || data.price == null || isNaN(price) || price <= 0) errors.push('السعر غير صالح');
  if (data.restaurant_sku) {
    if (allSkus.has(data.restaurant_sku)) errors.push('SKU مكرر');
    else allSkus.add(data.restaurant_sku);
  }
  return errors;
}

export default function RestaurantMenuImport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validated, setValidated] = useState([]);
  const [menus, setMenus] = useState([]);
  const [menuId, setMenuId] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [suggCache, setSuggCache] = useState({});
  const [blankMode, setBlankMode] = useState('keep'); // keep | clear
  const [showTamamRef, setShowTamamRef] = useState(false);
  const [tamamProducts, setTamamProducts] = useState([]);
  const [refSearch, setRefSearch] = useState('');
  const [refLoading, setRefLoading] = useState(false);

  const onFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    const parsed = parseCsv(text);
    if (!parsed.length) { alert('الملف فارغ أو غير صالح'); return; }
    const hdrs = Object.keys(parsed[0]).filter((k) => k !== '__row');
    setHeaders(hdrs);
    setRows(parsed);
    setMapping(guessMapping(hdrs));
    setStep('mapping');
  };

  const runValidation = () => {
    const allSkus = new Set();
    const out = rows.map((raw) => {
      const data = buildRow(raw, mapping);
      const errors = validateRow(data, allSkus);
      const hasMapping = !!data.meal_id;
      const status = errors.length ? 'error' : (hasMapping ? 'ready' : 'review');
      return { data, errors, status };
    });
    setValidated(out);
    setStep('review');
  };

  const groups = {
    ready: validated.filter((v) => v.status === 'ready'),
    review: validated.filter((v) => v.status === 'review'),
    error: validated.filter((v) => v.status === 'error'),
  };

  const runSuggestion = async (rowIdx) => {
    const v = validated[rowIdx];
    const name = v.data.restaurant_product_name;
    if (!name) return;
    const prods = await searchTamamProducts(name);
    const sugg = suggestMappings(name, prods);
    setSuggCache((c) => ({ ...c, [rowIdx]: sugg }));
  };
  const confirmSuggestion = (rowIdx, product) => {
    setValidated((arr) => arr.map((v, i) => i === rowIdx ? { ...v, data: { ...v.data, meal_id: String(product.id), meal_name_snapshot: product.name_ar || product.name }, status: 'ready' } : v));
    setSuggCache((c) => ({ ...c, [rowIdx]: undefined }));
  };

  const downloadErrors = () => {
    const lines = ['row,errors,name,price'];
    groups.error.forEach((v) => lines.push(`${v.data.__row},"${(v.errors.join('; ')).replace(/"/g, '""')}","${(v.data.restaurant_product_name || '').replace(/"/g, '""')}","${v.data.price || ''}"`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'import_errors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const loadTamamRef = async (q) => {
    setRefSearch(q);
    setRefLoading(true);
    try { setTamamProducts(await searchTamamProducts(q || '')); } finally { setRefLoading(false); }
  };
  const doImport = async () => {
    setImporting(true);
    try {
      const allMenus = await getMenusForRestaurant(id);
      setMenus(allMenus || []);
      let mId = menuId;
      if (!mId) {
        const m = await createMenu({ restaurant_id: id, name_ar: 'مينيو مستورد', internal_name: 'imported', active: true });
        mId = m.id;
      }
      const existing = await getItemsForRestaurant(id);
      const skuIndex = buildSkuIndex(existing || []);
      const batch = await createImportBatch({
        restaurant_id: id, restaurant_menu_id: mId, file_name: fileName, import_type: 'csv',
        total_rows: validated.length, successful_rows: groups.ready.length,
        warning_rows: groups.review.length, failed_rows: groups.error.length,
        status: groups.error.length ? 'completed_with_warnings' : 'completed', completed_at: new Date().toISOString(),
      });
      let created = 0, updated = 0, unmapped = 0, imageWarnings = 0;
      const reportLines = ['row,status,sku,name,action,note'];
      for (const v of [...groups.ready, ...groups.review]) {
        const d = v.data;
        const sku = d.restaurant_sku || '';
        const existingItem = sku ? skuIndex.get(sku) : null;
        const mapping = buildMappingFields({ tamam_product_id: d.meal_id, tier: d.tier, meal_set_variant_id: d.meal_set_variant_id, meal_set_id: d.meal_set_id });
        const hasImage = !!d.primary_image;
        if (!hasImage) imageWarnings++;
        const fields = {
          restaurant_id: id, restaurant_menu_id: mId, import_batch_id: batch.id,
          restaurant_product_name: d.restaurant_product_name || '',
          restaurant_sku: sku || undefined,
          price: Number(d.price),
          currency: d.currency || 'ILS', tax_included: d.tax_included !== 'false',
          customer_visible_description: d.customer_visible_description || '',
          full_description_ar: d.full_description_ar || '',
          ingredients_ar: d.ingredients_ar || '', included_items: d.included_items || '', allergens_ar: d.allergens_ar || '',
          portion_description_ar: d.portion_description_ar || '', restaurant_category_name: d.restaurant_category_name || '',
          restaurant_subcategory_name: d.restaurant_subcategory_name || '', menu_section_name: d.menu_section_name || '',
          primary_image: d.primary_image || '', available_quantity: d.available_quantity ? Number(d.available_quantity) : null,
          preparation_time_override: d.preparation_time_override ? Number(d.preparation_time_override) : null,
          delivery_fee_override: d.delivery_fee_override ? Number(d.delivery_fee_override) : null,
          minimum_order_override: d.minimum_order_override ? Number(d.minimum_order_override) : null,
          available_from_time: d.available_from_time || '', available_until_time: d.available_until_time || '',
          meal_name_snapshot: d.meal_name_snapshot || '', active: true, available: true,
          ...mapping,
        };
        // Remove undefined so we don't blank existing on update
        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);
        // Blank-cell handling: in "keep" mode, drop blank CSV values so existing are preserved
        if (blankMode === 'keep') {
          Object.keys(fields).forEach((k) => {
            if (fields[k] === '' || fields[k] == null) delete fields[k];
          });
          // Always force these even if blank
          fields.price = Number(d.price);
          if (mapping.mapped_tamam_product_id != null) fields.mapped_tamam_product_id = mapping.mapped_tamam_product_id;
        }
        if (existingItem) {
          // Mapping change requires explicit confirmation — only overwrite mapping if the new CSV provides one.
          if (mapping.mapped_tamam_product_id == null) delete fields.mapped_tamam_product_id;
          if (mapping.mapped_meal_set_variant_id == null) delete fields.mapped_meal_set_variant_id;
          await updateItem(existingItem.id, fields);
          updated++;
          reportLines.push(`${d.__row},updated,${sku},"${(d.restaurant_product_name || '').replace(/"/g, '""')}",update,SKU match`);
        } else {
          await createItem(fields);
          created++;
          reportLines.push(`${d.__row},created,${sku},"${(d.restaurant_product_name || '').replace(/"/g, '""')}",create,`);
        }
        if (mapping.mapped_tamam_product_id == null) unmapped++;
      }
      setResults({ created, updated, unmapped, imageWarnings, errors: groups.error.length, total: validated.length, reportLines });
      setStep('done');
    } catch (e) { alert('فشل الاستيراد: ' + (e?.message || e)); }
    finally { setImporting(false); }
  };

  const reset = () => { setStep('upload'); setRows([]); setValidated([]); setResults(null); setFileName(''); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div dir="rtl" className="font-tamam max-w-2xl space-y-4">
      <button onClick={() => navigate(`/admin/restaurants/${id}/menu`)} className="flex items-center gap-1 text-on-surface-variant text-sm"><ArrowRight size={16} /> مينيو المطعم</button>
      <h1 className="text-xl font-bold">استيراد مينيو CSV</h1>
      <p className="text-xs text-on-surface-variant">الحد الأدنى: اسم الوجبة + السعر. الربط بمنتج TAMAM يُحدد لاحقًا. لا تُعدّل بيانات TAMAM.</p>

      {step !== 'done' && (
        <div className="flex items-center gap-2 text-xs">
          {['upload', 'mapping', 'review'].map((s, i) => (
            <span key={s} className={`px-2.5 py-1 rounded-full font-bold ${step === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{i + 1}. {s === 'upload' ? 'رفع الملف' : s === 'mapping' ? 'ربط الأعمدة' : 'مراجعة'}</span>
          ))}
        </div>
      )}

      {step === 'upload' && (
        <div className="bg-surface-container rounded-2xl p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadCsvTemplate} className="flex items-center gap-1.5 text-sm bg-surface-container-high px-3 py-2 rounded-lg font-bold"><Download size={15} /> تحميل نموذج CSV</button>
            <button onClick={downloadCsvExample} className="flex items-center gap-1.5 text-sm bg-surface-container-high px-3 py-2 rounded-lg font-bold"><Download size={15} /> تحميل نموذج مع مثال</button>
          </div>
          <label className="block border-2 border-dashed border-outline-variant/40 rounded-2xl p-8 text-center cursor-pointer hover:border-primary">
            <FileSpreadsheet size={32} className="mx-auto text-on-surface-variant mb-2" />
            <p className="text-sm font-bold">اختر ملف CSV</p>
            <p className="text-xs text-on-surface-variant">UTF-8 — لا نشترط نفس عناوين القالب</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <HelpPanel onShowRef={() => { setShowTamamRef(true); loadTamamRef(''); }} />
        </div>
      )}

      {step === 'mapping' && (
        <div className="bg-surface-container rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold">ربط أعمدة الملف بالحقول</p>
          <p className="text-xs text-on-surface-variant">تم تخمين الربط تلقائيًا — عدّله إن لزم. {rows.length} صف.</p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {DEST_FIELDS.map((d) => (
              <div key={d.f} className="grid grid-cols-2 gap-2 items-center">
                <span className="text-xs text-on-surface-variant truncate">{d.f}</span>
                <select value={mapping[d.f] || ''} onChange={(e) => setMapping((m) => ({ ...m, [d.f]: e.target.value || undefined }))} className="inp text-xs">
                  <option value="">— تجاهل —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={runValidation} className="w-full bg-primary text-on-primary h-11 rounded-full font-bold">التالي: مراجعة</button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="جاهز للاستيراد" n={groups.ready.length} cls="text-green-600" />
            <Stat label="يحتاج مراجعة" n={groups.review.length} cls="text-orange-600" />
            <Stat label="فيه أخطاء" n={groups.error.length} cls="text-error" />
          </div>
          {groups.error.length > 0 && <button onClick={downloadErrors} className="text-xs bg-error/10 text-error px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"><Download size={13} /> تحميل ملف الأخطاء</button>}

          {groups.review.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 space-y-2">
              <p className="text-xs font-bold text-orange-700">صفوف بدون ربط TAMAM — اربطها أو اتركها "غير مربوط" (لن تكون قابلة للشراء)</p>
              {groups.review.map((v, i) => {
                const idx = validated.indexOf(v);
                return (
                  <div key={v.data.__row} className="bg-white rounded-lg p-2 border border-orange-100">
                    <p className="text-sm font-bold">{v.data.restaurant_product_name} <span className="text-[10px] text-on-surface-variant">₪{v.data.price}</span></p>
                    {!suggCache[idx] ? (
                      <button onClick={() => runSuggestion(idx)} className="text-[11px] text-primary flex items-center gap-1 mt-1"><Search2 /> ابحث عن منتج TAMAM مطابق</button>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {(suggCache[idx] || []).map((s) => (
                          <button key={s.product.id} onClick={() => confirmSuggestion(idx, s.product)} className="w-full flex justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                            <span>{s.product.name_ar || s.product.name}</span><span className="font-bold text-blue-700">{s.confidence}%</span>
                          </button>
                        ))}
                        {(suggCache[idx] || []).length === 0 && <p className="text-[11px] text-on-surface-variant">لا اقتراحات — سيُستورد كغير مربوط</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {groups.error.length > 0 && (
            <div className="bg-error/5 border border-error/20 rounded-2xl p-3 space-y-1">
              <p className="text-xs font-bold text-error flex items-center gap-1"><AlertTriangle size={13} /> صفوف لن تُستورد</p>
              {groups.error.slice(0, 6).map((v) => (
                <div key={v.data.__row} className="text-[11px] text-error">صف {v.data.__row}: {v.errors.join('، ')}</div>
              ))}
              {groups.error.length > 6 && <p className="text-[11px] text-on-surface-variant">+{groups.error.length - 6} أخرى — حمّل ملف الأخطاء</p>}
            </div>
          )}

          <div className="bg-surface-container rounded-2xl p-3">
            <label className="text-xs text-on-surface-variant block mb-1">المينيو المستهدف</label>
            <select value={menuId} onChange={(e) => setMenuId(e.target.value)} className="inp text-sm">
              <option value="">إنشاء مينيو جديد "مينيو مستورد"</option>
              {menus.map((m) => <option key={m.id} value={m.id}>{m.name_ar || m.internal_name}</option>)}
            </select>
          </div>
          <div className="bg-surface-container rounded-2xl p-3">
            <label className="text-xs text-on-surface-variant block mb-2">عند تحديث صف بـ SKU موجود — الخلايا الفارغة</label>
            <div className="flex gap-2">
              <button onClick={() => setBlankMode('keep')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${blankMode === 'keep' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>إبقاء القيمة الحالية</button>
              <button onClick={() => setBlankMode('clear')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${blankMode === 'clear' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>مسح القيمة الحالية</button>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-1.5">تغيير ربط TAMAM لمنتج آخر لا يتم صامتًا — يحتاج تأكيدًا في صفحة الربط.</p>
          </div>

          <button onClick={doImport} disabled={importing} className="w-full bg-primary text-on-primary h-12 rounded-full font-bold disabled:opacity-50">
            {importing ? 'عم نستورد...' : `تأكيد الاستيراد (${groups.ready.length + groups.review.length} صف)`}
          </button>
        </div>
      )}

      {step === 'done' && results && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <Check size={32} className="mx-auto text-green-600" />
          <p className="font-bold">تم الاستيراد</p>
          <p className="text-sm text-on-surface-variant">أنشئنا {results.created} وجبة مربوطة + {results.unmapped} غير مربوطة. تجاهلنا {results.errors} صف فيه أخطاء (من {results.total}).</p>
          <p className="text-xs text-on-surface-variant">تحديثات حسب SKU: {results.updated} · تحذيرات صور: {results.imageWarnings}</p>
          {results.reportLines && (
            <button onClick={() => downloadResultsReport(results.reportLines)} className="text-xs bg-surface-container-high px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 mx-auto"><Download size={13} /> تقرير نتائج الاستيراد CSV</button>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => navigate(`/admin/restaurants/${id}/menu`)} className="bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-bold">مراجعة المينيو</button>
            <button onClick={reset} className="bg-surface-container-high px-4 py-2 rounded-full text-sm font-bold">استيراد آخر</button>
          </div>
        </div>
      )}

      {showTamamRef && <TamamRefSheet products={tamamProducts} search={refSearch} loading={refLoading}
        onSearch={loadTamamRef} onClose={() => setShowTamamRef(false)} onExport={() => exportTamamProductsReferenceCsv(tamamProducts)} />}
      <style>{`.inp{width:100%;background:var(--background);border:1px solid hsl(var(--outline-variant)/.4);border-radius:10px;padding:8px 10px;font-size:13px;color:inherit;outline:none}`}</style>
    </div>
  );
}

function Stat({ label, n, cls }) {
  return <div className="bg-surface-container rounded-xl p-3 text-center"><p className={`text-2xl font-bold ${cls}`}>{n}</p><p className="text-[11px] text-on-surface-variant">{label}</p></div>;
}
function Search2() { return <span className="material-symbols-outlined text-[14px]">search</span>; }

function downloadResultsReport(lines) {
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'import_results_report.csv'; a.click();
  URL.revokeObjectURL(url);
}

const HELP_STEPS = [
  'لا تغيّر أسماء أعمدة النموذج.',
  'كل صف هو وجبة واحدة من مينيو المطعم.',
  'استعمل TAMAM Product ID للربط.',
  'ضع اسم ملف الصورة في primary_image_file.',
  'ارفع الصور داخل ZIP مع الملف.',
  'السعر هو السعر الحقيقي للمطعم.',
  'الوصف والصورة يخصّان المطعم، ولا يغيّران منتج TAMAM الرئيسي.',
];

function HelpPanel({ onShowRef }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface-container-low rounded-xl p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">help</span> كيف أجهّز الملف؟</span>
        <span className="text-on-surface-variant text-xs">{open ? 'إخفاء' : 'عرض'}</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-1 text-xs text-on-surface-variant list-decimal pr-4">
          {HELP_STEPS.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      <button onClick={onShowRef} className="mt-2 w-full bg-surface-container-high text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-1">
        <Link2 size={14} /> عرض أرقام منتجات TAMAM للربط
      </button>
    </div>
  );
}

function TamamRefSheet({ products, search, loading, onSearch, onClose, onExport }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose} dir="rtl">
      <div className="bg-surface rounded-t-3xl max-h-[80vh] w-full max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
          <h3 className="font-bold text-sm">منتجات TAMAM للربط (مرجع فقط)</h3>
          <div className="flex gap-2">
            <button onClick={onExport} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"><Download size={13} /> تصدير قائمة TAMAM</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"><X size={16} /></button>
          </div>
        </div>
        <div className="p-3">
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="ابحث عن منتج TAMAM..." className="inp text-sm" />
        </div>
        <div className="overflow-y-auto px-3 pb-4 space-y-1.5 flex-1">
          {loading && <p className="text-center text-on-surface-variant text-xs py-6">عم نحمّل...</p>}
          {!loading && !products.length && <p className="text-center text-on-surface-variant text-xs py-6">ابحث لعرض المنتجات</p>}
          {products.map((p) => (
            <div key={p.id} className="bg-surface-container rounded-xl p-2 flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{p.name_ar || p.name}</p>
                <p className="text-[10px] text-on-surface-variant truncate">{p.category_name || ''} · ₪{p.price}</p>
              </div>
              <span className="text-[10px] text-on-surface-variant font-bold flex-shrink-0">#{p.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}