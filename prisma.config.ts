import { defineConfig, env } from 'prisma/config'
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'node:path'

// Prisma 7 does not auto-load .env files.
// Load .env.local so Prisma CLI commands (validate, migrate, studio) can
// resolve DATABASE_URL and DATABASE_URL_UNPOOLED from the Next.js env file.
dotenvConfig({ path: resolve(process.cwd(), '.env.local') })

export default defineConfig({
  datasource: {
    // CLI/migrate connection — DIRECT (unpooled). Neon's pooled (PgBouncer)
    // endpoint cannot run migrations. The runtime app uses the pooled
    // DATABASE_URL via the @prisma/adapter-pg driver adapter (added in a later task).
    url: env('DATABASE_URL_UNPOOLED'),
  },
})
