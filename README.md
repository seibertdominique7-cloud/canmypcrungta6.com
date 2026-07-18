# GTA VI PC Checker

The app supports screenshot OCR and manual PC-spec entry through one shared compatibility engine.
It also includes a private recommendation manager organized as compatibility scenario → editable
section → affiliate product.

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for database, environment, seed, deployment, and admin-login
instructions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local admin setup

1. Copy `.env.example` to `.env.local`.
2. Set `ADMIN_PASSWORD` to a strong private password.
3. Set `SESSION_SECRET` to a long random value of at least 32 characters.
4. Restart `npm run dev` after changing environment variables.
5. Open [http://localhost:3000/admin/products](http://localhost:3000/admin/products) for the reusable product catalog, or `/admin/recommendations` for scenario assignments.

Generate a session secret in PowerShell:

```powershell
$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

Keep `.env.local` private. It is ignored by Git and must never be exposed through
`NEXT_PUBLIC_` environment variables.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Production admin authentication requires `ADMIN_PASSWORD` and `SESSION_SECRET` in the Vercel
project environment settings. Environment-variable changes only apply after a new deployment, so
redeploy the project after adding or updating either value.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
