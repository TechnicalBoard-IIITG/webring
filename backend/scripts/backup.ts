import 'dotenv/config';
import { Client } from 'pg';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Read-only, consistent application-table snapshot. Includes private data: never commit.
const directory = resolve('..', '.local-backups', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(directory, { recursive: true });
await copyFile('../data/members.json', resolve(directory, 'members.json'));
const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'user_sessions'");
  const snapshot: Record<string, unknown[]> = {};
  for (const { tablename } of tables.rows) {
    snapshot[tablename] = (await client.query(`SELECT * FROM "${tablename.replaceAll('"', '""')}"`)).rows;
  }
  await client.query('COMMIT');
  await writeFile(resolve(directory, 'database.json'), JSON.stringify(snapshot), { flag: 'wx' });
  console.log(JSON.stringify({ backup: directory, counts: Object.fromEntries(Object.entries(snapshot).map(([name, rows]) => [name, rows.length])), migrations: (snapshot._prisma_migrations as {migration_name:string;finished_at:string|null}[]|undefined)?.map((row) => ({ name: row.migration_name, applied: Boolean(row.finished_at) })) }));
} catch (error) {
  console.error('Backup failed', { code: (error as { code?: string }).code, name: (error as Error).name });
  process.exitCode = 1;
} finally { await client.end(); }
