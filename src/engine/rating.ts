import { RatingSchema, type Rating } from '../shared/ai.ts';
import type { Claim } from '../shared/ids.ts';
import { HeadlineTextSchema } from '../shared/protocol.ts';
import { TUNING } from '../shared/tuning.ts';
import { stream } from './rng.ts';
import type { Headline, MatchState } from './state.ts';

const clampJuice = (j: number) => Math.min(TUNING.juiceMax, Math.max(TUNING.juiceMin, j));

/** round((ai + baseHype) / 2), clamped; off-topic or pulled = 1; all_clear capped at 2. */
export function effectiveJuiciness(claim: Claim, rating: Rating): number {
  if (!rating.onTopic || rating.inappropriate) return TUNING.juiceMin;
  const j = clampJuice(Math.round((rating.juiciness + TUNING.baseHype[claim]) / 2));
  return claim === 'all_clear' ? Math.min(j, TUNING.allClearJuiceCap) : j;
}

/** Effective juiciness of a revealed headline. */
export function juiceOf(h: Headline): number {
  if (!h.rating) throw new Error(`headline ${h.id} is unrated`);
  return effectiveJuiciness(h.claim, h.rating);
}

/** Used for any headline still unrated at reveal, so the reveal never waits for the AI. */
export function fallbackRating(s: MatchState, h: Headline): Rating {
  const rng = stream(s.seed, 'fallback', h.id);
  const p = h.authorPersonality;
  const juiciness = p === null
    ? TUNING.baseHype[h.claim]
    : p === 'wildcard'
      ? TUNING.juiceMin + rng.int(TUNING.juiceMax - TUNING.juiceMin + 1)
      : TUNING.bots.fallbackJuice[p];
  return { juiciness, onTopic: true, inappropriate: false, bubbles: rng.shuffle(s.content.bubbles[h.claim]).slice(0, 2) };
}

/** AI results enter as data. Late (already revealed), unknown or invalid ratings are ignored. */
export function applyRating(state: MatchState, headlineId: string, rating: Rating, botText?: string): MatchState {
  const target = state.headlines.find((h) => h.id === headlineId);
  const parsed = RatingSchema.safeParse(rating);
  if (!target || target.revealed || !parsed.success) return state;
  const s = structuredClone(state);
  const h = s.headlines.find((x) => x.id === headlineId)!;
  h.rating = parsed.data;
  if (botText !== undefined && h.botAuthored) {
    const text = HeadlineTextSchema.safeParse(botText);
    if (text.success) h.text = text.data;
  }
  s.version++;
  return s;
}
