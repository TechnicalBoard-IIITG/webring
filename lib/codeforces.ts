import type { ActivityDay } from "@/types/activity";
import { delay } from "@/lib/async";
import { timestampToDateKey } from "@/lib/activity";
import { cached } from "@/lib/cache";
import { fetchJson, HttpError } from "@/lib/http";
import type { ProviderResult } from "@/lib/provider";

const API_URL = "https://codeforces.com/api";
const INFO_CACHE_TTL_MS = 60 * 60 * 1000;
const ACTIVITY_CACHE_TTL_MS = 20 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 1000;

const YEAR_SECONDS = 365 * 24 * 60 * 60;
const PAGE_SIZE = 1000;
const MAX_PAGES = 6;
const HANDLES_PER_REQUEST = 100;

// Codeforces asks clients to stay around one request per two seconds.
const MIN_REQUEST_SPACING_MS = 1_100;
let nextRequestAt = 0;

export const CODEFORCES_HANDLE_PATTERN = /^[A-Za-z0-9_.-]{3,24}$/;

export interface CodeforcesProfile {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
}

export interface CodeforcesActivity extends CodeforcesProfile {
  calendar: ActivityDay[];
  totalSubmissions: number;
  acceptedSubmissions: number;
}

interface CodeforcesEnvelope<T> {
  status: "OK" | "FAILED";
  result?: T;
  comment?: string;
}

interface CodeforcesUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
}

interface CodeforcesSubmission {
  creationTimeSeconds: number;
  verdict?: string;
}

async function request<T>(path: string, timeoutMs = 12_000): Promise<T> {
  const now = Date.now();
  const waitMs = Math.max(0, nextRequestAt - now);

  nextRequestAt = Math.max(now, nextRequestAt) + MIN_REQUEST_SPACING_MS;

  if (waitMs > 0) await delay(waitMs);

  const payload = await fetchJson<CodeforcesEnvelope<T>>(`${API_URL}/${path}`, {
    timeoutMs,
  });

  if (payload.status !== "OK" || payload.result === undefined) {
    throw new Error(payload.comment ?? "Codeforces request failed");
  }

  return payload.result;
}

/** Extracts the offending handle from a `user.info` failure. */
function findMissingHandle(error: unknown): string | null {
  if (!(error instanceof HttpError)) return null;

  try {
    const payload = JSON.parse(error.body) as { comment?: string };
    const match = payload.comment?.match(/User with handle (.+?) not found/);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchUserInfo(handles: string[]): Promise<CodeforcesUserInfo[]> {
  let pending = [...handles];
  const users: CodeforcesUserInfo[] = [];

  // Codeforces rejects the whole batch when one handle is invalid, so drop
  // the reported handle and retry with the rest.
  for (let attempt = 0; attempt < 5 && pending.length > 0; attempt++) {
    try {
      const batch = await request<CodeforcesUserInfo[]>(
        `user.info?handles=${pending.map(encodeURIComponent).join(";")}`,
      );

      users.push(...batch);
      pending = [];
    } catch (error) {
      const missing = findMissingHandle(error);

      if (!missing) throw error;

      const index = pending.findIndex(
        (handle) => handle.toLowerCase() === missing.toLowerCase(),
      );

      if (index === -1) throw error;

      pending.splice(index, 1);
    }
  }

  return users;
}

function toProfileMap(
  users: readonly CodeforcesUserInfo[],
): Map<string, CodeforcesProfile> {
  const profiles = new Map<string, CodeforcesProfile>();

  for (const user of users) {
    profiles.set(user.handle.toLowerCase(), {
      handle: user.handle,
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rank: user.rank ?? null,
      maxRank: user.maxRank ?? null,
    });
  }

  return profiles;
}

/**
 * Fetches ratings for many handles in as few requests as possible.
 * Keys of the returned map are lowercase handles.
 */
export function getCodeforcesProfiles(
  handles: readonly string[],
): Promise<ProviderResult<Map<string, CodeforcesProfile>>> {
  const unique = Array.from(
    new Map(
      handles
        .filter((handle) => CODEFORCES_HANDLE_PATTERN.test(handle))
        .map((handle) => [handle.toLowerCase(), handle]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const cacheKey = `codeforces:info:${unique.map((handle) => handle.toLowerCase()).join(";")}`;

  return cached<ProviderResult<Map<string, CodeforcesProfile>>>(
    cacheKey,
    INFO_CACHE_TTL_MS,
    async () => {
      if (unique.length === 0) {
        return { ok: true, data: new Map() };
      }

      try {
        const users: CodeforcesUserInfo[] = [];

        for (let index = 0; index < unique.length; index += HANDLES_PER_REQUEST) {
          users.push(
            ...(await fetchUserInfo(
              unique.slice(index, index + HANDLES_PER_REQUEST),
            )),
          );
        }

        return { ok: true, data: toProfileMap(users) };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
    {
      ttlFor: (result) =>
        result.ok ? INFO_CACHE_TTL_MS : FAILURE_CACHE_TTL_MS,
    },
  );
}

export async function getCodeforcesProfile(
  handle: string,
): Promise<ProviderResult<CodeforcesProfile>> {
  const result = await getCodeforcesProfiles([handle]);

  if (!result.ok) return result;

  const profile = result.data.get(handle.toLowerCase());

  return profile ? { ok: true, data: profile } : { ok: false, reason: "not-found" };
}

async function fetchSubmissions(
  handle: string,
  cutoff: number,
): Promise<CodeforcesSubmission[]> {
  const submissions: CodeforcesSubmission[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE + 1;
    const batch = await request<CodeforcesSubmission[]>(
      `user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${PAGE_SIZE}`,
    );

    if (batch.length === 0) break;

    submissions.push(...batch);

    const oldest = batch[batch.length - 1];

    if (
      batch.length < PAGE_SIZE ||
      oldest.creationTimeSeconds < cutoff
    ) {
      break;
    }
  }

  return submissions;
}

export function getCodeforcesActivity(
  handle: string,
): Promise<ProviderResult<CodeforcesActivity>> {
  return cached<ProviderResult<CodeforcesActivity>>(
    `codeforces:activity:${handle.toLowerCase()}`,
    ACTIVITY_CACHE_TTL_MS,
    async () => {
      const profile = await getCodeforcesProfile(handle);

      if (!profile.ok) return profile;

      const cutoff = Math.floor(Date.now() / 1000) - YEAR_SECONDS;

      try {
        const submissions = await fetchSubmissions(handle, cutoff);
        const counts = new Map<string, number>();
        let acceptedSubmissions = 0;

        for (const submission of submissions) {
          if (submission.creationTimeSeconds < cutoff) continue;

          const date = timestampToDateKey(submission.creationTimeSeconds);

          counts.set(date, (counts.get(date) ?? 0) + 1);

          if (submission.verdict === "OK") acceptedSubmissions++;
        }

        const calendar = [...counts.entries()]
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const totalSubmissions = calendar.reduce(
          (total, day) => total + day.count,
          0,
        );

        return {
          ok: true,
          data: {
            ...profile.data,
            calendar,
            totalSubmissions,
            acceptedSubmissions,
          },
        };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
    {
      ttlFor: (result) =>
        result.ok ? ACTIVITY_CACHE_TTL_MS : FAILURE_CACHE_TTL_MS,
    },
  );
}
