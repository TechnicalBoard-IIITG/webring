import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export function memberProxyHeaders(headers: Headers): Headers {
 const result=new Headers();
 const secret=process.env.API_PROXY_SECRET;
 // Vercel replaces this header at its edge; local/untrusted deployments do not sign it.
 const ip=headers.get('x-forwarded-for')?.split(',')[0].trim();
 if(process.env.VERCEL!=='1'||!secret||!ip||!isIP(ip))return result;
 const timestamp=String(Date.now());
 result.set('X-Webring-Client-IP',ip);result.set('X-Webring-Client-Time',timestamp);
 result.set('X-Webring-Client-Signature',createHmac('sha256',secret).update(`${timestamp}:${ip}:GET:/api/members`).digest('hex'));
 return result;
}
