export interface Repository {
 id:string; fullName:string; htmlUrl:string; description:string|null; language:string|null;
 stars:number; forks:number; fetchedAt:string; pushedAt:string|null; isFork:boolean; isArchived:boolean;
 languageBytes?:Record<string,number>;
 members?:{source:string;member:{id:string;name:string;year:number;github:string|null}}[];
}
export interface ProjectShowcaseEntry {
 member:{id:string;name:string;year:number;github:string|null};
 repositories:Repository[];
 stars:number;
 forks:number;
}
export interface ProjectShowcasePage {
 items:ProjectShowcaseEntry[];
 total:number;
 page:number;
 limit:number;
 languages:string[];
}
export interface ProjectPickOptions {
 selectedRepositoryIds:string[];
 repositories:Repository[];
 syncStatus:string;
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
