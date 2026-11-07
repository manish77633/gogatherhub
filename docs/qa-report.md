# QA report — 2026-11-02

## Verified today

- API TypeScript typecheck and Next.js production build pass.
- Development PostgreSQL migrations through `20261102_cms` applied successfully.
- `npm run test:buyer-workflow` passes against the development API/database. It covers buyer registration, session isolation, profile, support, wishlist, recent views, cart merge/persistence, COD checkout idempotency, stock decrement/restoration, cancellation and movement records.
- `npm run test:seller-admin-workflow` passes. It covers seller ownership, product moderation/reason, sensitive shop update confirmation, unverified GST/bank status, price change review, inventory adjustment, CSV import preview/commit, category CRUD, CMS draft/publication boundaries and staff permission restrictions.
- `npm run test:reviews` passes. It covers delivered-order review eligibility, public moderation visibility, return request eligibility, seller decision and admin handoff to a pending finance queue. No refund is executed.
- Public catalog price sorting and stock filtering returned 200 against the development API.

## Not yet verified

- The remote development database briefly returned Prisma `P1001` during concurrent integration runs on 2026-11-02. The same reviews test passed when rerun sequentially. Run database integration suites sequentially until connection stability is measured.

- Browser click-through of every new screen on desktop/mobile and accessibility audit.
- 10,000-product catalog load, concurrent checkout, queue failures, payment/refund/payout paths, shipping provider events and backup restore.
- A full admin permission matrix and seller financial boundaries. Targeted read-only staff restrictions pass, but broader role combinations remain untested.

## Release gate

Critical payment, finance, identity and staff authorization gaps remain. Do not mark this build production-ready or accept live online payments.

## Manual check sequence

1. Apply migrations, run the API and web app, then sign in as separate buyer, seller and admin test accounts.
2. Create a seller product, approve it as admin, confirm it appears in `/shop/products`, and verify search/sort/detail/stock.
3. Add it as a guest, register/login, confirm cart merge, place COD order, and verify order history, seller sub-order and stock movement.
4. Cancel eligible COD order and verify stock restoration and duplicate cancellation rejection.
5. Use two seller accounts to verify product, variant, inventory and order isolation.
6. Import a CSV with a duplicate SKU; confirm preview row errors. Import a valid CSV and confirm products enter review.
7. Publish a CMS page and check buyer page metadata, sitemap entry and draft hiding.
