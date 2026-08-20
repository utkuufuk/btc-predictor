import {
  CreateGuessRequestSchema,
  CreatePlayerRequestSchema,
  type ResolvedGuess,
} from '@btc-predictor/common';
import express from 'express';
import { fileURLToPath } from 'node:url';

import { getFirebaseUid, requireFirebaseUser } from './authentication.js';
import { getLatestBtcPrice } from './btc-price.js';
import {
  ActiveGuessExistsError,
  PlayerNotFoundError,
  createGuess,
  isGuessEligible,
  resolveGuess,
} from './guesses.js';
import { AliasTakenError, createPlayer, getPlayer } from './players.js';

const WEB_ROOT = fileURLToPath(new URL('../../web/dist', import.meta.url));
const WEB_INDEX = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());

  // Reports whether the API process is running.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  // Returns the latest BTC/USD quote shared by all connected players.
  app.get('/api/btc-price', async (_request, response) => {
    try {
      const btcPrice = await getLatestBtcPrice();

      // The backend cache, rather than an HTTP cache, should own BTC price freshness.
      response.set('Cache-Control', 'no-store').json(btcPrice);
    } catch {
      response.status(502).json({ error: 'BTC price is temporarily unavailable' });
    }
  });

  // Returns the authenticated player's persisted profile.
  app.get('/api/player', requireFirebaseUser, async (request, response) => {
    try {
      const firebaseUid = getFirebaseUid(request);
      let player = await getPlayer(firebaseUid);

      if (player === null) {
        response.status(404).set('Cache-Control', 'no-store').json({ error: 'Player not found' });
        return;
      }

      let resolvedGuess: ResolvedGuess | null = null;

      if (player.activeGuess !== null && isGuessEligible(player.activeGuess)) {
        const exitQuote = await getLatestBtcPrice();
        const resolution = await resolveGuess(firebaseUid, exitQuote);
        player = resolution.player;
        resolvedGuess = resolution.resolvedGuess;
      }

      response.set('Cache-Control', 'no-store').json({ player, resolvedGuess });
    } catch {
      response.status(500).json({ error: 'Player data is temporarily unavailable' });
    }
  });

  // Creates the authenticated player's profile after checking alias availability.
  app.post('/api/player', requireFirebaseUser, async (request, response) => {
    const result = CreatePlayerRequestSchema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid alias' });
      return;
    }

    try {
      const player = await createPlayer(getFirebaseUid(request), result.data.alias);
      response.status(201).json({ player, resolvedGuess: null });
    } catch (error) {
      if (error instanceof AliasTakenError) {
        response.status(409).json({ error: 'Alias is already taken' });
        return;
      }

      response.status(500).json({ error: 'Player data is temporarily unavailable' });
    }
  });

  // Starts a guess using an entry quote chosen by the backend.
  app.post('/api/guess', requireFirebaseUser, async (request, response) => {
    const result = CreateGuessRequestSchema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid guess' });
      return;
    }

    let entryQuote;

    try {
      entryQuote = await getLatestBtcPrice();
    } catch {
      response.status(502).json({ error: 'BTC price is temporarily unavailable' });
      return;
    }

    try {
      const player = await createGuess(getFirebaseUid(request), result.data.direction, entryQuote);
      response.status(201).json({ player, resolvedGuess: null });
    } catch (error) {
      if (error instanceof ActiveGuessExistsError) {
        response.status(409).json({ error: 'A guess is already active' });
        return;
      }

      if (error instanceof PlayerNotFoundError) {
        response.status(404).json({ error: 'Player not found' });
        return;
      }

      response.status(500).json({ error: 'Unable to create the guess' });
    }
  });

  // Returns JSON rather than the React app for unknown API routes.
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found' });
  });

  app.use(express.static(WEB_ROOT));

  // Supports client-side routes by falling back to the React entry point.
  app.get('/{*path}', (_request, response) => {
    response.sendFile(WEB_INDEX);
  });

  return app;
}
