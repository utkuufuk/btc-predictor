import {
  CreatePlayerRequestSchema,
  PlayerResponseSchema,
  type PlayerResponse,
} from '@btc-predictor/common';
import { useState, type SubmitEvent } from 'react';

import { createPlayerProfile, type PlayerState } from '../http';
import './PlayerSection.css';

type AliasSubmitActions = {
  setAlias: (alias: string) => void;
  setAliasError: (error: string | undefined) => void;
  setIsSavingAlias: (isSaving: boolean) => void;
  onPlayerChange: (response: PlayerResponse) => void;
};

export function PlayerSection({
  playerState,
  onPlayerChange,
}: {
  playerState: PlayerState;
  onPlayerChange: (response: PlayerResponse) => void;
}) {
  const [alias, setAlias] = useState('');
  const [aliasError, setAliasError] = useState<string>();
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const score =
    playerState.value?.score ?? (!playerState.isLoading && !playerState.error ? 0 : '—');
  const needsAlias = !playerState.value && !playerState.isLoading && !playerState.error;

  return (
    <>
      <section className="player-summary" aria-label="Player">
        <div>
          <p className="summary-label">Your score</p>
          <p className="score" aria-live="polite">
            {score}
          </p>
        </div>
        <div className="player-identity">
          <p className="summary-label">Player</p>
          <p
            className={
              playerState.error && !playerState.value
                ? 'player-name player-name--error'
                : 'player-name'
            }
          >
            {playerState.error && !playerState.value
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
      <h1 className="app-title">BTC Prediction App</h1>

      {needsAlias ? (
        <form
          className="alias-form"
          onSubmit={event =>
            void handleAliasSubmit(event, alias, {
              setAlias,
              setAliasError,
              setIsSavingAlias,
              onPlayerChange,
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
  { setAlias, setAliasError, setIsSavingAlias, onPlayerChange }: AliasSubmitActions,
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
    const response = await createPlayerProfile(result.data);

    if (response.status === 409) {
      setAliasError('That alias is already taken. Choose another.');
      return;
    }

    if (!response.ok) {
      throw new Error(`Alias request failed with status ${response.status}`);
    }

    const playerResponse = PlayerResponseSchema.parse(await response.json());
    onPlayerChange(playerResponse);
    setAlias(playerResponse.player.alias);
  } catch {
    setAliasError('Unable to save your alias. Try again.');
  } finally {
    setIsSavingAlias(false);
  }
}
