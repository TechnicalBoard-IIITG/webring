import assert from 'node:assert/strict';
const base=process.env.SMOKE_API_URL || 'http://localhost:4000';
async function get(path:string){const r=await fetch(`${base}${path}`);assert.equal(r.status,200,path);return r.json()}
const health=await get('/api/health');assert.equal(health.status,'ok');
const all=await get('/api/members?limit=1');assert.ok(all.total>0);assert.equal(all.items.length,1);assert.ok(!('legacyEmail' in all.items[0]));assert.ok(!('email' in all.items[0]));assert.ok(!('ownerId' in all.items[0]));
const member=all.items[0];
const search=await get(`/api/members?search=${encodeURIComponent(member.name)}&year=${member.year}&limit=5`);assert.ok(search.items.some((m:{id:string})=>m.id===member.id));
const batch=await get(`/api/members?year=${member.year}`);assert.ok(batch.items.every((m:{year:number})=>m.year===member.year));
const linkedin=await get('/api/members/linkedin');assert.ok(linkedin.items.every((m:{linkedin:string})=>Boolean(m.linkedin)));
assert.equal((await fetch(`${base}/api/members?limit=500`)).status,400);
assert.equal((await fetch(`${base}/api/profile/me`)).status,401);
const repos=await get('/api/repositories');assert.ok(Array.isArray(repos.items));
const cutoff=Date.now()-30*86400000;
for(const repo of repos.items){
 assert.ok(Date.parse(repo.pushedAt)>=cutoff&&Date.parse(repo.pushedAt)<=Date.now(),'Repository must be pushed in the last 30 days');
 assert.notEqual(repo.fullName.split('/')[1].toLowerCase(),repo.ownerLogin.toLowerCase(),'Profile README excluded');
 assert.equal(repo.isFork,false);assert.equal(repo.isPrivate,false);assert.equal(repo.isArchived,false);
}
const sampleMember=repos.items[0]?.members[0]?.member;
if(sampleMember){const selected=await get(`/api/repositories?member=${sampleMember.id}`);assert.ok(selected.total<=2,'At most two repositories per member')}
console.log(JSON.stringify({health:'ok',publicMembers:all.total,batchCount:batch.total,linkedin:linkedin.total,repositories:repos.total,privacy:'checked',validation:'checked',anonymousEditor:'blocked'}));
