"use client";

import { useEffect, useState } from "react";

import type { ActivityDay } from "@/types/activity";

export interface LeetCodeCalendarData {
  calendar: ActivityDay[];
  solved: number;
  easy: number;
  medium: number;
  hard: number;
}

interface LoadedCalendar {
  username: string;
  data: LeetCodeCalendarData;
}

export function useLeetCodeCalendar(username?: string) {
  const [loaded, setLoaded] = useState<LoadedCalendar | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    const controller = new AbortController();

    fetch(`/api/leetcode/${encodeURIComponent(username)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch LeetCode activity");
        }

        return response.json() as Promise<LeetCodeCalendarData>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;

        setFailedFor(null);
        setLoaded({ username, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailedFor(username);
        }
      });

    return () => controller.abort();
  }, [username]);

  const data = loaded && loaded.username === username ? loaded.data : null;
  const loading =
    Boolean(username) && data === null && failedFor !== username;

  return {
    data,
    loading,
    error: Boolean(username) && failedFor === username,
  };
}
