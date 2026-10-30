import type { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { z } from 'zod';
export const githubRepositorySchema=z.object({id:z.number().int().positive().safe(),full_name:z.string().regex(/^[\w.-]+\/[\w.-]+$/),owner:z.object({login:z.string()}),private:z.literal(false),description:z.string().nullable(),language:z.string().nullable(),stargazers_count:z.number().int().nonnegative(),forks_count:z.number().int().nonnegative(),pushed_at:z.string().nullable(),fork:z.boolean(),archived:z.boolean(),size:z.number().nonnegative()});
type GitHubRepository=z.infer<typeof githubRepositorySchema>;

const TTL = 6 * 60 * 60 * 1000;
const RETRY = 30 * 60 * 1000;
const MAX_REPOS = 100;
let blockedUntil = 0;
export class GitHubError extends Error {
 constructor(public status:number, public retryAt=Date.now()+RETRY) {super(`GitHub returned ${status}`)}
}
export async function githubRequest<T=unknown>(path:string):Promise<T> {
 if(Date.now()<blockedUntil)throw new GitHubError(429,blockedUntil);
 const response=await fetch(`https://api.github.com${path}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'IIITG-Index',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok){
  if(response.status===403||response.status===429){
   const reset=Number(response.headers.get('x-ratelimit-reset'))*1000;
   const retry=Number(response.headers.get('retry-after'))*1000+Date.now();
   blockedUntil=Math.max(Date.now()+RETRY,Number.isFinite(reset)?reset:0,Number.isFinite(retry)?retry:0);
  }
  throw new GitHubError(response.status,blockedUntil||Date.now()+RETRY);
 }
 return response.json();
}
export function repositoryData(input:unknown) {
 const repo=githubRepositorySchema.parse(input);
 if(repo.private || !Number.isSafeInteger(repo.id) || !/^[\w.-]+\/[\w.-]+$/.test(repo.full_name))throw Error('Invalid public repository');
 return {githubId:String(repo.id),fullName:repo.full_name as string,ownerLogin:repo.owner.login as string,htmlUrl:`https://github.com/${repo.full_name}`,description:typeof repo.description==='string'?repo.description:null,language:typeof repo.language==='string'?repo.language:null,stars:repo.stargazers_count as number,forks:repo.forks_count as number,pushedAt:repo.pushed_at?new Date(repo.pushed_at):null,isFork:Boolean(repo.fork),isArchived:Boolean(repo.archived),isPrivate:false,fetchedAt:new Date()};
}
export async function syncMember(memberId:string) {
 const member=await prisma.memberProfile.findUnique({where:{id:memberId}});
 if(!member?.github || !member.isPublic)return;
 const previous=await prisma.memberGitHubSummary.upsert({where:{memberId},create:{memberId,github:member.github},update:{}});
 const now=new Date();
 const claimed=await prisma.memberGitHubSummary.updateMany({where:{memberId,nextAttemptAt:{lte:now}},data:{attemptedAt:now,nextAttemptAt:new Date(Date.now()+RETRY)}});
 if(!claimed.count)return;
 try {
  const username=encodeURIComponent(member.github);
  // Discover up to 100 repos; publish metadata before fetching optional top-two details.
  const repos=await githubRequest<GitHubRepository[]>(`/users/${username}/repos?type=owner&sort=pushed&per_page=${MAX_REPOS}`);
  const publicRepos=repos.filter(r=>!r.private);
  // Upsert independent metadata without holding a transaction across hundreds of queries.
  const repositoryIds:string[]=[];
  for(let offset=0;offset<publicRepos.length;offset+=3){
   const batch=await Promise.all(publicRepos.slice(offset,offset+3).map(raw=>{
    const data=repositoryData(raw);
    return prisma.gitHubRepository.upsert({where:{githubId:data.githubId},create:data,update:data});
   }));
   repositoryIds.push(...batch.map(repo=>repo.id));
  }
  await prisma.$transaction(async tx=>{
   const unchanged=await tx.memberProfile.findFirst({where:{id:memberId,github:member.github,isPublic:true}});
   if(!unchanged)return;
   await tx.memberRepository.deleteMany({where:{memberId,source:'owner'}});
   await tx.memberRepository.createMany({data:repositoryIds.map(repositoryId=>({memberId,repositoryId,source:'owner',reviewStatus:'approved'})),skipDuplicates:true});
   await tx.memberGitHubSummary.update({where:{memberId},data:{github:member.github!,fetchedAt:now,status:'refreshing',error:null,repositoryCount:publicRepos.length,nextAttemptAt:new Date(Date.now()+TTL)}});
  },{timeout:30000});
  // Publish metadata first; optional language/event requests must never hide repositories.
  let detailError:string|null=null;
  let activity=previous.github===member.github?previous.activity:[];
  try{
   if(process.env.GITHUB_TOKEN){
    const events=z.array(z.object({id:z.string(),type:z.string(),public:z.boolean(),repo:z.object({name:z.string().regex(/^[\w.-]+\/[\w.-]+$/)}),created_at:z.string()})).parse(await githubRequest(`/users/${username}/events/public?per_page=10`));
    activity=events.filter(e=>e.public).map(e=>({id:e.id,type:e.type,repository:e.repo.name,createdAt:e.created_at}));
   }else detailError='Public activity details are currently unavailable.';
  }catch{detailError='Repositories updated; public activity is temporarily unavailable.'}
  await prisma.memberGitHubSummary.updateMany({where:{memberId,github:member.github},data:{status:'ready',activity:activity as Prisma.InputJsonValue,error:detailError}});
 } catch(error){
  const status=error instanceof GitHubError?error.status:0;
  if(status===404){await prisma.memberRepository.deleteMany({where:{memberId,source:'owner'}})}
  await prisma.memberGitHubSummary.update({where:{memberId},data:{status:previous.fetchedAt?'stale':'unavailable',error:status===404?'GitHub account unavailable':status===403||status===429?'GitHub rate limit; refresh deferred':'GitHub refresh unavailable',nextAttemptAt:new Date(error instanceof GitHubError?Math.max(error.retryAt,Date.now()+RETRY):Date.now()+RETRY)}});
 }
}

// Small bounded in-process queue; DB claim prevents duplicate work across processes.
const queued=new Set<string>();
const queue:string[]=[];
let running=0;
export function enqueueMember(id:string) {
 if(queued.has(id)||queue.length>=100)return;
 queued.add(id);queue.push(id);pump();
}
function pump(){
 while(running<2&&queue.length){const id=queue.shift()!;running++;void syncMember(id).catch(()=>console.error({event:'github_sync_failed',memberId:id})).finally(()=>{running--;queued.delete(id);pump()})}
}

let warming=false;
export async function warmRepositoryCache(){
 if(warming)return;
 warming=true;
 try{
  const due=await prisma.memberProfile.findMany({where:{isPublic:true,github:{not:null},OR:[{githubSummary:null},{githubSummary:{nextAttemptAt:{lte:new Date()}}}]},select:{id:true},orderBy:{id:'asc'},take:100});
  for(const member of due)enqueueMember(member.id);
 }finally{warming=false}
}
