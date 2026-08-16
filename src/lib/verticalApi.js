import { base44 } from "@/api/base44Client";

/** CRUD + recommendation helpers for the Menu Vertical strategy admin screens. */

export const listVerticals = () => base44.entities.MenuVertical.list("-sort_order", 50);
export const getVertical = (id) => base44.entities.MenuVertical.get(id);
export const createVertical = (data) => base44.entities.MenuVertical.create(data);
export const updateVertical = (id, data) => base44.entities.MenuVertical.update(id, data);
export const deleteVertical = (id) => base44.entities.MenuVertical.delete(id);

export const listDaypartStrategies = (verticalId) =>
  verticalId ? base44.entities.VerticalDaypartStrategy.filter({ vertical_id: verticalId }, "-priority", 50)
    : base44.entities.VerticalDaypartStrategy.list("-priority", 50);
export const createDaypartStrategy = (data) => base44.entities.VerticalDaypartStrategy.create(data);
export const updateDaypartStrategy = (id, data) => base44.entities.VerticalDaypartStrategy.update(id, data);
export const deleteDaypartStrategy = (id) => base44.entities.VerticalDaypartStrategy.delete(id);

export const listPlaybooks = (verticalId) =>
  verticalId ? base44.entities.VerticalCampaignPlaybook.filter({ vertical_id: verticalId }, "-priority", 50)
    : base44.entities.VerticalCampaignPlaybook.list("-priority", 50);
export const createPlaybook = (data) => base44.entities.VerticalCampaignPlaybook.create(data);
export const updatePlaybook = (id, data) => base44.entities.VerticalCampaignPlaybook.update(id, data);
export const deletePlaybook = (id) => base44.entities.VerticalCampaignPlaybook.delete(id);

export const listRecommendations = () => base44.entities.CampaignRecommendation.list("-generated_at", 50);
export const getRecommendation = (id) => base44.entities.CampaignRecommendation.get(id);
export const updateRecommendation = (id, data) => base44.entities.CampaignRecommendation.update(id, data);
export const generateRecommendation = (restaurant_id, test_time) =>
  base44.functions.invoke("campaignRecommendationEngine", { restaurant_id, test_time });

export const listRestaurants = () => base44.entities.Restaurant.list("-created_date", 100);
export const assignVertical = (id, data) => base44.entities.Restaurant.update(id, data);

export const DAYPART_OPTIONS = ["BREAKFAST", "MID_MORNING", "LUNCH", "AFTERNOON", "DINNER", "LATE_NIGHT", "WEEKEND", "SEASONAL", "CUSTOM"];
export const TIER_OPTIONS = ["classic", "mix", "plus"];
export const FULFILLMENT_OPTIONS = ["ON_DEMAND_PREPARED_FOOD", "SCHEDULED_PREPARED_FOOD", "RETAIL_PICK_AND_PACK", "FRESH_WEIGHT_BASED", "PREORDER"];
export const OBJECTIVE_OPTIONS = ["NEW_CUSTOMERS", "ACQUISITION", "REACTIVATION", "IMMEDIATE_DEMAND", "INCREASE_AOV", "LOYALTY_ENGAGEMENT", "CONVERSION_RECOVERY", "SURPLUS", "STRENGTHEN_ITEM", "REPEAT_PURCHASE", "PAYDAY_AOV"];
export const MECHANIC_OPTIONS = ["FIRST_TRIAL", "VALUE_ADD", "POINT_LOCKED", "TIME_AND_QUANTITY", "LIMITED_QUANTITY", "PERSONALIZED_VALUE", "DIRECT_PRICE", "CROSS_RESTAURANT"];