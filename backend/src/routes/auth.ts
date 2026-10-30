import { Router } from 'express';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { randomBytes, createHash } from 'node:crypto';
import { config } from '../lib/config.js';
import { prisma } from '../lib/db.js';
import { isInstitutionEmail } from '../lib/validation.js';
const client = new OAuth2Client(config.GOOGLE_CLIENT_ID,config.GOOGLE_CLIENT_SECRET,config.GOOGLE_CALLBACK_URL);
export const authRouter = Router();
function sha256base64url(s:string){return createHash('sha256').update(s).digest('base64url');}
authRouter.get('/google',(req,res)=>{
 const state=randomBytes(32).toString('hex');
 const verifier=randomBytes(32).toString('base64url');
 req.session.oauthState=state;req.session.oauthCodeVerifier=verifier;
 req.session.save(err=>{
  if(err){res.status(500).json({error:'Unable to initiate login'});return;}
  const url=client.generateAuthUrl({access_type:'online',scope:['openid','email','profile'],state,hd:'iiitg.ac.in',code_challenge:sha256base64url(verifier),code_challenge_method:CodeChallengeMethod.S256,prompt:'select_account'});
  res.redirect(url);
 });
});
authRouter.get('/google/callback',async(req,res,next)=>{try{
 const {code,state,error}=req.query;
 if(error){res.status(401).json({error:'Google authorization cancelled or denied'});return;}
 if(typeof code!=='string'||typeof state!=='string'||state!==req.session.oauthState||!req.session.oauthCodeVerifier){res.status(400).json({error:'Invalid OAuth state'});return;}
 const codeVerifier=req.session.oauthCodeVerifier;
 delete req.session.oauthState;delete req.session.oauthCodeVerifier;
 const {tokens}=await client.getToken({code,codeVerifier,redirect_uri:config.GOOGLE_CALLBACK_URL});
 if(!tokens.id_token){res.status(401).json({error:'No identity token returned'});return;}
 const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.GOOGLE_CLIENT_ID});
 const payload=ticket.getPayload();
 if(!payload?.sub||!payload.email||!isInstitutionEmail(payload.email,payload.email_verified===true,payload.hd)){
  res.status(403).json({error:'Only verified @iiitg.ac.in Google accounts are allowed'});return;
 }
 const email=payload.email.toLowerCase();
 const user=await prisma.$transaction(async tx=>{
  const existing=await tx.user.findUnique({where:{googleSub:payload.sub}});
  if(existing && existing.email!==email){
   const collision=await tx.user.findUnique({where:{email}});
   if(collision && collision.id!==existing.id) throw new Error('Email already associated with another account');
  }
  const adminEmails=config.BOOTSTRAP_ADMIN_EMAILS.split(',').map(s=>s.trim().toLowerCase());
  const record=existing ? await tx.user.update({where:{id:existing.id},data:{email,lastLogin:new Date()}})
   : await tx.user.create({data:{googleSub:payload.sub!,email,role:adminEmails.includes(email)?'ADMIN':'MEMBER'}});
  const hasProfile=await tx.memberProfile.findUnique({where:{ownerId:record.id}});
  if(!hasProfile){
   const matches=await tx.memberProfile.findMany({where:{ownerId:null,legacyEmail:{equals:email,mode:'insensitive'}},take:2});
   if(matches.length===1){
    await tx.memberProfile.updateMany({where:{id:matches[0].id,ownerId:null},data:{ownerId:record.id}});
   }
  }
  return record;
 });
 req.session.regenerate(err=>{
  if(err){next(err);return;}
  req.session.userId=user.id;
  req.session.save(saveError=>saveError?next(saveError):res.redirect(new URL('/dashboard',config.FRONTEND_URL).toString()));
 });
 }catch(err){next(err);}});
// Reconcile legacy imports for users who logged in before their profile was linked.
// Claim only when exactly one unowned profile has the authenticated, verified email.
async function reconcileProfile(userId:string,email:string){
 const normalized=email.trim().toLowerCase();
 return prisma.$transaction(async tx=>{
  const owned=await tx.memberProfile.findUnique({where:{ownerId:userId}});
  if(owned)return owned;
  const candidates=await tx.memberProfile.findMany({
   where:{ownerId:null,legacyEmail:{equals:normalized,mode:'insensitive'}},take:2
  });
  if(candidates.length!==1)return null;
  const claimed=await tx.memberProfile.updateMany({
   where:{id:candidates[0].id,ownerId:null},data:{ownerId:userId}
  });
  return claimed.count===1 ? tx.memberProfile.findUnique({where:{ownerId:userId}}) : null;
 });
}
authRouter.get('/me',async(req,res,next)=>{try{
 if(!req.session.userId){res.status(401).json({error:'Not signed in'});return;}
 const user=await prisma.user.findUnique({where:{id:req.session.userId},include:{profile:true}});
 if(!user){res.status(401).json({error:'Session expired'});return;}
 const profile=user.profile ?? await reconcileProfile(user.id,user.email);
 res.setHeader('Cache-Control','no-store');
 res.json({id:user.id,email:user.email,role:user.role,profile});
 }catch(err){next(err);}});
authRouter.post('/logout',(req,res,next)=>{
 req.session.destroy(err=>{if(err){next(err);return;}res.clearCookie('iiitg.sid');res.status(204).end();});
});
