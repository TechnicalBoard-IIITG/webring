import type { Server } from 'node:http';

export async function drainServer(server: Server, dispose: () => Promise<void>, graceMs=25000) {
 let timer:ReturnType<typeof setTimeout>|undefined;
 try {
  await new Promise<void>((resolve,reject) => {
   timer=setTimeout(() => {server.closeAllConnections();reject(Error('Shutdown deadline exceeded'));},graceMs);
   timer.unref();
   server.close(error => error ? reject(error) : resolve());
   server.closeIdleConnections();
  });
 } finally {
  clearTimeout(timer);
  await dispose();
 }
}
