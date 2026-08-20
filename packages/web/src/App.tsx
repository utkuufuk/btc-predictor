import type { PlayerResponse } from '@btc-predictor/common';

import { GuessPanel } from './components/GuessPanel';
import { PlayerSection } from './components/PlayerSection';
import { PriceCard } from './components/PriceCard';
import { usePlayer } from './usePlayer';

export function App() {
  const { playerState, setPlayerState } = usePlayer();
  const updatePlayer = (response: PlayerResponse) =>
    setPlayerState(current => ({
      value: response.player,
      resolvedGuess: response.resolvedGuess ?? current.resolvedGuess,
      isLoading: false,
    }));

  return (
    <main>
      <PlayerSection playerState={playerState} onPlayerChange={updatePlayer} />
      <PriceCard activeGuess={playerState.value?.activeGuess ?? null} />
      {playerState.value ? (
        <GuessPanel
          activeGuess={playerState.value.activeGuess}
          resolvedGuess={playerState.resolvedGuess}
          refreshError={playerState.error}
          onPlayerChange={updatePlayer}
        />
      ) : null}
      <p className="attribution">Market data provided by Coinbase.</p>
    </main>
  );
}
