import { z } from 'zod';
import type { Prisma } from '@prisma/client';
export const platforms = ['github','leetcode','codeforces','linkedin','portfolio'] as const;
export const memberQuery = z.object({
 page:z.coerce.number().int().min(1).max(100000).default(1),
 limit:z.coerce.number().int().min(1).max(200).default(100),
 year:z.coerce.number().int().min(2000).max(2200).optional(),
 search:z.string().trim().max(100).optional(), tech:z.string().trim().max(60).optional(),
 platform:z.string().max(100).optional().transform((s,ctx)=>{
  const values = s ? s.split(',') : [];
  if(values.some(v=>!platforms.includes(v as typeof platforms[number]))) ctx.addIssue({code:'custom',message:'Unknown platform'});
  return [...new Set(values)] as (typeof platforms[number])[];
 }),
 sort:z.enum(['name','batch']).default('name')
});
export function memberWhere(q:z.infer<typeof memberQuery>, tags:string[]):Prisma.MemberProfileWhereInput {
 const conditions:Prisma.MemberProfileWhereInput[] = q.platform.map(p=>({[p]:{not:null}, NOT:{[p]:''}}));
 if(q.tech) conditions.push({techStack:{hasSome:tags.filter(t=>t.toLowerCase()===q.tech!.toLowerCase())}});
 if(q.search) conditions.push({OR:[{name:{contains:q.search,mode:'insensitive'}},{github:{contains:q.search,mode:'insensitive'}},{leetcode:{contains:q.search,mode:'insensitive'}},{codeforces:{contains:q.search,mode:'insensitive'}},{techStack:{hasSome:tags.filter(t=>t.toLowerCase().includes(q.search!.toLowerCase()))}}]});
 return {isPublic:true,...(q.year?{year:q.year}:{}), AND:conditions};
}
