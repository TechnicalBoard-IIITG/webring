import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = new URL(process.env.DATABASE_URL!);
for (const [key, value] of Object.entries({connection_limit:'4', pool_timeout:'15', connect_timeout:'15'})) {
 if (!databaseUrl.searchParams.has(key)) databaseUrl.searchParams.set(key, value);
}
export const prisma = globalDb.prisma ?? new PrismaClient({datasourceUrl:databaseUrl.toString()});
if (process.env.NODE_ENV !== 'production') globalDb.prisma = prisma;
