import { describe, expect, it } from 'vitest';
import { FixtureSchema } from '../../src/shared/fixture.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_NODES } from '../../src/shared/town-map.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { GATHER_CLEARANCE, NODE_CLEARANCE, ROAD_CLEAR } from '../../src/client/town/architecture/lots.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { allocateCrowdSlots, crowdFootprint } from '../../src/client/town/slots.ts';

const layout = createTownLayout();
const gathering = new Set([...Object.values(LOCATION_NODES), ...OFFICE_NODES]);
const fixtures = import.meta.glob('../../src/sim/fixtures/*.json', { eager: true, import: 'default' });
function assertSeparated(destinations: string[]) {
  const offsets = allocateCrowdSlots(layout, destinations, 1.8);
  const { width, depth } = crowdFootprint(1.8);
  expect(offsets).toHaveLength(destinations.length);
  const points = offsets.map((p, i) => { const node = layout.getNodeWorldPos(destinations[i]!); return { x: node.x + p.x, z: node.z + p.z }; });
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    expect(Math.abs(points[i]!.x - points[j]!.x) >= width - 1e-6 || Math.abs(points[i]!.z - points[j]!.z) >= depth - 1e-6).toBe(true);
  }
  offsets.forEach((p, i) => {
    const radius = gathering.has(destinations[i]!) ? GATHER_CLEARANCE : NODE_CLEARANCE;
    const insideDisk = Math.hypot(Math.abs(p.x) + width / 2, Math.abs(p.z) + depth / 2) <= radius + 1e-6;
    // Any spill must stay in a straight, already-clear adjoining street strip.
    expect(insideDisk || Math.abs(p.x) + width / 2 <= ROAD_CLEAR || Math.abs(p.z) + depth / 2 <= ROAD_CLEAR).toBe(true);
  });
  expect(allocateCrowdSlots(layout, destinations, 1.8)).toEqual(offsets);
  return offsets;
}

describe('clearance-aware crowd slots', () => {
  for (const node of STREET_NODES) it(`fits thirty at ${node.id} without overlapping footprints`, () => {
    assertSeparated(Array.from({ length: TUNING.citizens }, () => node.id));
  });
  it('keeps a single citizen on its logical destination', () => {
    expect(allocateCrowdSlots(layout, [OFFICE_NODES[0]!], 1.8)).toEqual([{ x: 0, z: 0 }]);
  });
  it('separates all home and reaction groups from the recorded matches', () => {
    for (const raw of Object.values(fixtures)) for (const frame of FixtureSchema.parse(raw).frames) {
      assertSeparated(frame.public.citizens.map(c => c.home));
      if (frame.public.reactionPlan) assertSeparated(frame.public.reactionPlan.citizens.map(c => c.route.at(-1)!));
    }
  });
  it('rejects impossible footprints instead of shrinking characters or widening clearance', () => {
    expect(() => allocateCrowdSlots(layout, Array.from({ length: 30 }, () => OFFICE_NODES[0]!), 8)).toThrow('clearance');
  });
});
