# Entity relationship diagram (logical)

This is the proposed normalized model, not a committed migration. `database-schema.md` defines columns and constraints. Seller isolation follows `shop_id`/`seller_id` ownership, never a client-supplied seller filter alone.

```mermaid
erDiagram
  users ||--o{ addresses : owns
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : assigned
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : included
  users ||--o| sellers : operates
  sellers ||--|| shops : owns
  sellers ||--o{ seller_documents : submits
  shops ||--o{ products : lists
  categories ||--o{ products : classifies
  categories ||--o{ categories : parent
  brands ||--o{ products : labels
  products ||--o{ product_variants : has
  products ||--o{ product_images : displays
  product_variants ||--|| inventory : stocked
  users ||--o| carts : owns
  carts ||--o{ cart_items : contains
  product_variants ||--o{ cart_items : selected
  users ||--o{ wishlist_items : saves
  users ||--o{ orders : places
  orders ||--o{ seller_orders : splits
  shops ||--o{ seller_orders : fulfills
  seller_orders ||--o{ order_items : contains
  product_variants ||--o{ order_items : snapshot_of
  orders ||--o{ payments : paid_by
  orders ||--o{ coupon_redemptions : applies
  coupons ||--o{ coupon_redemptions : redeemed
  users ||--o| wallets : owns
  wallets ||--o{ wallet_transactions : records
  order_items ||--o{ return_items : requested
  returns ||--o{ return_items : contains
  seller_orders ||--o{ returns : related_to
  returns ||--o{ refunds : results_in
  payments ||--o{ refunds : source
  seller_orders ||--o{ shipments : ships
  shipments ||--o{ shipment_events : tracks
  seller_orders ||--o{ commission_entries : accrues
  sellers ||--o{ payouts : receives
  payouts ||--o{ payout_items : includes
  commission_entries ||--o{ payout_items : settles
  users ||--o{ reviews : writes
  order_items ||--o| reviews : verifies
  users ||--o{ support_tickets : opens
  support_tickets ||--o{ ticket_messages : contains
  users ||--o{ notifications : receives
  users ||--o{ audit_logs : acts
```

Additional reference/configuration relationships: category attributes and variant option values; promotions and coupon scopes; locations/zones/shipping rules/tax rules; CMS pages/blogs/media; payment and webhook events; OTP challenges and refresh sessions; bank verification; inventory movements/reservations; wallet ledger, payout ledger and provider reconciliations. These are detailed in the schema and added only where a workflow requires separate lifecycle/history.

## Multi-seller invariant

`orders` is the buyer-facing checkout aggregate. Each `seller_orders` row belongs to exactly one `orders` row and one `shops` row. Each `order_items` row belongs to a seller order and references a variant for provenance, while storing immutable product/variant/title/SKU/HSN/price/tax snapshots. A cart may contain variants from many shops; order and seller-order totals must reconcile. Payment may be order-level; fulfillment, returns, commissions and payouts are seller-order/item-level.
