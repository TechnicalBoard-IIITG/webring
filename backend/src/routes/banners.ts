import { invalidatePublic } from '../lib/cache.js';
import { Router } from 'express';
import multer from 'multer';
import { imageType, storeBanner } from '../lib/storage.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/db.js';

export const bannersRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }});
// All changes are made on the authenticated user's profile. No profile ID from the browser is trusted.
bannersRouter.post('/me', requireAuth, (req,res,next) => {
  upload.single('banner')(req,res,async err => {
    if (err) return next(err);
    if (!req.file) { res.status(400).json({error:'Expected a banner image'}); return; }
    const ext=imageType(req.file.buffer);
    if (!ext || ext.mime !== req.file.mimetype) { res.status(415).json({error:'Upload a GIF, PNG, WebP or JPEG image'}); return; }
    try {
      const profile=await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
      if (!profile) {res.status(404).json({error:'Create or claim your profile first'});return;}
      const stored = await storeBanner(req.session.userId!, req.file.buffer, req.file.mimetype);
      const url = stored.url;
      try {
        await prisma.$transaction(async tx => {
          const after=await tx.memberProfile.update({where:{id:profile.id,ownerId:req.session.userId!},data:{banner:url}});
          await tx.profileRevision.create({data:{profileId:profile.id,actorId:req.session.userId!,before:JSON.parse(JSON.stringify(profile)),after:JSON.parse(JSON.stringify(after))}});
        });
      } catch (e) {await stored.remove().catch(()=>{});throw e;}
      await invalidatePublic('members');
      res.json({banner:url});
    } catch(e) {next(e);}
  });
});

// A user can clear a custom banner and return to the original GitHub GIF / random background.
bannersRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.memberProfile.findUnique({where:{ownerId:req.session.userId!}});
    if (!profile) {res.status(404).json({error:'Profile not found'});return;}
    const after = await prisma.$transaction(async tx => {
      const updated = await tx.memberProfile.update({where:{id:profile.id},data:{banner:null}});
      await tx.profileRevision.create({data:{profileId:profile.id,actorId:req.session.userId!,before:JSON.parse(JSON.stringify(profile)),after:JSON.parse(JSON.stringify(updated))}});
      return updated;
    });
    await invalidatePublic('members');
    res.json({banner:after.banner});
  } catch(error){next(error);}
});
