import { describe, expect, it } from 'vitest';
import type { CitizenChoice } from '../../src/engine/citizens.ts';
import { bfsPath, buildReactionPlan, fleeTarget } from '../../src/engine/reaction.ts';
import type { Headline } from '../../src/engine/state.ts';
import type { Exposure } from '../../src/shared/snapshots.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_EDGES } from '../../src/shared/town-map.ts';
import { makeHeadline, quietMatch, rated } from './helpers.ts';

const adjacent = (a: string, b: string) => STREET_EDGES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

describe('bfsPath', () => {
  it('finds a shortest street route', () => {
    const path = bfsPath('r0c0', 'r2c2');
    expect(path).toHaveLength(5);
    expect([path[0], path.at(-1)]).toEqual(['r0c0', 'r2c2']);
    for (let i = 1; i < path.length; i++) expect(adjacent(path[i - 1]!, path[i]!)).toBe(true);
    expect(bfsPath('r3c3', 'r3c3')).toEqual(['r3c3']);
  });

  it('flees to the farthest edge midpoint', () => {
    expect(fleeTarget('bakery')).toBe('r2c4');
  });
});

describe('buildReactionPlan', () => {
  const s = structuredClone(quietMatch());
  s.round = 2;
  const danger = makeHeadline({ seatId: 1, round: 2, location: 'bakery', claim: 'danger', rating: rated(4, { bubbles: ['A', 'B', 'C'] }) });
  const deal = makeHeadline({ seatId: 2, round: 2, location: 'bank', claim: 'great_deal' });
  const expose = makeHeadline({ seatId: 3, round: 2, location: 'clinic', claim: 'expose', exposeOf: 'h1-0' });
  s.headlines = [makeHeadline({ seatId: 0, round: 1, location: 'clinic' }), danger, deal, expose];
  const exposure: Exposure = { headlineId: 'h1-0', seatId: 0, round: 2, source: 'player', exposers: [3], trustDelta: -16, explanation: 'x' };
  const choice = (citizenId: number, top: Headline | null, topAppeal: number, from: number | null = null, to: number | null = null): CitizenChoice =>
    ({ citizenId, from, to, top, topAppeal });

  it('maps each citizen to a behavior and a route from home', () => {
    const plan = buildReactionPlan(s, [danger, deal, expose], [exposure], [
      choice(0, danger, 20), choice(1, deal, 12), choice(2, expose, 30), choice(3, deal, 11.9), choice(4, deal, 30, 0, 2),
    ]);
    const [flee, queue, protest, routine, mob] = plan.citizens;
    const home = (id: number) => s.citizens[id]!.home;
    expect(flee).toMatchObject({ behavior: 'flee', route: bfsPath(home(0), fleeTarget('bakery')) });
    expect(queue).toMatchObject({ behavior: 'queue', route: bfsPath(home(1), LOCATION_NODES.bank) });
    expect(protest).toMatchObject({ behavior: 'protest', route: bfsPath(home(2), OFFICE_NODES[0]!) });
    expect(routine).toMatchObject({ behavior: 'routine', route: [home(3)], bubble: null });
    expect(mob).toMatchObject({ behavior: 'angry_mob', route: bfsPath(home(4), OFFICE_NODES[0]!), fromPaper: 0, toPaper: 2 });
    expect(plan.exposures).toEqual([exposure]);
  });

  it('hands out at most 6 bubbles, none from pulled headlines', () => {
    const many = Array.from({ length: 30 }, (_, i) => choice(i, i % 2 ? danger : deal, 20));
    const plan = buildReactionPlan(s, [danger, deal], [], many);
    expect(plan.citizens.filter((c) => c.bubble !== null).length).toBeLessThanOrEqual(6);
    const pulled = { ...danger, rating: rated(4, { inappropriate: true }) };
    expect(buildReactionPlan(s, [pulled], [], [choice(0, pulled, 20)]).citizens[0]!.bubble).toBeNull();
  });

  it('summarises the biggest crowd and the biggest gain', () => {
    const plan = buildReactionPlan(s, [danger, deal], [], [
      choice(0, deal, 20, null, 2), choice(1, deal, 20, null, 2), choice(2, danger, 20, 2, 1),
    ]);
    expect(plan.recap).toEqual({ headlineId: 'h2-2', location: 'bank', behavior: 'queue', reactors: 2, gainSeatId: 2, gained: 2 });
  });
});
