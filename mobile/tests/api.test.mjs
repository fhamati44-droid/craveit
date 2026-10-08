import assert from "node:assert/strict";
import test from "node:test";
import { createApi, SUPABASE_URL } from "../src/lib/api.ts";

const api = () =>
  createApi({ appId: "app", appBaseUrl: "https://b44.example" });

function mockFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("menu reads Supabase directly and groups items under their category", async () => {
  const m = mockFetch((url) =>
    Response.json(
      url.includes("menu_categories")
        ? [{ id: 9, name: "وجبات" }]
        : [
            { id: 42, category_id: 9, price: 30 },
            { id: 43, category_id: 9, price: 20, active: false },
          ],
    ),
  );
  try {
    const menu = await api().menu(3);
    assert.deepEqual(menu[0].items.map((x) => x.id), [42]);
    assert.ok(m.calls.every((c) => c.url.startsWith(`${SUPABASE_URL}/rest/v1/`)));
    assert.match(m.calls[0].url, /restaurant_id=eq\.3/);
    assert.ok(m.calls[0].options.headers.apikey);
  } finally {
    m.restore();
  }
});

test("extras failure rejects, so customization can't be skipped", async () => {
  const m = mockFetch(() =>
    Response.json({ message: "database unavailable" }, { status: 500 }),
  );
  try {
    await assert.rejects(api().extras(42), /database unavailable/);
  } finally {
    m.restore();
  }
});

test("moods fall back to Base44 until the tamam tables exist in Supabase", async () => {
  const m = mockFetch((url) =>
    url.includes("/rest/v1/")
      ? Response.json({ code: "PGRST205", message: "table not found" }, { status: 404 })
      : Response.json({ data: [{ id: "m1", name_ar: "طاقة" }] }),
  );
  try {
    const moods = await api().moods();
    assert.equal(moods[0].name_ar, "طاقة");
    assert.match(m.calls.at(-1).url, /b44\.example\/api\/apps\/app\/functions\/homepageEngine/);
  } finally {
    m.restore();
  }
});

test("moods come from Supabase once migrated, flagged when they have packages", async () => {
  const m = mockFetch((url) =>
    Response.json(
      url.includes("tamam_moods")
        ? [{ id: "m1", name_ar: "طاقة" }, { id: "m2", name_ar: "آخر الليل" }]
        : [{ mood_id: "m2" }],
    ),
  );
  try {
    const moods = await api().moods();
    assert.deepEqual(moods.map((x) => x.has_suggestions), [false, true]);
    assert.ok(m.calls.every((c) => !c.url.includes("b44.example")));
  } finally {
    m.restore();
  }
});

test("creating an order posts to the shared orders table and returns its id", async () => {
  const m = mockFetch(() => Response.json([{ id: 777 }], { status: 201 }));
  try {
    const order = await api().createOrder({ customer_name: "x", status: "new" });
    assert.equal(order.id, 777);
    assert.equal(m.calls[0].options.method, "POST");
    assert.match(m.calls[0].url, /\/rest\/v1\/orders/);
    assert.equal(m.calls[0].options.headers.Prefer, "return=representation");
  } finally {
    m.restore();
  }
});

test("an unpublished homepage returns null rather than a malformed config", async () => {
  const m = mockFetch(() => Response.json({ data: null }));
  try {
    assert.equal(await api().home(), null);
  } finally {
    m.restore();
  }
});

test("a rejected Supabase key falls back to the Base44 proxy, and stays there", async () => {
  const m = mockFetch((url, o) =>
    url.includes("/rest/v1/")
      ? Response.json({ message: "Invalid API key" }, { status: 401 })
      : Response.json({
          data: JSON.parse(o.body).action === "createOrder" ? { id: 9 } : [{ id: 3, name: "A" }],
        }),
  );
  try {
    const a = api();
    assert.equal((await a.restaurants())[0].id, 3);
    assert.equal((await a.createOrder({ status: "new" })).id, 9);
    const proxyCalls = m.calls.filter((c) => c.url.endsWith("/functions/supabaseProxy"));
    assert.deepEqual(
      proxyCalls.map((c) => JSON.parse(c.options.body).action),
      ["getRestaurants", "createOrder"],
    );
    assert.equal(m.calls.filter((c) => c.url.includes("/rest/v1/")).length, 1); // not retried
  } finally {
    m.restore();
  }
});

test("moods fall back to Base44 when the Supabase key is rejected", async () => {
  const m = mockFetch((url) =>
    url.includes("/rest/v1/")
      ? Response.json({ message: "Invalid API key" }, { status: 401 })
      : Response.json({ data: [{ id: "m1", name_ar: "طاقة" }] }),
  );
  try {
    assert.equal((await api().moods())[0].name_ar, "طاقة");
  } finally {
    m.restore();
  }
});
