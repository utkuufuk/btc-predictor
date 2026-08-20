import { z } from 'zod';

import { BtcPriceSchema } from './btc-price.js';

export const GUESS_DURATION_MS = 60_000;

export const GuessDirectionSchema = z.enum(['up', 'down']);

export const ActiveGuessSchema = z.object({
  id: z.string().min(1),
  direction: GuessDirectionSchema,
  entryPrice: BtcPriceSchema.shape.price,
  entryPriceObservedAt: BtcPriceSchema.shape.observedAt,
  placedAt: z.iso.datetime(),
  eligibleAt: z.iso.datetime(),
});

export const GuessOutcomeSchema = z.enum(['correct', 'incorrect']);

export const ResolvedGuessSchema = ActiveGuessSchema.extend({
  exitPrice: BtcPriceSchema.shape.price,
  exitPriceObservedAt: BtcPriceSchema.shape.observedAt,
  resolvedAt: z.iso.datetime(),
  outcome: GuessOutcomeSchema,
  scoreDelta: z.union([z.literal(1), z.literal(-1)]),
});

export const CreateGuessRequestSchema = z.object({
  direction: GuessDirectionSchema,
});

export type GuessDirection = z.infer<typeof GuessDirectionSchema>;
export type ActiveGuess = z.infer<typeof ActiveGuessSchema>;
export type ResolvedGuess = z.infer<typeof ResolvedGuessSchema>;
export type CreateGuessRequest = z.infer<typeof CreateGuessRequestSchema>;
