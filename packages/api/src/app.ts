import express from 'express';
import { fileURLToPath } from 'node:url';

import { getLatestBtcPrice } from './btc-price.js';

const WEB_ROOT = fileURLToPath(new URL('../../web/dist', import.meta.url));
const WEB_INDEX = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/btc-price', async (_request, response) => {
    try {
      const btcPrice = await getLatestBtcPrice();

      // The backend cache, rather than an HTTP cache, should own BTC price freshness.
      response.set('Cache-Control', 'no-store').json(btcPrice);
    } catch {
      response.status(502).json({ error: 'BTC price is temporarily unavailable' });
    }
  });

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found' });
  });

  app.use(express.static(WEB_ROOT));

  app.get('/{*path}', (_request, response) => {
    response.sendFile(WEB_INDEX);
  });

  return app;
}
