import { base44 } from '@/api/base44Client';

// Thin client for the admin demo-data engine.
function invoke(action, payload = {}) {
  return base44.functions
    .invoke('demoDataEngine', { action, payload })
    .then((r) => r?.data?.data ?? r?.data ?? r);
}

export const getDemoStatus = () => invoke('status');
export const generateDemoData = (user_id) => invoke('generate', { user_id: user_id || null });
export const refreshDemoData = (user_id) => invoke('refresh', { user_id: user_id || null });
export const resetDemoData = (user_id) => invoke('reset', { user_id: user_id || null });
export const deleteDemoData = () => invoke('delete');