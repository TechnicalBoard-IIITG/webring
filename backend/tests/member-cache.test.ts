import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks=vi.hoisted(() => ({
 db:{memberProfile:{findFirst:vi.fn(),findMany:vi.fn(),count:vi.fn(),findUnique:vi.fn(),update:vi.fn()},profileRevision:{create:vi.fn()},$queryRaw:vi.fn(),$transaction:vi.fn()},
 values:new Map<string,string>(),
}));
vi.mock('../src/lib/db.js', () => ({
 prisma:mocks.db, publicRead: (read: (db:unknown) => unknown) => read(mocks.db),
}));
vi.mock('redis', () => ({createClient: () => ({
 isReady:true,isOpen:true,on:vi.fn(),connect:async () => {},destroy:vi.fn(),
 get:async (key:string) => mocks.values.get(key) ?? null,
 set:async (key:string,value:string,options?:{NX?:boolean}) => {
  if(options?.NX && mocks.values.has(key))return null;
  mocks.values.set(key,value);return 'OK';
 },
})}));
let app:express.Express;
const profile={id:'a',name:'Student',year:2029,github:'student',isPublic:true,ownerId:'private-owner',legacyEmail:'private@iiitg.ac.in',techStack:['React']};
beforeEach(async () => {
 vi.resetModules();vi.clearAllMocks();mocks.values.clear();vi.stubEnv('REDIS_URL','redis://cache.example');
 const {membersRouter}=await import('../src/routes/members.js');
 const {profileRouter}=await import('../src/routes/profile.js');
 app=express();app.use(express.json());
 app.use((req,_res,next) => {req.session={userId:'owner'} as typeof req.session;next();});
 app.use('/members',membersRouter);app.use('/profile',profileRouter);
 mocks.db.$transaction.mockImplementation(read => read(mocks.db));
 mocks.db.memberProfile.findFirst.mockResolvedValue(profile);
 mocks.db.memberProfile.findUnique.mockResolvedValue(profile);
});
afterEach(() => vi.unstubAllEnvs());
describe('public profile cache integration', () => {
 it('caches only public profile fields and avoids repeated database reads', async () => {
  const first=await request(app).get('/members/a');
  const second=await request(app).get('/members/a');
  expect(first.status).toBe(200);expect(second.body).toEqual(first.body);
  expect(mocks.db.memberProfile.findFirst).toHaveBeenCalledTimes(1);
  expect(second.body).not.toHaveProperty('ownerId');expect(second.body).not.toHaveProperty('legacyEmail');
  const stored=[...mocks.values.values()].join('');
  expect(stored).not.toContain('private-owner');expect(stored).not.toContain('private@');
 });
 it('never loads a private profile into the public cache', async () => {
  mocks.db.memberProfile.findFirst.mockResolvedValue(null);
  expect((await request(app).get('/members/private')).status).toBe(404);
  expect(mocks.db.memberProfile.findFirst).toHaveBeenCalledWith({where:{id:'private',isPublic:true}});
 });
 it('invalidates profile reads before an edit response and hides a newly private profile', async () => {
  expect((await request(app).get('/members/a')).status).toBe(200);
  mocks.db.memberProfile.update.mockResolvedValue({...profile,isPublic:false});
  expect((await request(app).patch('/profile/me').send({isPublic:false})).status).toBe(200);
  mocks.db.memberProfile.findFirst.mockResolvedValue(null);
  expect((await request(app).get('/members/a')).status).toBe(404);
  expect(mocks.db.memberProfile.findFirst).toHaveBeenCalledTimes(2);
 });
 it('caches directory results and reuses filter metadata across queries', async () => {
  mocks.db.memberProfile.findMany.mockImplementation(async args => args.select ? [{year:2029}] : [profile]);
  mocks.db.memberProfile.count.mockResolvedValue(1);mocks.db.$queryRaw.mockResolvedValue([{tech:'React'}]);
  const first=await request(app).get('/members?limit=60');
  expect(first.body).toMatchObject({total:1,years:[2029],technologies:['React']});
  expect((await request(app).get('/members?limit=60')).body).toEqual(first.body);
  expect(mocks.db.memberProfile.count).toHaveBeenCalledTimes(1);
  await request(app).get('/members?limit=60&search=Student');
  expect(mocks.db.$queryRaw).toHaveBeenCalledTimes(1);
  expect(mocks.db.memberProfile.count).toHaveBeenCalledTimes(2);
 });
});
