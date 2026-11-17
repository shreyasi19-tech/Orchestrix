import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createApp } from './server/app';
import { shutdownClusterServices } from './server/clusterStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const distPath = path.resolve(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  const app = createApp({ isProduction });

  if (isProduction) {
    console.log(`[Orchestrix] Running in production mode, serving dist from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Orchestrix] Running in development mode with Vite middlewares');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Orchestrix Server] Listening on http://0.0.0.0:${PORT}`);
  });

  let shuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Orchestrix Server] Received ${signal}. Shutting down worker threads & flushing SQLite...`);

    const forceExitTimer = setTimeout(async () => {
      try {
        await shutdownClusterServices();
      } catch (err) {
        console.error('[Orchestrix Server] Error during forced state flush:', err);
      }
      process.exit(1);
    }, 5000);
    forceExitTimer.unref();

    server.close(async () => {
      try {
        await shutdownClusterServices();
        console.log('[Orchestrix Server] Worker threads stopped and SQLite state flushed cleanly.');
      } catch (err) {
        console.error('[Orchestrix Server] Failed to flush SQLite state on shutdown:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Orchestrix Server] Failed to start server:', err);
  process.exit(1);
});
