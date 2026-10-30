import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
const db=vi.hoisted(()=>({
 memberProfile:{findUnique:vi.fn(),findFirst:vi.fn(),findMany:vi.fn(),count:vi.fn()},
 memberGitHubSummary:{upsert:vi.fn(),updateMany:vi.fn(),update:vi.fn()},
 gitHubRepository:{upsert:vi.fn(),updateMany:vi.fn()},
 memberRepository:{deleteMany:vi.fn(),createMany:vi.fn()},$transaction:vi.fn()
}));
vi.mock('../src/lib/db.js',()=>({prisma:db}));
import { syncMember,refreshCommunityRepositories } from '../src/lib/github.js';
const member={id:'member-a',github:'owner',isPublic:true};
const repo={id:123,full_name:'owner/project',owner:{login:'owner'},private:false,description:null,language:'TypeScript',stargazers_count:3,forks_count:0,pushed_at:new Date().toISOString(),fork:false,archived:false,size:100};
beforeEach(()=>{
 vi.clearAllMocks();
 db.memberProfile.findUnique.mockResolvedValue(member);db.memberProfile.findFirst.mockResolvedValue(member);
 db.memberGitHubSummary.upsert.mockResolvedValue({github:'owner',fetchedAt:null,languages:{},activity:[]});
 db.memberGitHubSummary.updateMany.mockResolvedValue({count:1});
 db.gitHubRepository.upsert.mockResolvedValue({id:'repo-a'});
 db.$transaction.mockImplementation(fn=>fn(db));
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
describe('automatic repository discovery',()=>{
 it('publishes metadata even when optional language calls fail',async()=>{
  vi.stubEnv('GITHUB_TOKEN','test-placeholder');
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([repo]))).mockImplementation(async()=>{
   expect(db.memberRepository.createMany).toHaveBeenCalled();
   expect(db.memberGitHubSummary.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'refreshing'})}));
   return new Response('',{status:503});
  });vi.stubGlobal('fetch',fetcher);
  await syncMember('member-a');
  expect(db.memberGitHubSummary.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({status:'ready',error:expect.stringContaining('Repositories updated')})}));
 });
 it('uses one request for metadata without consuming unauthenticated language/event quota',async()=>{
  vi.stubEnv('GITHUB_TOKEN','');const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([repo])));vi.stubGlobal('fetch',fetcher);
  await syncMember('member-a');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(db.memberRepository.createMany).toHaveBeenCalledWith({data:[{memberId:'member-a',repositoryId:'repo-a',source:'owner',reviewStatus:'approved'}],skipDuplicates:true});
  const snapshot=db.memberGitHubSummary.update.mock.calls.find(([args])=>args.data.status==='refreshing')![0];
  expect(snapshot.data.nextAttemptAt.getTime()-Date.now()).toBeGreaterThan(3590000);
  expect(snapshot.data.nextAttemptAt.getTime()-Date.now()).toBeLessThanOrEqual(3600000);
 });
 it('honors a database cooldown instead of starting another provider request',async()=>{
  db.memberGitHubSummary.updateMany.mockResolvedValue({count:0});const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await syncMember('member-a');expect(fetcher).not.toHaveBeenCalled();
 });
 it('refreshes live metadata on a minute cadence without fetching optional activity',async()=>{
  vi.stubEnv('GITHUB_TOKEN','test-placeholder');
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([repo])));vi.stubGlobal('fetch',fetcher);
  await syncMember('member-a',true);
  const claim=db.memberGitHubSummary.updateMany.mock.calls[0][0];
  const cutoff=claim.where.OR[1].fetchedAt.lte.getTime();
  expect(Date.now()-cutoff).toBeGreaterThanOrEqual(60000);expect(Date.now()-cutoff).toBeLessThan(61000);
  expect(claim.where.OR[1].status).toBe('ready');expect(claim.data.status).toBe('refreshing');
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('does not bypass a database claim or failure backoff in live mode',async()=>{
  db.memberGitHubSummary.updateMany.mockResolvedValue({count:0});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await syncMember('member-a',true);expect(fetcher).not.toHaveBeenCalled();
  const claim=db.memberGitHubSummary.updateMany.mock.calls[0][0];
  expect(claim.where.OR).toEqual([{nextAttemptAt:{lte:expect.any(Date)}},{status:'ready',fetchedAt:{lte:expect.any(Date)}}]);
 });
 it('discovers new accounts even when no repositories are currently displayed',async()=>{
  db.memberProfile.findMany.mockResolvedValue([{id:'new-member'}]);
  db.memberProfile.findUnique.mockResolvedValue(null);
  db.memberProfile.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
  expect(await refreshCommunityRepositories({year:2029})).toEqual({pending:1,deferred:0,intervalSeconds:60});
  expect(db.memberProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({isPublic:true,year:2029,github:{not:null}}),take:100}));
  expect(db.memberProfile.findUnique).toHaveBeenCalledWith({where:{id:'new-member'}});
 });
});
