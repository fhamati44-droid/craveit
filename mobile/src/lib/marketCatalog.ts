import {createApi,rest} from './api';
import {mealProfiles} from './basketProfiles';
import {marketCategory,type MarketItem} from './marketEngine';
import type {Meal,Restaurant} from './types';
export interface MarketProduct extends MarketItem {meal:Meal;restaurant:Restaurant;category:ReturnType<typeof marketCategory>}
export async function loadMarketCatalog():Promise<MarketProduct[]>{
 const [stores,items]=await Promise.all([createApi().restaurants(),rest<(Meal&{restaurant_id:string|number;active?:boolean})[]>('menu_items?select=*&active=eq.true')]);
 const byStore=new Map(stores.map(s=>[String(s.id),s]));
 return items.filter(p=>mealProfiles[`M${p.id}`]?.role==='سوق').flatMap(meal=>{const restaurant=byStore.get(String(meal.restaurant_id));if(!restaurant)return[];
 const item:MarketItem={uid:`M${meal.id}`,storeId:String(restaurant.id),name:meal.name_ar||meal.name||'',description:meal.description_ar||meal.description||'',price:Number(meal.price),delivery:Number(restaurant.delivery_fee??0),minimum:Number(restaurant.min_order??restaurant.minimum_order??0),available:meal.is_available!==false&&meal.active!==false&&restaurant.active!==false&&restaurant.is_open!==false};return[{...item,meal,restaurant,category:marketCategory(item)}];});
}
