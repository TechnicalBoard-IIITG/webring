export interface Member {
  id?: string;
  linkedin?: string | null;
  email?: string;
  name: string;
  bio?: string | null;
  year: number;
  github: string;
  portfolio?: string;
  leetcode?: string;
  codeforces?: string;
  techStack?: string[];
  banner?: string;
}
