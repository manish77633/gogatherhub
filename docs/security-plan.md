# Security and financial safety plan

This is a design contract, not an assertion of implemented controls.

## Identity and authorization

- Short-lived access JWT (proposed 10-15 minutes) plus rotating opaque refresh token stored hashed in `refresh_sessions`; secure, HttpOnly, SameSite cookies for browser sessions with CSRF protection. Revoke token family on reuse. Exact durations require approval.
- Passwords hashed with Argon2id; no plaintext passwords or OTPs. OTP hashes expire (proposed 5 minutes), have attempt caps, per-contact/IP/device limits and resend cooldown. Rate limits and CAPTCHA thresholds should be measured and tuned.
- RBAC gates every admin route and service operation. Fine-grained permissions such as `seller.approve`, `catalog.verify`, `finance.refund`, `finance.payout`. Super admin bypass must still be audited.
- Seller data isolation is enforced in service queries through authenticated seller ID -> shop ID, including joins, bulk operations, file downloads, exports and background jobs. Use 404 for inaccessible seller records. Add cross-seller access tests.
- Buyer order access requires owner identity or a narrowly scoped, expiring guest order token after contact verification; exact guest policy pending.

## Input and storage

- Validate DTOs server-side and forms client-side; bound lengths, quantities, prices, pagination and search. Escape rendered content; sanitize rich CMS HTML. Parameterized queries only.
- Uploads: allowlist MIME and verified file signatures, size/count limits, image transformation, malware scan for documents, private bucket for KYC, signed short-lived access, random object keys, no executable content. Define retention and deletion policy with legal advice.
- Encrypt bank data at rest or use provider tokenization; show only last four digits; restrict finance access. Encrypt secrets in deployment secret manager, never repository. Log redaction for PII, tokens and provider payloads.

## Payments, orders and webhooks

- Treat client payment status as untrusted. Verify gateway signature and amount/currency/order identity; dedupe provider event ID. Reconcile with gateway API when events are ambiguous.
- Checkout reprices from authoritative product/promotion/shipping/tax rules; uses transaction and row locks for stock reservation, coupon usage and wallet debit. Idempotency key binds request fingerprint to one order. Release expired reservations safely.
- Explicit transition guards: parent `pending_payment -> placed -> completed` or `cancelled`; seller order `new -> accepted -> packed -> shipped -> delivered`, with cancellation/return branches. External shipping events cannot jump to a financially significant status without validation. Final transition matrix awaits policy decisions.
- Refund: cap cumulative amount at captured amount less prior successful/pending refunds; record destination, reason, actor and provider reference. Wallet credit only after confirmed refund decision; prevent double credit with idempotency.
- Settlement: immutable signed ledger entries for sale, commission, shipping/COD, refund and payout. Reconcile totals; prevent paying same entry twice; require approval before execute; mark paid only from verified bank/provider evidence. Manual financial adjustments need reason and audit entry.
- All webhook endpoints verify raw-body signature/timestamp, reject replay, record event once and process idempotently via queue. Rotate secrets and alert on failed verification.

## Operations and audit

- Audit admin/seller approvals, product moderation, refunds, wallet adjustments, commission/shipping rule changes, payouts, role changes and data exports with actor, target, timestamp, request ID and redacted before/after.
- Structured logs and alerts for failed logins, OTP abuse, checkout failure, webhook backlog, refund/payout mismatch, suspicious admin activity. Backup and restore tests; production migration rollback plan.
- Security review before launch: dependency scan, secret scan, access-control tests, payment sandbox tests, webhooks replay tests, file-upload abuse tests, OWASP ASVS-informed review and accessibility checks.
- Privacy, tax, seller KYC and notification consent obligations depend on target jurisdictions and need legal/product decisions. No legal conclusion is made here.
