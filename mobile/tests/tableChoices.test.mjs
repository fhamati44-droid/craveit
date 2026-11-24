import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendTableChoices } from '../src/lib/tableChoices.ts';
import { DEFAULT_BASKET_INPUT } from '../src/lib/basketEngine.ts';

const now = new Date('2026-11-05T11:00:00Z');
const profile = {group:'main',role:'أساسي',servings:1,time:[5,5,5],day:[5,5],occasion:[5,5,5],satiety:4,flavor:3,fit:[5,5,5,5],light:3,treat:4,needsCooking:false};
const offer = (uid,name,price=30,role='أساسي',servings=1) => ({
 uid,group:uid,restaurantId:'kitchen-1',name,description:'',price,
 delivery:10,minimum:0,prep:15,transport:20,available:true,kind:'menu',
 profile:{...profile,group:uid,role,servings}
});
const offers=[offer('CH','جاج محمر',30),offer('MS','منسف',32),offer('SA','سلطة عربية',10,'جانبي',4),offer('HU','حمص',12,'جانبي',4)];

test('one guest gets both one-dish and composed options when affordable',()=>{
 const options=recommendTableChoices(offers,{}, {...DEFAULT_BASKET_INPUT, people:1, budget:100, occasion:'solo',gathering:'home'},now);
 assert.equal(options.length,2);
 assert.equal(options[0].style,'simple');
 assert.equal(options[0].group.best.lines.length,1);
 assert.equal(options[1].style,'full');
 assert.ok(options[1].group.best.lines.length>1);
 assert.ok(options.every(c=>c.group.best.eligible));
});

test('four guests can get two mains plus a side, with prices and portions recomputed',()=>{
 const options=recommendTableChoices(offers,{}, {...DEFAULT_BASKET_INPUT,people:4,budget:220,gathering:'friends',occasion:'guests'},now);
 assert.equal(options[0].group.best.mainCount,1);
 assert.equal(options[1].group.best.mainCount,2);
 assert.ok(options[1].group.best.lines.length>=3);
 assert.ok(options[1].group.best.servings>=4);
 assert.equal(options[1].group.best.total,options[1].group.best.subtotal+options[1].group.best.delivery);
});

test('never fabricate a full option without actual available side or second main',()=>{
 const options=recommendTableChoices([offer('A','جاج محمر')],{}, {...DEFAULT_BASKET_INPUT,people:1,budget:100},now);
 assert.equal(options.length,1);
 assert.equal(options[0].style,'simple');
});

test('budget cannot be bypassed to create a richer table',()=>{
 const options=recommendTableChoices(offers,{}, {...DEFAULT_BASKET_INPUT,people:1,budget:40},now);
 assert.equal(options.length,1);
 assert.ok(options[0].group.best.total<=40);
});
