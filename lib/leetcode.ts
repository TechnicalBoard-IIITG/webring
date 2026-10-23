import type { ActivityDay } from "@/types/activity";
import { timestampToDateKey } from "@/lib/activity";
import { cached } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import type { ProviderResult } from "@/lib/provider";

const GRAPHQL_URL = "https://leetcode.com/graphql";
const CACHE_TTL_MS = 20 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 1000;

const PROFILE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }

      userCalendar {
        streak
        totalActiveDays
        submissionCalendar
      }
    }
  }
`;

export interface LeetCodeProfile {
  solved: number;
  easy: number;
  medium: number;
  hard: number;
  streak: number;
  totalActiveDays: number;
  calendar: ActivityDay[];
}

interface ProfileResponse {
  data?: {
    matchedUser?: {
      submitStatsGlobal?: {
        acSubmissionNum?: Array<{ difficulty?: string; count?: number }>;
      } | null;

      userCalendar?: {
        streak?: number;
        totalActiveDays?: number;
        submissionCalendar?: string;
      } | null;
    } | null;
  } | null;

  errors?: unknown;
}

function parseCalendar(raw?: string): ActivityDay[] {
  if (!raw) return [];

  try {
    const calendar = JSON.parse(raw) as Record<string, unknown>;

    return Object.entries(calendar)
      .flatMap(([timestamp, count]) => {
        const seconds = Number(timestamp);
        const value = Number(count);

        if (!Number.isFinite(seconds) || !Number.isFinite(value)) return [];

        return [{ date: timestampToDateKey(seconds), count: value }];
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export function getLeetCodeProfile(
  username: string,
): Promise<ProviderResult<LeetCodeProfile>> {
  return cached(
    `leetcode:profile:${username.toLowerCase()}`,
    CACHE_TTL_MS,
    async () => {
      try {
        const payload = await fetchJson<ProfileResponse>(GRAPHQL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Referer: "https://leetcode.com",
          },
          body: JSON.stringify({
            query: PROFILE_QUERY,
            variables: { username },
          }),
          timeoutMs: 10_000,
        });

        if (
          payload.errors &&
          (!Array.isArray(payload.errors) || payload.errors.length > 0)
        ) {
          return { ok: false, reason: "unavailable" };
        }

        const user = payload.data?.matchedUser;

        if (!user) {
          return { ok: false, reason: "not-found" };
        }

        const stats = user.submitStatsGlobal?.acSubmissionNum ?? [];
        const countFor = (difficulty: string) =>
          stats.find((entry) => entry.difficulty === difficulty)?.count ?? 0;

        return {
          ok: true,
          data: {
            solved: countFor("All"),
            easy: countFor("Easy"),
            medium: countFor("Medium"),
            hard: countFor("Hard"),
            streak: user.userCalendar?.streak ?? 0,
            totalActiveDays: user.userCalendar?.totalActiveDays ?? 0,
            calendar: parseCalendar(user.userCalendar?.submissionCalendar),
          },
        };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
    {
      ttlFor: (result) =>
        result.ok ? CACHE_TTL_MS : FAILURE_CACHE_TTL_MS,
    },
  );
}
