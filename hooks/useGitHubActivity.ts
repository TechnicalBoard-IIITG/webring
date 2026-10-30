"use client";
import type { ActivityDay } from '@/types/activity';
import { useActivityResource } from './useActivityResource';
export function useGitHubActivity(username?:string){
 return useActivityResource<{calendar:ActivityDay[]}>(username?`/api/github/${encodeURIComponent(username)}`:null);
}
