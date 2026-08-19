import { CreatePlayerRequestSchema, PlayerSchema, type Player } from '@btc-predictor/common';
import { useEffect, useState, type SubmitEvent } from 'react';

import { authorizedFetch } from '../firebase';
import './PlayerSection.css';

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

export function PlayerSection() {
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

  const score = player.value?.score ?? (!player.isLoading && !player.error ? 0 : '—');
  const needsAlias = !player.value && !player.isLoading && !player.error;
  const scoreClassName =
    typeof score === 'number' && score !== 0
      ? `score score--${score > 0 ? 'positive' : 'negative'}`
      : 'score';

  return (
    <>
      <section className="player-summary" aria-label="Player">
        <div>
          <p className="summary-label">Current score</p>
          <p className={scoreClassName} aria-live="polite">
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
      <h1 className="app-title">BTC Predictor</h1>

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
            <p>Maximum 24 alphanumeric characters.</p>
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
    </>
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
