import express from 'express';
import helmet from 'helmet';
import { createApiRouter } from './apiRouter';
import { ClusterFacade, clusterState } from './clusterStore';

export interface CreateAppOptions {
  cluster?: ClusterFacade;
  isProduction?: boolean;
}

export function createApp(options?: CreateAppOptions): express.Express {
  const app = express();
  const isProduction = options?.isProduction ?? process.env.NODE_ENV === 'production';

  // Trust reverse proxy headers (Cloud Run) for accurate rate limiting
  app.set('trust proxy', 1);

  // Security headers via Helmet (compatible with AI Studio iframe and Firebase Auth popups)
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://apis.google.com', 'https://*.firebaseapp.com'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: [
                "'self'",
                'https://*.googleapis.com',
                'https://*.firebaseio.com',
                'https://*.firebaseapp.com',
                'wss://*.firebaseio.com',
              ],
              frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
              frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.google.com'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      frameguard: false,
    })
  );

  // JSON request body parser
  app.use(express.json({ limit: '1mb' }));

  // Mount API Endpoints
  app.use('/api', createApiRouter(options?.cluster ?? clusterState));

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), platform: 'Orchestrix v2.4' });
  });

  return app;
}
