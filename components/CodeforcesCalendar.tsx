"use client";

import ActivityHeatmap from "@/components/ActivityHeatmap";
import { useCodeforces } from "@/hooks/useCodeforces";
import type { ActivityDay } from "@/types/activity";

const EMPTY_DAYS: ActivityDay[] = [];

interface CodeforcesCalendarProps {
  handle?: string;
}

export default function CodeforcesCalendar({ handle }: CodeforcesCalendarProps) {
  const { data, loading, error } = useCodeforces(handle);

  if (!handle) return null;

  return (
    <ActivityHeatmap
      days={data?.calendar ?? EMPTY_DAYS}
      loading={loading}
      error={error}
      accent="#E05B5B"
      unit="submissions"
      emptyMessage="No Codeforces submissions in the last year."
      errorMessage="Couldn't load Codeforces activity."
      footnote={
        data ? `${data.acceptedSubmissions} accepted` : undefined
      }
    />
  );
}
