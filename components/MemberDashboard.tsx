"use client";

import { Fragment, useEffect, useState, useRef, type ReactNode } from "react";
import NextImage from "next/image";

import { X, ExternalLink } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";
import GitHubActivity from "./GitHubActivity";
import MemberLanguages from "./MemberLanguages";

import type { Member } from "@/types/member";

import CodeforcesCalendar from "@/components/CodeforcesCalendar";
import CodeforcesStats from "@/components/CodeforcesStats";
import LeetCodeCalendar from "@/components/LeetCodeCalendar";
import LeetCodeRing from "@/components/LeetCodeRing";

import backgrounds from "@/data/backgrounds.json";

type ActivityTab = "github" | "leetcode" | "codeforces";
type StatsTab = "leetcode" | "codeforces";

interface TabOption<T extends string> {
  id: T;
  label: string;
}

interface MemberDashboardProps {
  member: Member;
  onClose: () => void;
}

function hashUsername(username: string): number {
  let hash = 0;

  for (let index = 0; index < username.length; index++) {
    hash = (hash << 5) - hash + username.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function HeaderLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="mobile-target flex h-11 min-w-11 items-center justify-center gap-2 border border-[#2B3A52] bg-[#1A2233] px-3 font-mono text-xs text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF] sm:h-8 sm:min-w-0 sm:justify-start"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

function TabList<T extends string>({
  tabs,
  active,
  onChange,
  compact = false,
}: {
  tabs: ReadonlyArray<TabOption<T>>;
  active: T;
  onChange: (id: T) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center ${
        compact ? "justify-center gap-1 sm:gap-1.5" : "gap-1 sm:gap-2"
      }`}
    >
      {tabs.map((tab, index) => (
        <Fragment key={tab.id}>
          {index > 0 ? (
            <span className="hidden text-[#3A4663] sm:inline" aria-hidden>
              |
            </span>
          ) : null}

          <button
            onClick={() => onChange(tab.id)}
            aria-pressed={active === tab.id}
            aria-label={tab.label}
            className={`mobile-target cursor-pointer font-mono font-semibold transition-colors ${
              compact ? "min-h-11 px-2 text-xs sm:min-h-0 sm:px-0 sm:text-[11px]" : "min-h-11 px-2 text-xs sm:min-h-0 sm:px-0 sm:text-sm"
            } ${
              active === tab.id
                ? "text-[#F1F5FF]"
                : "text-[#6F7FA3] hover:text-[#9AA8C7]"
            }`}
          >
            <span className="sm:hidden">{tab.label.replace(/ Activity$/, "")}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}

export default function MemberDashboard({
  member,
  onClose,
}: MemberDashboardProps) {
  const dialogRef=useRef<HTMLDivElement>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>("github");
  const [statsTab, setStatsTab] = useState<StatsTab>("leetcode");

  const memberBackground = `/backgrounds/${member.github || "unknown"}.gif`;

  const fallbackBackground =
    backgrounds.length > 0
      ? backgrounds[hashUsername(member.github || member.name) % backgrounds.length]
      : null;

  const [background, setBackground] = useState(member.banner || memberBackground);

  const techStack =
    member.techStack && member.techStack.length > 0
      ? member.techStack
      : [];

  const githubUrl = `https://github.com/${member.github}`;
  const leetcodeUrl = member.leetcode
    ? `https://leetcode.com/u/${encodeURIComponent(member.leetcode)}/`
    : null;
  const codeforcesUrl = member.codeforces
    ? `https://codeforces.com/profile/${encodeURIComponent(member.codeforces)}`
    : null;

  const activityTabs: Array<TabOption<ActivityTab>> = [
    { id: "github", label: "GitHub Activity" },
  ];

  if (member.leetcode) {
    activityTabs.push({ id: "leetcode", label: "LeetCode Activity" });
  }

  if (member.codeforces) {
    activityTabs.push({ id: "codeforces", label: "Codeforces Activity" });
  }

  const activeTab = activityTabs.some((tab) => tab.id === activityTab)
    ? activityTab
    : activityTabs[0].id;

  const statsTabs: Array<TabOption<StatsTab>> = [];

  if (member.leetcode) {
    statsTabs.push({ id: "leetcode", label: "LeetCode" });
  }

  if (member.codeforces) {
    statsTabs.push({ id: "codeforces", label: "Codeforces" });
  }

  const activeStatsTab = statsTabs.some((tab) => tab.id === statsTab)
    ? statsTab
    : (statsTabs[0]?.id ?? null);

  useEffect(() => {
    if (member.banner) return;
    const image = new Image();

    image.onload = () => setBackground(memberBackground);
    image.onerror = () => {
      if (fallbackBackground) setBackground(fallbackBackground);
    };

    image.src = memberBackground;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [member.banner, memberBackground, fallbackBackground]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const root=dialogRef.current;
    const elements=()=>Array.from(root?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')||[]).filter(element=>element.getClientRects().length>0);
    elements()[0]?.focus();
    const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const list=elements();const first=list[0];const last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}};
    root?.addEventListener('keydown',trap);
    return()=>{root?.removeEventListener('keydown',trap);previous?.focus()};
  },[]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name}'s profile`}
        className="relative h-[100dvh] max-h-[100dvh] w-full max-w-4xl overflow-y-auto overscroll-contain bg-[#1A2333] pb-[env(safe-area-inset-bottom)] sm:h-auto sm:max-h-[90dvh] sm:pb-0"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#2B3A52] bg-[#1A2333] px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:hidden">
          <p className="font-mono text-sm font-semibold text-[#D4DDF0]">Member profile</p>
          <button type="button" onClick={onClose} aria-label="Close profile" className="flex size-11 shrink-0 items-center justify-center border border-[#40546E] bg-[#121826] text-[#D4DDF0] focus-visible:outline-2 focus-visible:outline-[#8BC5FF]"><X size={20} /></button>
        </div>
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-10 flex flex-wrap justify-end gap-1.5 sm:inset-x-auto sm:right-[max(1rem,env(safe-area-inset-right))] sm:top-4 sm:gap-2">
          {member.github ? <HeaderLink
            href={githubUrl}
            icon={<FaGithub size={15} />}
            label="GitHub"
          /> : null}

          {member.portfolio ? (
            <HeaderLink
              href={member.portfolio}
              icon={<ExternalLink size={15} />}
              label="Portfolio"
            />
          ) : null}
          {member.linkedin ? <HeaderLink href={member.linkedin} icon={<FaLinkedin size={15} />} label="LinkedIn" /> : null}

          {leetcodeUrl ? (
            <HeaderLink
              href={leetcodeUrl}
              icon={<SiLeetcode size={15} />}
              label="LeetCode"
            />
          ) : null}

          {codeforcesUrl ? (
            <HeaderLink
              href={codeforcesUrl}
              icon={<SiCodeforces size={15} />}
              label="Codeforces"
            />
          ) : null}

          <button
            onClick={onClose}
            aria-label="Close"
            className="mobile-target hidden size-8 cursor-pointer items-center justify-center border border-[#2B3A52] bg-[#1A2233] text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF] sm:flex"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div
          className="h-32 bg-[#111827] bg-cover bg-center sm:h-40"
          style={{ backgroundImage: `url(${member.banner || background})` }}
        />

        <div className="grid grid-cols-1 gap-7 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-8 sm:p-8">
          <div className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-start gap-x-4 self-start sm:flex sm:flex-col sm:items-center">
            <NextImage
              src={member.github?`https://github.com/${encodeURIComponent(member.github)}.png`:"/favicon.ico"}
              alt={member.name}
              width={96}
              height={96}
              unoptimized
              className="-mt-12 size-20 rounded-full border-4 border-[#1A2333] object-cover sm:-mt-16 sm:mb-4 sm:size-24"
            />

            <div className="min-w-0 w-full sm:px-1">
              <h2 className="break-words font-mono text-xl font-bold text-[#F1F5FF] [overflow-wrap:anywhere] sm:text-2xl">
                {member.name}
              </h2>

              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={member.github}
                className="block max-w-full truncate font-mono text-sm text-[#8593B2] transition-colors hover:text-[#F1F5FF]"
              >
                {member.github}
              </a>

              <p className="font-mono text-sm text-[#9AA8C7]">
                Year: {member.year}
              </p>
            </div>

            {activeStatsTab ? (
              <div className="col-span-full mt-4 flex w-full shrink-0 flex-col items-center gap-2">
                <TabList
                  tabs={statsTabs}
                  active={activeStatsTab}
                  onChange={setStatsTab}
                  compact
                />

                <div className="flex min-h-[120px] w-full items-start justify-center">
                  {activeStatsTab === "leetcode" &&
                  member.leetcode &&
                  leetcodeUrl ? (
                    <a
                      href={leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open LeetCode profile"
                      className="flex flex-col items-center transition-opacity hover:opacity-80"
                    >
                      <LeetCodeRing username={member.leetcode} />
                    </a>
                  ) : null}

                  {activeStatsTab === "codeforces" &&
                  member.codeforces &&
                  codeforcesUrl ? (
                    <a
                      href={codeforcesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Codeforces profile"
                      className="flex flex-col items-center transition-opacity hover:opacity-80"
                    >
                      <CodeforcesStats handle={member.codeforces} />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
            {member.github ? <MemberLanguages key={`${member.id}:${member.github}`} memberId={member.id} github={member.github} /> : null}
          </div>

          <div className="min-w-0">
            {member.bio?.trim() ? (
              <section aria-label="About this member" className="mb-6">
                <h3 className="mb-2 font-mono text-sm font-semibold text-[#F1F5FF]">About</h3>
                <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#C3D0E7] [overflow-wrap:anywhere]">
                  {member.bio.trim()}
                </p>
              </section>
            ) : null}
            <h3 className="mb-3 font-mono text-sm font-semibold text-[#F1F5FF]">
              Tech Stack
            </h3>

            <div className="mb-8 flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="max-w-full break-words border border-[#2B3A52] bg-[#1A2233] px-2.5 py-1 font-mono text-xs text-[#9AA8C7] [overflow-wrap:anywhere]"
                >
                  {tech}
                </span>
              ))}
            </div>

            <TabList
              tabs={activityTabs}
              active={activeTab}
              onChange={setActivityTab}
            />

            <div className="mt-4 min-h-[210px] min-w-0 text-[#9AA8C7]">
              {activeTab === "github" && member.github ? (
                <GitHubActivity username={member.github} />
              ) : null}

              {activeTab === "leetcode" && member.leetcode ? (
                <LeetCodeCalendar username={member.leetcode} />
              ) : null}

              {activeTab === "codeforces" && member.codeforces ? (
                <CodeforcesCalendar handle={member.codeforces} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
