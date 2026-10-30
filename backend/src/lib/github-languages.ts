import { z } from 'zod';
import { prisma } from './db.js';
import { githubRequest, githubRepositorySchema, GitHubError } from './github.js';

export const LANGUAGE_TTL=6*60*60*1000;
const RETRY=30*60*1000;

export async function syncMemberLanguages(memberId:string){
 const member=await prisma.memberProfile.findUnique({where:{id:memberId}});
 if(!member?.github||!member.isPublic)return;
 const snapshot=await prisma.memberGitHubSummary.upsert({where:{memberId},create:{memberId,github:member.github},update:{}});
 if(snapshot.github!==member.github)return;
 const claimed=await prisma.memberGitHubSummary.updateMany({where:{memberId,github:member.github,languageNextAttemptAt:{lte:new Date()}},data:{languageNextAttemptAt:new Date(Date.now()+RETRY),languageError:null}});
 if(!claimed.count)return;
 try{
  // Language usage is independent of the two recent repository highlights.
  // Sample up to 10 recently pushed original public repositories, under 100 MB.
  const repos=z.array(githubRepositorySchema).parse(await githubRequest(`/users/${encodeURIComponent(member.github)}/repos?type=owner&sort=pushed&per_page=100`));
  const sample=repos.filter(repo=>!repo.fork&&!repo.archived&&repo.size<=100000&&repo.owner.login.toLowerCase()===member.github!.toLowerCase()&&repo.full_name.split('/')[1].toLowerCase()!==repo.owner.login.toLowerCase()).slice(0,10);
  const languages:Record<string,number>={};
  for(const repo of sample){
   const bytes=z.record(z.number().int().nonnegative().safe()).parse(await githubRequest(`/repos/${repo.full_name}/languages`));
   for(const [language,count] of Object.entries(bytes))languages[language]=(languages[language]||0)+count;
   await prisma.gitHubRepository.updateMany({where:{githubId:String(repo.id),isPrivate:false},data:{languageBytes:bytes}});
  }
  await prisma.$transaction(async tx=>{
   const current=await tx.memberProfile.findFirst({where:{id:memberId,github:member.github,isPublic:true}});
   if(!current)return;
   await tx.memberGitHubSummary.updateMany({where:{memberId,github:member.github!},data:{languages,languageFetchedAt:new Date(),languageNextAttemptAt:new Date(Date.now()+LANGUAGE_TTL),languageError:null}});
  });
 }catch(error){
  const status=error instanceof GitHubError?error.status:0;
  await prisma.memberGitHubSummary.updateMany({where:{memberId,github:member.github},data:{languageError:status===403||status===429?'GitHub rate limit; language refresh deferred.':status===404?'GitHub account unavailable.':'GitHub languages are temporarily unavailable.',languageNextAttemptAt:new Date(error instanceof GitHubError?Math.max(error.retryAt,Date.now()+RETRY):Date.now()+RETRY)}});
 }
}

const queued=new Set<string>();
const queue:string[]=[];
let running=0;
export function enqueueMemberLanguages(id:string){
 if(queued.has(id)||queue.length>=100)return;
 queued.add(id);queue.push(id);pump();
}
function pump(){
 while(running<2&&queue.length){
  const id=queue.shift()!;running++;
  void syncMemberLanguages(id).catch(()=>console.error({event:'github_language_sync_failed',memberId:id})).finally(()=>{running--;queued.delete(id);pump()});
 }
}
