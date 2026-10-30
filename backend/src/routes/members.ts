import { Router } from 'express';
import { memberQuery, memberWhere } from '../lib/member-query.js';
import { prisma } from '../lib/db.js';
import { publicMember } from '../lib/public.js';
export const membersRouter = Router();
membersRouter.get(['/', '/linkedin'],async(req,res,next)=>{try{
 const q=memberQuery.parse(req.query);
 if(req.path==='/linkedin'&&!q.platform.includes('linkedin'))q.platform.push('linkedin');
 const [years, technologies] = await Promise.all([
  prisma.memberProfile.findMany({where:{isPublic:true},select:{year:true},distinct:['year'],orderBy:{year:'desc'}}),
  prisma.$queryRaw<{tech:string}[]>`SELECT DISTINCT unnest("techStack") AS tech FROM "MemberProfile" WHERE "isPublic" = true`
 ]);
 const tags=technologies.map(t=>t.tech).sort();
 const where=memberWhere(q,tags);
 const [rows,total]=await Promise.all([
  prisma.memberProfile.findMany({where,orderBy:q.sort==='batch'?[{year:'desc'},{name:'asc'},{id:'asc'}]:[{name:'asc'},{id:'asc'}],skip:(q.page-1)*q.limit,take:q.limit}),
  prisma.memberProfile.count({where})
 ]);
 res.json({items:rows.map(publicMember),total,page:q.page,limit:q.limit,years:years.map(y=>y.year),technologies:tags});
 }catch(err){next(err);}});
membersRouter.get('/:id',async(req,res,next)=>{try{
 const row=await prisma.memberProfile.findFirst({where:{id:req.params.id,isPublic:true}});
 if(!row){res.status(404).json({error:'Profile not found'});return;}
 res.json(publicMember(row));
 }catch(err){next(err);}});
