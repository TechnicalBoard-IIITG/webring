import type { ActivityDay } from "@/types/activity";
import { timestampToDateKey } from "@/lib/activity";
import { cached } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import type { ProviderResult } from "@/lib/provider";

const GRAPHQL_URL = "https://leetcode.com/graphql";
const CACHE_TTL_MS = 20 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 1000;

const PROFILE_QUERY = `
  query userProfile($username: String!, $previousYear: Int!) {
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
      previousCalendar: userCalendar(year: $previousYear) {
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
      previousCalendar?: { submissionCalendar?: string } | null;
    } | null;
  } | null;

  errors?: unknown;
}

export function parseLeetCodeCalendar(raw: string): ActivityDay[] {
  const calendar:unknown = JSON.parse(raw);
  if(!calendar||typeof calendar!=='object'||Array.isArray(calendar))throw Error('Invalid LeetCode calendar');
  const days=new Map<string,number>();
  for(const [timestamp,count] of Object.entries(calendar)){
    const seconds=Number(timestamp);
    if(!Number.isSafeInteger(seconds)||typeof count!=='number'||!Number.isSafeInteger(count)||count<0)throw Error('Invalid LeetCode activity');
    const date=timestampToDateKey(seconds);
    days.set(date,(days.get(date)||0)+count);
  }
  return [...days].map(([date,count])=>({date,count})).sort((a,b)=>a.date.localeCompare(b.date));
}

export function getLeetCodeProfile(
  username: string,
): Promise<ProviderResult<LeetCodeProfile>> {
  return cached(
    `leetcode:profile:${new Date().getUTCFullYear()}:${username.toLowerCase()}`,
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
            variables: { username, previousYear:new Date().getUTCFullYear()-1 },
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
        // An absent calendar is a provider failure, not a year of zero submissions.
        if(typeof user.userCalendar?.submissionCalendar!=='string')return {ok:false,reason:'unavailable'};
        const calendar=new Map<string,number>();
        for(const day of parseLeetCodeCalendar(user.previousCalendar?.submissionCalendar || '{}'))calendar.set(day.date,day.count);
        for(const day of parseLeetCodeCalendar(user.userCalendar.submissionCalendar))calendar.set(day.date,day.count);

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
            calendar: [...calendar].map(([date,count])=>({date,count})).sort((a,b)=>a.date.localeCompare(b.date)),
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
