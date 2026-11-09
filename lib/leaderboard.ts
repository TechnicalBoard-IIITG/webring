import type { Member } from "@/types/member";
import type {
  LeaderboardBoard,
  LeaderboardBoardId,
  LeaderboardData,
  LeaderboardEntry,
  LeetCodeDifficulty,
  LeetCodeLeaderboardMode,
} from "@/types/leaderboard";

import { recentDateKeys, sumActivity } from "@/lib/activity";
import { mapWithConcurrency } from "@/lib/async";
import { getCodeforcesProfiles } from "@/lib/codeforces";
import { getGithubActivity } from "@/lib/github";
import { getLeetCodeProfile } from "@/lib/leetcode";

const WEEK_DAYS = 7;
const GITHUB_CONCURRENCY = 5;
const LEETCODE_CONCURRENCY = 4;

interface Candidate {
  member: Member;
  count: number;
  detail?: string;
  profileUrl: string;
}

function formatRank(rank: string | null): string | undefined {
  if (!rank) return undefined;

  return rank.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Competition ranking: equal counts share a rank (1, 1, 3, ...). */
function rankEntries(
  candidates: readonly Candidate[],
): LeaderboardEntry[] {
  const sorted = [...candidates].sort(
    (a, b) => b.count - a.count || a.member.name.localeCompare(b.member.name),
  );

  let previousCount: number | null = null;
  let previousRank = 0;

  return sorted.map((candidate, index) => {
    const rank =
      previousCount !== null && candidate.count === previousCount
        ? previousRank
        : index + 1;

    previousCount = candidate.count;
    previousRank = rank;

    return {
      rank,
      name: candidate.member.name,
      github: candidate.member.github,
      year: candidate.member.year,
      count: candidate.count,
      detail: candidate.detail,
      profileUrl: candidate.profileUrl,
    };
  });
}

function createBoard(
  id: LeaderboardBoardId,
  metric: string,
  windowLabel: string,
  eligible: number,
  unavailable: number,
  candidates: readonly Candidate[],
): LeaderboardBoard {
  return {
    id,
    metric,
    windowLabel,
    eligible,
    unavailable,
    entries: rankEntries(candidates.filter((candidate) => candidate.count > 0)),
  };
}

async function buildGithubBoard(
  members: readonly Member[],
  week: ReadonlySet<string>,
): Promise<LeaderboardBoard> {
  const results = await mapWithConcurrency(
    members.filter(m=>m.github),
    GITHUB_CONCURRENCY,
    async (member) => ({
      member,
      result: await getGithubActivity(member.github),
    }),
  );

  const candidates: Candidate[] = [];
  let unavailable = 0;

  for (const { member, result } of results) {
    if (!result.ok) {
      unavailable++;
      continue;
    }

    candidates.push({
      member,
      count: sumActivity(result.data, week),
      profileUrl: `https://github.com/${member.github}`,
    });
  }

  return createBoard(
    "github",
    "contributions",
    `last ${WEEK_DAYS} days`,
    members.filter(m=>m.github).length,
    unavailable,
    candidates,
  );
}

async function buildLeetCodeBoard(
  members: readonly Member[],
  difficulties: readonly LeetCodeDifficulty[],
  mode: LeetCodeLeaderboardMode,
  week: ReadonlySet<string>,
): Promise<LeaderboardBoard> {
  const eligible = members.filter((member) => member.leetcode);

  if (mode === "solved" && difficulties.length === 0) {
    return createBoard("leetcode", "solved", "total", eligible.length, 0, []);
  }

  const results = await mapWithConcurrency(
    eligible,
    LEETCODE_CONCURRENCY,
    async (member) => ({
      member,
      result: await getLeetCodeProfile(member.leetcode!),
    }),
  );

  const candidates: Candidate[] = [];
  let unavailable = 0;

  for (const { member, result } of results) {
    if (!result.ok) {
      unavailable++;
      continue;
    }

    const count = mode === "submissions"
      ? sumActivity(result.data.calendar, week)
      : difficulties.reduce((total, difficulty) => total + result.data[difficulty], 0);

    candidates.push({
      member,
      count,
      detail:
        result.data.solved > 0
          ? `${result.data.solved} solved total`
          : undefined,
      profileUrl: `https://leetcode.com/u/${encodeURIComponent(member.leetcode!)}/`,
    });
  }

  return createBoard(
    "leetcode",
    mode === "submissions" ? "submissions" : "solved",
    mode === "submissions" ? `last ${WEEK_DAYS} days` : "total",
    eligible.length,
    unavailable,
    candidates,
  );
}

async function buildCodeforcesBoard(
  members: readonly Member[],
): Promise<LeaderboardBoard> {
  const eligible = members.filter((member) => member.codeforces?.trim());
  const handles = eligible.map((member) => member.codeforces!.trim());

  const result = await getCodeforcesProfiles(handles);
  const candidates: Candidate[] = [];
  let unavailable = result.ok ? 0 : eligible.length;

  if (result.ok) {
    for (const member of eligible) {
      const profile = result.data.get(member.codeforces!.trim().toLowerCase());

      if (!profile) {
        unavailable++;
        continue;
      }

      // Unrated accounts are intentionally left out of the rating board.
      if (profile.rating === null) continue;

      candidates.push({
        member,
        count: profile.rating,
        detail: formatRank(profile.rank),
        profileUrl: `https://codeforces.com/profile/${encodeURIComponent(profile.handle)}`,
      });
    }
  }

  return createBoard(
    "codeforces",
    "rating",
    "current",
    eligible.length,
    unavailable,
    candidates,
  );
}

export async function buildLeaderboard(
  members: readonly Member[],
  platform?: LeaderboardBoardId,
  leetcodeDifficulties: readonly LeetCodeDifficulty[] = ["easy", "medium", "hard"],
  leetcodeMode: LeetCodeLeaderboardMode = "solved",
): Promise<LeaderboardData> {
  const week = new Set(recentDateKeys(WEEK_DAYS));

  const builders = {
    github:()=>buildGithubBoard(members,week),
    leetcode:()=>buildLeetCodeBoard(members,leetcodeDifficulties,leetcodeMode,week),
    codeforces:()=>buildCodeforcesBoard(members),
  };
  const selected:LeaderboardBoardId[]=platform?[platform]:['github','leetcode','codeforces'];
  const boards=await Promise.all(selected.map(id=>builders[id]()));

  return {
    boards,
    members: members.length,
    updatedAt: new Date().toISOString(),
  };
}
