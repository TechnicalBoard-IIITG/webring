"use client";

import { useState } from "react";
import Image from "next/image";

import SearchBar from "@/components/SearchBar";
import MemberFilters, { ProfileFilters } from "@/components/MemberFilters";
import MemberGrid from "@/components/MemberGrid";
import YearFilter from "@/components/YearFilter";
import Leaderboard from "@/components/Leaderboard";
import Repositories from "@/components/Repositories";
import { loadRepositories } from "@/lib/repositories-client";
import { resultRange } from "@/lib/pagination";

import { useEffect } from "react";

import type { Member } from "@/types/member";

import MemberDashboard from "@/components/MemberDashboard";
import { useCodeforcesRatings } from "@/hooks/useCodeforcesRatings";
import { FaUserPlus, FaLinkedin } from "react-icons/fa";
import { FaDiscord } from "react-icons/fa6";
import { Trophy, Users, GitFork } from "lucide-react";
import IIITGLogo from "../components/IIITGLogo";



type Tab = "directory" | "leaderboard" | "linkedin" | "repositories";

export default function Home() {
  useEffect(()=>{void loadRepositories().catch(()=>{})},[]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [account, setAccount] = useState<{ email: string; profile: Member | null; role?: string } | null>(null);
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let active = true;
    fetch(`${api}/api/auth/me`, { credentials: "include", cache: "no-store" })
      .then(async (r) => r.ok ? r.json() : null)
      .then(data => { if (active) setAccount(data); })
      .catch(() => { if (active) setAccount(null); });
    return () => { active = false; };
  }, []);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "All">("All");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("directory");
  const codeforcesRatings = useCodeforcesRatings();

  const [years,setYears]=useState<number[]>([]);
  const [technologies,setTechnologies]=useState<string[]>([]);
  const [tech,setTech]=useState("");
  const [platform,setPlatform]=useState<string[]>([]);
  const [sort,setSort]=useState("name");
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [ready,setReady]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>{const q=new URLSearchParams(location.search);setSearch(q.get('search')||'');setSelectedYear(q.get('year')?Number(q.get('year')):'All');setTech(q.get('tech')||'');setPlatform((q.get('platform')||'').split(',').filter(Boolean));setSort(q.get('sort')==='batch'?'batch':'name');const p=Number(q.get('page'));if(Number.isInteger(p)&&p>0&&p<=100000)setPage(p);const tab=q.get('tab');if(tab==='linkedin'||tab==='repositories'||tab==='leaderboard')setActiveTab(tab);setReady(true)},0);return()=>clearTimeout(timer)},[]);
  useEffect(()=>{if(!ready)return;const controller=new AbortController();const timer=setTimeout(()=>{setLoading(true);setError('');const q=new URLSearchParams({paged:'1',limit:'60',page:String(page),sort});if(search.trim())q.set('search',search.trim());if(selectedYear!=='All')q.set('year',String(selectedYear));if(tech)q.set('tech',tech);const selected=[...new Set([...platform,...(activeTab==='linkedin'?['linkedin']:[])])];if(selected.length)q.set('platform',selected.join(','));const url=new URLSearchParams(q);url.delete('paged');url.delete('limit');url.set('tab',activeTab);history.replaceState(null,'',`?${url}`);fetch(`/api/members?${q}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Directory unavailable');return data}).then(data=>{if(!controller.signal.aborted){setAllMembers(data.items);setYears(data.years);setTechnologies(data.technologies);setTotal(data.total);if(data.total&&page>Math.ceil(data.total/60))setPage(Math.ceil(data.total/60))}}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})},300);return()=>{clearTimeout(timer);controller.abort()}},[ready,search,selectedYear,tech,platform,sort,page,activeTab]);
  const filteredMembers=allMembers;
  const control="mobile-target min-h-11 sm:min-h-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-2 font-mono text-xs text-[#9AA8C7] transition-colors enabled:cursor-pointer enabled:hover:border-[#5B8CFF] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <main className="relative min-h-screen bg-[#121826] sm:overflow-hidden text-[#F1F5FF]">
      <div className="pointer-events-none fixed inset-0 bg-grid" />

      <div className="relative mx-auto max-w-7xl pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-0.9 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
              <span>IIITG </span>
              <span className="text-[#8BC5FF]">Index</span>
            </h1>

            <p className="mt-5 max-w-3xl font-mono text-base leading-relaxed text-[#9AA8C7] sm:text-lg">
              a collection of student portfolios & github profiles.{" "}
              <span className="whitespace-nowrap font-semibold text-[#8BC5FF]">
                {`${total} members`}
              </span>
            </p>
          </div>

          <div className="flex w-full shrink-0 items-center gap-4 text-[#9AA8C7] sm:mt-2 sm:grid sm:w-auto sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2">
            <a
              href="https://discord.gg/FCPj699MQU"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="IIITG Discord"
              className="mobile-target flex min-h-11 min-w-11 items-center justify-center transition-colors sm:min-h-0 sm:min-w-0 hover:text-[#5B8CFF]"
            >
              <FaDiscord size={30} />
            </a>

            <a
              href="https://iiitg.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="IIITG Website"
              className="mobile-target flex min-h-11 min-w-11 items-center justify-center transition-colors sm:min-h-0 sm:min-w-0 hover:text-[#5B8CFF]"
            >
              <IIITGLogo className="size-7" />
            </a>

            <a
              href="/dashboard"
              aria-label={account ? "Open my profile" : "Join IIITG Index"}
              className="
                ml-auto sm:col-span-2 sm:ml-0 sm:mt-2
                flex items-center justify-center gap-2
                border border-[#2B3A52]
                px-3 py-2
                font-mono text-xs
                text-[#9AA8C7]
                transition-colors
                hover:border-[#5B8CFF]
                hover:text-[#F1F5FF]
              "
            >
              {account ? (
                <>
                  {account.profile?.github ? (
                    <Image
                      width={32}
                      height={32}
                      unoptimized
                      src={`https://github.com/${encodeURIComponent(account.profile.github)}.png?size=80`}
                      alt="Your profile"
                      className="size-8 rounded-full border border-[#5B8CFF] object-cover"
                    />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full border border-[#5B8CFF] bg-[#20314D] text-[#8BC5FF]">
                      {(account.profile?.name || account.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{account.profile ? "Profile" : "Complete profile"}</span>
                </>
              ) : (
                <><FaUserPlus size={30} /><span>Join</span></>
              )}
            </a>
          </div>
        </div>

        <div className="mt-10 h-px w-full bg-[#2B3A52]" />

        <div className="mt-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {([
            {tab:'directory',label:'Directory',Icon:Users,active:'border-[#5B8CFF] bg-[#20314D] text-[#8BC5FF]',inactive:'hover:border-[#5B8CFF] hover:bg-[#20314D] hover:text-[#8BC5FF]'},
            {tab:'leaderboard',label:'Leaderboard',Icon:Trophy,active:'border-[#FFA116] bg-[#2E2412] text-[#FFD18A]',inactive:'hover:border-[#FFA116] hover:bg-[#2E2412] hover:text-[#FFD18A]'},
            {tab:'repositories',label:'Repositories',Icon:GitFork,active:'border-[#62D6A7] bg-[#142D28] text-[#A2F0CF]',inactive:'hover:border-[#62D6A7] hover:bg-[#142D28] hover:text-[#A2F0CF]'},
            {tab:'linkedin',label:'LinkedIn',Icon:FaLinkedin,active:'border-[#38BDF8] bg-[#102D42] text-[#8CDEFF]',inactive:'hover:border-[#38BDF8] hover:bg-[#102D42] hover:text-[#8CDEFF]'}
          ] as const).map(({tab,label,Icon,active,inactive})=><button key={tab} aria-pressed={activeTab===tab} onMouseEnter={()=>{if(tab==='repositories')void loadRepositories().catch(()=>{})}} onFocus={()=>{if(tab==='repositories')void loadRepositories().catch(()=>{})}} onClick={()=>{setActiveTab(tab);setPage(1)}} className={`mobile-target flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 border px-2.5 sm:min-h-0 py-2.5 font-mono text-xs font-semibold transition-colors sm:gap-2 sm:px-5 sm:text-sm duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current ${activeTab===tab?active:`border-[#2B3A52] text-[#9AA8C7] ${inactive}`}`}><Icon size={14}/>{label}</button>)}
        </div>

        {activeTab === "directory" || activeTab === "linkedin" ? (
          <>
            <div className="mt-10 grid min-w-0 grid-cols-2 items-stretch gap-3 lg:flex lg:flex-nowrap lg:items-center">
              <SearchBar className="col-span-2 w-full lg:col-span-1 lg:w-[53.333%] lg:flex-none" value={search} onChange={v=>{setSearch(v);setPage(1)}} />
              <MemberFilters
                technologies={technologies}
                technology={tech}
                onTechnologyChange={value=>{setTech(value);setPage(1)}}
                sort={sort}
                onSortChange={value=>{setSort(value);setPage(1)}}
              />
            </div>
            <ProfileFilters
              selectedPlatforms={platform}
              onPlatformsChange={value=>{setPlatform(value);setPage(1)}}
            />
            <YearFilter members={allMembers} availableYears={years} value={selectedYear} onChange={v=>{setSelectedYear(v);setPage(1)}} />

            {error&&!allMembers.length?<p role="alert" className="mt-6 font-mono text-sm text-[#E0A35B]">{error}</p>:loading&&!allMembers.length?<p role="status" className="mt-6 font-mono text-sm text-[#9AA8C7]">Loading members...</p>:<>
            {error&&allMembers.length>0?<p role="alert" className="mt-4 font-mono text-sm text-[#E0A35B]">{error} Showing the last available results.</p>:null}
            {loading&&allMembers.length>0?<p role="status" className="sr-only">Updating directory results.</p>:null}
            {!total&&<p className="mt-8 font-mono text-[#9AA8C7]">No members match these filters.</p>}
            {activeTab==='linkedin'?<section aria-label="LinkedIn directory" className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{filteredMembers.map(m=><article key={m.id} className="flex gap-4 border border-[#2B3A52] bg-[#1A2233] p-5 font-mono"><Image unoptimized src={m.github?`https://github.com/${encodeURIComponent(m.github)}.png?size=80`:'/favicon.ico'} alt="" width={48} height={48} className="size-12 shrink-0 border border-[#2B3A52]"/><div className="min-w-0"><h2 className="truncate text-base font-semibold">{m.name}</h2><p className="text-sm text-[#9AA8C7]">Batch {m.year}</p><a href={m.linkedin!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center border border-[#2B3A52] sm:min-h-0 px-3 py-2 text-sm text-[#8CDEFF] transition-colors hover:border-[#38BDF8] hover:bg-[#102D42] focus-visible:outline-2 focus-visible:outline-[#38BDF8]">Open LinkedIn</a></div></article>)}</section>:<MemberGrid members={filteredMembers} onMemberClick={setSelectedMember} codeforcesRatings={codeforcesRatings}/>}
            <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs text-[#9AA8C7]"><button className={control} disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span aria-live="polite">{resultRange(page,60,total)}<span className="ml-3 text-[#6E7F9E]">Page {page} of {Math.max(1,Math.ceil(total/60))}</span></span><button className={control} disabled={page*60>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}

          </>
        ) : activeTab === 'repositories' ? <Repositories years={years} account={account}/> : (
          <Leaderboard years={years} />
        )}

        {selectedMember && (
          <MemberDashboard
            key={selectedMember.github}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </div>
    </main>
  );
}
