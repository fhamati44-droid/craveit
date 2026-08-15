# GroupDeal → CampaignOffer Migration Readiness Report (Phase 1.5)

**Status:** DO NOT migrate in Phase 1.5. This report prepares a future safe migration.

## 1. Fields that map cleanly GroupDeal → CampaignOffer

| GroupDeal field | CampaignOffer field | Notes |
|---|---|---|
| `title` | `offer_title` | direct |
| `subtitle` | (none — fold into `value_add_description`) | additive only |
| `restaurant_id` (Supabase number) | `restaurant_id` (Base44 string) | **type/namespace mismatch — needs a mapping table** |
| `reference_price` | `normal_reference_price` | direct |
| (derived: customer price) | `customer_price` | GroupDeal has no single customer price (threshold-based); must pick the active tier price |
| `start_at` / `end_at` | `start_at` / `end_at` | direct |
| `total_inventory` / `maximum_participants` | `quota_total` | direct |
| `counting_method` | (consumed by `quota_total` semantics) | CampaignOffer counts 1 per purchase; quantity-based deals need per-unit offers |
| `status` | `status` | enum differs but mappable (draft→draft, active→active, ended→expired, etc.) |
| `homepage_featured` / `homepage_priority` | `channels: ['home']` + `priority` | mappable |
| `banner_*` / `show_upcoming_banner` | (no equivalent — Home banner is a separate concern) | needs new fields or keep on GroupDeal |
| `terms_summary` / `customer_explanation` | `value_add_description` | partial |

## 2. Behaviors that do NOT map cleanly

- **Threshold / group-buy pricing**: GroupDeal price drops as participants grow (`GroupDealThreshold`, `buildTiers`). CampaignOffer has a single `customer_price`. A migrated group deal would lose dynamic threshold pricing unless CampaignOffer gains a pricing-model field.
- **Participation / join flow**: `GroupDealParticipation`, `DealJoin`, `DealJoined`, `DealParticipation` implement reserve/pay-current/join-only/COD participation. CampaignOffer has no participation concept — it is a plain priced offer consumed by add-to-cart + checkout.
- **Counting methods** (`participants` / `quantity` / `both`): CampaignOffer quota is per-purchase units only.
- **One-participation-per-customer / min/max quantity per customer**: not represented on CampaignOffer.
- **Reservation expiration** (`reservation_expiration_minutes`): no equivalent.
- **Finalization** (`finalized`, `final_status`, `auto_close_at_end`): CampaignOffer uses status transitions only.
- **Homepage banner** fields: GroupDeal carries its own banner copy/schedule; CampaignOffer relies on `channels` + the Home unified section.

## 3. Community features that depend on GroupDeal

- `CommunityMoodProposal.linked_offer_id` → GroupDeal (community proposals convert to group deals).
- `OfferRule` (audience / point-lock / teaser) is keyed by `deal_id` = GroupDeal id.
- `OfferUnlock.deal_id` for legacy locked offers points to GroupDeal.
- Khabya (`listKhabya`) reads GroupDeal + OfferRule(point_locked).
- `DealParticipation`, `GroupDealParticipation`, `GroupDealThreshold`, `GroupDealAuditLog`, `GroupDealItem` — all group-buy specific.
- Customer `DealJoin` / `DealJoined` / `DealDetail` pages, admin `GroupDealWizard` / `GroupDealsDashboard`.

## 4. Recommended migration path (future)

1. Add an optional `pricing_model` + `participation_config` to CampaignOffer (or a `CampaignOfferGroupBuy` extension) so threshold/group-buy semantics can be expressed without a separate entity.
2. Introduce a `restaurant_id` mapping (Supabase ↔ Base44) so cross-source conflict resolution (unifiedPrecedence) can compare offers on the same restaurant.
3. Migrate OfferRule + OfferUnlock to be keyed by a polymorphic `offer_source` + `offer_id` (already the direction the unified bridge takes).
4. Port community proposal conversion to create a CampaignOffer with `offer_type = COMMUNITY`.
5. Keep GroupDeal read-only during migration; cut over customer surfaces (already unified in 1.5) then retire GroupDeal writes.

## 5. What the unified bridge already guarantees

- Customer surfaces consume `UnifiedOffer` only — they do not reference GroupDeal or CampaignOffer directly.
- One deterministic precedence (`unifiedPrecedence`) means no contradictory customer prices.
- Point-unlock is idempotent per source (each backend checks its own `OfferUnlock` by `deal_id`), so the unified `unlockUnifiedOffer` never deducts twice.
- Attribution routes back to the source system (`recordUnifiedOfferEvent` → campaignEngine for CAMPAIGN; legacy join flow for GROUP_DEAL).