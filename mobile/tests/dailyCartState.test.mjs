import test from 'node:test';import assert from 'node:assert/strict';
import {parseDailyCart} from '../src/lib/dailyCartState.ts';
const line={menu_id:7,service_date:'2026-11-06',quantity:2,selected_options:{main:42,salad:8},unit_price:55,menu_title:'وجبة اليوم'};
test('completed daily choices survive cart navigation and storage round trip',()=>{const restored=parseDailyCart(JSON.stringify([line]));assert.deepEqual(restored,[line]);assert.equal(restored.reduce((n,l)=>n+l.quantity,0),2);assert.equal(restored.reduce((n,l)=>n+l.quantity*l.unit_price,0),110);});
test('corrupt or incomplete daily choices cannot appear as orderable cart lines',()=>{assert.deepEqual(parseDailyCart('bad'),[]);assert.deepEqual(parseDailyCart(JSON.stringify([{...line,quantity:0},{...line,unit_price:-1},{...line,selected_options:{}},{...line,service_date:'wrong'}])),[]);});
