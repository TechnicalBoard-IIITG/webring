"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { buildActivityCalendar } from "@/lib/activity-calendar";

import type { ActivityDay } from "@/types/activity";

const CELL_SIZE = 10;
const GAP = 3;
const LEVEL_ALPHAS = [0, 0.35, 0.55, 0.78, 1];

interface ActivityHeatmapProps {
  days: ActivityDay[];
  loading: boolean;
  error: boolean;
  accent: string;
  unit: string;
  emptyMessage: string;
  errorMessage: string;
  footnote?: string;
  label?: string;
  onRetry?: () => void;
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
  days, loading, error, accent, unit, emptyMessage, errorMessage, footnote,
  label = "Activity", onRetry,
}: ActivityHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendar = useMemo(() => buildActivityCalendar(days), [days]);
  const { weeks, months, maxCount, total, activeDays, longestStreak } = calendar;
  const pitch = CELL_SIZE + GAP;
  const left = 28;
  const top = 20;
  const width = left + weeks.length * pitch;
  const height = top + 7 * pitch;
  const singular = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  const frame = "w-full min-w-0 border border-[#34465F] bg-[#121826] p-3 font-mono sm:p-4";
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!loading && !error && scroller) scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth;
  }, [days, loading, error]);

  if (loading) return (
    <section aria-label={label} aria-busy="true" className={frame}>
      <p role="status" className="mb-4 text-xs text-[#A8B9D4]">Loading activity...</p>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="mb-4 h-5 w-36 bg-[#233046]" />
        <div className="h-24 w-full bg-[#1A2333]" />
        <div className="mt-3 h-3 w-28 bg-[#233046]" />
      </div>
    </section>
  );

  if (error) return (
    <section aria-label={label} className={`${frame} flex min-h-48 flex-col items-start justify-center gap-3`}>
      <p role="alert" className="text-sm text-[#C3D0E7]">{errorMessage}</p>
      {onRetry && <button type="button" onClick={onRetry} className="min-h-11 cursor-pointer border border-[#40546E] sm:min-h-0 px-3 py-2 text-xs text-[#D4DDF0] transition-colors hover:border-[#8BC5FF] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF]">Try again</button>}
    </section>
  );

  return (
    <section aria-label={label} className={frame}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-[#D4DDF0]"><span className="text-xl font-bold" style={{color:accent}}>{total.toLocaleString()}</span> {total === 1 ? singular : unit}</p>
          <p className="mt-1 text-xs text-[#9AA8C7] sm:text-[10px]">Last 365 days / UTC</p>
        </div>
        <dl className="flex flex-wrap gap-5 text-xs text-[#9AA8C7] sm:text-[10px]">
          <div><dt>Active days</dt><dd className="mt-1 text-sm font-semibold text-[#F1F5FF]">{activeDays}</dd></div>
          <div><dt>Longest streak</dt><dd className="mt-1 text-sm font-semibold text-[#F1F5FF]">{longestStreak} {longestStreak === 1 ? "day" : "days"}</dd></div>
        </dl>
      </div>

      <div ref={scrollRef} className="max-w-full overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BC5FF]" tabIndex={0} role="region" aria-label={`${label} calendar, ${calendar.startKey} to ${calendar.endKey}. Scroll horizontally to see all dates.`}>
        <div className="min-w-[var(--calendar-width)] sm:min-w-[480px]" style={{"--calendar-width":`${width}px`} as CSSProperties}>
          <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={`${total} ${unit} across ${activeDays} active days`}>
            {months.map(month => <text key={`${month.name}-${month.weekIndex}`} x={Math.min(left+month.weekIndex*pitch,width-26)} y={10} fill="#A8B9D4" fontSize={9}>{month.name}</text>)}
            {[{day:1,label:"Mon"},{day:3,label:"Wed"},{day:5,label:"Fri"}].map(day=><text key={day.day} x={0} y={top+day.day*pitch+8} fill="#8593B2" fontSize={8}>{day.label}</text>)}
            {weeks.flatMap((week,weekIndex)=>week.map((day,dayIndex)=>day.inRange ? (
              <rect key={day.date} x={left+weekIndex*pitch} y={top+dayIndex*pitch} width={CELL_SIZE} height={CELL_SIZE} rx={1.5} fill={colorFor(day.count,maxCount||1,accent)} stroke="#32435D" strokeWidth={0.5}>
                <title>{`${day.count} ${day.count===1?singular:unit} on ${day.date}`}</title>
              </rect>
            ) : null))}
          </svg>
        </div>
      </div>

      {total===0 && <p className="mt-2 text-xs leading-relaxed text-[#A8B9D4]">{emptyMessage}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#2B3A52] pt-3 text-xs text-[#A8B9D4] sm:text-[10px]">
        {footnote ? <p>{footnote}</p> : <span>{calendar.startKey} / {calendar.endKey}</span>}
        <div aria-hidden="true" className="flex items-center gap-1.5">
          <span>Less</span>
          {[0,1,2,3,4].map(level=><span key={level} className="size-2.5 border border-[#32435D]" style={{backgroundColor:level===0?"#121826":shade(accent,LEVEL_ALPHAS[level])}} />)}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
