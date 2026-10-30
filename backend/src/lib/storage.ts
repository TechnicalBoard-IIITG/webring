import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export function imageType(bytes: Buffer): { extension: string; mime: string } | null {
 if (bytes.length >= 6 && ['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString('ascii'))) return {extension:'gif',mime:'image/gif'};
 if (bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {extension:'png',mime:'image/png'};
 if (bytes.length >= 12 && bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP') return {extension:'webp',mime:'image/webp'};
 if (bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {extension:'jpg',mime:'image/jpeg'};
 return null;
}

export async function storeBanner(ownerId: string, bytes: Buffer, mime: string) {
 const type = imageType(bytes);
 if (!type || type.mime !== mime || bytes.length > 5 * 1024 * 1024) throw Error('Invalid image');
 const key = `banners/${encodeURIComponent(ownerId)}/${randomUUID()}.${type.extension}`;
 if (process.env.BANNER_STORAGE === 's3') {
  for (const name of ['S3_BUCKET','S3_PUBLIC_URL','S3_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY']) if (!process.env[name]) throw Error('Object storage is not configured');
  const origin = new URL(process.env.S3_PUBLIC_URL!);
  if (origin.protocol !== 'https:') throw Error('HTTPS object storage URL required');
  const s3 = new S3Client({region:process.env.S3_REGION, endpoint:process.env.S3_ENDPOINT || undefined, forcePathStyle:process.env.S3_FORCE_PATH_STYLE === 'true'});
  await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET, Key:key, Body:bytes, ContentType:mime, CacheControl:'public, max-age=31536000, immutable'}));
  return {url:`${origin.toString().replace(/\/$/,'')}/${key}`, remove:()=>s3.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET, Key:key}))};
 }
 if (process.env.NODE_ENV === 'production') throw Error('Persistent object storage is required in production');
 const path = resolve('uploads', key);
 await mkdir(resolve(path, '..'), {recursive:true});
 await writeFile(path, bytes, {flag:'wx'});
 return {url:`${(process.env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/,'')}/uploads/${key}`, remove:()=>unlink(path)};
}
