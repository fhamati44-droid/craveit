import { localOrderContext, validBasketInput, type BasketInput, type Offer, type Basket } from "./basketEngine.ts";

export interface BasketLine { offer: Offer; quantity: number }
export interface MealBasket {
  id: string; group: string; lines: BasketLine[]; subtotal: number; delivery: number;
  total: number; minutes: number; servings: number; score: number; compatibility: number;
  restaurants: string[]; mainCount: number; eligible: boolean;
  reason: Basket["reason"] | "quantity" | "pairing" | "flow";
}
export interface MealBasketGroup { id: string; best: MealBasket; providers: MealBasket[] }
const cents = (n: number) => Math.round(n * 100);
const finite = (n: number) => Number.isFinite(n);
const mainLines = (lines: BasketLine[]) => lines.filter(l => l.offer.profile.role === "أساسي");
const groupKey = (lines: BasketLine[]) => mainLines(lines).map(l => l.offer.group).sort().join("+");
const recipeKey = (lines: BasketLine[]) => lines.map(l => `${l.offer.uid}:${l.quantity}`).sort().join("|");
const familyCache = new Map<string,string>();
export function mealFamily(o: Offer): string {
  const key = `${o.group}:${o.name}`;
  const cached = familyCache.get(key); if (cached) return cached;
  const t = o.name.toLocaleLowerCase();
  const family = /سلمون|سمك|فيليه|salmon|fish|סלמון|דג/.test(t) ? "fish"
    : /بيتزا|مارغريتا|pizza|פיצה/.test(t) ? "pizza"
    : /باستا|رافيولي|سباغيتي|بيني|pasta|ravioli|פסטה/.test(t) ? "pasta"
    : /سلط|salad|סלט/.test(t) ? "salad"
    : /ساندويش|توست|باجيت|تشاباتا|تورتيلا|برغر|شاورما|sandwich|burger|טוסט|שווארמה/.test(t) ? "handheld"
    : /محشي|دوالي|كوسا|شيش برك|كبة.*لبن|stuffed|ממולא/.test(t) ? "stuffed"
    : /معجنات|سمبوسك|صفيحة|زيفا|جاكوندا|pastr|מאפה/.test(t) ? "bakery"
    : /مشاوي|كباب|نقانق|عروسة|grill|kebab|קבב/.test(t) ? "grill"
    : /دجاج|جاج|محمّر|محمر|منسف|chicken|rice|עוף|אורז/.test(t) ? "home" : "other";
  familyCache.set(key, family); return family;
}
const pairFits: Record<string,number> = {
  "home:stuffed":5, "grill:stuffed":5, "home:grill":4, "home:home":4,
  "stuffed:stuffed":4, "fish:salad":5, "grill:salad":5, "home:salad":5,
  "pizza:pasta":5, "pizza:salad":5, "pasta:salad":5, "handheld:handheld":4,
  "handheld:salad":4, "bakery:salad":4, "bakery:bakery":4,
  "pizza:stuffed":1, "handheld:stuffed":1,
};
/** Human starting rules, not learned or nutritionally verified pairings. */
export function pairingFit(a: Offer, b: Offer): number {
  if (a.group === b.group) return 0;
  const fa = mealFamily(a), fb = mealFamily(b);
  return pairFits[`${fa}:${fb}`] ?? pairFits[`${fb}:${fa}`] ?? 3;
}
export function redundantSide(main: Offer[], side: Offer): boolean {
  const descriptions = main.map(m => m.description).join(" ");
  return /سلط|salad|סלט/.test(side.name) && /سلطات|أنواع سلط|סלטים|salads/i.test(descriptions)
    || /بطاطا|fries|ציפס/.test(side.name) && /بطاطا|مقليات|fries|ציפס/i.test(descriptions);
}
function periodFit(o: Offer, input: BasketInput, context: ReturnType<typeof localOrderContext>) {
  const period = input.period === "auto" ? context.hour >= 5 && context.hour < 11 ? "breakfast" : context.hour >= 11 && context.hour < 17 ? "lunch" : "dinner" : input.period;
  return o.profile.time[["breakfast","lunch","dinner"].indexOf(period)] || 0;
}
function mealScore(o: Offer, input: BasketInput, context: ReturnType<typeof localOrderContext>, total: number) {
  const p = o.profile, target = input.goal === "light" ? Math.min(input.hunger,2) : input.hunger;
  const satiety = 5 - Math.abs(p.satiety-target), flavor = 5 - Math.abs(p.flavor-input.flavor);
  const fit = input.profile === "value" ? 5*Math.max(0,1-total/input.budget) : p.fit[["home","easy","value","variety"].indexOf(input.profile)] || 0;
  const goal = input.goal === "light" ? p.light || 0 : input.goal === "treat" ? p.treat || 0 : satiety;
  const contextScore = 20*(periodFit(o,input,context)*.25+p.day[context.weekend?1:0]*.15+p.occasion[["solo","family","guests"].indexOf(input.occasion)]*.2+satiety*.2+flavor*.2);
  return .6*contextScore+5*fit+3*goal;
}
function unavailable(o: Offer) {
  return !o.available || o.profile.needsCooking || !finite(o.price) || o.price<=0
    || !finite(o.delivery) || o.delivery<0 || !finite(o.minimum) || o.minimum<0
    || !finite(o.prep) || !finite(o.transport) || o.prep<0 || o.transport<0
    || !o.profile.servings || o.profile.servings<=0;
}
function disliked(o: Offer, input: BasketInput) {
  const text = `${o.name} ${o.description}`.toLocaleLowerCase();
  return input.disliked.split(/[,،;\n]/).map(s=>s.trim().toLocaleLowerCase()).filter(Boolean).some(s=>text.includes(s));
}
export function buildMealBasket(lines: BasketLine[], input: BasketInput, now=new Date(), context=localOrderContext(now)): MealBasket {
  const mains = mainLines(lines), restaurants = [...new Set(lines.map(l=>l.offer.restaurantId))];
  const byRestaurant = new Map<string,{subtotal:number;fee:number;minimum:number}>();
  for (const {offer:o,quantity:q} of lines) {
    const previous = byRestaurant.get(o.restaurantId) || {subtotal:0,fee:0,minimum:0};
    previous.subtotal+=cents(o.price)*q; previous.fee=Math.max(previous.fee,cents(o.delivery)); previous.minimum=Math.max(previous.minimum,cents(o.minimum));
    byRestaurant.set(o.restaurantId,previous);
  }
  const subtotal=[...byRestaurant.values()].reduce((n,r)=>n+r.subtotal,0)/100;
  const delivery=[...byRestaurant.values()].reduce((n,r)=>n+r.fee,0)/100;
  const total=(cents(subtotal)+cents(delivery))/100;
  const servings=mains.reduce((n,l)=>n+(l.offer.profile.servings||0)*l.quantity,0);
  const minutes=Math.max(0,...lines.map(l=>l.offer.prep+l.offer.transport));
  let compatibility=5, pairs=0,pairTotal=0, forbidden=false;
  for(let a=0;a<mains.length;a++)for(let b=a+1;b<mains.length;b++) { const fit=pairingFit(mains[a].offer,mains[b].offer);pairs++;pairTotal+=fit;if(fit<=0)forbidden=true; }
  if(pairs)compatibility=pairTotal/pairs;
  const weighted=mains.reduce((n,l)=>n+mealScore(l.offer,input,context,total)*(l.offer.profile.servings||0)*l.quantity,0)/Math.max(1,servings);
  const desired=Math.min(input.mainDishes??2,input.people);
  const score=Math.round(Math.max(0,Math.min(100,.85*weighted+3*compatibility-10*Math.max(0,servings/input.people-1)-5*Math.max(0,desired-mains.length)-4*Math.max(0,restaurants.length-1)))*10)/10;
  let reason:MealBasket["reason"]="";
  if(!validBasketInput(input))reason="invalid";
  else if(!mains.length || mains.length>3 || lines.length>4 || lines.some(l=>!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>99) || servings<input.people)reason="quantity";
  else if(lines.some(l=>unavailable(l.offer)) || lines.some(l=>!["أساسي","جانبي"].includes(l.offer.profile.role)) || new Set(lines.map(l=>l.offer.uid)).size!==lines.length)reason="unavailable";
  else if(input.allergen.trim())reason="allergy";
  else if(lines.some(l=>disliked(l.offer,input)))reason="disliked";
  else if(mains.some(l=>l.offer.kind==="daily") && lines.some(l=>l.offer.kind!=="daily"))reason="flow";
  else if((input.allowMixed===false && restaurants.length>1) || forbidden || new Set(mains.map(l=>l.offer.group)).size!==mains.length)reason="pairing";
  else if(lines.filter(l=>l.offer.profile.role==="جانبي").some(l=>!restaurants.some(id=>mains.some(m=>m.offer.restaurantId===id && id===l.offer.restaurantId)) || redundantSide(mains.map(m=>m.offer),l.offer)))reason="pairing";
  else if([...byRestaurant.values()].some(r=>r.subtotal<r.minimum))reason="minimum";
  else if(cents(total)>cents(input.budget))reason="budget";
  else if(minutes>input.maxMinutes)reason="time";
  else if(mains.some(l=>periodFit(l.offer,input,context)<=0))reason="period";
  return {id:recipeKey(lines),group:groupKey(lines),lines,subtotal,delivery,total,minutes,servings,score:finite(score)?score:0,compatibility,restaurants,mainCount:mains.length,eligible:!reason,reason};
}
function compare(a:MealBasket,b:MealBasket,desired:number) {
  return Number(b.eligible)-Number(a.eligible)
    || Number(b.mainCount>=desired)-Number(a.mainCount>=desired)
    || a.restaurants.length-b.restaurants.length || b.score-a.score || a.total-b.total;
}
/** Bounded allocations: exhaustive for usual small families, sampled for large groups. */
function allocations(offers:Offer[],people:number):number[][] {
  if(offers.length===1)return [[Math.ceil(people/(offers[0].profile.servings||1))]];
  const result:number[][]=[];
  function visit(index:number,amounts:number[],served:number){
    const capacity=offers[index].profile.servings||1;
    if(index===offers.length-1){const q=Math.max(1,Math.ceil((people-served)/capacity));const sum=served+q*capacity;if(q<=99 && sum<=Math.max(people*1.75,people+1))result.push([...amounts,q]);return;}
    const max=Math.min(99,Math.ceil(people/capacity));
    const values=people<=8?Array.from({length:max},(_,i)=>i+1):[...new Set([1,...[.25,.5,.75,1/offers.length].flatMap(f=>[Math.max(1,Math.floor(people*f/capacity)),Math.max(1,Math.ceil(people*f/capacity))])])].filter(n=>n<=max);
    for(const q of values){if(served+q*capacity>people*1.75)continue;visit(index+1,[...amounts,q],served+q*capacity);}
  }
  visit(0,[],0);return result;
}
function combinations(offers:Offer[],size:number,visit:(o:Offer[])=>void,start=0,chosen:Offer[]=[]){
  if(chosen.length===size){visit(chosen);return;}
  for(let i=start;i<offers.length;i++)combinations(offers,size,visit,i+1,[...chosen,offers[i]]);
}
export function recommendMealBaskets(offers:Offer[],relations:Record<string,string[]>,input:BasketInput,now=new Date()):MealBasketGroup[]{
  if(!validBasketInput(input)||input.allergen.trim())return [];
  const context=localOrderContext(now),desired=Math.min(input.mainDishes??2,input.people);
  const mains=offers.filter(o=>o.profile.role==="أساسي"&&!unavailable(o)&&!disliked(o,input)&&periodFit(o,input,context)>0&&o.prep+o.transport<=input.maxMinutes&&cents(o.price)+cents(o.delivery)<=cents(input.budget));
  const byUid=new Map(offers.map(o=>[o.uid,o]));
  const candidates=new Map<string,MealBasket>();
  function bestFor(combo:Offer[],includeSides=true,includeUnaffordable=false):MealBasket|undefined {
    if(new Set(combo.map(o=>o.group)).size!==combo.length || combo.some(a=>combo.some(b=>a!==b&&pairingFit(a,b)<=0)))return;
    if(combo.some(o=>o.kind==="daily")&&combo.some(o=>o.kind!=="daily"))return;
    let best:MealBasket|undefined;
    for(const amounts of allocations(combo,input.people)){
      const lines=combo.map((offer,i)=>({offer,quantity:amounts[i]}));
      if(!includeUnaffordable && lines.reduce((n,l)=>n+cents(l.offer.price)*l.quantity,0)>cents(input.budget))continue;
      const variants=[buildMealBasket(lines,input,now,context)];
      if(includeSides){const sides=[...new Set(combo.flatMap(o=>relations[o.uid]||[]))];for(const uid of sides){const side=byUid.get(uid);if(side && combo.some(o=>o.restaurantId===side.restaurantId) && !redundantSide(combo,side))variants.push(buildMealBasket([...lines,{offer:side,quantity:Math.ceil(input.people/(side.profile.servings||1))}],input,now,context));}}
      for(const b of variants)if(!best||compare(b,best,desired)<0)best=b;
    }
    return best;
  }
  function consider(combo:Offer[]){const best=bestFor(combo);if(!best?.eligible)return;const signature=combo.map(o=>o.uid).sort().join("|");const previous=candidates.get(signature);if(!previous||compare(best,previous,desired)<0)candidates.set(signature,best);}
  const restaurants=[...new Set(mains.map(o=>o.restaurantId))];
  const pools:Offer[][]=[];
  for(const restaurant of restaurants){
    const ranked=mains.filter(o=>o.restaurantId===restaurant).sort((a,b)=>mealScore(b,input,context,b.price/(b.profile.servings||1)*input.people+b.delivery)-mealScore(a,input,context,a.price/(a.profile.servings||1)*input.people+a.delivery)||a.price/(a.profile.servings||1)-b.price/(b.profile.servings||1));
    const pool:Offer[]=[],families=new Map<string,number>();
    for(const o of ranked){const family=mealFamily(o);if((families.get(family)||0)<3 && !pool.some(p=>p.group===o.group)){pool.push(o);families.set(family,(families.get(family)||0)+1);}if(pool.length>=12)break;}
    for(const o of ranked)if(pool.length<12&&!pool.some(p=>p.group===o.group))pool.push(o);
    pools.push(pool);
    for(let count=1;count<=desired;count++)combinations(pool,count,consider);
  }
  // Mixed restaurants are a fallback, with each restaurant's minimum and delivery charged.
  if(input.allowMixed!==false){
    const global=pools.flat().sort((a,b)=>mealScore(b,input,context,b.price/(b.profile.servings||1)*input.people+b.delivery)-mealScore(a,input,context,a.price/(a.profile.servings||1)*input.people+a.delivery)||a.price-b.price);
    const pool:Offer[]=[];for(const o of global)if(pool.length<16&&!pool.some(p=>p.group===o.group))pool.push(o);
    for(let count=2;count<=desired;count++)combinations(pool,count,combo=>{if(new Set(combo.map(o=>o.restaurantId)).size>1)consider(combo);});
  }
  const grouped=new Map<string,MealBasket[]>();
  for(const basket of candidates.values()){const list=grouped.get(basket.group)||[];list.push(basket);grouped.set(basket.group,list);}
  const top=[...grouped].map(([id,providers])=>{providers.sort((a,b)=>compare(a,b,desired));return{id,best:providers[0],providers};}).sort((a,b)=>compare(a.best,b.best,desired)).slice(0,3);
  // Expand every same-restaurant provider for the chosen composition, even outside the search pool.
  for(const group of top){
    const groups=mainLines(group.best.lines).map(l=>l.offer.group),providers:MealBasket[]=[];
    for(const restaurant of [...new Set(offers.map(o=>o.restaurantId))]){
      const combo=groups.map(key=>offers.find(o=>o.restaurantId===restaurant&&o.group===key&&o.profile.role==="أساسي"));
      if(combo.every((o):o is Offer=>!!o)){const basket=bestFor(combo,true,true);if(basket)providers.push(basket);}
    }
    for(const b of group.providers.filter(b=>b.restaurants.length>1).slice(0,6))providers.push(b);
    providers.sort((a,b)=>compare(a,b,desired));group.providers=providers;group.best=providers.find(b=>b.eligible)||group.best;
  }
  return top.sort((a,b)=>compare(a.best,b.best,desired));
}
