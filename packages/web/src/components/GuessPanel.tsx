import {
  ActiveGuess,
  PlayerResponseSchema,
  type GuessDirection,
  type PlayerResponse,
  type ResolvedGuess,
} from '@btc-predictor/common';
import { useEffect, useRef, useState } from 'react';

import { createPlayerGuess, requestPlayer } from '../http';
import { formatUsdPrice } from '../price';
import './GuessPanel.css';

const RESULT_VISIBILITY_MS = 4_000;

export function GuessPanel({
  activeGuess,
  resolvedGuess,
  refreshError,
  onPlayerChange,
}: {
  activeGuess: ActiveGuess | null;
  resolvedGuess?: ResolvedGuess;
  refreshError?: string;
  onPlayerChange: (response: PlayerResponse) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<ResolvedGuess>();
  const previousResultId = useRef<string | undefined>(undefined);

  // Keep the visible countdown current while a guess is locked.
  useEffect(() => {
    if (!activeGuess) {
      return;
    }

    setNow(Date.now());
    const countdownTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(countdownTimer);
  }, [activeGuess]);

  // Briefly animate each new resolution returned by the API.
  useEffect(() => {
    if (!resolvedGuess || resolvedGuess.id === previousResultId.current) {
      return;
    }

    previousResultId.current = resolvedGuess.id;
    setResult(resolvedGuess);
    const resultTimer = window.setTimeout(() => setResult(undefined), RESULT_VISIBILITY_MS);
    return () => window.clearTimeout(resultTimer);
  }, [resolvedGuess]);

  const secondsRemaining = activeGuess
    ? Math.max(0, Math.ceil((Date.parse(activeGuess.eligibleAt) - now) / 1_000))
    : 0;

  const submitGuess = async (direction: GuessDirection) => {
    setSubmitError(undefined);
    setIsSubmitting(true);

    try {
      const response = await createPlayerGuess({ direction });

      if (response.status === 409) {
        const currentPlayer = await requestPlayer();

        if (currentPlayer) {
          onPlayerChange(currentPlayer);
        }

        setSubmitError('A guess is already active.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Guess request failed with status ${response.status}`);
      }

      onPlayerChange(PlayerResponseSchema.parse(await response.json()));
    } catch {
      setSubmitError('Unable to place your guess. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="guess-panel" aria-labelledby="guess-heading">
      {result ? <GuessResult result={result} /> : null}

      {activeGuess ? (
        <div className="active-guess">
          <div>
            <p className="guess-kicker">Prediction locked</p>
            <h2 id="guess-heading">
              <span aria-hidden="true">{activeGuess.direction === 'up' ? '↑' : '↓'}</span>{' '}
              {activeGuess.direction === 'up' ? 'Up' : 'Down'} from{' '}
              {formatUsdPrice(activeGuess.entryPrice)}
            </h2>
          </div>
          <p className="guess-timer" aria-live="polite">
            {secondsRemaining > 0
              ? `${secondsRemaining}s until resolution`
              : 'Waiting for the price to change…'}
          </p>
        </div>
      ) : (
        <>
          <div className="guess-heading">
            <div>
              <p className="guess-kicker">Your prediction</p>
              <h2 id="guess-heading">Where will Bitcoin move in one minute?</h2>
            </div>
          </div>
          <div className="guess-actions">
            <button
              className="guess-button guess-button--up"
              type="button"
              disabled={isSubmitting}
              onClick={() => void submitGuess('up')}
            >
              <span aria-hidden="true">↑</span> Up
            </button>
            <button
              className="guess-button guess-button--down"
              type="button"
              disabled={isSubmitting}
              onClick={() => void submitGuess('down')}
            >
              <span aria-hidden="true">↓</span> Down
            </button>
          </div>
        </>
      )}

      {submitError || refreshError ? (
        <p className="guess-error" role="alert">
          {submitError ?? refreshError}
        </p>
      ) : null}
    </section>
  );
}

function GuessResult({ result }: { result: ResolvedGuess }) {
  const isCorrect = result.outcome === 'correct';

  return (
    <output className={`guess-result guess-result--${result.outcome}`} aria-live="polite">
      <span className="guess-result-icon" aria-hidden="true">
        {isCorrect ? '✓' : '×'}
      </span>
      <span>
        <strong>{isCorrect ? 'Correct! +1 point' : 'Incorrect. −1 point'}</strong>
        <small>
          {formatUsdPrice(result.entryPrice)} → {formatUsdPrice(result.exitPrice)}
        </small>
      </span>
    </output>
  );
}
