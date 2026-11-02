import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.ldsrvzgcvuztrjkqtxpl:LTwDmWY28TEbfODa@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    DEFAULT_DATABASE_URL;
  
  const pool = new Pool({
    connectionString,
    ssl:
      connectionString.includes("supabase") ||
      connectionString.includes("sslmode") ||
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const db = prisma;

globalForPrisma.prisma = prisma;

export default prisma;

