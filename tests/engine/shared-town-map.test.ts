import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../src/shared/ids.ts';
import { FLEE_NODES, HOME_NODES, LOCATION_NODES, OFFICE_NODES, STREET_EDGES, STREET_NODES } from '../../src/shared/town-map.ts';

describe('town map', () => {
  const ids = new Set(STREET_NODES.map((n) => n.id));

  it('is a connected 5×5 grid', () => {
    expect(STREET_NODES).toHaveLength(25);
    expect(STREET_EDGES).toHaveLength(40);
    const seen = new Set(['r0c0']);
    const queue = ['r0c0'];
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const [a, b] of STREET_EDGES) {
        const next = a === node ? b : b === node ? a : null;
        if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    expect(seen.size).toBe(25);
  });

  it('places every special node on the graph without overlaps', () => {
    const special = [...LOCATIONS.map((l) => LOCATION_NODES[l]), ...OFFICE_NODES];
    expect(new Set(special).size).toBe(special.length);
    for (const id of [...special, ...FLEE_NODES, ...HOME_NODES]) expect(ids.has(id)).toBe(true);
    expect(OFFICE_NODES).toHaveLength(4);
  });

  it('keeps homes off locations and offices', () => {
    expect(HOME_NODES).toHaveLength(16);
    for (const id of HOME_NODES) {
      expect(Object.values(LOCATION_NODES)).not.toContain(id);
      expect(OFFICE_NODES).not.toContain(id);
    }
  });
});
