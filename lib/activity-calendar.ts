import type { ActivityDay } from '@/types/activity';
import { startOfUtcDay, toDateKey } from '@/lib/activity';

const DAY_MS=86400000;
export const ACTIVITY_WINDOW_DAYS=365;
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export interface CalendarCell extends ActivityDay { inRange:boolean }

export function buildActivityCalendar(days:readonly ActivityDay[],now=new Date()) {
 const end=startOfUtcDay(now);
 const start=new Date(end.getTime()-(ACTIVITY_WINDOW_DAYS-1)*DAY_MS);
 const startKey=toDateKey(start),endKey=toDateKey(end);
 const counts=new Map<string,number>();
 for(const day of days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day.date)||day.date<startKey||day.date>endKey||!Number.isSafeInteger(day.count)||day.count<0)continue;
  const parsed=new Date(`${day.date}T00:00:00Z`);
  if(!Number.isFinite(parsed.getTime())||toDateKey(parsed)!==day.date)continue;
  counts.set(day.date,(counts.get(day.date)||0)+day.count);
 }
 let total=0,activeDays=0,longestStreak=0,streak=0,maxCount=0;
 for(let stamp=start.getTime();stamp<=end.getTime();stamp+=DAY_MS){
  const count=counts.get(toDateKey(new Date(stamp)))||0;
  total+=count;maxCount=Math.max(maxCount,count);
  if(count>0){activeDays++;streak++;longestStreak=Math.max(longestStreak,streak)}else streak=0;
 }
 const gridStart=new Date(start);gridStart.setUTCDate(gridStart.getUTCDate()-gridStart.getUTCDay());
 const weeks:CalendarCell[][]=[];
 const labels:{name:string;weekIndex:number}[]=[];
 for(let stamp=gridStart.getTime();stamp<=end.getTime();stamp+=7*DAY_MS){
  const week:CalendarCell[]=[];
  for(let offset=0;offset<7;offset++){
   const day=new Date(stamp+offset*DAY_MS),date=toDateKey(day);
   const inRange=date>=startKey&&date<=endKey;
   week.push({date,inRange,count:inRange?counts.get(date)||0:0});
   if(inRange&&day.getUTCDate()===1)labels.push({name:months[day.getUTCMonth()],weekIndex:weeks.length});
  }
  weeks.push(week);
 }
 // Avoid a clipped trailing label or two labels sharing the first week.
 if(!labels.length||labels[0].weekIndex>2)labels.unshift({name:months[start.getUTCMonth()],weekIndex:0});
 return {weeks,months:labels.filter((label,index,list)=>index===0||label.weekIndex-list[index-1].weekIndex>=3),total,activeDays,longestStreak,maxCount,startKey,endKey};
}
