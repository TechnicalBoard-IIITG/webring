import { beforeEach,describe,it,expect,vi } from 'vitest';
import { topGitHubLanguages } from '../../lib/github-languages';
const mocked=vi.hoisted(()=>({request:vi.fn(),db:{memberProfile:{findUnique:vi.fn(),findFirst:vi.fn()},memberGitHubSummary:{upsert:vi.fn(),updateMany:vi.fn()},gitHubRepository:{updateMany:vi.fn()},$transaction:vi.fn()}}));
vi.mock('../src/lib/db.js',()=>({prisma:mocked.db}));
vi.mock('../src/lib/github.js',async importOriginal=>({...await importOriginal<typeof import('../src/lib/github.js')>(),githubRequest:mocked.request}));
import { syncMemberLanguages } from '../src/lib/github-languages.js';
import { GitHubError } from '../src/lib/github.js';
const member={id:'a',github:'owner',isPublic:true};
const repo={id:1,full_name:'owner/older-work',owner:{login:'owner'},private:false,description:null,language:'TypeScript',stargazers_count:0,forks_count:0,pushed_at:'2024-01-01T00:00:00Z',fork:false,archived:false,size:100};
beforeEach(()=>{
 vi.clearAllMocks();mocked.db.memberProfile.findUnique.mockResolvedValue(member);mocked.db.memberProfile.findFirst.mockResolvedValue(member);
 mocked.db.memberGitHubSummary.upsert.mockResolvedValue({github:'owner',languages:{Rust:12}});
 mocked.db.memberGitHubSummary.updateMany.mockResolvedValue({count:1});mocked.db.$transaction.mockImplementation(fn=>fn(mocked.db));
});
describe('top three language code-byte shares',()=>{
 it('ranks by bytes and keeps percentages relative to all included languages',()=>{
  expect(topGitHubLanguages({TypeScript:60,Python:20,Rust:15,Go:5})).toEqual([{name:'TypeScript',bytes:60,percentage:60},{name:'Python',bytes:20,percentage:20},{name:'Rust',bytes:15,percentage:15}]);
 });
 it('excludes HTML/CSS before ranking and calculating percentages, regardless of case',()=>{
  expect(topGitHubLanguages({HTML:900,css:100,TypeScript:60,Python:20,Rust:15,Go:5})).toEqual([{name:'TypeScript',bytes:60,percentage:60},{name:'Python',bytes:20,percentage:20},{name:'Rust',bytes:15,percentage:15}]);
  expect(topGitHubLanguages({' html ':900,CSS:100})).toEqual([]);
 });
 it('ignores invalid data, uses stable ties, and allows fewer than three',()=>{
  expect(topGitHubLanguages({Zero:0,Negative:-1,NaN:NaN,Infinite:Infinity,Fraction:1.5,Text:'100'})).toEqual([]);
  expect(topGitHubLanguages({Rust:20,Go:20}).map(language=>language.name)).toEqual(['Go','Rust']);
 });
});
describe('independent GitHub language cache',()=>{
 it('includes older original public work and excludes forks, README, archives and large repos',async()=>{
  mocked.request.mockResolvedValueOnce([repo,{...repo,id:2,full_name:'owner/fork',fork:true},{...repo,id:3,full_name:'owner/OWNER'},{...repo,id:4,full_name:'owner/archive',archived:true},{...repo,id:5,full_name:'owner/large',size:100001}]).mockResolvedValueOnce({TypeScript:300,Python:100});
  await syncMemberLanguages('a');
  expect(mocked.request).toHaveBeenCalledTimes(2);expect(mocked.request).toHaveBeenLastCalledWith('/repos/owner/older-work/languages');
  expect(mocked.db.memberGitHubSummary.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({where:{memberId:'a',github:'owner'},data:expect.objectContaining({languages:{TypeScript:300,Python:100},languageFetchedAt:expect.any(Date),languageError:null})}));
 });
 it('honors a durable cooldown',async()=>{
  mocked.db.memberGitHubSummary.updateMany.mockResolvedValue({count:0});await syncMemberLanguages('a');expect(mocked.request).not.toHaveBeenCalled();
 });
 it('retains cached bytes and records backoff after a rate limit',async()=>{
  const retryAt=Date.now()+3600000;mocked.request.mockRejectedValue(new GitHubError(429,retryAt));
  await syncMemberLanguages('a');
  const final=mocked.db.memberGitHubSummary.updateMany.mock.calls.at(-1)![0];
  expect(final.data).not.toHaveProperty('languages');expect(final.data.languageError).toContain('rate limit');expect(final.data.languageNextAttemptAt.getTime()).toBeGreaterThanOrEqual(retryAt);
 });
 it('never stores results after a linked account changed during refresh',async()=>{
  mocked.db.memberProfile.findFirst.mockResolvedValue(null);mocked.request.mockResolvedValueOnce([repo]).mockResolvedValueOnce({Python:100});
  await syncMemberLanguages('a');expect(mocked.db.memberGitHubSummary.updateMany).toHaveBeenCalledTimes(1);
 });
 it('does not request data for private profiles',async()=>{
  mocked.db.memberProfile.findUnique.mockResolvedValue({...member,isPublic:false});await syncMemberLanguages('a');expect(mocked.request).not.toHaveBeenCalled();
 });
});
