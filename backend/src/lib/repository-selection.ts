import { Prisma } from '@prisma/client';
import { prisma } from './db.js';

import { REPOSITORY_WINDOW_DAYS, REPOSITORIES_PER_MEMBER } from './repository-policy.js';

// Select before pagination so the community view and member modal share the policy.
// A profile README has the same repository name as its GitHub owner login.
export async function recentPopularRepositoryIds(options:{member?:string;year?:number;forks?:boolean}={}, now=new Date()) {
 const cutoff=new Date(now.getTime()-REPOSITORY_WINDOW_DAYS*86400000);
 const rows=await prisma.$queryRaw<{repositoryId:string}[]>(Prisma.sql`
  SELECT DISTINCT "repositoryId" FROM (
   SELECT mr."repositoryId", ROW_NUMBER() OVER (
    PARTITION BY mr."memberId" ORDER BY r.stars DESC, r."pushedAt" DESC, r.id ASC
   ) AS position
   FROM "MemberRepository" mr
   JOIN "GitHubRepository" r ON r.id=mr."repositoryId"
   JOIN "MemberProfile" m ON m.id=mr."memberId"
   WHERE mr."reviewStatus"='approved' AND m."isPublic"=true
    AND r."isPrivate"=false AND r."isArchived"=false
    AND r."pushedAt">=${cutoff} AND r."pushedAt"<=${now}
    AND lower(split_part(r."fullName", '/', 2))<>lower(r."ownerLogin")
    ${options.forks?Prisma.empty:Prisma.sql`AND r."isFork"=false`}
    ${options.member?Prisma.sql`AND m.id=${options.member}`:Prisma.empty}
    ${options.year?Prisma.sql`AND m.year=${options.year}`:Prisma.empty}
  ) ranked WHERE position<=${REPOSITORIES_PER_MEMBER}
 `);
 return rows.map(row=>row.repositoryId);
}
