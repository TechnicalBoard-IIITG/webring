import { describe,it,expect } from 'vitest';
import { buildActivityCalendar } from '../../lib/activity-calendar';

const now=new Date('2026-10-31T15:30:00Z');
describe('activity cards use a consistent UTC year',()=>{
 it('includes exactly 365 dates and excludes leading and future padding from totals',()=>{
  const grid=buildActivityCalendar([{date:'2025-10-31',count:999},{date:'2025-11-01',count:2},{date:'2026-10-31',count:4},{date:'2026-11-01',count:999}],now);
  expect(grid.startKey).toBe('2025-11-01');expect(grid.endKey).toBe('2026-10-31');
  expect(grid.weeks.flat().filter(day=>day.inRange)).toHaveLength(365);
  expect(grid.total).toBe(6);expect(grid.activeDays).toBe(2);
  expect(grid.weeks.flat().filter(day=>!day.inRange).every(day=>day.count===0)).toBe(true);
 });
 it('uses consecutive calendar days for streaks, including across new year',()=>{
  const grid=buildActivityCalendar([{date:'2025-12-30',count:1},{date:'2025-12-31',count:3},{date:'2026-01-01',count:1},{date:'2026-01-03',count:2}],now);
  expect(grid.longestStreak).toBe(3);expect(grid.activeDays).toBe(4);expect(grid.total).toBe(7);
 });
 it('handles leap day and does not invent activity on empty calendars',()=>{
  const leap=buildActivityCalendar([{date:'2024-02-29',count:5}],new Date('2024-03-01T00:00:00Z'));
  expect(leap.total).toBe(5);expect(leap.weeks.flat().filter(day=>day.inRange)).toHaveLength(365);
  const empty=buildActivityCalendar([],now);expect(empty.total).toBe(0);expect(empty.activeDays).toBe(0);expect(empty.longestStreak).toBe(0);
 });
 it('ignores malformed dates and invalid provider counts',()=>{
  const grid=buildActivityCalendar([{date:'2026-02-30',count:20},{date:'2026-10-30',count:-2},{date:'2026-10-31',count:NaN},{date:'2026-10-29',count:1.5},{date:'2026-10-28',count:2}],now);
  expect(grid.total).toBe(2);expect(grid.activeDays).toBe(1);
 });
 it('aligns weekdays and puts month labels at the weeks containing the first',()=>{
  const grid=buildActivityCalendar([],now);
  for(const week of grid.weeks)expect(new Date(`${week[0].date}T00:00:00Z`).getUTCDay()).toBe(0);
  expect(grid.months.some(month=>month.name==='Jan')).toBe(true);
 });
});
