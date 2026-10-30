import 'dotenv/config';
import { z } from 'zod';
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
});
export const config = schema.parse(process.env);
export const origins = config.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
