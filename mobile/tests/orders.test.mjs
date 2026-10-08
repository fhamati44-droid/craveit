import assert from "node:assert/strict";
import test from "node:test";
import { buildOrders, validate } from "../src/lib/orders.ts";

const pizza = { id: 1, name: "פיצה משפחתית", name_ar: "بيتسا عائلية", price: 70 };
const cola = { id: 2, name: "קולה", price: 10 };
const shawarma = { id: 3, name_ar: "شاورما", price: 40 };
const r1 = { id: 10, name: "A", kitchen_id: 5, delivery_fee: 15 };
const r2 = { id: 11, name: "B", kitchen_id: 6, delivery_fee: 12 };
const form = {
  name: " فادي ",
  phone: "054-1234567",
  address: "الناصرة",
  notes: "",
  delivery: "delivery",
  payment: "cash",
  channel: "אפליקציה",
};

test("orders match the old site's shape so the CRM kitchen can read them", () => {
  const [order] = buildOrders(
    [
      { meal: pizza, restaurant: r1, extras: [{ id: 9, name: "זיתים", price: 5 }], note: "", quantity: 2 },
      { meal: cola, restaurant: r1, extras: [], note: "קר", quantity: 1 },
    ],
    form,
  );
  assert.equal(order.customer_name, "فادي");
  assert.equal(order.kitchen_id, 5);
  assert.equal(order.status, "new");
  assert.equal(order.channel, "אפליקציה");
  assert.equal(order.items, "פיצה משפחתית ×2 | קולה ×1");
  assert.equal(order.quantity, 3);
  assert.equal(order.order_items[0].item_total, 150); // (70 + 5) × 2
  assert.equal(order.amount, 150 + 10 + 15); // items + delivery fee
  assert.match(order.notes, /קולה: קר/);
  assert.match(order.notes, /תשלום: מזומן/);
  for (const key of ["courier_id", "drinks", "dessert"]) assert.equal(order[key], null);
});

test("a multi-restaurant cart becomes one order per kitchen", () => {
  const orders = buildOrders(
    [
      { meal: pizza, restaurant: r1, extras: [], note: "", quantity: 1 },
      { meal: shawarma, restaurant: r2, extras: [], note: "", quantity: 1 },
    ],
    form,
  );
  assert.deepEqual(orders.map((o) => o.kitchen_id), [5, 6]);
  assert.equal(orders[1].items, "شاورما ×1"); // Arabic name when no Hebrew one
});

test("pickup charges no delivery and records the pickup address", () => {
  const [order] = buildOrders(
    [{ meal: pizza, restaurant: r1, extras: [], note: "", quantity: 1 }],
    { ...form, delivery: "pickup", address: "" },
  );
  assert.equal(order.amount, 70);
  assert.equal(order.address, "איסוף עצמי");
});

test("validation requires name, a real phone and an address for delivery", () => {
  assert.deepEqual(Object.keys(validate({ ...form, name: "", phone: "12", address: "" })).sort(), [
    "address",
    "name",
    "phone",
  ]);
  assert.deepEqual(validate({ ...form, delivery: "pickup", address: "" }), {});
});
