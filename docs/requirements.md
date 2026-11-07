# Marketplace requirements (Phase 0)

Source: `D:/downloads/Multi_Vendor_Ecommerce_Specification.pdf`, draft v1.1, 9 pages. This document records product scope; it does not authorize implementation. IDs are used in the roadmap and API specification. `Specified` means stated in the PDF. `Decision needed` means the PDF leaves material behavior undefined.

## Actors and boundaries

- Guest buyer: browse, search, cart, guest checkout (BR-01).
- Registered buyer: account, orders, wallet, reviews, support (BR-02).
- Seller: own shop, catalog, orders, returns, financial reports (SR-01).
- Super admin: full platform control; staff: permission-limited modules (AR-01).
- One storefront presents products from multiple sellers. A checkout can contain multiple sellers; fulfillment and settlements are seller-specific (OR-01).

## Buyer requirements

| ID | Requirement | Source / note |
|---|---|---|
| BR-01 | Guest browse/search/cart and guest checkout | PDF pp. 3-4; guest identity, contact verification and later claim of orders need decisions. |
| BR-02 | Register/login, OTP, reset password, profile, multiple addresses | pp. 4, 7. |
| BR-03 | Categories/search, product detail, variants, gallery, seller information, reviews | pp. 3-4, 7. Search ranking unspecified. |
| BR-04 | Cart, buy now, wishlist, recently viewed | p. 4. Cart persistence/merge unspecified. |
| BR-05 | Coupon, offers, flash deals | pp. 4-5. Stacking and priority unspecified. |
| BR-06 | Online, COD and wallet payment, including partial/full wallet use | p. 4. Split tender and COD eligibility need decisions. |
| BR-07 | Order placement, tracking, invoice, cancellation, returns, refund to source or wallet | pp. 4, 6. Timing and eligibility need decisions. |
| BR-08 | Support tickets, contact form, FAQs and policy pages | pp. 4, 6. |
| BR-09 | Language/currency preferences and multi-language/multi-currency display | pp. 4-6. Markets, translation source and settlement currency undefined. |
| BR-10 | Email, SMS, push, WhatsApp preferences and event alerts | pp. 4, 6. Consent and provider choice undefined. |
| BR-11 | Delivered-order reviews and ratings; abandoned-cart recovery | pp. 4-5. Review eligibility and outreach consent need rules. |

## Seller requirements

| ID | Requirement | Source / note |
|---|---|---|
| SR-01 | Register with OTP; business/shop profile; GST and bank verification; upload GST certificate, PAN, cancelled cheque and address proof; admin approval/rejection | p. 3. Reverification and document retention undefined. |
| SR-02 | Shop logo/banner/details, opening status, security and notification preferences | p. 3. |
| SR-03 | Product CRUD and bulk CSV/Excel upload; categories, variants, gallery, MRP, selling price, stock, SKU, HSN; admin verification before live | p. 3. Import format and variant model undefined. |
| SR-04 | Inventory low/out-of-stock alerts | pp. 3, 9. Reservation and alert thresholds undefined. |
| SR-05 | Accept/process/pack/ship orders, invoice, partner labels and cancellation handling | pp. 4, 6. Seller acceptance and partial shipment rules undefined. |
| SR-06 | Review/approve/reject return, schedule pickup, inspect media and refund status | pp. 4, 6. Final authority and QC rules undefined. |
| SR-07 | Sales, commission, shipping/COD deductions, refunds, pending/paid payouts, statements and tax invoices/credit notes | p. 4. Legal invoice issuer and settlement formula undefined. |
| SR-08 | Support tickets to admin, buyer queries, alert preferences | p. 4. Buyer-seller direct messaging details undefined. |

## Admin requirements

| ID | Requirement | Source / note |
|---|---|---|
| AR-01 | Dashboard: sales, orders, revenue, seller/buyer activity, pending approvals, returns, payouts, top products | p. 5. Metric definitions undefined. |
| AR-02 | Seller approval/rejection/suspension, verification document inspection, commission override | p. 5. |
| AR-03 | Product approval/rejection/change request, cross-seller inventory; categories, brands, attributes | p. 5. |
| AR-04 | Customer profile/activity including orders, cart, wishlist, addresses, wallet, tickets, reviews and login logs | p. 5. Restrict PII by staff permission. |
| AR-05 | All orders/returns, disputes, forced status and refund override | pp. 5-6. Override needs audit and safety checks. |
| AR-06 | Review moderation and abuse flags | p. 5. |
| AR-07 | Coupons, offers, flash deals with limits, scopes, validity and reporting | p. 5. |
| AR-08 | Wallet balances, manual credit/debit, cashback, refund-to-wallet, expiry and transaction logs | pp. 5-6. Financial controls needed. |
| AR-09 | Location, zone, GST/tax, language and currency masters; shipping/COD charges and partner switches | pp. 5-6. |
| AR-10 | Payment settings, commission, payouts, COD reconciliation, refunds, tax reports | p. 6. |
| AR-11 | CMS pages, banners, blogs, FAQs, policies, menus/footer and contacts; SEO meta/slugs/OG, sitemap, schema, redirects, robots | p. 6. |
| AR-12 | Staff roles/permissions, activity logs, support assignment, notification templates/campaigns, inventory settings and maintenance mode | p. 6. |

## Integrations and quality requirements

| ID | Requirement | Source / note |
|---|---|---|
| IN-01 | Payment gateway: payment, refunds, verified webhooks | pp. 6-8. Provider unspecified. |
| IN-02 | Delhivery and Shiprocket: rate, shipment, label, pickup, tracking, COD | pp. 4, 6-8. Exact feature coverage per provider to verify. |
| IN-03 | GSTIN and bank-account verification APIs | pp. 3, 6-8. Providers unspecified. |
| IN-04 | Email, SMS, WhatsApp, push and optional FX-rate source | pp. 6, 8. Providers unspecified. |
| NFR-01 | Responsive and accessible buyer, seller and admin screens; loading/empty/error states | User global rules. |
| NFR-02 | Server-side authorization and strict seller ownership checks | User global rules. |
| NFR-03 | Input validation on both sides, safe file upload, financial transactions, auditability | User global rules and finance scope. |
| NFR-04 | Pagination, filtering, sorting and search where appropriate | User global rules; PDF p. 8 gives baseline query form. |

## Scope interpretation

The PDF is a functional outline, not an executable contract. Endpoint rows on pp. 7-8 are representative groups; details such as field schemas, status transitions and provider behavior require explicit decisions. No feature listed above is declared complete by this phase.
