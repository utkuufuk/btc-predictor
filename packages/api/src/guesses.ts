import {
  GUESS_DURATION_MS,
  PlayerSchema,
  type ActiveGuess,
  type BtcPrice,
  type GuessDirection,
  type Player,
  type PlayerResponse,
  type ResolvedGuess,
} from '@btc-predictor/common';
import { randomUUID } from 'node:crypto';

import { firestore } from './firebase.js';

export class ActiveGuessExistsError extends Error {}
export class PlayerNotFoundError extends Error {}

export async function createGuess(
  firebaseUid: string,
  direction: GuessDirection,
  entryQuote: BtcPrice,
): Promise<Player> {
  const playerRef = firestore.collection('players').doc(firebaseUid);

  return firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists) {
      throw new PlayerNotFoundError();
    }

    const player = PlayerSchema.parse(snapshot.data());
    if (player.activeGuess !== null) {
      throw new ActiveGuessExistsError();
    }

    const placedAt = new Date();
    const activeGuess: ActiveGuess = {
      id: randomUUID(),
      direction,
      entryPrice: entryQuote.price,
      entryPriceObservedAt: entryQuote.observedAt,
      placedAt: placedAt.toISOString(),
      eligibleAt: new Date(placedAt.getTime() + GUESS_DURATION_MS).toISOString(),
    };

    transaction.update(playerRef, {
      activeGuess,
      updatedAt: placedAt,
    });

    return { ...player, activeGuess };
  });
}

export async function resolveGuess(
  firebaseUid: string,
  exitQuote: BtcPrice,
): Promise<PlayerResponse> {
  const playerRef = firestore.collection('players').doc(firebaseUid);

  return firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists) {
      throw new PlayerNotFoundError();
    }

    const player = PlayerSchema.parse(snapshot.data());

    const resolvedGuess = getResolvedGuess(player.activeGuess, exitQuote);
    if (resolvedGuess === null) {
      return { player, resolvedGuess: null };
    }

    const updatedPlayer: Player = {
      ...player,
      score: player.score + resolvedGuess.scoreDelta,
      activeGuess: null,
    };

    transaction.update(playerRef, {
      score: updatedPlayer.score,
      activeGuess: null,
      updatedAt: new Date(resolvedGuess.resolvedAt),
    });

    return { player: updatedPlayer, resolvedGuess };
  });
}

export function getResolvedGuess(
  activeGuess: ActiveGuess | null,
  exitQuote: BtcPrice,
): ResolvedGuess | null {
  const resolvedAt = new Date();
  if (
    activeGuess === null ||
    !isGuessEligible(activeGuess, resolvedAt) ||
    exitQuote.price === activeGuess.entryPrice
  ) {
    return null;
  }

  const priceDirection = exitQuote.price > activeGuess.entryPrice ? 'up' : 'down';
  const outcome = priceDirection === activeGuess.direction ? 'correct' : 'incorrect';

  return {
    ...activeGuess,
    exitPrice: exitQuote.price,
    exitPriceObservedAt: exitQuote.observedAt,
    resolvedAt: resolvedAt.toISOString(),
    outcome,
    scoreDelta: outcome === 'correct' ? 1 : -1,
  };
}

export function isGuessEligible(activeGuess: ActiveGuess, now = new Date()): boolean {
  return now.getTime() >= Date.parse(activeGuess.eligibleAt);
}
