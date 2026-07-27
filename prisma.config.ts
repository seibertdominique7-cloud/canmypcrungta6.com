import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'prisma/config';

loadEnvConfig(process.cwd());

const migrationDatabaseUrl = (
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL
)?.trim();

if (!migrationDatabaseUrl) {
  throw new Error(
    'A PostgreSQL connection is required. Set DIRECT_URL (recommended for Prisma migrations) or DATABASE_URL.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node node_modules/tsx/dist/cli.mjs prisma/seed.ts',
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
