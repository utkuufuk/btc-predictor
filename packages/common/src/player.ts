import { z } from 'zod';

import { ActiveGuessSchema, ResolvedGuessSchema } from './guess.js';

export const PlayerAliasSchema = z
  .string()
  .min(1, 'Enter an alias')
  .max(24, 'Use 24 characters or fewer')
  .regex(/^[a-zA-Z0-9]+$/, 'Use letters and numbers only');

export const PlayerSchema = z.object({
  alias: PlayerAliasSchema,
  score: z.number().int(),
  activeGuess: ActiveGuessSchema.nullable().default(null),
});

export const PlayerResponseSchema = z.object({
  player: PlayerSchema,
  resolvedGuess: ResolvedGuessSchema.nullable(),
});

export const CreatePlayerRequestSchema = z.object({
  alias: PlayerAliasSchema,
});

export type CreatePlayerRequest = z.infer<typeof CreatePlayerRequestSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type PlayerResponse = z.infer<typeof PlayerResponseSchema>;
