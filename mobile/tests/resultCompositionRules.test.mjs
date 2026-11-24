import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_BASKET_INPUT } from '../src/lib/basketEngine.ts';
import { getDesiredResultComposition, recommendResultBaskets } from '../src/lib/resultCompositionRules.ts';
const now=new Date('2026-11-05T11:00:00Z');
const profile={group:'A',role:'أساسي',servings:1,time:[1,5,4],day:[4,5],occasion:[3,5,5],satiety:4,flavor:3,fit:[5,4,3,4],light:3,treat:3,needsCooking:false};
function food(uid,name,price,role='أساسي',servings=1){
 return {uid,group:uid,restaurantId:'1',name,description:'',price,delivery:10,minimum:0,prep:15,transport:20,available:true,
 profile:{...profile,group:uid,role,servings},kind:'menu'};
}
const offers=[food('A','دجاج مشوي',25),food('B','منسف لحم',30,'أساسي',2),food('S','سلطة عربية',10,'جانبي',4),food('T','سلطة تبولة',12,'جانبي',4)];
test('Excel-derived result bands respect current people and occasion',()=>{
 assert.deepEqual(getDesiredResultComposition({...DEFAULT_BASKET_INPUT,people:1}),{event:'everyday',mains:1,salads:1});
 assert.deepEqual(getDesiredResultComposition({...DEFAULT_BASKET_INPUT,people:4,occasion:'guests'}),{event:'guests',mains:2,salads:1});
 assert.deepEqual(getDesiredResultComposition({...DEFAULT_BASKET_INPUT,people:5,gathering:'work'}),{event:'work',mains:2,salads:2});
});
test('one customer sees main and real salad when budget permits',()=>{
 const group=recommendResultBaskets(offers,{}, {...DEFAULT_BASKET_INPUT,people:1,budget:100,autoTable:false,mainDishes:1},now)[0];
 assert.ok(group.best.eligible);
 assert.equal(group.best.mainCount,1);
 assert.ok(group.best.lines.some(l=>l.offer.uid==='S'||l.offer.uid==='T'));
});
test('four people prefer two mains and salad, not a made-up single dish',()=>{
 const group=recommendResultBaskets(offers,{}, {...DEFAULT_BASKET_INPUT,people:4,budget:200,occasion:'guests',autoTable:true},now)[0];
 assert.ok(group.best.eligible);
 assert.equal(group.best.mainCount,2);
 assert.ok(group.best.lines.some(l=>l.offer.uid==='S'||l.offer.uid==='T'));
 assert.ok(group.best.servings>=4);
});
test('no salad means existing valid recommendation remains; no invented products',()=>{
 const group=recommendResultBaskets(offers.slice(0,2),{}, {...DEFAULT_BASKET_INPUT,people:1,budget:100},now)[0];
 assert.ok(group.best.eligible);
 assert.ok(group.best.lines.every(l=>offers.slice(0,2).some(o=>o.uid===l.offer.uid)));
});
test('the original form and event preview still call the original planner',()=>{
 const screen=readFileSync(new URL('../src/app/basket.tsx',import.meta.url),'utf8');
 assert.match(screen,/const suggestions=recommendResultBaskets\(live,mealRelations,next,now\)/);
 assert.match(screen,/validBasketInput\(next\)\?recommendMealBaskets\(catalog,mealRelations,next,at\)/);
});
