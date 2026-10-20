import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LOCATIONS } from '../../src/shared/ids.ts';
import { closeTarget, townFrameBounds } from '../../src/client/visual-test/architecture-town.ts';
import { ARCHITECTURE_VIEWS } from '../../src/client/visual-test/architecture-scenario.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { fakeContext } from '../town/architecture/fake-context.ts';

describe('closeTarget', () => {
  it('resolves every close-up view to a distinct position in the assembled town', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    const views = ARCHITECTURE_VIEWS.filter((v) => !['street', 'awning', 'town'].includes(v));
    const keys = views.map((v) => closeTarget(town.group, v as Parameters<typeof closeTarget>[1], layout).toArray().join(','));
    expect(views).toHaveLength(6);
    expect(new Set(keys).size).toBe(views.length);
    town.dispose();
  });

  it('throws a clear error when the root is missing', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    town.group.clear();
    expect(() => closeTarget(town.group, 'bank', layout)).toThrow(/no building root named "bank"/);
    town.dispose();
  });
});

describe('townFrameBounds', () => {
  it('covers every location and office root, every street node at y 4, plus one unit of margin', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    const bounds = townFrameBounds(town.group, layout);
    const expected = new THREE.Box3();
    const names = LOCATIONS.map((l) => l.replaceAll('_', '-'));
    expect(names.every((n) => town.group.children.some((c) => c.name === n))).toBe(true);
    for (const child of town.group.children) if (names.includes(child.name) || child.name === 'office') expected.expandByObject(child, true);
    for (const node of layout.getStreetNodes()) expected.expandByPoint(new THREE.Vector3(node.x, 4, node.z));
    expect(bounds.equals(expected.expandByScalar(1))).toBe(true);
    expect(bounds.max.y).toBeGreaterThanOrEqual(5);
    town.dispose();
  });
});
