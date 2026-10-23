import { NextResponse } from "next/server";

import members from "@/data/members.json";
import type { Member } from "@/types/member";
import { buildLeaderboard } from "@/lib/leaderboard";

export const maxDuration = 60;

export async function GET() {
  try {
    const data = await buildLeaderboard(members as Member[]);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);

    return NextResponse.json(
      { error: "Failed to build the leaderboard" },
      { status: 500 },
    );
  }
}
