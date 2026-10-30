"use client";
import { useCallback,useEffect,useState } from 'react';

// Keep state keyed by both account and retry, so a previous account cannot flash in a new card.
export function useActivityResource<T>(url:string|null) {
 const [attempt,setAttempt]=useState(0);
 const requestKey=`${url}:${attempt}`;
 const [loaded,setLoaded]=useState<{key:string;data:T}|null>(null);
 const [failed,setFailed]=useState<string|null>(null);
 useEffect(()=>{
  if(!url)return;
  const controller=new AbortController();
  fetch(url,{signal:controller.signal,cache:attempt?'reload':'default'}).then(async response=>{
   if(!response.ok)throw Error('Activity unavailable');
   return response.json() as Promise<T>;
  }).then(data=>{if(!controller.signal.aborted)setLoaded({key:requestKey,data})}).catch(()=>{if(!controller.signal.aborted)setFailed(requestKey)});
  return()=>controller.abort();
 },[url,requestKey,attempt]);
 const data=loaded?.key===requestKey?loaded.data:null;
 const error=Boolean(url)&&failed===requestKey;
 const retry=useCallback(()=>setAttempt(value=>value+1),[]);
 return {data,loading:Boolean(url)&&!data&&!error,error,retry};
}
