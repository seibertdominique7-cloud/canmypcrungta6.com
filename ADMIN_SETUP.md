# Affiliate admin setup

The private recommendation manager is available at `/admin/products` and `/admin/recommendations`. It uses server-only
password verification and a signed, HTTP-only session cookie. There are no public accounts or
registration flows.

## Environment variables

Copy `.env.example` to `.env.local`, then replace every example secret:

```dotenv
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="use-a-unique-long-password"
SESSION_SECRET="use-at-least-32-random-characters"
AFFILIATE_RECOMMENDATION_LIMIT="3"
```

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
`npm run db:seed` is idempotent: it creates missing core scenarios and their editable default
sections without overwriting titles, descriptions, layout settings, or products changed in admin.
The four legacy prebuilt groups remain in the database for rollback safety.

The seeded product links intentionally use `https://example.com/replace-me/...` and are disabled.
Public APIs also reject this placeholder URL pattern. Replace URLs, images, prices, and copy before
enabling a product.

## Production database

The models use portable scalar fields and relations compatible with PostgreSQL. To deploy on
PostgreSQL, change the Prisma datasource provider to `postgresql`, provide the production
`DATABASE_URL`, generate a PostgreSQL migration, and replace the local SQLite driver adapter with
Prisma's PostgreSQL adapter in `app/lib/prisma.ts` and `prisma/seed.ts`. Run `npm run db:deploy`
followed by `npm run db:seed` during the release.

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

Before the section migration, the local SQLite database was backed up to
`dev.db.backup-before-recommendation-sections-20260717-2334-safe`. The migration is additive:
legacy affiliate and game-purchase tables remain intact, while their records are copied into the
new section/product hierarchy.
