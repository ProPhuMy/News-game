import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { PAPER_COLOR_HEX } from '../../src/client/town/citizens.ts';
import { createTownEnvironment } from '../../src/client/town/environment.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { LOCATIONS } from '../../src/shared/ids.ts';

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
