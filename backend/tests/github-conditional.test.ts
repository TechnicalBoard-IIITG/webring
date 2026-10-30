import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('../src/lib/db.js',()=>({prisma:{}}));
let github:typeof import('../src/lib/github.js');
beforeEach(async()=>{vi.resetModules();github=await import('../src/lib/github.js');});
afterEach(()=>vi.unstubAllGlobals());
describe('live GitHub conditional requests',()=>{
 it('validates unchanged data with GitHub before reusing a response',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{id:1}]),{headers:{etag:'"revision-one"'}})).mockResolvedValueOnce(new Response(null,{status:304}));
  vi.stubGlobal('fetch',fetcher);
  await github.githubRequest('/users/student/repos',{conditional:true});
  expect(await github.githubRequest('/users/student/repos',{conditional:true})).toEqual([{id:1}]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][1].headers['If-None-Match']).toBe('"revision-one"');
 });
 it('uses updated data when GitHub changes its response',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('[1]',{headers:{etag:'"one"'}})).mockResolvedValueOnce(new Response('[2]',{headers:{etag:'"two"'}})));
  await github.githubRequest('/repos/student/project',{conditional:true});
  expect(await github.githubRequest('/repos/student/project',{conditional:true})).toEqual([2]);
 });
 it('does not disguise provider failures as successful live responses',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('[1]',{headers:{etag:'"one"'}})).mockResolvedValueOnce(new Response(null,{status:503})));
  await github.githubRequest('/users/student/repos',{conditional:true});
  await expect(github.githubRequest('/users/student/repos',{conditional:true})).rejects.toMatchObject({status:503});
 });
});
