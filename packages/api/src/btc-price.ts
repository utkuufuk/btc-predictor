import type { BtcPrice } from '@btc-predictor/common';
import { z } from 'zod';

const COINBASE_TICKER_URL = 'https://api.exchange.coinbase.com/products/BTC-USD/ticker';
const CACHE_TTL_MS = 1_000;
const REQUEST_TIMEOUT_MS = 5_000;

const CoinbaseTickerSchema = z
  .object({
    price: z.string().transform(Number).pipe(z.number().positive()),
    time: z.iso.datetime(),
  })
  .transform(({ price, time }): BtcPrice => ({
    pair: 'BTC-USD',
    price,
    observedAt: new Date(time).toISOString(),
  }));

type CachedPrice = {
  value: BtcPrice;
  expiresAt: number;
};

let cachedPrice: CachedPrice | undefined;
let pendingRequest: Promise<BtcPrice> | undefined;

export async function getLatestBtcPrice(): Promise<BtcPrice> {
  if (cachedPrice && cachedPrice.expiresAt > Date.now()) {
    return cachedPrice.value;
  }

  if (!pendingRequest) {
    pendingRequest = fetchBtcPrice();
  }

  try {
    const value = await pendingRequest;
    cachedPrice = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } finally {
    pendingRequest = undefined;
  }
}

async function fetchBtcPrice(): Promise<BtcPrice> {
  const response = await fetch(COINBASE_TICKER_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Coinbase request failed with status ${response.status}`);
  }

  const value = await response.json();
  return CoinbaseTickerSchema.parse(value);
}
