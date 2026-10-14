import { z } from 'zod';
import type { Claim, Location, Personality } from './ids.ts';
import { TUNING } from './tuning.ts';

export const RatingSchema = z.object({
  juiciness: z.number().int().min(TUNING.juiceMin).max(TUNING.juiceMax),
  onTopic: z.boolean(),
  inappropriate: z.boolean(),
  bubbles: z.array(z.string().min(1).max(TUNING.limits.bubbleChars)).min(2).max(3),
});
export type Rating = z.infer<typeof RatingSchema>;

/** Headline text is untrusted data: always sent to the model inside a delimited data block. */
export interface RateHeadlineInput {
  text: string;
  location: Location;
  claim: Claim;
  exposedHeadlineText?: string;
  /** Prepared by the engine (headlineLocked.fallbackRating); the adapter returns it only on provider failure. Never sent to the model. */
  fallbackRating?: Rating;
}
export interface WriteBotHeadlineInput { personality: Personality; location: Location; claim: Claim; exposedHeadlineText?: string }

/** Implemented by Codex in src/ai/. Never rejects: falls back on timeout (TUNING.limits.aiTimeoutMs) or bad output. */
export interface AiAdapter {
  rateHeadline(input: RateHeadlineInput): Promise<Rating>;
  writeBotHeadline(input: WriteBotHeadlineInput): Promise<string>;
}
