# Seller dashboard audit and deployment notes — 3 November 2026

Implemented scope

- Dedicated seller screens replace generic database-key tables and browser prompts. All 15 tabs have explicit loading, empty and error handling. Controls, tables and native modal dialogs use consistent light-theme styles and mobile layouts.
- Products support create, edit, archive, variants, category requests and CSV validation/import. Content and price edits return products to admin moderation. Inventory adjustments persist movement records.
- Orders expose seller-owned items, customer and shipping details, with sequential fulfilment transitions. Returns support seller decisions; refunds remain a marketplace finance operation.
- Customers and reviews use seller-scoped queries. Sellers cannot approve or remove customer reviews. Analytics uses actual order items and decimal arithmetic; figures are gross merchandise sales, not net earnings. Dates in daily analytics use UTC.
- Payments display checkout status and gross merchandise subtotals. Commission and payouts clearly explain missing financial configuration and do not fabricate balances.
- Coupons have optional seller ownership. Existing global coupons retain their behavior. Seller coupons are accepted only for carts containing exclusively that seller's products; quote and transactional order creation both enforce scope. Sellers can create, edit amounts and activate/deactivate their own coupons.
- Settings and My Shop edit persisted shop preferences and business details. GST and bank submission requires the current password. Existing storage retains only bank account last four digits, not a usable beneficiary account.
- Fixed active navigation, duplicate overview rendering, category-request staff permissions, zero-value price validation, empty product updates, duplicate category requests, fulfilled-order reporting and unnecessary seller prefetch traffic.
- Hosted PostgreSQL connection exhaustion was reproduced in browser testing. Prisma now defaults to three connections and a 15-second pool wait, respecting explicit DATABASE_URL overrides.

Files changed for this audit

- apps/web/src/features/dashboard/components/seller-panel.tsx
- apps/web/src/features/dashboard/components/dashboard.tsx
- apps/web/src/features/dashboard/data/navigation.ts
- apps/web/src/features/dashboard/styles/dashboard.css
- apps/web/src/app/seller/[section]/page.tsx
- apps/web/src/app/api/dashboard/[panel]/[...path]/route.ts
- apps/api/src/modules/sellers/seller.controller.ts
- apps/api/src/modules/admin/admin-permission.guard.ts
- apps/api/src/modules/catalog/catalog.controller.ts
- apps/api/src/modules/orders/checkout.controller.ts
- apps/api/src/database/prisma.service.ts
- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/20261103_seller_coupons/migration.sql
- apps/api/scripts/test-seller-dashboard.ts

The earlier category-request schema/controller/migration work remains part of the overall seller changes. Other pre-existing workspace changes belong to separate work.

Validation

- API TypeScript build and Next.js production build pass.
- Targeted ESLint checks cover seller-panel.tsx and dashboard.tsx.
- Existing seller/admin ownership and moderation workflow passes against the updated API.
- Existing buyer workflow regression suite passes after seller coupon checkout changes.
- Dedicated audit script exercises real PostgreSQL persistence and API responses, not mock API data. It checks authenticated reads, unauthorized rejection, product creation/archive, stock validation/persistence, shop updates, support tickets, category deduplication, coupon create/deactivate, foreign coupon ownership, quote/order coupon scope and transaction rollback. Browser checks visit every seller tab at 1440px and 390px, open the product edit dialog, check API errors, page exceptions and document overflow. Temporary fixtures are cleaned up.
- Browser coverage is Chromium. It is not a load test, complete screen-reader audit, cross-browser certification, or a live payment/provider test. CRUD tests operate through APIs; browser coverage does not submit every form.

Run the audit

The script expects the updated API at localhost:4100, a web server at localhost:3200 forwarding API_INTERNAL_URL to that API, seeded categories and an active COD service pincode. Run from apps/api:

    npx tsx scripts/test-seller-dashboard.ts

Integration configuration and remaining work

- Payment keys are present in apps/api/.env, but provider validity was not tested and no payment was charged. RAZORPAY_WEBHOOK_SECRET is absent. Configure a distinct webhook secret on the API server and register the HTTPS /v1/payments/razorpay/webhook endpoint for payment.captured. Use matching Razorpay test keys for a sandbox checkout, validate signature rejection/replay handling and reconciliation before enabling live mode. Restart the API after environment changes.
- Cloudinary credentials are present in apps/web/.env.local. Existing admin and buyer upload integrations were not modified or remotely verified. Seller product editing accepts image URLs; direct seller file upload is not implemented.
- EMAIL_USER/EMAIL_PASS exist on the API, but there is no connected seller email delivery transport. Those variables alone do not enable notifications. Choose and configure a transactional email provider and delivery/error handling before promising notification delivery.
- Shipping uses existing database pincode rules and manual seller fulfilment status. No courier account, booking/label SDK or tracking integration exists. Provider selection, credentials, shipment records, webhooks and idempotent booking remain necessary.
- There is no settlement/commission ledger, rate policy, payout beneficiary token, payout SDK or reconciliation process. These need platform business decisions and a configured provider. No payable earnings or withdrawal action is presented. Bank verification remains unconnected.
- Product/inventory/order lists currently retain existing 100-record caps; reviews/coupons/payments use 200-record caps. Full server pagination, large-catalog performance testing and aggregated analytics optimization remain release work.
- Support creates and lists tickets; seller reply threads, attachments and email notifications remain unimplemented. Reviews are read-only for sellers, with moderation controlled by admins.
- Do not describe this as fully production-ready until these integration and scale requirements are completed and verified.

Database rollout

The category-request and seller-coupon migrations were applied successfully to the configured development database. Other environments must run `npx prisma migrate deploy` from apps/api and regenerate the Prisma client before starting updated services. On Windows, `prisma generate` encountered a DLL lock from an existing process; generated client definitions were updated and the rebuilt audit API executed the new models successfully. Stop the API process before regenerating the complete client on deployment.
