import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getAllMenuCategories } from '@/lib/api';
import {
  getItemsForRestaurant, getMenusForRestaurant, fetchAllTamamProducts,
  exportTamamProductsReferenceCsv, downloadCsvTemplate, downloadCsvExample,
} from '@/lib/restaurantMenuApi';
import RestaurantMenuItemEditor from '@/components/admin/restaurant/RestaurantMenuItemEditor';
import RestaurantSummaryCard from '@/components/admin/restaurant/RestaurantSummaryCard';
import MenuImportZone from '@/components/admin/restaurant/MenuImportZone';
import MenuStatsCard from '@/components/admin/restaurant/MenuStatsCard';
import MappingPreviewCard from '@/components/admin/restaurant/MappingPreviewCard';
import MenuItemsTable from '@/components/admin/restaurant/MenuItemsTable';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function RestaurantMenuItems() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [categoryNames, setCategoryNames] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, ms, its, cats] = await Promise.all([
        base44.entities.Restaurant.get(id).catch(() => null),
        getMenusForRestaurant(id).catch(() => []),
        getItemsForRestaurant(id).catch(() => []),
        getAllMenuCategories().catch(() => []),
      ]);
      setRestaurant(r);
      setMenus(ms || []);
      setItems(its || []);
      const typeIds = (r?.menu_types || []).map(String);
      const names = (cats || []).filter((c) => typeIds.includes(String(c.id))).map((c) => c.name_ar || c.name).filter(Boolean);
      setCategoryNames(names.join('، '));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const toggleRestaurantActive = async () => {
    if (!restaurant) return;
    await base44.entities.Restaurant.update(id, { active: !restaurant.active });
    load();
  };

  const exportTamam = async () => {
    setExporting(true);
    try {
      const products = await fetchAllTamamProducts(2000);
      if (!products.length) { alert('ما قدرنا نجيب قائمة منتجات TAMAM. تأكد من اتصال Supabase.'); return; }
      exportTamamProductsReferenceCsv(products);
    } finally { setExporting(false); }
  };

  const toggleItemAvailable = async (it) => {
    await base44.entities.RestaurantMealOffer.update(it.id, { available: !it.available });
    load();
  };

  const stats = {
    total: items.length,
    mapped: items.filter((i) => i.mapping_status === 'mapped' || i.mapped_tamam_product_id || i.meal_id).length,
    unmapped: items.filter((i) => !i.mapped_tamam_product_id && !i.meal_id && (i.mapping_status === 'unmapped' || i.mapping_status === 'needs_review' || !i.mapping_status)).length,
    noImage: items.filter((i) => !i.primary_image && !(i.gallery_images || []).length).length,
    unavailable: items.filter((i) => !i.available || i.sold_out).length,
  };

  return (
    <div dir="rtl" className="font-tamam w-full space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-[#40493c]">
        <Link to="/admin/restaurants" className="hover:text-[#181d1a]">المطاعم</Link>
        <Icon name="chevron_left" className="text-[16px]" />
        <Link to={`/admin/restaurants/${id}/edit`} className="hover:text-[#181d1a]">{restaurant?.name_ar || restaurant?.name || 'مطعم'}</Link>
        <Icon name="chevron_left" className="text-[16px]" />
        <span className="text-[#1c6d17] font-medium">مينيو المطعم</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-[32px] font-bold text-[#181d1a]">{restaurant?.name_ar || restaurant?.name || 'مطعم'}</h1>
          <p className="text-base text-[#40493c] max-w-2xl">إدارة بيانات المطعم، المينيو الحقيقي، الأسعار، الصور وربط الوجبات مع مينيو TAMAM.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleRestaurantActive} className="px-4 py-2 rounded-lg text-sm font-medium text-[#ba1a1a] bg-[#ba1a1a]/10 hover:bg-[#ba1a1a]/20 transition-colors flex items-center gap-1">
            <Icon name="block" className="text-[20px]" /> {restaurant?.active ? 'تعطيل المطعم' : 'تفعيل المطعم'}
          </button>
          <button onClick={() => navigate(`/restaurants/${id}`)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#40493c] bg-[#e5e9e5] hover:bg-[#dfe3e0] transition-colors flex items-center gap-1">
            <Icon name="visibility" className="text-[20px]" /> معاينة
          </button>
          <button onClick={load} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1c6d17] hover:bg-[#1c6d17]/90 transition-colors flex items-center gap-1 shadow-sm">
            <Icon name="save" className="text-[20px]" /> حفظ التغييرات
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-[#40493c] py-16">جاري التحميل...</p>
      ) : (
        <>
          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-6">
              {restaurant && <RestaurantSummaryCard restaurant={restaurant} categoryNames={categoryNames} onEdit={() => navigate(`/admin/restaurants/${id}/edit`)} />}
              <MenuImportZone
                restaurantId={id}
                onTemplate={downloadCsvTemplate}
                onExample={downloadCsvExample}
                onTamam={exportTamam}
                onZip={() => navigate(`/admin/restaurants/${id}/import`)}
                onAddManual={() => setEditing({})}
                exporting={exporting}
              />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6">
              <MenuStatsCard stats={stats} />
              <MappingPreviewCard items={items} />
            </div>
          </div>

          {/* Table */}
          <MenuItemsTable
            items={items}
            restaurant={restaurant}
            onEdit={(it) => setEditing(it)}
            onLink={() => navigate(`/admin/restaurants/${id}/mapping`)}
            onToggleAvailable={toggleItemAvailable}
          />
        </>
      )}

      {editing && (
        <RestaurantMenuItemEditor
          restaurant={restaurant}
          menus={menus}
          item={editing.id ? editing : null}
          onSave={() => { setEditing(null); load(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}