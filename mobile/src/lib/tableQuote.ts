import { buildBasket, type Basket, type BasketInput, type Offer } from './basketEngine';

export type TableSide = { offer: Offer; quantity: number };
export type TableQuote = Basket & { sideLines: TableSide[] };
const cents = (n: number) => Math.round(n * 100);

/** Verify the complete table using live prices and a single kitchen, before checkout. */
export function quoteTable(primary: Offer, sides: TableSide[], input: BasketInput, now = new Date()): TableQuote {
  const base = buildBasket(primary, undefined, input, now);
  const all = [primary, ...sides.map(s => s.offer)];
  let reason: Basket['reason'] = base.reason;
  if (sides.some(s => !Number.isInteger(s.quantity) || s.quantity < 1 || s.quantity > 99 ||
      s.offer.restaurantId !== primary.restaurantId || s.offer.profile.role !== 'جانبي' ||
      !s.offer.available || s.offer.profile.needsCooking ||
      !Number.isFinite(s.offer.price) || s.offer.price <= 0 ||
      !Number.isFinite(s.offer.prep) || s.offer.prep < 0)) reason = 'unavailable';
  const subtotalCents = cents(primary.price) * base.quantity +
    sides.reduce((n, s) => n + cents(s.offer.price) * s.quantity, 0);
  const total = (subtotalCents + cents(primary.delivery)) / 100;
  const minutes = Math.max(...all.map(o => o.prep)) + primary.transport;
  if (!reason && cents(total) > cents(input.budget)) reason = 'budget';
  if (!reason && minutes > input.maxMinutes) reason = 'time';
  return { ...base, side: undefined, sideQuantity: 0, sideLines: sides,
    subtotal: subtotalCents / 100, total, minutes, eligible: !reason, reason };
}
