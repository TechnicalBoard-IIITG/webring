"use client";

import { useLeetCodeStats } from "@/hooks/useLeetCodeStats";

interface LeetCodeRingProps {
  username?: string;
}

const SIZE = 120;
const CENTER = SIZE / 2;

const RADIUS = 46;
const STROKE_WIDTH = 8;

const ARC_START = 135;
const ARC_TOTAL = 270;

const DIFFICULTIES = [
  { key: "easy", color: "#00B8A3" },
  { key: "medium", color: "#FFA116" },
  { key: "hard", color: "#EF4747" },
] as const;

function polar(angleDegrees: number, radius: number) {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function arcPath(start: number, end: number, radius: number) {
  const startPoint = polar(start, radius);
  const endPoint = polar(end, radius);
  const largeArc = end - start > 180 ? 1 : 0;

  return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
}

export default function LeetCodeRing({ username }: LeetCodeRingProps) {
  const { stats, loading, error } = useLeetCodeStats(username);

  if (!username) return null;

  if (loading) {
    return (
      <div className="size-[120px] animate-pulse rounded-full border border-[#2B3A52] bg-[#1A2233]" />
    );
  }

  if (error || !stats) return null;

  const { solved, easy, medium, hard } = stats;
  const solvedTotal = easy + medium + hard;

  if (solvedTotal === 0) return null;

  const cumulative = [0, easy, easy + medium, solvedTotal];

  const segments = DIFFICULTIES.map((difficulty, index) => ({
    color: difficulty.color,
    count: stats[difficulty.key],
    start: ARC_START + (cumulative[index] / solvedTotal) * ARC_TOTAL,
    end: ARC_START + (cumulative[index + 1] / solvedTotal) * ARC_TOTAL,
  }));

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`LeetCode: ${solved} solved, ${easy} easy, ${medium} medium, ${hard} hard`}
    >
      <path
        d={arcPath(ARC_START, ARC_START + ARC_TOTAL, RADIUS)}
        fill="none"
        stroke="#2B3A52"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />

      {segments.map((segment) =>
        segment.count > 0 ? (
          <path
            key={segment.color}
            d={arcPath(segment.start, segment.end, RADIUS)}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        ) : null,
      )}

      <text
        x={CENTER}
        y={CENTER + 5}
        textAnchor="middle"
        className="fill-[#F1F5FF] font-mono text-[30px] font-bold"
      >
        {solved}
      </text>

      <text
        x={CENTER}
        y={CENTER + 20}
        textAnchor="middle"
        className="fill-[#9AA8C7] font-mono text-[10px]"
      >
        Solved
      </text>

      <text
        x={CENTER}
        y={SIZE - 8}
        textAnchor="middle"
        className="fill-[#8593B2] font-mono text-[9px]"
      >
        {easy} E · {medium} M · {hard} H
      </text>
    </svg>
  );
}
