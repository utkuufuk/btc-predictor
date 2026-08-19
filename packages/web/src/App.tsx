import { BtcPriceSchema, type BtcPrice } from '@btc-predictor/common';
import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 1_000;
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type PriceState = {
  value?: BtcPrice;
  isLoading: boolean;
  hasError: boolean;
};

export function App() {
  const [priceState, setPriceState] = useState<PriceState>({
    isLoading: true,
    hasError: false,
  });

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
          setPriceState({ value, isLoading: false, hasError: false });
        }
      } catch (error) {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPriceState(current => ({ ...current, isLoading: false, hasError: true }));
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

  const { value, isLoading, hasError } = priceState;

  return (
    <main>
      <p className="eyebrow">One-minute market predictions</p>
      <h1>BTC Predictor</h1>

      <section className="price-card" aria-labelledby="btc-price-heading">
        <div className="price-heading">
          <div>
            <p className="asset-name">Bitcoin</p>
            <h2 id="btc-price-heading">BTC / USD</h2>
          </div>
          <span className="live-indicator">
            <span className="live-dot" aria-hidden="true" /> Live
          </span>
        </div>

        <data className="price" value={value?.price}>
          {value ? usdFormatter.format(value.price) : '$—'}
        </data>

        <p className={hasError ? 'price-status price-status--error' : 'price-status'}>
          {hasError
            ? 'Unable to refresh. Retrying…'
            : value
              ? `Updated ${formatTime(value.observedAt)}`
              : isLoading
                ? 'Fetching the latest price…'
                : 'Price unavailable'}
        </p>
      </section>

      <p className="attribution">Market data provided by Coinbase.</p>
    </main>
  );
}

async function requestBtcPrice(signal: AbortSignal): Promise<BtcPrice> {
  const response = await fetch('/api/btc-price', { signal });

  if (!response.ok) {
    throw new Error(`Price request failed with status ${response.status}`);
  }

  return BtcPriceSchema.parse(await response.json());
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
