import { describe,it,expect,vi,afterEach } from 'vitest';
vi.mock('../../lib/http',()=>({fetchJson:vi.fn()}));
vi.mock('../../lib/cache',()=>({cached:(_key:string,_ttl:number,load:()=>unknown)=>load()}));
import { fetchJson } from '../../lib/http';
import { getLeetCodeProfile,parseLeetCodeCalendar } from '../../lib/leetcode';
afterEach(()=>vi.clearAllMocks());
describe('LeetCode activity coverage',()=>{
 it('merges both years without double-counting overlapping dates',async()=>{
  const previous=String(Date.UTC(2025,11,31)/1000),current=String(Date.UTC(2026,0,1)/1000);
  vi.mocked(fetchJson).mockResolvedValue({data:{matchedUser:{userCalendar:{submissionCalendar:JSON.stringify({[previous]:2,[current]:4})},previousCalendar:{submissionCalendar:JSON.stringify({[previous]:2})}}}});
  const result=await getLeetCodeProfile('student');
  expect(result.ok&&result.data.calendar).toEqual([{date:'2025-12-31',count:2},{date:'2026-01-01',count:4}]);
  const options=vi.mocked(fetchJson).mock.calls[0][1]!;
  expect(JSON.parse(options.body as string).variables.previousYear).toBe(new Date().getUTCFullYear()-1);
 });
 it('reports missing/malformed calendars as unavailable rather than empty activity',async()=>{
  vi.mocked(fetchJson).mockResolvedValue({data:{matchedUser:{userCalendar:{}}}});
  expect(await getLeetCodeProfile('student')).toEqual({ok:false,reason:'unavailable'});
  vi.mocked(fetchJson).mockResolvedValue({data:{matchedUser:{userCalendar:{submissionCalendar:'broken json'}}}});
  expect(await getLeetCodeProfile('student')).toEqual({ok:false,reason:'unavailable'});
 });
 it('preserves real zero activity and rejects invalid counts',()=>{
  expect(parseLeetCodeCalendar('{}')).toEqual([]);
  expect(()=>parseLeetCodeCalendar('{"1767225600":-1}')).toThrow();
  expect(()=>parseLeetCodeCalendar('[]')).toThrow();
 });
});
