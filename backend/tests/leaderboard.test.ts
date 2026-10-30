import { beforeEach,describe,it,expect,vi } from 'vitest';
import type { Member } from '../../types/member';
const providers=vi.hoisted(()=>({github:vi.fn(),leetcode:vi.fn(),codeforces:vi.fn()}));
vi.mock('../../lib/github',()=>({getGithubActivity:providers.github}));
vi.mock('../../lib/leetcode',()=>({getLeetCodeProfile:providers.leetcode}));
vi.mock('../../lib/codeforces',()=>({getCodeforcesProfiles:providers.codeforces}));
import { buildLeaderboard } from '../../lib/leaderboard';
import { recentDateKeys } from '../../lib/activity';
beforeEach(()=>{vi.clearAllMocks();providers.github.mockResolvedValue({ok:false});providers.leetcode.mockResolvedValue({ok:false});providers.codeforces.mockResolvedValue({ok:true,data:new Map()})});
const members:Member[]=[{name:'Beta',year:2028,github:'beta',codeforces:'beta'},{name:'Alpha',year:2029,github:'alpha',codeforces:'alpha'},{name:'Unrated',year:2029,github:'',codeforces:'unrated'}];
describe('original leaderboard ranking semantics',()=>{
 it('loads a selected platform independently of the others',async()=>{
  const result=await buildLeaderboard(members,'codeforces');
  expect(result.boards.map(b=>b.id)).toEqual(['codeforces']);
  expect(providers.github).not.toHaveBeenCalled();expect(providers.leetcode).not.toHaveBeenCalled();
 });
 it('ranks real numeric ratings with competition ties and omits missing ratings',async()=>{
  providers.codeforces.mockResolvedValue({ok:true,data:new Map([['alpha',{handle:'alpha',rating:1600,rank:'expert'}],['beta',{handle:'beta',rating:1600,rank:'expert'}],['unrated',{handle:'unrated',rating:null,rank:null}]])});
  const result=await buildLeaderboard(members);const cf=result.boards.find(b=>b.id==='codeforces')!;
  expect(cf.entries.map(e=>[e.name,e.count,e.rank])).toEqual([['Alpha',1600,1],['Beta',1600,1]]);
  expect(result.boards[0].eligible).toBe(2);expect(result.boards[0].unavailable).toBe(2);
 });
 it('uses the same recent seven days for GitHub and keeps failures out of rankings',async()=>{
  const today=recentDateKeys(7).at(-1)!;
  providers.github.mockImplementation(async(user:string)=>user==='alpha'?{ok:true,data:[{date:today,count:4},{date:'2000-01-01',count:999}]}:{ok:false});
  const result=await buildLeaderboard(members);const github=result.boards[0];
  expect(github.windowLabel).toBe('last 7 days');expect(github.entries).toHaveLength(1);expect(github.entries[0].count).toBe(4);expect(github.unavailable).toBe(1);
 });
});
