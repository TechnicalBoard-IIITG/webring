"use client";
import { useEffect,useState } from 'react';
import { Code2 } from 'lucide-react';
import RepositoryLanguage,{ languageColor } from './RepositoryLanguage';
import { topGitHubLanguages } from '@/lib/github-languages';
import type { GitHubLanguageSnapshot } from '@/types/repository';

const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
export default function MemberLanguages({memberId,github}:{memberId?:string;github:string}){
 const [snapshot,setSnapshot]=useState<GitHubLanguageSnapshot|null>(null);
 const [error,setError]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!memberId)return;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let polls=0;
  const load=async()=>{
   try{
    const response=await fetch(`${api}/api/members/${encodeURIComponent(memberId)}/github/languages`,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw Error();
    const data:GitHubLanguageSnapshot=await response.json();
    if(controller.signal.aborted)return;
    setSnapshot(data);setError(false);
    if((data.status==='pending'||data.status==='stale'&&!data.error)&&polls++<15)timer=setTimeout(()=>void load(),2000);
   }catch{if(!controller.signal.aborted)setError(true)}
  };
  void load();return()=>{controller.abort();clearTimeout(timer)};
 },[memberId,github,attempt]);
 const matches=snapshot?.github?.toLowerCase()===github.toLowerCase();
 const languages=topGitHubLanguages(matches?snapshot!.languages:{});
 const pending=Boolean(memberId)&&(!snapshot||matches&&snapshot.status==='pending')&&!error;
 return <section aria-label="Top GitHub languages" className="min-w-0 font-mono">
  <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#D4DDF0] sm:text-sm"><Code2 size={16} aria-hidden className="shrink-0 text-[#8BC5FF]"/>Top languages</h3>
  {languages.length?<>
   <ul className="space-y-3">{languages.map(language=><li key={language.name}>
    <div className="mb-2 flex items-center justify-between gap-2 text-sm text-[#C3D0E7] sm:text-xs"><span className="min-w-0 truncate" title={language.name}><RepositoryLanguage language={language.name}/></span><span className="shrink-0 tabular-nums text-[#9AA8C7]">{language.percentage<0.1?'<0.1':language.percentage.toFixed(1)}%</span></div>
    <div aria-hidden className="h-1.5 w-full bg-[#2B3A52]"><div className="h-full" style={{width:`${language.percentage}%`,backgroundColor:languageColor(language.name)}}/></div>
   </li>)}</ul>
   {snapshot?.stale&&<p className="mt-1 text-[11px] text-[#8593B2] sm:text-[9px]" title={snapshot.fetchedAt||undefined}>Cached snapshot{snapshot.error?'':' / refreshing'}</p>}
  </>:<p role="status" className="text-xs leading-relaxed text-[#9AA8C7] sm:text-[10px]">{!memberId?'Save your profile to load languages.':snapshot&&!matches?'Save your GitHub username to load languages.':pending?'Loading GitHub languages...':error?'Could not load GitHub languages.':snapshot?.error||'No public language data yet.'}</p>}
  {error&&<button type="button" onClick={()=>setAttempt(value=>value+1)} className="mt-2 min-h-11 cursor-pointer border border-[#34465F] px-3 py-2 text-xs text-[#9AA8C7] hover:border-[#5B8CFF] hover:text-[#8BC5FF] sm:min-h-0 sm:px-2 sm:py-1 sm:text-[10px]">Try again</button>}
 </section>;
}
