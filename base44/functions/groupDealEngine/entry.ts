import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TZ = 'Asia/Jerusalem';

function sortTiers(thresholds) {
  return [...(thresholds || [])].sort(
    (a, b) => (a.min_participants || 0) - (b.min_participants || 0) || (a.sort_order || 0) - (b.sort_order || 0)
  );
}

function measureFor(countingMethod, participants, quantity) {
  if (countingMethod === 'quantity') return quantity || 0;
  if (countingMethod === 'both') return Math.max(participants || 0, quantity || 0);
  return participants || 0;
}

function activeTier(thresholds, participants, quantity, countingMethod) {
  const sorted = sortTiers(thresholds);
  if (!sorted.length) return null;
  const m = measureFor(countingMethod, participants, quantity);
  let t = sorted[0];
  for (const tier of sorted) if (m >= (tier.min_participants || 0)) t = tier;
  return t;
}

function nextTier(thresholds, participants, quantity, countingMethod) {
  const sorted = sortTiers(thresholds);
  const m = measureFor(countingMethod, participants, quantity);
  return sorted.find((t) => (t.min_participants || 0) > m) || null;
}

function identityOf(p) {
  return p.customer_id || p.phone || p.guest_session_id || p.id;
}

function computeCounts(participations) {
  const parts = (participations || []).filter((p) => p.participation_status !== 'cancelled');
  const ids = new Set(parts.map(identityOf));
  const unique = ids.size;
  const qty = parts.reduce((s, p) => s + (p.quantity || 0), 0);
  return { unique, quantity: qty, parts };
}

function nowISO() {
  return new Date().toISOString();
}

function buildProgress(deal, thresholds, parts, phone, sessionId) {
  const { unique, quantity } = computeCounts(parts);
  const cur = activeTier(thresholds, unique, quantity, deal.counting_method);
  const next = nextTier(thresholds, unique, quantity, deal.counting_method);
  const mine = (parts || []).find(
    (p) => (phone && p.phone === phone) || (sessionId && p.guest_session_id === sessionId)
  ) || null;
  const remaining = next ? Math.max(0, (next.min_participants || 0) - measureFor(deal.counting_method, unique, quantity)) : 0;
  return {
    deal,
    thresholds: sortTiers(thresholds),
    items: [],
    participants: unique,
    total_quantity: quantity,
    current_tier: cur,
    next_tier: next,
    remaining,
    my_participation: mine,
  };
}

async function loadDealGraph(base44, dealId) {
  const [deal, thresholds, parts] = await Promise.all([
    base44.asServiceRole.entities.GroupDeal.get(dealId).catch(() => null),
    base44.asServiceRole.entities.GroupDealThreshold.filter({ deal_id: dealId }).catch(() => []),
    base44.asServiceRole.entities.GroupDealParticipation.filter({ deal_id: dealId }).catch(() => []),
  ]);
  const items = await base44.asServiceRole.entities.GroupDealItem.filter({ deal_id: dealId }).catch(() => []);
  return { deal, thresholds: thresholds || [], parts: parts || [], items: items || [] };
}

function validateThresholds(thresholds, referencePrice) {
  const errs = [];
  const sorted = sortTiers(thresholds);
  if (!sorted.length) errs.push('يجب إضافة مستوى سعر واحد على الأقل.');
  let prevMin = -1;
  let prevPrice = Infinity;
  for (const t of sorted) {
    if ((t.min_participants || 0) <= prevMin) errs.push('أعداد المشتركين يجب أن تتزايد بشكل صارم.');
    if ((t.price || 0) < 0) errs.push('الأسعار لا يمكن أن تكون سالبة.');
    if ((t.price || 0) > prevPrice + 0.001) errs.push('السعر لا يجب أن يرتفع مع زيادة عدد المشتركين.');
    prevMin = t.min_participants || 0;
    prevPrice = t.price || 0;
  }
  const bestCount = sorted.filter((t) => t.is_best_tier).length;
  if (bestCount > 1) errs.push('يمكن تحديد مستوى نهائي واحد فقط.');
  return errs;
}

async function validateDeal(base44, deal, items, thresholds) {
  const errs = [];
  if (!deal.title || !deal.title.trim()) errs.push('عنوان العرض مطلوب.');
  if (!deal.restaurant_id) errs.push('يجب اختيار مطعم.');
  else {
    const rest = await base44.asServiceRole.functions
      .invoke('supabaseProxy', { action: 'getRestaurantById', payload: { id: deal.restaurant_id } })
      .catch(() => null);
    const r = rest?.data?.data;
    if (!r) errs.push('المطعم غير موجود.');
    else if (r.active === false) errs.push('المطعم غير نشط.');
  }
  if (!items || !items.length) errs.push('يجب اختيار وجبة واحدة على الأقل.');
  if (!deal.reference_price || deal.reference_price <= 0) errs.push('السعر المرجعي مطلوب.');
  if (!deal.start_at || !deal.end_at) errs.push('أوقات البداية والنهاية مطلوبة.');
  else if (new Date(deal.end_at) <= new Date(deal.start_at)) errs.push('وقت النهاية يجب أن يكون بعد وقت البداية.');
  errs.push(...validateThresholds(thresholds, deal.reference_price));
  if (!deal.hero_image) errs.push('صورة العرض مطلوبة.');
  if (!deal.terms_summary || !deal.terms_summary.trim()) errs.push('ملخص الشروط مطلوب.');
  return errs;
}

async function logAudit(base44, dealId, dealTitle, action, admin, prev, next, reason) {
  await base44.asServiceRole.entities.GroupDealAuditLog.create({
    deal_id: dealId,
    deal_title: dealTitle || '',
    action,
    admin_id: admin?.id || '',
    admin_name: admin?.full_name || '',
    previous_value: prev ? JSON.stringify(prev) : '',
    new_value: next ? JSON.stringify(next) : '',
    reason: reason || '',
  }).catch(() => null);
}

async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, payload } = await req.json();
    const svc = base44.asServiceRole;

    if (action === 'getDealProgress') {
      const { deal_id, phone, session_id } = payload;
      const { deal, thresholds, parts, items } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });
      const progress = buildProgress(deal, thresholds, parts, phone, session_id);
      progress.items = items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return Response.json({ data: progress });
    }

    if (action === 'listPublicDeals') {
      const { phone, session_id } = payload;
      const all = await svc.entities.GroupDeal.list('-updated_date', 100).catch(() => []);
      function statusOf(d) {
        if (d.finalized) return d.status;
        if (['paused', 'cancelled', 'draft'].includes(d.status)) return d.status;
        const now = Date.now();
        const s = d.start_at ? new Date(d.start_at).getTime() : 0;
        const e = d.end_at ? new Date(d.end_at).getTime() : Infinity;
        if (now < s) return 'scheduled';
        if (now >= e) return 'ended';
        return 'active';
      }
      const visible = (all || []).filter((d) => ['active', 'scheduled'].includes(statusOf(d)) || d.homepage_banner_enabled || d.homepage_featured);
      const enriched = await Promise.all(
        (visible || []).map(async (d) => {
          const [ths, parts] = await Promise.all([
            svc.entities.GroupDealThreshold.filter({ deal_id: d.id }).catch(() => []),
            svc.entities.GroupDealParticipation.filter({ deal_id: d.id }).catch(() => []),
          ]);
          const { unique, quantity } = computeCounts(parts);
          const cur = activeTier(ths, unique, quantity, d.counting_method);
          const next = nextTier(ths, unique, quantity, d.counting_method);
          const mine = (parts || []).find((p) => (phone && p.phone === phone) || (session_id && p.guest_session_id === session_id)) || null;
          return { deal: d, thresholds: sortTiers(ths), participants: unique, total_quantity: quantity, current_tier: cur, next_tier: next, my_participation: mine, status: statusOf(d) };
        })
      );
      return Response.json({ data: enriched });
    }

    if (action === 'joinGroupDeal') {
      const { deal_id, name, phone, session_id, quantity, payment_method } = payload;
      const qty = Math.max(1, Number(quantity) || 1);
      const { deal, thresholds, parts } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });

      const now = Date.now();
      const startMs = deal.start_at ? new Date(deal.start_at).getTime() : 0;
      const endMs = deal.end_at ? new Date(deal.end_at).getTime() : Infinity;
      if (deal.status !== 'active') return Response.json({ error: 'العرض غير متاح للانضمام حاليًا.' }, { status: 400 });
      if (now < startMs) return Response.json({ error: 'العرض لم يبدأ بعد.' }, { status: 400 });
      if (now >= endMs) return Response.json({ error: 'انتهى وقت الانضمام.' }, { status: 400 });

      const { unique, quantity: reserved } = computeCounts(parts);

      // Idempotency: one participation per customer when configured
      const existing = (parts || []).find(
        (p) => (phone && p.phone === phone) || (session_id && p.guest_session_id === session_id)
      );
      if (existing && deal.one_participation_per_customer) {
        const progress = buildProgress(deal, thresholds, parts, phone, session_id);
        return Response.json({ data: { ...progress, already_joined: true, participation: existing } });
      }

      // Quantity limits
      if (deal.maximum_quantity_per_customer && qty > deal.maximum_quantity_per_customer)
        return Response.json({ error: `الحد الأقصى للكمية لكل عميل ${deal.maximum_quantity_per_customer}.` }, { status: 400 });
      if (deal.minimum_quantity_per_customer && qty < deal.minimum_quantity_per_customer)
        return Response.json({ error: `الحد الأدنى للكمية ${deal.minimum_quantity_per_customer}.` }, { status: 400 });

      // Inventory
      if (deal.stop_when_inventory_exhausted && deal.total_inventory && reserved + qty > deal.total_inventory)
        return Response.json({ error: 'الكمية المطلوبة غير متوفرة.' }, { status: 400 });
      if (deal.maximum_participants && unique + 1 > deal.maximum_participants)
        return Response.json({ error: 'اكتمل العدد المسموح.' }, { status: 400 });

      const cur = activeTier(thresholds, unique, reserved, deal.counting_method);
      const joinedPrice = cur ? cur.price : deal.reference_price;
      const user = await base44.auth.me().catch(() => null);

      const participation = await svc.entities.GroupDealParticipation.create({
        deal_id,
        customer_id: user?.id || '',
        guest_session_id: session_id || '',
        name: name || '',
        phone: phone || '',
        quantity: qty,
        joined_tier_id: cur?.id || '',
        joined_price: joinedPrice,
        payment_method: payment_method || deal.payment_model,
        payment_status: deal.payment_model === 'cod' ? 'cash_on_delivery_pending' : 'reserved',
        participation_status: 'joined',
        joined_at: nowISO(),
      });

      const fresh = await base44.asServiceRole.entities.GroupDealParticipation.filter({ deal_id }).catch(() => []);
      const progress = buildProgress(deal, thresholds, fresh, phone, session_id);
      return Response.json({ data: { ...progress, participation } });
    }

    if (action === 'finalizeGroupDeal') {
      const admin = await requireAdmin(base44);
      const { deal_id, reason } = payload;
      const { deal, thresholds, parts, items } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });
      if (deal.finalized) return Response.json({ data: { already_finalized: true } });

      const { unique, quantity } = computeCounts(parts);
      const finalTier = activeTier(thresholds, unique, quantity, deal.counting_method);
      const successThreshold = (thresholds || []).find((t) => t.is_success_threshold);
      const minSuccess = successThreshold ? successThreshold.min_participants : deal.minimum_success_participants || 1;
      const measure = measureFor(deal.counting_method, unique, quantity);
      const success = measure >= (minSuccess || 1) && !!finalTier;

      const finalPrice = finalTier ? finalTier.price : deal.reference_price;

      // Update each participation
      const updateList = (parts || []).map((p) => {
        const upd = {
          final_tier_id: finalTier?.id || '',
          final_price: finalPrice,
          finalized_at: nowISO(),
        };
        if (success) {
          upd.participation_status = 'finalized';
          if (deal.payment_model === 'reserve') upd.payment_status = 'captured';
          else if (deal.payment_model === 'pay_current') upd.payment_status = p.joined_price > finalPrice ? 'refunded_difference' : 'captured';
          else if (deal.payment_model === 'join_only') upd.payment_status = 'charged';
          else upd.payment_status = 'cash_on_delivery_pending';
        } else {
          upd.participation_status = 'cancelled';
          upd.cancelled_at = nowISO();
          upd.payment_status = deal.payment_model === 'cod' ? 'cancelled' : 'released';
        }
        return svc.entities.GroupDealParticipation.update(p.id, upd).catch(() => null);
      });
      await Promise.all(updateList);

      // Create orders for successful deals
      if (success) {
        const rest = await base44.asServiceRole.functions
          .invoke('supabaseProxy', { action: 'getRestaurantById', payload: { id: deal.restaurant_id } })
          .catch(() => null);
        const restaurant = rest?.data?.data;
        await Promise.all(
          (parts || []).filter((p) => p.participation_status !== 'cancelled').map((p) => {
            const orderItems = (items || []).map((it) => ({
              name: it.meal_name_snapshot,
              quantity: it.quantity_included * p.quantity,
              price: finalPrice,
              extras: [],
              notes: `عرض جماعي: ${deal.title}`,
            }));
            const itemsStr = orderItems.map((i) => `${i.quantity}x ${i.name}`).join(' | ');
            const orderData = {
              customer_name: p.name || 'عميل TAMAM',
              phone: p.phone || '',
              address: 'طلب من عرض جماعي — تواصل مع العميل',
              notes: `عرض جماعي: ${deal.title}`,
              kitchen_id: restaurant?.kitchen_id ?? restaurant?.id ?? deal.restaurant_id,
              courier_id: null,
              channel: 'توصيل',
              items: itemsStr,
              order_items: orderItems,
              drinks: null,
              dessert: null,
              quantity: orderItems.reduce((s, i) => s + i.quantity, 0),
              amount: Math.round(finalPrice * p.quantity),
              status: 'new',
            };
            return base44.asServiceRole.functions
              .invoke('supabaseProxy', { action: 'createOrder', payload: { orderData } })
              .then((r) => {
                const order = r?.data?.data;
                if (order?.id) {
                  return svc.entities.GroupDealParticipation.update(p.id, { order_id: order.id }).catch(() => null);
                }
              })
              .catch(() => null);
          })
        );
      }

      await svc.entities.GroupDeal.update(deal_id, {
        finalized: true,
        final_status: success ? 'success' : 'failed',
        status: success ? 'completed' : 'failed',
      });

      await logAudit(base44, deal_id, deal.title, 'finalized', admin, { status: deal.status }, { success, finalPrice, participants: unique, quantity }, reason);

      return Response.json({
        data: { finalized: true, success, final_price: finalPrice, participants: unique, quantity, tier: finalTier },
      });
    }

    if (action === 'validateDeal') {
      await requireAdmin(base44);
      const { deal, items, thresholds } = payload;
      const errs = await validateDeal(base44, deal, items, thresholds);
      return Response.json({ data: { valid: errs.length === 0, errors: errs } });
    }

    if (action === 'adminPublishDeal') {
      const admin = await requireAdmin(base44);
      const { deal_id } = payload;
      const { deal, items, thresholds, parts } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });
      const errs = await validateDeal(base44, deal, items, thresholds);
      if (errs.length) return Response.json({ data: { published: false, errors: errs } }, { status: 200 });
      const now = Date.now();
      const startMs = deal.start_at ? new Date(deal.start_at).getTime() : 0;
      const status = now < startMs ? 'scheduled' : 'active';
      await svc.entities.GroupDeal.update(deal_id, { status, published_at: nowISO() });
      await logAudit(base44, deal_id, deal.title, 'published', admin, { status: deal.status }, { status }, '');
      return Response.json({ data: { published: true, status } });
    }

    if (action === 'adminTransition') {
      const admin = await requireAdmin(base44);
      const { deal_id, to, reason, field } = payload;
      const { deal } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });
      const prev = { status: deal.status, end_at: deal.end_at };
      const update = {};
      const actionMap = { paused: 'paused', resumed: 'resumed', cancelled: 'cancelled', ended: 'ended', archived: 'archived' };
      if (to === 'end_extended' && field) update.end_at = field;
      else update.status = to;
      await svc.entities.GroupDeal.update(deal_id, update);
      const logAction = actionMap[to] || (to === 'end_extended' ? 'end_extended' : 'edited');
      await logAudit(base44, deal_id, deal.title, logAction, admin, prev, { ...update }, reason);
      return Response.json({ data: { ok: true } });
    }

    if (action === 'adminDuplicateDeal') {
      const admin = await requireAdmin(base44);
      const { deal_id } = payload;
      const { deal, items, thresholds } = await loadDealGraph(base44, deal_id);
      if (!deal) return Response.json({ error: 'العرض غير موجود' }, { status: 404 });
      const { id, created_date, updated_date, created_by_id, ...rest } = deal;
      const copy = await svc.entities.GroupDeal.create({
        ...rest,
        title: `${deal.title} (نسخة)`,
        status: 'draft',
        finalized: false,
        final_status: '',
        published_at: '',
        homepage_featured: false,
      });
      await Promise.all(
        (items || []).map((it, i) =>
          svc.entities.GroupDealItem.create({ ...it, id: undefined, deal_id: copy.id, sort_order: i }).catch(() => null)
        )
      );
      await Promise.all(
        (thresholds || []).map((t) =>
          svc.entities.GroupDealThreshold.create({ ...t, id: undefined, deal_id: copy.id }).catch(() => null)
        )
      );
      await logAudit(base44, copy.id, copy.title, 'duplicated', admin, { source: deal_id }, {}, '');
      return Response.json({ data: { id: copy.id } });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}