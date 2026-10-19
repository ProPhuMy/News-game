import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownEnvironment } from '../../src/client/town/environment.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { LABEL_ANCHOR_HEIGHT } from '../../src/client/town/architecture/lots.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';
import { COLORS, LOCATIONS } from '../../src/shared/ids.ts';
import { fakeContext } from './architecture/fake-context.ts';

describe('Town Environment', () => {
  it('creates town environment with ground plane and road segments', () => {
    const env = createTownEnvironment(createTownLayout());
    expect(env.children.some((c) => c instanceof THREE.Mesh && c.name === 'ground')).toBe(true);
    expect(env.children.filter((c) => c.name.startsWith('road-')).length).toBeGreaterThan(10);
  });
});

describe('createTownBuildings entry point', () => {
  it('anchors every location and office at its node, at label height', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext('b'));
    const check = (anchor: THREE.Vector3, node: { x: number; z: number }) => {
      expect(anchor.x).toBeCloseTo(node.x, 5);
      expect(anchor.z).toBeCloseTo(node.z, 5);
      expect(anchor.y).toBe(LABEL_ANCHOR_HEIGHT);
    };
    for (const loc of LOCATIONS) check(town.getLocationAnchor(loc), layout.getNodeWorldPos(layout.getLocationNode(loc)));
    for (let seat = 0; seat < 4; seat++) check(town.getOfficeAnchor(seat), layout.getNodeWorldPos(layout.getOfficeNode(seat)));
  });

  it('starts banners at the palette B paper colors', () => {
    const town = createTownBuildings(createTownLayout(), fakeContext('b'));
    const paper = getPalette('b').paper;
    for (let seat = 0; seat < 4; seat++) expect(town.getOfficeBannerColor(seat)).toBe(paper[COLORS[seat]!].hex);
  });

  it('ready resolves and dispose is idempotent', async () => {
    const town = createTownBuildings(createTownLayout(), fakeContext('b'));
    await expect(town.ready).resolves.toBeDefined();
    town.dispose();
    expect(() => town.dispose()).not.toThrow();
  });
});
