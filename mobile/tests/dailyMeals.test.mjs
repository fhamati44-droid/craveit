import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleDailyCategories, getVisibleDailyOptions } from "../src/lib/dailyMealOptionRules.ts";

const options = [
  { id: 1, menu_id: null, category: "soup", name: "Lentil", active: true },
  { id: 2, menu_id: null, category: "addition", name: "Rice", active: true },
  { id: 3, menu_id: null, category: "addition", name: "Potatoes", active: true },
  { id: 4, menu_id: null, category: "salad", name: "Hummus", active: true },
  { id: 5, menu_id: 20, category: "main", name: "Steak", active: true },
];

test("a menu without overrides inherits the saved shared option library", () => {
  assert.deepEqual(getVisibleDailyCategories(options, 20, []), ["soup", "main", "addition", "salad"]);
  assert.deepEqual(getVisibleDailyOptions(options, 20, "addition").map((option) => option.id), [2, 3]);
});

test("menu overrides keep only selected options and hide an empty category", () => {
  const overrides = [
    { menu_id: 20, category: "soup", option_ids: [] },
    { menu_id: 20, category: "addition", option_ids: [3] },
    { menu_id: 20, category: "salad", option_ids: [] },
  ];
  assert.deepEqual(getVisibleDailyCategories(options, 20, overrides), ["main", "addition"]);
  assert.deepEqual(getVisibleDailyOptions(options, 20, "addition", overrides[1]).map((option) => option.id), [3]);
});

test("main remains in the flow even when it has no options, so checkout can require it", () => {
  assert.deepEqual(getVisibleDailyCategories([], 20, []), ["main"]);
});
