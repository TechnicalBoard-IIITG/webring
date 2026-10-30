import { describe,it,expect } from 'vitest';
import { recentPopularRepositories } from '../src/lib/repository-policy.js';
import { resultRange } from '../../lib/pagination';
const now=new Date('2026-10-30T12:00:00Z');
const repo=(name:string,stars:number,days:number)=>({fullName:`student/${name}`,ownerLogin:'student',stars,pushedAt:new Date(now.getTime()-days*86400000),isFork:false,isArchived:false,isPrivate:false});
describe('recent popular repository policy',()=>{
 it('chooses only two by stars, then recent push',()=>{
  const selected=recentPopularRepositories([repo('older',8,10),repo('less-popular',3,0),repo('newer',8,2),repo('third',8,20)],now);
  expect(selected.map(r=>r.fullName)).toEqual(['student/newer','student/older']);
 });
 it('excludes stale, future, missing dates, README, private, forked and archived repos',()=>{
  const selected=recentPopularRepositories([repo('old',999,31),repo('STUDENT',999,1),repo('future',999,-1),{...repo('undated',999,0),pushedAt:null},{...repo('fork',999,0),isFork:true},{...repo('archive',999,0),isArchived:true},{...repo('secret',999,0),isPrivate:true},repo('eligible',0,30)],now);
  expect(selected.map(r=>r.fullName)).toEqual(['student/eligible']);
 });
 it('does not fill two slots with ineligible or invented data',()=>{
  expect(recentPopularRepositories([],now)).toEqual([]);
  expect(recentPopularRepositories([repo('old',20,31)],now)).toEqual([]);
 });
});
describe('directory result ranges',()=>{
 it('distinguishes current-page rows from the total',()=>{
  expect(resultRange(1,60,71)).toBe('Showing 1–60 of 71');
  expect(resultRange(2,60,71)).toBe('Showing 61–71 of 71');
  expect(resultRange(1,60,0)).toBe('0 results');
 });
});
