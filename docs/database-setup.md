# Development database setup

The architecture uses **PostgreSQL**. The NestJS API is now connected to an Aiven development database through its private `apps/api/.env`. The initial migration and development catalog seed were applied on 2026-11-02. The buyer UI still starts with browser demo data; checkout resolves demo product slugs against the API catalog.

## Recommended free option: Supabase

1. Open https://supabase.com/dashboard and sign in.
2. Select **New project**, choose a nearby region, and set a strong database password. Keep the password in a password manager.
3. Wait for the project to provision. In its dashboard, select **Connect** and copy the **Session pooler** Postgres connection string (usually suitable for an IPv4 local machine). Use the exact string shown there. Replace the password placeholder with your password; percent-encode reserved characters in a URI password.
4. The `apps/api` scaffold now exists. Put the URI in its local, gitignored `.env` as `DATABASE_URL=...`. Do not use a `NEXT_PUBLIC_` variable, browser code, a chat message, or a committed file for the database URI. Use a separate project/database for production.
5. Apply the migration from `apps/api/prisma/migrations`, then optionally run `npm run seed:demo` with development-only seller/admin credentials supplied through environment variables. The buyer frontend still uses demo data; the seed mirrors those slugs for COD checkout.

Free-plan quotas and idle-pausing rules can change. Verify them in the provider dashboard before relying on the project. A free database is appropriate for testing, not a proven production capacity guarantee.

## Alternative

Neon (https://console.neon.tech/) also offers hosted PostgreSQL with a free tier. Create a project and copy the pooled connection string from its dashboard. The same server-only secret handling and migration approach applies.

## Path to 10,000 products

- Store products, variants, categories, inventory and prices in normalized PostgreSQL tables with indexes on publication status, seller, category and sortable fields.
- Serve catalog results with cursor or bounded page pagination; never load all products into the browser or a server response.
- Use CDN/object storage for product images; store URLs/metadata in Postgres rather than image bytes.
- Index search deliberately. PostgreSQL full-text/trigram search may be sufficient at first; measure before adding a search service.
- Check prices, coupons, quantities and inventory in the backend at checkout inside safe transactional boundaries. The client total is only a preview.
- Add caching for popular read paths after measuring query latency. Keep order/payment state in Postgres.
- Load-test the target traffic pattern and database plan before claiming 10,000 concurrent users. Product count and concurrent user count are different sizing questions.

The free tier is enough to begin schema and API development; it is not a verified performance promise for the final marketplace.
