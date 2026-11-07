# Development roadmap and decision register

Each phase is a separately reviewable increment. Stop after each phase for user approval under the global development rules. Durations are planning ranges for one developer using Codex, with timely decisions/credentials; they are not commitments. Phase 0 creates docs only.

**31 October 2026 update:** The user explicitly defined Phase 2 as three-panel frontend layouts, superseding the original Phase 2 platform-foundation row below. The delivered Phase 2 is UI-only. Authentication, protected routes, backend foundation and real integrations remain future work and must be re-sequenced with the user before implementation. Buyer storefront uses a separate rich ecommerce visual language without neumorphism; seller/admin retain dashboard tokens. See `frontend-routes.md`.

| Phase | Depends on | Scope | Acceptance criteria | Indicative effort |
|---|---|---|---|---|
| 0. Requirements/architecture | PDF | Seven planning docs, ambiguity register | PDF scope traceable; ERD/API/security/roadmap reviewable; no app code | 1-3 days |
| 1. UI foundation | Phase 0 approval; stack approval | Tokens, typography, responsive shells, accessible primitives and showcase | Consistent tokens, focus/hover/disabled/loading states, mobile/tablet behavior, documented style guide; no fake business data/API | 3-7 days |
| 2. Platform foundation | Phase 1 approval | Monorepo/app setup, DB migrations, auth, roles, sessions, audit, CI, env example | Login/refresh/revocation, permission tests, migrations and builds pass | 5-10 days |
| 3. Seller onboarding/catalog | 2; verification provider choice | Seller/shop/KYC, admin approval, categories, products/variants/images, inventory/import | Seller isolation, moderation, upload validation, low stock and import error report tested | 8-15 days |
| 4. Buyer shopping | 3 | Public catalog/search, buyer accounts/addresses, cart/wishlist, CMS basics | Guest and registered browse/cart, responsive states, catalog SEO | 7-12 days |
| 5. Checkout/orders/payment | 4; payment/tax/shipping policy | Quotes, multi-seller order split, stock reservation, online/COD, coupons, payment webhook | Money and stock reconcile; verified payment; retries idempotent; failure paths tested | 10-18 days |
| 6. Fulfillment/returns | 5; shipping providers and return policy | Seller processing, Delhivery/Shiprocket adapters, tracking, returns/refunds | Own-order isolation, labels/tracking, validated transitions and refund idempotency | 10-18 days |
| 7. Finance/operations | 6; settlement/tax decisions | Commissions, wallet, payouts, COD reconciliation, reports/invoices, admin controls | Ledger balances, payout approval/reconciliation and cross-seller tests pass | 10-20 days |
| 8. Growth/content | 4-7 | Offers/flash deals, full CMS/SEO, reviews, support, notifications, i18n/currencies, abandoned carts | Consent, accessibility, localization, moderation and scheduled jobs tested | 10-20 days |
| 9. Launch hardening | All required features | E2E, security, performance, staging, backup/restore, monitoring and launch runbook | No critical findings; provider sandbox sign-off; restore drill; production checklist approved | 7-14 days |

The ranges overlap when independent work can proceed, but a solo developer still needs integration and regression time. A narrow MVP can stop after Phase 5 with limited shipping/order operations agreed in advance. The complete PDF scope extends through Phase 9. No phase is implicitly approved by this roadmap.

## Missing decisions in PDF (do not silently invent)

| ID | Decision needed | Why it matters |
|---|---|---|
| D-01 | Launch geography, currency, languages, tax jurisdictions and legal entity | Tax, shipping, translations and settlement. |
| D-02 | Payment gateway, payout rail and provider accounts | API contract, refund/payout flow and onboarding. |
| D-03 | Marketplace payment model: who collects funds, issues invoices and bears tax | Legal and ledger design. |
| D-04 | Seller commission precedence, shipping/COD fee bearer, payout cycle, reserve/hold period and disputes | Pricing and settlement. |
| D-05 | Return/cancellation windows, eligible categories, QC authority and refund destination rules | State machines and customer policy. |
| D-06 | Guest checkout identity/contact verification and account merge | Security and buyer order access. |
| D-07 | Stock reservation duration, oversell/backorder allowance and partial fulfillment | Checkout and shipping model. |
| D-08 | Promotion stacking, coupon allocation across sellers and wallet/coupon precedence | Order totals and commission. |
| D-09 | Wallet legal/accounting treatment, expiration, cashback, top-up limits and partial wallet + COD behavior | Finance controls. |
| D-10 | Delhivery/Shiprocket routing, supported service areas and COD reconciliation ownership | Shipping adapter behavior. |
| D-11 | GST/bank verification providers, fallback manual review and KYC retention | Onboarding and privacy. |
| D-12 | Product taxonomy, variant/attribute rules, import template and moderation SLA | Catalog model and seller UX. |
| D-13 | Notification providers, opt-in/opt-out, templates, consent and abandoned-cart policy | Messaging compliance and cost. |
| D-14 | Hosting region, expected traffic/catalog scale, budget, uptime/recovery targets | Infrastructure sizing and monitoring. |
| D-15 | Admin staff permission matrix and high-risk dual approval requirements | RBAC and finance safety. |
| D-16 | SEO URL patterns, multilingual translation workflow and FX source/rate lock policy | Routing, indexing and currency display. |
| D-17 | Support workflow, buyer-seller communication, review moderation and dispute escalation | Operational screens and access. |
| D-18 | Analytics definitions (GMV, revenue, net sales), reporting periods and exports | Dashboard accuracy. |

## Phase completion report template

At each phase end provide files created/modified, completed behavior, incomplete tasks/limits, lint/type/test results, fixes applied and exact run/verification commands. Explicitly request approval before the next phase.
