import type { EventTemplate } from '../shared/content-schema.ts';
import type { Tip } from '../shared/snapshots.ts';
import { stream } from './rng.ts';
import type { TownEvent } from './state.ts';

/** One tip per seat, each about a current event, no text repeated within the round. */
export function assignTips(seed: number, round: number, events: readonly TownEvent[], templates: readonly EventTemplate[], count: number): Tip[] {
  const rng = stream(seed, 'tips', round);
  const used = new Set<string>();
  const variants = (e: TownEvent) =>
    (templates.find((t) => t.id === e.templateId)?.tipVariants ?? []).filter((v) => !used.has(v));
  return Array.from({ length: count }, (): Tip => {
    const event = rng.pick(events.filter((e) => variants(e).length > 0));
    const text = rng.pick(variants(event));
    used.add(text);
    return { round, location: event.location, claim: event.claim, text };
  });
}
