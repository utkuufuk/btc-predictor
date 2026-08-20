import {
  ActiveGuessSchema,
  CreateGuessRequestSchema,
  PlayerResponseSchema,
  type ActiveGuess,
  type BtcPrice,
} from '@btc-predictor/common';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getResolvedGuess, isGuessEligible } from '../src/guesses.js';

const activeGuess: ActiveGuess = ActiveGuessSchema.parse({
  id: 'guess-1',
  direction: 'up',
  entryPrice: 100_000,
  entryPriceObservedAt: '2026-08-20T10:00:00.000Z',
  placedAt: '2026-08-20T10:00:00.000Z',
  eligibleAt: '2026-08-20T10:01:00.000Z',
});

test('guess requests accept only up or down', () => {
  assert.deepEqual(CreateGuessRequestSchema.parse({ direction: 'up' }), { direction: 'up' });
  assert.deepEqual(CreateGuessRequestSchema.parse({ direction: 'down' }), { direction: 'down' });
  assert.equal(CreateGuessRequestSchema.safeParse({ direction: 'sideways' }).success, false);
});

test('a guess cannot resolve before 60 seconds', t => {
  const beforeEligibleAt = new Date('2026-08-20T10:00:59.999Z');
  t.mock.timers.enable({ apis: ['Date'], now: beforeEligibleAt });

  assert.equal(isGuessEligible(activeGuess, beforeEligibleAt), false);
  assert.equal(getResolvedGuess(activeGuess, quoteAt(100_001, beforeEligibleAt)), null);
});

test('a guess remains active at 60 seconds while the price is unchanged', t => {
  const eligibleAt = new Date(activeGuess.eligibleAt);
  t.mock.timers.enable({ apis: ['Date'], now: eligibleAt });

  assert.equal(isGuessEligible(activeGuess, eligibleAt), true);
  assert.equal(getResolvedGuess(activeGuess, quoteAt(activeGuess.entryPrice, eligibleAt)), null);
});

test('a guess can resolve at exactly 60 seconds when the price differs', t => {
  const eligibleAt = new Date(activeGuess.eligibleAt);
  t.mock.timers.enable({ apis: ['Date'], now: eligibleAt });
  const result = getResolvedGuess(activeGuess, quoteAt(100_001, eligibleAt));

  assert.ok(result);
  assert.equal(result.outcome, 'correct');
});

test('an up guess wins when the first eligible differing price is higher', t => {
  const resolvedAt = new Date('2026-08-20T10:01:01.000Z');
  t.mock.timers.enable({ apis: ['Date'], now: resolvedAt });
  const result = getResolvedGuess(activeGuess, quoteAt(100_001, resolvedAt));

  assert.ok(result);
  assert.equal(result.outcome, 'correct');
  assert.equal(result.scoreDelta, 1);
  assert.equal(result.exitPrice, 100_001);
  assert.equal(result.resolvedAt, resolvedAt.toISOString());
  assert.equal(
    PlayerResponseSchema.parse({
      player: { alias: 'Satoshi21', score: 1 },
      resolvedGuess: result,
    }).resolvedGuess?.id,
    activeGuess.id,
  );
});

test('an up guess loses when the first eligible differing price is lower', t => {
  const resolvedAt = new Date('2026-08-20T10:01:01.000Z');
  t.mock.timers.enable({ apis: ['Date'], now: resolvedAt });
  const result = getResolvedGuess(activeGuess, quoteAt(99_999, resolvedAt));

  assert.ok(result);
  assert.equal(result.outcome, 'incorrect');
  assert.equal(result.scoreDelta, -1);
});

test('a down guess wins when the first eligible differing price is lower', t => {
  const resolvedAt = new Date('2026-08-20T10:01:01.000Z');
  t.mock.timers.enable({ apis: ['Date'], now: resolvedAt });
  const result = getResolvedGuess(
    { ...activeGuess, direction: 'down' },
    quoteAt(99_999, resolvedAt),
  );

  assert.ok(result);
  assert.equal(result.outcome, 'correct');
  assert.equal(result.scoreDelta, 1);
});

function quoteAt(price: number, observedAt: Date): BtcPrice {
  return {
    pair: 'BTC-USD',
    price,
    observedAt: observedAt.toISOString(),
  };
}
