"use client";

import { useMemo } from "react";
import type { Member } from "@/types/member";

interface YearFilterProps {
  members: Member[];
  availableYears?: number[];
  value: number | "All";
  onChange: (year: number | "All") => void;
}

export default function YearFilter({
  members,
  availableYears,
  value,
  onChange,
}: YearFilterProps) {
  const years = useMemo<(number | "All")[]>(() => {
    return [
      "All",
      ...Array.from(
        new Set(availableYears || members.map((member) => member.year))
      ).sort((a, b) => b - a),
    ];
  }, [members, availableYears]);

  return (
    <div className="relative mt-8 min-w-0">
      <div
        className="
          flex
          gap-2 sm:gap-3
          max-w-full
          overflow-x-auto
          overscroll-x-contain
          pb-2
          scrollbar-none
          [scrollbar-width:none]
          [-ms-overflow-style:none]
        "
      >
        {years.map((year) => {
          const active = value === year;

          return (
            <button
              key={year}
              onClick={() => onChange(year)}
              aria-pressed={active}
              className={`
                min-h-11
                shrink-0
                focus-visible:outline-2
                focus-visible:-outline-offset-2
                focus-visible:outline-[#8BC5FF]
                whitespace-nowrap
                border
                px-4
                py-2
                text-sm
                font-mono
                transition-all
                duration-200
                cursor-pointer

                ${
                  active
                    ? "border-[#5B8CFF] bg-[#20314D] text-white"
                    : "border-[#2B3A52] text-[#9AA8C7] hover:border-[#5B8CFF] hover:text-white"
                }
              `}
            >
              {year}
            </button>
          );
        })}
      </div>

      
      <div
        className="
          hidden sm:block
          pointer-events-none
          absolute
          right-0
          top-0
          h-full
          w-10
          bg-gradient-to-l
          from-[#101827]
          to-transparent
        "
      />
    </div>
  );
}
