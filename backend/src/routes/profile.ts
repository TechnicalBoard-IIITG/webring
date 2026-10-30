import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { createProfileSchema,editProfileSchema,normalizeOptional } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
export const profileRouter=Router();
profileRouter.use(requireAuth);
profileRouter.get('/me',async(req,res,next)=>{try{
 const profile=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
 if(!profile){res.status(404).json({error:'No profile linked to your account'});return;}
 res.json(profile);
 }catch(err){next(err);}});
profileRouter.post('/',async(req,res,next)=>{try{
 const data=normalizeOptional(createProfileSchema.parse(req.body));
 const user=await prisma.user.findUnique({where:{id:req.session.userId!},include:{profile:true}});
 if(!user){res.status(401).json({error:'Sign in again'});return;}
 if(user.profile){res.status(409).json({error:'Profile already exists'});return;}
 const legacyMatches=await prisma.memberProfile.count({where:{legacyEmail:{equals:user.email,mode:'insensitive'}}});
 if(legacyMatches){res.status(409).json({error:'An existing directory profile matches your verified email. Refresh or ask an administrator to resolve the claim.'});return;}
 const profile=await prisma.memberProfile.create({data:{...data,ownerId:user.id,legacyEmail:user.email}});
 res.status(201).json(profile);
 }catch(err){next(err);}});
profileRouter.patch('/me',async(req,res,next)=>{try{
 const data=normalizeOptional(editProfileSchema.parse(req.body));
 const profile=await prisma.$transaction(async tx=>{
  const before=await tx.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
  if(!before)return null;
  const after=await tx.memberProfile.update({where:{id:before.id,ownerId:req.session.userId!},data});
  if(before.github!==after.github){
   await tx.memberRepository.deleteMany({where:{memberId:before.id,source:'owner'}});
   await tx.memberGitHubSummary.deleteMany({where:{memberId:before.id}});
  }
  await tx.profileRevision.create({data:{profileId:after.id,actorId:req.session.userId!,before:JSON.parse(JSON.stringify(before)),after:JSON.parse(JSON.stringify(after))}});
  return after;
 });
 if(!profile){res.status(404).json({error:'Profile not found'});return;}
 res.json(profile);
 }catch(err){next(err);}});
profileRouter.get('/revisions',async(req,res,next)=>{try{
 const profile=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
 if(!profile){res.status(404).json({error:'Profile not found'});return;}
 res.json(await prisma.profileRevision.findMany({where:{profileId:profile.id},orderBy:{createdAt:'desc'},take:25}));
 }catch(err){next(err);}});
