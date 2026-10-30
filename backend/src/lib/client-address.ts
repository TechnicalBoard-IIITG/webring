import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Request } from 'express';

export function clientAddress(req: Request): string {
 const secret=process.env.API_PROXY_SECRET;
 const ip=req.get('X-Webring-Client-IP');
 const timestamp=req.get('X-Webring-Client-Time');
 const signature=req.get('X-Webring-Client-Signature');
 if(secret&&ip&&isIP(ip)&&timestamp&&/^\d+$/.test(timestamp)&&signature&&/^[a-f0-9]{64}$/.test(signature)&&Math.abs(Date.now()-Number(timestamp))<30000){
  const path=req.originalUrl.split('?')[0];
  const expected=createHmac('sha256',secret).update(`${timestamp}:${ip}:${req.method}:${path}`).digest();
  if(timingSafeEqual(expected,Buffer.from(signature,'hex')))return ip;
 }
 return req.ip||req.socket.remoteAddress||'unknown';
}
