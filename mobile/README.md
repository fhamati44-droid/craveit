# TAMAM — native Expo app for `fhamati44-droid/craveit`

This directory contains React Native screens. There is no WebView, iframe or website wrapper. The original Vite/Base44 web app and backend functions remain at the repository root.

## Run

```sh
cd mobile
npm ci
npm start
```

Open with an Expo Go version compatible with SDK 57, or build a development client. The EAS project ID is the project already linked by Fadi: `33a3b10b-e776-48ff-98b5-d04d547e9f6e`.

## Backend

Supabase only (`src/lib/api.ts`) — the same project and tables as `food-crm-final` and `craveit-nextjs`; orders use the exact `orders` row shape the CRM kitchen reads. TAMAM moods/packages live in `tamam_*` tables (`/supabase/migrations`). Base44 is no longer used by the app or the website.

Put the public anon key in `mobile/.env` (see `.env.example`) and, for the website, in the Vercel project's environment variables as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Implemented

- **Brand refresh (Oct 2026):** light "paper" theme with TAMAM deep teal `#06463F` and brand green `#3FA34D`, SVG wordmark with the green triangles inside the A's (`components/brand.tsx`), triangle confetti, brush-stroke price tags, Alexandria 400/500/700/800.
- **TAMAM game tab:** a real spinning mood wheel (`components/MoodWheel.tsx`): tap انطلق for a random spin or a mood to spin to it; pointer flick + haptic tick on every slice, chasing rim lights, reduced-motion support. On landing it fetches that mood's suggestion sets and shows one meal in a bottom sheet (بدّي هاي! / لفّ كمان مرة / كل الوجبات).
- Custom RTL tab bar with a raised TAMAM button in the middle; طلباتي tab is an empty state until order history is ported.
- `RtlRow` horizontal lists start on their first item (previously opened on the last items).

- Dark TAMAM brand colors, bundled Alexandria Arabic typography, vector icons, branded header and a centered mobile-width web preview.
- Image-led horizontal suggestion/restaurant cards, native mood tiles, and scheduled CMS visibility. Google Drive share links resolve like the original web image utility.
- Native tabs, home hero with published CMS headline/media and schedule, restaurant search, menu, meal customization, mood selection, suggestion catalog/detail.
- Existing `supabaseProxy` and `homepageEngine` action contracts.
- Required extras and maximum selection limits; customization errors block adding an item.
- Device-persisted cart, distinct restaurant/customization/note lines, quantities and meal subtotals.

## Still pending

This is an initial native customer port, not a full migration of the repository. The restaurant read endpoint has been verified against the live published backend. Other live flows and physical-device behavior still need verification. Checkout, payments, order tracking/history, rewards, campaign/group-deal mechanics, restaurant fulfillment switching, all CMS slots, Hebrew localization, admin and partner interfaces are not implemented yet. Cart totals currently exclude delivery and discounts. No orders are submitted by this build.

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform all
npx eas-cli@latest build --platform android --profile preview
```

The export check produces Android/iOS JavaScript bundles; it is not a signed APK or a device test. EAS signing/build requires access to the Expo account.
