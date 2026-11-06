import type {Meal,Restaurant,ExtraGroup,Id} from './types';
export interface CartRequest {meal:Meal;restaurant:Restaurant;quantity:number;extrasSourceId?:Id|null;note?:string}
/** Resolve every required customization before a planner can commit any cart lines. */
export async function preflightCart(requests:CartRequest[],loadExtras:(id:Id)=>Promise<ExtraGroup[]>){
 if(!requests.length||requests.some(r=>!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>99||!Number.isFinite(Number(r.meal.price))||Number(r.meal.price)<=0||r.meal.is_available===false||r.restaurant.active===false||r.restaurant.is_open===false))throw Error('Invalid cart request');
 const groups=await Promise.all(requests.map(r=>r.extrasSourceId===null?Promise.resolve([]):loadExtras(r.extrasSourceId??r.meal.id)));
 const needsChoices=groups.some(gs=>gs.some(g=>g.required||Number(g.min_select||0)>0));
 const lines=requests.map(r=>({meal:r.meal,restaurant:r.restaurant,quantity:r.quantity,extras:[],note:r.note?.trim()||''}));
 return{needsChoices,lines};
}
