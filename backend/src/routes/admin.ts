import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { editProfileSchema,normalizeOptional } from '../lib/validation.js';
export const adminRouter=Router();adminRouter.use(requireAdmin);
adminRouter.get('/members',async(_req,res,next)=>{try{
 res.json(await prisma.memberProfile.findMany({take:100,orderBy:{createdAt:'desc'}}));
 }catch(err){next(err);}});
adminRouter.patch('/members/:id',async(req,res,next)=>{try{
 const data=normalizeOptional(editProfileSchema.parse(req.body));
 const result=await prisma.$transaction(async tx=>{
  const before=await tx.memberProfile.findUnique({where:{id:req.params.id}});
  if(!before)return null;
  const after=await tx.memberProfile.update({where:{id:before.id},data});
  if(before.github!==after.github){
   await tx.memberRepository.deleteMany({where:{memberId:before.id,source:'owner'}});
   await tx.memberGitHubSummary.deleteMany({where:{memberId:before.id}});
  }
  await tx.profileRevision.create({data:{profileId:after.id,actorId:req.session.userId!,before:JSON.parse(JSON.stringify(before)),after:JSON.parse(JSON.stringify(after))}});
  return after;
 });
 if(!result){res.status(404).json({error:'Not found'});return;}res.json(result);
 }catch(err){next(err);}});
// Deliberately no arbitrary claim-approval endpoint until a verified, audited claim workflow exists.
