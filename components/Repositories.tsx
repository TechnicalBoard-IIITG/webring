"use client";
import { useEffect,useState } from 'react';
import { cachedRepositories, defaultRepositoryQuery, loadRepositories, type RepositoryPage } from '@/lib/repositories-client';
import { Star, GitFork } from 'lucide-react';
import RepositoryLanguage from './RepositoryLanguage';
const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const control='mobile-input mobile-target min-h-11 min-w-0 sm:min-h-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-2 font-mono text-base text-[#9AA8C7] sm:text-xs transition-colors enabled:cursor-pointer enabled:hover:border-[#62D6A7] enabled:hover:text-[#A2F0CF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7] disabled:cursor-not-allowed disabled:opacity-35';
type Nomination={id:string;fullName:string;reason:string;status:string;member?:{name:string}};
export default function Repositories({years,account}:{years:number[];account:{role?:string}|null}){
 const [data,setData]=useState<RepositoryPage|null>(()=>cachedRepositories(defaultRepositoryQuery));
 const [search,setSearch]=useState('');const [year,setYear]=useState('');const [language,setLanguage]=useState('');const [member,setMember]=useState('');const [sort,setSort]=useState('stars');const [forks,setForks]=useState(false);const [page,setPage]=useState(1);
 const [debouncedSearch,setDebouncedSearch]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(search),300);return()=>clearTimeout(timer)},[search]);
 const [reviewStatus,setReviewStatus]=useState('pending');
 const [loading,setLoading]=useState(()=>!cachedRepositories(defaultRepositoryQuery));const [error,setError]=useState('');const [message,setMessage]=useState('');const [reviews,setReviews]=useState<Nomination[]>([]);
 useEffect(()=>{
  let active=true;
  const q=new URLSearchParams({page:String(page),search:debouncedSearch,sort,forks:String(forks)});if(year)q.set('year',year);if(language)q.set('language',language);if(member)q.set('member',member);
  const hit=cachedRepositories(q.toString());
  queueMicrotask(()=>{if(active){setLoading(!hit);setError('');if(hit)setData(hit)}});
  let timer:ReturnType<typeof setTimeout>|undefined;let polls=0;
  const load=()=>{void loadRepositories(q.toString()).then(data=>{if(active){setData(data);if(data.total===0&&polls++<15)timer=setTimeout(load,2500)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})};
  load();
  return()=>{active=false;clearTimeout(timer)};
 },[debouncedSearch,year,language,member,sort,forks,page]);
 useEffect(()=>{if(account?.role==='ADMIN')fetch(`${api}/api/repositories/nominations/review?status=${reviewStatus}`,{credentials:'include'}).then(r=>r.ok?r.json():[]).then(setReviews).catch(()=>setMessage('Could not load pending reviews'))},[account,reviewStatus]);
 const review=async(id:string,status:string)=>{try{const r=await fetch(`${api}/api/repositories/nominations/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(!r.ok)throw Error('Review failed; repository must be public and GitHub available');setReviews(v=>v.filter(n=>n.id!==id));setMessage(`Nomination ${status}`)}catch(e){setMessage((e as Error).message)}};
 const reset=()=>{setSearch('');setYear('');setLanguage('');setMember('');setSort('stars');setForks(false);setPage(1)};
 return <section className="mt-10 font-mono text-[#9AA8C7]"><h2 className="text-2xl font-bold text-[#F1F5FF]">Community repositories by IIITG members</h2>
 <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap">
  <input aria-label="Search repositories" placeholder="search repositories..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} className={`${control} col-span-2 w-full sm:w-auto sm:flex-1`}/>
  <select aria-label="Repository batch" value={year} onChange={e=>{setYear(e.target.value);setPage(1)}} className={`${control} w-full sm:w-auto`}><option value="">All batches</option>{years.map(y=><option key={y}>{y}</option>)}</select>
  <select aria-label="Language" className={`${control} w-full sm:w-auto sm:max-w-52`} value={language} onChange={e=>{setLanguage(e.target.value);setPage(1)}}><option value="">All languages</option>{data?.languages.map(l=><option key={l}>{l}</option>)}</select>
  <select aria-label="Repository sort" className={`${control} col-span-2 w-full sm:w-auto`} value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="stars">Stars</option><option value="forks">Forks</option><option value="pushed">Recently pushed</option></select>
  <label className={`${control} flex items-center gap-2 text-sm sm:text-xs`}><input type="checkbox" aria-label="Include forked repositories" checked={forks} onChange={e=>{setForks(e.target.checked);setPage(1)}} className="size-4 shrink-0 accent-[#62D6A7]"/><span className="sm:hidden">Forks</span><span className="hidden sm:inline">Include forks</span></label>
  <button className={control} onClick={reset}>Reset filters</button>
 </div>
 {member&&<p className="mt-3 text-xs">Filtering by member <button className="text-[#8BC5FF]" onClick={()=>{setMember('');setPage(1)}}>Clear member</button></p>}
 {error?<p role="alert" className="mt-5 text-[#E0A35B]">{error}</p>:loading?<p role="status" className="mt-5">Loading cached repositories...</p>:<>
 <p className="mt-5 text-xs">{data?.total||0} repositories · ★ {data?.stats.stars||0} · Forks {data?.stats.forks||0}{data?.oldestFetchedAt?` · Oldest sync ${new Date(data.oldestFetchedAt).toLocaleString()}`:''}</p>
 {!data?.items.length&&<p className="mt-8 text-sm">No qualifying repositories yet. Showing only recent public work; discovery updates automatically.</p>}
 <div className="mt-6 grid gap-5 sm:grid-cols-2">
  {data?.items.map(repo=><article key={repo.id} className="flex min-w-0 flex-col border border-[#3B4F68] bg-[#1D293B] p-5 transition-colors hover:border-[#62D6A7] focus-within:border-[#62D6A7]">
   <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[15px] font-semibold leading-relaxed text-[#B4F5DA] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#62D6A7]">{repo.fullName}</a>
   <p className="mt-3 break-words text-sm leading-relaxed text-[#D4DDF0]">{repo.description||'No description provided.'}</p>
   <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#C3D0E7]">
    <RepositoryLanguage language={repo.language}/>
    <span className="inline-flex items-center gap-1.5"><Star size={13} aria-hidden className="text-[#FFD18A]"/><span aria-label={`${repo.stars} stars`}>{repo.stars}</span></span>
    <span className="inline-flex items-center gap-1.5"><GitFork size={13} aria-hidden/><span>{repo.forks} forks</span></span>
    {repo.isFork&&<span>Fork</span>}{repo.isArchived&&<span>Archived</span>}
   </div>
   <div className="mt-4 flex flex-wrap gap-2">{repo.members?.map(link=><button key={link.member.id} onClick={()=>{setMember(link.member.id);setPage(1)}} className="min-h-11 max-w-full cursor-pointer break-words border border-[#40546E] bg-[#162234] px-2.5 py-1.5 text-left text-xs [overflow-wrap:anywhere] sm:min-h-0 leading-relaxed text-[#CAD5E8] transition-colors hover:border-[#62D6A7] hover:text-[#A2F0CF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62D6A7]">{link.member.name} / {link.member.year} / {link.source==='owner'?'linked account':'reviewed association'}</button>)}</div>
   <p className="mt-4 border-t border-[#35475F] pt-3 text-[11px] leading-relaxed text-[#A8B9D4]">Pushed {repo.pushedAt?new Date(repo.pushedAt).toLocaleDateString():'unavailable'} / Synced {new Date(repo.fetchedAt).toLocaleString()}</p>
  </article>)}
 </div>
 <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:gap-4"><button className={control} disabled={page===1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page}</span><button className={control} disabled={page*24>=(data?.total||0)} onClick={()=>setPage(v=>v+1)}>Next</button></div></>}
 {account?.role==='ADMIN'&&<section className="mt-6 border border-[#2B3A52] p-5"><h3>Association reviews</h3><select aria-label="Review status" className={`${control} mt-3`} value={reviewStatus} onChange={e=>setReviewStatus(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved / disputed</option><option value="rejected">Rejected</option></select>{reviews.map(n=><article key={n.id} className="mt-4 text-xs"><p>{n.fullName} · {n.member?.name}</p><p className="my-2">{n.reason}</p><button className={control} onClick={()=>void review(n.id,'approved')}>Approve association</button> <button className={control} onClick={()=>void review(n.id,'rejected')}>Reject</button></article>)}</section>}
 {message&&<p role="status" className="mt-5 text-sm text-[#8BC5FF]">{message}</p>}</section>
}
