"use client";
import ActivityHeatmap from './ActivityHeatmap';
import { useGitHubActivity } from '@/hooks/useGitHubActivity';
export default function GitHubActivity({username}:{username?:string}){
 const {data,loading,error,retry}=useGitHubActivity(username);
 if(!username)return null;
 return <ActivityHeatmap days={data?.calendar||[]} loading={loading} error={error} accent="#39D353" unit="contributions" label="GitHub activity" emptyMessage="No GitHub contributions in the last 365 days." errorMessage="Couldn't load GitHub activity." onRetry={retry}/>;
}
