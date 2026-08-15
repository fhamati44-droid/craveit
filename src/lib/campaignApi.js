import { base44 } from '@/api/base44Client';

// Client for the TAMAM Campaign & Demand Engine.
const call = (action, payload = {}) =>
  base44.functions.invoke('campaignEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);

// Demo management
export const seedDemoCampaigns = () => call('demoSeed');
export const resetDemoCampaigns = () => call('demoReset');
export const getDemoStatus = () => call('demoStatus');

// Opportunities
export const listOpportunities = (restaurant_id) => call('listOpportunities', { restaurant_id });
export const createOpportunity = (data) => call('createOpportunity', data);
export const updateOpportunity = (id, changes) => call('updateOpportunity', { id, changes });
export const convertOpportunity = (id, data) => call('convertOpportunity', { id, ...data });

// Campaigns
export const listCampaigns = (restaurant_id) => call('listCampaigns', { restaurant_id });
export const getCampaign = (id) => call('getCampaign', { id });
export const setCampaignStatus = (id, status) => call('setCampaignStatus', { id, status });

// Offers
export const listOffers = (restaurant_id) => call('listOffers', { restaurant_id });
export const getOffer = (id) => call('getOffer', { id });
export const createOffer = (data) => call('createOffer', data);
export const updateOffer = (id, changes) => call('updateOffer', { id, changes });

// Commercial calculator
export const calculatePrice = (restaurant_net) => call('calculatePrice', { restaurant_net });
export const commercialBreakdown = (data) => call('commercialBreakdown', data);

// Calendar
export const getCalendar = (restaurant_id, include_demo = false) => call('getCalendar', { restaurant_id, include_demo });

// Learning
export const getLearning = (campaign_id) => call('getLearning', { campaign_id });

// Partner
export const partnerCreateOpportunity = (restaurant_id, data) => call('partnerCreateOpportunity', { restaurant_id, ...data });
export const partnerListOpportunities = (restaurant_id) => call('partnerListOpportunities', { restaurant_id });
export const partnerListActiveCampaigns = (restaurant_id) => call('partnerListActiveCampaigns', { restaurant_id });

// Customer
export const listEligibleOffers = (restaurant_id, phone) => call('listEligibleOffers', { restaurant_id, phone });
export const getOfferEligibility = (offer_id, phone) => call('getOfferEligibility', { offer_id, phone });
export const unlockOffer = (offer_id, phone, channel) => call('unlockOffer', { offer_id, phone, channel });
export const recordCampaignEvent = (data) => call('recordEvent', data);

// Phase 2 readiness — runs real server-side verification, returns per-test results.
export const getPhase2Readiness = () => call('getPhase2Readiness', {});

// ============================================================================
// Demand Decision Engine (Milestone 2) — intelligence layer above Campaigns.
// ============================================================================
const dde = (action, payload = {}) =>
  base44.functions.invoke('demandDecisionEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);

export const listDecisionScenarios = () => dde('listScenarios', {});
export const runDecisionScenarios = () => dde('runScenarios', {});
export const evaluateDecision = (data) => dde('evaluate', data);
export const listDemandDecisions = (decision) => dde('listDecisions', decision ? { decision } : {});
export const getDemandDecision = (id) => dde('getDecision', { id });
export const acceptDemandDecision = (id) => dde('acceptDecision', { id });
export const dismissDemandDecision = (id) => dde('dismissDecision', { id });
export const reevaluateActiveCampaign = (offer_id, test_time, include_demo) =>
  dde('reevaluateActiveCampaign', { offer_id, test_time, include_demo });