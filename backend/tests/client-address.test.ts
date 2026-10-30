import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { memberProxyHeaders } from '../../lib/proxy-identity';
import { clientAddress } from '../src/lib/client-address.js';

function req(headers:Headers,method='GET',url='/api/members?limit=60'){
 return {get:(name:string)=>headers.get(name)||undefined,ip:'198.51.100.50',socket:{remoteAddress:'127.0.0.1'},originalUrl:url,method} as unknown as Request;
}
beforeEach(()=>{vi.stubEnv('API_PROXY_SECRET','a-shared-server-secret-at-least-32-characters');vi.stubEnv('VERCEL','1');});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('signed Vercel visitor identity',()=>{
 it('preserves the visitor address through the frontend directory proxy',()=>{
  const headers=memberProxyHeaders(new Headers({'X-Forwarded-For':'203.0.113.42'}));
  expect(clientAddress(req(headers))).toBe('203.0.113.42');
 });
 it('ignores unsigned or forged visitor IPs',()=>{
  const headers=new Headers({'X-Webring-Client-IP':'203.0.113.42','X-Webring-Client-Time':String(Date.now()),'X-Webring-Client-Signature':'0'.repeat(64)});
  expect(clientAddress(req(headers))).toBe('198.51.100.50');
  headers.delete('X-Webring-Client-Signature');expect(clientAddress(req(headers))).toBe('198.51.100.50');
 });
 it('rejects tampered, expired, or replayed-on-another-route signatures',()=>{
  const headers=memberProxyHeaders(new Headers({'X-Forwarded-For':'203.0.113.42'}));
  expect(clientAddress(req(headers,'GET','/api/auth/google'))).toBe('198.51.100.50');
  expect(clientAddress(req(headers,'POST','/api/members'))).toBe('198.51.100.50');
  headers.set('X-Webring-Client-IP','203.0.113.99');expect(clientAddress(req(headers))).toBe('198.51.100.50');
  headers.set('X-Webring-Client-IP','203.0.113.42');
  vi.spyOn(Date,'now').mockReturnValue(Number(headers.get('X-Webring-Client-Time'))+31000);
  expect(clientAddress(req(headers))).toBe('198.51.100.50');
 });
 it('does not sign untrusted local headers or invalid IPs',()=>{
  vi.stubEnv('VERCEL','');
  expect([...memberProxyHeaders(new Headers({'X-Forwarded-For':'203.0.113.42'}))]).toEqual([]);
  vi.stubEnv('VERCEL','1');
  expect([...memberProxyHeaders(new Headers({'X-Forwarded-For':'invalid'}))]).toEqual([]);
  vi.stubEnv('API_PROXY_SECRET','');
  expect([...memberProxyHeaders(new Headers({'X-Forwarded-For':'203.0.113.42'}))]).toEqual([]);
 });
});
