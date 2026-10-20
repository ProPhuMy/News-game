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
    const obstacles = buildings.group.children.slice(0, 9).filter(root => root.name !== 'fountain-square').flatMap(groundRects);
    obstacles.push(...TOWN_DRESSING.map(propFootprintRect));
    const fountainNode = layout.getNodeWorldPos(layout.getLocationNode('fountain_square'));
    const fx = fountainNode.x + FOUNTAIN_OFFSET.x; const fz = fountainNode.z + FOUNTAIN_OFFSET.z;
    const { width, depth } = crowdFootprint(1.8);
    for (const node of STREET_NODES) {
      const offsets = allocateCrowdSlots(layout, Array.from({ length: TUNING.citizens }, () => node.id), 1.8);
      for (const p of offsets) {
        const minX = node.x + p.x - width / 2; const maxX = minX + width;
        const minZ = node.z + p.z - depth / 2; const maxZ = minZ + depth;
        for (const r of obstacles) {
          expect(minX < r.maxX - 1e-6 && maxX > r.minX + 1e-6 && minZ < r.maxZ - 1e-6 && maxZ > r.minZ + 1e-6,
            `${node.id} crowd intersects ${r.name}`).toBe(false);
        }
        const dx = Math.max(minX - fx, 0, fx - maxX); const dz = Math.max(minZ - fz, 0, fz - maxZ);
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(FOUNTAIN_RADIUS);
      }
    }
    buildings.dispose();
  });
});
