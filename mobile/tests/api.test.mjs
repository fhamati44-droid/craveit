import assert from "node:assert/strict";
import test from "node:test";
import { createApi, SUPABASE_URL } from "../src/lib/api.ts";

const api = () => createApi("test-anon-key");

function mockFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("without a Supabase key nothing is sent and the error says what's missing", async () => {
  const m = mockFetch(() => {
    throw new Error("unexpected network call");
  });
  try {
    await assert.rejects(createApi("").restaurants(), /errNoKey/);
    assert.equal(m.calls.length, 0);
  } finally {
    m.restore();
  }
});

test("every call goes to Supabase only — never Base44", async () => {
  const m = mockFetch((url) => Response.json(url.includes("site_settings") ? [{ id: 1 }] : []));
  try {
    const a = api();
    await Promise.all([a.restaurants(), a.moods(), a.suggestions(), a.settings(), a.menu(1)]);
    assert.ok(m.calls.length >= 5);
    assert.ok(m.calls.every((c) => c.url.startsWith(`${SUPABASE_URL}/rest/v1/`)));
    assert.ok(m.calls.every((c) => !/base44/i.test(c.url)));
    assert.equal(m.calls[0].options.headers.apikey, "test-anon-key");
  } finally {
    m.restore();
  }
});

test("menu groups items under their category and hides inactive ones", async () => {
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
    assert.match(m.calls[0].url, /restaurant_id=eq\.3/);
  } finally {
    m.restore();
  }
});

test("extras failure rejects, so customization can't be skipped", async () => {
  const m = mockFetch(() => Response.json({ message: "database unavailable" }, { status: 500 }));
  try {
    await assert.rejects(api().extras(42), /database unavailable/);
  } finally {
    m.restore();
  }
});

test("before the TAMAM migration, moods are simply empty (no crash)", async () => {
  const m = mockFetch(() =>
    Response.json({ code: "PGRST205", message: "table not found" }, { status: 404 }),
  );
  try {
    assert.deepEqual(await api().moods(), []);
    assert.deepEqual((await api().suggestions("m1")).sets, []);
  } finally {
    m.restore();
  }
});

test("moods are flagged when they have active packages", async () => {
  const m = mockFetch((url) =>
    Response.json(
      url.includes("tamam_moods")
        ? [{ id: "m1", name_ar: "طاقة" }, { id: "m2", name_ar: "آخر الليل" }]
        : [{ mood_id: "m2" }],
    ),
  );
  try {
    assert.deepEqual((await api().moods()).map((x) => x.has_suggestions), [false, true]);
  } finally {
    m.restore();
  }
});

test("a wrong key surfaces Supabase's error instead of silently failing", async () => {
  const m = mockFetch(() => Response.json({ message: "Invalid API key" }, { status: 401 }));
  try {
    await assert.rejects(api().restaurants(), /Invalid API key/);
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
