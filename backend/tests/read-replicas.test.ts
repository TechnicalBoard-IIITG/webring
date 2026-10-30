import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const db=vi.hoisted(() => ({primary:{$queryRaw:vi.fn(),$disconnect:vi.fn()},replica:{$queryRaw:vi.fn(),$disconnect:vi.fn()}}));
vi.mock('@prisma/client', () => ({PrismaClient:vi.fn(function(options) {
 return options.datasourceUrl.includes('replica') ? db.replica : db.primary;
})}));
beforeEach(() => {
 vi.resetModules(); vi.clearAllMocks();
 vi.stubEnv('NODE_ENV','production');
 vi.stubEnv('DATABASE_URL','postgresql://primary/db');
 vi.stubEnv('DATABASE_READ_URLS','postgresql://replica/db');
 db.primary.$queryRaw.mockResolvedValue([{lsn:'0/123'}]);
});
afterEach(() => vi.unstubAllEnvs());
describe('replica routing', () => {
 it('reads from a caught-up replica', async () => {
  db.replica.$queryRaw.mockResolvedValue([{ready:true}]);
  const {publicRead}=await import('../src/lib/db.js');
  const read=vi.fn().mockResolvedValue('profile');
  expect(await publicRead(read)).toBe('profile'); expect(read).toHaveBeenCalledWith(db.replica);
 });
 it('falls back to primary when the replica is lagging', async () => {
  db.replica.$queryRaw.mockResolvedValue([{ready:false}]);
  const {publicRead}=await import('../src/lib/db.js');
  const read=vi.fn().mockResolvedValue('current profile');
  await publicRead(read); expect(read).toHaveBeenCalledWith(db.primary);
 });
 it('falls back when the replica check or read fails', async () => {
  db.replica.$queryRaw.mockRejectedValue(Error('offline'));
  const {publicRead}=await import('../src/lib/db.js');
  const read=vi.fn().mockResolvedValue('primary');
  expect(await publicRead(read)).toBe('primary'); expect(read).toHaveBeenCalledWith(db.primary);
  db.replica.$queryRaw.mockResolvedValue([{ready:true}]);
  read.mockRejectedValueOnce(Error('replica query failed'));
  expect(await publicRead(read)).toBe('primary');
 });
 it('uses primary without replica probes when no URLs are set', async () => {
  vi.stubEnv('DATABASE_READ_URLS','');
  const {publicRead}=await import('../src/lib/db.js');
  const read=vi.fn().mockResolvedValue('primary');
  await publicRead(read); expect(read).toHaveBeenCalledWith(db.primary);
  expect(db.primary.$queryRaw).not.toHaveBeenCalled();
 });
});
