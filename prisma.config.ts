import { defineConfig, env } from 'prisma/config'
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'node:path'

// Prisma 7 does not auto-load .env files.
// Load .env.local so Prisma CLI commands (validate, migrate, studio) can
// resolve DATABASE_URL and DATABASE_URL_UNPOOLED from the Next.js env file.
dotenvConfig({ path: resolve(process.cwd(), '.env.local') })

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
})
