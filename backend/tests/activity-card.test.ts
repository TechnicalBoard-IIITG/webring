import { describe,it,expect,vi,afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ActivityHeatmap from '../../components/ActivityHeatmap';
const props={days:[],loading:false,error:false,accent:'#FFA116',unit:'submissions',label:'LeetCode activity',emptyMessage:'No activity in this window.',errorMessage:'Provider unavailable'};
afterEach(()=>vi.useRealTimers());
describe('shared activity card rendering',()=>{
 it('keeps the full empty calendar and real zero summaries visible',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
  const html=renderToStaticMarkup(createElement(ActivityHeatmap,props));
  expect((html.match(/<rect /g)||[]).length).toBe(365);
  expect(html).toContain('No activity in this window.');expect(html).toContain('Active days');
  expect(html).not.toContain('on 2026-11-01');
 });
 it('shows an accessible retry state instead of a zero calendar on failure',()=>{
  const html=renderToStaticMarkup(createElement(ActivityHeatmap,{...props,error:true,onRetry:()=>{}}));
  expect(html).toContain('role="alert"');expect(html).toContain('Provider unavailable');expect(html).toContain('Try again');expect(html).not.toContain('<rect');
 });
 it('marks loading without inventing statistics',()=>{
  const html=renderToStaticMarkup(createElement(ActivityHeatmap,{...props,loading:true}));
  expect(html).toContain('aria-busy="true"');expect(html).toContain('Loading activity...');expect(html).not.toContain('Active days');
 });
});
