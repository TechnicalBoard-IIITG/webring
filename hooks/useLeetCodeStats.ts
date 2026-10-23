"use client";

import { useEffect, useState } from "react";

export interface LeetCodeStats {
  solved: number;
  easy: number;
  medium: number;
  hard: number;
}

interface LoadedStats {
  username: string;
  stats: LeetCodeStats;
}

export function useLeetCodeStats(username?: string) {
  const [loaded, setLoaded] = useState<LoadedStats | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    const controller = new AbortController();

    fetch(`/api/leetcode/${encodeURIComponent(username)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch LeetCode stats");
        }

        return response.json() as Promise<LeetCodeStats>;
      })
      .then((stats) => {
        if (controller.signal.aborted) return;

        setFailedFor(null);
        setLoaded({ username, stats });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailedFor(username);
        }
      });

    return () => controller.abort();
  }, [username]);

  const stats = loaded && loaded.username === username ? loaded.stats : null;
  const loading =
    Boolean(username) && stats === null && failedFor !== username;

  return {
    stats,
    loading,
    error: Boolean(username) && failedFor === username,
  };
}
