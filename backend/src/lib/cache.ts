import { createHash, randomUUID } from 'node:crypto';
import { createClient } from 'redis';

const prefix = process.env.REDIS_KEY_PREFIX || 'webring:v1';
const client = process.env.REDIS_URL ? createClient({
 url: process.env.REDIS_URL,
 disableOfflineQueue: true,
 socket: { connectTimeout: 500, reconnectStrategy: retries => Math.min(1000 * 2 ** retries, 30000) },
}) : null;
client?.on('error', () => { /* Cache failures must not take down profile reads. */ });
if (client) void client.connect().catch(() => console.error({event:'redis_unavailable'}));

async function bounded<T>(operation: Promise<T>): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try {
  return await Promise.race([operation, new Promise<never>((_, reject) => {
   timer = setTimeout(() => reject(Error('Cache timeout')), 200);
  })]);
 } finally { clearTimeout(timer); }
}

const pending = new Map<string, Promise<unknown>>();
// Generation keys prevent an in-flight old read from repopulating the current cache.
export async function cachedPublic<T>(scope: string, query: unknown, ttl: number, load: () => Promise<T>): Promise<T> {
 let key: string | undefined;
 if (client?.isReady) {
  try {
   const generationKey = `${prefix}:${scope}:generation`;
   let generation = await bounded(client.get(generationKey));
   if (!generation) {
    const token = randomUUID();
    const seeded = await bounded(client.set(generationKey, token, {NX:true}));
    generation = seeded ? token : await bounded(client.get(generationKey));
    if (!generation) throw Error('Cache generation unavailable');
   }
   key = `${prefix}:${scope}:${generation}:${createHash('sha256').update(JSON.stringify(query)).digest('hex')}`;
   const hit = await bounded(client.get(key));
   if (hit !== null) return JSON.parse(hit) as T;
  } catch { key = undefined; }
 }
 const requestKey = key || `${scope}:${JSON.stringify(query)}`;
 const existing = pending.get(requestKey);
 if (existing) return existing as Promise<T>;
 const request = (async () => {
  const value = await load();
  if (key && client?.isReady) {
   try { await bounded(client.set(key, JSON.stringify(value), {EX: ttl})); } catch { /* Serve the database result. */ }
  }
  return value;
 })().finally(() => pending.delete(requestKey));
 pending.set(requestKey, request);
 return request;
}

export async function invalidatePublic(...scopes: string[]) {
 if (!client?.isReady) return;
 await Promise.all(scopes.map(async scope => {
  try { await bounded(client.set(`${prefix}:${scope}:generation`, randomUUID())); }
  catch { console.error({event:'cache_invalidation_failed',scope}); }
 }));
}

export function closeCache() { if (client?.isOpen) client.destroy(); }
