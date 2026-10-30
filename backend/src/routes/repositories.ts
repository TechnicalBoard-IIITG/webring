import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth,requireAdmin } from '../middleware/auth.js';
import { githubRequest,repositoryData } from '../lib/github.js';
import { repositoryQuery,nominationSchema } from '../lib/repository-query.js';
import { recentPopularRepositoryIds } from '../lib/repository-selection.js';
export const repositoriesRouter=Router();
const association = {reviewStatus:'approved',member:{isPublic:true}};
const include={members:{where:association,select:{source:true,member:{select:{id:true,name:true,year:true,github:true}}}}};

repositoriesRouter.get('/',async(req,res,next)=>{try{
 const q=repositoryQuery.parse(req.query);
 const ids=await recentPopularRepositoryIds({member:q.member,year:q.year,forks:q.forks==='true'});
 const where:Prisma.GitHubRepositoryWhereInput={
  id:{in:ids},
  isPrivate:false,...(q.forks==='false'?{isFork:false}:{}),
  ...(q.language?{language:{equals:q.language,mode:'insensitive'}}:{}),
  ...(q.search?{OR:[{fullName:{contains:q.search,mode:'insensitive'}},{description:{contains:q.search,mode:'insensitive'}}]}:{}),
  members:{some:{reviewStatus:'approved',...(q.member?{memberId:q.member}:{}),member:{isPublic:true,...(q.year?{year:q.year}:{})}}}
 };
 const orderBy:Prisma.GitHubRepositoryOrderByWithRelationInput[]=q.sort==='pushed'?[{pushedAt:{sort:'desc',nulls:'last'}},{id:'asc'}]:[{[q.sort]:'desc'},{id:'asc'}];
 const [items,total,aggregate,languages]=await Promise.all([
  prisma.gitHubRepository.findMany({where,include,orderBy,skip:(q.page-1)*q.limit,take:q.limit}),
  prisma.gitHubRepository.count({where}),
  prisma.gitHubRepository.aggregate({where,_sum:{stars:true,forks:true},_max:{fetchedAt:true},_min:{fetchedAt:true}}),
  prisma.gitHubRepository.findMany({where:{id:{in:ids},language:{not:null}},select:{language:true},distinct:['language'],orderBy:{language:'asc'}})
 ]);
 res.json({items,total,page:q.page,limit:q.limit,stats:{stars:aggregate._sum.stars||0,forks:aggregate._sum.forks||0},fetchedAt:aggregate._max.fetchedAt,oldestFetchedAt:aggregate._min.fetchedAt,languages:languages.map(r=>r.language)});
 }catch(error){next(error)}});

repositoriesRouter.post('/nominations',requireAuth,async(req,res,next)=>{try{
 const data=nominationSchema.parse(req.body);
 const member=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
 if(!member){res.status(409).json({error:'Create or claim your profile first'});return;}
 const nomination=await prisma.repositoryNomination.upsert({where:{memberId_fullName:{memberId:member.id,fullName:data.fullName}},create:{...data,memberId:member.id},update:{}});
 res.status(201).json({id:nomination.id,status:nomination.status});
 }catch(error){next(error)}});
repositoriesRouter.get('/nominations/me',requireAuth,async(req,res,next)=>{try{
 res.json(await prisma.repositoryNomination.findMany({where:{member:{ownerId:req.session.userId!}},orderBy:{createdAt:'desc'},take:50}));
 }catch(error){next(error)}});
repositoriesRouter.get('/nominations/review',requireAdmin,async(req,res,next)=>{try{
 const status=z.enum(['pending','approved','rejected']).default('pending').parse(req.query.status);
 res.json(await prisma.repositoryNomination.findMany({where:{status},include:{member:{select:{id:true,name:true,github:true}}},take:50,orderBy:{createdAt:'asc'}}));
 }catch(error){next(error)}});
repositoriesRouter.patch('/nominations/:id',requireAdmin,async(req,res,next)=>{try{
 const {status}=z.object({status:z.enum(['approved','rejected'])}).strict().parse(req.body);
 const nomination=await prisma.repositoryNomination.findUnique({where:{id:req.params.id}});
 if(!nomination){res.status(404).json({error:'Nomination not found'});return;}
 // Approval is a human association review, not proof of repository ownership.
 const data=status==='approved'?repositoryData(await githubRequest(`/repos/${nomination.fullName}`)):null;
 const updated=await prisma.$transaction(async tx=>{
  if(data){
   const repo=await tx.gitHubRepository.upsert({where:{githubId:data.githubId},create:data,update:data});
   await tx.memberRepository.upsert({where:{memberId_repositoryId:{memberId:nomination.memberId,repositoryId:repo.id}},create:{memberId:nomination.memberId,repositoryId:repo.id,source:'nominated',reviewStatus:'approved'},update:{reviewStatus:'approved'}});
  }else{
   await tx.memberRepository.updateMany({where:{memberId:nomination.memberId,source:'nominated',repository:{fullName:{equals:nomination.fullName,mode:'insensitive'}}},data:{reviewStatus:'rejected'}});
  }
  return tx.repositoryNomination.update({where:{id:nomination.id},data:{status,reviewedBy:req.session.userId!,reviewedAt:new Date()}});
 });
 res.json(updated);
 }catch(error){next(error)}});

repositoriesRouter.get('/:id',async(req,res,next)=>{try{
 const repo=await prisma.gitHubRepository.findFirst({where:{id:req.params.id,isPrivate:false,members:{some:association}},include});
 if(!repo){res.status(404).json({error:'Repository not found'});return;}
 res.json(repo);
 }catch(error){next(error)}});
