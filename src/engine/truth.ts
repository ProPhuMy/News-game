import type { EventTemplate } from '../shared/content-schema.ts';
import type { Location, TownClaim } from '../shared/ids.ts';
import { TUNING } from '../shared/tuning.ts';
import { stream } from './rng.ts';
import type { MatchState, TownEvent } from './state.ts';

/** Roll this round's hidden events: distinct locations, each real with its template's pReal. */
export function rollEvents(seed: number, round: number, templates: readonly EventTemplate[]): TownEvent[] {
  const rng = stream(seed, 'events', round);
  const used = new Set<Location>();
  const out: TownEvent[] = [];
  for (const t of rng.shuffle(templates)) {
    if (used.has(t.location)) continue;
    used.add(t.location);
    out.push({ templateId: t.id, location: t.location, claim: t.realClaim, real: rng.chance(t.pReal) });
    if (out.length === TUNING.eventsPerRound) break;
  }
  return out;
}

/** The single true claim at a location this round. */
export function truthAt(events: readonly TownEvent[], location: Location): TownClaim {
  const event = events.find((e) => e.location === location);
  return event?.real ? event.claim : 'all_clear';
}

export function templateOf(s: MatchState, event: TownEvent): EventTemplate {
  const t = s.content.eventTemplates.find((x) => x.id === event.templateId);
  if (!t) throw new Error(`unknown template ${event.templateId}`);
  return t;
}
