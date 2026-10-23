import type { ActivityDay } from "@/types/activity";
import { cached } from "@/lib/cache";
import { fetchText } from "@/lib/http";
import type { ProviderResult } from "@/lib/provider";

const CONTRIBUTIONS_URL = "https://github.com/users";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 60 * 1000;

// GitHub renders one cell per day, followed by a tooltip with the count:
//   <td ... data-date="2026-10-22" ...></td>
//   <tool-tip ...>5 contributions on October 22nd.</tool-tip>
const DAY_PATTERN =
  /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*><\/td>\s*<tool-tip[^>]*>([^<]+)<\/tool-tip>/g;

// A partial calendar means the markup changed or the account is private.
const MINIMUM_DAYS = 300;

export function parseGitHubContributions(html: string): ActivityDay[] {
  const counts = new Map<string, number>();

  for (const match of html.matchAll(DAY_PATTERN)) {
    const date = match[1];
    const label = match[2].replace(/,/g, "").trim();
    const count = /^No contributions/i.test(label)
      ? 0
      : Number.parseInt(label, 10);

    if (Number.isFinite(count)) {
      counts.set(date, count);
    }
  }

  if (counts.size < MINIMUM_DAYS) return [];

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Daily GitHub contributions for the last year, scraped from the same
 * public contribution graph that GitHub renders on a profile. Using the
 * HTML endpoint avoids the community JSON proxy's 10-requests-per-10s cap.
 */
export function getGithubActivity(
  username: string,
): Promise<ProviderResult<ActivityDay[]>> {
  return cached<ProviderResult<ActivityDay[]>>(
    `github:activity:${username.toLowerCase()}`,
    CACHE_TTL_MS,
    async () => {
      try {
        const html = await fetchText(
          `${CONTRIBUTIONS_URL}/${encodeURIComponent(username)}/contributions`,
          { timeoutMs: 12_000 },
        );

        const days = parseGitHubContributions(html);

        return days.length > 0
          ? { ok: true, data: days }
          : { ok: false, reason: "unavailable" };
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
