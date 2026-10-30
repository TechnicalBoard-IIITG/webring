import express, {type ErrorRequestHandler} from 'express';
import { resolve } from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';
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
const PgStore=connectPgSimple(session);
const pool=new Pool({connectionString:config.DATABASE_URL,max:4,connectionTimeoutMillis:30000,idleTimeoutMillis:30000});
export const app=express();
app.disable('x-powered-by');
if(config.TRUST_PROXY==='true')app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(compression());
app.use(cors({origin(origin,callback){if(!origin||origins.includes(origin))return callback(null,true);callback(new Error('Origin not allowed'));},credentials:true}));
app.use(express.json({limit:'100kb'}));
app.use(session({name:'iiitg.sid',secret:config.SESSION_SECRET,resave:false,saveUninitialized:false,store:new PgStore({pool,tableName:'user_sessions',createTableIfMissing:true}),cookie:{httpOnly:true,secure:config.NODE_ENV==='production',sameSite:'lax',maxAge:7*24*60*60*1000}}));
// Mutating requests from browsers are limited to configured frontend origin(s).
app.use((req,res,next)=>{
 if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
 const origin=req.headers.origin;
 if(!origin||!origins.includes(origin)){res.status(403).json({error:'Untrusted request origin'});return;}
 next();
});
app.use('/api/',rateLimit({windowMs:15*60*1000,limit:200,standardHeaders:'draft-7',legacyHeaders:false}));
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.use('/uploads', express.static(resolve(process.cwd(), 'uploads'), {fallthrough:false, maxAge:'1d'}));
app.use('/api/banners',bannersRouter);
app.use('/api/members',membersRouter);
app.use('/api/members',githubRouter);
app.use('/api/repositories',repositoriesRouter);
app.use('/api/auth',authRouter);
app.use('/api/profile',profileRouter);
app.use('/api/admin',adminRouter);
app.use((_req,res)=>res.status(404).json({error:'Route not found'}));
const handleError:ErrorRequestHandler=(err,_req,res,_next)=>{
 void _next;
 if(err instanceof ZodError){res.status(400).json({error:'Validation failed',issues:err.flatten()});return;}
 if(err instanceof MulterError){res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Banner exceeds 5 MB':'Invalid banner upload'});return;}
 console.error({event:'request_failed',name:err?.name,code:err?.code});
 res.status(500).json({error:'Internal server error'});
};
app.use(handleError);
