"use client";

import type { CSSProperties } from "react";

import { useCodeforces } from "@/hooks/useCodeforces";

interface CodeforcesStatsProps {
  handle?: string;
}

const RANK_COLORS: Record<string, string> = {
  newbie: "#9AA8C7",
  pupil: "#4CAF50",
  specialist: "#2EC4B6",
  expert: "#5B8CFF",
  "candidate master": "#C77DFF",
  master: "#FFA116",
  "international master": "#FFA116",
  grandmaster: "#FF5C5C",
  "international grandmaster": "#FF5C5C",
  "legendary grandmaster": "#FF5C5C",
};

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CodeforcesStats({ handle }: CodeforcesStatsProps) {
  const { data, loading, error } = useCodeforces(handle);

  if (!handle || error) return null;

  if (loading || !data) {
    return (
      <div className="flex w-[80px] flex-col items-center gap-1.5">
        <div className="h-2 w-8 animate-pulse rounded bg-[#233046]" />
        <div className="h-5 w-12 animate-pulse rounded bg-[#233046]" />
        <div className="h-2.5 w-10 animate-pulse rounded bg-[#233046]" />
      </div>
    );
  }

  const color = data.rank ? (RANK_COLORS[data.rank] ?? "#9AA8C7") : "#9AA8C7";
  const rankLabel = data.rank ? titleCase(data.rank) : "Unrated";

  return (
    <div className="flex flex-col items-center text-center font-mono">
      <p className="text-[8px] uppercase tracking-[0.14em] text-[#6E7F9E]">
        Rating
      </p>

      <p
        className="rating-flow mt-0.5 text-2xl font-bold leading-none"
        style={{ "--rating-color": color } as CSSProperties}
      >
        {data.rating ?? "—"}
      </p>

      <p className="mt-1 text-[10px] leading-tight" style={{ color }}>
        {rankLabel}
      </p>

      <p className="mt-0.5 text-[9px] leading-tight text-[#6E7F9E]">
        {data.maxRating ? `max ${data.maxRating}` : "no rating yet"}
      </p>
    </div>
  );
}
