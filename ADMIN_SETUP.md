# Affiliate admin setup

The private recommendation manager is available at `/admin/products` and `/admin/recommendations`. It uses server-only
password verification and a signed, HTTP-only session cookie. There are no public accounts or
registration flows.

## Environment variables

Copy `.env.example` to `.env.local`, then replace every example secret:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DATABASE?sslmode=require"
ADMIN_PASSWORD="use-a-unique-long-password"
SESSION_SECRET="use-at-least-32-random-characters"
AFFILIATE_RECOMMENDATION_LIMIT="3"
```

- `DATABASE_URL` is the pooled Neon PostgreSQL connection used by the application.
- `DIRECT_URL` is the direct Neon connection used by Prisma CLI migrations. If it is absent, the
  CLI can fall back to `DATABASE_URL`, but a direct URL is recommended.
- `ADMIN_PASSWORD` is the owner password. It is read only by server code.
- `SESSION_SECRET` signs sessions and must be at least 32 characters. Changing either secret
  immediately invalidates existing sessions.
- `AFFILIATE_RECOMMENDATION_LIMIT` is retained for backward compatibility with the legacy
  `/api/recommendations` response. Each editable section now controls its own product limit.
- Never commit `.env` or production credentials.

## Local database

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

For schema development, create a migration with `npm run db:migrate -- --name <change-name>`.
`npm run db:seed` is an explicit structural setup command. It creates missing core scenarios and
their editable default sections without creating, restoring, or changing Affiliate Products.
Products deleted in the admin remain deleted when the seed is run again. The four legacy prebuilt
groups remain in the database for rollback safety.

## Production database

The project uses PostgreSQL with Prisma's Neon serverless adapter. Set both `DATABASE_URL` and
`DIRECT_URL` in Vercel before deploying. `vercel.json` runs the `vercel-build` script, which invokes
`prisma migrate deploy` before `next build`; run `npm run db:seed` separately when initializing a
new database.

Use HTTPS in production. The admin cookie is marked `Secure` in production and all affiliate and
image URLs are required to use HTTPS.

## Admin workflow

Open `/admin/products` to manage reusable catalog products, then use `/admin/recommendations` to assign them to scenario sections:

1. Choose a compatibility-result scenario.
2. Choose or create a recommendation section.
3. Add, edit, move, duplicate, reorder, enable, disable, or delete products in that section.

Sections control their title, description, layout, product limit, enabled state, display order,
and collapsed-by-default behavior. The `Game purchase / preorder` section type is rendered only
for passing scenarios. Only add and enable a PC purchase product after an official PC listing
exists.

## Seeded scenarios

`PASS_RECOMMENDED`, `PASS_MINIMUM`, `FAIL_GPU`, `FAIL_CPU`, `FAIL_RAM`, `FAIL_STORAGE`,
`FAIL_CPU_GPU`, `FAIL_GPU_RAM`, `FAIL_CPU_RAM`, `FAIL_MULTIPLE`, `UNKNOWN_GPU`, `UNKNOWN_CPU`,
`UNKNOWN_RAM`, `UNKNOWN_STORAGE`, and `CANNOT_DETERMINE`.

## Prebuilt and game purchase content

Budget/high-end desktop and laptop recommendations are normal editable sections within result
scenarios. Products use the same editor and can be duplicated or moved between sections.

GTA VI purchase links are normal products inside `Game purchase / preorder` sections, with an
optional platform field. They appear only for `PASS_RECOMMENDED` and `PASS_MINIMUM`.

## SQLite migration backup

The pre-PostgreSQL SQLite database remains at `dev.db` and was also copied to the Git-ignored,
verified backup `prisma/backups/dev-before-neon-postgres-20260726-160547.db`. Its SHA-256 is
`1394CF8DD89F7AD307E037E914D7C1C44D07369CFB192DFF3B8A5E06C3D6D6A5`. The 19 historical
SQLite migrations are retained in `prisma/migrations-sqlite-archive`; Prisma deploys only the new
PostgreSQL baseline in `prisma/migrations`.

The PostgreSQL migration creates the schema only. Importing the backed-up SQLite rows into Neon is
a separate, explicit data-migration step and is never run automatically during a Vercel build.
