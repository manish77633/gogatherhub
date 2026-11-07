# Backend implementation status (2026-11-01)

## Implemented

- NestJS REST API in `apps/api`, PostgreSQL Prisma schema and initial SQL migration.
- Email/password buyer registration and login with Argon2 password hashes, random opaque HttpOnly session cookies, hashed session tokens in PostgreSQL, logout revocation, and server-side role checks.
- Buyer, seller and admin page layouts verify the session via the API before rendering. API seller queries always scope to the authenticated seller ID. Admin approval, pincode and coupon changes write audit records.
- Public catalog list/detail uses bounded pagination; pincode and coupon lookups read database records.
- Seller application, approved seller product create/update/list and seller order list; admin seller/product approval, pincode management and coupon creation endpoints.
- Authenticated buyer addresses and COD order placement. Checkout validates input, reprices from active variants, checks seller approval and pincode/COD availability, atomically decrements stock, applies a bounded coupon, creates a parent order with seller orders, and uses an idempotency key in a serializable transaction.
- Next.js login/register forms and a buyer COD checkout screen. The cart still uses browser demo data; checkout resolves its product slugs against the database before submission. A development seed mirrors the current demo catalog.

## Setup when credentials are available

1. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, `WEB_ORIGIN`, and demo credential values only if seeding development data. Do not commit `.env`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`; set `API_INTERNAL_URL` to the API's server URL.
3. In `apps/api`: `npm install`; `npx prisma migrate deploy`; `npx prisma generate`; optionally `npm run seed:demo`; `npm run dev`. The seed can populate catalog/pincodes without login credentials; custom demo seller/admin credentials are optional and must be unique if supplied.
4. In `apps/web`: `npm install`; `npm run dev`.
5. Open `http://localhost:3000/shop`. Register a buyer, add demo products to the bag, and use `/shop/checkout` for COD. The selected address pincode must be enabled in the database; the demo seed enables a small sample set with zero demo delivery charges.

Use separate staging/production databases. On 2026-11-02, the Aiven development database connection was verified, the create-only initial migration was applied, and the development seed added 26 catalog products plus 10 serviceable pincodes. API catalog and delivery reads returned 200, the web catalog proxy returned 200, and the admin endpoint returned 401 without a session. A buyer registration and real order placement have not yet been tested.

## Remaining before production

Update (2026-11-02): Buyer account APIs/UI now cover profile, address removal, order history, COD cancellation with transactional stock restoration, and support tickets. Seller/admin dashboard core reads and selected actions are connected to the API. Public catalog excludes suspended sellers. The new buyer workflow integration check passes against the development database. The remaining items below still apply unless explicitly covered by this update.

- **Online payments and webhooks:** provider not selected or configured. No successful payment is simulated. Refunds, wallet, payouts and settlements remain unimplemented.
- **Tax/shipping policy:** pincode shipping/COD fees are admin-configurable, but tax treatment, shipping rate rules, guest checkout and cancellation/return policies need business decisions before real sales.
- **Identity hardening:** OTP verification, password reset, refresh/session rotation, distributed rate limits, CSRF review, account lockout and seller document verification remain. The current 7-day opaque session should be reviewed before production.
- **Catalog integration:** public UI still uses demo product data and localStorage cart/wishlist; seller-created products do not yet appear in the storefront. Server cart, search indexing, image storage/upload validation, and 10,000-product load tests remain.
- **Dashboard integration:** seller/admin pages still display illustrative data; their API controls are not wired to UI. Admin roles are provisioned only by the development seed; production bootstrap procedure is pending.
- **Operations:** notifications, background workers, observability, backup/restore drills, provider sandbox tests and deployment setup remain. `npm audit` currently reports three high-severity advisories in the Prisma CLI dependency tree and needs dependency review before release.

This is a connected-code foundation for a future production system, not a verified production-ready marketplace. Credentials and a real PostgreSQL instance are required to test the end-to-end flow.
