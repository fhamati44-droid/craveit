import { base44 } from '@/api/base44Client';

/**
 * Time-aware homepage API client.
 * Calls the homepageTimeEngine backend function.
 */

const CACHE_KEY = 'homepage_time_content_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}

function setCached(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export function clearTimeAwareCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

/**
 * Get all time-aware homepage content for the current period.
 * Returns null when no periods/rules are configured — caller falls back to static content.
 */
export async function getTimeAwareHomepage() {
  const cached = getCached();
  if (cached) return cached;
  try {
    const res = await base44.functions.invoke('homepageTimeEngine', { action: 'getTimeAwareContent' });
    const data = res?.data ?? null;
    if (data) setCached(data);
    return data;
  } catch (e) {
    console.error('getTimeAwareHomepage error', e);
    return null;
  }
}

/**
 * Get just the current period info (lightweight).
 */
export async function getCurrentPeriod() {
  try {
    const res = await base44.functions.invoke('homepageTimeEngine', { action: 'getCurrentPeriod' });
    return res?.data ?? null;
  } catch (e) {
    console.error('getCurrentPeriod error', e);
    return null;
  }
}

// ===== Admin API =====

export async function adminTimeAction(action, payload = {}) {
  const res = await base44.functions.invoke('homepageTimeEngine', { action, payload });
  return res?.data ?? res;
}

export async function getPeriods() {
  return adminTimeAction('getPeriods');
}

export async function savePeriod(period) {
  return adminTimeAction('savePeriod', period);
}

export async function deletePeriod(id) {
  return adminTimeAction('deletePeriod', { id });
}

export async function getSlotRules(periodId) {
  return adminTimeAction('getSlotRules', { period_id: periodId });
}

export async function saveSlotRule(rule) {
  return adminTimeAction('saveSlotRule', rule);
}

export async function deleteSlotRule(id, slotKey) {
  return adminTimeAction('deleteSlotRule', { id, slot_key: slotKey });
}

export async function previewPeriod(periodId, simulatedTime) {
  const res = await base44.functions.invoke('homepageTimeEngine', { action: 'previewPeriod', payload: { period_id: periodId, simulated_time: simulatedTime } });
  return res?.data ?? null;
}

export async function seedDefaultPeriods() {
  return adminTimeAction('seedDefaultPeriods');
}

export async function getCompositionStats() {
  return adminTimeAction('getCompositionStats');
}

export async function getAuditLog() {
  return adminTimeAction('getAuditLog');
}