import express, {type ErrorRequestHandler} from 'express';
import { resolve } from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { createApiLimits } from './lib/rate-limit.js';
import { prisma } from './lib/db.js';
import { ZodError } from 'zod';
import { config,origins } from './lib/config.js';
import { membersRouter } from './routes/members.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { adminRouter } from './routes/admin.js';
import { bannersRouter } from './routes/banners.js';
import { githubRouter } from './routes/github.js';
import { repositoriesRouter } from './routes/repositories.js';
import { MulterError } from 'multer';
import { BannerStorageError } from './lib/storage.js';
const PgStore=connectPgSimple(session);
const pool=new Pool({connectionString:config.DATABASE_URL,max:4,connectionTimeoutMillis:30000,idleTimeoutMillis:30000});
export const limits=createApiLimits({api:config.RATE_LIMIT_API,auth:config.RATE_LIMIT_AUTH,write:config.RATE_LIMIT_WRITE,upload:config.RATE_LIMIT_UPLOAD});
export async function closeAppResources(){limits.close();await pool.end();}
let draining=false;
export function beginDrain(){draining=true;}
export const app=express();
app.disable('x-powered-by');
if(config.TRUST_PROXY==='true')app.set('trust proxy',config.TRUST_PROXY_HOPS);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(compression());
app.use(cors({origin(origin,callback){if(!origin||origins.includes(origin))return callback(null,true);callback(new Error('Origin not allowed'));},credentials:true}));
app.use((_req,res,next)=>{if(draining){res.status(503).set('Connection','close').set('Retry-After','5').json({error:'Service restarting. Please retry.'});return;}next();});
// Health probes must remain available even when a client's API quota is exhausted.
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.get('/api/ready',async(_req,res)=>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try {
  await Promise.race([prisma.$queryRaw`SELECT 1`,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Database timeout')),2500);})]);
  res.json({status:'ready'});
 }catch{res.status(503).json({status:'unavailable'});}finally{clearTimeout(timer);}
});
// Reject excessive traffic before parsing bodies or consulting the session database.
app.use('/api',limits.api);
app.get('/api/auth/google',limits.auth);
app.use(express.json({limit:'100kb'}));
app.use(session({name:'iiitg.sid',secret:config.SESSION_SECRET,resave:false,saveUninitialized:false,store:new PgStore({pool,tableName:'user_sessions',createTableIfMissing:true}),cookie:{httpOnly:true,secure:config.NODE_ENV==='production',sameSite:'lax',maxAge:7*24*60*60*1000}}));
// Mutating requests from browsers are limited to configured frontend origin(s).
app.use((req,res,next)=>{
 if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
 const origin=req.headers.origin;
 if(!origin||!origins.includes(origin)){res.status(403).json({error:'Untrusted request origin'});return;}
 next();
});
app.use('/api',(req,res,next)=>['GET','HEAD','OPTIONS'].includes(req.method)?next():limits.write(req,res,next));
app.use('/api/banners',(req,res,next)=>req.method==='POST'?limits.upload(req,res,next):next());
app.use('/uploads', express.static(resolve(process.cwd(), 'uploads'), {fallthrough:false, maxAge:'1d'}));
app.use('/api/banners',bannersRouter);
app.use('/api/members',membersRouter);
app.use('/api/members',githubRouter);
app.use('/api/repositories',repositoriesRouter);
app.use('/api/auth',authRouter);
app.use('/api/profile',profileRouter);
app.use('/api/admin',adminRouter);
app.use((_req,res)=>res.status(404).json({error:'Route not found'}));
export const handleError:ErrorRequestHandler=(err,_req,res,_next)=>{
 void _next;
 if(err instanceof ZodError){res.status(400).json({error:'Validation failed',issues:err.flatten()});return;}
 if(err instanceof MulterError){res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Banner exceeds 5 MB':'Invalid banner upload'});return;}
 if(err instanceof BannerStorageError){
  console.error({event:'banner_storage_failed',message:err.message,detail:err.detail,cause:err.cause instanceof Error?err.cause.message:err.cause});
  res.status(503).json({error:err.message});
  return;
 }
 console.error({event:'request_failed',name:err?.name,code:err?.code,message:err?.message,stack:err?.stack});
 res.status(500).json({error:'Internal server error'});
};
app.use(handleError);
