export type MarketNeed = 'breakfast' | 'cooking' | 'essentials' | 'guests';
export type MarketCategory = 'produce' | 'fruit' | 'dairy' | 'eggs' | 'bread' | 'protein' | 'pantry' | 'snacks' | 'drinks' | 'household' | 'other';
export interface MarketItem { uid:string; storeId:string; name:string; description:string; price:number; delivery:number; minimum:number; available:boolean }
export interface MarketLine { uid:string; quantity:number }
export interface MarketQuote { lines:MarketLine[]; subtotal:number; delivery:number; total:number; minimum:number; eligible:boolean; reason:''|'invalid'|'unavailable'|'store'|'minimum'|'budget'|'allergy'; score:number }
export const MARKET_MINIMUM=100;
const cents=(n:number)=>Math.round(n*100);
export function marketCategory(item:Pick<MarketItem,'name'>):MarketCategory {
 const n=item.name.toLocaleLowerCase();
 if(/أكواب|كاسات|صحون|ملاعق|أكياس|منظف|مسحوق|شامبو|صابون|محارم|ورق تواليت|تنظيف|סבון|ניקוי/.test(n))return 'household';
 if(/سنايدرز|بريتزل|بسكويت|شوكولا|شوكولات|شيبس|مثلجات|ميلكا|ميلكي|منتوس|فيتنس|مكسر|كستناء|بوظة|آيس|ايس كريم|حلوى|שוקולד/.test(n))return 'snacks';
 if(/أوتلي|مشروب|عصير|مياه|(?:^|\s)ماء(?:\s|$)|كولا|قهوة|تسترز|نسكافيه|(?:^|\s)شاي(?:\s|$)|קפה|מים|משקה/.test(n))return 'drinks';
 if(/جبن|جبنة|حليب|لبن|لبنة|زبادي|زبدة|قشطة|كريمة|دانون|يوبليه|יוגורט|גבינ|חלב|חמאה/.test(n))return 'dairy';
 if(/(?:^|\s)بيض(?:\s|$)|ביצים/.test(n))return 'eggs';
 if(/خبز|توست|كعك|بيتا|לחם|פיתה/.test(n))return 'bread';
 if(/شوربة|مرق|بهار|توابل|صلصة|מרק/.test(n))return 'pantry';
 if(/دجاج|جاج|لحم|سمك|سلمون|تونا|تونة|عجل|شنيتسل|עוף|בשר|דג/.test(n))return 'protein';
 if(/موز|تفاح|برتقال|أناناس|عنب|نكتارين|خوخ|فراولة|بطيخ|افوكادو|أفوكادو|תפוח|בננה/.test(n))return 'fruit';
 if(/خيار|بندورة|طماطم|بطاط|بصل|ثوم|فلفل|خس|سبانخ|جزر|ملفوف|كوسا|باذنجان|قرنبيط|بقدونس|نعنع|ليمون|עגבני|מלפפון/.test(n))return 'produce';
 if(/(?:^|\s)(?:أرز|رز|طحين|زيت|سكر|ملح)(?:\s|$)|معكرونة|باستا|عدس|حمص|فاصول|طحينة|معلب|مربى|عسل|شوفان|אורז|פסטה|שמן/.test(n))return 'pantry';
 return 'other';
}
export function quoteMarket(items:MarketItem[],lines:MarketLine[],budget:number,allergen=''):MarketQuote {
 const byId=new Map(items.map(p=>[p.uid,p]));const products=lines.map(l=>byId.get(l.uid));
 const subtotal=lines.reduce((n,l)=>n+cents(byId.get(l.uid)?.price||0)*l.quantity,0)/100;
 const delivery=Math.max(0,...products.map(p=>p?cents(p.delivery):0))/100;
 const minimum=Math.max(MARKET_MINIMUM,...products.map(p=>p?.minimum||0));
 const total=(cents(subtotal)+cents(delivery))/100;
 let reason:MarketQuote['reason']='';
 if(!Number.isFinite(budget)||budget<=0||!lines.length||lines.length>100||lines.some(l=>!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>99)||new Set(lines.map(l=>l.uid)).size!==lines.length)reason='invalid';
 else if(products.some(p=>!p||!p.available||![p.price,p.delivery,p.minimum].every(Number.isFinite)||p.price<=0||p.delivery<0||p.minimum<0))reason='unavailable';
 else if(new Set(products.map(p=>p!.storeId)).size!==1)reason='store';
 else if(allergen.trim())reason='allergy';
 else if(cents(subtotal)<cents(minimum))reason='minimum';
 else if(cents(total)>cents(budget))reason='budget';
 const variety=new Set(products.filter((p):p is MarketItem=>!!p).map(marketCategory)).size;
 const score=Math.round(Math.min(100,50+variety*7+20*Math.max(0,1-total/Math.max(1,budget))));
 return{lines,subtotal,delivery,total,minimum,eligible:!reason,reason,score};
}
const plans:Record<MarketNeed,MarketCategory[]>={breakfast:['dairy','eggs','bread','produce','fruit','pantry'],cooking:['protein','produce','pantry'],essentials:['produce','fruit','dairy','eggs','bread','pantry'],guests:['snacks','drinks','fruit','dairy','bread']};
function fitsNeed(item:MarketItem,need:MarketNeed):boolean {
 const cat=marketCategory(item),name=item.name.toLocaleLowerCase();
 if(!plans[need].includes(cat))return false;
 if(need==='breakfast'&&cat==='pantry')return /زيت زيتون|مربى|عسل|طحينة|شوفان|زيتون/.test(name);
 if((need==='breakfast'||need==='guests')&&cat==='dairy')return !/قشطة|كريمة خفق|كريمة طبخ/.test(name);
 if(need==='guests'&&cat==='drinks')return !/مشروب.*بروتين|مولر/.test(name);
 return true;
}
export function recommendMarket(items:MarketItem[],need:MarketNeed,budget:number,excluded='',allergen=''):MarketQuote[]{
 if(!plans[need]||!Number.isFinite(budget)||budget<=0||allergen.trim())return [];
 const avoid=excluded.split(/[,،;\n]/).map(x=>x.trim().toLocaleLowerCase()).filter(Boolean);
 const pool=items.filter(p=>p.available&&p.price>0&&Number.isFinite(p.price)&&!avoid.some(t=>(p.name+' '+p.description).toLocaleLowerCase().includes(t))&&fitsNeed(p,need));
 const result:MarketQuote[]=[];
 for(const storeId of new Set(pool.map(p=>p.storeId))){
  const store=pool.filter(p=>p.storeId===storeId).sort((a,b)=>a.price-b.price||a.uid.localeCompare(b.uid));
  for(let variant=0;variant<3;variant++){
   const chosen:MarketItem[]=[];
   for(const category of plans[need]){const options=store.filter(p=>marketCategory(p)===category);const item=options[variant%Math.min(3,options.length)];if(item&&chosen.reduce((n,p)=>n+cents(p.price),0)+cents(item.price)+cents(item.delivery)<=cents(budget))chosen.push(item);}
   if(need==='cooking'&&!chosen.some(p=>marketCategory(p)==='protein'))continue;
   while(chosen.length<12){
    const q=quoteMarket(items,chosen.map(p=>({uid:p.uid,quantity:1})),budget);if(q.eligible)break;
    const gap=Math.max(0,cents(q.minimum)-cents(q.subtotal));
    const options=store.filter(item=>!chosen.some(p=>p.uid===item.uid)&&cents(q.subtotal)+cents(item.price)+cents(item.delivery)<=cents(budget));
    options.sort((a,b)=>{const ac=cents(a.price),bc=cents(b.price);if((ac>=gap)!==(bc>=gap))return ac>=gap?-1:1;return ac>=gap?ac-bc:bc-ac;});
    if(!options[0])break;chosen.push(options[0]);
   }
   const q=quoteMarket(items,chosen.map(p=>({uid:p.uid,quantity:1})),budget);
   if(q.eligible&&new Set(chosen.map(marketCategory)).size>=Math.min(3,plans[need].length)&&!result.some(r=>r.lines.map(l=>l.uid).sort().join()===q.lines.map(l=>l.uid).sort().join()))result.push(q);
  }
 }
 return result.sort((a,b)=>b.score-a.score||a.total-b.total).slice(0,3);
}
export interface SavedMarketBasket { id:string; name:string; lines:MarketLine[] }
export function parseSavedMarket(raw:string|null):SavedMarketBasket[]{
 try{const data=JSON.parse(raw||'[]');if(!Array.isArray(data))return[];return data.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.trim()&&Array.isArray(x.lines)&&x.lines.length>0&&x.lines.length<=100&&x.lines.every((l:MarketLine)=>l&&typeof l.uid==='string'&&Number.isInteger(l.quantity)&&l.quantity>0&&l.quantity<=99)&&new Set(x.lines.map((l:MarketLine)=>l.uid)).size===x.lines.length).slice(0,20);}catch{return[];}
}
