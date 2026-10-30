import { describe,it,expect,vi,beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
const mocked=vi.hoisted(()=>({enqueue:vi.fn(),db:{memberProfile:{findFirst:vi.fn()},memberGitHubSummary:{findUnique:vi.fn()}}}));
vi.mock('../src/lib/db.js',()=>({prisma:mocked.db}));
vi.mock('../src/lib/github-languages.js',()=>({enqueueMemberLanguages:mocked.enqueue,LANGUAGE_TTL:21600000}));
import { githubRouter } from '../src/routes/github.js';
const app=express();app.use('/members',githubRouter);
beforeEach(()=>vi.clearAllMocks());
describe('public language snapshots',()=>{
 it('requires a public profile and does not leak private cache entries',async()=>{
  mocked.db.memberProfile.findFirst.mockResolvedValue(null);
  expect((await request(app).get('/members/private/github/languages')).status).toBe(404);
  expect(mocked.db.memberProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'private',isPublic:true}}));
  expect(mocked.db.memberGitHubSummary.findUnique).not.toHaveBeenCalled();expect(mocked.enqueue).not.toHaveBeenCalled();
 });
 it('serves a fresh cached snapshot without starting another sync',async()=>{
  mocked.db.memberProfile.findFirst.mockResolvedValue({id:'a',github:'owner'});
  mocked.db.memberGitHubSummary.findUnique.mockResolvedValue({github:'owner',languages:{Python:100},languageFetchedAt:new Date(),languageNextAttemptAt:new Date(Date.now()+21600000),languageError:null});
  const response=await request(app).get('/members/a/github/languages');
  expect(response.status).toBe(200);expect(response.body).toMatchObject({status:'ready',languages:{Python:100},stale:false});expect(mocked.enqueue).not.toHaveBeenCalled();
 });
 it('hides another linked account\'s cached languages',async()=>{
  mocked.db.memberProfile.findFirst.mockResolvedValue({id:'a',github:'new-owner'});
  mocked.db.memberGitHubSummary.findUnique.mockResolvedValue({github:'old-owner',languages:{Secret:999}});
  const response=await request(app).get('/members/a/github/languages');
  expect(response.body.languages).toEqual({});expect(mocked.enqueue).toHaveBeenCalledWith('a');
 });
});
