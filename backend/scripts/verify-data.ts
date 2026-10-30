import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const path=process.argv[2];
if(!path)throw Error('Usage: tsx scripts/verify-data.ts <private database.json backup>');
const snapshot=JSON.parse(await readFile(path,'utf8')) as Record<string,Record<string,unknown>[]>;
const client=new Client({connectionString:process.env.DIRECT_URL||process.env.DATABASE_URL,connectionTimeoutMillis:15000});
try{
 await client.connect();
 for(const table of ['MemberProfile','User','ImportRecord','ProfileRevision']){
  const rows=(await client.query(`SELECT * FROM "${table}"`)).rows as Record<string,unknown>[];
  const original=new Map(snapshot[table].map(row=>[row.id,JSON.stringify(row)]));
  assert.equal(rows.length,original.size,`${table} count changed`);
  for(const row of rows)assert.equal(JSON.stringify(row),original.get(row.id),`${table} record changed`);
  console.log(`${table}: ${rows.length} records unchanged`);
 }
 for(const [label,sql] of [
  ['directory','SELECT id FROM "MemberProfile" WHERE "isPublic" = true ORDER BY name, id LIMIT 60'],
  ['repositories',`SELECT r.id FROM "GitHubRepository" r WHERE r."isPrivate" = false AND r."isFork" = false AND EXISTS (SELECT 1 FROM "MemberRepository" mr JOIN "MemberProfile" m ON m.id = mr."memberId" WHERE mr."repositoryId" = r.id AND mr."reviewStatus" = 'approved' AND m."isPublic" = true) ORDER BY r.stars DESC, r.id LIMIT 24`]
 ] as const){
  const plan=await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
  const result=plan.rows[0]['QUERY PLAN'][0];
  console.log(JSON.stringify({query:label,node:result.Plan['Node Type'],planningMs:result['Planning Time'],executionMs:result['Execution Time']}));
 }
 const migrations=await client.query('SELECT migration_name, finished_at IS NOT NULL AS applied FROM "_prisma_migrations" ORDER BY started_at');
 console.log(JSON.stringify(migrations.rows));
}catch(error){console.error('Data verification failed',{name:(error as Error).name,code:(error as {code?:string}).code});process.exitCode=1}
finally{await client.end()}
