export type LeaderboardBoardId = "github" | "leetcode" | "codeforces";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  github: string;
  year: number;
  count: number;
  detail?: string;
  profileUrl: string;
}

export interface LeaderboardBoard {
  id: LeaderboardBoardId;
  metric: string;
  windowLabel: string;
  eligible: number;
  unavailable: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardData {
  boards: LeaderboardBoard[];
  members: number;
  updatedAt: string;
}
