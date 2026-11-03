# Go Gather Hub marketplace

TypeScript marketplace with separate Next.js frontend (`apps/web`) and NestJS REST API (`apps/api`). PostgreSQL is the API's source of truth. Buyer storefront, seller dashboard and admin dashboard live in the frontend; server authorization remains in the API.

See [project structure](docs/project-structure.md), [architecture](docs/architecture.md) and [current backend status](docs/backend-implementation.md).

For the active phase 3–9 scope, progress and credential-dependent work, see [implementation checklist](docs/implementation-checklist.md). Keep this checklist current as each workflow lands.

## Local commands

```powershell
cd apps/api
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Replace DATABASE_URL in .env with a private PostgreSQL URI.
npx prisma migrate deploy
npx prisma generate
npm run dev
```

In another terminal:

```powershell
cd apps/web
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open `http://localhost:3000/shop`. The API defaults to port 4000. `npm run seed:demo` is optional and only for development; it creates catalog data and serviceable pincodes. To sign in as a demo seller/admin, set unique credentials first. Never commit `.env` or `.env.local`.

## Status

The buyer UI currently uses demo catalog/cart data, while COD checkout resolves demo product slugs against the API catalog. Online payment and several marketplace workflows remain pending. See `docs/backend-implementation.md` before relying on the app for real sales.
