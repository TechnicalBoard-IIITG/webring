"use client";

import { useActivityResource } from "./useActivityResource";

import type { ActivityDay } from "@/types/activity";

export interface CodeforcesActivity {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  calendar: ActivityDay[];
  totalSubmissions: number;
  acceptedSubmissions: number;
}

export function useCodeforces(handle?: string) {
  return useActivityResource<CodeforcesActivity>(handle ? `/api/codeforces/${encodeURIComponent(handle)}` : null);
}
