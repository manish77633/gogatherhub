# Project structure

The repository uses a TypeScript modular monolith. Frontend and backend have separate applications, builds and environment files. The database is owned by the API.

```text
apps/
  web/                         Next.js buyer, seller and admin UI
    src/app/                   Routes, layouts and thin API proxy handlers
    src/features/buyer/        Storefront components, demo catalog data and styles
    src/features/dashboard/    Seller/admin dashboard UI, navigation and styles
    src/components/            Shared UI primitives and layout pieces
    src/lib/                   Cross-feature server utilities
  api/                         NestJS REST API
    src/main.ts                Server bootstrap
    src/app.module.ts          Feature module composition
    src/database/              Prisma connection provider
    src/modules/auth/          Identity and sessions
    src/modules/catalog/       Public catalog and availability
    src/modules/orders/        Buyer addresses and checkout
    src/modules/sellers/       Seller-owned records
    src/modules/admin/         Platform management
    prisma/                    Schema and reviewed migrations
    scripts/                   Development-only seed
docs/                          Product and engineering decisions
```

## Conventions for future features

- Add a domain under `apps/api/src/modules/<domain>` with its Nest module, controller and service as its logic grows. Register it once in `app.module.ts`. Keep database access server-side and enforce role/ownership checks in each endpoint.
- Keep Next.js route files thin. Put reusable buyer or dashboard UI in the corresponding `src/features` directory. Put components shared by both in `src/components` only when actual reuse exists.
- Buyer demo catalog data stays under `features/buyer/data` until API-backed catalog pages replace it. Dashboard navigation stays under `features/dashboard/data`; it does not depend on buyer data.
- Keep secrets in each app's local `.env` file and only templates in `.env.example`. Never add direct database access to `apps/web`.
- Avoid creating empty packages or services. Add a worker, shared contracts package or object-storage adapter when their first real workflow is implemented.

This layout supports a growing catalog by keeping feature ownership clear. Actual 10,000-product and user capacity still needs database provisioning, pagination/search checks and load testing.
