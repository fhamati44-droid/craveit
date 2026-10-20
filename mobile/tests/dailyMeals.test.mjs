import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleDailyCategories, getVisibleDailyOptions, isDailyMenuAvailableOnDate } from "../src/lib/dailyMealOptionRules.ts";
import { buildDailyOrderRows, groupDailyReservations } from "../src/lib/dailyMealOrderGrouping.ts";

const options = [
  { id: 1, menu_id: null, category: "soup", name: "Lentil", active: true },
  { id: 2, menu_id: null, category: "addition", name: "Rice", active: true },
  { id: 3, menu_id: null, category: "addition", name: "Potatoes", active: true },
  { id: 4, menu_id: null, category: "salad", name: "Hummus", active: true },
  { id: 5, menu_id: 20, category: "main", name: "Steak", active: true },
];

test("recurring meals appear from their start date and not before it", () => {
  const recurring = { service_date: "2026-10-22", is_daily: true };
  assert.equal(isDailyMenuAvailableOnDate(recurring, "2026-10-21"), false);
  assert.equal(isDailyMenuAvailableOnDate(recurring, "2026-10-22"), true);
  assert.equal(isDailyMenuAvailableOnDate(recurring, "2026-10-27"), true);
  assert.equal(isDailyMenuAvailableOnDate({ service_date: "2026-10-22", is_daily: false }, "2026-10-23"), false);
});

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

test("admin groups every meal line from one cart while keeping old reservations separate", () => {
  const base = { customer_name: "Nadia", phone: "0500000000", quantity: 1, unit_price: 40, status: "new", created_at: "2026-10-20T12:00:00Z" };
  const groups = groupDailyReservations([
    { ...base, id: 1, menu_id: 11, selected_options: { main: 5, __order: { order_id: "cart-abc", delivery_method: "delivery", delivery_address: "Nazareth", customer_notes: "ring bell", line_index: 1, line_count: 2 } } },
    { ...base, id: 2, menu_id: 12, selected_options: { main: 8, __order: { order_id: "cart-abc", delivery_method: "delivery", delivery_address: "Nazareth", customer_notes: "ring bell", line_index: 2, line_count: 2 } } },
    { ...base, id: 3, menu_id: 13, selected_options: { main: 9 } },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].rows.map((row) => row.id), [1, 2]);
  assert.equal(groups[0].order.delivery_address, "Nazareth");
  assert.deepEqual(groups[1].rows.map((row) => row.id), [3]);
  assert.equal(groups[1].order, null);
});

test("one checkout creates meal rows carrying the same order and delivery details", () => {
  const [first, second] = buildDailyOrderRows({
    lines: [
      { menu_id: 20, service_date: "2026-10-20", quantity: 2, selected_options: { main: 5, soup: 1 }, unit_price: 45 },
      { menu_id: 21, quantity: 1, selected_options: { main: 8 }, unit_price: 60 },
    ],
    customer_name: " Nadia ", phone: "0501234567", delivery_method: "delivery", delivery_address: "Nazareth", customer_notes: "Ring the bell",
  }, "cart-xyz");
  assert.equal(first.customer_name, "Nadia");
  assert.equal(first.quantity, 2);
  assert.equal(first.selected_options.__order.order_id, second.selected_options.__order.order_id);
  assert.equal(first.selected_options.__order.line_count, 2);
  assert.equal(first.selected_options.__order.service_date, "2026-10-20");
  assert.equal(second.selected_options.__order.line_index, 2);
  assert.equal(second.selected_options.__order.delivery_address, "Nazareth");
  assert.deepEqual(second.selected_options.main, 8);
});
