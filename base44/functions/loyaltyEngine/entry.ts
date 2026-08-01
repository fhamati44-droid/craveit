import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function defaultConfig() {
  return {
    points_per_currency: 1, points_rounding: 'floor', eligible_event: 'delivered',
    expiry_days: 180, redeem_value_per_point: 1, min_payable_fraction: 0.5,
    reward_coupon_enabled: true, reward_coupon_value: 15, reward_coupon_min_order: 50, reward_coupon_expiry_days: 30,
  };
}
async function getConfig(base44) {
  const list = await base44.asServiceRole.entities.LoyaltyConfig.list();
  return (list && list[0]) || defaultConfig();
}
function computePoints(cfg, amount) {
  const p = (cfg.points_per_currency || 1) * (amount || 0);
  const r = cfg.points_rounding || 'floor';
  return r === 'ceil' ? Math.ceil(p) : r === 'round' ? Math.round(p) : Math.floor(p);
}
async function getOrCreateAccount(SR, phone) {
  const accs = await SR.entities.LoyaltyAccount.filter({ phone });
  if (accs && accs[0]) return accs[0];
  return SR.entities.LoyaltyAccount.create({ phone, balance: 0, pending_balance: 0, used_points: 0, expired_points: 0 });
}
async function issueReward(SR, cfg, phone, orderId) {
  const code = 'TAM' + Math.random().toString(36).slice(2, 7).toUpperCase() + (orderId || '');
  const expiry = new Date(Date.now() + (cfg.reward_coupon_expiry_days || 30) * 86400000).toISOString();
  return SR.entities.Coupon.create({
    code, type: 'fixed', value: cfg.reward_coupon_value || 15, min_order: cfg.reward_coupon_min_order || 0,
    expiry, scope: 'all', owner_phone: phone, status: 'active', source_order_id: orderId, description_ar: 'مكافأة على طلبك',
  });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const SR = base44.asServiceRole;
    const { action, payload } = await req.json();
    let result;

    if (action === 'getConfig') {
      result = await getConfig(base44);

    } else if (action === 'getAccount') {
      const phone = payload.phone;
      if (!phone) return Response.json({ error: 'phone required' }, { status: 400 });
      const acc = await getOrCreateAccount(SR, phone);
      const txs = await SR.entities.PointsTransaction.filter({ phone }, '-created_date', 50);
      const coupons = await SR.entities.Coupon.filter({ owner_phone: phone, status: 'active' });
      result = { account: acc, transactions: txs || [], coupons: coupons || [] };

    } else if (action === 'recordPending') {
      const cfg = await getConfig(base44);
      const pts = computePoints(cfg, payload.amount);
      const acc = await getOrCreateAccount(SR, payload.phone);
      const tx = await SR.entities.PointsTransaction.create({
        account_id: acc.id, phone: payload.phone, order_id: payload.order_id, order_number: payload.order_number,
        points: pts, type: 'earn', status: 'pending',
      });
      await SR.entities.LoyaltyAccount.update(acc.id, { pending_balance: (acc.pending_balance || 0) + pts });
      result = { points: pts, transaction: tx };

    } else if (action === 'awardPoints') {
      const cfg = await getConfig(base44);
      const txs = await SR.entities.PointsTransaction.filter({ order_id: Number(payload.order_id), type: 'earn' });
      // Idempotency: already awarded → return existing without re-issuing a coupon.
      const alreadyAvailable = (txs || []).find(t => t.status === 'available');
      if (alreadyAvailable) {
        const existing = await SR.entities.Coupon.filter({ source_order_id: Number(payload.order_id), owner_phone: alreadyAvailable.phone });
        result = { points: alreadyAvailable.points, coupon: (existing && existing[0]) || null, alreadyAwarded: true };
        return Response.json({ data: result });
      }
      const pending = (txs || []).find(t => t.status === 'pending');
      let pts = 0, phone = payload.phone;
      if (pending) {
        pts = pending.points; phone = pending.phone;
        await SR.entities.PointsTransaction.update(pending.id, { status: 'available' });
        const accs = await SR.entities.LoyaltyAccount.filter({ phone });
        const acc = accs && accs[0];
        if (acc) await SR.entities.LoyaltyAccount.update(acc.id, {
          balance: (acc.balance || 0) + pts,
          pending_balance: Math.max(0, (acc.pending_balance || 0) - pts),
        });
      } else if (payload.amount != null && phone) {
        pts = computePoints(cfg, payload.amount);
        const acc = await getOrCreateAccount(SR, phone);
        await SR.entities.PointsTransaction.create({
          account_id: acc.id, phone, order_id: payload.order_id, order_number: payload.order_number,
          points: pts, type: 'earn', status: 'available',
        });
        await SR.entities.LoyaltyAccount.update(acc.id, { balance: (acc.balance || 0) + pts });
      }
      let coupon = null;
      if (cfg.reward_coupon_enabled && phone) {
        coupon = await issueReward(SR, cfg, phone, payload.order_id);
      }
      result = { points: pts, coupon };

    } else if (action === 'reversePoints') {
      const txs = await SR.entities.PointsTransaction.filter({ order_id: Number(payload.order_id) });
      for (const t of (txs || [])) {
        if (t.status === 'reversed') continue;
        await SR.entities.PointsTransaction.update(t.id, { status: 'reversed' });
        const accs = await SR.entities.LoyaltyAccount.filter({ phone: t.phone });
        const acc = accs && accs[0];
        if (acc) {
          if (t.status === 'available') await SR.entities.LoyaltyAccount.update(acc.id, { balance: Math.max(0, (acc.balance || 0) - t.points) });
          else if (t.status === 'pending') await SR.entities.LoyaltyAccount.update(acc.id, { pending_balance: Math.max(0, (acc.pending_balance || 0) - t.points) });
        }
      }
      const cps = await SR.entities.Coupon.filter({ source_order_id: Number(payload.order_id) });
      for (const c of (cps || [])) await SR.entities.Coupon.update(c.id, { status: 'disabled' });
      result = { reversed: (txs || []).length };

    } else if (action === 'validateCoupon') {
      const cps = await SR.entities.Coupon.filter({ code: payload.code });
      const c = cps && cps[0];
      if (!c || c.status !== 'active') { result = { valid: false, reason: 'الكوبون مش صالح أو انتهت صلاحيته.' }; }
      else if (c.expiry && new Date(c.expiry) < new Date()) { result = { valid: false, reason: 'الكوبون مش صالح أو انتهت صلاحيته.' }; }
      else if (c.owner_phone && c.owner_phone !== (payload.phone || '')) { result = { valid: false, reason: 'هذا الكوبون ما بنطبق على هذا الطلب.' }; }
      else if ((payload.amount || 0) < (c.min_order || 0)) { result = { valid: false, reason: `الحد الأدنى للطلب ₪${c.min_order}.` }; }
      else {
        let discount = 0;
        if (c.type === 'percent') discount = Math.round((payload.amount || 0) * c.value / 100);
        else if (c.type === 'fixed' || c.type === 'package') discount = Math.min(c.value, payload.amount || 0);
        else if (c.type === 'free_delivery') discount = payload.delivery_fee || 0;
        result = { valid: true, coupon: c, discount };
      }

    } else if (action === 'redeemPoints') {
      const pts = Math.max(0, Math.floor(payload.points || 0));
      const accs = await SR.entities.LoyaltyAccount.filter({ phone: payload.phone });
      const acc = accs && accs[0];
      if (!acc || (acc.balance || 0) < pts) { result = { ok: false, reason: 'رصيد النقاط غير كافٍ.' }; }
      else {
        await SR.entities.LoyaltyAccount.update(acc.id, { balance: acc.balance - pts, used_points: (acc.used_points || 0) + pts });
        await SR.entities.PointsTransaction.create({
          account_id: acc.id, phone: payload.phone, order_id: payload.order_id, order_number: payload.order_number,
          points: -pts, type: 'redeem', status: 'available',
        });
        result = { ok: true, redeemed: pts, value: pts * 1 };
      }

    } else if (action === 'markCouponUsed') {
      const cps = await SR.entities.Coupon.filter({ code: payload.code });
      if (cps && cps[0]) await SR.entities.Coupon.update(cps[0].id, { status: 'used' });
      result = { ok: true };

    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json({ data: result });
  } catch (error) {
    console.error('loyaltyEngine error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}