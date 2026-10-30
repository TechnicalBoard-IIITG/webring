import { createHash } from 'node:crypto';
import { rateLimit, MemoryStore, ipKeyGenerator, type Options, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redisClient, redisPrefix, withRedisTimeout } from './redis.js';
import { clientAddress } from './client-address.js';

// Keep a local counter even while Redis is healthy, so an outage does not reset limits.
export function sharedLimitStore(scope: string): Store {
 const local = new MemoryStore();
 const prefix = `${redisPrefix}:limits:${scope}:`;
 let remote: RedisStore | undefined;
 let options: Options;
 let lastWarning = 0;
 return {
  prefix, localKeys:false,
  init(settings) { options=settings;local.init(settings); },
  async increment(key) {
   const fallback={...await local.increment(key)};
   if (!redisClient?.isReady) return fallback;
   try {
    if (!remote) {
     remote=new RedisStore({prefix,sendCommand:async (...args) => {
      if (!redisClient?.isReady) throw Error('Redis unavailable');
      return await withRedisTimeout(redisClient.sendCommand(args)) as RedisReply;
     }});
     // Both scripts are loaded eagerly; handle their rejections during outages.
     void remote.incrementScriptSha.catch(() => {});
     void remote.getScriptSha.catch(() => {});
     remote.init(options);
    }
    const shared=await withRedisTimeout(remote.increment(key));
    return shared.totalHits>=fallback.totalHits ? shared : fallback;
   } catch {
    if (Date.now()-lastWarning>60000) {
     console.error({event:'rate_limit_local_fallback',scope});lastWarning=Date.now();
    }
    return fallback;
   }
  },
  async decrement(key) {
   await local.decrement(key);
   if (remote && redisClient?.isReady) {try {await withRedisTimeout(remote.decrement(key));} catch { /* Local protection remains. */ }}
  },
  async resetKey(key) {
   await local.resetKey(key);
   if (remote && redisClient?.isReady) {try {await withRedisTimeout(remote.resetKey(key));} catch { /* Remote entry expires. */ }}
  },
  shutdown() {local.shutdown();},
 };
}

export interface LimitSettings { api:number;auth:number;write:number;upload:number }
export function createApiLimits(settings: LimitSettings) {
 const stores: Store[]=[];
 const make=(scope:string,limit:number,windowMs:number,account=false) => {
  const store=sharedLimitStore(scope);stores.push(store);
  return rateLimit({
   store,limit,windowMs,standardHeaders:'draft-7',legacyHeaders:false,
   // Group IPv6 addresses by subnet and hash identities before storing them.
   keyGenerator:req => createHash('sha256').update(account && req.session?.userId
    ? `user:${req.session.userId}` : `ip:${ipKeyGenerator(clientAddress(req))}`).digest('hex'),
   skip:req => req.method==='OPTIONS',
   message:{error:'Too many requests. Please retry after the time in Retry-After.'},
  });
 };
 return {
  api:make('api',settings.api,60000),
  auth:make('auth',settings.auth,15*60000),
  write:make('write',settings.write,15*60000,true),
  upload:make('upload',settings.upload,15*60000,true),
  close:() => {for (const store of stores) store.shutdown?.();},
 };
}
