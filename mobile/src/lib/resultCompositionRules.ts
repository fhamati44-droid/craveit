import type { BasketInput, Offer } from './basketEngine.ts';
import { buildMealBasket, recommendMealBaskets, tableRole, type MealBasket, type MealBasketGroup } from './multiBasketEngine.ts';

/** Derived from TAMAM_Table_Profiles_result_rules_20261124.xlsx, sheet "قواعد نتيجة الطلب".
 * Excel controls preferred composition only; prices/availability always come from loadBasketCatalog().
 * For events without a main course (coffee/snacks), preserve the existing suggestion engine.
 */
const OCCASION_RULES = {
  everyday: [1, 1, 2, 2],
  friday: [1, 1, 2, 2],
  friendsMeal: [1, 1, 2, 2],
  guests: [1, 1, 2, 2],
  breakfast: [1, 1, 2, 2],
  work: [1, 1, 2, 2],
  birthday: [1, 1, 2, 2],
} as const;
type OccasionKey = keyof typeof OCCASION_RULES;
function occasionFor(input: BasketInput): OccasionKey | null {
  if(input.period==='breakfast'||input.period==='brunch') return 'breakfast';
  if(input.gathering==='work') return 'work';
  if(input.occasion==='guests') return 'guests';
  if(input.gathering==='friends'||input.gathering==='women') return 'friendsMeal';
  return 'everyday';
}
export function getDesiredResultComposition(input: BasketInput) {
  const event=occasionFor(input);
  if(!event) return {mains:1,salads:0,event:'legacy'};
  const band=input.people===1?0:input.people===2?1:input.people<=4?2:3;
  return {event,mains:OCCASION_RULES[event][band],salads:input.people>=5?2:1};
}
const desiredRole = (offer:Offer) => tableRole(offer)==='salad';
function compatibleSide(side:Offer,basket:MealBasket,input:BasketInput) {
  return side.profile.role==='جانبي' && desiredRole(side)
    && side.available && !side.profile.needsCooking && side.profile.servings != null
    && side.profile.servings>0 && Number.isFinite(side.price) && side.price>0
    && basket.restaurants.includes(side.restaurantId)
    && !basket.lines.some(l=>l.offer.group===side.group||l.offer.uid===side.uid)
    && !input.disliked.split(/[,،;\n]/).map(t=>t.trim().toLowerCase()).filter(Boolean).some(t=>(side.name+' '+side.description).toLowerCase().includes(t));
}
function enrich(base:MealBasket,offers:Offer[],input:BasketInput,now:Date,needed:number):MealBasket {
  let best=base;
  if(!base.eligible || input.allergen.trim())return base;
  const existing=base.lines.filter(l=>l.offer.profile.role==='جانبي' && desiredRole(l.offer)).length;
  if(existing>=needed)return base;
  const sides=offers.filter(o=>compatibleSide(o,base,input)).sort((a,b)=>a.price-b.price).slice(0,24);
  for(const side of sides){
    const lines=[...base.lines,{offer:side,quantity:Math.max(1,Math.ceil(input.people/(side.profile.servings||1)))}];
    if(lines.length>5)continue;
    const candidate=buildMealBasket(lines,input,now);
    if(candidate.eligible && (best===base || candidate.total<best.total))best=candidate;
  }
  return best;
}
/** Only changes ranked results; existing form, cart preparation, and supplier checkout stay untouched. */
export function recommendResultBaskets(offers:Offer[],relations:Record<string,string[]>,input:BasketInput,now=new Date()):MealBasketGroup[] {
  const requirements=getDesiredResultComposition(input);
  const current=recommendMealBaskets(offers,relations,input,now);
  if(!current.length || input.allergen.trim())return current;
  const withMoreMains=requirements.mains>1
    ? recommendMealBaskets(offers,relations,{...input,autoTable:false,mainDishes:2},now)
    : [];
  const pool=new Map<string,MealBasketGroup>();
  for(const g of [...withMoreMains,...current]){
    if(!g.best.eligible)continue;
    const best=enrich(g.best,offers,input,now,requirements.salads);
    const copy={...g,best,providers:[best,...g.providers.filter(p=>p.id!==best.id)]};
    const previous=pool.get(g.id);
    if(!previous || best.lines.length>previous.best.lines.length)pool.set(g.id,copy);
  }
  const scored=[...pool.values()].sort((a,b)=>{
    const rank=(g:MealBasketGroup)=>{
      const main=g.best.mainCount>=requirements.mains?1:0;
      const side=g.best.lines.filter(l=>l.offer.profile.role==='جانبي'&&desiredRole(l.offer)).length;
      return main*100 + Math.min(requirements.salads,side)*30 + g.best.score/10;
    };
    return rank(b)-rank(a) || a.best.total-b.best.total;
  });
  return scored.slice(0,3).length?scored.slice(0,3):current;
}
