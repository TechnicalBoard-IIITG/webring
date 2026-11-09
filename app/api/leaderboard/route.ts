import { NextRequest, NextResponse } from "next/server";

import { getMembers } from "@/lib/members-data";
import type { Member } from "@/types/member";
import { buildLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardBoardId, LeetCodeDifficulty, LeetCodeLeaderboardMode } from '@/types/leaderboard';

export const maxDuration = 60;

const cached = new Map<string,{until:number; data:Awaited<ReturnType<typeof buildLeaderboard>>}>();
const pending = new Map<string,Promise<Awaited<ReturnType<typeof buildLeaderboard>>>>();
export async function GET(req:NextRequest) {
  const year=req.nextUrl.searchParams.get('year');
  const platform=req.nextUrl.searchParams.get('platform');
  const rawDifficulties=req.nextUrl.searchParams.has('leetcodeDifficulties')?req.nextUrl.searchParams.get('leetcodeDifficulties')||'':'easy,medium,hard';
  const leetcodeMode=req.nextUrl.searchParams.get('leetcodeMode')||'solved';
  const requestedDifficulties=rawDifficulties?rawDifficulties.split(','):[];
  const validDifficulties=new Set(['easy','medium','hard']);
  if(!['submissions','solved'].includes(leetcodeMode))return NextResponse.json({error:'Invalid LeetCode mode'},{status:400});
  if(requestedDifficulties.some(value=>!validDifficulties.has(value))||new Set(requestedDifficulties).size!==requestedDifficulties.length)return NextResponse.json({error:'Invalid LeetCode difficulties'},{status:400});
  const leetcodeDifficulties=(['easy','medium','hard'] as const).filter(value=>requestedDifficulties.includes(value));
  if(platform&&!['github','leetcode','codeforces'].includes(platform))return NextResponse.json({error:'Invalid platform'},{status:400});
  if(year && (!/^\d{4}$/.test(year)||Number(year)<2000||Number(year)>2200))return NextResponse.json({error:'Invalid year'},{status:400});
  const key=`${year||'all'}:${platform||'all'}:${leetcodeMode}:${leetcodeDifficulties.join(',')}`;
  try {
    const hit=cached.get(key);
    let data=hit && hit.until>Date.now()?hit.data:undefined;
    if(!data){
      let job=pending.get(key);
      if(!job){job=(async()=>{const members=await getMembers();const result=await buildLeaderboard(members.filter(m=>!year||m.year===Number(year)) as Member[],(platform||undefined) as LeaderboardBoardId|undefined,leetcodeDifficulties as LeetCodeDifficulty[],leetcodeMode as LeetCodeLeaderboardMode);const failed=result.boards.some(b=>b.eligible>0&&b.unavailable>=b.eligible);cached.set(key,{until:Date.now()+(failed?10000:300000),data:result});return result})().finally(()=>pending.delete(key));pending.set(key,job)}
      data=await job;
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": data.boards.some(b=>b.eligible>0&&b.unavailable>=b.eligible)?'no-store':"public, s-maxage=300, stale-while-revalidate=1800",
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
