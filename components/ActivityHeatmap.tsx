"use client";

import { useMemo } from "react";

import type { ActivityDay } from "@/types/activity";

const CELL_SIZE = 10;
const GAP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LEVEL_ALPHAS = [0, 0.22, 0.42, 0.66, 1];

interface ActivityHeatmapProps {
  days: ActivityDay[];
  loading: boolean;
  error: boolean;
  accent: string;
  unit: string;
  emptyMessage: string;
  errorMessage: string;
  footnote?: string;
}

interface WeekDay {
  date: string;
  count: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!match) return null;

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

function shade(accent: string, alpha: number): string {
  const rgb = hexToRgb(accent);

  if (!rgb) return accent;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function colorFor(count: number, max: number, accent: string): string {
  if (count <= 0) return "#121826";

  const ratio = max > 0 ? count / max : 0;
  const level = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;

  return shade(accent, LEVEL_ALPHAS[level]);
}

export default function ActivityHeatmap({
  days,
  loading,
  error,
  accent,
  unit,
  emptyMessage,
  errorMessage,
  footnote,
}: ActivityHeatmapProps) {
  const { weeks, months, maxCount, total } = useMemo(() => {
    const counts = new Map(days.map((day) => [day.date, day.count]));

    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);

    const rangeStart = new Date(end.getTime() - (YEAR_DAYS - 1) * DAY_MS);
    const rangeStartKey = rangeStart.toISOString().slice(0, 10);

    // Start on the Sunday before the range so every row is a weekday.
    const gridStart = new Date(rangeStart);
    gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

    const groupedWeeks: WeekDay[][] = [];
    const monthLabels: Array<{ name: string; weekIndex: number }> = [];

    let max = 0;
    let sum = 0;
    let lastMonth = -1;

    const cursor = new Date(gridStart);

    while (cursor.getTime() <= end.getTime()) {
      const week: WeekDay[] = [];

      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(cursor.getTime() + offset * DAY_MS);
        const date = day.toISOString().slice(0, 10);
        const count = counts.get(date) ?? 0;

        week.push({ date, count });

        if (date >= rangeStartKey && day.getTime() <= end.getTime()) {
          max = Math.max(max, count);
          sum += count;
        }
      }

      const month = new Date(`${week[0].date}T00:00:00Z`).getUTCMonth();

      if (month !== lastMonth) {
        monthLabels.push({ name: MONTHS[month], weekIndex: groupedWeeks.length });
        lastMonth = month;
      }

      groupedWeeks.push(week);
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return {
      weeks: groupedWeeks,
      months: monthLabels,
      maxCount: max,
      total: sum,
    };
  }, [days]);

  if (loading) {
    return (
      <p className="font-mono text-sm text-[#6E7F9E]">Loading activity…</p>
    );
  }

  if (error) {
    return <p className="font-mono text-sm text-[#6E7F9E]">{errorMessage}</p>;
  }

  if (total === 0) {
    return <p className="font-mono text-sm text-[#6E7F9E]">{emptyMessage}</p>;
  }

  const singular = unit.endsWith("s") ? unit.slice(0, -1) : unit;

  return (
    <div className="w-full min-w-0">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-fit">
          <div
            className="relative mb-2 h-5"
            style={{ width: `${weeks.length * (CELL_SIZE + GAP) - GAP}px` }}
          >
            {months.map((month) => (
              <span
                key={`${month.name}-${month.weekIndex}`}
                className="absolute font-mono text-xs text-[#9AA8C7]"
                style={{ left: `${month.weekIndex * (CELL_SIZE + GAP)}px` }}
              >
                {month.name}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: `${GAP}px` }}>
            {weeks.map((week) => (
              <div
                key={week[0].date}
                className="flex flex-col"
                style={{ gap: `${GAP}px` }}
              >
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.count} ${day.count === 1 ? singular : unit} on ${day.date}`}
                    className="rounded-[2px] transition-transform duration-150 hover:scale-125"
                    style={{
                      width: `${CELL_SIZE}px`,
                      height: `${CELL_SIZE}px`,
                      backgroundColor: colorFor(day.count, maxCount || 1, accent),
                      boxShadow: "inset 0 0 0 0.5px #2B3A52",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 font-mono text-sm text-[#9AA8C7]">
          {total.toLocaleString()} {unit} in the last year
          {footnote ? (
            <span className="text-[#6E7F9E]"> · {footnote}</span>
          ) : null}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs text-[#9AA8C7]">Less</span>

          <div className="flex gap-[3px]">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="rounded-[2px]"
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  backgroundColor:
                    level === 0
                      ? "#121826"
                      : shade(accent, LEVEL_ALPHAS[level]),
                }}
              />
            ))}
          </div>

          <span className="font-mono text-xs text-[#9AA8C7]">More</span>
        </div>
      </div>
    </div>
  );
}
