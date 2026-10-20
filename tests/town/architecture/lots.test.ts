import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../../src/shared/ids.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_NODES } from '../../../src/shared/town-map.ts';
import { HEADROOM, LOCATION_LOT_SIDES, OFFICE_LOT_SIDES, lotCenter } from '../../../src/client/town/architecture/lots.ts';
import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { clearanceViolations, type GroundRect } from './clearance.ts';

const at = (id: string) => {
  const n = STREET_NODES.find((s) => s.id === id);
  if (!n) throw new Error(id);
  return n;
};
const rectAt = (name: string, c: { x: number; z: number }, f: { width: number; depth: number }): GroundRect => ({
  name, minX: c.x - f.width / 2, maxX: c.x + f.width / 2, minZ: c.z - f.depth / 2, maxZ: c.z + f.depth / 2,
});

describe('lot rules', () => {
  it('lotCenter offsets from the node', () => {
    const f = { width: 6, depth: 5 };
    expect(lotCenter({ x: 0, z: 0 }, 'east', f)).toEqual({ x: 7, z: -5.5 });
    expect(lotCenter({ x: 0, z: 0 }, 'west', f)).toEqual({ x: -7, z: -5.5 });
  });

  it('every location lot clears nodes and roads', () => {
    for (const loc of LOCATIONS.filter((l) => l !== 'fountain_square')) {
      const f = { width: 6, depth: 5 };
      const c = lotCenter(at(LOCATION_NODES[loc]), LOCATION_LOT_SIDES[loc], f);
      expect(clearanceViolations([rectAt(loc, c, f)]), loc).toEqual([]);
    }
  });

  it('every office lot clears nodes and roads', () => {
    OFFICE_NODES.forEach((id, i) => {
      const f = { width: 5, depth: 4.4 };
      const side = OFFICE_LOT_SIDES[i];
      if (!side) throw new Error(`no side for office ${i}`);
      const c = lotCenter(at(id), side, f);
      expect(clearanceViolations([rectAt(`office${i}`, c, f)]), `office ${i}`).toEqual([]);
    });
  });

  it('checker flags a rect on a node and on a road midpoint', () => {
    const n = at(LOCATION_NODES.bakery);
    expect(clearanceViolations([rectAt('onNode', n, { width: 1, depth: 1 })])).toContainEqual(expect.stringMatching(/^onNode within 5 of node /));
    const onRoad = clearanceViolations([rectAt('onRoad', { x: n.x + 6, z: n.z }, { width: 1, depth: 1 })]);
    expect(onRoad).toContainEqual(expect.stringMatching(/^onRoad overlaps road /));
    expect(onRoad.filter((v) => v.includes('of node'))).toEqual([]);
  });
});

describe('citizen scale', () => {
  it('uses the approved 1.8 body height, with headroom for the cap', () => {
    expect(CITIZEN_REFERENCE_HEIGHT).toBe(1.8);
    // The cap adds well under half the body height, so anything above HEADROOM clears a capped citizen.
    expect(HEADROOM).toBeGreaterThan(CITIZEN_REFERENCE_HEIGHT * 1.5);
  });
});
