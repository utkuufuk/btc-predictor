import { z } from 'zod';

export const BtcPriceSchema = z.object({
  pair: z.literal('BTC-USD'),
  price: z.number().positive(),
  observedAt: z.iso.datetime(),
});

export type BtcPrice = z.infer<typeof BtcPriceSchema>;
