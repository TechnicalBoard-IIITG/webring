import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const redis = vi.hoisted(() => ({
 isReady:true, isOpen:true, get:vi.fn(), set:vi.fn(), on:vi.fn(),
 connect:vi.fn().mockResolvedValue(undefined), destroy:vi.fn(),
}));
vi.mock('redis', () => ({createClient: () => redis}));
let cache: typeof import('../src/lib/cache.js');
let values: Map<string, string>;
beforeEach(async () => {
 vi.resetModules(); vi.clearAllMocks();
 vi.stubEnv('REDIS_URL','redis://cache.example:6379');
 redis.isReady=true;
 values=new Map();
 redis.get.mockImplementation(async key => values.get(key) ?? null);
 redis.set.mockImplementation(async (key, value, options) => {
  if (options?.NX && values.has(key)) return null;
  values.set(key,value); return 'OK';
 });
 cache=await import('../src/lib/cache.js');
});
afterEach(() => vi.unstubAllEnvs());

describe('shared public cache', () => {
 it('serves a Redis hit without reloading the database and sets an expiry', async () => {
  const load=vi.fn().mockResolvedValue({id:'a',name:'Student'});
  await cache.cachedPublic('members',{id:'a'},60,load);
  expect(await cache.cachedPublic('members',{id:'a'},60,load)).toEqual({id:'a',name:'Student'});
  expect(load).toHaveBeenCalledTimes(1);
  expect(redis.set).toHaveBeenCalledWith(expect.any(String),expect.any(String),{EX:60});
 });
 it('isolates queries and environments using scoped hashed keys', async () => {
  await cache.cachedPublic('members',{search:'a'},60,async () => ['a']);
  expect(await cache.cachedPublic('members',{search:'b'},60,async () => ['b'])).toEqual(['b']);
 });
 it('coalesces simultaneous misses', async () => {
  let complete!: (value: string) => void;
  const load=vi.fn(() => new Promise<string>(resolve => {complete=resolve;}));
  const first=cache.cachedPublic('members','same',60,load);
  const second=cache.cachedPublic('members','same',60,load);
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  complete('ready');
  expect(await Promise.all([first,second])).toEqual(['ready','ready']);
 });
 it('does not resurrect an old in-flight profile after invalidation', async () => {
  let complete!: (value: string) => void;
  const old=cache.cachedPublic('members','profile',60,() => new Promise<string>(resolve => {complete=resolve;}));
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
  await cache.invalidatePublic('members');
  complete('old public data'); await old;
  expect(await cache.cachedPublic('members','profile',60,async () => 'updated')).toBe('updated');
 });
 it('falls back on Redis errors or malformed values', async () => {
  redis.get.mockRejectedValueOnce(Error('offline'));
  expect(await cache.cachedPublic('members','a',60,async () => 'db')).toBe('db');
  redis.get.mockResolvedValueOnce('generation').mockResolvedValueOnce('{broken');
  expect(await cache.cachedPublic('members','b',60,async () => 'db')).toBe('db');
 });
 it('bypasses disconnected Redis and does not cache failed database loads', async () => {
  redis.isReady=false;
  await expect(cache.cachedPublic('members','a',60,async () => {throw Error('db failed');})).rejects.toThrow('db failed');
  expect(await cache.cachedPublic('members','a',60,async () => 'recovered')).toBe('recovered');
  expect(redis.get).not.toHaveBeenCalled();
 });
 it('bounds stalled cache reads so they cannot hold up profile loads', async () => {
  redis.get.mockImplementation(() => new Promise(() => {}));
  expect(await cache.cachedPublic('members','a',60,async () => 'db')).toBe('db');
 });
});
