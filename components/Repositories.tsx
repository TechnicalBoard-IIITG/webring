"use client";
import { useEffect,useState,type CSSProperties } from 'react';
import { cachedRepositories, defaultRepositoryQuery, loadRepositories, type RepositoryPage } from '@/lib/repositories-client';
import { Star, GitFork, RefreshCw } from 'lucide-react';
import RepositoryLanguage, { languageColor } from './RepositoryLanguage';
import Select from './Select';
const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const control='mobile-input mobile-target min-h-11 min-w-0 sm:min-h-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-2 font-mono text-base text-[#9AA8C7] sm:text-xs transition-colors enabled:cursor-pointer enabled:hover:border-[#62D6A7] enabled:hover:text-[#A2F0CF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7] disabled:cursor-not-allowed disabled:opacity-35';
type Nomination={id:string;fullName:string;reason:string;status:string;member?:{name:string}};
export default function Repositories({years,account}:{years:number[];account:{role?:string}|null}){
 const [data,setData]=useState<RepositoryPage|null>(()=>cachedRepositories(defaultRepositoryQuery,true));
 const [search,setSearch]=useState('');const [year,setYear]=useState('');const [language,setLanguage]=useState('');const [member,setMember]=useState('');const [sort,setSort]=useState('stars');const [forks,setForks]=useState(false);const [page,setPage]=useState(1);
 const [debouncedSearch,setDebouncedSearch]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(search),300);return()=>clearTimeout(timer)},[search]);
 const [refreshAttempt,setRefreshAttempt]=useState(0);
 const [updating,setUpdating]=useState(false);
 const [reviewStatus,setReviewStatus]=useState('pending');
 const [loading,setLoading]=useState(()=>!cachedRepositories(defaultRepositoryQuery,true));const [error,setError]=useState('');const [message,setMessage]=useState('');const [reviews,setReviews]=useState<Nomination[]>([]);
 useEffect(()=>{
  let active=true;
  const q=new URLSearchParams({page:String(page),search:debouncedSearch,sort,forks:String(forks)});if(year)q.set('year',year);if(language)q.set('language',language);if(member)q.set('member',member);
  const hit=cachedRepositories(q.toString(),true);
  queueMicrotask(()=>{if(active){setLoading(!hit);setError('');if(hit)setData(hit)}});
  let timer:ReturnType<typeof setTimeout>|undefined;let busy=false;
  const load=async()=>{
   if(!active||busy)return;
   clearTimeout(timer);
   if(document.hidden){timer=setTimeout(()=>void load(),60000);return;}
   busy=true;setUpdating(true);
   let delay=60000;
   try{
    const result=await loadRepositories(q.toString(),{live:true});
    if(active){setData(result);setError('');const lastPage=Math.max(1,Math.ceil(result.total/24));if(page>lastPage)setPage(lastPage);if(result.refresh?.pending)delay=3000;}
   }catch(e){if(active)setError((e as Error).message);}
   finally{busy=false;if(active){setLoading(false);setUpdating(false);timer=setTimeout(()=>void load(),delay);}}
  };
  void load();
  const visible=()=>{if(!document.hidden)void load();};
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
 },[debouncedSearch,year,language,member,sort,forks,page,refreshAttempt]);
 useEffect(()=>{if(account?.role==='ADMIN')fetch(`${api}/api/repositories/nominations/review?status=${reviewStatus}`,{credentials:'include'}).then(r=>r.ok?r.json():[]).then(setReviews).catch(()=>setMessage('Could not load pending reviews'))},[account,reviewStatus]);
 const review=async(id:string,status:string)=>{try{const r=await fetch(`${api}/api/repositories/nominations/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(!r.ok)throw Error('Review failed; repository must be public and GitHub available');setReviews(v=>v.filter(n=>n.id!==id));setMessage(`Nomination ${status}`)}catch(e){setMessage((e as Error).message)}};
 const reset=()=>{setSearch('');setYear('');setLanguage('');setMember('');setSort('stars');setForks(false);setPage(1)};
 return <section className="mt-10 font-mono text-[#9AA8C7]"><h2 className="text-2xl font-bold text-[#F1F5FF]">Community repositories by IIITG members</h2>
 <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap">
  <input aria-label="Search repositories" placeholder="search repositories..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} className={`${control} col-span-2 w-full sm:w-auto sm:flex-1`}/>
  <Select ariaLabel="Repository batch" value={year} onChange={value=>{setYear(value);setPage(1)}} className={`${control} w-full sm:w-auto`} options={[{value:'',label:'All batches'},...years.map(y=>({value:String(y),label:String(y)}))]} />
  <Select ariaLabel="Language" className={`${control} w-full sm:w-auto sm:max-w-52`} value={language} onChange={value=>{setLanguage(value);setPage(1)}} options={[{value:'',label:'All languages'},...(data?.languages||[]).map(l=>({value:l,label:l}))]} />
  <Select ariaLabel="Repository sort" className={`${control} w-full sm:w-auto`} wrapperClassName="col-span-2 sm:col-span-1" value={sort} onChange={value=>{setSort(value);setPage(1)}} options={[{value:'stars',label:'Stars'},{value:'forks',label:'Forks'},{value:'pushed',label:'Recently pushed'}]} />
  <label className={`${control} flex items-center gap-2 text-sm sm:text-xs`}><input type="checkbox" aria-label="Include forked repositories" checked={forks} onChange={e=>{setForks(e.target.checked);setPage(1)}} className="size-4 shrink-0 accent-[#62D6A7]"/><span className="sm:hidden">Forks</span><span className="hidden sm:inline">Include forks</span></label>
  <button className={control} onClick={reset}>Reset filters</button>
  <button className={`${control} inline-flex items-center justify-center gap-2`} disabled={updating} onClick={()=>setRefreshAttempt(v=>v+1)}><RefreshCw size={14} aria-hidden className={updating?'animate-spin':''}/>{updating?'Refreshing...':'Refresh from GitHub'}</button>
 </div>
 {member&&<p className="mt-3 text-xs">Filtering by member <button className="text-[#8BC5FF]" onClick={()=>{setMember('');setPage(1)}}>Clear member</button></p>}
 {(error||data?.refresh?.pending||updating)&&<p role="status" aria-live="polite" className="mt-4 text-xs text-[#A2F0CF]">{error?'Could not refresh GitHub. Retrying automatically.':data?.refresh?.pending?`Updating from GitHub (${data.refresh.pending} members remaining)...`:'Checking GitHub for updates...'}</p>}
 {Boolean(data?.refresh?.deferred)&&<p className="mt-2 text-xs text-[#E0A35B]">Some GitHub updates are temporarily unavailable. Showing the last available results and retrying automatically.</p>}
 {error&&<p role="alert" className="mt-5 text-[#E0A35B]">{error}{data?' Showing the last available results.':''}</p>}
 {loading&&!data?<p role="status" className="mt-5">Loading repositories...</p>:data?<>
 <p className="mt-5 text-xs">{data?.total||0} repositories · ★ {data?.stats.stars||0} · Forks {data?.stats.forks||0}</p>
 {!data?.items.length&&<p className="mt-8 text-sm">No qualifying repositories yet. Showing only recent public work; discovery updates automatically.</p>}
 <div className="mt-6 grid gap-5 sm:grid-cols-2">
  {data?.items.map(repo=><article key={repo.id} style={{'--repo-color':languageColor(repo.language)} as CSSProperties} className="flex h-full min-w-0 flex-col border border-[color:color-mix(in_srgb,var(--repo-color)_45%,#3B4F68)] bg-[color:color-mix(in_srgb,var(--repo-color)_12%,#162234)] p-5 transition-colors hover:border-[var(--repo-color)] focus-within:border-[var(--repo-color)]">
   <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[15px] font-semibold leading-relaxed text-[color:color-mix(in_srgb,var(--repo-color)_40%,white)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--repo-color)]">{repo.fullName}</a>
   <p className="mt-3 h-[4.5rem] overflow-hidden break-words text-sm leading-relaxed text-[#D4DDF0] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">{repo.description||'No description provided.'}</p>
   <div className="mt-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#C3D0E7]">
    <RepositoryLanguage language={repo.language}/>
    <span className="inline-flex items-center gap-1.5"><Star size={13} aria-hidden className="text-[#FFD18A]"/><span aria-label={`${repo.stars} stars`}>{repo.stars}</span></span>
    <span className="inline-flex items-center gap-1.5"><GitFork size={13} aria-hidden/><span>{repo.forks} forks</span></span>
    {repo.isFork&&<span>Fork</span>}{repo.isArchived&&<span>Archived</span>}
   </div>
   <div className="mt-auto flex flex-wrap gap-2">{repo.members?.map(link=><button key={link.member.id} onClick={()=>{setMember(link.member.id);setPage(1)}} className="min-h-11 max-w-full cursor-pointer break-words border border-[#40546E] bg-[#162234] px-2.5 py-1.5 text-left text-xs [overflow-wrap:anywhere] sm:min-h-0 leading-relaxed text-[#CAD5E8] transition-colors hover:border-[#62D6A7] hover:text-[#A2F0CF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7]">{link.member.name} / {link.member.year} / {link.source==='owner'?'linked account':'reviewed association'}</button>)}</div>
   <p className="mt-4 border-t border-[#35475F] pt-3 text-[11px] leading-relaxed text-[#A8B9D4]">Pushed {repo.pushedAt?new Date(repo.pushedAt).toLocaleDateString():'unavailable'} / Synced {new Date(repo.fetchedAt).toLocaleString()}</p>
  </article>)}
 </div>
 <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:gap-4"><button className={control} disabled={page===1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page}</span><button className={control} disabled={page*24>=(data?.total||0)} onClick={()=>setPage(v=>v+1)}>Next</button></div></>:null}
 {account?.role==='ADMIN'&&<section className="mt-6 border border-[#2B3A52] p-5"><h3>Association reviews</h3><Select ariaLabel="Review status" className={`${control} mt-3`} value={reviewStatus} onChange={setReviewStatus} options={[{value:'pending',label:'Pending'},{value:'approved',label:'Approved / disputed'},{value:'rejected',label:'Rejected'}]} />{reviews.map(n=><article key={n.id} className="mt-4 text-xs"><p>{n.fullName} · {n.member?.name}</p><p className="my-2">{n.reason}</p><button className={control} onClick={()=>void review(n.id,'approved')}>Approve association</button> <button className={control} onClick={()=>void review(n.id,'rejected')}>Reject</button></article>)}</section>}
 {message&&<p role="status" className="mt-5 text-sm text-[#8BC5FF]">{message}</p>}</section>
}
