"use client";

import type { CSSProperties } from "react";

import { useCodeforces } from "@/hooks/useCodeforces";
import { codeforcesRankColor } from "@/lib/codeforces-rank";

interface CodeforcesStatsProps {
  handle?: string;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CodeforcesStats({ handle }: CodeforcesStatsProps) {
  const { data, loading, error } = useCodeforces(handle);

  if (!handle || error) return null;

  if (loading || !data) {
    return (
      <div className="flex w-full flex-col items-center gap-2 px-1">
        <div className="h-9 w-20 animate-pulse rounded bg-[#233046]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#233046]" />
        <div className="h-2.5 w-14 animate-pulse rounded bg-[#233046]" />
      </div>
    );
  }

  const color = codeforcesRankColor(data.rank) ?? "#9AA8C7";
  const rankLabel = data.rank ? titleCase(data.rank) : "Unrated";

  return (
    <div className="flex w-full flex-col items-center px-1 text-center font-mono">
      <p
        className="rating-flow text-[42px] font-bold leading-none"
        style={{ "--rating-color": color } as CSSProperties}
      >
        {data.rating ?? "—"}
      </p>

      <p className="mt-2 text-base leading-none" style={{ color }}>
        {rankLabel}
      </p>

      <p className="mt-1 text-xs leading-none text-[#6E7F9E]">
        {data.maxRating ? `max ${data.maxRating}` : "no rating yet"}
      </p>
    </div>
  );
}
