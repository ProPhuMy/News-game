import { describe, expect, it } from 'vitest';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_NODES } from '../../src/shared/town-map.ts';

describe('TownLayout', () => {
  it('maps street nodes to 3D world coordinates correctly', () => {
    const layout = createTownLayout();
    const centerNode = layout.getNodeWorldPos('r2c2');
    expect(centerNode).toEqual({ x: 0, y: 0, z: 0 });

    const cornerNode = layout.getNodeWorldPos('r0c0');
    expect(cornerNode).toEqual({ x: -24, y: 0, z: -24 });
  });

  it('throws an error for non-existent node IDs', () => {
    const layout = createTownLayout();
    expect(() => layout.getNodeWorldPos('invalid_node')).toThrow(/unknown node/i);
  });

  it('returns all street nodes', () => {
    const layout = createTownLayout();
    expect(layout.getStreetNodes()).toHaveLength(STREET_NODES.length);
  });

  it('resolves location and office nodes', () => {
    const layout = createTownLayout();
    expect(layout.getLocationNode('bakery')).toBe(LOCATION_NODES.bakery);
    expect(layout.getLocationNode('fountain_square')).toBe(LOCATION_NODES.fountain_square);
    expect(layout.getOfficeNode(0)).toBe(OFFICE_NODES[0]);
    expect(layout.getOfficeNode(3)).toBe(OFFICE_NODES[3]);
  });
});
