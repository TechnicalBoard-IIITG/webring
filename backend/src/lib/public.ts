import type { MemberProfile } from '@prisma/client';
export function publicMember(m: MemberProfile) {
 return { id:m.id, name:m.name, year:m.year, github:m.github || '', portfolio:m.portfolio,
  leetcode:m.leetcode, codeforces:m.codeforces, techStack:m.techStack, banner:m.banner,
  bio:m.bio, linkedin:m.linkedin, updatedAt:m.updatedAt };
}
