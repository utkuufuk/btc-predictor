import { useEffect, useState } from 'react';

import { requestPlayer, type PlayerState } from './http';

const ACTIVE_GUESS_POLL_INTERVAL_MS = 1_000;

export function usePlayer() {
  const [playerState, setPlayerState] = useState<PlayerState>({ isLoading: true });

  // Load the authenticated player's persisted state.
  useEffect(() => {
    let isMounted = true;

    void requestPlayer()
      .then(response => {
        if (isMounted) {
          setPlayerState({
            value: response?.player,
            resolvedGuess: response?.resolvedGuess ?? undefined,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setPlayerState({ isLoading: false, error: 'Unable to load your player' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeGuess = playerState.value?.activeGuess;
  const activeGuessId = activeGuess?.id;
  const activeGuessEligibleAt = activeGuess?.eligibleAt;

  // Poll an eligible guess while visible.
  useEffect(() => {
    if (!activeGuessId || !activeGuessEligibleAt) {
      return;
    }

    let isMounted = true;
    let pollTimer: number | undefined;

    const scheduleNextPoll = (delay = ACTIVE_GUESS_POLL_INTERVAL_MS) => {
      pollTimer = window.setTimeout(refreshPlayer, delay);
    };

    const refreshPlayer = async () => {
      if (!isMounted) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        scheduleNextPoll();
        return;
      }

      try {
        const response = await requestPlayer();

        if (isMounted) {
          setPlayerState(current => ({
            value: response?.player,
            resolvedGuess: response?.resolvedGuess ?? current.resolvedGuess,
            isLoading: false,
          }));
        }
      } catch {
        if (isMounted) {
          setPlayerState(current => ({
            ...current,
            error: 'Unable to refresh your guess. Retrying…',
          }));
        }
      } finally {
        if (isMounted) {
          scheduleNextPoll();
        }
      }
    };

    const eligibilityDelay = Date.parse(activeGuessEligibleAt) - Date.now();
    scheduleNextPoll(eligibilityDelay > 0 ? eligibilityDelay : ACTIVE_GUESS_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(pollTimer);
    };
  }, [activeGuessEligibleAt, activeGuessId]);

  return { playerState, setPlayerState };
}
