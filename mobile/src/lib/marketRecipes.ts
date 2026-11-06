import {quoteMarket,type MarketItem,type MarketLine} from './marketEngine.ts';
export type RecipeSection='meals'|'salads'|'cakes'|'cleaning'|'home';
type Names={ar:string;he:string;en:string};
export type RecipeUnit='g'|'ml'|'piece'|'pack'|'tbsp'|'tsp'|'pinch';
export interface Ingredient {id:string;name:Names;amount:number;unit:RecipeUnit;match:RegExp}
export interface MarketRecipe {id:string;section:RecipeSection;name:Names;ingredients:Ingredient[];source?:string;serves?:number}
const n=(ar:string,en:string,he:string):Names=>({ar,en,he});
const i=(id:string,name:Names,amount:number,unit:RecipeUnit,match:RegExp):Ingredient=>({id,name,amount,unit,match});
const salt=i('salt',n('ملح','Salt','מלח'),1,'pinch',/^ملح طعام|table salt|מלח/);
const eggs=i('eggs',n('بيض','Eggs','ביצים'),4,'piece',/^(?:بيض|eggs|ביצים)(?:\s|$)/);
const selfFlour=i('self-flour',n('طحين ذاتي التخمير','Self-raising flour','קמח תופח'),200,'g',/طحين.*ذاتي|دقيق.*ذاتي|self.raising flour|קמח תופח/);
const powder=i('baking-powder',n('بيكنج باودر','Baking powder','אבקת אפייה'),1,'tsp',/بيكن[جغ].*باودر|بيكنج بودر|baking powder|אבקת אפייה/);
const sugar=i('sugar',n('سكر ناعم للحبيبات','Caster sugar','סוכר דק'),200,'g',/^سكر أبيض|سكر ناعم|caster sugar|סוכר/);
const butter=i('butter',n('زبدة غير مملحة','Unsalted butter','חמאה ללא מלח'),200,'g',/زبدة.*(?:غير مملحة|بدون ملح)|unsalted butter|חמאה ללא מלח/);
export const marketRecipes:MarketRecipe[]=[
 {id:'chocolate-cake',section:'cakes',name:n('كعكة شوكو — بدون كريمة','Chocolate sponge — no frosting','עוגת שוקולד ללא ציפוי'),source:'https://www.bbcgoodfood.com/recipes/easy-chocolate-cake',ingredients:[sugar,butter,eggs,selfFlour,i('cocoa',n('كاكاو خام','Cocoa powder','אבקת קקאו'),2,'tbsp',/كاكاو(?: خام| بودرة)?|cocoa powder|קקאו/),powder,i('vanilla',n('خلاصة فانيلا','Vanilla extract','תמצית וניל'),.5,'tsp',/خلاصة فانيلا|فانيلا سائلة|vanilla extract|תמצית וניל/),i('milk',n('حليب','Milk','חלב'),2,'tbsp',/^حليب|^milk|^חלב/),salt]},
 {id:'orange-cake',section:'cakes',name:n('كعكة برتقال — بدون تزيين','Orange sponge — no icing','עוגת תפוזים ללא ציפוי'),source:'https://www.bbcgoodfood.com/recipes/mary-berrys-orange-layer-cake',ingredients:[i('baking-spread',n('دهون مخصصة للخبز','Baking spread','ממרח שומן לאפייה'),225,'g',/مارغرين.*خبز|baking spread|מרגרינה לאפייה/),{...selfFlour,amount:225},powder,{...sugar,amount:100},i('brown-sugar',n('سكر بني','Brown sugar','סוכר חום'),100,'g',/سكر بني|brown sugar|סוכר חום/),eggs,i('orange',n('برتقال لبشر القشر','Oranges for zest','תפוזים לגרידת הקליפה'),2,'piece',/^برتقال$|^oranges?$|^תפוזים$/)]},
 {id:'fresh-tomato-pasta',section:'meals',name:n('باستا بصلصة البندورة الطازجة','Fresh tomato pasta','פסטה ברוטב עגבניות טריות'),serves:4,ingredients:[i('pasta',n('باستا','Pasta','פסטה'),500,'g',/^باستا|^معكرونة|pasta|פסטה/),i('tomato',n('بندورة','Tomatoes','עגבניות'),600,'g',/^بندورة$|^tomatoes?$|^עגבניות$/),i('oil',n('زيت دوار الشمس','Sunflower oil','שמן חמניות'),30,'ml',/^زيت دوار الشمس|sunflower oil|שמן חמניות/),{...salt,amount:5,unit:'g'},i('pepper',n('فلفل أسود','Black pepper','פלפל שחור'),1,'pinch',/^فلفل أسود|black pepper|פלפל שחור/)]},
 {id:'tuna-rice',section:'meals',name:n('رز وتونة مع خضار','Rice & tuna with vegetables','אורז וטונה עם ירקות'),serves:4,ingredients:[i('rice',n('أرز','Rice','אורז'),300,'g',/^أرز|^رز|rice|אורז/),i('tuna',n('تونة مصفاة','Drained tuna','טונה מסוננת'),200,'g',/^تونة|^تونا|tuna|טונה/),i('cucumber',n('خيار','Cucumbers','מלפפונים'),2,'piece',/^خيار$/),i('tomato',n('بندورة','Tomatoes','עגבניות'),2,'piece',/^بندورة$/),i('lemon',n('ليمون','Lemon','לימון'),1,'piece',/^ليمون$/),salt,i('pepper',n('فلفل أسود','Black pepper','פלפל שחור'),1,'pinch',/^فلفل أسود/)]},
 {id:'tuna-pasta',section:'meals',name:n('باستا بالتونة والبندورة','Tuna & tomato pasta','פסטה עם טונה ועגבניות'),serves:4,source:'https://www.bbcgoodfood.com/recipes/pasta-tuna-tomato-sauce',ingredients:[i('olive-oil',n('زيت زيتون','Olive oil','שמן זית'),2,'tbsp',/^زيت زيتون|olive oil|שמן זית/),i('onion',n('بصل','Onion','בצל'),1,'piece',/^بصل$|^onion$|^בצל$/),i('garlic',n('فصوص ثوم','Garlic cloves','שיני שום'),2,'piece',/^ثوم|garlic|שום/),i('tomato-can',n('بندورة مقطعة معلبة','Canned chopped tomatoes','עגבניות קצוצות משומרות'),400,'g',/بندورة.*معلبة|طماطم.*مقطعة.*معلبة|chopped tomatoes|עגבניות.*משומר/),i('chilli',n('شطة مطحونة','Chilli powder','אבקת צ׳ילי'),.5,'tsp',/شطة.*مطحونة|chilli powder|אבקת צ.ילי/),{...sugar,amount:1,unit:'tsp'},i('pasta',n('باستا','Pasta','פסטה'),500,'g',/^باستا|^معكرونة|pasta|פסטה/),i('tuna',n('تونة مصفاة','Drained tuna','טונה מסוננת'),100,'g',/^تونة|^تونا|tuna|טונה/),salt,i('pepper',n('فلفل أسود','Black pepper','פלפל שחור'),1,'pinch',/^فلفل أسود|black pepper|פלפל שחור/)]},
 {id:'fresh-salad',section:'salads',name:n('سلطة بندورة وخيار','Tomato & cucumber salad','סלט עגבניות ומלפפונים'),serves:4,ingredients:[i('tomato',n('بندورة','Tomatoes','עגבניות'),2,'piece',/^بندورة$|^tomatoes?$|^עגבניות$/),i('cucumber',n('خيار','Cucumbers','מלפפונים'),2,'piece',/^خيار$|^cucumbers?$|^מלפפונים$/),i('lemon',n('ليمون','Lemon','לימון'),1,'piece',/^ليمون$|^lemon$|^לימון$/),i('olive-oil',n('زيت زيتون','Olive oil','שמן זית'),1,'tbsp',/^زيت زيتون|olive oil|שמן זית/),salt]},
 {id:'feta-salad',section:'salads',name:n('سلطة خضار مع فيتا','Vegetable & feta salad','סלט ירקות ופטה'),serves:4,ingredients:[i('tomato',n('بندورة','Tomatoes','עגבניות'),2,'piece',/^بندورة$/),i('cucumber',n('خيار','Cucumbers','מלפפונים'),2,'piece',/^خيار$/),i('feta',n('جبنة فيتا','Feta cheese','גבינת פטה'),200,'g',/^جبنة فيتا|feta|פטה/),i('olives',n('زيتون أسود','Black olives','זיתים שחורים'),100,'g',/^زيتون أسود|black olives|זיתים שחורים/),i('lemon',n('ليمون','Lemon','לימון'),1,'piece',/^ليمون$/)]},
 {id:'kitchen-clean',section:'cleaning',name:n('تنظيف المطبخ','Kitchen cleaning','ניקוי המטבח'),ingredients:[i('dish-liquid',n('سائل جلي','Dishwashing liquid','נוזל כלים'),1,'pack',/سائل جلي|dishwashing|נוזל כלים/),i('hand-soap',n('صابون يدين','Hand soap','סבון ידיים'),1,'pack',/صابون يدين|hand soap|סבון ידיים/)]},
 {id:'home-clean',section:'cleaning',name:n('تجهيزات تنظيف البيت','Household cleaning supplies','מוצרי ניקיון לבית'),ingredients:[i('laundry',n('مسحوق غسيل','Laundry detergent powder','אבקת כביסה'),1,'pack',/^مسحوق غسيل|laundry powder|אבקת כביסה/),i('dish-liquid',n('سائل جلي','Dishwashing liquid','נוזל כלים'),1,'pack',/سائل جلي|dishwashing|נוזל כלים/),i('hand-soap',n('صابون يدين','Hand soap','סבון ידיים'),1,'pack',/صابون يدين|hand soap|סבון ידיים/),i('air-freshener',n('معطر جو','Air freshener','מטהר אוויר'),1,'pack',/معطر جو|air freshener|מטהר אוויר/)]},
 {id:'serving-home',section:'home',name:n('أغراض التقديم للبيت','Serving supplies','מוצרים להגשה בבית'),ingredients:[i('cups',n('أكواب ساخنة','Hot drink cups','כוסות לשתייה חמה'),1,'pack',/^أكواب.*ساخنة|hot.*cups|כוסות/),i('forks',n('شوك للتقديم','Serving forks','מזלגות להגשה'),1,'pack',/^شوك بلاستيك|plastic forks|מזלגות/)]},
 {id:'care-home',section:'home',name:n('أساسيات العناية بالبيت','Home care essentials','מוצרי טיפוח לבית'),ingredients:[i('shampoo',n('شامبو','Shampoo','שמפו'),1,'pack',/^شامبو|shampoo|שמפו/),i('hand-soap',n('صابون يدين','Hand soap','סבון ידיים'),1,'pack',/صابون يدين|hand soap|סבון ידיים/)]},
];
/** Capacity is used only when the catalogue actually states the unit. */
export function packCapacity(p:MarketItem,unit:RecipeUnit):number|null{
 if(unit==='pack')return 1;
 const text=`${p.name} ${p.description}`.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
 if(unit==='piece'){const m=text.match(/(?:عدد\s*)?(\d+)\s*(?:حبة|حبات|بيضات|pieces|eggs|יחידות)/i);return m?Number(m[1]):null;}
 const re=unit==='g'?/(\d+(?:\.\d+)?)\s*(كغم|كجم|كيلو\s*غرام|kg|غرام|جرام|grams?|g)(?=\s|$|[.,|])/i:unit==='ml'?/(\d+(?:\.\d+)?)\s*(مل|مليلتر|ml|لتر|litres?|liters?|l)(?=\s|$|[.,|])/i:null;
 if(!re)return null;const match=text.match(re);if(!match)return null;
 const multiplier=/كغم|كجم|كيلو|^kg$|^لتر$|lit|^l$/i.test(match[2])?1000:1;
 const before=text.slice(0,match.index);const packs=before.match(/(\d+)\s*[×x]\s*$/i);
 return Number(match[1])*multiplier*(packs?Number(packs[1]):1);
}
export function buildRecipeBasket(items:MarketItem[],recipe:MarketRecipe,batches:number,budget:number,owned:string[]=[],excluded='',allergen=''){
 const valid=Number.isInteger(batches)&&batches>=1&&batches<=4;
 const avoid=excluded.split(/[,،;\n]/).map(t=>t.trim().toLocaleLowerCase()).filter(Boolean);
 const candidateStores=[...new Set(items.map(p=>p.storeId))];
 const variants=candidateStores.map(storeId=>{
  const rows=recipe.ingredients.map(ingredient=>{
   const required=ingredient.amount*batches;if(owned.includes(ingredient.id))return{ingredient,required,owned:true,product:undefined as MarketItem|undefined,quantity:0,verified:true};
   const matches=items.filter(p=>p.storeId===storeId&&p.available&&p.price>0&&Number.isFinite(p.price)&&ingredient.match.test(p.name)&&!avoid.some(t=>(p.name+' '+p.description).toLocaleLowerCase().includes(t)));
   const ranked=matches.map(product=>{const capacity=packCapacity(product,ingredient.unit);return{product,quantity:capacity?Math.ceil(required/capacity):1,verified:capacity!==null};}).filter(r=>r.quantity>=1&&r.quantity<=99).sort((a,b)=>Number(b.verified)-Number(a.verified)||a.product.price*a.quantity-b.product.price*b.quantity);
   return{ingredient,required,owned:false,...(ranked[0]||{product:undefined,quantity:0,verified:false})};
  });
  const merged=new Map<string,number>();for(const row of rows)if(row.product)merged.set(row.product.uid,(merged.get(row.product.uid)||0)+row.quantity);
  const lines:MarketLine[]=[...merged].map(([uid,quantity])=>({uid,quantity}));
  const quote=quoteMarket(items,lines,budget,allergen);const missing=rows.filter(row=>!row.owned&&!row.product);return{rows,lines,quote,missing,complete:valid&&!missing.length,needsReview:rows.some(row=>!row.owned&&row.product&&!row.verified)};
 });
 variants.sort((a,b)=>a.missing.length-b.missing.length||Number(b.quote.eligible)-Number(a.quote.eligible)||a.quote.total-b.quote.total);
 return variants[0]||{rows:recipe.ingredients.map(ingredient=>({ingredient,required:ingredient.amount*batches,owned:owned.includes(ingredient.id),product:undefined,quantity:0,verified:false})),lines:[] as MarketLine[],quote:quoteMarket([],[],budget,allergen),missing:recipe.ingredients.filter(i=>!owned.includes(i.id)),complete:false,needsReview:false};
}
