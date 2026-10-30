import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = new URL(process.env.DATABASE_URL!);
for (const [key, value] of Object.entries({connection_limit:'4', pool_timeout:'15', connect_timeout:'15'})) {
 if (!databaseUrl.searchParams.has(key)) databaseUrl.searchParams.set(key, value);
}
export const prisma = globalDb.prisma ?? new PrismaClient({datasourceUrl:databaseUrl.toString()});
if (process.env.NODE_ENV !== 'production') globalDb.prisma = prisma;

// Only public reads may use replicas. Authentication, edits and jobs use prisma.
const replicas = (process.env.DATABASE_READ_URLS || '').split(',').map(url => url.trim()).filter(Boolean).map(url => {
 const parsed = new URL(url);
 for (const [key, value] of Object.entries({connection_limit:'2', pool_timeout:'3', connect_timeout:'3'})) {
  if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
 }
 return new PrismaClient({datasourceUrl:parsed.toString()});
});
let nextReplica = 0;
export async function publicRead<T>(read: (db: PrismaClient) => Promise<T>): Promise<T> {
 if (!replicas.length) return read(prisma);
 const replica = replicas[nextReplica++ % replicas.length];
 try {
  // Do not cache a lagging replica's old visibility settings after a profile edit.
  const [primary] = await prisma.$queryRaw<{lsn:string}[]>`SELECT pg_current_wal_lsn()::text AS lsn`;
  const [state] = await replica.$queryRaw<{ready:boolean}[]>`SELECT pg_last_wal_replay_lsn() >= ${primary.lsn}::pg_lsn AS ready`;
  if (state?.ready) return await read(replica);
 } catch { console.error({event:'read_replica_unavailable'}); }
 return read(prisma);
}
export async function disconnectDatabases() {
 await Promise.all([prisma, ...replicas].map(db => db.$disconnect()));
}
