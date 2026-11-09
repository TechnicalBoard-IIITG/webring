import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth,requireAdmin } from '../middleware/auth.js';
import { githubRequest,repositoryData,refreshCommunityRepositories,enqueueMember } from '../lib/github.js';
import { repositoryQuery,nominationSchema } from '../lib/repository-query.js';
import { recentPopularRepositoryIds } from '../lib/repository-selection.js';
export const repositoriesRouter=Router();
const association = {reviewStatus:'approved',member:{isPublic:true}};
const include={members:{where:association,select:{source:true,member:{select:{id:true,name:true,year:true,github:true}}}}};
const showcaseQuery=z.object({
 page:z.coerce.number().int().min(1).max(100000).default(1),
 limit:z.coerce.number().int().min(1).max(100).default(12),
 year:z.coerce.number().int().min(2000).max(2200).optional(),
 member:z.string().trim().max(100).optional(),
 language:z.string().trim().max(100).optional(),
 search:z.string().trim().max(100).optional(),
 sort:z.enum(['stars','forks','pushed']).default('stars')
});
const picksSchema=z.object({repositoryIds:z.array(z.string().trim().min(1).max(100)).max(2)}).strict().refine(({repositoryIds})=>new Set(repositoryIds).size===repositoryIds.length);
function languageByteMap(value:Prisma.JsonValue):Record<string,number>{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,number]=>typeof entry[1]==='number'));
}

repositoriesRouter.get('/showcase',async(req,res,next)=>{try{
 const q=showcaseQuery.parse(req.query);
 const profiles=await prisma.memberProfile.findMany({
  where:{isPublic:true,featuredRepositoryIds:{isEmpty:false},...(q.year?{year:q.year}:{}),...(q.member?{id:q.member}:{})},
  select:{id:true,name:true,year:true,github:true,featuredRepositoryIds:true,repositories:{
   where:{source:'owner',reviewStatus:'approved',repository:{isPrivate:false,isFork:false}},
   select:{repository:{select:{id:true,fullName:true,htmlUrl:true,description:true,language:true,languageBytes:true,stars:true,forks:true,fetchedAt:true,pushedAt:true,isFork:true,isArchived:true}}}
  }}
 });
 const allEntries=profiles.map(profile=>{
  const repositories=profile.repositories.map(link=>link.repository).filter(repo=>profile.featuredRepositoryIds.includes(repo.id)).map(repo=>({...repo,languageBytes:languageByteMap(repo.languageBytes)}));
  return {member:{id:profile.id,name:profile.name,year:profile.year,github:profile.github},repositories};
 }).filter(entry=>entry.repositories.length>0);
 const languages=[...new Set(allEntries.flatMap(entry=>entry.repositories.map(repo=>repo.language).filter((value):value is string=>Boolean(value))))].sort((a,b)=>a.localeCompare(b));
 const search=q.search?.toLowerCase();
 const entries=allEntries.map(entry=>{
  const repositories=entry.repositories.filter(repo=>(!q.language||repo.language?.toLowerCase()===q.language.toLowerCase())&&(!search||repo.fullName.toLowerCase().includes(search)||repo.description?.toLowerCase().includes(search)));
  repositories.sort((a,b)=>b.stars-a.stars||b.forks-a.forks||a.fullName.localeCompare(b.fullName));
  return {member:entry.member,repositories,stars:repositories.reduce((sum,repo)=>sum+repo.stars,0),forks:repositories.reduce((sum,repo)=>sum+repo.forks,0),pushedAt:repositories.reduce<Date|null>((latest,repo)=>repo.pushedAt&&(!latest||repo.pushedAt>latest)?repo.pushedAt:latest,null)};
 }).filter(entry=>entry.repositories.length>0);
 entries.sort((a,b)=>q.sort==='forks'?b.forks-a.forks||a.member.name.localeCompare(b.member.name):q.sort==='pushed'?(b.pushedAt?.getTime()??0)-(a.pushedAt?.getTime()??0)||a.member.name.localeCompare(b.member.name):b.stars-a.stars||a.member.name.localeCompare(b.member.name));
 const total=entries.length;
 res.setHeader('Cache-Control','no-store');
 res.json({items:entries.slice((q.page-1)*q.limit,q.page*q.limit).map(({pushedAt:_pushedAt,...entry})=>entry),total,page:q.page,limit:q.limit,languages});
}catch(error){next(error)}});

repositoriesRouter.get('/showcase/picks',requireAuth,async(req,res,next)=>{try{
 const profile=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!},select:{id:true,name:true,github:true,featuredRepositoryIds:true,githubSummary:{select:{status:true,nextAttemptAt:true}},repositories:{
  where:{source:'owner',reviewStatus:'approved',repository:{isPrivate:false,isFork:false}},
  select:{repository:{select:{id:true,fullName:true,htmlUrl:true,description:true,language:true,languageBytes:true,stars:true,forks:true,fetchedAt:true,pushedAt:true,isFork:true,isArchived:true}}}
 }} });
 if(!profile){res.status(409).json({error:'Create or claim your profile first'});return;}
 if(profile.github&&(!profile.githubSummary||profile.githubSummary.nextAttemptAt<=new Date()))enqueueMember(profile.id);
 const repositories=profile.repositories.map(link=>link.repository).map(repo=>({...repo,languageBytes:languageByteMap(repo.languageBytes)}));
 repositories.sort((a,b)=>b.stars-a.stars||b.forks-a.forks||a.fullName.localeCompare(b.fullName));
 const repositoryIds=new Set(repositories.map(repo=>repo.id));
 res.setHeader('Cache-Control','no-store');
 res.json({selectedRepositoryIds:profile.featuredRepositoryIds.filter(id=>repositoryIds.has(id)),repositories,syncStatus:profile.githubSummary?.status??(profile.github?'pending':'empty')});
}catch(error){next(error)}});

repositoriesRouter.post('/showcase/picks',requireAuth,async(req,res,next)=>{try{
 const {repositoryIds}=picksSchema.parse(req.body);
 const profile=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!},select:{id:true}});
 if(!profile){res.status(409).json({error:'Create or claim your profile first'});return;}
 const valid=repositoryIds.length?await prisma.memberRepository.findMany({where:{memberId:profile.id,source:'owner',reviewStatus:'approved',repositoryId:{in:repositoryIds},repository:{isPrivate:false,isFork:false}},select:{repositoryId:true}}):[];
 if(valid.length!==repositoryIds.length){res.status(400).json({error:'Choose only your own public, non-forked repositories'});return;}
 const updated=await prisma.memberProfile.update({where:{id:profile.id,ownerId:req.session.userId!},data:{featuredRepositoryIds:repositoryIds},select:{featuredRepositoryIds:true}});
 res.setHeader('Cache-Control','no-store');
 res.json({selectedRepositoryIds:updated.featuredRepositoryIds});
}catch(error){next(error)}});

repositoriesRouter.get('/',async(req,res,next)=>{try{
 const q=repositoryQuery.parse(req.query);
 const refresh=q.live==='true'?await refreshCommunityRepositories({member:q.member,year:q.year}):undefined;
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
 res.setHeader('Cache-Control','no-store');
 res.json({items,total,page:q.page,limit:q.limit,stats:{stars:aggregate._sum.stars||0,forks:aggregate._sum.forks||0},fetchedAt:aggregate._max.fetchedAt,oldestFetchedAt:aggregate._min.fetchedAt,languages:languages.map(r=>r.language),refresh});
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
