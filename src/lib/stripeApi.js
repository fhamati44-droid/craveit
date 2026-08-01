import { base44 } from '@/api/base44Client';

export async function createStripeSession({ amount, description, orderRef, email }) {
  const res = await base44.functions.invoke('stripeCheckout', {
    action: 'createSession',
    payload: { amount, description, order_ref: orderRef, email, origin: window.location.origin },
  });
  return res.data.data;
}

export async function verifyStripeSession(sessionId) {
  const res = await base44.functions.invoke('stripeCheckout', {
    action: 'verifySession',
    payload: { session_id: sessionId },
  });
  return res.data.data;
}

export function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}