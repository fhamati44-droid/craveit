import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

// Keep these production routes and assets when porting cart-only UI updates.
// A successful Expo export is not enough: absent routes silently export a 404.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "src/app/table.tsx",
  "src/components/TablePurchase.tsx",
  "src/components/DirectPurchase.tsx",
  "public/day/index.html",
  "public/day/engine.mjs",
  "public/day/art/tamam-home.glb",
];
test("TAMAM production table and day experiences remain in source", () => {
  const missing = required.filter((path) => !existsSync(resolve(root, path)));
  assert.deepEqual(missing, [], "Production routes/assets missing: " + missing.join(", "));
});
