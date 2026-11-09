"use client";

import { useState } from "react";
import Select from "./Select";
import MultiSelect from "./MultiSelect";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { FaGithub } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";

import LeaderboardPanel from "@/components/LeaderboardPanel";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type {
  LeaderboardBoard,
  LeaderboardBoardId,
  LeetCodeDifficulty,
  LeetCodeLeaderboardMode,
} from "@/types/leaderboard";

const PLATFORMS: Record<
  LeaderboardBoardId,
  { title: string; icon: ReactNode; accent: string }
> = {
  github: {
    title: "GitHub",
    icon: <FaGithub size={20} />,
    accent: "#5B8CFF",
  },
  leetcode: {
    title: "LeetCode",
    icon: <SiLeetcode size={20} />,
    accent: "#FFA116",
  },
  codeforces: {
    title: "Codeforces",
    icon: <SiCodeforces size={20} />,
    accent: "#E05B5B",
  },
};

const PLACEHOLDER_BOARDS: LeaderboardBoard[] = (
  ["github", "leetcode", "codeforces"] as const
).map((id) => ({
  id,
  metric:
    id === "github" ? "contributions" : id === "codeforces" ? "rating" : "solved",
  windowLabel: id === "codeforces" ? "current" : id === "leetcode" ? "total" : "last 7 days",
  eligible: 0,
  unavailable: 0,
  entries: [],
}));

function emptyMessageFor(board: LeaderboardBoard): string {
  switch (board.id) {
    case "github":
      return "No GitHub activity in the last 7 days.";
    case "leetcode":
      return board.metric === "submissions"
        ? "No LeetCode submissions in the last 7 days."
        : "No LeetCode problems solved in the selected difficulties.";
    case "codeforces":
      return board.eligible === 0
        ? "No Codeforces handles in the directory yet."
        : "No rated Codeforces members yet.";
  }
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export default function Leaderboard({years}:{years:number[]}) {
  const [year,setYear]=useState<number | "All">("All");
  const [leetcodeDifficulties,setLeetcodeDifficulties]=useState<LeetCodeDifficulty[]>(["easy","medium","hard"]);
  const [leetcodeMode,setLeetcodeMode]=useState<LeetCodeLeaderboardMode>("solved");
  const { data, loading, refreshing, loadingBoards, failedBoards, error, refresh } = useLeaderboard(year,leetcodeDifficulties,leetcodeMode);

  const boards = PLACEHOLDER_BOARDS.map(empty=>{
    const current=data?.boards.find(board=>board.id===empty.id);
    if(current)return current;
    if(empty.id==="leetcode")return {...empty,metric:leetcodeMode==="submissions"?"submissions":"solved",windowLabel:leetcodeMode==="submissions"?"last 7 days":"total"};
    return empty;
  });

  const toggleLeetCodeDifficulty=(difficulty:LeetCodeDifficulty)=>setLeetcodeDifficulties(current=>{
    if(current.includes(difficulty))return current.filter(value=>value!==difficulty);
    return ["easy","medium","hard"].filter(value=>current.includes(value as LeetCodeDifficulty)||value===difficulty) as LeetCodeDifficulty[];
  });

  const updateLeetCodeMode=(mode:LeetCodeLeaderboardMode)=>{
    if(mode==="submissions")setLeetcodeDifficulties(["easy","medium","hard"]);
    setLeetcodeMode(mode);
  };

  const control="mobile-target min-h-10 w-full min-w-0 border border-[#2B3A52] bg-[#1A2233] px-2.5 py-1.5 font-mono text-xs text-[#9AA8C7] transition-colors enabled:cursor-pointer enabled:hover:border-[#5B8CFF] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-2xl font-bold text-[#F1F5FF]">
            Leaderboard
          </h2>

          <p className="mt-1 font-mono text-sm text-[#9AA8C7]">
            GitHub contributions, LeetCode solved counts or weekly submissions, and current Codeforces ratings.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
          {data ? (
            <p className="font-mono text-xs text-[#6E7F9E]">
              Updated {timeAgo(data.updatedAt)}
            </p>
          ) : null}

          <button
            onClick={refresh}
            disabled={loading || refreshing}
            className="mobile-target flex min-h-11 cursor-pointer items-center gap-1.5 sm:min-h-0 border border-[#2B3A52] px-2.5 py-1.5 font-mono text-xs text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF] disabled:cursor-default disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={refreshing ? "animate-spin" : undefined}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 mb-8 grid min-w-0 gap-x-8 gap-y-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-end">
        <section className="min-w-0">
          <p className="font-mono text-[11px] tracking-wider text-[#6E7F9E]">Batch options</p>
          <div aria-hidden className="my-2 h-px w-full bg-[#2B3A52]" />
          <Select
            ariaLabel="Batch filter"
            value={year==="All"?"":String(year)}
            onChange={value=>setYear(value?Number(value):"All")}
            className={`${control} max-w-48`}
            placeholder="All batches"
            options={[{value:"",label:"All batches"},...[...years].sort((a,b)=>b-a).map(value=>({value:String(value),label:String(value)}))]}
          />
        </section>
        <section className="min-w-0">
          <p className="font-mono text-[11px] tracking-wider text-[#6E7F9E] sm:text-right">LeetCode options</p>
          <div aria-hidden className="my-2 hidden h-px bg-[#2B3A52] sm:ml-auto sm:block sm:w-[26.75rem]" />
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:justify-end">
            <Select
              ariaLabel="LeetCode leaderboard metric"
              value={leetcodeMode}
              onChange={value=>updateLeetCodeMode(value as LeetCodeLeaderboardMode)}
              className={`${control} sm:w-56`}
              options={[{value:"solved",label:"Total solved"},{value:"submissions",label:"Last 7 days submissions"}]}
            />
            <MultiSelect
              key={leetcodeMode}
              ariaLabel="LeetCode difficulties"
              options={[
                {value:"easy",label:"Easy",color:"#87C5A4",selectedBackground:"#1B352C"},
                {value:"medium",label:"Medium",color:"#D7C381",selectedBackground:"#342D1B"},
                {value:"hard",label:"Hard",color:"#D88F94",selectedBackground:"#352126"},
              ]}
              selectedValues={leetcodeDifficulties}
              onToggle={value=>toggleLeetCodeDifficulty(value as LeetCodeDifficulty)}
              disabled={leetcodeMode==="submissions"}
              selectedLabel={leetcodeDifficulties.length===3?"All difficulties":leetcodeDifficulties.length===0?"No difficulties":`${leetcodeDifficulties.length} difficulties`}
              className={`${control} sm:w-48`}
            />
          </div>
        </section>
      </div>
      {error && !data && !loading ? (
        <div className="border border-[#2B3A52] bg-[#1A2233] px-5 py-8 text-center">
          <p className="font-mono text-sm text-[#9AA8C7]">
            Couldn&apos;t load the leaderboard right now.
          </p>

          <button
            onClick={refresh}
            disabled={refreshing}
            className="mt-4 cursor-pointer border border-[#2B3A52] px-4 py-1.5 font-mono text-xs text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF] disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <p className="mb-3 font-mono text-xs text-[#E0A35B]">
              Some platforms could not load. Showing available results.
            </p>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {boards.map((board) => {
              const platform = PLATFORMS[board.id];

              return (
                <LeaderboardPanel
                  key={board.id}
                  title={platform.title}
                  icon={platform.icon}
                  accent={platform.accent}
                  metric={board.metric}
                  windowLabel={board.windowLabel}
                  entries={board.entries}
                  loading={loadingBoards[board.id]}
                  eligible={board.eligible}
                  unavailable={board.unavailable}
                  emptyMessage={failedBoards[board.id]?"Could not load this board. Try Refresh.":board.id==="leetcode"&&leetcodeMode==="solved"&&!leetcodeDifficulties.length?"Choose at least one difficulty to see the solved leaderboard.":emptyMessageFor(board)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
