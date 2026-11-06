import type {DailyCartLine} from './dailyMeals';
export type StoredDailyLine=DailyCartLine&{menu_title?:string};
export function parseDailyCart(raw:string|null):StoredDailyLine[]{
 try{const rows=JSON.parse(raw||'[]');if(!Array.isArray(rows))return[];return rows.filter(r=>r&&Number.isInteger(r.menu_id)&&r.menu_id>0&&Number.isInteger(r.quantity)&&r.quantity>0&&r.quantity<=99&&Number.isFinite(r.unit_price)&&r.unit_price>0&&typeof r.service_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.service_date)&&r.selected_options&&Number.isInteger(r.selected_options.main)&&r.selected_options.main>0).slice(0,100);}catch{return[];}
}
