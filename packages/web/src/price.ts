export const PRICE_HISTORY_WINDOW_MS = 60_000;

export type PriceDirection = 'up' | 'down';

export type PriceSample = {
  price: number;
  sampledAt: number;
};

export function formatUsdPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function getPriceDirection(
  referencePrice: number | null,
  currentPrice: number,
): PriceDirection | null {
  if (referencePrice === null || currentPrice === referencePrice) {
    return null;
  }

  return currentPrice > referencePrice ? 'up' : 'down';
}

export function appendPriceSample(
  history: PriceSample[],
  price: number,
  sampledAt: number,
): PriceSample[] {
  return [...getRecentPriceSamples(history, sampledAt), { price, sampledAt }];
}

export function getRecentPriceSamples(history: PriceSample[], now: number): PriceSample[] {
  const windowStart = now - PRICE_HISTORY_WINDOW_MS;
  return history.filter(sample => sample.sampledAt >= windowStart);
}
