"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeaderboardBoardId, LeaderboardData, LeetCodeDifficulty, LeetCodeLeaderboardMode } from "@/types/leaderboard";
export type { LeaderboardBoard, LeaderboardEntry, LeaderboardData } from "@/types/leaderboard";

const platforms:LeaderboardBoardId[]=['github','leetcode','codeforces'];
const DEFAULT_LEETCODE_DIFFICULTIES:readonly LeetCodeDifficulty[]=['easy','medium','hard'];
const initialLoading={github:true,leetcode:true,codeforces:true};
const initialErrors={github:false,leetcode:false,codeforces:false};

export function useLeaderboard(year:number | "All" = "All", leetcodeDifficulties:readonly LeetCodeDifficulty[] = DEFAULT_LEETCODE_DIFFICULTIES, leetcodeMode:LeetCodeLeaderboardMode = "solved") {
  const [data,setData]=useState<LeaderboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [loadingBoards,setLoadingBoards]=useState(initialLoading);
  const [failedBoards,setFailedBoards]=useState(initialErrors);
  const controllerRef=useRef<AbortController|null>(null);
  const dataRef=useRef(data);
  useEffect(()=>{dataRef.current=data},[data]);

  const load=useCallback((mode:'initial'|'refresh')=>{
    controllerRef.current?.abort();
    const controller=new AbortController();controllerRef.current=controller;
    if(mode==='initial'){
      const hasData=Boolean(dataRef.current);
      setLoading(!hasData);
      setLoadingBoards(hasData?{github:false,leetcode:false,codeforces:false}:initialLoading);
    }else setRefreshing(true);
    setFailedBoards(initialErrors);
    // Each panel settles independently: one slow provider cannot block the others.
    void Promise.allSettled(platforms.map(async platform=>{
      const query=new URLSearchParams({platform});if(year!=='All')query.set('year',String(year));if(platform==='leetcode'){query.set('leetcodeDifficulties',leetcodeDifficulties.join(','));query.set('leetcodeMode',leetcodeMode)}if(mode==='refresh')query.set('t',String(Date.now()));
      try{
        const response=await fetch(`/api/leaderboard?${query}`,{signal:controller.signal});
        if(!response.ok)throw Error('Leaderboard unavailable');
        const result=await response.json() as LeaderboardData;
        if(controller.signal.aborted)return;
        setData(current=>({members:result.members,updatedAt:result.updatedAt,boards:platforms.flatMap(id=>result.boards.find(b=>b.id===id)||current?.boards.find(b=>b.id===id)||[])}));
      }catch{if(!controller.signal.aborted)setFailedBoards(current=>({...current,[platform]:true}))}
      finally{if(!controller.signal.aborted)setLoadingBoards(current=>({...current,[platform]:false}))}
    })).then(()=>{if(!controller.signal.aborted){setLoading(false);setRefreshing(false)}});
  },[year,leetcodeDifficulties,leetcodeMode]);

  useEffect(()=>{const timer=setTimeout(()=>load('initial'),0);return()=>{clearTimeout(timer);controllerRef.current?.abort()}},[load]);
  const refresh=useCallback(()=>load('refresh'),[load]);
  return {data,loading,refreshing,loadingBoards,failedBoards,error:Object.values(failedBoards).some(Boolean),refresh};
}
