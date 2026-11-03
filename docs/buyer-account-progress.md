# Buyer account work — 2026-11-03

Demo catalog remains. Wallet and refunds are excluded by user instruction.

Implemented in this change: support conversation/reply persistence with buyer ownership and administrator access; in-app notifications with persistent read markers and mark-all-read; separate variant cart line identities and server-cart hydration; payment history/transaction references and retry for still-payable online orders, using the existing verified Razorpay flow.

Deployment needs the `20261103_account_activity` database migration before exposing the new account UI. Run `npx prisma migrate deploy` and `npm run db:generate` in apps/api, build/deploy API, then deploy web. No migration has been applied to the deployed database by this change.

Configuration-dependent work remains: actual shipping booking/labels/rates/tracking, SMS/email/WhatsApp delivery and push delivery, verified email-change flow, GST/bank verification and FX conversion. No provider adapters or delivery workers for these have been implemented yet. Support file attachments and payment receipt download also remain pending. Live payment retry must be verified with sandbox credentials before accepting live payments.

Notifications currently summarize current order and support state; they are not a full immutable history of every status transition. Support reply API is available for administrators, but a corresponding admin conversation UI is pending.

Validation: frontend/backend type checks, Prisma schema validation; account ownership/read scoping test uses mocked persistence; browser cart/session tests use a mock API, not the deployed database. Database migration/persistence integration and real providers remain unverified.
