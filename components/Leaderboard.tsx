"use client";

import { useState } from "react";
import YearFilter from "./YearFilter";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { FaGithub } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";

import LeaderboardPanel from "@/components/LeaderboardPanel";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type {
  LeaderboardBoard,
  LeaderboardBoardId,
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
    id === "github" ? "contributions" : id === "codeforces" ? "rating" : "submissions",
  windowLabel: id === "codeforces" ? "current" : "last 7 days",
  eligible: 0,
  unavailable: 0,
  entries: [],
}));

function emptyMessageFor(board: LeaderboardBoard): string {
  switch (board.id) {
    case "github":
      return "No GitHub activity in the last 7 days.";
    case "leetcode":
      return "No LeetCode submissions in the last 7 days.";
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
  const { data, loading, refreshing, loadingBoards, failedBoards, error, refresh } = useLeaderboard(year);

  const boards = PLACEHOLDER_BOARDS.map(empty=>data?.boards.find(board=>board.id===empty.id)||empty);

  return (
    <div className="mt-10 animate-fade-in-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-2xl font-bold text-[#F1F5FF]">
            Leaderboard
          </h2>

          <p className="mt-1 font-mono text-sm text-[#9AA8C7]">
            GitHub and LeetCode activity over the last 7 days, plus current
            Codeforces ratings.
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

      <YearFilter members={[]} availableYears={years} value={year} onChange={setYear}/>
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
                  emptyMessage={failedBoards[board.id]?"Could not load this board. Try Refresh.":emptyMessageFor(board)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
