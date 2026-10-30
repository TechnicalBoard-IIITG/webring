import type { Repository } from '@/types/repository';
export interface RepositoryPage {
 items:Repository[];total:number;languages:string[];stats:{stars:number;forks:number};oldestFetchedAt:string|null;
 refresh?:{pending:number;deferred:number;intervalSeconds:number};
}
const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const responses=new Map<string,{data:RepositoryPage;until:number}>();
const requests=new Map<string,Promise<RepositoryPage>>();
const latest=new Map<string,symbol>();
export const defaultRepositoryQuery='page=1&search=&sort=stars&forks=false';
export function cachedRepositories(query:string,allowStale=false){const hit=responses.get(query);return hit&&(allowStale||hit.until>Date.now())?hit.data:null}
export function loadRepositories(query=defaultRepositoryQuery,options:{live?:boolean}={}):Promise<RepositoryPage> {
 const data=cachedRepositories(query);if(data&&!options.live)return Promise.resolve(data);
 const requestKey=`${options.live?'live':'snapshot'}:${query}`;
 const pending=requests.get(requestKey);if(pending)return pending;
 const token=Symbol();latest.set(query,token);
 const params=new URLSearchParams(query);if(options.live)params.set('live','true');
 const request=fetch(`${api}/api/repositories?${params}`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error(r.status===429?'Too many refreshes. Please try again shortly.':'Community repositories unavailable');return r.json() as Promise<RepositoryPage>}).then(data=>{
  // A slower speculative prefetch must not overwrite a newer live response.
  if(latest.get(query)===token){
   if(responses.size>=30)responses.delete(responses.keys().next().value!);
   responses.set(query,{data,until:Date.now()+(data.total?60000:2000)});
  }
  return data;
 }).finally(()=>{requests.delete(requestKey);if(latest.get(query)===token)latest.delete(query)});
 requests.set(requestKey,request);return request;
}
