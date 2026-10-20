import { describe, expect, it } from 'vitest';
import { STREET_NODES } from '../../src/shared/town-map.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { FOUNTAIN_OFFSET, FOUNTAIN_RADIUS } from '../../src/client/town/architecture/fountain.ts';
import { TOWN_DRESSING } from '../../src/client/town/props/dressing.ts';
import { allocateCrowdSlots, crowdFootprint } from '../../src/client/town/slots.ts';
import { fakeContext } from './architecture/fake-context.ts';
import { groundRects, propFootprintRect } from './architecture/clearance.ts';

describe('full-town citizen clearance', () => {
  it('keeps thirty physical footprints out of every lot, prop and fountain at every destination', () => {
    const layout = createTownLayout(); const buildings = createTownBuildings(layout, fakeContext('b'));
    const streetProps = new Set(['prop-gas-lamp', 'prop-newsstand', 'prop-bench', 'prop-cart', 'prop-flower-box']);
    const obstacles = buildings.group.children.filter((root, i) => (i < 9 && root.name !== 'fountain-square') || streetProps.has(root.name)).flatMap(groundRects);
    obstacles.push(...TOWN_DRESSING.map(propFootprintRect));
    const fountainNode = layout.getNodeWorldPos(layout.getLocationNode('fountain_square'));
    const fx = fountainNode.x + FOUNTAIN_OFFSET.x; const fz = fountainNode.z + FOUNTAIN_OFFSET.z;
    const { width, depth } = crowdFootprint(1.8);
    const violations: string[] = [];
    for (const node of STREET_NODES) {
      const offsets = allocateCrowdSlots(layout, Array.from({ length: TUNING.citizens }, () => node.id), 1.8);
      for (const p of offsets) {
        const minX = node.x + p.x - width / 2; const maxX = minX + width;
        const minZ = node.z + p.z - depth / 2; const maxZ = minZ + depth;
        for (const r of obstacles) {
          if (minX < r.maxX - 1e-6 && maxX > r.minX + 1e-6 && minZ < r.maxZ - 1e-6 && maxZ > r.minZ + 1e-6) {
            violations.push(`${node.id} crowd intersects ${r.name}`);
          }
        }
        const dx = Math.max(minX - fx, 0, fx - maxX); const dz = Math.max(minZ - fz, 0, fz - maxZ);
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(FOUNTAIN_RADIUS);
      }
    }
    expect(violations).toEqual([]);
    buildings.dispose();
  });
});

it('separates the westward office crowd from the reported lamp footprint and actual post', () => {
  const layout = createTownLayout(); const buildings = createTownBuildings(layout, fakeContext('b'));
  const node = layout.getNodeWorldPos('r0c4');
  const lamp = TOWN_DRESSING.find(p => p.kind === 'gas-lamp' && p.x === 18 && p.z === -21.6)!;
  const declared = propFootprintRect(lamp);
  const actual = buildings.group.children.find(root => root.name === 'prop-gas-lamp' && root.position.x === lamp.x && root.position.z === lamp.z)!;
  expect(actual).toBeDefined();
  const obstacles = [declared, ...groundRects(actual)];
  const { width, depth } = crowdFootprint(1.8);
  let minimumGap = Infinity;
  for (const p of allocateCrowdSlots(layout, Array.from({ length: TUNING.citizens }, () => 'r0c4'))) {
    const x = node.x + p.x; const z = node.z + p.z;
    for (const r of obstacles) {
      const dx = Math.max(r.minX - (x + width / 2), x - width / 2 - r.maxX, 0);
      const dz = Math.max(r.minZ - (z + depth / 2), z - depth / 2 - r.maxZ, 0);
      minimumGap = Math.min(minimumGap, Math.hypot(dx, dz));
    }
  }
  expect(minimumGap).toBeCloseTo(0.52, 5);
  buildings.dispose();
});
