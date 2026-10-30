import type { RequestHandler } from 'express';
import { prisma } from '../lib/db.js';
export const requireAuth: RequestHandler = (req,res,next) => {
 if (!req.session.userId) { res.status(401).json({ error: 'Authentication required' }); return; }
 next();
};
export const requireAdmin: RequestHandler = async (req,res,next) => {
 if (!req.session.userId) { res.status(401).json({ error: 'Authentication required' }); return; }
 try {
  const user = await prisma.user.findUnique({where:{id:req.session.userId}});
  if(user?.role!=='ADMIN') {res.status(403).json({error:'Admin access required'});return;}
  next();
 } catch(err){next(err);}
};
