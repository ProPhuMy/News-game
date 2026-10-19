import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createTownBuildings } from '../../../src/client/town/buildings.ts';
import { createTownLayout } from '../../../src/client/town/layout.ts';
import { FOUNTAIN_RADIUS } from '../../../src/client/town/architecture/fountain.ts';
import { GATHER_CLEARANCE, LABEL_ANCHOR_HEIGHT, NODE_CLEARANCE } from '../../../src/client/town/architecture/lots.ts';
import { NATURE_MODELS, natureUrl } from '../../../src/client/town/props/nature.ts';
import { TOWN_DRESSING } from '../../../src/client/town/props/dressing.ts';
import { getPalette } from '../../../src/client/visuals/palette.ts';
import type { AssetSource } from '../../../src/client/visuals/town-types.ts';
import { COLORS, LOCATIONS } from '../../../src/shared/ids.ts';
import type { PaperPublic } from '../../../src/shared/snapshots.ts';
import { circleRoadViolations, clearanceViolations, groundRects, propFootprintRect } from './clearance.ts';
import { fakeContext } from './fake-context.ts';

// One box per call, sized to the kind's declared height and footprint so fitting keeps it inside that footprint.
const unitBox: AssetSource['loadGltf'] = async (url) => {
  const kind = (Object.keys(NATURE_MODELS) as (keyof typeof NATURE_MODELS)[]).find((k) => natureUrl(k) === url)!;
  const { height, footprint } = NATURE_MODELS[kind];
  const material = new THREE.MeshStandardMaterial();
  material.name = 'leafsGreen';
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(footprint.width, height, footprint.depth), material));
  return group;
};
const isNature = (kind: string) => ['tree-oak', 'tree-round', 'bush', 'flowers'].includes(kind);
const nature = TOWN_DRESSING.filter((p) => isNature(p.kind));
const palette = getPalette('b');

function paper(seatId: number, color: PaperPublic['color']): PaperPublic {
  return {
    seatId: seatId as PaperPublic['seatId'], displayName: 'P', paperName: 'Paper', color, personality: null,
    controller: 'human', trust: 1, readers: 0, totalReaders: 0, score: 0, lockedVisibleAtMs: null,
  };
}

describe('createTownBuildings with the full architecture town', () => {
  const layout = createTownLayout();

  it('keeps the crowd, roads and node disks clear', async () => {
    const town = createTownBuildings(layout, fakeContext('b', unitBox));
    await expect(town.ready).resolves.toEqual({ degraded: [] });
    town.group.updateMatrixWorld(true);
    // The fountain basin is round; its bounding box is too coarse here, so it is checked as a circle below.
    const rects = [...groundRects(town.group).filter((r) => r.name !== 'fountain'), ...nature.map(propFootprintRect)];
    expect(clearanceViolations(rects)).toEqual([]);
    const fountain = town.group.getObjectByName('fountain')!.getWorldPosition(new THREE.Vector3());
    expect(circleRoadViolations('fountain', fountain.x, fountain.z, FOUNTAIN_RADIUS)).toEqual([]);
    for (const n of layout.getStreetNodes()) {
      const gather = LOCATIONS.some((l) => layout.getLocationNode(l) === n.id) || [0, 1, 2, 3].some((s) => layout.getOfficeNode(s as 0) === n.id);
      expect(Math.hypot(fountain.x - n.x, fountain.z - n.z) - FOUNTAIN_RADIUS).toBeGreaterThanOrEqual(gather ? GATHER_CLEARANCE : NODE_CLEARANCE);
    }
    for (let seat = 0; seat < 4; seat++) {
      const office = town.group.children.find((c) => c.name === 'office' && c.userData.seat === seat)!;
      const node = layout.getNodeWorldPos(layout.getOfficeNode(seat as 0));
      expect(Math.hypot(office.position.x - node.x, office.position.z - node.z)).toBeGreaterThanOrEqual(5);
    }
  });

  it('flags a fountain circle that sits on a road', () => {
    expect(circleRoadViolations('fountain', 0, 0, FOUNTAIN_RADIUS).length).toBeGreaterThan(0);
    expect(circleRoadViolations('fountain', 6, -6, FOUNTAIN_RADIUS)).toEqual([]);
  });

  it('places every location building away from its node, named after its factory', () => {
    const town = createTownBuildings(layout, fakeContext('b'));
    for (const loc of LOCATIONS) {
      const root = town.group.getObjectByName(loc === 'fountain_square' ? 'fountain-square' : loc.replace('_', '-'));
      expect(root, loc).toBeDefined();
      const node = layout.getNodeWorldPos(layout.getLocationNode(loc));
      const dist = Math.hypot(root!.position.x - node.x, root!.position.z - node.z);
      if (loc === 'fountain_square') expect(dist).toBe(0);
      else expect(dist).toBeGreaterThanOrEqual(5);
    }
  });

  it('anchors labels at the node x/z at the label height', () => {
    const town = createTownBuildings(layout, fakeContext('b'));
    for (const loc of LOCATIONS) {
      const node = layout.getNodeWorldPos(layout.getLocationNode(loc));
      expect(town.getLocationAnchor(loc).toArray()).toEqual([node.x, LABEL_ANCHOR_HEIGHT, node.z]);
    }
    for (let seat = 0; seat < 4; seat++) {
      const node = layout.getNodeWorldPos(layout.getOfficeNode(seat as 0));
      expect(town.getOfficeAnchor(seat as 0).toArray()).toEqual([node.x, LABEL_ANCHOR_HEIGHT, node.z]);
    }
  });

  it('starts banners at palette paper colors and syncs and highlights offices', () => {
    const ctx = fakeContext('b');
    const town = createTownBuildings(layout, ctx);
    COLORS.forEach((color, seat) => expect(town.getOfficeBannerColor(seat as 0)).toBe(palette.paper[color].hex));
    town.syncOffices([paper(0, 'blue')]);
    expect(town.getOfficeBannerColor(0)).toBe(palette.paper.blue.hex);
    expect(town.getOfficeBannerColor(1)).toBe(palette.paper.blue.hex);
    town.setOfficeHighlight(0, true);
    expect(ctx.surfaces.at(-1)).toEqual({ hex: palette.paper.blue.hex, emissive: palette.paper.blue.hex });
  });

  it('lists one degraded entry per nature placement when models fail, and ignores late loads after dispose', async () => {
    const town = createTownBuildings(layout, fakeContext('b'));
    const { degraded } = await town.ready;
    expect(degraded).toHaveLength(nature.length);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const late = createTownBuildings(layout, fakeContext('b', async (url) => { await gate; return unitBox(url); }));
    late.dispose();
    release();
    await late.ready;
    expect(late.group.children).toHaveLength(0);
    expect(late.group.getObjectByProperty('isMesh', true)).toBeUndefined();
  });

  it('ignores office calls after dispose', () => {
    const ctx = fakeContext('b');
    const town = createTownBuildings(layout, ctx);
    town.dispose();
    const before = ctx.surfaces.length;
    expect(() => { town.setOfficeHighlight(0, true); town.syncOffices([paper(0, 'blue')]); }).not.toThrow();
    expect(ctx.surfaces).toHaveLength(before);
  });

  it('disposes twice without throwing and leaves the group empty', () => {
    const town = createTownBuildings(layout, fakeContext('b'));
    expect(town.group.children.length).toBeGreaterThan(0);
    town.dispose();
    expect(() => town.dispose()).not.toThrow();
    expect(town.group.children).toHaveLength(0);
  });
});
