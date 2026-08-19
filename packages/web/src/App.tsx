import {
  BtcPriceSchema,
  CreatePlayerRequestSchema,
  PlayerSchema,
  type BtcPrice,
  type Player,
} from '@btc-predictor/common';
import { useEffect, useState, type FormEvent } from 'react';

import { authorizedFetch } from './firebase';

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

type PlayerState = {
  value?: Player;
  isLoading: boolean;
  needsAlias?: boolean;
  error?: string;
};

export function App() {
  const [priceState, setPriceState] = useState<PriceState>({
    isLoading: true,
    hasError: false,
  });
  const [playerState, setPlayerState] = useState<PlayerState>({ isLoading: true });
  const [alias, setAlias] = useState('');
  const [aliasError, setAliasError] = useState<string>();
  const [isSavingAlias, setIsSavingAlias] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    void requestPlayer(controller.signal)
      .then(player => {
        if (isMounted) {
          setPlayerState({ value: player, isLoading: false, needsAlias: player === undefined });
        }
      })
      .catch(error => {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPlayerState({ isLoading: false, error: 'Unable to load your player' });
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

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

  const handleAliasSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = CreatePlayerRequestSchema.safeParse({ alias });

    if (!result.success) {
      setAliasError(result.error.issues[0]?.message ?? 'Enter a valid alias');
      return;
    }

    setAliasError(undefined);
    setIsSavingAlias(true);

    try {
      const response = await authorizedFetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (response.status === 409) {
        setAliasError('That alias is already taken. Choose another.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Alias request failed with status ${response.status}`);
      }

      const player = PlayerSchema.parse(await response.json());
      setPlayerState({ value: player, isLoading: false });
      setAlias(player.alias);
    } catch {
      setAliasError('Unable to save your alias. Try again.');
    } finally {
      setIsSavingAlias(false);
    }
  };

  return (
    <main>
      <section className="player-summary" aria-label="Player">
        <div>
          <p className="summary-label">Current score</p>
          <p className="score" aria-live="polite">
            {playerState.value?.score ?? (playerState.needsAlias ? 0 : '—')}
          </p>
        </div>
        <div className="player-identity">
          <p className="summary-label">Player</p>
          <p className={playerState.error ? 'player-name player-name--error' : 'player-name'}>
            {playerState.error
              ? playerState.error
              : playerState.value
                ? playerState.value.alias
                : playerState.isLoading
                  ? 'Connecting…'
                  : 'Choose an alias'}
          </p>
        </div>
      </section>

      <p className="eyebrow">One-minute market predictions</p>
      <h1>BTC Predictor</h1>

      {playerState.needsAlias ? (
        <form className="alias-form" onSubmit={handleAliasSubmit}>
          <div>
            <label htmlFor="player-alias">Choose your alias</label>
            <p>Use 1–24 letters or numbers. Aliases are case-sensitive.</p>
          </div>
          <div className="alias-controls">
            <input
              id="player-alias"
              name="alias"
              value={alias}
              maxLength={24}
              autoComplete="off"
              required
              disabled={isSavingAlias}
              onChange={event => {
                setAlias(event.target.value);
                setAliasError(undefined);
              }}
            />
            <button type="submit" disabled={isSavingAlias}>
              {isSavingAlias ? 'Saving…' : 'Save alias'}
            </button>
          </div>
          {aliasError ? (
            <p className="form-error" role="alert">
              {aliasError}
            </p>
          ) : null}
        </form>
      ) : null}

      <section className="price-card" aria-labelledby="btc-price-heading">
        <div className="price-heading">
          <div>
            <p className="asset-name">Bitcoin</p>
            <h2 id="btc-price-heading">BTC / USD</h2>
          </div>
          {value && !hasError ? (
            <span className="live-indicator">
              <span className="live-dot" aria-hidden="true" /> Live
            </span>
          ) : null}
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

async function requestPlayer(signal: AbortSignal): Promise<Player | undefined> {
  const response = await authorizedFetch('/api/player', { signal });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Player request failed with status ${response.status}`);
  }

  return PlayerSchema.parse(await response.json());
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
