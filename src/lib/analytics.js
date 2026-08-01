import { base44 } from '@/api/base44Client';

export const track = (eventName, properties = {}) => {
  try { base44.analytics.track({ eventName, properties }); } catch (e) { /* noop */ }
};