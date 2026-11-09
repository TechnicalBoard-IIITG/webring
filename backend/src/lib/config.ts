import 'dotenv/config';
import { z } from 'zod';

// Required together whenever BANNER_STORAGE=s3.
const s3Required = ['S3_BUCKET','S3_PUBLIC_URL','S3_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'] as const;

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  TRUST_PROXY: z.enum(['true','false']).default('false'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),
  RATE_LIMIT_API: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WRITE: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_UPLOAD: z.coerce.number().int().positive().default(6),
  BOOTSTRAP_ADMIN_EMAILS: z.string().default(''),
  // Local disk is development only. Production must use S3-compatible object storage.
  BANNER_STORAGE: z.enum(['local','s3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')),
  S3_FORCE_PATH_STYLE: z.enum(['true','false']).default('false'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.BANNER_STORAGE !== 's3') {
    if (env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BANNER_STORAGE'],
        message: 'Production requires BANNER_STORAGE=s3 with S3/R2 credentials; local disk storage is not persistent.',
      });
    }
    return;
  }
  for (const name of s3Required) {
    if (!env[name]) ctx.addIssue({code: z.ZodIssueCode.custom, path: [name], message: `${name} is required when BANNER_STORAGE=s3`});
  }
  // R2's `auto` signing region only works with its account-specific S3 API endpoint.
  if (env.S3_REGION === 'auto' && !env.S3_ENDPOINT) {
    ctx.addIssue({code: z.ZodIssueCode.custom, path: ['S3_ENDPOINT'], message: 'S3_ENDPOINT is required when S3_REGION=auto (for example, the Cloudflare R2 endpoint).'});
  }
  if (env.S3_PUBLIC_URL) {
    try {
      if (new URL(env.S3_PUBLIC_URL).protocol !== 'https:') throw Error('Insecure URL');
    } catch {
      ctx.addIssue({code: z.ZodIssueCode.custom, path: ['S3_PUBLIC_URL'], message: 'S3_PUBLIC_URL must be a valid HTTPS URL'});
    }
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.') || 'environment'}: ${issue.message}`);
  throw new Error('Invalid environment configuration');
}
export const config = parsed.data;
export const origins = config.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
