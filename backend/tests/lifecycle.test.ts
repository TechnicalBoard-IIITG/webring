import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { drainServer } from '../src/lib/lifecycle.js';
afterEach(()=>vi.useRealTimers());
describe('load balancer shutdown',()=>{
 it('waits for active requests to finish before closing shared resources',async()=>{
  let closed!:(error?:Error)=>void;
  const server={close:vi.fn(callback=>{closed=callback;}),closeIdleConnections:vi.fn(),closeAllConnections:vi.fn()};
  const dispose=vi.fn().mockResolvedValue(undefined);
  const draining=drainServer(server as unknown as Server,dispose);
  expect(server.closeIdleConnections).toHaveBeenCalled();expect(dispose).not.toHaveBeenCalled();
  closed();await draining;expect(dispose).toHaveBeenCalledOnce();expect(server.closeAllConnections).not.toHaveBeenCalled();
 });
 it('closes hung connections at the deadline and releases resources',async()=>{
  vi.useFakeTimers();
  const server={close:vi.fn(),closeIdleConnections:vi.fn(),closeAllConnections:vi.fn()};
  const dispose=vi.fn().mockResolvedValue(undefined);
  const draining=drainServer(server as unknown as Server,dispose,1000);
  const rejected=expect(draining).rejects.toThrow('Shutdown deadline');
  await vi.advanceTimersByTimeAsync(1000);await rejected;
  expect(server.closeAllConnections).toHaveBeenCalledOnce();expect(dispose).toHaveBeenCalledOnce();
 });
});
