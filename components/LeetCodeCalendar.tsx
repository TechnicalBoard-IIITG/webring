"use client";

import ActivityHeatmap from "@/components/ActivityHeatmap";
import { useLeetCodeCalendar } from "@/hooks/useLeetCodeCalendar";
import type { ActivityDay } from "@/types/activity";

const EMPTY_DAYS: ActivityDay[] = [];

interface LeetCodeCalendarProps {
  username?: string;
}

export default function LeetCodeCalendar({ username }: LeetCodeCalendarProps) {
  const { data, loading, error } = useLeetCodeCalendar(username);

  if (!username) return null;

  return (
    <ActivityHeatmap
      days={data?.calendar ?? EMPTY_DAYS}
      loading={loading}
      error={error}
      accent="#FFA116"
      unit="submissions"
      emptyMessage="No LeetCode activity in the last year."
      errorMessage="Couldn't load LeetCode activity."
      footnote={data ? `${data.solved} solved` : undefined}
    />
  );
}
