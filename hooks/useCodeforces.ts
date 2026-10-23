"use client";

import { useEffect, useState } from "react";

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

interface LoadedActivity {
  handle: string;
  data: CodeforcesActivity;
}

export function useCodeforces(handle?: string) {
  const [loaded, setLoaded] = useState<LoadedActivity | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;

    const controller = new AbortController();

    fetch(`/api/codeforces/${encodeURIComponent(handle)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch Codeforces activity");
        }

        return response.json() as Promise<CodeforcesActivity>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;

        setFailedFor(null);
        setLoaded({ handle, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailedFor(handle);
        }
      });

    return () => controller.abort();
  }, [handle]);

  const data = loaded && loaded.handle === handle ? loaded.data : null;
  const loading =
    Boolean(handle) && data === null && failedFor !== handle;

  return {
    data,
    loading,
    error: Boolean(handle) && failedFor === handle,
  };
}
