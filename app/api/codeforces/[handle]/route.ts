import { NextResponse } from "next/server";

import {
  CODEFORCES_HANDLE_PATTERN,
  getCodeforcesActivity,
} from "@/lib/codeforces";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;

  if (!CODEFORCES_HANDLE_PATTERN.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const result = await getCodeforcesActivity(handle);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "not-found" ? "Handle not found" : "Failed to fetch Codeforces data" },
      { status: result.reason === "not-found" ? 404 : 502 },
    );
  }

  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
