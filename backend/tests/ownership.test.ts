import { beforeEach,describe,it,expect,vi } from 'vitest';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';
const db=vi.hoisted(()=>({memberProfile:{findUnique:vi.fn(),findFirst:vi.fn(),update:vi.fn(),count:vi.fn(),create:vi.fn()},profileRevision:{create:vi.fn()},memberRepository:{deleteMany:vi.fn()},memberGitHubSummary:{deleteMany:vi.fn()},user:{findUnique:vi.fn()},$transaction:vi.fn()}));
vi.mock('../src/lib/db.js',()=>({prisma:db}));
import { profileRouter } from '../src/routes/profile.js';
import { bannersRouter } from '../src/routes/banners.js';
import { repositoriesRouter } from '../src/routes/repositories.js';
const app=express();app.use(express.json());
// Test-only session injection: never present in the real server.
app.use((req,_res,next)=>{req.session={userId:req.headers['x-test-user']} as unknown as typeof req.session;next()});
app.use('/profile',profileRouter);app.use('/banners',bannersRouter);app.use('/repositories',repositoriesRouter);
const handler:ErrorRequestHandler=(err,_req,res,_next)=>{void _next;res.status(err instanceof ZodError?400:500).json({error:'Rejected'})};app.use(handler);
beforeEach(()=>{vi.clearAllMocks();db.$transaction.mockImplementation(fn=>fn(db))});
describe('server-enforced ownership',()=>{
 it('requires authentication for profile writes and banner writes',async()=>{
  expect((await request(app).patch('/profile/me').send({name:'X'})).status).toBe(401);
  expect((await request(app).post('/banners/me')).status).toBe(401);
  expect(db.memberProfile.update).not.toHaveBeenCalled();
 });
 it('loads and updates only the session owner',async()=>{
  const before={id:'profile-a',ownerId:'user-a',github:'student'};db.memberProfile.findUnique.mockResolvedValue(before);db.memberProfile.update.mockResolvedValue({...before,name:'Updated'});
  const response=await request(app).patch('/profile/me').set('x-test-user','user-a').send({name:'Updated',linkedin:''});
  expect(response.status).toBe(200);
  expect(db.memberProfile.findUnique).toHaveBeenCalledWith({where:{ownerId:'user-a'}});
  expect(db.memberProfile.update).toHaveBeenCalledWith({where:{id:'profile-a',ownerId:'user-a'},data:{name:'Updated',linkedin:null}});
  expect(db.profileRevision.create).toHaveBeenCalled();
 });
 it('rejects injected owner IDs and email fields',async()=>{
  expect((await request(app).patch('/profile/me').set('x-test-user','a').send({ownerId:'victim',email:'victim@iiitg.ac.in'})).status).toBe(400);
  expect(db.memberProfile.update).not.toHaveBeenCalled();
 });
 it('does not create duplicates when a legacy email matches',async()=>{
  db.user.findUnique.mockResolvedValue({id:'a',email:'a@iiitg.ac.in',profile:null});db.memberProfile.count.mockResolvedValue(1);
  expect((await request(app).post('/profile').set('x-test-user','a').send({name:'A',year:2029,techStack:[]})).status).toBe(409);
  expect(db.memberProfile.create).not.toHaveBeenCalled();
 });
 it('invalidates cached account associations when GitHub is cleared',async()=>{
  db.memberProfile.findUnique.mockResolvedValue({id:'a',github:'old'});db.memberProfile.update.mockResolvedValue({id:'a',github:null});
  expect((await request(app).patch('/profile/me').set('x-test-user','owner').send({github:null})).status).toBe(200);
  expect(db.memberRepository.deleteMany).toHaveBeenCalledWith({where:{memberId:'a',source:'owner'}});
 });
 it('rejects spoofed image content types and anonymous nominations',async()=>{
  expect((await request(app).post('/banners/me').set('x-test-user','a').attach('banner',Buffer.from('GIF89a'),{filename:'x.png',contentType:'image/png'})).status).toBe(415);
  expect((await request(app).post('/repositories/nominations').send({})).status).toBe(401);
 });
 it('requires an actual database admin role to review associations',async()=>{
  db.user.findUnique.mockResolvedValue({role:'MEMBER'});
  expect((await request(app).patch('/repositories/nominations/n').set('x-test-user','student').send({status:'approved'})).status).toBe(403);
 });
});
