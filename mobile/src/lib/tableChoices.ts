import type { BasketInput, Offer } from './basketEngine.ts';
import { buildMealBasket, recommendMealBaskets, tableRole, type MealBasketGroup, type MealBasket } from './multiBasketEngine.ts';

export interface TableChoice { style: 'simple' | 'full'; group: MealBasketGroup; input: BasketInput }

/**
 * Present two honest alternatives rather than two arbitrary top-scoring recipes.
 * Only offers from the live catalogue can enter either alternative; never invent sides.
 * The full option is omitted when no meaningfully larger affordable table is available.
 */
export function recommendTableChoices(offers: Offer[], relations: Record<string,string[]>, input: BasketInput, now = new Date()): TableChoice[] {
  const simpleInput = {...input, autoTable:false, mainDishes:1};
  const simpleSuggestions = recommendMealBaskets(offers, relations, simpleInput, now);
  const oneDish = simpleSuggestions.map(g => {
    const lines = g.best.lines.filter(l => l.offer.profile.role === 'أساسي');
    const best = buildMealBasket(lines, simpleInput, now);
    return {style:'simple' as const, input:simpleInput, group:{...g, id:'simple:'+best.group, best, providers:[best]}};
  }).find(c => c.group.best.eligible && c.group.best.mainCount === 1);
  if (!oneDish) return [];

  const result: TableChoice[] = [oneDish];
  const fullInput = {...input, autoTable:input.people < 3, mainDishes:input.people >= 3 ? 2 : 1};
  const fullSuggestions = recommendMealBaskets(offers, relations, fullInput, now);

  const expandable = fullSuggestions.map(g => g.best)
    .filter(b => b.eligible && b.id !== oneDish.group.best.id);
  if (input.people < 3) expandable.unshift(oneDish.group.best);

  const expanded: MealBasket[] = [];
  for (const base of expandable.slice(0,6)) {
    const main = base.lines.filter(l => l.offer.profile.role === 'أساسي');
    const normalized = buildMealBasket(base.lines, fullInput, now);
    if (normalized.eligible && base.lines.length > 1) expanded.push(normalized);
    if (base.lines.length >= 5) continue;
    const restaurantIds = new Set(main.map(l => l.offer.restaurantId));
    const selected = new Set(base.lines.map(l => l.offer.group));
    const sides = offers.filter(o =>
      o.profile.role === 'جانبي' && o.available && !o.profile.needsCooking &&
      o.profile.servings && o.profile.servings > 0 && o.price > 0 &&
      restaurantIds.has(o.restaurantId) && !selected.has(o.group) &&
      (input.allergen.trim() === '') &&
      !input.disliked.split(/[,،;\n]/).map(x=>x.trim().toLocaleLowerCase()).filter(Boolean).some(x=>(o.name+' '+o.description).toLocaleLowerCase().includes(x)) &&
      !base.lines.some(l=>l.offer.uid===o.uid) &&
      // Prefer salads / starters when composing a meal; no double-counting extras.
      ['salad','starter','other'].includes(tableRole(o))
    ).sort((a,b)=>Number(tableRole(a)!=='salad')-Number(tableRole(b)!=='salad')||a.price-b.price);
    for (const side of sides.slice(0,12)) {
      const basket=buildMealBasket([...base.lines,{offer:side,quantity:Math.max(1,Math.ceil(input.people/(side.profile.servings||1)))}],fullInput,now);
      if(basket.eligible && basket.lines.length>1)expanded.push(basket);
    }
  }
  const bestFull = expanded
    .filter(b=>b.id!==oneDish.group.best.id && (b.mainCount>1 || b.lines.length>1))
    .sort((a,b)=>Number(b.mainCount>1)-Number(a.mainCount>1) || Number(b.lines.length>2)-Number(a.lines.length>2) || a.total-b.total || b.score-a.score)[0];

  if (bestFull) {
    result.push({style:'full',input:fullInput,group:{id:'full:'+bestFull.group,best:bestFull,providers:[bestFull]}});
  }
  return result;
}
