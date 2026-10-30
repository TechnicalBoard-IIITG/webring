import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { enqueueMember } from '../lib/github.js';
import { recentPopularRepositoryIds } from '../lib/repository-selection.js';
import { enqueueMemberLanguages, LANGUAGE_TTL } from '../lib/github-languages.js';
export const githubRouter=Router();

githubRouter.get('/:id/github/languages',async(req,res,next)=>{try{
 const member=await prisma.memberProfile.findFirst({where:{id:req.params.id,isPublic:true},select:{id:true,github:true}});
 if(!member){res.status(404).json({error:'Profile not found'});return;}
 if(!member.github){res.json({github:null,status:'empty',languages:{},fetchedAt:null,stale:false});return;}
 const summary=await prisma.memberGitHubSummary.findUnique({where:{memberId:member.id}});
 const valid=summary?.github===member.github;
 const fetchedAt=valid?summary.languageFetchedAt:null;
 const error=valid?summary.languageError:null;
 const stale=Boolean(!fetchedAt||Date.now()-fetchedAt.getTime()>LANGUAGE_TTL);
 if(!summary||!valid||summary.languageNextAttemptAt<=new Date())enqueueMemberLanguages(member.id);
 res.setHeader('Cache-Control','no-store');
 res.json({github:member.github,status:error?(fetchedAt?'stale':'unavailable'):fetchedAt?(stale?'stale':'ready'):'pending',languages:valid?summary.languages:{},fetchedAt,stale,error});
 }catch(error){next(error)}});
githubRouter.get('/:id/github',async(req,res,next)=>{try{
 const member=await prisma.memberProfile.findFirst({where:{id:req.params.id,isPublic:true}});
 if(!member){res.status(404).json({error:'Profile not found'});return;}
 if(!member.github){res.json({status:'empty',repositories:[],languages:{},activity:[],fetchedAt:null});return;}
 const summary=await prisma.memberGitHubSummary.findUnique({where:{memberId:member.id}});
 const valid=summary?.github===member.github;
 if(!summary||!valid||summary.nextAttemptAt<=new Date())enqueueMember(member.id);
 const ids=valid?await recentPopularRepositoryIds({member:member.id}):[];
 const repositories=await prisma.gitHubRepository.findMany({where:{id:{in:ids}},orderBy:[{stars:'desc'},{pushedAt:'desc'},{id:'asc'}],take:2});
 res.json({status:valid?summary.status:'pending',error:valid?summary.error:null,fetchedAt:valid?summary.fetchedAt:null,stale:valid&&summary.fetchedAt?Date.now()-summary.fetchedAt.getTime()>6*3600000:false,repositories,languages:valid?summary.languages:{},activity:valid?summary.activity:[],repositoryCount:valid?summary.repositoryCount:0});
 }catch(error){next(error)}});
