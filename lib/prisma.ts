import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter — node-postgres over Neon's pooled URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse one client across Next dev hot-reloads so we don't exhaust Neon's
// connection limit by constructing a new client on every module reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
