import { type ActiveGuess, type BtcPrice } from '@btc-predictor/common';
import { useEffect, useState } from 'react';

import { requestBtcPrice } from '../http';
import {
  appendPriceSample,
  formatUsdPrice,
  getPriceDirection,
  getRecentPriceSamples,
  type PriceDirection,
  type PriceSample,
} from '../price';
import './PriceCard.css';
import { PriceChart } from './PriceChart';

const POLL_INTERVAL_MS = 1_000;

type PriceState = {
  value?: BtcPrice;
  direction?: PriceDirection;
  history: PriceSample[];
  historyStartedAt?: number;
  hasError: boolean;
};

export function PriceCard({ activeGuess }: { activeGuess: ActiveGuess | null }) {
  const [{ value, direction, history, historyStartedAt, hasError }, setPriceState] =
    useState<PriceState>({
      history: [],
      hasError: false,
    });

  // Poll while visible; hidden tabs keep only the local timer alive so polling resumes naturally.
  useEffect(() => {
    let isMounted = true;
    let pollTimer: number | undefined;

    const scheduleNextPoll = () => {
      pollTimer = window.setTimeout(refreshPrice, POLL_INTERVAL_MS);
    };

    const refreshPrice = async () => {
      if (!isMounted) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        scheduleNextPoll();
        return;
      }

      try {
        const value = await requestBtcPrice();

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
              historyStartedAt: current.historyStartedAt ?? sampledAt,
              hasError: false,
            };
          });
        }
      } catch {
        if (isMounted) {
          setPriceState(current => ({
            ...current,
            history: getRecentPriceSamples(current.history, Date.now()),
            hasError: true,
          }));
        }
      } finally {
        if (isMounted) {
          scheduleNextPoll();
        }
      }
    };

    void refreshPrice();

    return () => {
      isMounted = false;
      window.clearTimeout(pollTimer);
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

      <PriceChart
        history={history}
        historyStartedAt={historyStartedAt}
        direction={direction}
        activeGuess={activeGuess}
      />
    </section>
  );
}
