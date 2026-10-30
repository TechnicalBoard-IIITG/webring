import { beforeEach,describe,expect,it,vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const mocks=vi.hoisted(()=>({
 refresh:vi.fn(),ids:vi.fn(),
 db:{gitHubRepository:{findMany:vi.fn(),count:vi.fn(),aggregate:vi.fn()}},
}));
vi.mock('../src/lib/db.js',()=>({prisma:mocks.db}));
vi.mock('../src/lib/github.js',()=>({refreshCommunityRepositories:mocks.refresh,githubRequest:vi.fn(),repositoryData:vi.fn()}));
vi.mock('../src/lib/repository-selection.js',()=>({recentPopularRepositoryIds:mocks.ids}));
import { repositoriesRouter } from '../src/routes/repositories.js';
const app=express();app.use('/repos',repositoriesRouter);
beforeEach(()=>{
 vi.clearAllMocks();mocks.ids.mockResolvedValue(['repo']);
 mocks.refresh.mockResolvedValue({pending:2,deferred:1,intervalSeconds:60});
 mocks.db.gitHubRepository.findMany.mockResolvedValue([]);mocks.db.gitHubRepository.count.mockResolvedValue(0);
 mocks.db.gitHubRepository.aggregate.mockResolvedValue({_sum:{stars:0,forks:0},_min:{fetchedAt:null},_max:{fetchedAt:null}});
});
describe('live community endpoint',()=>{
 it('starts scoped discovery and returns current results with refresh progress',async()=>{
  const response=await request(app).get('/repos?live=true&year=2029&member=student');
  expect(response.status).toBe(200);expect(response.headers['cache-control']).toBe('no-store');
  expect(mocks.refresh).toHaveBeenCalledWith({year:2029,member:'student'});
  expect(response.body.refresh).toEqual({pending:2,deferred:1,intervalSeconds:60});
  expect(response.body.items).toEqual([]);
 });
 it('keeps speculative prefetches read-only',async()=>{
  expect((await request(app).get('/repos')).status).toBe(200);
  expect(mocks.refresh).not.toHaveBeenCalled();
 });
 it('rejects invalid live flags before scheduling work',async()=>{
  const response=await request(app).get('/repos?live=maybe');
  expect(response.status).not.toBe(200);expect(mocks.refresh).not.toHaveBeenCalled();
 });
});
