import { base44 } from '@/api/base44Client';

// Client for the TAMAM Demand Execution Engine (Milestone 3).
const call = (action, payload = {}) =>
  base44.functions.invoke('demandExecutionEngine', { action, payload }).then((r) => r?.data?.data ?? r?.data ?? r);

// ---- Policies ----
export const getPolicy = (restaurant_id) => call('getPolicy', { restaurant_id });
export const updatePolicy = (restaurant_id, changes) => call('updatePolicy', { restaurant_id, changes });
export const setGuardedDemoPolicy = (restaurant_id) => call('setGuardedDemoPolicy', { restaurant_id });

// ---- Global kill switch ----
export const getAutomationControl = () => call('getAutomationControl', {});
export const setAutomationControl = (paused, reason) => call('setAutomationControl', { paused, reason });

// ---- Plans ----
export const generatePlan = (demand_decision_id, options = {}) => call('generatePlan', { demand_decision_id, ...options });
export const validatePlan = (plan_id, options = {}) => call('validatePlan', { plan_id, ...options });
export const schedulePlan = (plan_id, options = {}) => call('schedulePlan', { plan_id, ...options });
export const activatePlan = (plan_id, options = {}) => call('activatePlan', { plan_id, ...options });
export const reevaluateActive = (plan_id, options = {}) => call('reevaluateActive', { plan_id, ...options });
export const completeCampaign = (plan_id, options = {}) => call('completeCampaign', { plan_id, ...options });
export const manualOverride = (plan_id, action, data = {}) => call('manualOverride', { plan_id, action, ...data });
export const getPlan = (plan_id) => call('getPlan', { plan_id });
export const listPlans = (status) => call('listPlans', status ? { status } : {});
export const getPlanDetail = (plan_id) => call('getPlanDetail', { plan_id });

// ---- Execution center aggregation ----
export const getExecutionCenter = () => call('getExecutionCenter', {});

// ---- Tests ----
export const runExecutionTests = () => call('runExecutionTests', {});
export const listExecutionAudit = (plan_id) => call('listExecutionAudit', plan_id ? { plan_id } : {});