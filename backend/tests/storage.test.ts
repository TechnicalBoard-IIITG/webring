import { describe,it,expect,vi,afterEach } from 'vitest';
const s3=vi.hoisted(()=>({send:vi.fn().mockResolvedValue({})}));
vi.mock('@aws-sdk/client-s3',()=>({S3Client:class{send=s3.send},PutObjectCommand:class{constructor(public input:unknown){}},DeleteObjectCommand:class{constructor(public input:unknown){}}}));
import { storeBanner } from '../src/lib/storage.js';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()});
describe('persistent banner adapter',()=>{
 it('refuses ephemeral production storage',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('BANNER_STORAGE','local');
  await expect(storeBanner('owner',Buffer.from('GIF89a'),'image/gif')).rejects.toThrow('Persistent object storage');
 });
 it('writes distinct owner-scoped keys and supports failed-write cleanup',async()=>{
  for(const [name,value] of Object.entries({BANNER_STORAGE:'s3',S3_BUCKET:'test-bucket',S3_REGION:'auto',S3_PUBLIC_URL:'https://images.example.com',AWS_ACCESS_KEY_ID:'test-placeholder',AWS_SECRET_ACCESS_KEY:'test-placeholder'}))vi.stubEnv(name,value);
  const first=await storeBanner('owner-a',Buffer.from('GIF89a'),'image/gif');
  const second=await storeBanner('owner-b',Buffer.from('GIF89a'),'image/gif');
  const third=await storeBanner('owner-a',Buffer.from('GIF89a'),'image/gif');
  expect(first.url).toMatch(/^https:\/\/images.example.com\/banners\/owner-a\/.+\.gif$/);
  expect(second.url).toContain('/banners/owner-b/');expect(third.url).not.toBe(first.url);
  expect(s3.send.mock.calls[0][0].input).toMatchObject({Bucket:'test-bucket',ContentType:'image/gif'});
  await first.remove();expect(s3.send).toHaveBeenCalledTimes(4);
 });
});
