# Known limitations (2026-11-02)

The marketplace is **not production ready**. The current implementation includes authenticated dashboard reads, selected seller/admin actions, and a buyer account area with dedicated profile, addresses, COD order history/cancellation, wishlist, returns, coupons and support pages. The requested phases 4–9 are not complete.

## Critical

- Online payment creation, verified webhooks, reconciliation, actual refunds, wallet ledger and payouts are not implemented. Return requests may reach `REFUND_PENDING`; that state does not execute a refund. Never accept real online payments through this build.
- Tax, commission, shipping allocation, cancellation and return policies have not been approved. Financial workflows cannot safely be finalized without these rules.

## High

- `/shop/products` and product detail now use the live approved catalog; the homepage and combo editorial sections still contain demo cards. Combo kits remain browser-local and the cart currently supports one variant per product slug.
- Dashboard sections without an API resource show a clear unavailable state. Basic CMS publication, SEO metadata, sitemap and robots are available; navigation menus, redirects and structured data remain. Staff roles and backend module permissions work, while staff account lifecycle controls remain. Returns, reports and integrations remain incomplete. Support ticket creation and admin status updates are available, but conversation replies and attachments are missing.
- Seller GST and bank details can be submitted with password confirmation but remain explicitly `UNVERIFIED`; documents and real provider verification are not implemented. Seller approval is a manual admin decision.
- Admin product and CMS image upload uses a Cloudinary server endpoint, but live upload is unavailable until `apps/web` has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. The secret stays server-side.
- Account notifications are derived from orders, returns and tickets. Push/email delivery and read/unread storage are not implemented. Wallet and saved cards are unavailable; the payments page shows order payment records only.
- API session and rate limit hardening remain pending; see `backend-implementation.md`.

## Medium

- Dashboard lists currently show up to 100 rows and have no pagination or filter controls.
- Inventory updates, checkout and cancellation now create movement records. Shipping provider tracking remains missing.
- Full workflow, security, load and accessibility QA remains outstanding. The buyer integration check covers registration, authorization, profile, ticket, COD checkout idempotency, cancellation and stock restoration; it does not cover the entire marketplace.

## Manual verification

1. Configure a development PostgreSQL database using `apps/api/.env.example`, run Prisma migrations and `npm run seed:demo` in `apps/api`.
2. Start the API and web apps. Sign in with separate buyer, seller and admin test accounts.
3. Confirm unauthenticated `/v1/admin/overview` and `/v1/seller/overview` requests return 401 or 403.
4. As admin, check seller/product approvals and audit activity. As seller, check inventory changes and each order status transition.
5. With two sellers, verify each account cannot read or update the other's inventory or orders.
6. Place a development COD order and verify parent order, seller orders and stock decrements in PostgreSQL.

Do not use production credentials or live payment traffic for these checks.
