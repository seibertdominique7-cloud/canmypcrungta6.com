# GTA VI PC Checker

The app supports screenshot OCR and manual PC-spec entry through one shared compatibility engine.
The private admin also manages recommendations, subscribers, articles, pages, taxonomies, media,
site labels, and redirects.
It also includes a private recommendation manager organized as compatibility scenario → editable
section → affiliate product.

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for database, environment, seed, deployment, and admin-login
instructions.

## Getting Started

Create a Neon development branch and copy its pooled and direct PostgreSQL connection strings into
`.env.local`:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DATABASE?sslmode=require"
```

Then prepare the database and run the development server:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local admin setup

1. Copy `.env.example` to `.env.local`.
2. Set `ADMIN_PASSWORD` to a strong private password.
3. Set `SESSION_SECRET` to a long random value of at least 32 characters.
4. Restart `npm run dev` after changing environment variables.
5. Open [http://localhost:3000/admin](http://localhost:3000/admin). The dashboard links to recommendations, subscribers, and every content-management section.

Generate a session secret in PowerShell:

```powershell
$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

Keep `.env.local` private. It is ignored by Git and must never be exposed through
`NEXT_PUBLIC_` environment variables.

## Brevo newsletter setup

Newsletter signups are committed to the local subscriber database first and then added or updated
in Brevo. Configure these private server environment variables in `.env.local`:

- `BREVO_API_KEY`
- `BREVO_LIST_ID`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`

Do not prefix the API key with `NEXT_PUBLIC_`. If Brevo is unavailable or incomplete, the local
subscription remains saved and the server logs a safe diagnostic without the email address or API
key. Add the same variables to the Vercel project and redeploy after changing them in production.

## Content management

The private admin includes Articles, Pages, Categories, Tags, Media, Site Content, and Redirects.
Sample articles are seeded as drafts only when the article table is empty. Public content routes,
metadata, sitemap entries, news sitemap entries, and the RSS feed include only eligible published
or due scheduled content.

Image uploads use a storage abstraction. `MEDIA_STORAGE_PROVIDER="local"` writes to
`public/uploads` for local development only and is intentionally blocked in production. The Media
admin shows a warning when the selected provider is incomplete. Supported provider values are
`local`, `vercel-blob`, `cloudinary`, and `s3`.

- Vercel Blob requires `BLOB_READ_WRITE_TOKEN`.
- Cloudinary requires `CLOUDINARY_URL`.
- S3 requires `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
- S3-compatible services can also set `S3_ENDPOINT` and `S3_PUBLIC_BASE_URL`.
- `MEDIA_MAX_UPLOAD_MB` controls the upload limit (8 MB by default).

External images are stored as their exact HTTPS URL and are not copied into upload storage. Set
`SITE_URL` to the deployed canonical origin so metadata, feeds, and sitemaps use production URLs.

The admin-only AI SEO Publisher creates validated drafts inside the same Article CMS and references
existing affiliate products by Product ID. See [AI_SEO_PUBLISHER.md](./AI_SEO_PUBLISHER.md) for
Gemini/OpenAI provider variables, single and batch generation, product references, and the
review/publish workflow.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Create or connect a Neon PostgreSQL database, then add these encrypted environment variables to the
Vercel project:

- `DATABASE_URL`: the pooled Neon connection string (its hostname normally contains `-pooler`).
- `DIRECT_URL`: the direct, non-pooled Neon connection string used by Prisma migrations.

Apply both variables to Production. Apply them to Preview and Development too if those deployments
should use Neon; separate Neon branches are recommended so preview builds cannot change production
data. Do not prefix either variable with `NEXT_PUBLIC_`.

Vercel uses the repository's `vercel.json` build command, which runs `prisma migrate deploy`
before `next build`, so the PostgreSQL schema is created or upgraded before Next.js renders the
application. Local `npm run build` remains a database-independent compiler check. After the first deployment, run
`npm run db:seed` once against the intended Neon database if it needs the app's structural seed
records. Seeding is deliberately not part of every build.

The previous local SQLite data was not deleted. A verified pre-conversion backup is stored locally
at `prisma/backups/dev-before-neon-postgres-20260726-160547.db` (SHA-256:
`1394CF8DD89F7AD307E037E914D7C1C44D07369CFB192DFF3B8A5E06C3D6D6A5`). Backups are ignored by Git
and are not deployed to Vercel. The new baseline migration creates the PostgreSQL schema; it does
not silently copy local SQLite rows into Neon.

Production admin authentication requires `ADMIN_PASSWORD` and `SESSION_SECRET` in the Vercel
project environment settings. Environment-variable changes only apply after a new deployment, so
redeploy the project after adding or updating either value.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
