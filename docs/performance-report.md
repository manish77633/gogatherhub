# Go Gather Hub performance changes

Measured on 3 November 2026 against the configured hosted development PostgreSQL database. API samples include network time and reading the response body. These are small development samples, not production load tests.

| Measurement | Before | After |
| --- | ---: | ---: |
| Seller Products revisit, median of 3 Chromium navigations | 796 ms | 250 ms |
| Product API reads per warm revisit | 1 | 0 |
| Seller Overview API, median of 3 warm samples | 479 ms | 267 ms |
| Admin Overview API, median of 3 warm samples | 426 ms | 160 ms |
| Admin Products API, median of 3 warm samples | 390 ms | 268 ms |
| Buyer Orders API, median of 3 warm samples | 452 ms | 423 ms |
| Buyer Orders JSON length, characters | 5,636 | 4,925 |

Raw measurements: `perf-baseline.json`, `perf-after.json`, `navigation-baseline.json`, `navigation-after.json` in the repository root. First API sample is excluded from the warm medians. Browser timings include route navigation and rendering; they do not measure React render counts. Network and database load can change these results.

## Implemented

- Shared bounded, memory-only cache with 15-second freshness, identity isolation, concurrent-request deduplication, dependency invalidation and safe handling of reads invalidated during a mutation or logout. Public taxonomy has a separate 60-second client cache.
- Seller revisits reuse cached data without first-load skeletons; background verification is visible. Seller search/status filters and scroll survive tab changes. Search text is indexed once per data update and filtering uses a deferred value.
- Customer account, payments, notifications and support reads reuse the account cache. Only expanded support conversations load replies. Customer mutations invalidate related cached resources.
- Admin mutations show saving feedback, prevent duplicate submissions and invalidate dependent views. Cached admin data now expires instead of remaining indefinitely fresh. Unsupported admin placeholder sections no longer show a permanent loading skeleton.
- Navigation prefetch follows hover/focus intent instead of eagerly requesting every dashboard tab. Sidebar links display pending feedback. Prefetch only calls supported resources.
- Catalog filter submissions use Next Form client navigation with debounce, preserving tab identity and avoiding document reloads. Catalog count and list reads overlap. Listing images use lazy loading and async decoding.
- Commerce storage parsing and context values are memoized. Known cart variant IDs bypass per-product catalog lookups while cart/checkout validation remains on the server. Cart writes serialize and skip unchanged confirmed snapshots. Wishlist writes serialize per product. Failures restore optimistic state and show an error; logout prevents old responses from restoring prior session data.
- Seller/Admin overview statistics use database aggregation with fewer top-level queries. Seller analytics aggregates in PostgreSQL rather than transferring every historical item to Node. Request-scoped authentication deduplicates guard/controller identity reads without caching authorization across requests. Order history no longer returns unused variant fields.
- Applied composite product-list indexes and order date/status indexes through `20261103_dashboard_performance`.

## Important checks completed

- API TypeScript and Next.js production builds.
- Account cache tests; TTL, identity isolation, deduplication, invalidation and logout-race tests.
- Cart/wishlist rollback and known-variant lookup tests.
- Seller/admin ownership and moderation workflow; buyer workflow regression suite.
- Seller API persistence and validation, coupon ownership/scope and checkout rollback, order transitions and return decisions.
- Browser navigation: 15 seller tabs at 1440px/390px; 10 customer account tabs and 20 admin tabs at desktop. No page exceptions or document overflow in these runs. Admin placeholders were checked for navigation, not claimed as implemented business workflows.
- Catalog filter test confirms that the window/document is preserved and tab identity survives submission.

No live payment was charged. Checkout and payment verification remain server-authoritative. No production load test, exhaustive action audit, cross-browser certification or React Profiler session was performed. Existing list caps and unimplemented integration/business workflows documented in `seller-dashboard-audit.md` remain release limitations.

## Rollout

Restart the application services after deploying the updated code. Other environments must apply Prisma migrations. Private data remains uncached by HTTP/CDN; browser memory caches are scoped by user and cleared on logout. The earlier seller audit report contains payment, webhook, shipping and payout setup requirements.
