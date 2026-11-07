# Security and data-integrity hardening — 3 November 2026

This was a code audit plus focused tests for newly identified issues. Previously passing route, role, ownership, cache and workflow suites were not rerun, as requested. This is not a penetration-test certification or a claim that production infrastructure is verified.

## Important fixes

1. **Atomic payment finalization:** browser verification, webhook handling and reconciliation share one transaction for the paid state, purchased-cart consumption and audit record. Duplicate finalizations cannot consume the cart twice; a different payment cannot silently replace an already recorded payment. A forced audit failure rolls back the payment and cart writes.
2. **Cart data protection:** purchased units are consumed conservatively; lines edited after checkout are retained. Full cart saves require the revision returned by GET/merge, and stale or concurrent saves cannot overwrite a newer revision. Guest-cart merges are transactional and reject unavailable/excess quantities instead of silently discarding or reducing items. Checkout confirmation preserves locally edited lines and reconciles the cart after backend confirmation.
3. **Checkout idempotency:** the concurrent unique-key fallback returns through the same request-fingerprint validation as normal retries instead of returning an order for changed inputs.
4. **Request protection:** the API rejects foreign Origin and cross-site browser mutations, while signed Razorpay webhooks retain their own verification path. Sign-in/registration/Google attempts have a bounded per-process IP limiter and Retry-After feedback. Frontend proxy method allowlists were tightened. API error responses do not expose Prisma query/schema details.
5. **Account binding:** Google sign-in no longer silently attaches a provider identity to an existing password account by matching email. Existing users must sign in and explicitly link Google first. Existing linked subjects continue to identify their account.
6. **Validation:** API Zod objects reject unexpected fields; registration email is trimmed/lowercased; image URLs require HTTPS and a maximum length; PIN codes require a nonzero first digit. Zero-valued coupon discounts such as 0.0 are rejected. Relevant validation responses include field errors, and shared form clients render those errors as plain text. Bank identity changes invalidate the previous verification state.
7. **Uploads:** authentication/origin checks remain. Streaming byte limits are enforced before multipart parsing, even without Content-Length. Malformed multipart/UTF-8 and mismatched JPEG/PNG/WebP/AVIF signatures are rejected. Provider error details are not echoed to the user. Signature checks complement provider decoding; they do not prove that an entire image is harmless.
8. **Recovery and feedback:** CMS delete now retains an unpublished draft; publishing restores it. Confirmation text explains this behavior. Customer cancellation has an explicit confirmation. Admin changes show backend-confirmed success; failed submissions preserve form inputs. Profile/image changes and their audit entries are transactional. Checkout address submission guards duplicate clicks and retains the form reference across asynchronous work.
9. **Browser protections:** nosniff, frame denial and a restrictive referrer policy were added. Inspection found no application use of raw HTML rendering, eval, or unsafe Prisma raw-query helpers in the examined source. Authentication remains checked on the backend; frontend routing is not treated as authorization.

Origin verification complements, rather than replaces, cookie protections and authorization. See the [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## New checks performed

- Backend foreign-origin/cross-site rejection and rate-limit expiry.
- Streamed over-limit bodies, malformed multipart/UTF-8, forged MIME and signature mismatch.
- Sanitized database conflicts, strict unknown-field rejection, registration normalization and unsafe image URLs.
- Signature tampering in the Razorpay signature utility; no provider request or charge was made.
- Google sign-in cannot silently bind an existing admin/password account by email.
- Bank-detail changes invalidate verification; CMS content survives archival and can be republished.
- Real development-database tests: concurrent/idempotent payment finalization, one audit entry, purchased-unit consumption, post-checkout edits retained, conflicting payment rejected, and full rollback after an injected audit failure.
- Real database tests: stale cart revisions rejected, one concurrent cart save accepted, existing quantities preserved after rejected guest merges.
- API TypeScript build and Next.js production build.

Test scripts: `apps/api/scripts/test-security-hardening.ts`, `test-cart-revision.ts`, `test-google-link.ts`, and `test-merge-preservation.ts`. Fixtures use distinct temporary accounts and clean up their own records. Older cart test fixtures were updated for the revision contract; those previous suites were not rerun.

## Deployment and remaining risks

- Deploy frontend and API together: PUT `/v1/buyer/cart` now requires the latest 64-character `revision` from GET `/v1/buyer/cart` or cart merge. Older clients must update; missing revisions are rejected to protect data.
- Restart services to activate the new middleware and transaction code. No schema migration or destructive database operation was required by this audit.
- Configure HTTPS, exact WEB_ORIGIN, host-only cookies where possible, network restrictions around the internal API, trusted proxy handling, request timeouts and a distributed edge rate limiter. The process-local limiter sees the connecting proxy IP and is not a substitute for production client-IP limiting across replicas.
- RAZORPAY_WEBHOOK_SECRET was previously found absent; configure and verify signed sandbox deliveries before live payment rollout. Live capture, provider outages, delivery retries, late capture after cancellation, automated refunds and payout reconciliation were not exercised against the provider. Late captured payments for cancelled orders require financial reconciliation; they are not silently reported as fulfilled.
- Cloudinary credentials were found present earlier, but real uploads/provider decoding were not retested. Email, courier booking, beneficiary verification, commissions and payouts retain the setup limitations in the seller audit report.
- Establish encrypted automated backups, point-in-time recovery where supported, off-site retention, named restore ownership and an isolated restore drill before destructive maintenance. Actual backup configuration and restoration were not accessible/verified. Recovery of a physical historical deletion depends on those backups.
- MFA for privileged accounts, a tested nonce-based CSP, distributed abuse controls and a deployment-level secrets scan/rotation policy remain production hardening work. Environment files are ignored by Git; no credentials were printed, rotated or changed in this audit.
- No broad browser regression suite, load test or previously passed checks were rerun. Full form-by-form browser submission coverage and real provider verification are not claimed.
