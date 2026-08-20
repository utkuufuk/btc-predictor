import {
  BtcPrice,
  BtcPriceSchema,
  PlayerResponseSchema,
  type CreateGuessRequest,
  type CreatePlayerRequest,
  type Player,
  type PlayerResponse,
  type ResolvedGuess,
} from '@btc-predictor/common';

import { authorizedFetch } from './firebase';

export type PlayerState = {
  value?: Player;
  resolvedGuess?: ResolvedGuess;
  isLoading: boolean;
  error?: string;
};

export async function requestBtcPrice(): Promise<BtcPrice> {
  const response = await fetch('/api/btc-price');

  if (!response.ok) {
    throw new Error(`BTC price request failed with status ${response.status}`);
  }

  return BtcPriceSchema.parse(await response.json());
}

export async function requestPlayer(): Promise<PlayerResponse | undefined> {
  const response = await authorizedFetch('/api/player');

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Player request failed with status ${response.status}`);
  }

  return PlayerResponseSchema.parse(await response.json());
}

export async function createPlayerProfile(request: CreatePlayerRequest): Promise<Response> {
  return authorizedFetch('/api/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export async function createPlayerGuess(request: CreateGuessRequest): Promise<Response> {
  return authorizedFetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}
