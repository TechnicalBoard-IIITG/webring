"use client";

import type { CSSProperties } from "react";
import { Check, ExternalLink } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";
import Select from "./Select";

const platforms = [
  { id: "github", label: "GitHub", Icon: FaGithub, accent: "#8BC5FF", background: "#20314D" },
  { id: "leetcode", label: "LeetCode", Icon: SiLeetcode, accent: "#FFD18A", background: "#2E2412" },
  { id: "codeforces", label: "Codeforces", Icon: SiCodeforces, accent: "#F29B9B", background: "#32202A" },
  { id: "linkedin", label: "LinkedIn", Icon: FaLinkedin, accent: "#8CDEFF", background: "#102D42" },
  { id: "portfolio", label: "Portfolio", Icon: ExternalLink, accent: "#A2F0CF", background: "#142D28" },
] as const;

interface MemberFiltersProps {
  technologies: string[];
  technology: string;
  onTechnologyChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
}

interface ProfileFiltersProps {
  selectedPlatforms: string[];
  onPlatformsChange: (value: string[]) => void;
}

const control = "mobile-target min-h-14 min-w-0 border border-[#2B3A52] bg-[#1A2233] px-3 py-3 font-mono text-base text-[#9AA8C7] transition-colors enabled:cursor-pointer enabled:hover:border-[#5B8CFF] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-35 sm:text-sm";

export default function MemberFilters({ technologies, technology, onTechnologyChange, sort, onSortChange }: MemberFiltersProps) {
  return <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:gap-3">
    <div className="col-span-1 min-w-0 w-full sm:flex-1">
      <Select
        ariaLabel="Technology filter"
        value={technology}
        onChange={onTechnologyChange}
        className={`${control} w-full justify-between`}
        placeholder="All technologies"
        options={[
          { value: "", label: "All technologies" },
          ...(technology && !technologies.includes(technology) ? [{ value: technology, label: technology }] : []),
          ...technologies.map(tag => ({ value: tag, label: tag })),
        ]}
      />
    </div>
    <div className="col-span-1 min-w-0 w-full sm:flex-1">
      <Select
        ariaLabel="Sort members"
        value={sort}
        onChange={onSortChange}
        className={`${control} w-full justify-between`}
        options={[{ value: "name", label: "Name" }, { value: "batch", label: "Batch" }]}
      />
    </div>
  </div>;
}

export function ProfileFilters({ selectedPlatforms, onPlatformsChange }: ProfileFiltersProps) {
  return <div className="mt-4 flex flex-wrap items-end gap-4 font-mono">
    <fieldset className="min-w-0 flex-1">
      <legend className="mb-2.5 text-[11px] tracking-wider text-[#6E7F9E] sm:text-[10px]">HAS PROFILE{selectedPlatforms.length > 0 ? ` / ${selectedPlatforms.length} selected` : ""}</legend>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {platforms.map(({ id, label, Icon, accent, background }) => {
          const selected = selectedPlatforms.includes(id);
          const style = { "--filter-accent": accent, ...(selected ? { borderColor: accent, color: accent, backgroundColor: background } : {}) } as CSSProperties;
          return <label key={id} style={style} className="mobile-target group flex min-h-11 min-w-0 cursor-pointer select-none items-center gap-2 border border-[#2B3A52] bg-[#1A2233] px-2.5 text-xs text-[#9AA8C7] transition-colors hover:border-[var(--filter-accent)] hover:text-[var(--filter-accent)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--filter-accent)] sm:min-h-10 sm:gap-2.5 sm:px-3">
            <input type="checkbox" name="platform" value={id} checked={selected} onChange={event => onPlatformsChange(event.target.checked ? [...selectedPlatforms, id] : selectedPlatforms.filter(value => value !== id))} className="sr-only" />
            <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center border border-[#52617C] bg-[#121826] transition-colors group-hover:border-[var(--filter-accent)]" style={selected ? { borderColor: accent, backgroundColor: accent, color: "#121826" } : undefined}>
              <Check size={11} strokeWidth={3} className={selected ? "opacity-100" : "opacity-0"} />
            </span>
            <Icon size={13} aria-hidden />
            <span>{label}</span>
          </label>;
        })}
      </div>
    </fieldset>
  </div>;
}
