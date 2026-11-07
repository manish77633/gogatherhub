# Phase 2 frontend routes

> Current implementation update (2026-11-01): `/shop/checkout` now has an API-backed COD submission flow after buyer login, and login/register forms call the NestJS API through Next.js route handlers. `/seller` and `/admin` now require server-verified sessions with the matching role. The buyer catalog/cart/wishlist still use demo browser data; checkout resolves those demo product slugs against the API catalog. See `backend-implementation.md` for exact setup and remaining work. The paragraphs below record the original Phase 2 UI-only state.

> Buyer UI update (2026-11-02): Product cards now keep one stable **Add to bag** action. After adding, the same space shows **Added · View bag**; kit items show **In kit · View bag**. Kit contents and quantities are edited only on combo pages and in the bag. The storefront accent follows the coral lettering of the supplied logo; mobile button labels stay on one line. The earlier bag/kit button descriptions below are historical.

> Structure update: buyer components/data/styles now live under `apps/web/src/features/buyer`; seller/admin UI and navigation live under `apps/web/src/features/dashboard`. See `project-structure.md`.

All routes are UI-only. Product, order, sales, activity and rating values are illustrative demo data. There is no backend, credential handling, persistence or production access control in Phase 2.

## Buyer storefront — distinct visual system

| Route | Screen |
|---|---|
| `/` | Redirects to `/shop` |
| `/shop` | Go Gather Hub homepage based on supplied visual reference: announcement, header/search/cart, hero slider, occasions, promotions, popular picks, benefits, collections, newsletter, testimonials, FAQ and comprehensive footer |
| `/shop/products` | Go Gather Hub listing with occasion filters, search, sorting, product cards, wishlist and browser-only add-to-cart; empty state |
| `/shop/products/[id]` | Product detail with image, price, quantity, browser-only cart/wishlist actions, details and related products; unknown IDs return 404 |
| `/shop/cart` | Browser-only bag with item quantities, remove action and illustrative subtotal; checkout is disabled |
| `/shop/wishlist` | Browser-only saved-product grid; account sync is not connected |
| `/shop/login` | Go Gather Hub account form preview; fields and submit are disabled because authentication is pending |
| `/shop/register` | Matching registration form preview; fields and submit are disabled because authentication is pending |
| `/shop/products?collection=[slug]` | Occasion, super-category and subcategory collection views; some categories intentionally show no products until catalog data is added |
| `/shop/combos/birthday-party-kit` | Editable birthday kit with cake, balloons and chocolates selected by default |
| `/shop/combos/puja-essentials-kit` | Editable puja kit with thali, diyas, incense and floral decor selected by default |
| `/shop/combos/wedding-gift-set` | Editable wedding gift kit with gift box, flowers and a personalized mug selected by default |

## Seller dashboard — dashboard design system

`/seller` redirects to `/seller/overview`. Each path below has responsive sidebar/topbar and a corresponding initial screen:

`/seller/overview`, `/seller/my-shop`, `/seller/products`, `/seller/inventory`, `/seller/orders`, `/seller/returns`, `/seller/payments`, `/seller/commission`, `/seller/payouts`, `/seller/support`, `/seller/settings`.

Overview has illustrative sales summary, total/pending orders, products, low stock, weekly chart, recent orders and activity. Other sections show a purpose-specific introduction and honest empty state.

## Admin dashboard — dashboard design system

`/admin` redirects to `/admin/overview`. Each path below has responsive sidebar/topbar and a corresponding initial screen:

`/admin/overview`, `/admin/sellers`, `/admin/buyers`, `/admin/products`, `/admin/categories`, `/admin/brands-and-attributes`, `/admin/orders`, `/admin/returns`, `/admin/payments`, `/admin/wallet`, `/admin/coupons-and-offers`, `/admin/shipping`, `/admin/cms`, `/admin/seo`, `/admin/reports`, `/admin/staff-and-permissions`, `/admin/support`, `/admin/settings`.

Overview has illustrative sales/orders/buyer/seller metrics, pending approvals, returns, payout summary, chart and activity. Other sections show a purpose-specific introduction and honest empty state.

## Design system

`/style-guide` preserves the Phase 1 component showcase.

## Protected route status

The user requested protected routes while also deferring credentials and real integration. **Real protected routes are not implemented in Phase 2.** The seller and admin URLs are intentionally open UI previews. A client-only redirect or demo token would not secure financial/admin data. Before connecting any real records, implement server-side authentication and role/permission checks at the API and route boundary, including seller ownership checks. See `security-plan.md`. Do not deploy these preview routes with sensitive data.

## Navigation and interaction contract

- Product/category/search links navigate to real UI routes. Unknown dashboard sections and products return 404.
- Auth forms remain disabled with explanatory text. Homepage newsletter validates an email but explicitly does not submit it to a service. Product, cart and wishlist interactions persist in browser local storage only; checkout is unavailable.
- Dashboard overviews use clearly labeled static examples. Section screens use empty states instead of fabricated operational controls.
- Responsive storefront and dashboards have mobile navigation; tables become labeled mobile cards.

## Buyer catalog extension (UI preview)

- Header navigation uses super-categories, grouped subcategories and a keyboard-accessible hover/click menu. Mobile uses an expandable menu. Catalog hierarchy and the small demo product mapping live in `apps/web/src/lib/store-catalog.ts`.
- The homepage now includes occasion editorial cards, customizable combo cards and an explore-by-category directory in addition to its existing sections.
- Combo selection, quantity updates, additions/removals and total calculation work locally. Adding a kit places its component items in the browser-only bag separately. A persisted, atomic combo order line, vendor ownership, inventory reservation and live pricing are pending backend work.
- Pincode fields use a small hardcoded *demo* service-area set. They do not claim live shipping coverage. Admin-managed serviceability, per-product/vendor coverage, delivery dates and shipping rates remain pending.
- This is structured UI data, not a performance benchmark. Supporting 10,000 products and users requires paginated/indexed API queries, database constraints, image delivery, caching and load testing in later phases. No scalability claim has been verified.

## Latest buyer UI refinement

- The homepage category directory now uses image-led cards, concise subcategory links and larger typography. Benefits, collections, testimonials, FAQ and footer spacing were refined without adding new image assets.
- Combo item quantities support one-step buttons, direct integer entry (1–10,000) and quick selections (1, 10, 100, 1,000, 2,000). The total remains an illustrative client-side calculation. Stock and seller confirmation are required before any real large-quantity order.
- Browser-only cart storage is now a quantity map and reads legacy array-format demo carts. This avoids repeating IDs thousands of times in local storage.
- The cart has a coupon-code entry/validation-preview field. It **does not apply a discount**: coupon rules, eligibility and redemption must be implemented and verified on the backend at checkout.
- Free development database setup and the planned 10,000-product path are described in `database-setup.md`.

## Buyer discovery and grouped bag UI

- The homepage occasion row uses six image-led destinations. Popular Picks now uses five larger cards with consistent product information and bag/kit actions. This replaces the emoji-heavy occasion tiles and compact one-action product cards.
- Header search shows matching collection, kit and product suggestions. Submitted searches also match the mapped category hierarchy in the demo catalog. This is an in-memory UI search; a paginated indexed search API is still required for the full catalog.
- Browser-only bag storage now has separate standalone quantities (`ggh-demo-cart`) and grouped kits (`ggh-demo-kits`). Adding a combo creates one kit group. Extra products can be added to an existing kit from catalog cards. Existing standalone products can be moved into a new kit; products already in another kit block duplicate kit creation.
- Product cards and details show **In bag · View** for an item already in a kit or as a standalone item. Other products show **Add to bag** and **Add to kit** when a kit exists. If no kit exists, the second action leads to combo discovery.
- The cart displays each kit's editable component rows, a separate individual-products section, and kit/individual/combined totals in the summary. Cart prices remain client-side illustrations; no checkout or inventory validation is connected. Kit edits made on the builder after adding an earlier kit do not edit that existing bag kit; edit its quantities in the cart.

## Visual update

- The category directory now uses concise image and caption cards at desktop and mobile sizes; category and subcategory navigation still lives in the header.
- The mobile hamburger button appears to the right of account, wishlist and bag. The supplied logo no longer sits on a dark rectangle; its tagline is rendered in dark text.
- Footer app-store placeholders and unconnected social glyphs were removed. Buyer and dashboard navigation icons now use Lucide SVGs. No new product images were generated.
