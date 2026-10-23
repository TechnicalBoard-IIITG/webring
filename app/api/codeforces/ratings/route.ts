import { NextResponse } from "next/server";

import members from "@/data/members.json";
import { getCodeforcesProfiles } from "@/lib/codeforces";
import type { CodeforcesRating } from "@/types/codeforces";
import type { Member } from "@/types/member";

export const maxDuration = 30;

export async function GET() {
  const handles = Array.from(
    new Set(
      (members as Member[])
        .map((member) => member.codeforces)
        .filter((handle): handle is string => Boolean(handle)),
    ),
  );

  const result = await getCodeforcesProfiles(handles);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Codeforces ratings" },
      { status: 502 },
    );
  }

  const ratings: Record<string, CodeforcesRating> = {};

  for (const handle of handles) {
    const profile = result.data.get(handle.toLowerCase());

    ratings[handle] = {
      rating: profile?.rating ?? null,
      rank: profile?.rank ?? null,
    };
  }

  return NextResponse.json(ratings, {
    headers: {
      "Cache-Control":
        "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
