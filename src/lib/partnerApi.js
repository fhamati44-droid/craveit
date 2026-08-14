import { base44 } from '@/api/base44Client';

// Thin client for the Restaurant Partner OS backend engine.
// All partner data access goes through partnerEngine, which enforces an active
// RestaurantMembership + the required permission server-side before returning
// or mutating any restaurant-owned record.

function invoke(action, payload = {}) {
  return base44.functions
    .invoke('partnerEngine', { action, payload })
    .then((r) => r?.data?.data ?? r?.data ?? r);
}

// ---- Context / access ----
export const getMyContext = () => invoke('getMyContext');
export const submitPartnerApplication = (data) => invoke('submitPartnerApplication', data);

// ---- Home ----
export const getPartnerHome = (restaurant_id) => invoke('getHome', { restaurant_id });

// ---- Menu ----
export const listMenuItems = (restaurant_id, filter) => invoke('listMenuItems', { restaurant_id, filter });
export const getMenuItem = (restaurant_id, item_id) => invoke('getMenuItem', { restaurant_id, item_id });
export const createMenuItem = (restaurant_id, data) => invoke('createMenuItem', { restaurant_id, data });
export const updateMenuItem = (restaurant_id, item_id, data) => invoke('updateMenuItem', { restaurant_id, item_id, data });

// ---- Offers ----
export const listPartnerOffers = (restaurant_id, tab) => invoke('listOffers', { restaurant_id, tab });
export const getPartnerOffer = (restaurant_id, offer_id) => invoke('getOffer', { restaurant_id, offer_id });
export const pauseOfferRequest = (restaurant_id, offer_id, reason) => invoke('pauseOfferRequest', { restaurant_id, offer_id, reason });

// ---- Orders ----
export const listPartnerOrders = (restaurant_id, tab) => invoke('listOrders', { restaurant_id, tab });
export const getPartnerOrder = (restaurant_id, order_id) => invoke('getOrder', { restaurant_id, order_id });
export const updateOrderStatus = (restaurant_id, order_id, new_status, reason) =>
  invoke('updateOrderStatus', { restaurant_id, order_id, new_status, reason });

// ---- Operational signals ----
export const listSignals = (restaurant_id) => invoke('listSignals', { restaurant_id });
export const createSignal = (restaurant_id, data) => invoke('createSignal', { restaurant_id, data });
export const resolveSignal = (restaurant_id, signal_id) => invoke('resolveSignal', { restaurant_id, signal_id });

// ---- Guardrails ----
export const listGuardrails = (restaurant_id) => invoke('listGuardrails', { restaurant_id });
export const saveGuardrail = (restaurant_id, data) => invoke('saveGuardrail', { restaurant_id, data });

// ---- Offer requests ----
export const submitOfferRequest = (restaurant_id, data) => invoke('submitOfferRequest', { restaurant_id, data });
export const listOfferRequests = (restaurant_id) => invoke('listOfferRequests', { restaurant_id });

// ---- Menu import ----
export const createImportJob = (restaurant_id, data) => invoke('createImportJob', { restaurant_id, data });
export const listImportJobs = (restaurant_id) => invoke('listImportJobs', { restaurant_id });

// ---- Performance ----
export const getPerformance = (restaurant_id) => invoke('getPerformance', { restaurant_id });
export const getOpportunities = (restaurant_id) => invoke('getOpportunities', { restaurant_id });
export const getCampaignResults = (restaurant_id) => invoke('getCampaignResults', { restaurant_id });

// ---- Settings ----
export const updateRestaurantSettings = (restaurant_id, data) => invoke('updateRestaurantSettings', { restaurant_id, data });
export const toggleAcceptingOrders = (restaurant_id, accepting) => invoke('toggleAcceptingOrders', { restaurant_id, accepting });

// ---- Offer calendar & monthly plan ----
export const listOfferCalendar = (restaurant_id, date) => invoke('listOfferCalendar', { restaurant_id, date });
export const listMonthlyPlan = (restaurant_id, year, month) => invoke('listMonthlyPlan', { restaurant_id, year, month });

// ---- Restaurant readiness ----
export const getRestaurantReadiness = (restaurant_id) => invoke('getRestaurantReadiness', { restaurant_id });

// ---- Guardrail change requests ----
export const submitGuardrailChange = (restaurant_id, data) => invoke('submitGuardrailChange', { restaurant_id, ...data });
export const listGuardrailChanges = (restaurant_id) => invoke('listGuardrailChanges', { restaurant_id });

// ---- Weekly demand schedule (خفايا الحركة) ----
export const getDemandProfile = (restaurant_id, branch_id) => invoke('getDemandProfile', { restaurant_id, branch_id: branch_id || null });
export const getDemandSummary = (restaurant_id, branch_id) => invoke('getDemandSummary', { restaurant_id, branch_id: branch_id || null });
export const saveDemandSlots = (restaurant_id, branch_id, day_of_week, slots, source) => invoke('saveDemandSlots', { restaurant_id, branch_id: branch_id || null, day_of_week, slots, source });
export const setDemandDayLevel = (restaurant_id, branch_id, day_of_week, level) => invoke('setDemandDayLevel', { restaurant_id, branch_id: branch_id || null, day_of_week, level });
export const acceptDaySuggestion = (restaurant_id, branch_id, day_of_week) => invoke('acceptDaySuggestion', { restaurant_id, branch_id: branch_id || null, day_of_week });
export const copyDemandDay = (restaurant_id, branch_id, from_day, to_days) => invoke('copyDemandDay', { restaurant_id, branch_id: branch_id || null, from_day, to_days });
export const saveDemandOverride = (restaurant_id, branch_id, data) => invoke('saveDemandOverride', { restaurant_id, branch_id: branch_id || null, ...data });
export const listDemandOverrides = (restaurant_id, branch_id) => invoke('listDemandOverrides', { restaurant_id, branch_id: branch_id || null });
export const requestDemandOpportunity = (restaurant_id, branch_id, data) => invoke('requestDemandOpportunity', { restaurant_id, branch_id: branch_id || null, ...data });