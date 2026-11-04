export type ProfileId = "home" | "easy" | "value" | "variety";
export type Goal = "full" | "light" | "treat" | "auto";
export interface BasketInput {
  profile: ProfileId; people: number; budget: number; maxMinutes: number;
  hunger: number; flavor: number; period: "auto" | "breakfast" | "lunch" | "dinner";
  occasion: "solo" | "family" | "guests"; goal: Goal; disliked: string;
  allergen: string; lastMealHours: string; children: number; notes: string;
  mainDishes?: number; allowMixed?: boolean;
}
export interface MealProfile {
  group: string; role: string; servings: number | null; time: number[];
  day: number[]; occasion: number[]; satiety: number; flavor: number;
  fit: (number | null)[]; light: number | null; treat: number | null; needsCooking: boolean;
}
export interface Offer {
  uid: string; group: string; restaurantId: string; name: string; description: string;
  price: number; delivery: number; minimum: number; prep: number; transport: number;
  available: boolean; profile: MealProfile; extrasSourceId?: string | number | null;
  kind: "menu" | "home" | "daily";
}
export interface Basket {
  primary: Offer; side?: Offer; quantity: number; sideQuantity: number;
  subtotal: number; delivery: number; total: number; minutes: number;
  score: number; eligible: boolean; reason: "" | "unavailable" | "allergy" | "disliked" | "budget" | "minimum" | "time" | "period" | "invalid";
}
export interface DishGroup { id: string; best: Basket; providers: Basket[] }
export const DEFAULT_BASKET_INPUT: BasketInput = {
  profile: "home", people: 4, budget: 240, maxMinutes: 70, hunger: 4, flavor: 3,
  period: "auto", occasion: "family", goal: "full", disliked: "", allergen: "",
  lastMealHours: "", children: 0, notes: "",
  mainDishes: 2, allowMixed: true,
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function validBasketInput(x: BasketInput) {
  return ["home","easy","value","variety"].includes(x.profile)
    && Number.isInteger(x.people) && x.people >= 1 && x.people <= 99
    && finite(x.budget) && x.budget > 0 && finite(x.maxMinutes) && x.maxMinutes > 0
    && finite(x.hunger) && x.hunger >= 0 && x.hunger <= 5
    && finite(x.flavor) && x.flavor >= 0 && x.flavor <= 5
    && ["auto","breakfast","lunch","dinner"].includes(x.period)
    && ["solo","family","guests"].includes(x.occasion)
    && ["full","light","treat","auto"].includes(x.goal)
    && Number.isInteger(x.children) && x.children >= 0
    && typeof x.lastMealHours === "string" && (x.lastMealHours === "" || (finite(Number(x.lastMealHours)) && Number(x.lastMealHours) >= 0))
    && typeof x.disliked === "string" && typeof x.allergen === "string" && typeof x.notes === "string"
    && (x.mainDishes === undefined || (Number.isInteger(x.mainDishes) && x.mainDishes >= 1 && x.mainDishes <= 3))
    && (x.allowMixed === undefined || typeof x.allowMixed === "boolean");
}
export function localOrderContext(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  return { hour: Number(parts.find(x => x.type === "hour")?.value || 0), weekend: ["Fri", "Sat"].includes(parts.find(x => x.type === "weekday")?.value || "") };
}
const cents = (v: number) => Math.round(v * 100);
const rejected = (x: BasketInput, offer: Offer) => {
  const text = `${offer.name} ${offer.description}`.toLocaleLowerCase();
  return x.disliked.split(/[,،;\n]/).map(s => s.trim().toLocaleLowerCase()).filter(Boolean).some(s => text.includes(s));
};
export function buildBasket(primary: Offer, side: Offer | undefined, input: BasketInput, now = new Date()): Basket {
  const p = primary.profile, context = localOrderContext(now);
  const quantity = p.servings && p.servings > 0 ? Math.ceil(input.people / p.servings) : 0;
  const sideQuantity = side?.profile.servings ? Math.ceil(input.people / side.profile.servings) : 0;
  const subtotalCents = cents(primary.price) * quantity + (side ? cents(side.price) * sideQuantity : 0);
  const deliveryCents = cents(primary.delivery);
  const total = (subtotalCents + deliveryCents) / 100;
  const minutes = Math.max(primary.prep, side?.prep || 0) + primary.transport;
  const period = input.period === "auto" ? context.hour >= 5 && context.hour < 11 ? "breakfast" : context.hour >= 11 && context.hour < 17 ? "lunch" : "dinner" : input.period;
  const time = p.time[["breakfast","lunch","dinner"].indexOf(period)];
  const target = input.goal === "light" ? Math.min(input.hunger, 2) : input.hunger;
  const satiety = 5 - Math.abs(p.satiety - target), flavor = 5 - Math.abs(p.flavor - input.flavor);
  const occasion = p.occasion[["solo","family","guests"].indexOf(input.occasion)];
  const base = 20 * (time * .25 + p.day[context.weekend ? 1 : 0] * .15 + occasion * .2 + satiety * .2 + flavor * .2);
  const fit = input.profile === "value" ? 5 * Math.max(0, 1 - total / input.budget) : p.fit[["home","easy","value","variety"].indexOf(input.profile)] || 0;
  const goal = input.goal === "light" ? p.light || 0 : input.goal === "treat" ? p.treat || 0 : satiety;
  const score = Math.round(Math.max(0, Math.min(100, .6 * base + 5 * fit + 3 * goal - 10 * Math.max(0, quantity * (p.servings || 0) / input.people - 1))) * 10) / 10;
  let reason: Basket["reason"] = "";
  const offers = [primary, ...(side ? [side] : [])];
  if (!validBasketInput(input)) reason = "invalid";
  else if (p.role !== "أساسي" || !quantity || offers.some(o => !o.available || o.profile.needsCooking || !finite(o.price) || o.price <= 0 || !finite(o.delivery) || o.delivery < 0 || !finite(o.minimum) || o.minimum < 0) || (side && (side.restaurantId !== primary.restaurantId || side.profile.role !== "جانبي"))) reason = "unavailable";
  // No source currently certifies allergens. Never infer safety from an ingredient name.
  else if (input.allergen.trim()) reason = "allergy";
  else if (offers.some(o => rejected(input, o))) reason = "disliked";
  else if (subtotalCents < cents(primary.minimum)) reason = "minimum";
  else if (cents(total) > cents(input.budget)) reason = "budget";
  else if (minutes > input.maxMinutes) reason = "time";
  else if (time <= 0) reason = "period";
  return { primary, side, quantity, sideQuantity, subtotal: subtotalCents / 100, delivery: deliveryCents / 100, total, minutes, score: Number.isFinite(score) ? score : 0, eligible: !reason, reason };
}
export function recommendBaskets(offers: Offer[], relations: Record<string, string[]>, input: BasketInput, now = new Date()): DishGroup[] {
  if (!validBasketInput(input)) return [];
  const byUid = new Map(offers.map(o => [o.uid, o]));
  const groups = new Map<string, Basket[]>();
  for (const primary of offers.filter(o => o.profile.role === "أساسي")) {
    const variants = [buildBasket(primary, undefined, input, now), ...(relations[primary.uid] || []).flatMap(uid => {
      const side = byUid.get(uid);
      return side && side.restaurantId === primary.restaurantId ? [buildBasket(primary, side, input, now)] : [];
    })].sort((a,b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.total - b.total);
    const group = groups.get(primary.group) || [];
    group.push(variants[0]); groups.set(primary.group, group);
  }
  return [...groups].map(([id, providers]) => {
    providers.sort((a,b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.total - b.total);
    return { id, best: providers[0], providers };
  }).filter(g => g.best.eligible).sort((a,b) => b.best.score - a.best.score || a.best.total - b.best.total).slice(0,3);
}
