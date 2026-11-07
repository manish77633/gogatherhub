# Marketplace implementation checklist

This file is the persistent scope and progress record for phases 3–9. Update each item as code, UI, migrations and tests land. Statuses: **done**, **in progress**, **todo**, **blocked by provider credentials**, **blocked by business decision**. A screen is done only when its real API, authorization, error/empty/loading states and relevant tests work.

## 1. Buyer storefront and account

- **Done** My Account now uses a responsive Tailwind CSS sidebar with dedicated overview, orders and order detail, wishlist, addresses, returns, profile, coupons, payments, notifications and support routes. Order details use compact display numbers and full-size product thumbnails. Address edit/default are persisted with ownership checks; used order addresses cannot be edited. Wallet, card management and notification delivery explicitly show unavailable states.
- **Done** Account section data is fetched on first visit and cached in memory per buyer. Revisited sections avoid duplicate buyer API requests and loading states; changed resources refresh selectively, order placement invalidates order history, and logout clears account/dashboard caches. Overview stat icon circles keep a fixed size.

- **Done** Buyer account layout refreshed with order, address, return and support sections; sign out, inline cancellation and return forms, and profile editing. Admin sign-in route and dashboard sign-out are available. Store navigation, subcategory and footer type sizes increased.
- **In progress** Checkout has live product image cards, a server-calculated COD quote (subtotal, coupon, shipping, COD fee and total), and an order confirmation with delivery address and tracking link. Razorpay is displayed as unavailable until a verified payment flow and credentials are configured; it cannot place an online order yet. Shop subpages use the homepage palette for cards and actions.

- **In progress** Live approved catalog: categories, search, filters, sorting, pagination, product detail, seller, variants, stock, images. `/shop/products` and detail are API-backed; homepage and combo editorial content still contain demo cards. Gallery and product metadata remain.
- **In progress** Server cart, guest cart, login merge, persisted wishlist and recently viewed. Core APIs/UI and integration checks work; combo-kit persistence, multiple variants of the same product and cart error messaging remain.
- **In progress** Checkout quote with server pricing, coupon/stock/shipping validation, seller split and COD order work. Order details/tracking/invoice remain.
- **Done (COD scope)** Buyer account profile, addresses, order history, COD order cancellation, support tickets. Integration test covers idempotent checkout and stock restoration.
- **In progress** Delivered-order reviews with admin moderation, and return-request intake after delivery. Return pickup, refund calculation and execution remain blocked by approved policy/provider setup. Preferences and notification settings remain.

## 2. Seller workspace

- **In progress** Shop/business profile, GST and bank submission (always marked unverified), store open/closed state, product create/edit/archive/moderation, variant price updates, inventory movement/alerts, CSV import preview/commit, fulfillment transitions, own records, support tickets and return decisions. Seller ownership and sensitive-update tests pass.
- **Todo** Document storage/uploads, provider verification, full approval progress, image gallery, Excel import, order detail/invoice, pickup/refund return handling and financial reports.
- **Blocked by provider credentials** Live GST, bank and shipping verification. Current GST/bank fields remain `UNVERIFIED`; no real verification is claimed.

## 3. Admin workspace

- **In progress** Dashboard data is prefetched once per signed-in user and reused on tab navigation; updates refresh the affected resource. Uncached panels show skeletons. Cloudinary server upload endpoint and admin product/CMS image fields are ready; live uploads require Cloudinary server credentials.

- **In progress** Real overview/lists, seller/product approval and rejection reasons, category management, fixed coupons, pincode, support, audit data, CMS entry management and public content pages. Published CMS metadata, sitemap and robots are available. Super admin can create staff roles and accounts; every admin route is guarded by module read/write permissions for staff. Integration test covers allowed and forbidden staff actions.
- **Todo** Staff password rotation/account deactivation UI, customer detail, refund/dispute operations, remaining catalog/location/tax masters, richer CMS/SEO (navigation, redirects, structured data), finance dashboards and reports. Admin review moderation and return queue states are implemented.

## 4. Commerce and financial core

- **Done (COD scope)** Transactional multi-seller parent/seller order creation, server repricing and stock decrement, idempotency.
- **Todo** Explicit discount/shipping allocation, wallet ledger, commission rules, returns/refunds, settlement/payout ledger, concurrency and duplicate-event tests.
- **Blocked by business decision** Tax ownership and calculation, commission precedence, shipping/discount allocation, return windows/eligibility, refund destination and settlement formula. Record proposed rules for review before enabling financial execution.

## 5. Integrations and operations

- **Todo** Provider interfaces and clearly labeled sandbox mode for payments, shipping, GST, bank, notifications and FX; webhook signature/idempotency framework; background jobs and retry tracking.
- **Blocked by provider credentials** Live payment, Shiprocket, Delhivery, GST/bank verification, email/SMS/WhatsApp/push and FX calls.
- **Todo** Security hardening, QA/security/deployment docs, backup/restore instructions and release gates. Do not declare production readiness while critical gaps remain.

## Next work and remaining scope

Admin overview now follows the seller workspace styling and reads live totals, seller/product approval counts, and recent audit events from the admin overview API. Its priority queue links directly to seller and product review screens. This is a presentation and visibility improvement; it does not add finance, refund, or provider execution.

For the remaining marketplace scope, prioritize: **(1)** complete live buyer catalog/homepage and cart/checkout gaps; **(2)** seller/admin operational detail such as pagination, staff lifecycle, customer detail and support replies; **(3)** agree financial rules before implementing commissions, shipping/discount allocation, returns/refunds and settlements; **(4)** add provider sandbox adapters and then credential-backed integrations; **(5)** complete security, full workflow QA and deployment/recovery gates. Provider integrations and financial execution cannot be finished until credentials and business decisions are supplied.

The checklist has 5 major work areas: buyer, seller, admin, commerce/finance, and integrations/operations. All 5 still contain in-progress or todo work; the project is not production ready. Treat this as a scope count, not a percentage: the remaining bullets differ significantly in size and have external dependencies.

## Working order

1. Finish live catalog and cart; 2. seller/admin operational workflows; 3. financial state machines and sandbox adapters; 4. CMS/SEO/notifications; 5. security/QA/deployment verification. Keep provider-dependent live calls for later. Preserve the approved Next.js/NestJS/PostgreSQL/Prisma architecture.
