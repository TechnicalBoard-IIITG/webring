"use client";
import { useEffect,useState } from 'react';
import type { GitHubOverview } from '@/types/repository';
import RepositoryLanguage from './RepositoryLanguage';
const api=process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export default function GitHubHighlights({memberId}:{memberId:string}){
 const [data,setData]=useState<GitHubOverview|null>(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let polls=0;
  const load=async()=>{
   try{
    const response=await fetch(`${api}/api/members/${encodeURIComponent(memberId)}/github`,{signal:controller.signal});
    if(!response.ok)throw Error('Repository highlights unavailable');
    const result:GitHubOverview=await response.json();
    if(controller.signal.aborted)return;
    setData(result);setError('');
    if((result.status==='pending'||result.status==='refreshing')&&polls++<15)timer=setTimeout(()=>void load(),2000);
   }catch(e){if(!controller.signal.aborted)setError((e as Error).message)}
  };
  void load();return()=>{controller.abort();clearTimeout(timer)};
 },[memberId,attempt]);

 const bytes=Object.values(data?.languages||{}).reduce((a,b)=>a+b,0);
 return <section className="mt-6 border-t border-[#2B3A52] pt-4 font-mono text-xs text-[#9AA8C7]" aria-label="Public GitHub highlights"><h3 className="mb-3 text-sm font-semibold text-[#F1F5FF]">Public GitHub highlights</h3><p className="mb-3">Top two by stars, pushed in the last 30 days. Profile README repositories excluded.</p>
 {error?<p role="alert">{error}</p>:!data?<p role="status">Loading cached repositories...</p>:<>
 <p className="mb-3">{data.fetchedAt?`Last sync ${new Date(data.fetchedAt).toLocaleString()}${data.stale||data.status==='stale'?' · stale cache':''}`:data.status==='empty'?'No GitHub account linked.':'Fetching recent repositories automatically...'}</p>
 {data.error&&<p role="status" className="mb-3 text-[#E0A35B]">{data.error}</p>}
 {data.repositories.length===0&&data.fetchedAt&&<p>No qualifying public repositories pushed in the last 30 days.</p>}
 <div className="grid gap-3">{data.repositories.map(repo=><article key={repo.id} className="border border-[#3B4F68] bg-[#1D293B] p-3 transition-colors hover:border-[#5B8CFF]"><a className="break-all font-semibold text-[#A8D5FF] hover:underline" href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">{repo.fullName}</a>{repo.description&&<p className="mt-2 break-words leading-relaxed text-[#D4DDF0]">{repo.description}</p>}<p className="mt-2 text-[#C3D0E7]"><RepositoryLanguage language={repo.language}/> · ★ {repo.stars} · Forks {repo.forks}{repo.isFork?' · fork':''}</p></article>)}</div>
 {bytes>0&&<div className="mt-4"><h4 className="text-[#F1F5FF]">Share of repository code bytes</h4><p className="mt-1">Available language snapshot. Generated or vendored code may be included.</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(data.languages).sort((a,b)=>b[1]-a[1]).map(([language,count])=><span key={language} className="border border-[#2B3A52] px-2 py-1">{language} {(count/bytes*100).toFixed(1)}%</span>)}</div></div>}
 {data.activity.length>0&&<div className="mt-4"><h4 className="text-[#F1F5FF]">Recent public activity</h4>{data.activity.slice(0,5).map(event=><p key={event.id} className="mt-2 break-words leading-relaxed text-[#D4DDF0]">{event.type.replace(/Event$/,'')} · <a href={`https://github.com/${event.repository}`} target="_blank" rel="noopener noreferrer" className="text-[#8BC5FF]">{event.repository}</a> · {new Date(event.createdAt).toLocaleDateString()}</p>)}</div>}
 </>}
 {error&&<button onClick={()=>setAttempt(v=>v+1)} className="mt-3 border border-[#2B3A52] px-3 py-2 hover:border-[#5B8CFF]">Retry</button>}</section>
}
