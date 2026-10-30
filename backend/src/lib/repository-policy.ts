export const REPOSITORY_WINDOW_DAYS=30;
export const REPOSITORIES_PER_MEMBER=2;
interface RepositoryCandidate {
 fullName:string;ownerLogin:string;stars:number;pushedAt:Date|null;isFork:boolean;isArchived:boolean;isPrivate:boolean;
}
export function recentPopularRepositories<T extends RepositoryCandidate>(repositories:readonly T[],now=new Date()):T[] {
 const cutoff=now.getTime()-REPOSITORY_WINDOW_DAYS*86400000;
 return repositories.filter(repo=>{
  const pushed=repo.pushedAt?.getTime();
  return !repo.isFork&&!repo.isArchived&&!repo.isPrivate&&pushed!==undefined&&pushed>=cutoff&&pushed<=now.getTime()&&repo.fullName.split('/')[1]?.toLowerCase()!==repo.ownerLogin.toLowerCase();
 }).sort((a,b)=>b.stars-a.stars||b.pushedAt!.getTime()-a.pushedAt!.getTime()||a.fullName.localeCompare(b.fullName)).slice(0,REPOSITORIES_PER_MEMBER);
}
