import { describe,it,expect } from 'vitest';
import { createProfileSchema,isInstitutionEmail } from '../src/lib/validation.js';
describe('institution login',()=>{
 it('accepts verified college emails',()=>expect(isInstitutionEmail('Test@iiitg.ac.in',true,'iiitg.ac.in')).toBe(true));
 it('rejects lookalikes and unverified identities',()=>{
  expect(isInstitutionEmail('person@fakeiiitg.ac.in',true)).toBe(false);
  expect(isInstitutionEmail('person@iiitg.ac.in.evil.com',true)).toBe(false);
  expect(isInstitutionEmail('person@iiitg.ac.in',false)).toBe(false);
  expect(isInstitutionEmail('person@iiitg.ac.in',true,'other.edu')).toBe(false);
 });
});
describe('profile validation',()=>{
 const valid={name:'Student',year:2029,techStack:['React']};
 it('accepts valid profile',()=>expect(createProfileSchema.safeParse(valid).success).toBe(true));
 it('rejects unexpected email and owner changes',()=>expect(createProfileSchema.safeParse({...valid,email:'someone@iiitg.ac.in',ownerId:'hack'}).success).toBe(false));
 it('rejects unsafe portfolio links',()=>expect(createProfileSchema.safeParse({...valid,portfolio:'javascript:alert(1)'}).success).toBe(false));
});
