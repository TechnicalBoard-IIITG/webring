import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members-data";
export async function GET(req:NextRequest) {
 if(!req.nextUrl.searchParams.has('paged')) return NextResponse.json(await getMembers(), {headers:{'Cache-Control':'no-store'}});
 try {
  const base=process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const query=new URLSearchParams(req.nextUrl.searchParams); query.delete('paged');
  const response=await fetch(`${base}/api/members?${query}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:'Member directory unavailable. Please retry.'},{status:503}); }
}
