import { z } from 'zod';
const optionalHandle = z.string().trim().max(100).regex(/^[A-Za-z0-9_.-]*$/).nullable().optional();
const optionalUrl = z.union([z.literal(''),z.string().trim().max(500).url().refine(v => {const url=new URL(v);return url.protocol==='https:'&&!url.username&&!url.password}, 'HTTPS URL without credentials required')]).nullable().optional();
export const linkedinUrl = z.string().trim().max(500).transform((value, ctx) => {
 if (!value) return null;
 try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^(www\.)?linkedin\.com$/i.test(url.hostname) || !/^\/in\/[A-Za-z0-9_%.-]+\/?$/.test(url.pathname)) throw Error();
  return `https://www.linkedin.com${url.pathname.replace(/\/$/, '')}`;
 } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use an HTTPS linkedin.com/in/ profile URL' }); return z.NEVER; }
}).nullable().optional();
export const profileFields = z.object({
 name: z.string().trim().min(1).max(100),
 year: z.number().int().min(2000).max(2200),
 github: optionalHandle,
 portfolio: optionalUrl,
 leetcode: optionalHandle,
 codeforces: optionalHandle,
 techStack: z.array(z.string().trim().min(1).max(60)).max(40).refine(a => new Set(a.map(s=>s.toLowerCase())).size===a.length,'Duplicate technologies'),
 bio: z.string().trim().max(500).nullable().optional(),
 linkedin: linkedinUrl,
 isPublic: z.boolean().optional()
}).strict();
export const createProfileSchema = profileFields;
export const editProfileSchema = profileFields.partial().refine(v=>Object.keys(v).length>0,'No changes supplied');
export function normalizeOptional<T extends object>(data: T): T {
  return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v === '' ? null : v])) as T;
}
export function isInstitutionEmail(email: string, verified: boolean, hd?: string) {
 return verified && email.toLowerCase().endsWith('@iiitg.ac.in') && (!hd || hd.toLowerCase()==='iiitg.ac.in');
}
