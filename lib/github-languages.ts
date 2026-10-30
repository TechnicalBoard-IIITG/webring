export function topGitHubLanguages(languages:Record<string,unknown>){
 const excluded=new Set(['html','css']);
 const valid=Object.entries(languages).filter((entry):entry is [string,number]=>!excluded.has(entry[0].trim().toLowerCase())&&typeof entry[1]==='number'&&Number.isSafeInteger(entry[1])&&entry[1]>0);
 const total=valid.reduce((sum,[,bytes])=>sum+bytes,0);
 return valid.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([name,bytes])=>({name,bytes,percentage:bytes/total*100}));
}
