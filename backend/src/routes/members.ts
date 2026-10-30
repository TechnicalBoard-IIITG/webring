import { Router } from 'express';
import { memberQuery, memberWhere } from '../lib/member-query.js';
import { publicRead } from '../lib/db.js';
import { cachedPublic } from '../lib/cache.js';
import { publicMember } from '../lib/public.js';
export const membersRouter = Router();
membersRouter.get(['/', '/linkedin'],async(req,res,next)=>{try{
 const q=memberQuery.parse(req.query);
 if(req.path==='/linkedin'&&!q.platform.includes('linkedin'))q.platform.push('linkedin');
 const result = await cachedPublic('members', q, 60, () => publicRead(async prisma => {
 const {years, tags} = await cachedPublic('members', 'filters', 60, async () => {
 const [years, technologies] = await Promise.all([
  prisma.memberProfile.findMany({where:{isPublic:true},select:{year:true},distinct:['year'],orderBy:{year:'desc'}}),
  prisma.$queryRaw<{tech:string}[]>`SELECT DISTINCT unnest("techStack") AS tech FROM "MemberProfile" WHERE "isPublic" = true`
 ]);
 return {years:years.map(y=>y.year),tags:technologies.map(t=>t.tech).sort()};
 });
 const where=memberWhere(q,tags);
 const [rows,total]=await Promise.all([
  prisma.memberProfile.findMany({where,orderBy:q.sort==='batch'?[{year:'desc'},{name:'asc'},{id:'asc'}]:[{name:'asc'},{id:'asc'}],skip:(q.page-1)*q.limit,take:q.limit}),
  prisma.memberProfile.count({where})
 ]);
 return {items:rows.map(publicMember),total,page:q.page,limit:q.limit,years,technologies:tags};
 }));
 res.setHeader('Cache-Control','no-store');
 res.json(result);
 }catch(err){next(err);}});
membersRouter.get('/:id',async(req,res,next)=>{try{
 const row=await cachedPublic('members', {id:req.params.id}, 60, () => publicRead(async prisma => {
  const member = await prisma.memberProfile.findFirst({where:{id:req.params.id,isPublic:true}});
  return member ? publicMember(member) : null;
 }));
 if(!row){res.status(404).json({error:'Profile not found'});return;}
 res.setHeader('Cache-Control','no-store');
 res.json(row);
 }catch(err){next(err);}});
