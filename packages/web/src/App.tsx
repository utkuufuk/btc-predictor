import {
  BtcPriceSchema,
  CreatePlayerRequestSchema,
  PlayerSchema,
  type BtcPrice,
  type Player,
} from '@btc-predictor/common';
import { useEffect, useState, type SubmitEvent } from 'react';

import { authorizedFetch } from './firebase';

const POLL_INTERVAL_MS = 1_000;

type PriceState = {
  value?: BtcPrice;
  hasError: boolean;
};

type PlayerState = {
  value?: Player;
  isLoading: boolean;
  error?: string;
};

type AliasSubmitActions = {
  setAlias: (alias: string) => void;
  setAliasError: (error: string | undefined) => void;
  setIsSavingAlias: (isSaving: boolean) => void;
  setPlayerState: (state: PlayerState) => void;
};

export function App() {
  const [{ value, hasError }, setPriceState] = useState<PriceState>({
    hasError: false,
  });
  const [player, setPlayer] = useState<PlayerState>({ isLoading: true });
  const [alias, setAlias] = useState('');
  const [aliasError, setAliasError] = useState<string>();
  const [isSavingAlias, setIsSavingAlias] = useState(false);

  // Load the authenticated player's persisted state once, aborting if the component unmounts.
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    void requestPlayer(controller.signal)
      .then(player => {
        if (isMounted) {
          setPlayer({ value: player, isLoading: false });
        }
      })
      .catch(error => {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPlayer({ isLoading: false, error: 'Unable to load your player' });
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Poll the BTC price.
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
          setPriceState({ value, hasError: false });
        }
      } catch (error) {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPriceState(current => ({ ...current, hasError: true }));
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

  const score = player.value?.score ?? (!player.isLoading && !player.error ? 0 : '—');
  const needsAlias = !player.value && !player.isLoading && !player.error;

  return (
    <main>
      <section className="player-summary" aria-label="Player">
        <div>
          <p className="summary-label">Current score</p>
          <p className="score" aria-live="polite">
            {score}
          </p>
        </div>
        <div className="player-identity">
          <p className="summary-label">Player</p>
          <p className={player.error ? 'player-name player-name--error' : 'player-name'}>
            {player.error
              ? player.error
              : player.value
                ? player.value.alias
                : player.isLoading
                  ? 'Connecting…'
                  : 'Choose an alias'}
          </p>
        </div>
      </section>

      <p className="eyebrow">One-minute market predictions</p>
      <h1>BTC Predictor</h1>

      {needsAlias ? (
        <form
          className="alias-form"
          onSubmit={event =>
            void handleAliasSubmit(event, alias, {
              setAlias,
              setAliasError,
              setIsSavingAlias,
              setPlayerState: setPlayer,
            })
          }
        >
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
          {value
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(value.price)
            : '$—'}
        </data>

        {hasError ? (
          <p className="price-error" aria-live="polite">
            Unable to refresh. Retrying…
          </p>
        ) : null}
      </section>

      <p className="attribution">Market data provided by Coinbase.</p>
    </main>
  );
}

async function handleAliasSubmit(
  event: SubmitEvent<HTMLFormElement>,
  alias: string,
  { setAlias, setAliasError, setIsSavingAlias, setPlayerState }: AliasSubmitActions,
): Promise<void> {
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
