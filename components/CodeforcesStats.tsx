"use client";

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
      <div className="size-[120px] animate-pulse rounded-full border border-[#2B3A52] bg-[#1A2233]" />
    );
  }

  const color = data.rank ? (RANK_COLORS[data.rank] ?? "#9AA8C7") : "#9AA8C7";
  const rankLabel = data.rank ? titleCase(data.rank) : "Unrated";

  return (
    <div className="flex w-[120px] flex-col items-center border border-[#2B3A52] bg-[#1A2233] px-2 py-3 text-center font-mono">
      <p className="text-[9px] uppercase tracking-[0.16em] text-[#6E7F9E]">
        Codeforces
      </p>

      <p
        className="mt-1 text-2xl font-bold leading-none"
        style={{ color }}
      >
        {data.rating ?? "—"}
      </p>

      <p className="mt-1 text-[11px] leading-tight" style={{ color }}>
        {rankLabel}
      </p>

      <p className="mt-1 text-[10px] text-[#6E7F9E]">
        {data.maxRating ? `max ${data.maxRating}` : "no rating yet"}
      </p>
    </div>
  );
}
