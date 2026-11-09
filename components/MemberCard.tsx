"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { codeforcesRankColor } from "@/lib/codeforces-rank";
import type { CodeforcesRating } from "@/types/codeforces";
import { Member } from "@/types/member";

interface MemberCardProps {
  member: Member;
  onClick: (member: Member) => void;
  codeforcesRating?: CodeforcesRating;
  style?: React.CSSProperties;
}

export default function MemberCard({
  member,
  onClick,
  codeforcesRating,
  style,
}: MemberCardProps) {
  const githubUrl = `https://github.com/${member.github}`;
  const cardUrl = member.portfolio || (member.github ? githubUrl : undefined);
  const glowColor = codeforcesRankColor(codeforcesRating?.rank);

  const displayUrl = member.portfolio
    ? new URL(member.portfolio).hostname
    : member.github ? `github.com/${member.github}` : "No public website";

  const cardStyle = glowColor
    ? ({ ...style, "--member-glow": glowColor } as React.CSSProperties)
    : style;

  return (
    <div
      onClick={() => onClick(member)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${member.name} profile`}
      onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==="Enter"||event.key===" ")){event.preventDefault();onClick(member)}}}
      style={cardStyle}
      className={`
        group
        w-full
        min-w-0
        cursor-pointer
        border
        border-[#2B3A52]
        bg-[#1A2233]
        p-4
        transition-colors
        duration-150
        ${glowColor ? "member-card-rated" : "hover:border-[#5B8CFF]"}
      `}
    >
      <div className="mb-3 flex items-start justify-between">
        <Image
          src={member.github?`https://github.com/${encodeURIComponent(member.github)}.png`:"/favicon.ico"}
          alt={member.name}
          width={48}
          height={48}
          className="size-12 border border-[#2B3A52] object-cover"
          unoptimized
        />

        <a
          className="mobile-target flex size-11 shrink-0 items-center justify-center sm:size-auto"
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${member.name}'s ${member.portfolio ? "portfolio" : "GitHub"}`}
        >
          <ExternalLink
            size={15}
            className="text-[#6E7F9E] sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100"
          />
        </a>
      </div>

      <h3
        className={`line-clamp-2 break-words font-mono text-base sm:line-clamp-none sm:truncate font-semibold text-white transition-colors duration-150 ${
          glowColor ? "member-card-name" : "group-hover:text-[#8BC5FF]"
        }`}
      >
        {member.name}
      </h3>

      <p className="mt-1 truncate font-mono text-sm text-[#9AA8C7]">
        {displayUrl}
      </p>

      <div className="mt-6 flex items-center">
        {member.github ? (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mobile-target flex min-h-11 min-w-11 items-center text-[#8B95B6] transition-colors hover:text-white sm:min-h-0 sm:min-w-0"
          aria-label={`${member.name}'s GitHub`}
        >
          <FaGithub size={18} />
        </a>
        ) : null}
      </div>
    </div>
  );
}
