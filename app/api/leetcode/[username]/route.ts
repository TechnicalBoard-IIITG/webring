import { NextResponse } from "next/server";

import { getLeetCodeProfile } from "@/lib/leetcode";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const result = await getLeetCodeProfile(username);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "not-found" ? "User not found" : "Failed to fetch LeetCode data" },
      { status: result.reason === "not-found" ? 404 : 502 },
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
