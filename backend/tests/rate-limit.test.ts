import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const redis=vi.hoisted(() => ({isReady:true,sendCommand:vi.fn(),on:vi.fn(),connect:vi.fn().mockResolvedValue(undefined)}));
vi.mock('redis',()=>({createClient:()=>redis}));
vi.mock('../src/lib/redis.js',async () => {
 const real=await vi.importActual<typeof import('../src/lib/redis.js')>('../src/lib/redis.js');
 return {...real,redisClient:redis,redisPrefix:'test'};
});
import { createApiLimits } from '../src/lib/rate-limit.js';
let counters:Map<string,{hits:number;until:number}>;
const limits:ReturnType<typeof createApiLimits>[]=[];
function instance(settings={api:100,auth:2,write:2,upload:1},trust=false){
 const limit=createApiLimits(settings);limits.push(limit);
 const app=express();if(trust)app.set('trust proxy',1);
 app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
 app.use('/api',limit.api);
 app.get('/api/auth/google',limit.auth,(_req,res)=>res.json({status:'login'}));
 app.use((req,_res,next)=>{req.session={userId:req.headers['x-test-user']} as typeof req.session;next();});
 app.use('/api',(req,res,next)=>['GET','HEAD','OPTIONS'].includes(req.method)?next():limit.write(req,res,next));
 app.use('/api/banners',(req,res,next)=>req.method==='POST'?limit.upload(req,res,next):next());
 app.use((_req,res)=>res.json({status:'ok'}));return app;
}
beforeEach(()=>{
 vi.clearAllMocks();redis.isReady=true;counters=new Map();
 redis.sendCommand.mockImplementation(async (args:string[])=>{
  if(args[0]==='SCRIPT')return 'script-sha';
  if(args[0]==='EVALSHA'){
   const key=args[3],now=Date.now();let entry=counters.get(key);
   if(!entry||entry.until<=now){entry={hits:0,until:now+Number(args[5])};counters.set(key,entry);}
   return [++entry.hits,entry.until-now];
  }
  return 1;
 });
});
afterEach(()=>{vi.useRealTimers();limits.splice(0).forEach(limit=>limit.close());vi.restoreAllMocks();});
describe('distributed API limits',()=>{
 it('shares a quota between separate backend instances and returns retry headers',async()=>{
  const a=instance({api:2,auth:2,write:2,upload:1}),b=instance({api:2,auth:2,write:2,upload:1});
  expect((await request(a).get('/api/members')).status).toBe(200);
  expect((await request(b).get('/api/members')).status).toBe(200);
  const blocked=await request(a).get('/api/members');
  expect(blocked.status).toBe(429);expect(blocked.body.error).toContain('Too many requests');
  expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);expect(blocked.headers.ratelimit).toBeDefined();
 });
 it('isolates sign-in, account writes and upload quotas',async()=>{
  const app=instance();
  for(let i=0;i<2;i++)expect((await request(app).get('/api/auth/google')).status).toBe(200);
  expect((await request(app).get('/api/auth/google')).status).toBe(429);
  expect((await request(app).get('/api/members')).status).toBe(200);
  expect((await request(app).post('/api/banners/me').set('x-test-user','a')).status).toBe(200);
  expect((await request(app).post('/api/banners/me').set('x-test-user','a')).status).toBe(429);
  expect((await request(app).post('/api/banners/me').set('x-test-user','b')).status).toBe(200);
  expect((await request(app).patch('/api/profile/me').set('x-test-user','a')).status).toBe(429);
  expect([...counters.keys()].join('')).not.toContain('user:a');
 });
 it('does not count health probes or CORS preflight requests',async()=>{
  const app=instance({api:1,auth:1,write:1,upload:1});
  expect((await request(app).get('/api/members')).status).toBe(200);
  expect((await request(app).get('/api/members')).status).toBe(429);
  expect((await request(app).get('/api/health')).status).toBe(200);
  expect((await request(app).options('/api/members')).status).toBe(200);
 });
 it('keeps separate IP quotas behind a trusted proxy and groups IPv6 subnets',async()=>{
  const app=instance({api:1,auth:1,write:1,upload:1},true);
  expect((await request(app).get('/api/members').set('X-Forwarded-For','198.51.100.1')).status).toBe(200);
  expect((await request(app).get('/api/members').set('X-Forwarded-For','198.51.100.2')).status).toBe(200);
  expect((await request(app).get('/api/members').set('X-Forwarded-For','2001:db8:abcd:1200::1')).status).toBe(200);
  expect((await request(app).get('/api/members').set('X-Forwarded-For','2001:db8:abcd:1200::2')).status).toBe(429);
 });
 it('uses local counters without resetting them when Redis goes offline',async()=>{
  const app=instance({api:1,auth:1,write:1,upload:1});
  expect((await request(app).get('/api/members')).status).toBe(200);
  redis.isReady=false;
  expect((await request(app).get('/api/members')).status).toBe(429);
 });
 it('bounds Redis failures and keeps requests rate-limited',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  redis.sendCommand.mockRejectedValue(Error('offline'));
  const app=instance({api:1,auth:1,write:1,upload:1});
  expect((await request(app).get('/api/members')).status).toBe(200);
  expect((await request(app).get('/api/members')).status).toBe(429);
 });
 it('continues enforcing local limits when Redis commands stall',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  redis.sendCommand.mockImplementation(()=>new Promise(()=>{}));
  const app=instance({api:1,auth:1,write:1,upload:1});
  expect((await request(app).get('/api/members')).status).toBe(200);
  expect((await request(app).get('/api/members')).status).toBe(429);
 });
 it('opens a new quota window when the previous one expires',async()=>{
  const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now);
  const app=instance({api:1,auth:1,write:1,upload:1});
  expect((await request(app).get('/api/members')).status).toBe(200);
  vi.mocked(Date.now).mockReturnValue(now+61000);
  // MemoryStore uses new Date(), so expire its local window too.
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now+61000);
  expect((await request(app).get('/api/members')).status).toBe(200);
  vi.useRealTimers();
 });
});
