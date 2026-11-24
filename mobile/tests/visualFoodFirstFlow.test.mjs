import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static guardrails for the customer journey; runtime and checkout still need E2E tests.
const basket = readFileSync(new URL('../src/app/basket.tsx', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../src/lib/basketCatalog.ts', import.meta.url), 'utf8');

test('food and table imagery come before restaurant choice', () => {
  const table = basket.indexOf('🍽️ طاولتِك');
  const restaurants = basket.indexOf('🏪 اختاري المصلحة');
  assert.ok(table >= 0 && restaurants > table);
  assert.ok(basket.includes('pictures(quote)'));
});
test('restaurant selection is explicitly required before cart preparation', () => {
  assert.match(basket, /setProviderConfirmed\(false\)/);
  assert.match(basket, /setProviderConfirmed\(true\)/);
  assert.match(basket, /!providerConfirmed\|\|!requested\?\.eligible/);
  assert.match(basket, /disabled=\{loading\|\|!quote\.eligible\|\|!providerConfirmed\}/);
});
test('the meal catalogue reads live offers, restaurants, and prices', () => {
  assert.match(catalog, /api\.restaurants\(\)/);
  assert.match(catalog, /menu_items\?select=\*&active=eq\.true/);
  assert.match(catalog, /price: Number\(meal\.price\)/);
  assert.match(catalog, /restaurant\.is_open !== false/);
});
