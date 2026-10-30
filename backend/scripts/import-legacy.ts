import 'dotenv/config';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const path=resolve(process.argv.find((arg,i)=>process.argv[i-1]==='--file')??'../data/members.json');
const apply=process.argv.includes('--apply');
const value=JSON.parse(await readFile(path,'utf8')) as unknown;
if(!Array.isArray(value))throw new Error('Expected top-level JSON array');
const report:{file:string;dryRun:boolean;total:number;imported:number;alreadyImported:number;warnings:string[];errors:string[]}={file:path,dryRun:!apply,total:value.length,imported:0,alreadyImported:0,warnings:[],errors:[]};
const seenEmails=new Map<string,number>();
for(const [i,entry] of value.entries()){
 try{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new Error('Not a JSON object');
  const r=entry as Record<string,unknown>;
  if(typeof r.name!=='string'||!r.name.trim())throw new Error('Missing name');
  const email=typeof r.email==='string'&&r.email.trim()?r.email.trim().toLowerCase():null;
  if(email){const prior=seenEmails.get(email);if(prior!==undefined)report.warnings.push(`Rows ${prior} and ${i}: duplicate email ${email}; no automatic ownership linking`);else seenEmails.set(email,i);}
  const year=Number(r.year);
  if(!Number.isInteger(year)||year<2000||year>2200)throw new Error('Invalid year');
  const list=Array.isArray(r.techStack)?r.techStack.filter((x):x is string=>typeof x==='string'):[];
  if(Array.isArray(r.techStack)&&list.length!==r.techStack.length)report.warnings.push(`Row ${i}: non-string techStack entries excluded`);
  const str=(key:string)=>typeof r[key]==='string'?(r[key] as string).trim()||null:null;
  const sourceKey=`legacy-json:${i}`;
  const sha256=createHash('sha256').update(JSON.stringify(r)).digest('hex');
  if(!apply)continue;
  const prior=await db.importRecord.findUnique({where:{sourceKey}});
  if(prior){
   if(prior.sha256!==sha256)report.warnings.push(`Row ${i}: source changed since import; profile left untouched`);
   report.alreadyImported++;continue;
  }
  await db.$transaction(async tx=>{
   const profile=await tx.memberProfile.create({data:{legacySourceId:sourceKey,legacyEmail:email,name:(r.name as string).trim(),year,github:str('github'),portfolio:str('portfolio'),leetcode:str('leetcode'),codeforces:str('codeforces'),techStack:list,banner:str('banner')}});
   await tx.importRecord.create({data:{sourceKey,sha256,profileId:profile.id}});
  });
  report.imported++;
 }catch(e){report.errors.push(`Row ${i}: ${e instanceof Error?e.message:String(e)}`);}
}
await writeFile('legacy-import-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await db.$disconnect();
if(report.errors.length)process.exitCode=1;
