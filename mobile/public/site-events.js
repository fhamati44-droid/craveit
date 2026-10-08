/**
 * קוד זה מוטמע באתר הקניות שלך (לא בשרת ה-CRM).
 * מטרתו: ליצור session_id קבוע, לתפוס fbclid/gclid/Clarity, ולדווח
 * אירועים ל-CRM. יש להחליף CRM_BASE_URL בכתובת השרת בפועל.
 */
(function () {
  const CRM_BASE_URL = 'https://customer-crm-production-b99c.up.railway.app'; // <-- לשנות לכתובת השרת שלך

  function getOrCreateSessionId() {
    let sessionId = localStorage.getItem('crm_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + crypto.randomUUID();
      localStorage.setItem('crm_session_id', sessionId);
    }
    return sessionId;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  const sessionId = getOrCreateSessionId();

  // תופסים פרמטרים רק אם קיימים בכניסה הנוכחית, ושומרים אותם ל-localStorage
  // כדי שלא ייאבדו כשהלקוח עובר בין דפים באתר.
  const fbclid = getParam('fbclid') || localStorage.getItem('crm_fbclid');
  const gclid = getParam('gclid') || localStorage.getItem('crm_gclid');
  if (fbclid) localStorage.setItem('crm_fbclid', fbclid);
  if (gclid) localStorage.setItem('crm_gclid', gclid);

  const fbp = getCookie('_fbp'); // נוצר אוטומטית ע"י Meta Pixel אם מותקן
  const clarityUserId = getCookie('_clck');
  const manychatId = localStorage.getItem('manychat_contact_id');
  const claritySessionId = getCookie('_clsk');

  // שולח אירוע כללי ל-CRM (page_view, funnel_stage, add_to_cart וכו')
  function trackEvent(eventType, eventData = {}) {
    fetch(`${CRM_BASE_URL}/api/track/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        fbclid,
        fbp,
        gclid,
        clarity_user_id: clarityUserId,
        clarity_session_id: claritySessionId,
        manychat_id: manychatId,
        utm_source: getParam('utm_source'),
        utm_campaign: getParam('utm_campaign')
      })
    }).catch(err => console.error('CRM track error', err));
  }

  // נקרא כשלקוח משאיר טלפון/מייל (טופס, תחילת צ'קאאוט, רכישה)
  function identifyCustomer({ phone, email, full_name }) {
    fetch(`${CRM_BASE_URL}/api/track/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, phone, email, full_name })
    }).catch(err => console.error('CRM identify error', err));
  }

  // בונה לינק לוואטסאפ עם ref=session_id, כדי ש-ManyChat ידע לקשר את
  // השיחה בחזרה לאותו ביקור באתר. שימוש: crmWhatsappLink('9725XXXXXXX')
  function crmWhatsappLink(phoneNumber, text = '') {
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${phoneNumber}?text=${encodedText}&ref=${sessionId}`;
  }

  // חושף פונקציות גלובליות לשימוש בשאר קוד האתר
  window.CRM = { trackEvent, identifyCustomer, crmWhatsappLink, sessionId };

  // אירוע כניסה אוטומטי לדף
  trackEvent('page_view', { path: window.location.pathname });
})();
