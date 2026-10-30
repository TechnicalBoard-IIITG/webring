import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
let client:typeof import('../../lib/repositories-client');
const snapshot={items:[],total:1,languages:[],stats:{stars:1,forks:0},oldestFetchedAt:null};
beforeEach(async()=>{vi.resetModules();client=await import('../../lib/repositories-client');});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('community live requests',()=>{
 it('bypasses the browser snapshot for live refreshes and disables HTTP caching',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))).mockResolvedValueOnce(new Response(JSON.stringify({...snapshot,stats:{stars:5,forks:1},refresh:{pending:0,deferred:0,intervalSeconds:60}})));
  vi.stubGlobal('fetch',fetcher);
  await client.loadRepositories();
  const fresh=await client.loadRepositories(undefined,{live:true});
  expect(fresh.stats.stars).toBe(5);expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toContain('live=true');expect(fetcher.mock.calls[1][1]).toEqual({cache:'no-store'});
 });
 it('deduplicates concurrent live requests',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot)));vi.stubGlobal('fetch',fetcher);
  const a=client.loadRepositories(undefined,{live:true}),b=client.loadRepositories(undefined,{live:true});
  expect(a).toBe(b);await a;expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('retains the last successful results when a refresh fails',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))).mockResolvedValueOnce(new Response('',{status:503})));
  await client.loadRepositories();
  await expect(client.loadRepositories(undefined,{live:true})).rejects.toThrow('unavailable');
  expect(client.cachedRepositories(client.defaultRepositoryQuery,true)).toEqual(snapshot);
 });
 it('does not let a slow prefetch overwrite newer live data',async()=>{
  let old!:(value:Response)=>void;
  vi.stubGlobal('fetch',vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{old=resolve;})).mockResolvedValueOnce(new Response(JSON.stringify({...snapshot,total:4}))));
  const prefetch=client.loadRepositories();
  await client.loadRepositories(undefined,{live:true});
  old(new Response(JSON.stringify(snapshot)));await prefetch;
  expect(client.cachedRepositories(client.defaultRepositoryQuery)?.total).toBe(4);
 });
 it('can display an expired snapshot without using it to satisfy a new fetch',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))));
  await client.loadRepositories();
  vi.spyOn(Date,'now').mockReturnValue(Date.now()+61000);
  expect(client.cachedRepositories(client.defaultRepositoryQuery)).toBeNull();
  expect(client.cachedRepositories(client.defaultRepositoryQuery,true)).toEqual(snapshot);
 });
});
