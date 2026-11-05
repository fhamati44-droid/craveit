import test from 'node:test';import assert from 'node:assert/strict';
import { buildMealBasket, recommendMealBaskets, pairingFit } from '../src/lib/multiBasketEngine.ts';
import { DEFAULT_BASKET_INPUT } from '../src/lib/basketEngine.ts';
const now=new Date('2026-11-05T11:00:00Z');
const input={...DEFAULT_BASKET_INPUT,people:4,budget:240,mainDishes:2,autoTable:false};
const profile={group:'A',role:'أساسي',servings:1,time:[1,5,4],day:[4,5],occasion:[3,5,5],satiety:4,flavor:3,fit:[5,4,3,4],light:3,treat:3,needsCooking:false};
function food(uid,group,restaurantId,name,price=30,changes={}){return{uid,group,restaurantId,name,description:'',price,delivery:10,minimum:0,prep:15,transport:20,available:true,profile:{...profile,group},kind:'menu',...changes};}
const a=()=>food('A1','A','1','دجاج مشوي');
const b=()=>food('B1','B','1','كوسا محشي',50,{profile:{...profile,group:'B',servings:2}});
test('two dishes share the party portions instead of feeding the whole party twice',()=>{const result=recommendMealBaskets([a(),b()],{},input,now);assert.ok(result.length);const best=result[0].best;assert.equal(best.mainCount,2);assert.equal(best.servings,4);assert.equal(best.lines.find(l=>l.offer.uid==='A1').quantity,2);assert.equal(best.lines.find(l=>l.offer.uid==='B1').quantity,1);assert.equal(best.total,120);});
test('single restaurant is preferred even when a mixed basket is cheaper',()=>{const offers=[food('A1','A','1','دجاج مشوي',20),food('B1','B','1','كوسا محشي',60),food('A2','A','2','دجاج مشوي',60),food('B2','B','2','كوسا محشي',20)];const result=recommendMealBaskets(offers,{}, {...input,people:2,budget:100},now);assert.equal(result[0].best.restaurants.length,1);assert.equal(result[0].best.total,90);assert.ok(result[0].providers.some(b=>b.restaurants.length===2&&b.total===60));});
test('mixed fallback pays delivery once per restaurant and respects every restaurant minimum',()=>{const aa=food('A1','A','1','دجاج مشوي',20),bb=food('B2','B','2','كوسا محشي',20);const valid=buildMealBasket([{offer:aa,quantity:1},{offer:bb,quantity:1}],{...input,people:2,budget:60},now);assert.equal(valid.delivery,20);assert.equal(valid.total,60);assert.equal(valid.eligible,true);const invalid=buildMealBasket([{offer:{...aa,minimum:30},quantity:1},{offer:bb,quantity:1}],{...input,people:2},now);assert.equal(invalid.reason,'minimum');});
test('mixed fallback is used only when its whole basket fits the budget',()=>{const offers=[food('A1','A','1','دجاج مشوي',20),food('B1','B','1','كوسا محشي',60),food('A2','A','2','دجاج مشوي',60),food('B2','B','2','كوسا محشي',20)];const result=recommendMealBaskets(offers,{}, {...input,people:2,budget:70},now);assert.equal(result[0].best.restaurants.length,2);assert.equal(result[0].best.total,60);assert.ok(result[0].providers.some(b=>!b.eligible&&b.reason==='budget'));});
test('strict one-restaurant preference disallows mixed fallback',()=>{const result=recommendMealBaskets([food('A1','A','1','دجاج مشوي',20),food('B2','B','2','كوسا محشي',20)],{}, {...input,people:2,budget:70,allowMixed:false},now);assert.ok(result.every(g=>g.best.restaurants.length===1));});
test('all same-restaurant providers for a composition remain in the comparison',()=>{const offers=Array.from({length:6},(_,i)=>[food('A'+i,'A',String(i),'دجاج مشوي',20),food('B'+i,'B',String(i),'كوسا محشي',20)]).flat();const result=recommendMealBaskets(offers,{}, {...input,people:2},now);assert.equal(result[0].best.mainCount,2);assert.equal(result[0].providers.filter(b=>b.restaurants.length===1).length,6);});
test('coverage, maximum dishes and quantity boundaries cannot produce an underfilled basket',()=>{assert.equal(buildMealBasket([{offer:a(),quantity:1},{offer:b(),quantity:1}],input,now).reason,'quantity');assert.equal(buildMealBasket([{offer:a(),quantity:0}],input,now).reason,'quantity');assert.deepEqual(recommendMealBaskets([a(),b()],{}, {...input,people:0},now),[]);});
test('pairing rules score contrasting styles without banning family tastes; repeated source dishes stay excluded',()=>{const pizza=food('P','P','1','بيتزا',20),stuffed=food('S','S','1','كوسا محشي',20);assert.equal(pairingFit(pizza,stuffed),1);assert.equal(buildMealBasket([{offer:pizza,quantity:2},{offer:stuffed,quantity:2}],input,now).eligible,true);assert.equal(buildMealBasket([{offer:a(),quantity:2},{offer:{...a(),uid:'A2'},quantity:2}],input,now).reason,'pairing');});
test('allergy, dislikes, availability and arrival constraints apply to every meal',()=>{const lines=[{offer:a(),quantity:2},{offer:b(),quantity:1}];assert.equal(buildMealBasket(lines,{...input,allergen:'حليب'},now).reason,'allergy');assert.equal(buildMealBasket(lines,{...input,disliked:'كوسا'},now).reason,'disliked');assert.equal(buildMealBasket([{offer:{...a(),available:false},quantity:2},lines[1]],input,now).reason,'unavailable');assert.equal(buildMealBasket(lines,{...input,maxMinutes:20},now).reason,'time');});
test('a side cannot repeat salads included in a main dish',()=>{const main={...a(),description:'يشمل 4 أنواع سلطات'},side=food('S','S','1','سلطة عربية',10,{profile:{...profile,role:'جانبي',servings:4}});const basket=buildMealBasket([{offer:main,quantity:2},{offer:b(),quantity:1},{offer:side,quantity:1}],input,now);assert.equal(basket.reason,'pairing');});
test('side can complete a restaurant minimum without adding a delivery fee',()=>{const aa={...a(),minimum:70},side=food('S','S','1','سلطة عربية',10,{profile:{...profile,role:'جانبي',servings:4}});const basket=buildMealBasket([{offer:aa,quantity:2},{offer:b(),quantity:1},{offer:side,quantity:1}],input,now);assert.equal(basket.eligible,true);assert.equal(basket.delivery,10);assert.equal(basket.total,130);});
test('daily reservations are not mixed with regular-cart meals',()=>{const basket=buildMealBasket([{offer:{...a(),kind:'daily'},quantity:2},{offer:b(),quantity:1}],input,now);assert.equal(basket.reason,'flow');});
test('three mains can form a correctly sized basket',()=>{const c=food('C','C','1','كباب',20);const result=recommendMealBaskets([a(),b(),c],{}, {...input,people:4,mainDishes:3},now);assert.equal(result[0].best.mainCount,3);assert.equal(result[0].best.servings,4);});
test('a single diner is not forced to buy multiple full meals',()=>{const result=recommendMealBaskets([a(),b()],{}, {...input,people:1,mainDishes:3},now);assert.ok(result.every(g=>g.best.mainCount===1));});
test('fractional prices and multiple delivery fees reconcile to cents',()=>{const basket=buildMealBasket([{offer:food('A','A','1','دجاج مشوي',10.1,{delivery:.3}),quantity:1},{offer:food('B','B','2','كوسا محشي',9.9,{delivery:.2}),quantity:2}],{...input,people:3},now);assert.equal(basket.total,30.4);});

test('automatic family lunch builds five complementary items when affordable',()=>{
 const main=food('M','M','1','جاج محمر',50,{profile:{...profile,servings:4}});
 const side=(uid,name)=>food(uid,uid,'1',name,10,{profile:{...profile,role:'جانبي',servings:4}});
 const offers=[main,side('S1','سلطة عربية'),side('S2','سلطة ملفوف'),side('H','حمص'),side('F','بطاطا')];
 const result=recommendMealBaskets(offers,{}, {...input,autoTable:true,budget:150},now)[0].best;
 assert.equal(result.lines.length,5);assert.equal(result.mainCount,1);assert.equal(result.total,100);assert.equal(result.servings,4);
});
test('included salads and bread are not purchased again; budget still controls table size',()=>{
 const main=food('M','M','1','جاج محمر',50,{description:'يشمل 4 سلطات وخبز',profile:{...profile,servings:4}});
 const side=food('S','S','1','سلطة عربية',10,{profile:{...profile,role:'جانبي',servings:4}});
 const result=recommendMealBaskets([main,side],{}, {...input,autoTable:true,budget:60},now)[0].best;
 assert.equal(result.lines.length,1);assert.equal(result.total,60);
});
test('social treat table includes dessert only if available and affordable',()=>{
 const main=food('M','M','1','مشاوي',50,{profile:{...profile,servings:4}});
 const side=(uid,name)=>food(uid,uid,'1',name,10,{profile:{...profile,role:'جانبي',servings:4}});
 const offers=[main,side('S','سلطة عربية'),side('H','حمص'),side('D','كنافة')];
 const options={...input,autoTable:true,occasion:'guests',goal:'treat',budget:100};
 const result=recommendMealBaskets(offers,{},options,now)[0].best;
 assert.equal(result.lines.length,4);assert.ok(result.lines.some(l=>l.offer.uid==='D'));
 const tight=recommendMealBaskets(offers,{}, {...options,budget:60},now)[0].best;assert.equal(tight.lines.length,1);
});
test('work table does not add dessert just because it is available',()=>{
 const main=food('M','M','1','دجاج مشوي',30);
 const dessert=food('D','D','1','كنافة',10,{profile:{...profile,role:'جانبي'}});
 const result=recommendMealBaskets([main,dessert],{}, {...input,autoTable:true,gathering:'work',people:1},now)[0].best;
 assert.equal(result.lines.length,1);
});

test('brunch and snacks have different structures, with no artificial five-item target',async()=>{
 const {tablePlan}=await import('../src/lib/multiBasketEngine.ts');
 assert.deepEqual(tablePlan({...input,autoTable:true,period:'brunch'},now),['starter','bread']);
 assert.deepEqual(tablePlan({...input,autoTable:true,period:'snack'},now),[]);
 assert.deepEqual(tablePlan({...input,autoTable:true,period:'snack',goal:'treat'},now),['dessert']);
});
test('burgers do not automatically get tahini as a starter',()=>{
 const main=food('B','B','1','برغر دجاج',30);
 const tahini=food('T','T','1','طحينة',10,{profile:{...profile,role:'جانبي',servings:4}});
 const result=recommendMealBaskets([main,tahini],{}, {...input,autoTable:true},now)[0].best;
 assert.equal(result.lines.length,1);
});
test('removing one component preserves the other table components and recalculates the total',()=>{
 const main=food('M','M','1','جاج محمر',50,{profile:{...profile,servings:4}});
 const side=(uid,name)=>food(uid,uid,'1',name,10,{profile:{...profile,role:'جانبي',servings:4}});
 const result=recommendMealBaskets([main,side('S','سلطة عربية'),side('H','حمص')],{}, {...input,autoTable:true},now)[0].best;
 const edited=buildMealBasket(result.lines.filter(l=>l.offer.uid!=='S'),{...input,autoTable:true},now);
 assert.equal(edited.lines.length,2);assert.equal(edited.total,result.total-10);assert.equal(edited.eligible,true);assert.ok(edited.lines.some(l=>l.offer.uid==='H'));
});
