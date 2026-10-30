import type { Member } from '@/types/member';

// Incomplete URLs are normal while typing. Keep them in the draft, but do not
// hand invalid/unsafe links to the actual member card or modal preview.
export function profilePreviewMember(profile:Member):Member {
 const safeUrl=(value?:string|null)=>{
  try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined}catch{return undefined}
 };
 const github=(profile.github||'').trim();
 const linkedin=safeUrl(profile.linkedin);
 return {...profile,name:profile.name.trim()||'Your name',github:/^[A-Za-z0-9_.-]+$/.test(github)?github:'',portfolio:safeUrl(profile.portfolio),linkedin:linkedin&&/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%.-]+\/?(?:\?.*)?$/.test(linkedin)?linkedin:undefined};
}
export function profileValidationError(profile:Member):string|null {
 if(!profile.name.trim()||profile.name.trim().length>100)return 'Enter a display name of 1–100 characters.';
 if(!Number.isInteger(profile.year)||profile.year<2000||profile.year>2200)return 'Enter a graduation year between 2000 and 2200.';
 for(const field of ['github','leetcode','codeforces'] as const){const value=profile[field]?.trim();if(value&&(value.length>100||!/^[A-Za-z0-9_.-]+$/.test(value)))return `Enter a valid ${field} username.`}
 for(const field of ['portfolio','linkedin'] as const){
  const value=profile[field]?.trim();if(!value)continue;
  try{const url=new URL(value);if(value.length>500||url.protocol!=='https:'||url.username||url.password)throw Error();if(field==='linkedin'&&(!/^(www\.)?linkedin\.com$/i.test(url.hostname)||url.port||!/^\/in\/[A-Za-z0-9_%.-]+\/?$/.test(url.pathname)))throw Error()}
  catch{return field==='linkedin'?'Use an HTTPS linkedin.com/in/ profile URL.':'Use an HTTPS portfolio URL.'}
 }
 const tags=profile.techStack||[];
 if(tags.length>40||tags.some(tag=>!tag.trim()||tag.trim().length>60)||new Set(tags.map(t=>t.trim().toLowerCase())).size!==tags.length)return 'Use up to 40 distinct technology tags of 1–60 characters.';
 return null;
}
