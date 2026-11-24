import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless:true});
let failures = [];
try {
  for(const route of ['/', '/basket', '/cart']) {
    const page = await browser.newPage({ viewport: {width:390,height:844} });
    const uncaught=[];
    page.on('pageerror', error => uncaught.push(error.message));
    let response;
    try { response = await page.goto(base+route, {waitUntil:'domcontentloaded',timeout:30000}); }
    catch(e){ failures.push(route+': navigation failed: '+e.message); await page.close();continue; }
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText().catch(()=>'');
    const title = await page.title();
    console.log(JSON.stringify({route,status:response?.status(),title,bodyLength:body.length,uncaught}));
    if(!response || response.status()>=400) failures.push(route+': HTTP '+response?.status());
    if(!body.trim()) failures.push(route+': blank page');
    if(uncaught.length) failures.push(route+': uncaught JavaScript errors: '+uncaught.slice(0,3).join(' | '));
    if(route==='/basket' && !/بدنا نأكل|طاول|وجبة|meal|table|ארוח|שולח/.test(body))
      failures.push('/basket: meal planner text not visible');
    await page.close();
  }
} finally { await browser.close(); }
if(failures.length) { console.error(failures.join('\n')); process.exitCode=1; }
else console.log('Browser smoke checks passed. Checkout with live catalogue still requires separate E2E validation.');
