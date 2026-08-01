import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getDraftConfig, saveSection, deleteSection, validatePublish, publishDraft, seedDefaults, listSectionItems } from '@/lib/homepageApi';
import { SECTION_LABELS } from '@/lib/homepageApi';
import SectionCard from '@/components/admin/homepage/SectionCard';
import SectionEditor from '@/components/admin/homepage/SectionEditor';
import VersionHistory from '@/components/admin/homepage/VersionHistory';
import ValidationReport from '@/components/admin/homepage/ValidationReport';

const Icon = ({ name, className = '' }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;

export default function HomepageAdmin() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [itemCounts, setItemCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [report, setReport] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDraftConfig();
      const secs = (data?.sections || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setSections(secs);
      // Count items per section
      const counts = {};
      (data?.items || []).forEach((it) => { counts[it.homepage_section_id] = (counts[it.homepage_section_id] || 0) + 1; });
      setItemCounts(counts);
      if (!secs.length) await seedDefaults();
    } catch (e) { console.error(e); if (!sections.length) await seedDefaults(); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, display_order: i + 1 }));
    setSections(updated);
    // Persist order silently
    try { await Promise.all(updated.map((s) => saveSection({ id: s.id, display_order: s.display_order }))); } catch (e) { console.error(e); }
  };

  const toggleEnabled = async (section) => {
    try { await saveSection({ id: section.id, enabled: !section.enabled }); setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, enabled: !s.enabled } : s)); } catch (e) { console.error(e); }
  };

  const duplicate = async (section) => {
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = section;
      const dup = await saveSection({ ...rest, title: `${section.title || ''} (نسخة)`, display_order: (section.display_order || 0) + 1, enabled: false });
      const items = await listSectionItems(section.id);
      if (items?.length) {
        const newItems = items.map((it) => {
          const { id: _, created_date: _c, updated_date: _u, created_by_id: _b, ...itemRest } = it;
          return { ...itemRest, homepage_section_id: dup.id };
        });
        await Promise.all(newItems.map((it) => saveSectionItemDraft(it)));
      }
      await load();
    } catch (e) { console.error(e); }
  };

  const startPublish = async () => {
    const r = await validatePublish();
    setReport(r);
  };

  const doPublish = async () => {
    setPublishing(true);
    try { await publishDraft(publishLabel || `نسخة ${new Date().toLocaleDateString('ar')}`); setReport(null); setPublishLabel(''); await load(); } catch (e) { console.error(e); alert('فشل النشر: ' + e.message); }
    finally { setPublishing(false); }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant">عم نحمّل لوحة الإدارة...</div>;

  return (
    <div dir="rtl" className="font-tamam min-h-[100dvh] bg-background text-on-surface max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/90 backdrop-blur z-20 border-b border-outline-variant/20 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-headline-md font-bold">إدارة الصفحة الرئيسية</h1>
          <button onClick={() => navigate('/admin/homepage/media')} className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center"><Icon name="perm_media" className="text-on-surface-variant" /></button>
        </div>
        <p className="text-xs text-on-surface-variant mb-3">تحكم بكل المحتوى اللي بيظهر للزبون في صفحة TAMAM الرئيسية.</p>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => navigate('/admin/homepage/preview')} className="flex-none flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm font-bold"><Icon name="preview" className="text-[18px]" />معاينة الصفحة</button>
          <VersionHistory onRefresh={load} />
          <div className="flex-1" />
          <button onClick={startPublish} className="flex-none h-10 bg-primary text-on-primary px-5 rounded-xl text-sm font-bold flex items-center gap-1.5"><Icon name="publish" className="text-[18px]" />نشر التغييرات</button>
        </div>
      </div>

      {/* Section list */}
      <div className="px-4 py-4">
        {sections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-on-surface-variant mb-4">لا توجد أقسام بعد</p>
            <button onClick={() => seedDefaults().then(load)} className="bg-primary text-on-primary px-5 py-2.5 rounded-full text-sm font-bold">إنشاء الأقسام الافتراضية</button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {sections.map((s, i) => (
                    <Draggable key={s.id} draggableId={s.id} index={i}>
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.draggableProps}>
                          <SectionCard
                            section={s}
                            itemSummary={itemCounts[s.id] ? `${itemCounts[s.id]} عنصر` : 'بدون محتوى'}
                            onEdit={() => setEditing(s)}
                            onToggle={() => toggleEnabled(s)}
                            onDuplicate={() => duplicate(s)}
                            dragHandle={prov.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Add section button */}
      <div className="px-4">
        <button onClick={() => setEditing({ section_key: 'new_section', section_type: 'editorial', display_order: sections.length + 1, enabled: false, selection_mode: 'manual', max_items: 8, audience: 'all' })} className="w-full h-12 border-2 border-dashed border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface-variant flex items-center justify-center gap-2"><Icon name="add" />إضافة قسم جديد</button>
      </div>

      {/* Publish label input */}
      {report && (
        <div className="px-4 mt-3">
          <input value={publishLabel} onChange={(e) => setPublishLabel(e.target.value)} placeholder="تسمية النسخة (اختياري)" className="w-full bg-surface-container rounded-xl p-2.5 text-sm outline-none border border-outline-variant/30" />
        </div>
      )}

      {editing && <SectionEditor section={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {report && <ValidationReport report={report} onPublish={doPublish} onClose={() => setReport(null)} publishing={publishing} />}
    </div>
  );
}

// Helper to save a section item without id (create)
async function saveSectionItemDraft(item) {
  const { base44 } = await import('@/api/base44Client');
  return base44.entities.HomepageSectionItem.create(item);
}