import { z } from 'zod';
export const repositoryQuery=z.object({
 page:z.coerce.number().int().min(1).max(100000).default(1),
 limit:z.coerce.number().int().min(1).max(100).default(24),
 year:z.coerce.number().int().min(2000).max(2200).optional(),
 member:z.string().trim().max(100).optional(),
 language:z.string().trim().max(100).optional(),
 search:z.string().trim().max(100).optional(),
 forks:z.enum(['true','false']).default('false'),
 sort:z.enum(['stars','forks','pushed']).default('stars'),
 live:z.enum(['true','false']).default('false')
});
export const nominationSchema=z.object({
 fullName:z.string().trim().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).max(200).transform(v=>v.toLowerCase()),
 reason:z.string().trim().min(10).max(1000)
}).strict();
