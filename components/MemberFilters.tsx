"use client";

import type { CSSProperties } from "react";
import { ArrowDownUp, Check, ChevronDown, Code2, ExternalLink, RotateCcw, X } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";

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
  selectedPlatforms: string[];
  onPlatformsChange: (value: string[]) => void;
  canReset: boolean;
  onReset: () => void;
}

const selectStyle = "mobile-input min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-3 pr-8 font-mono text-base text-[#F1F5FF] sm:text-xs outline-none disabled:cursor-not-allowed disabled:text-[#6E7F9E]";
const fieldStyle = "relative flex min-h-11 min-w-0 items-center gap-2 border sm:gap-3 border-[#2B3A52] bg-[#1A2233] px-3 transition-colors hover:border-[#5B8CFF] focus-within:border-[#5B8CFF] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#5B8CFF]";

export default function MemberFilters({
  technologies, technology, onTechnologyChange, sort, onSortChange,
  selectedPlatforms, onPlatformsChange, canReset, onReset,
}: MemberFiltersProps) {
  return (
    <div className="mt-4 space-y-4 font-mono">
      <div className="grid grid-cols-2 items-stretch gap-3 sm:flex sm:flex-wrap">
        <div className={`${fieldStyle} col-span-2 w-full sm:w-auto sm:min-w-64 sm:flex-1 ${technology ? "border-[#5B8CFF] bg-[#20314D]" : ""}`}>
          <Code2 size={16} aria-hidden className="shrink-0 text-[#8BC5FF]" />
          <label htmlFor="member-technology" className="shrink-0 text-xs text-[#9AA8C7]"><span className="sm:hidden">Tech</span><span className="hidden sm:inline">Tech stack</span></label>
          <div className="relative flex min-w-0 flex-1">
            <select id="member-technology" value={technology} onChange={event => onTechnologyChange(event.target.value)} className={selectStyle} disabled={!technologies.length && !technology}>
              <option className="bg-[#1A2233]" value="">All technologies</option>
              {technology && !technologies.includes(technology) && <option className="bg-[#1A2233]" value={technology}>{technology}</option>}
              {technologies.map(tag => <option className="bg-[#1A2233]" key={tag} value={tag}>{tag}</option>)}
            </select>
            <ChevronDown size={13} aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6E7F9E]" />
          </div>
          {technology && <button type="button" onClick={() => onTechnologyChange("")} aria-label="Clear technology filter" className="mobile-target flex size-11 shrink-0 sm:size-7 cursor-pointer items-center justify-center border border-[#3A5278] text-[#8BC5FF] transition-colors hover:border-[#8BC5FF] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF]"><X size={13} /></button>}
        </div>

        <div className={`${fieldStyle} min-w-0 sm:min-w-44 flex-1 sm:flex-none`}>
          <ArrowDownUp size={14} aria-hidden className="shrink-0 text-[#6E7F9E]" />
          <label htmlFor="member-sort" className="sr-only text-xs text-[#9AA8C7] sm:not-sr-only">Sort</label>
          <div className="relative flex min-w-0 flex-1">
            <select id="member-sort" value={sort} onChange={event => onSortChange(event.target.value)} className={selectStyle}>
              <option className="bg-[#1A2233]" value="name">Name</option>
              <option className="bg-[#1A2233]" value="batch">Batch</option>
            </select>
            <ChevronDown size={13} aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6E7F9E]" />
          </div>
        </div>

        <button type="button" aria-label="Reset filters" onClick={onReset} disabled={!canReset} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-[#2B3A52] px-4 text-xs text-[#9AA8C7] transition-colors enabled:hover:border-[#5B8CFF] enabled:hover:bg-[#20314D] enabled:hover:text-[#8BC5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8CFF] disabled:cursor-not-allowed disabled:opacity-35">
          <RotateCcw size={13} aria-hidden /><span className="sm:hidden">Reset</span><span className="hidden sm:inline">Reset filters</span>
        </button>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2.5 text-[11px] tracking-wider sm:text-[10px] text-[#6E7F9E]">HAS PROFILE{selectedPlatforms.length > 0 ? ` / ${selectedPlatforms.length} selected` : ""}</legend>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {platforms.map(({ id, label, Icon, accent, background }) => {
            const selected = selectedPlatforms.includes(id);
            const style = { "--filter-accent": accent, ...(selected ? { borderColor: accent, color: accent, backgroundColor: background } : {}) } as CSSProperties;
            return (
              <label key={id} style={style} className="mobile-target group flex min-h-11 min-w-0 cursor-pointer select-none items-center gap-2 sm:min-h-10 sm:gap-2.5 border border-[#2B3A52] bg-[#1A2233] px-2.5 text-xs sm:px-3 text-[#9AA8C7] transition-colors hover:border-[var(--filter-accent)] hover:text-[var(--filter-accent)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--filter-accent)]">
                <input type="checkbox" name="platform" value={id} checked={selected} onChange={event => onPlatformsChange(event.target.checked ? [...selectedPlatforms, id] : selectedPlatforms.filter(value => value !== id))} className="sr-only" />
                <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center border border-[#52617C] bg-[#121826] transition-colors group-hover:border-[var(--filter-accent)]" style={selected ? { borderColor: accent, backgroundColor: accent, color: "#121826" } : undefined}>
                  <Check size={11} strokeWidth={3} className={selected ? "opacity-100" : "opacity-0"} />
                </span>
                <Icon size={13} aria-hidden />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
