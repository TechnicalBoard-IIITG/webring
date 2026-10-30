import 'dotenv/config';
import { prisma } from '../src/lib/db.js';
import { syncMember } from '../src/lib/github.js';
// Run once per hour from a scheduler. Two workers, cursor pagination, durable cooldown.
try {
 const memberId=process.argv[process.argv.indexOf('--member')+1];
 if(process.argv.includes('--member')){
  if(!memberId)throw Error('Expected member ID');
  await syncMember(memberId);
  const summary=await prisma.memberGitHubSummary.findUnique({where:{memberId}});
  console.log(JSON.stringify({status:summary?.status,repositoryCount:summary?.repositoryCount,fetchedAt:summary?.fetchedAt,error:summary?.error}));
 }else{
 let cursor:string|undefined;
 for(;;){
  const members=await prisma.memberProfile.findMany({where:{isPublic:true,github:{not:null}},select:{id:true},orderBy:{id:'asc'},take:50,...(cursor?{cursor:{id:cursor},skip:1}:{})});
  if(!members.length)break;
  let index=0;
  await Promise.all(Array.from({length:2},async()=>{while(index<members.length){const member=members[index++];await syncMember(member.id)}}));
  cursor=members.at(-1)!.id;
 }
 }
}finally{await prisma.$disconnect()}
