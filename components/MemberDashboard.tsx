"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import NextImage from "next/image";

import { X, ExternalLink } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { SiCodeforces, SiLeetcode } from "react-icons/si";
import { GitHubCalendar } from "react-github-calendar";

import type { Member } from "@/types/member";

import CodeforcesCalendar from "@/components/CodeforcesCalendar";
import CodeforcesStats from "@/components/CodeforcesStats";
import LeetCodeCalendar from "@/components/LeetCodeCalendar";
import LeetCodeRing from "@/components/LeetCodeRing";

import backgrounds from "@/data/backgrounds.json";

type ActivityTab = "github" | "leetcode" | "codeforces";

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
      className="flex h-8 items-center gap-2 border border-[#2B3A52] bg-[#1A2233] px-3 font-mono text-xs text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF]"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}

export default function MemberDashboard({
  member,
  onClose,
}: MemberDashboardProps) {
  const [activityTab, setActivityTab] = useState<ActivityTab>("github");

  const memberBackground = `/backgrounds/${member.github}.gif`;

  const fallbackBackground =
    backgrounds.length > 0
      ? backgrounds[hashUsername(member.github) % backgrounds.length]
      : null;

  const [background, setBackground] = useState(memberBackground);

  const techStack =
    member.techStack && member.techStack.length > 0
      ? member.techStack
      : ["A+", "B", "Holy C", "D", "R", "Fortran"];

  const githubUrl = `https://github.com/${member.github}`;
  const leetcodeUrl = member.leetcode
    ? `https://leetcode.com/u/${encodeURIComponent(member.leetcode)}/`
    : null;
  const codeforcesUrl = member.codeforces
    ? `https://codeforces.com/profile/${encodeURIComponent(member.codeforces)}`
    : null;

  const tabs: Array<{ id: ActivityTab; label: string; available: boolean }> = [
    { id: "github", label: "GitHub Activity", available: true },
    {
      id: "leetcode",
      label: "LeetCode Activity",
      available: Boolean(member.leetcode),
    },
    {
      id: "codeforces",
      label: "Codeforces Activity",
      available: Boolean(member.codeforces),
    },
  ];

  const availableTabs = tabs.filter((tab) => tab.available);
  const activeTab = availableTabs.some((tab) => tab.id === activityTab)
    ? activityTab
    : "github";

  useEffect(() => {
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
  }, [memberBackground, fallbackBackground]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-[#1A2333]"
      >
        <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2">
          <HeaderLink
            href={githubUrl}
            icon={<FaGithub size={15} />}
            label="GitHub"
          />

          {member.portfolio ? (
            <HeaderLink
              href={member.portfolio}
              icon={<ExternalLink size={15} />}
              label="Portfolio"
            />
          ) : null}

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
            className="flex size-8 cursor-pointer items-center justify-center border border-[#2B3A52] bg-[#1A2233] text-[#9AA8C7] transition-colors hover:border-[#5B8CFF] hover:text-[#F1F5FF]"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div
          className="h-40 bg-[#111827] bg-cover bg-center"
          style={{ backgroundImage: `url(${background})` }}
        />

        <div className="grid grid-cols-[140px_1fr] gap-0 p-6 pl-1 pr-2 sm:pl-5 sm:pr-5">
          <div className="flex w-35 flex-col items-center">
            <NextImage
              src={`https://github.com/${member.github}.png`}
              alt={member.name}
              width={96}
              height={96}
              unoptimized
              className="-mt-16 mb-4 size-24 rounded-full border-4 border-[#1A2333] object-cover"
            />

            <div className="w-full px-1">
              <h2 className="font-mono text-2xl font-bold text-[#F1F5FF]">
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

            {member.leetcode && leetcodeUrl ? (
              <a
                href={leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex flex-col items-center text-[#9AA8C7] transition-colors hover:text-[#F1F5FF]"
              >
                <LeetCodeRing username={member.leetcode} />

                <p className="mt-2 text-center font-mono text-xs">
                  LeetCode stats
                </p>
              </a>
            ) : null}

            {member.codeforces && codeforcesUrl ? (
              <a
                href={codeforcesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex flex-col items-center text-[#9AA8C7] transition-colors hover:text-[#F1F5FF]"
              >
                <CodeforcesStats handle={member.codeforces} />

                <p className="mt-2 text-center font-mono text-xs">
                  Codeforces rating
                </p>
              </a>
            ) : null}
          </div>

          <div className="ml-1 min-w-0 sm:ml-6">
            <h3 className="mb-3 font-mono text-sm font-semibold text-[#F1F5FF]">
              Tech Stack
            </h3>

            <div className="mb-8 flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="border border-[#2B3A52] bg-[#1A2233] px-2.5 py-1 font-mono text-xs text-[#9AA8C7]"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableTabs.map((tab, index) => (
                <Fragment key={tab.id}>
                  {index > 0 ? (
                    <span className="text-[#3A4663]" aria-hidden>
                      |
                    </span>
                  ) : null}

                  <button
                    onClick={() => setActivityTab(tab.id)}
                    className={`cursor-pointer font-mono text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? "text-[#F1F5FF]"
                        : "text-[#6F7FA3] hover:text-[#9AA8C7]"
                    }`}
                  >
                    {tab.label}
                  </button>
                </Fragment>
              ))}
            </div>

            <div className="mt-3 min-h-[150px] min-w-0 overflow-x-auto text-[#9AA8C7]">
              {activeTab === "github" ? (
                <GitHubCalendar username={member.github} colorScheme="dark" />
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
