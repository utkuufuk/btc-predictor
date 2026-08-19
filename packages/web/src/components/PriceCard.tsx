import { BtcPriceSchema, type BtcPrice } from '@btc-predictor/common';
import { useEffect, useState } from 'react';

import {
  appendPriceSample,
  formatUsdPrice,
  getPriceDirection,
  getRecentPriceSamples,
  type PriceDirection,
  type PriceSample,
} from '../price';
import { PriceChart } from './PriceChart';
import './PriceCard.css';

const POLL_INTERVAL_MS = 1_000;

type PriceState = {
  value?: BtcPrice;
  direction?: PriceDirection;
  history: PriceSample[];
  hasError: boolean;
};

export function PriceCard() {
  const [{ value, direction, history, hasError }, setPriceState] = useState<PriceState>({
    history: [],
    hasError: false,
  });

  // Poll the BTC price while the page is visible and stop all work when this component unmounts.
  useEffect(() => {
    let isMounted = true;
    let pollTimer: number | undefined;
    let requestController: AbortController | undefined;

    const scheduleNextPoll = () => {
      pollTimer = window.setTimeout(refreshPrice, POLL_INTERVAL_MS);
    };

    const refreshPrice = async () => {
      if (!isMounted || document.visibilityState === 'hidden') {
        return;
      }

      const controller = new AbortController();
      requestController = controller;

      try {
        const value = await requestBtcPrice(controller.signal);

        if (isMounted) {
          const sampledAt = Date.now();

          setPriceState(current => {
            const history = appendPriceSample(current.history, value.price, sampledAt);
            const referencePrice = history[0]?.price ?? null;
            const hasPriceChanged = value.price !== current.value?.price;

            return {
              value,
              direction: hasPriceChanged
                ? (getPriceDirection(referencePrice, value.price) ?? current.direction)
                : current.direction,
              history,
              hasError: false,
            };
          });
        }
      } catch (error) {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPriceState(current => ({
            ...current,
            history: getRecentPriceSamples(current.history, Date.now()),
            hasError: true,
          }));
        }
      } finally {
        if (requestController === controller) {
          requestController = undefined;
        }

        if (!controller.signal.aborted && isMounted && document.visibilityState === 'visible') {
          scheduleNextPoll();
        }
      }
    };

    const handleVisibilityChange = () => {
      window.clearTimeout(pollTimer);
      requestController?.abort();

      if (document.visibilityState === 'visible') {
        void refreshPrice();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void refreshPrice();

    return () => {
      isMounted = false;
      window.clearTimeout(pollTimer);
      requestController?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <section className="price-card" aria-labelledby="btc-price-heading">
      <div className="price-heading">
        <div>
          <p className="asset-name">Bitcoin</p>
          <h2 className="asset-pair" id="btc-price-heading">
            BTC / USD
          </h2>
        </div>
        {value && !hasError ? (
          <span className="live-indicator">
            <span className="live-dot" aria-hidden="true" /> Live
          </span>
        ) : null}
      </div>

      <data className={direction ? `price price--${direction}` : 'price'} value={value?.price}>
        {direction ? (
          <span className="price-direction" aria-hidden="true">
            {direction === 'up' ? '↑' : '↓'}
          </span>
        ) : null}
        {value ? formatUsdPrice(value.price) : '$—'}
      </data>

      {hasError ? (
        <p className="price-error" aria-live="polite">
          Unable to refresh. Retrying…
        </p>
      ) : null}

      <PriceChart history={history} direction={direction} />
    </section>
  );
}

async function requestBtcPrice(signal: AbortSignal): Promise<BtcPrice> {
  const response = await fetch('/api/btc-price', { signal });

  if (!response.ok) {
    throw new Error(`Price request failed with status ${response.status}`);
  }

  return BtcPriceSchema.parse(await response.json());
}
