import { cached } from "@/lib/cache";
import type { Member } from "@/types/member";
export function getMembers(): Promise<Member[]> {return cached("directory:all-public",15000,readMembers)}
async function readMembers(): Promise<Member[]> {
  const base = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const members:Member[]=[];
  for(let page=1;;page++){
    const response=await fetch(`${base}/api/members?limit=200&page=${page}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`Member API returned ${response.status}`);
    const result=await response.json() as {items:Member[];total:number};
    if(!Array.isArray(result.items))throw Error('Unexpected member response');
    members.push(...result.items);
    if(members.length>=result.total||result.items.length===0)break;
  }
  return members;
}
