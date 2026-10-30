import { describe,it,expect } from 'vitest';
import { profilePreviewMember } from '../../lib/profile-validation';
describe('live profile preview drafts',()=>{
 it('does not hand incomplete URLs to the real card or mutate the draft',()=>{
  const draft={name:'Student',year:2029,github:'student',portfolio:'https://',linkedin:'https://www.linkedin.com/in/'};
  const preview=profilePreviewMember(draft);
  expect(preview.portfolio).toBeUndefined();expect(preview.linkedin).toBeUndefined();
  expect(draft.portfolio).toBe('https://');expect(draft.linkedin).toBe('https://www.linkedin.com/in/');
 });
 it('keeps unsafe URLs out of clickable preview links',()=>{
  const preview=profilePreviewMember({name:'Student',year:2029,github:'student',portfolio:'javascript:alert(1)',linkedin:'https://evil.example/in/student'});
  expect(preview.portfolio).toBeUndefined();expect(preview.linkedin).toBeUndefined();
 });
 it('preserves valid profile details and custom banners',()=>{
  const draft={id:'profile-a',name:'Student',bio:'Building useful things.\nLearning every day.',year:2029,github:'student',portfolio:'https://student.example/',linkedin:'https://www.linkedin.com/in/student',banner:'https://images.example/banner.gif',techStack:['React']};
  expect(profilePreviewMember(draft)).toEqual(draft);
 });
});
