# REST API contract (proposed v1)

Base `/v1`, JSON over HTTPS; uploads use signed URLs or multipart. This expands PDF pp. 7-8 into a reviewable proposal. `Public`, `Buyer`, `Seller`, `Staff(permission)` and `Provider` are authorization classes. Guest checkout is explicitly allowed by the PDF but its verification rule is pending. All list endpoints use `page`, `limit` (max 100), `sort`, `q` and documented filters; responses include `meta.total/page/limit`. Unknown fields are rejected for writes. All write endpoints validate payloads; financial writes accept `Idempotency-Key`.

## Endpoints

| Group | Method and endpoint | Auth | Main purpose |
|---|---|---|---|
| Auth | POST `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Public / session | Buyer or seller registration, login and token lifecycle. |
| Auth | POST `/auth/otp/send`, `/auth/otp/verify`, `/auth/forgot-password`, `/auth/reset-password` | Public | Contact verification and recovery. |
| Auth | GET `/auth/me`, GET `/auth/sessions`, DELETE `/auth/sessions/{id}` | Signed-in | Profile and session revocation. |
| Public catalog | GET `/catalog/categories`, `/catalog/brands`, `/catalog/products`, `/catalog/products/{slug}`, `/catalog/search`, `/catalog/deals`, `/catalog/shops/{slug}` | Public | Browse/search approved, live records only. |
| Buyer | GET/PATCH `/buyer/profile`; GET/POST/PATCH/DELETE `/buyer/addresses[/{id}]` | Buyer | Account and addresses. |
| Buyer | GET/PUT `/buyer/cart`; GET/POST/DELETE `/buyer/wishlist[/{productId}]`; GET `/buyer/recently-viewed` | Buyer or guest cart | Cart and saved items. |
| Buyer | POST `/buyer/checkout/quote`, POST `/buyer/checkout`; POST `/buyer/coupons/validate` | Buyer or verified guest | Server-side repricing and order creation. |
| Buyer | GET `/buyer/orders[/{id}]`, GET `/buyer/orders/{id}/tracking`, POST `/buyer/orders/{id}/cancel` | Owner or verified guest token | Order access and cancellation. |
| Buyer | POST `/buyer/orders/{id}/returns`, GET `/buyer/returns[/{id}]`; GET `/buyer/wallet`, `/buyer/wallet/transactions` | Buyer | Return and wallet records. |
| Buyer | POST `/buyer/reviews`, GET/POST `/buyer/support/tickets`, GET/POST `/buyer/support/tickets/{id}/messages`; PATCH `/buyer/preferences` | Buyer | Review, support, settings. |
| Seller | POST `/seller/onboarding`, POST `/seller/gst-verifications`, POST `/seller/bank-verifications`, POST `/seller/documents`; GET `/seller/onboarding` | Seller | Onboarding and verification. |
| Seller | GET/PATCH `/seller/shop`; GET/POST/PATCH/DELETE `/seller/products[/{id}]`; POST `/seller/products/imports` | Seller | Own shop/catalog; bulk import is async. |
| Seller | GET `/seller/inventory`, POST `/seller/inventory/adjustments`, GET `/seller/inventory/alerts` | Seller | Own stock with audit trail. |
| Seller | GET `/seller/orders[/{id}]`, POST `/seller/orders/{id}/accept`, `/pack`, `/ship`; GET `/seller/returns`, POST `/seller/returns/{id}/decision` | Seller | Own fulfillment and return review. |
| Seller | GET `/seller/commissions`, `/seller/payouts`, `/seller/statements`, `/seller/tax-documents`; GET/POST `/seller/support/tickets` | Seller | Own finances and support. |
| Admin | GET `/admin/dashboard`; GET `/admin/sellers`, GET `/admin/sellers/{id}`, POST `/admin/sellers/{id}/decision` | Staff(seller.read/approve) | Analytics and seller moderation. |
| Admin | GET `/admin/products`, POST `/admin/products/{id}/decision`; CRUD `/admin/categories`, `/brands`, `/attributes` | Staff(catalog.*) | Catalog moderation and masters. |
| Admin | GET `/admin/customers`, `/admin/customers/{id}/activity`, `/admin/orders`, `/admin/returns`, `/admin/reviews`; POST override/decision subresources | Staff(permission per module) | Operations, moderation. |
| Admin | CRUD `/admin/coupons`, `/admin/promotions`, `/admin/shipping-rules`, `/admin/cod-rules`, `/admin/commission-rules`, `/admin/tax-rules` | Staff(permission per module) | Pricing and policy configuration. |
| Admin | GET/POST `/admin/payouts`, POST `/admin/payouts/{id}/approve`, `/execute`; GET `/admin/reconciliation`; POST `/admin/wallet-adjustments` | Staff(finance.*) | Maker/checker recommended; no direct balance edits. |
| Admin | CRUD `/admin/roles`, `/admin/staff`, `/admin/notification-templates`, `/admin/settings`; GET `/admin/audit-logs` | Staff(admin.*) | RBAC and settings. |
| Payments | POST `/payments/intents`, GET `/payments/{id}`, POST `/admin/refunds` | Buyer owner / Staff(finance.refund) | Payment initiation/status and controlled refund. |
| Shipping | POST `/seller/orders/{id}/shipments`, GET `/seller/shipments/{id}/label`; GET `/shipping/quotes` | Seller owner / checkout | Provider-neutral rate and label operations. |
| Webhooks | POST `/webhooks/payments/{provider}`, `/webhooks/shipping/{provider}`, `/webhooks/whatsapp/{provider}` | Provider signature | Signed, idempotent event ingestion. |
| Notifications | GET `/buyer/notifications`, PATCH `/buyer/notifications/{id}/read`; POST `/admin/campaigns` | Buyer / Staff(marketing.send) | Inbox and campaigns; consent enforced. |
| CMS / SEO | GET `/cms/pages/{slug}`, `/cms/blogs[/{slug}]`, `/cms/faqs`, `/cms/banners`; GET `/sitemap.xml`, `/robots.txt` | Public | Published content. |
| CMS / SEO | CRUD `/admin/cms/pages`, `/admin/cms/blogs`, `/admin/cms/faqs`, `/admin/cms/banners`, `/admin/seo/redirects` | Staff(content.* / seo.*) | Content and redirects. |

`CRUD` means list/create/detail/update/delete routes with resource-specific schemas; the exact route set must be frozen in an OpenAPI contract before implementation. PDF shorthand such as `GET /buyer/profile · addresses` is not a literal endpoint. Never expose bank account numbers or private document object keys in ordinary API responses.

## Representative request/response examples

Checkout quote:

```http
POST /v1/buyer/checkout/quote
Content-Type: application/json

{"cartId":"uuid","shippingAddressId":"uuid","couponCode":"WELCOME","paymentMethod":"online"}
```

```json
{"data":{"currency":"INR","subtotal":"1200.00","discount":"100.00","shipping":"50.00","tax":"0.00","total":"1150.00","sellerGroups":[{"shopId":"uuid","total":"1150.00"}],"expiresAt":"2026-11-01T10:00:00Z"}}
```

Quote is indicative; checkout must reprice and reserve inventory atomically. Tax example is illustrative only and does not define tax policy.

Place order:

```http
POST /v1/buyer/checkout
Idempotency-Key: 8e193904-27a7-4620-8995-30618c664055
Content-Type: application/json

{"cartId":"uuid","shippingAddressId":"uuid","paymentMethod":"online","couponCode":"WELCOME"}
```

```json
{"data":{"orderId":"uuid","orderNumber":"MV-000001","status":"pending_payment","amount":"1150.00","currency":"INR","payment":{"id":"uuid","status":"initiated","clientToken":"provider-specific-token"}}}
```

Seller ownership enforcement: `GET /v1/seller/orders/{id}` returns `404` when the order does not belong to the authenticated seller's shop (avoid existence leakage). Admin seller decision:

```json
{"decision":"rejected","reason":"GST certificate unreadable"}
```

Error envelope:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Please correct the highlighted fields.","fields":{"quantity":["Must be greater than zero"]},"requestId":"req_123"}}
```

Use 400 invalid request, 401 unauthenticated, 403 authenticated but forbidden, 404 absent/hidden, 409 conflict or invalid transition, 422 validation/business constraint, 429 rate limit, 502 provider failure and 500 unexpected error. Never return internal provider payloads or stack traces. Webhooks return 2xx only after verified durable receipt; processing can be asynchronous.
