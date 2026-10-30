import { describe,it,expect } from 'vitest';
import { createProfileSchema,editProfileSchema,linkedinUrl } from '../src/lib/validation.js';
import { memberQuery,memberWhere } from '../src/lib/member-query.js';
import { repositoryQuery,nominationSchema } from '../src/lib/repository-query.js';
import { imageType,storeBanner } from '../src/lib/storage.js';

describe('LinkedIn profile URLs',()=>{
 it('normalizes profile links and strips tracking',()=>expect(linkedinUrl.parse(' https://linkedin.com/in/student/?trk=test ')).toBe('https://www.linkedin.com/in/student'));
 it.each(['javascript:alert(1)','http://linkedin.com/in/a','https://linkedin.com.evil.org/in/a','https://evil@linkedin.com/in/a','https://linkedin.com/company/a','https://linkedin.com/in/a/extra','https://linkedin.com:444/in/a'])('rejects %s',url=>expect(linkedinUrl.safeParse(url).success).toBe(false));
 it('allows clearing',()=>{expect(linkedinUrl.parse(' ')).toBeNull();expect(linkedinUrl.parse(null)).toBeNull()});
});
describe('composable public search',()=>{
 it('combines year, case-insensitive technology, text, and multiple platforms',()=>{
  const q=memberQuery.parse({year:'2029',tech:'react',search:'TYPESCRIPT',platform:'github,linkedin',page:'2',limit:'30',sort:'batch'});
  const where=memberWhere(q,['React','TypeScript','Python']);
  expect(where.isPublic).toBe(true);expect(where.year).toBe(2029);
  expect(where.AND).toEqual(expect.arrayContaining([{techStack:{hasSome:['React']}},{github:{not:null},NOT:{github:''}},{linkedin:{not:null},NOT:{linkedin:''}}]));
  expect(JSON.stringify(where)).toContain('TypeScript');expect(JSON.stringify(where)).not.toContain('legacyEmail');
 });
 it.each([{limit:'201'},{page:'0'},{year:'oops'},{platform:'email'},{sort:'secret'},{search:['a','b']}])('rejects malformed query %j',q=>expect(memberQuery.safeParse(q).success).toBe(false));
 it('restricts repo filters and nominations',()=>{
  expect(repositoryQuery.safeParse({forks:'false',sort:'stars'}).success).toBe(true);
  expect(repositoryQuery.safeParse({forks:'yes'}).success).toBe(false);
  expect(nominationSchema.safeParse({fullName:'../../secret',reason:'bad request'}).success).toBe(false);
  expect(nominationSchema.parse({fullName:'Owner/Repo',reason:'I maintain this repository'}).fullName).toBe('owner/repo');
 });
});
describe('image safety and profile clearing',()=>{
 it('checks image signatures',()=>{
  expect(imageType(Buffer.from('GIF89a'))?.mime).toBe('image/gif');
  expect(imageType(Buffer.from([137,80,78,71,13,10,26,10]))?.mime).toBe('image/png');
  expect(imageType(Buffer.from('<svg onload="alert(1)"/>'))).toBeNull();
 });
 it('rejects MIME spoofing before storage',async()=>expect(storeBanner('owner',Buffer.from('GIF89a'),'image/png')).rejects.toThrow('Invalid image'));
 it('rejects oversized image buffers',async()=>expect(storeBanner('owner',Buffer.concat([Buffer.from('GIF89a'),Buffer.alloc(5*1024*1024)]),'image/gif')).rejects.toThrow());
 it('allows empty optional fields but not direct banner/ownership writes',()=>{
  expect(editProfileSchema.safeParse({github:null,linkedin:'',portfolio:'',techStack:[]}).success).toBe(true);
  expect(editProfileSchema.safeParse({banner:'https://elsewhere/image.png'}).success).toBe(false);
  expect(createProfileSchema.safeParse({name:'A',year:2029,techStack:[],ownerId:'other'}).success).toBe(false);
 });
});
