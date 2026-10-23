"use client";

import { useEffect, useState } from "react";

import type { CodeforcesRating } from "@/types/codeforces";

export type CodeforcesRatings = Record<string, CodeforcesRating>;

export function useCodeforcesRatings(): CodeforcesRatings {
  const [ratings, setRatings] = useState<CodeforcesRatings>({});

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/codeforces/ratings", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch Codeforces ratings");
        }

        return response.json() as Promise<CodeforcesRatings>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRatings(data);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return ratings;
}
