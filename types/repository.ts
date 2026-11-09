export interface Repository {
 id:string; fullName:string; htmlUrl:string; description:string|null; language:string|null;
 stars:number; forks:number; fetchedAt:string; pushedAt:string|null; isFork:boolean; isArchived:boolean;
 members?:{source:string;member:{id:string;name:string;year:number;github:string|null}}[];
}
export interface GitHubOverview {
 status:string; error?:string|null; fetchedAt:string|null; stale?:boolean; repositories:Repository[];
 languages:Record<string,number>; activity:{id:string;type:string;repository:string;createdAt:string}[];
 repositoryCount?:number;
}
export interface GitHubLanguageSnapshot {
 github:string|null;status:'pending'|'ready'|'stale'|'unavailable'|'empty';
 languages:Record<string,number>;fetchedAt:string|null;stale:boolean;error?:string|null;retryAt?:string|null;
}
