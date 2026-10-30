import { NextResponse } from 'next/server';
import { getGithubActivity } from '@/lib/github';

export async function GET(_request:Request,{params}:{params:Promise<{username:string}>}){
 const {username}=await params;
 if(!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(username))return NextResponse.json({error:'Invalid GitHub username'},{status:400});
 const result=await getGithubActivity(username);
 if(!result.ok)return NextResponse.json({error:'GitHub activity unavailable'},{status:result.reason==='not-found'?404:502});
 return NextResponse.json({calendar:result.data},{headers:{'Cache-Control':'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'}});
}
