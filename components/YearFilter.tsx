"use client";

import { useMemo } from "react";
import type { Member } from "@/types/member";

interface YearFilterProps {
  members: Member[];
  availableYears?: number[];
  value: number | "All";
  onChange: (year: number | "All") => void;
}

export default function YearFilter({ members, availableYears, value, onChange }: YearFilterProps) {
  const years = useMemo<(number | "All")[]>(() => [
    "All",
    ...Array.from(new Set(availableYears || members.map(member => member.year))).sort((a, b) => b - a),
  ], [members, availableYears]);

  return <div className="relative mt-4 min-w-0 font-mono">
    <p className="mb-2.5 text-[11px] tracking-wider text-[#6E7F9E] sm:text-[10px]">BATCH</p>
    <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-3">
      {years.map(year => {
        const active = value === year;
        return <button key={year} type="button" onClick={() => onChange(year)} aria-pressed={active} className={`mobile-target min-h-11 shrink-0 cursor-pointer whitespace-nowrap border px-4 py-2 font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF] ${active ? "border-[#5B8CFF] bg-[#20314D] text-white" : "border-[#2B3A52] text-[#9AA8C7] hover:border-[#5B8CFF] hover:text-white"}`}>
          {year === "All" ? "All batches" : year}
        </button>;
      })}
    </div>
  </div>;
}
