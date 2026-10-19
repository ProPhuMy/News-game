import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { PAPER_COLOR_HEX } from '../../src/client/town/citizens.ts';
import { createTownEnvironment } from '../../src/client/town/environment.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { LOCATIONS } from '../../src/shared/ids.ts';
import { fakeContext } from './architecture/fake-context.ts';

describe('Town Environment and Buildings', () => {
  it('creates town environment with ground plane and road segments', () => {
    const layout = createTownLayout();
    const env = createTownEnvironment(layout);

    expect(env).toBeInstanceOf(THREE.Group);
    expect(env.children.length).toBeGreaterThan(0);

    const hasGround = env.children.some(
      (c) => c instanceof THREE.Mesh && c.name === 'ground',
    );
    expect(hasGround).toBe(true);

    const roads = env.children.filter((c) => c.name.startsWith('road-'));
    expect(roads.length).toBeGreaterThan(10);
  });

  it('creates 5 target locations at their assigned layout coordinates', () => {
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout);

    expect(buildings.group).toBeInstanceOf(THREE.Group);

    for (const loc of LOCATIONS) {
      const anchor = buildings.getLocationAnchor(loc);
      const nodePos = layout.getNodeWorldPos(layout.getLocationNode(loc));

      expect(anchor.x).toBeCloseTo(nodePos.x, 1);
      expect(anchor.z).toBeCloseTo(nodePos.z, 1);
      expect(anchor.y).toBeGreaterThan(0); // anchor above ground
    }
  });

  it('creates 4 newspaper offices with distinctive seat colors and anchors', () => {
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout);

    for (let seatId = 0; seatId < 4; seatId++) {
      const anchor = buildings.getOfficeAnchor(seatId);
      const nodePos = layout.getNodeWorldPos(layout.getOfficeNode(seatId));

      expect(anchor.x).toBeCloseTo(nodePos.x, 1);
      expect(anchor.z).toBeCloseTo(nodePos.z, 1);
      expect(anchor.y).toBeGreaterThan(0);
    }

    expect(buildings.getOfficeBannerColor(0)).toBe(PAPER_COLOR_HEX.red);
    expect(buildings.getOfficeBannerColor(1)).toBe(PAPER_COLOR_HEX.blue);
    expect(buildings.getOfficeBannerColor(2)).toBe(PAPER_COLOR_HEX.green);
    expect(buildings.getOfficeBannerColor(3)).toBe(PAPER_COLOR_HEX.gold);
  });

  it('allows highlighting an exposed newspaper office', () => {
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout);

    expect(() => buildings.setOfficeHighlight(1, true)).not.toThrow();
    expect(() => buildings.setOfficeHighlight(1, false)).not.toThrow();
  });
});

describe('createTownBuildings with an ArchitectureContext', () => {
  it('without context, ready resolves clean', async () => {
    const buildings = createTownBuildings(createTownLayout());
    await expect(buildings.ready).resolves.toEqual({ degraded: [] });
  });

  it('with context, the bakery is the sample piece in its lot, anchored at its node', async () => {
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout, fakeContext());
    await buildings.ready;
    const bakery = buildings.group.getObjectByName('bakery');
    expect(bakery?.getObjectByName('bakery-door')).toBeDefined();
    const node = layout.getNodeWorldPos(layout.getLocationNode('bakery'));
    expect(Math.hypot(bakery!.position.x - node.x, bakery!.position.z - node.z)).toBeGreaterThanOrEqual(5);
    const anchor = buildings.getLocationAnchor('bakery');
    expect(anchor.x).toBeCloseTo(node.x, 5);
    expect(anchor.z).toBeCloseTo(node.z, 5);
  });

  it('dispose removes every building and frees primitive resources', () => {
    const buildings = createTownBuildings(createTownLayout());
    const bank = buildings.group.getObjectByName('building-bank') as THREE.Group;
    const mesh = bank.children[0] as THREE.Mesh;
    const geometry = vi.spyOn(mesh.geometry, 'dispose');
    const material = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    buildings.dispose();
    expect(buildings.group.children).toHaveLength(0);
    expect(geometry).toHaveBeenCalled();
    expect(material).toHaveBeenCalled();
  });
});
