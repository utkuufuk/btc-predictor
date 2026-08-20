import { PlayerSchema } from '@btc-predictor/common';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('player aliases are required and constrained', () => {
  assert.equal(PlayerSchema.safeParse({ alias: null, score: 0 }).success, false);
  assert.equal(PlayerSchema.safeParse({ alias: ' Satoshi ', score: 0 }).success, false);
  assert.equal(PlayerSchema.safeParse({ alias: 'Satoshi_21', score: 0 }).success, false);
  assert.equal(PlayerSchema.safeParse({ alias: 'a'.repeat(25), score: 0 }).success, false);
  assert.deepEqual(PlayerSchema.parse({ alias: 'Satoshi21', score: 0 }), {
    alias: 'Satoshi21',
    score: 0,
    activeGuess: null,
  });
});
