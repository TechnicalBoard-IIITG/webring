"use client";

import { useActivityResource } from "./useActivityResource";

import type { ActivityDay } from "@/types/activity";

export interface LeetCodeCalendarData {
  calendar: ActivityDay[];
  solved: number;
  easy: number;
  medium: number;
  hard: number;
}

export function useLeetCodeCalendar(username?: string) {
  return useActivityResource<LeetCodeCalendarData>(username ? `/api/leetcode/${encodeURIComponent(username)}` : null);
}
