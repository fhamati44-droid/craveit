import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyContext } from '@/lib/partnerApi';
import RestaurantPicker from '@/components/partner/RestaurantPicker';
import PartnerDenied from '@/components/partner/PartnerDenied';

const PartnerCtx = createContext(null);
export const usePartner = () => useContext(PartnerCtx);

const STORAGE_KEY = 'partner_active_rid';

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-tamam-bg" dir="rtl">
      <div className="w-10 h-10 border-4 border-tamam-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function PartnerProvider({ children }) {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [activeRid, setActiveRidState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res = await getMyContext();
      // First-login claim: a non-admin user with no memberships yet may have a
      // pending email-bound partner invitation. Claim it (server-side, email
      // match enforced there) before resolving to the "no access" state.
      if (res && !res.isAdmin && (res.memberships || []).length === 0) {
        try {
          const claimRes = await base44.functions.invoke('partnerAccessAdmin', { action: 'claim_my_partner_invites', payload: {} });
          const claimed = claimRes?.data?.data?.claimed || claimRes?.data?.claimed || [];
          if (Array.isArray(claimed) && claimed.length > 0) res = await getMyContext();
        } catch { /* ignore — fall through to denied state */ }
      }
      setCtx(res);
    } catch (e) {
      if (e?.error === 'auth_required' || e?.status === 401) setNeedLogin(true);
      else setCtx({ memberships: [], restaurants: [], isAdmin: false, user: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setActiveRid = useCallback((rid) => {
    localStorage.setItem(STORAGE_KEY, rid);
    setActiveRidState(rid);
  }, []);

  if (loading) return <FullScreenLoader />;
  if (needLogin) { base44.auth.redirectToLogin('/partner'); return null; }

  const isAdmin = !!ctx?.isAdmin;
  const memberships = ctx?.memberships || [];
  const restaurants = ctx?.restaurants || [];

  if (isAdmin) {
    const active = restaurants.find((r) => r.id === activeRid) ? activeRid : (restaurants.length === 1 ? restaurants[0].id : null);
    if (!active && restaurants.length > 1)
      return <RestaurantPicker restaurants={restaurants} onPick={setActiveRid} title="اختار مطعم" />;
    if (!active) return <PartnerDenied />;
    return (
      <PartnerCtx.Provider value={{ ctx, isAdmin: true, restaurants, activeRestaurant: restaurants.find((r) => r.id === active), permissions: null, setActiveRid, refresh: load }}>
        {children}
      </PartnerCtx.Provider>
    );
  }

  if (memberships.length === 0) return <PartnerDenied />;

  const active = restaurants.find((r) => r.id === activeRid) ? activeRid : (restaurants.length === 1 ? restaurants[0].id : null);
  if (!active) return <RestaurantPicker restaurants={restaurants} onPick={setActiveRid} title="اختار مطعم" />;
  const membership = memberships.find((m) => m.restaurant_id === active);
  return (
    <PartnerCtx.Provider value={{ ctx, isAdmin: false, restaurants, activeRestaurant: restaurants.find((r) => r.id === active), permissions: membership?.permissions || [], setActiveRid, refresh: load }}>
      {children}
    </PartnerCtx.Provider>
  );
}