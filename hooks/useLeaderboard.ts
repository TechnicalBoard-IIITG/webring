"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LeaderboardData } from "@/types/leaderboard";

export type {
  LeaderboardBoard,
  LeaderboardEntry,
  LeaderboardData,
} from "@/types/leaderboard";

async function requestLeaderboard(
  mode: "initial" | "refresh",
  signal: AbortSignal,
): Promise<LeaderboardData> {
  const query = mode === "refresh" ? `?t=${Date.now()}` : "";
  const response = await fetch(`/api/leaderboard${query}`, { signal });

  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }

  return (await response.json()) as LeaderboardData;
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    requestLeaderboard("initial", controller.signal)
      .then((json) => {
        if (controller.signal.aborted) return;

        setData(json);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const refresh = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setRefreshing(true);

    requestLeaderboard("refresh", controller.signal)
      .then((json) => {
        if (controller.signal.aborted) return;

        setData(json);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;

        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  return { data, loading, refreshing, error, refresh };
}
