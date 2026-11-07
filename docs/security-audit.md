# Security audit — 2026-11-02

This is an implementation review and targeted integration check, not a penetration test.

| Severity | Finding | Status / action |
|---|---|---|
| Critical | Online payment/webhook/refund/payout pipeline absent | Keep online payments disabled until provider adapter, signature checks, idempotency and reconciliation are implemented and tested. |
| Medium | Staff account lifecycle incomplete | Module read/write guards and restricted staff tests are implemented. Password rotation, deactivation and stronger session controls remain. |
| High | Auth rate limiting, OTP/reset flows and distributed session controls absent | Implement before production; avoid exposing login endpoints publicly without edge protection. |
| High | Seller GST/bank/document verification absent | Manual approval currently records a decision, not a verified identity. |
| Medium | CSV import is capped at 80 KB/100 rows and validates rows; concurrent duplicate keys may surface as a database error | Add a clean conflict response and larger async import pipeline before scale. |
| Medium | Cart merge and wishlist sync rely on client connectivity | Checkout still reprices and validates stock on the server. Show explicit sync failures in the UI before production. |
| Low | Basic CMS renders text safely through React; rich media and redirect management absent | Add a vetted renderer and allowlist if rich content is introduced. |

Existing targeted checks confirm unauthenticated buyer order access is rejected, buyer admin access is forbidden, and cross-seller product/variant/archive actions are rejected. Full IDOR, CSRF, XSS, SQL injection, file upload and rate-limit testing remains.
