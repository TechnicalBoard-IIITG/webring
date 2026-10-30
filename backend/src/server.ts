import { app } from './app.js';
import { config } from './lib/config.js';
import { prisma } from './lib/db.js';
import { warmRepositoryCache } from './lib/github.js';
const server=app.listen(config.PORT,()=>{console.log(`IIITG API listening on http://localhost:${config.PORT}`);void warmRepositoryCache().catch(()=>console.error({event:'repository_warmup_failed'}))});
const refreshTimer=setInterval(()=>{void warmRepositoryCache().catch(()=>console.error({event:'repository_warmup_failed'}))},15*60*1000);refreshTimer.unref();
async function shutdown(){clearInterval(refreshTimer);server.close();await prisma.$disconnect();process.exit(0);}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
