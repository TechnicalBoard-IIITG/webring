"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import type { LeaderboardEntry } from "@/types/leaderboard";

const PREVIEW_SIZE = 10;

const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD54A",
  2: "#C9D3E0",
  3: "#D98A4B",
};

interface LeaderboardPanelProps {
  title: string;
  icon: ReactNode;
  accent: string;
  metric: string;
  windowLabel: string;
  entries: LeaderboardEntry[];
  loading: boolean;
  eligible: number;
  unavailable: number;
  emptyMessage: string;
}

export default function LeaderboardPanel({
  title,
  icon,
  accent,
  metric,
  windowLabel,
  entries,
  loading,
  eligible,
  unavailable,
  emptyMessage,
}: LeaderboardPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleEntries = expanded ? entries : entries.slice(0, PREVIEW_SIZE);
  const allUnavailable = eligible > 0 && unavailable >= eligible;

  return (
    <section className="flex min-w-0 flex-col border border-[#2B3A52] bg-[#1A2233]/60 backdrop-blur-sm">
      <header
        className="flex min-w-0 flex-wrap items-center gap-2 border-b border-[#2B3A52] px-4 py-4 sm:px-5"
        style={{ boxShadow: `inset 0 2px 0 ${accent}` }}
      >
        <span style={{ color: accent }} aria-hidden>
          {icon}
        </span>

        <h3 className="shrink-0 font-mono text-xl font-bold text-[#F1F5FF]">{title}</h3>

        <span className="ml-auto text-right font-mono text-[11px] leading-tight text-[#6E7F9E]">
          <span className="block">{metric}</span>
          {windowLabel ? <span className="block">{windowLabel}</span> : null}
        </span>
      </header>

      <div className="divide-y divide-[#2B3A52]">
        {loading &&
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-4">
              <div className="size-5 shrink-0 animate-pulse rounded bg-[#233046]" />
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-[#233046]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[#233046]" />
            </div>
          ))}

        {!loading && entries.length === 0 && (
          <p className="px-5 py-8 text-center font-mono text-sm text-[#6E7F9E]">
            {allUnavailable ? `Couldn't reach ${title} right now.` : emptyMessage}
          </p>
        )}

        {!loading &&
          visibleEntries.map((entry) => (
            <a
              key={entry.github}
              href={entry.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-5 duration-150 hover:bg-[#20304a]"
            >
              <span
                className="w-5 shrink-0 text-center font-mono text-sm font-bold"
                style={{ color: MEDAL_COLORS[entry.rank] ?? "#6E7F9E" }}
              >
                {entry.rank}
              </span>

              <Image
                src={`https://github.com/${entry.github}.png`}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 shrink-0 rounded-full border border-[#2B3A52] object-cover"
              />

              <span className="min-w-0 flex-1">
                <span className="block break-words font-mono text-base [overflow-wrap:anywhere] sm:truncate text-[#F1F5FF]">
                  {entry.name}
                </span>

                {entry.detail ? (
                  <span className="block truncate font-mono text-[10px] text-[#6E7F9E]">
                    {entry.detail}
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 text-right">
                <span
                  className="block font-mono text-sm font-semibold"
                  style={{ color: accent }}
                >
                  {entry.count.toLocaleString()}
                </span>

                <span className="block font-mono text-[10px] text-[#6E7F9E]">
                  {metric}
                </span>
              </span>
            </a>
          ))}
      </div>

      {!loading && entries.length > PREVIEW_SIZE ? (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mobile-target mt-auto min-h-11 cursor-pointer border-t sm:min-h-0 border-[#2B3A52] px-5 py-2.5 font-mono text-xs text-[#9AA8C7] transition-colors hover:bg-[#20304a] hover:text-[#F1F5FF]"
        >
          {expanded ? "Show top 10" : `Show all ${entries.length}`}
        </button>
      ) : null}
    </section>
  );
}
