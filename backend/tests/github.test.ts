import { describe,it,expect,vi,afterEach } from 'vitest';
vi.mock('../src/lib/db.js',()=>({prisma:{}}));
import { githubRequest,repositoryData,GitHubError } from '../src/lib/github.js';
afterEach(()=>vi.unstubAllGlobals());
describe('GitHub external data',()=>{
 const repo={id:123,full_name:'owner/repo',owner:{login:'owner'},private:false,description:null,language:'TypeScript',stargazers_count:8,forks_count:2,pushed_at:null,fork:false,archived:false,size:100};
 it('preserves immutable ID and true numeric metrics',()=>{
  expect(repositoryData(repo)).toMatchObject({githubId:'123',stars:8,forks:2,htmlUrl:'https://github.com/owner/repo'});
 });
 it('rejects private repos and missing/fake metrics',()=>{
  expect(()=>repositoryData({...repo,private:true})).toThrow();
  expect(()=>repositoryData({...repo,stargazers_count:undefined})).toThrow();
  expect(()=>repositoryData({...repo,stargazers_count:-1})).toThrow();
 });
 it('treats deleted users as failures',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:404})));
  await expect(githubRequest('/users/deleted')).rejects.toBeInstanceOf(GitHubError);
 });
 it('backs off after rate limiting instead of repeatedly requesting GitHub',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('',{status:429,headers:{'retry-after':'3600'}}));vi.stubGlobal('fetch',fetcher);
  await expect(githubRequest('/users/a')).rejects.toMatchObject({status:429});
  await expect(githubRequest('/users/b')).rejects.toMatchObject({status:429});
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
