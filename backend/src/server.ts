import { app, beginDrain, closeAppResources } from './app.js';
import { config } from './lib/config.js';
import { disconnectDatabases } from './lib/db.js';
import { closeCache } from './lib/cache.js';
import { warmRepositoryCache } from './lib/github.js';
import { drainServer } from './lib/lifecycle.js';
const server=app.listen(config.PORT,()=>{console.log(`IIITG API listening on http://localhost:${config.PORT}`);void warmRepositoryCache().catch(()=>console.error({event:'repository_warmup_failed'}))});
const refreshTimer=setInterval(()=>{void warmRepositoryCache().catch(()=>console.error({event:'repository_warmup_failed'}))},60*1000);refreshTimer.unref();
let shuttingDown=false;
async function shutdown(){
 if(shuttingDown)return;
 shuttingDown=true;beginDrain();clearInterval(refreshTimer);
 const deadline=setTimeout(()=>process.exit(1),30000);deadline.unref();
 try{
  await drainServer(server,async()=>{closeCache();await Promise.all([closeAppResources(),disconnectDatabases()]);});
  clearTimeout(deadline);process.exit(0);
 }catch{console.error({event:'shutdown_failed'});process.exit(1);}
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
