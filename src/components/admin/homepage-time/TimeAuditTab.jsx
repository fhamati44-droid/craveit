import { useState, useEffect } from 'react';
import { getAuditLog } from '@/lib/homepageTimeApi';

const ACTION_LABELS = {
  period_created: 'إنشاء فترة',
  period_updated: 'تعديل فترة',
  period_deleted: 'حذف فترة',
  rule_saved: 'حفظ قاعدة',
  rule_deleted: 'حذف قاعدة',
  published: 'نشر',
  seeded: 'إنشاء افتراضي',
};

/**
 * Audit log tab — shows recent changes.
 */
export default function TimeAuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog().then((data) => setLogs(data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;
  if (logs.length === 0) return <div className="text-center py-8 text-gray-500">لا يوجد سجل تغييرات بعد.</div>;

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="border rounded-xl p-3 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">{ACTION_LABELS[log.action] || log.action}</span>
            <span className="text-[10px] text-gray-400">{new Date(log.created_date).toLocaleString('ar')}</span>
          </div>
          {log.admin_name && <span className="text-xs text-gray-500">بواسطة: {log.admin_name}</span>}
          {log.slot_key && <span className="text-xs text-gray-400 block">الخانة: {log.slot_key}</span>}
          {log.new_value && <span className="text-[10px] text-gray-400 block mt-1 break-all">{log.new_value.substring(0, 200)}</span>}
        </div>
      ))}
    </div>
  );
}