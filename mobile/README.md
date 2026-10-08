# TAMAM — native Expo app for `fhamati44-droid/craveit`

This directory contains React Native screens. There is no WebView, iframe or website wrapper. The original Vite/Base44 web app and backend functions remain at the repository root.

## Run

```sh
cd mobile
npm ci
npm start
```

Open with an Expo Go version compatible with SDK 57, or build a development client. The EAS project ID is the project already linked by Fadi: `33a3b10b-e776-48ff-98b5-d04d547e9f6e`.

## Backend connection

The repository does not contain its real `VITE_BASE44_APP_ID` or deployment URL. The README's ID is explicitly an example and is not used.

Set `EXPO_PUBLIC_BASE44_APP_ID` in `mobile/.env` using the web deployment's real value, or enter it in the native **حسابي** connection screen. The connection is checked with `getRestaurants` before saving locally. The optional Base44 app URL is retained as deployment metadata; public function calls use the central Base44 API, as the source SDK does. Do not put service tokens or Supabase secrets in the mobile app.

## Implemented

- Dark TAMAM brand colors and Arabic RTL text from the actual customer components.
- Native tabs, home hero with published CMS headline/media and schedule, restaurant search, menu, meal customization, mood selection, suggestion catalog/detail.
- Existing `supabaseProxy` and `homepageEngine` action contracts.
- Required extras and maximum selection limits; customization errors block adding an item.
- Device-persisted cart, distinct restaurant/customization/note lines, quantities and meal subtotals.

## Still pending

This is an initial native customer port, not a full migration of the repository. Live backend data cannot be verified until the actual Base44 app ID is available. Checkout, payments, order tracking/history, rewards, campaign/group-deal mechanics, restaurant fulfillment switching, all CMS slots, Hebrew localization, admin and partner interfaces are not implemented yet. Cart totals currently exclude delivery and discounts. No orders are submitted by this build.

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform all
npx eas-cli@latest build --platform android --profile preview
```

The export check produces Android/iOS JavaScript bundles; it is not a signed APK or a device test. EAS signing/build requires access to the Expo account.
