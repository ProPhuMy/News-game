import { CLAIM_BEHAVIOR, type Behavior, type Location } from '../shared/ids.ts';
import type { Exposure, ReactionEntry, ReactionPlan, Recap } from '../shared/snapshots.ts';
import { FLEE_NODES, LOCATION_NODES, OFFICE_NODES, STREET_EDGES, STREET_NODES } from '../shared/town-map.ts';
import { TUNING } from '../shared/tuning.ts';
import type { CitizenChoice } from './citizens.ts';
import type { Headline, MatchState } from './state.ts';

const NEIGHBORS: ReadonlyMap<string, readonly string[]> = (() => {
  const m = new Map<string, string[]>(STREET_NODES.map((n) => [n.id, []]));
  for (const [a, b] of STREET_EDGES) {
    m.get(a)!.push(b);
    m.get(b)!.push(a);
  }
  for (const list of m.values()) list.sort();
  return m;
})();

/** Shortest route on the street graph, both ends included. */
export function bfsPath(from: string, to: string): string[] {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === to) break;
    for (const next of NEIGHBORS.get(node) ?? []) {
      if (!prev.has(next)) { prev.set(next, node); queue.push(next); }
    }
  }
  if (!prev.has(to)) throw new Error(`no route from ${from} to ${to}`);
  const path: string[] = [];
  for (let n: string | null = to; n !== null; n = prev.get(n) ?? null) path.unshift(n);
  return path;
}

export function fleeTarget(location: Location): string {
  const from = LOCATION_NODES[location];
  return FLEE_NODES.reduce((best, node) => (bfsPath(from, node).length > bfsPath(from, best).length ? node : best));
}

function targetNode(s: MatchState, h: Headline, behavior: Behavior): string {
  if (h.claim === 'expose') {
    const exposed = s.headlines.find((x) => x.id === h.exposeOf);
    return OFFICE_NODES[exposed!.seatId]!;
  }
  return behavior === 'flee' ? fleeTarget(h.location) : LOCATION_NODES[h.location];
}

function recapOf(fresh: readonly Headline[], entries: readonly ReactionEntry[], choices: readonly CitizenChoice[]): Recap {
  const crowd = new Map<string, number>();
  choices.forEach((ch, i) => {
    const b = entries[i]!.behavior;
    if (ch.top && b !== 'routine' && b !== 'angry_mob') crowd.set(ch.top.id, (crowd.get(ch.top.id) ?? 0) + 1);
  });
  let headlineId: string | null = null;
  let reactors = 0;
  for (const [id, n] of [...crowd].sort((a, b) => a[0].localeCompare(b[0]))) if (n > reactors) { headlineId = id; reactors = n; }

  const gains = new Map<number, number>();
  for (const ch of choices) if (ch.to !== null && ch.to !== ch.from) gains.set(ch.to, (gains.get(ch.to) ?? 0) + 1);
  let gainSeatId: number | null = null;
  let gained = 0;
  for (const [seat, n] of [...gains].sort((a, b) => a[0] - b[0])) if (n > gained) { gainSeatId = seat; gained = n; }

  const top = fresh.find((h) => h.id === headlineId);
  return {
    headlineId, location: top?.location ?? null, behavior: top ? CLAIM_BEHAVIOR[top.claim] : 'routine',
    reactors, gainSeatId, gained,
  };
}

/** The renderer contract: what each citizen does this reveal. The renderer never decides. */
export function buildReactionPlan(s: MatchState, fresh: readonly Headline[], exposures: Exposure[], choices: readonly CitizenChoice[]): ReactionPlan {
  const exposedSeats = new Set(exposures.map((e) => e.seatId));
  const unused = new Map(fresh.map((h) => [h.id, h.rating?.inappropriate ? [] : [...(h.rating?.bubbles ?? [])]]));
  let shown = 0;

  const citizens = choices.map((ch): ReactionEntry => {
    const c = s.citizens[ch.citizenId]!;
    const base = { citizenId: c.id, fromPaper: ch.from, toPaper: ch.to };
    if (ch.from !== null && ch.to !== ch.from && exposedSeats.has(ch.from)) {
      return { ...base, behavior: 'angry_mob', route: bfsPath(c.home, OFFICE_NODES[ch.from]!), bubble: null };
    }
    if (!ch.top || ch.topAppeal < TUNING.appeal.reactMin) return { ...base, behavior: 'routine', route: [c.home], bubble: null };
    const behavior = CLAIM_BEHAVIOR[ch.top.claim];
    const bubble = shown < TUNING.limits.maxBubbles ? (unused.get(ch.top.id)?.shift() ?? null) : null;
    if (bubble !== null) shown++;
    return { ...base, behavior, route: bfsPath(c.home, targetNode(s, ch.top, behavior)), bubble };
  });

  return { round: s.round, exposures, citizens, recap: recapOf(fresh, citizens, choices) };
}
