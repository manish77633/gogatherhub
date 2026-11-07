# Deployment guide — development baseline

This project is not ready for production deployment. These steps reproduce a development environment without live provider credentials.

1. Provision a private PostgreSQL development database. Copy `apps/api/.env.example` to `.env` and set `DATABASE_URL` and `WEB_ORIGIN`; never commit secrets.
2. In `apps/api`, run `npm install`, `npx prisma migrate deploy`, `npx prisma generate`, and optionally `npm run seed:demo`.
3. Copy `apps/web/.env.example` to `.env.local`; set `API_INTERNAL_URL` and `SITE_URL` for the local environment.
4. Start `npm run dev` in each app. Verify `/v1/catalog/products`, `/shop/products`, `/robots.txt` and `/sitemap.xml`.
5. Run `npm run typecheck`, `npm run test:buyer-workflow`, and `npm run test:seller-admin-workflow` in `apps/api`; run `npm run build` in `apps/web`.

Before production, establish separate production credentials/database, HTTPS/domain, restricted CORS, migration backup/rollback, encrypted backups with restore drill, durable object storage, Redis/worker, monitoring and alerts. Complete all critical/high findings in `security-audit.md` and the phase checklist. Live providers must stay disabled until sandbox and webhook tests pass.
