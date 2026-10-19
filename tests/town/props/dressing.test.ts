import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BAKERY_FOOTPRINT } from '../../../src/client/town/architecture/bakery.ts';
import { BANK_FOOTPRINT } from '../../../src/client/town/architecture/bank.ts';
import { CLINIC_FOOTPRINT } from '../../../src/client/town/architecture/clinic.ts';
import { createBakery } from '../../../src/client/town/architecture/bakery.ts';
import { createBank } from '../../../src/client/town/architecture/bank.ts';
import { createClinic } from '../../../src/client/town/architecture/clinic.ts';
import { createOffice } from '../../../src/client/town/architecture/office.ts';
import { createTownHall } from '../../../src/client/town/architecture/town-hall.ts';
import { PLAZA_SIZE, FOUNTAIN_OFFSET, FOUNTAIN_RADIUS } from '../../../src/client/town/architecture/fountain.ts';
import { LOCATION_LOT_SIDES, OFFICE_LOT_SIDES, ROAD_CLEAR, lotCenter } from '../../../src/client/town/architecture/lots.ts';
import { OFFICE_FOOTPRINT } from '../../../src/client/town/architecture/office.ts';
import { TOWN_HALL_FOOTPRINT } from '../../../src/client/town/architecture/town-hall.ts';
import { PAPERBOY_SPOTS, TOWN_DRESSING } from '../../../src/client/town/props/dressing.ts';
import { PROP_KINDS, createProp } from '../../../src/client/town/props/index.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_NODES } from '../../../src/shared/town-map.ts';
import { clearanceViolations, groundRects, propFootprintRect as footprintRect, type GroundRect } from '../architecture/clearance.ts';
import { fakeContext, meshes } from '../architecture/fake-context.ts';

const nodeOf = (id: string) => STREET_NODES.find((n) => n.id === id)!;
const rect = (name: string, x: number, z: number, w: number, d: number): GroundRect => ({ name, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

const lots: GroundRect[] = [
  ...(['bakery', 'bank', 'town_hall', 'clinic'] as const).map((loc) => {
    const fp = { bakery: BAKERY_FOOTPRINT, bank: BANK_FOOTPRINT, town_hall: TOWN_HALL_FOOTPRINT, clinic: CLINIC_FOOTPRINT }[loc];
    const c = lotCenter(nodeOf(LOCATION_NODES[loc]), LOCATION_LOT_SIDES[loc], fp);
    return rect(`lot ${loc}`, c.x, c.z, fp.width, fp.depth);
  }),
  ...OFFICE_NODES.map((id, i) => {
    const c = lotCenter(nodeOf(id), OFFICE_LOT_SIDES[i]!, OFFICE_FOOTPRINT);
    return rect(`lot office ${i}`, c.x, c.z, OFFICE_FOOTPRINT.width, OFFICE_FOOTPRINT.depth);
  }),
];
const plaza = nodeOf(LOCATION_NODES.fountain_square);
const fountain = { x: plaza.x + FOUNTAIN_OFFSET.x, z: plaza.z + FOUNTAIN_OFFSET.z };

const overlaps = (a: GroundRect, b: GroundRect) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
const hitsFountain = (r: GroundRect) =>
  Math.hypot(Math.max(r.minX - fountain.x, 0, fountain.x - r.maxX), Math.max(r.minZ - fountain.z, 0, fountain.z - r.maxZ)) < FOUNTAIN_RADIUS;

describe('town dressing', () => {
  it('has 50-110 placements of known kinds, within +-46, with rotation in quarter turns', () => {
    expect(TOWN_DRESSING.length).toBeGreaterThanOrEqual(50);
    expect(TOWN_DRESSING.length).toBeLessThanOrEqual(110);
    for (const p of TOWN_DRESSING) {
      expect(PROP_KINDS).toContain(p.kind);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(46);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(46);
      const quarters = (p.rotationY ?? 0) / (Math.PI / 2);
      expect(Math.abs(quarters - Math.round(quarters))).toBeLessThan(1e-9);
    }
  });

  it('every footprint clears crowds and roads, and misses lots and the fountain', () => {
    const problems = TOWN_DRESSING.flatMap((p) => {
      const r = footprintRect(p);
      return [
        ...clearanceViolations([r]),
        ...lots.filter((l) => overlaps(r, l)).map((l) => `${r.name} overlaps ${l.name}`),
        ...(hitsFountain(r) ? [`${r.name} hits the fountain`] : []),
      ];
    });
    expect(problems).toEqual([]);
  });

  it('every code-built mesh clears crowds and roads, and misses lots and the fountain', () => {
    const codeBuilt = TOWN_DRESSING.filter((p) => !['tree-oak', 'tree-round', 'bush', 'flowers'].includes(p.kind));
    expect(codeBuilt.length).toBeGreaterThan(30);
    const problems: string[] = [];
    for (const p of codeBuilt) {
      const { object } = createProp(p.kind, fakeContext());
      object.position.set(p.x, 0, p.z);
      object.rotation.y = p.rotationY ?? 0;
      const rects = groundRects(object);
      problems.push(...clearanceViolations(rects).map((v) => `${p.kind}@${p.x},${p.z}: ${v}`));
      for (const r of rects) {
        if (lots.some((l) => overlaps(r, l))) problems.push(`${r.name}@${p.x},${p.z} in a lot`);
        if (hitsFountain(r)) problems.push(`${r.name}@${p.x},${p.z} in the fountain`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('frames the map edge with at least 12 trees, thinner on the near (+Z) edge', () => {
    const ring = TOWN_DRESSING.filter((p) => p.kind.startsWith('tree') && (Math.abs(p.x) >= 28 || Math.abs(p.z) >= 28));
    expect(ring.length).toBeGreaterThanOrEqual(12);
    expect(ring.filter((p) => p.z <= -28).length).toBeGreaterThan(ring.filter((p) => p.z >= 28).length);
    for (const p of ring) expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeLessThanOrEqual(44);
  });

  it('places newsstands near each office and a cart', () => {
    for (const id of OFFICE_NODES) {
      const n = nodeOf(id);
      expect(TOWN_DRESSING.some((p) => p.kind === 'newsstand' && Math.hypot(p.x - n.x, p.z - n.z) < 14), id).toBe(true);
    }
    expect(TOWN_DRESSING.filter((p) => p.kind === 'cart')).toHaveLength(1);
  });
});

describe('placement rules', () => {
  it('benches and the plaza newsstand face the fountain', () => {
    const near = TOWN_DRESSING.filter((p) => (p.kind === 'bench' || p.kind === 'newsstand') && Math.hypot(p.x - plaza.x, p.z - plaza.z) < PLAZA_SIZE / 2);
    expect(near.length).toBeGreaterThanOrEqual(5);
    for (const p of near) {
      const r = p.rotationY ?? 0;
      const dot = Math.sin(r) * (fountain.x - p.x) + Math.cos(r) * (fountain.z - p.z);
      expect(dot, `${p.kind}@${p.x},${p.z}`).toBeGreaterThan(0);
    }
  });

  it('keeps every door approach clear (flower boxes excepted) and no lamp in front of a door', () => {
    const ctx = fakeContext();
    const doors = [
      ...(['bakery', 'bank', 'town_hall', 'clinic'] as const).map((loc) => {
        const make = { bakery: createBakery, bank: createBank, town_hall: createTownHall, clinic: createClinic }[loc];
        return { piece: make(ctx), center: lotCenter(nodeOf(LOCATION_NODES[loc]), LOCATION_LOT_SIDES[loc], { bakery: BAKERY_FOOTPRINT, bank: BANK_FOOTPRINT, town_hall: TOWN_HALL_FOOTPRINT, clinic: CLINIC_FOOTPRINT }[loc]), name: loc };
      }),
      ...OFFICE_NODES.map((id, i) => ({ piece: createOffice(ctx, 0xffffff), center: lotCenter(nodeOf(id), OFFICE_LOT_SIDES[i]!, OFFICE_FOOTPRINT), name: `office ${i}` })),
    ];
    const problems: string[] = [];
    for (const { piece, center, name } of doors) {
      piece.object.position.set(center.x, 0, center.z);
      piece.object.updateMatrixWorld(true);
      const door = meshes(piece.object).find((m) => m.name.endsWith('-door'));
      expect(door, name).toBeDefined();
      const box = new THREE.Box3().setFromObject(door!);
      const x = (box.min.x + box.max.x) / 2;
      const front = center.z + piece.footprint.depth / 2;
      const approach: GroundRect = { name: `${name} door approach`, minX: x - 1.5, maxX: x + 1.5, minZ: front, maxZ: front + 3 };
      // Lamps are tall and the game camera looks down from +Z: keep them out of 2.5 either side of the door, 5 in front of it.
      const lampZone: GroundRect = { ...approach, minX: x - 2.5, maxX: x + 2.5, maxZ: front + 5 };
      for (const p of TOWN_DRESSING) {
        if (p.kind !== 'flower-box' && overlaps(footprintRect(p), approach)) problems.push(`${p.kind}@${p.x},${p.z} blocks ${approach.name}`);
        if (p.kind === 'gas-lamp' && overlaps(footprintRect(p), lampZone)) problems.push(`${p.kind}@${p.x},${p.z} hides ${approach.name}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('no two placements overlap', () => {
    const rects = TOWN_DRESSING.map(footprintRect);
    const problems = rects.flatMap((a, i) => rects.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.name} overlaps ${b.name}`));
    expect(problems).toEqual([]);
  });
});

describe('paperboy spots', () => {
  it('has exactly 4, clear, within 3 of a road strip edge', () => {
    expect(PAPERBOY_SPOTS).toHaveLength(4);
    const lines = [-24, -12, 0, 12, 24];
    for (const s of PAPERBOY_SPOTS) {
      const r = rect('paperboy', s.x, s.z, 1, 1);
      expect(clearanceViolations([r])).toEqual([]);
      expect(lots.some((l) => overlaps(r, l))).toBe(false);
      expect(hitsFountain(r)).toBe(false);
      const edge = Math.min(...lines.flatMap((l) => [Math.abs(Math.abs(s.x - l) - ROAD_CLEAR), Math.abs(Math.abs(s.z - l) - ROAD_CLEAR)]));
      expect(edge).toBeLessThanOrEqual(3);
      expect([0, Math.PI / 2, Math.PI, -Math.PI / 2]).toContain(s.rotationY);
    }
  });
});
