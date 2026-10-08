import assert from "node:assert/strict";
import test from "node:test";
import { createApi } from "../src/lib/api.ts";

test("missing connection fails without sending any request", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("unexpected network call");
  };
  try {
    await assert.rejects(
      createApi({ appId: "", appBaseUrl: "" }).restaurants(),
      /CraveIt/,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("native menu calls follow the repository proxy contract and preserve category items", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    const data =
      body.action === "getMenuCategories"
        ? [{ id: 9, name: "وجبات" }]
        : [{ id: 42, price: 30 }];
    return Response.json({ data });
  };
  try {
    const menu = await createApi({ appId: "app/test", appBaseUrl: "" }).menu(3);
    assert.equal(menu[0].items[0].id, 42);
    assert.match(calls[0].url, /apps\/app%2Ftest\/functions\/supabaseProxy$/);
    assert.deepEqual(
      calls.map((x) => x.body),
      [
        { action: "getMenuCategories", payload: { restaurantId: 3 } },
        { action: "getMenuItems", payload: { categoryId: 9 } },
      ],
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("server failure loading extras rejects, preventing customization from being skipped", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ error: "permission denied" }, { status: 403 });
  try {
    await assert.rejects(
      createApi({ appId: "app", appBaseUrl: "" }).extras(42),
      /permission denied/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("an unpublished homepage returns null rather than a malformed config", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ data: null });
  try {
    assert.equal(
      await createApi({ appId: "app", appBaseUrl: "" }).home(),
      null,
    );
  } finally {
    globalThis.fetch = original;
  }
});
