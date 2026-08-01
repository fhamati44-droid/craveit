const KEY = 'tamam_checkout';
export function getCheckout() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') || null; } catch { return null; }
}
export function setCheckout(data) { localStorage.setItem(KEY, JSON.stringify(data || {})); }
export function clearCheckout() { localStorage.removeItem(KEY); }

export function defaultCheckout(cart) {
  return {
    method: 'delivery',
    name: localStorage.getItem('user_name') || '',
    phone: localStorage.getItem('user_phone') || '',
    email: '',
    addressLabel: 'home',
    city: '', street: '', building: '', entrance: '', floor: '', apartment: '',
    latitude: null, longitude: null, resolvedAddress: '',
    deliveryNotes: '',
    deliveryQuick: [],
    restaurantNotes: '',
    payment: 'cash',
    cashDenomination: '',
    couponCode: '',
    couponDiscount: 0,
    pointsUsed: 0,
    pointsDiscount: 0,
    savedAt: Date.now(),
  };
}