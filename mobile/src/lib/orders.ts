import type { Order, OrderStatus, Restaurant } from "./types";

// Mirrors craveit-nextjs/src/app/checkout/page.tsx so orders land in the
// shared `orders` table exactly the way the CRM kitchen/courier/printer
// (food-crm-final) already reads them.

export const WHATSAPP_NUMBER = "972544616474";

export interface CheckoutLine {
  meal: { id: string | number; name?: string; name_ar?: string; price: number };
  restaurant: Restaurant;
  extras: { id: string | number; name: string; name_ar?: string | null; price: number }[];
  note: string;
  quantity: number;
}
export interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  notes: string;
  delivery: "delivery" | "pickup";
  payment: "cash" | "credit";
  channel: string;
}

// The kitchen reads Hebrew names first (same as the old site), then Arabic.
const kitchenName = (x: { name?: string; name_ar?: string | null }) =>
  x.name || x.name_ar || "";
const unitPrice = (line: CheckoutLine) =>
  Number(line.meal.price) +
  line.extras.reduce((sum, e) => sum + Number(e.price || 0), 0);
export const lineTotal = (line: CheckoutLine) => unitPrice(line) * line.quantity;

export function groupByRestaurant<T extends CheckoutLine>(lines: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const key = String(line.restaurant.id);
    groups.set(key, [...(groups.get(key) || []), line]);
  }
  return [...groups.values()];
}

export const deliveryFeeFor = (restaurant: Restaurant, form: Pick<CheckoutForm, "delivery">) =>
  form.delivery === "pickup" ? 0 : Number(restaurant.delivery_fee || 0);

/** One `orders` row per restaurant: each kitchen gets only its own items. */
export function buildOrders(
  lines: CheckoutLine[],
  form: CheckoutForm,
): Omit<Order, "id" | "created_at">[] {
  return groupByRestaurant(lines).map((group) => {
    const restaurant = group[0].restaurant;
    const subtotal = group.reduce((sum, line) => sum + lineTotal(line), 0);
    const payment = form.payment === "credit" ? "אשראי בדלת" : "מזומן";
    const notes = [
      form.notes.trim(),
      ...group
        .filter((l) => l.note.trim())
        .map((l) => `${kitchenName(l.meal)}: ${l.note.trim()}`),
      `תשלום: ${payment}`,
    ]
      .filter(Boolean)
      .join(" | ");
    return {
      customer_name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.delivery === "delivery" ? form.address.trim() : "איסוף עצמי",
      notes,
      kitchen_id: restaurant.kitchen_id ?? null,
      courier_id: null,
      channel: form.channel,
      items: group.map((l) => `${kitchenName(l.meal)} ×${l.quantity}`).join(" | "),
      order_items: group.map((l) => ({
        name: kitchenName(l.meal),
        quantity: l.quantity,
        price: Number(l.meal.price),
        extras: l.extras.map((e) => ({ name: kitchenName(e), price: Number(e.price || 0) })),
        item_total: lineTotal(l),
      })),
      drinks: null,
      dessert: null,
      quantity: group.reduce((sum, l) => sum + l.quantity, 0),
      amount: subtotal + deliveryFeeFor(restaurant, form),
      status: "new",
    } as Omit<Order, "id" | "created_at">;
  });
}

export function validate(form: CheckoutForm) {
  const errors: Partial<Record<keyof CheckoutForm, string>> = {};
  if (!form.name.trim()) errors.name = "الاسم مطلوب";
  const digits = form.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 13) errors.phone = "رقم الهاتف مش صحيح";
  if (form.delivery === "delivery" && !form.address.trim())
    errors.address = "العنوان مطلوب للتوصيل";
  return errors;
}

export const STATUS_STEPS: OrderStatus[] = ["new", "confirmed", "cooking", "ready", "delivered"];
export const STATUS_LABEL: Record<string, string> = {
  new: "وصل الطلب",
  confirmed: "المطعم أكّد",
  cooking: "عم ينطبخ",
  ready: "جاهز، الشوفير بالطريق",
  delivered: "وصل! صحتين",
  cancelled: "انلغى الطلب",
};
