import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaAdapter: PrismaPg | undefined;
};

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be defined to initialize Prisma.');
}

const usesSupabase = connectionString.includes('supabase.com');

const adapter =
  globalForPrisma.prismaAdapter ??
  new PrismaPg({
    connectionString,
    ...(usesSupabase
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAdapter = adapter;
  globalForPrisma.prisma = prisma;
}
