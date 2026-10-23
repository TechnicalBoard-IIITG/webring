export const CODEFORCES_RANK_COLORS: Record<string, string> = {
  newbie: "#9AA8C7",
  pupil: "#4CAF50",
  specialist: "#2EC4B6",
  expert: "#5B8CFF",
  "candidate master": "#C77DFF",
  master: "#FFA116",
  "international master": "#FFA116",
  grandmaster: "#FF5C5C",
  "international grandmaster": "#FF5C5C",
  "legendary grandmaster": "#FF5C5C",
};

export function codeforcesRankColor(
  rank: string | null | undefined,
): string | null {
  if (!rank) return null;

  return CODEFORCES_RANK_COLORS[rank.toLowerCase()] ?? "#9AA8C7";
}
