import type { Repository } from '@/types/repository';
export interface RepositoryPage {
 items:Repository[];total:number;languages:string[];stats:{stars:number;forks:number};oldestFetchedAt:string|null;
}
const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const responses=new Map<string,{data:RepositoryPage;until:number}>();
const requests=new Map<string,Promise<RepositoryPage>>();
export const defaultRepositoryQuery='page=1&search=&sort=stars&forks=false';
export function cachedRepositories(query:string){const hit=responses.get(query);return hit&&hit.until>Date.now()?hit.data:null}
export function loadRepositories(query=defaultRepositoryQuery):Promise<RepositoryPage> {
 const data=cachedRepositories(query);if(data)return Promise.resolve(data);
 const pending=requests.get(query);if(pending)return pending;
 const request=fetch(`${api}/api/repositories?${query}`).then(async r=>{if(!r.ok)throw Error('Community repositories unavailable');return r.json() as Promise<RepositoryPage>}).then(data=>{
  if(responses.size>=30)responses.delete(responses.keys().next().value!);
  responses.set(query,{data,until:Date.now()+(data.total?60000:2000)});return data;
 }).finally(()=>requests.delete(query));
 requests.set(query,request);return request;
}
