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
  const cardUrl = member.portfolio || githubUrl;
  const glowColor = codeforcesRankColor(codeforcesRating?.rank);

  const displayUrl = member.portfolio
    ? new URL(member.portfolio).hostname
    : `github.com/${member.github}`;

  const cardStyle = glowColor
    ? ({ ...style, "--member-glow": glowColor } as React.CSSProperties)
    : style;

  return (
    <div
      onClick={() => onClick(member)}
      style={cardStyle}
      className={`
        group
        w-full
        cursor-pointer
        animate-fade-in-up
        border
        border-[#2B3A52]
        bg-[#1A2233]
        p-3
        transition-all
        duration-300
        ${glowColor ? "member-card-rated" : "hover:border-[#5B8CFF]"}
      `}
    >
      <div className="mb-3 flex items-start justify-between">
        <Image
          src={`https://github.com/${member.github}.png`}
          alt={member.name}
          width={40}
          height={40}
          className="border border-[#2B3A52] object-cover"
          unoptimized
        />

        <a
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
        className={`truncate font-mono text-[15px] font-semibold text-white transition-[color,text-shadow] duration-300 ${
          glowColor ? "member-card-name" : "group-hover:text-[#8BC5FF]"
        }`}
      >
        {member.name}
      </h3>

      <p className="mt-1 truncate font-mono text-sm text-[#9AA8C7]">
        {displayUrl}
      </p>

      <div className="mt-6 flex items-center">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#8B95B6] transition-colors hover:text-white"
          aria-label={`${member.name}'s GitHub`}
        >
          <FaGithub size={18} />
        </a>
      </div>
    </div>
  );
}
