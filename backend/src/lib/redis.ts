import 'dotenv/config';
import { createClient } from 'redis';

export const redisPrefix = process.env.REDIS_KEY_PREFIX || 'webring:v1';
export const redisClient = process.env.REDIS_URL ? createClient({
 url: process.env.REDIS_URL,
 disableOfflineQueue: true,
 socket: { connectTimeout: 500, reconnectStrategy: retries => Math.min(1000 * 2 ** retries, 30000) },
}) : null;
redisClient?.on('error', () => { /* Cache failures must not take down profile reads. */ });
if (redisClient) void redisClient.connect().catch(() => console.error({event:'redis_unavailable'}));

export async function withRedisTimeout<T>(operation: Promise<T>): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try {
  return await Promise.race([operation, new Promise<never>((_, reject) => {
   timer = setTimeout(() => reject(Error('Cache timeout')), 200);
  })]);
 } finally { clearTimeout(timer); }
}

export function closeRedis() { if (redisClient?.isOpen) redisClient.destroy(); }
