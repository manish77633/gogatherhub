# Proposed PostgreSQL schema

This is a logical schema for review, not a migration. UUID primary keys (`id`) and `created_at`, `updated_at` apply to mutable tables unless stated. All money uses `numeric(18,2)` in a recorded ISO currency; tax rates use `numeric(7,4)`. Never use floating point for money. Identifiers shown as `*_id` are foreign keys; non-null by default unless marked optional. Status values below are proposed and require policy approval.

## Identity, seller and catalog

| Table | Required fields and relationships | Constraints / indexes |
|---|---|---|
| users | email?, phone?, password_hash?, display_name, status, email_verified_at?, phone_verified_at? | Unique normalized non-null email/phone; at least one contact; status active/blocked; `deleted_at` for deactivation. |
| roles, permissions | roles: code, name; permissions: code, module | Unique code. Seed super_admin, staff, seller, buyer roles; permission checks server-side. |
| user_roles, role_permissions | user_id+role_id; role_id+permission_id | Composite PKs; indexes on reverse FK. |
| refresh_sessions | user_id, token_hash, expires_at, revoked_at?, device_label? | Unique token_hash; index user_id/expires_at. |
| otp_challenges | contact_hash, purpose, code_hash, expires_at, attempts, consumed_at? | Index contact_hash/purpose/expires_at; no plaintext OTP. |
| sellers | owner_user_id, legal_name, GSTIN?, business_type, status, reviewed_by?, reviewed_at? | Unique owner_user_id and approved GSTIN where applicable; pending/approved/rejected/suspended. |
| seller_documents | seller_id, type, object_key, mime_type, size_bytes, status, verified_by? | Index seller_id/type/status; private storage; retain history. |
| seller_verifications | seller_id, type, provider, provider_reference?, result_summary, status, checked_at | Unique provider/reference where present; never store unnecessary raw sensitive data. |
| seller_bank_accounts | seller_id, account_last4, account_token_or_encrypted, IFSC, holder_name, verification_status, is_active | One active per seller (partial unique index); encrypted/tokenized account. |
| shops | seller_id, slug, name, description?, logo_key?, banner_key?, status | Unique seller_id and slug; live/closed/suspended; soft delete. |
| addresses | user_id, recipient, phone, line1, line2?, city, state, postal_code, country, is_default | Index user_id; snapshot onto order at checkout. |
| categories | parent_id?, slug, name, status, sort_order | Unique sibling slug; cycle prevention; soft delete. |
| brands | slug, name, status | Unique slug; soft delete. |
| attributes, attribute_values, category_attributes | Attribute name/type; values; category_id+attribute_id | Unique scoped values and category/attribute pair. |
| products | shop_id, category_id, brand_id?, slug, title, description, status, approval_status, HSN?, published_at? | Unique shop_id/slug; indexes category/status, shop/status, search vector; draft/pending/approved/rejected/archived; soft delete. |
| product_variants | product_id, SKU, option_values JSONB, MRP, price, currency, weight?, dimensions?, status | Unique shop_id/SKU via denormalized shop_id or composite FK; price>=0, MRP>=price if policy; index product_id/status; soft delete. |
| product_images | product_id, variant_id?, object_key, alt_text, sort_order | Index product_id/sort_order. |
| inventory | variant_id, on_hand, reserved, low_stock_threshold | Unique variant_id; nonnegative counts, reserved<=on_hand. |
| inventory_movements, inventory_reservations | variant_id, quantity, reason, reference; reservation: order_id, expires_at, status | Idempotency uniqueness per reference; index variant/status/expiry; append-only movement history. |

## Shopping, orders and finance

| Table | Required fields and relationships | Constraints / indexes |
|---|---|---|
| carts | user_id? or guest_token_hash?, currency, expires_at | One active cart per user/guest; index expiry. |
| cart_items | cart_id, variant_id, quantity | Unique cart_id/variant_id; quantity>0. |
| wishlist_items | user_id, product_id | Composite unique; index product_id. |
| recently_viewed | user_id?, anonymous_token_hash?, product_id, viewed_at | Bounded retention; unique owner/product if storing latest only. |
| coupons | code, type, value, currency?, start/end, usage_limit?, per_user_limit?, min_order?, status | Unique normalized code; scoped by coupon_scopes; soft delete. |
| promotions, coupon_scopes, coupon_redemptions | Promotion type/period/rules; coupon-to-shop/category/product scope; redemption order_id/user_id? | Index period/status; unique order_id/coupon_id; enforce usage transactionally. |
| orders | buyer_user_id?, guest_email?, public_number, currency, subtotal, discount, shipping_total, tax_total, grand_total, status, shipping_address_snapshot JSONB, billing_address_snapshot JSONB | Unique public_number; buyer or guest contact; indexes buyer/date/status; pending_payment/placed/cancelled/completed; immutable checkout snapshots. |
| seller_orders | order_id, shop_id, subtotal, discount, shipping, tax, total, status | Unique order_id/shop_id; index shop_id/status/date; own fulfillment lifecycle. |
| order_items | seller_order_id, variant_id?, title_snapshot, SKU_snapshot, HSN_snapshot?, quantity, unit_price, discount, tax, total, currency | Index seller_order_id/variant_id; preserve snapshots even if catalog deleted. |
| payments | order_id, provider, provider_intent_id?, amount, currency, method, status, idempotency_key | Unique provider/intent and idempotency_key; initiated/authorized/captured/failed/refunded. |
| payment_events | payment_id?, provider_event_id, event_type, signature_valid, payload_key?, processed_at?, status | Unique provider/provider_event_id; append only; private payload. |
| wallets | user_id, currency, balance | Unique user_id/currency; nonnegative unless explicit debt policy. |
| wallet_transactions | wallet_id, order_id?, refund_id?, amount_signed, type, idempotency_key, expires_at? | Unique idempotency_key; append-only ledger; balance equals ledger sum. |
| returns | seller_order_id, requested_by, reason, status, requested_at, decided_by?, decided_at? | Index seller_order/status; requested/approved/rejected/pickup/qc/refund_pending/completed. |
| return_items | return_id, order_item_id, quantity, reason, evidence_keys? | Unique return_id/order_item_id; cumulative returned quantity<=purchased. |
| refunds | return_id?, payment_id?, order_id, amount, currency, destination, provider_ref?, status, idempotency_key | Unique idempotency_key/provider_ref; pending/processing/succeeded/failed; no amount above refundable balance. |
| shipments | seller_order_id, provider, tracking_number?, label_key?, status, shipping_amount, COD_amount? | Index seller_order/status, unique provider/tracking where present. Multiple shipments allowed if partial fulfillment approved. |
| shipment_items, shipment_events | shipment_id+order_item_id+quantity; event provider_id/status/time/raw_ref? | Unique event provider ID; quantity sum<=ordered; chronological indexes. |
| commission_rules, commission_entries | Scope seller/category/global, rate/fixed, effective dates; seller_order_id, gross, commission, tax?, adjustment?, status | One applicable rule by precedence; immutable entries after accrual; index seller_order. |
| payouts, payout_items | seller_id, period, amount, currency, bank_account_id, status, provider_ref?; item references commission/adjustment | Unique payout item source; index seller/status/period; draft/approved/processing/paid/failed. |
| settlement_entries | seller_id, seller_order_id?, return_id?, payout_id?, type, amount_signed, currency, idempotency_key | Unique idempotency_key; append-only ledger for fees, COD, refund adjustments and payout. |

## Operations and content

| Table | Required fields and relationships | Constraints / indexes |
|---|---|---|
| reviews | user_id, order_item_id, product_id, rating, title?, body?, status | Unique order_item_id/user_id; rating 1..5; pending/approved/rejected/hidden. |
| support_tickets, ticket_messages | opener_user_id?, seller_id?, order_id?, assigned_staff_id?, subject, status; message author_id, body, attachments? | Index assignee/status/date and owner/status; open/pending/resolved/closed. |
| cms_pages, blogs, FAQs, banners | slug/title/body/status/SEO fields; banners placement/media/period | Unique slug per content type; draft/published; soft delete/version history where needed. |
| redirects | source_path, target_path, code | Unique source_path; code 301/302; prevent redirect loops. |
| notifications, notification_templates, notification_preferences | recipient, channel, event, payload, status; template locale; preference user/channel/event | Index recipient/date, status/date; provider attempt history and consent. |
| locations, shipping_zones, zone_locations, shipping_rules, tax_rules | Country/state/city/postal data; zone membership; rates and effective dates | Unique natural location keys; overlapping rule resolution documented before use. |
| audit_logs | actor_user_id?, action, entity_type, entity_id, before/after redacted JSONB, request_id, created_at | Append-only, indexed entity/date and actor/date; restricted retention/access. |
| outbox_events | event_key, aggregate_type/id, payload, status, attempts, next_attempt_at | Unique event_key; worker index status/next_attempt_at. |

## Deletion and integrity rules

Soft delete users, shops, categories, brands, products, coupons and CMS content where references/history exist. Never soft delete or mutate financial ledger rows, order snapshots, audit logs or provider events; use reversing entries and retention policies. Foreign keys should restrict deletion of referenced business records. Every seller query must join through the authenticated seller's shop; do not trust a route `seller_id`. Use database transactions for checkout, stock reservation, coupon redemption, wallet debit, refund creation and payout posting. Explicit lock order and idempotency keys prevent races.
