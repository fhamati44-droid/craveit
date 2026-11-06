import test from 'node:test';import assert from 'node:assert/strict';
import {preflightCart} from '../src/lib/cartPreparation.ts';
const r=id=>({meal:{id,price:30},restaurant:{id:9},quantity:2});
test('an entire basket with no required choices is ready for one atomic cart commit',async()=>{const p=await preflightCart([r(1),r(2),r(3)],async()=>[]);assert.equal(p.needsChoices,false);assert.equal(p.lines.length,3);assert.deepEqual(p.lines.map(l=>l.quantity),[2,2,2]);});
test('optional extras do not block direct add; required extras do',async()=>{assert.equal((await preflightCart([r(1)],async()=>[{id:1,group_name:'option',required:false,min_select:0,menu_extra_options:[]}])).needsChoices,false);assert.equal((await preflightCart([r(1)],async()=>[{id:1,group_name:'side',required:true,menu_extra_options:[]}])).needsChoices,true);});
test('a customization-load error blocks the whole basket instead of bypassing choices',async()=>{await assert.rejects(preflightCart([r(1),r(2)],async id=>{if(id===2)throw Error('offline');return[];}));});
test('canonical extras identity and explicit no-extras home offers are respected',async()=>{const seen=[];await preflightCart([{...r('home-1'),extrasSourceId:55},{...r('home-2'),extrasSourceId:null}],async id=>{seen.push(id);return[];});assert.deepEqual(seen,[55]);});
