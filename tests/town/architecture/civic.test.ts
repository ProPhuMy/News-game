import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { BANK_FOOTPRINT, createBank } from '../../../src/client/town/architecture/bank.ts';
import { CLINIC_FOOTPRINT, createClinic } from '../../../src/client/town/architecture/clinic.ts';
import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { TOWN_HALL_FOOTPRINT, createTownHall } from '../../../src/client/town/architecture/town-hall.ts';
import type { PlacedPiece } from '../../../src/client/visuals/town-types.ts';
import { groundRects } from './clearance.ts';
import { fakeContext, meshes, townHexes, type FakeContext } from './fake-context.ts';

interface Case {
  name: string;
  footprint: { width: number; depth: number };
  create: (ctx: FakeContext) => PlacedPiece;
  door: string;
  sign: string;
  roof: string;
}
const cases: Case[] = [
  { name: 'bank', footprint: BANK_FOOTPRINT, create: createBank, door: 'bank-door', sign: 'sign-BANK', roof: 'bank-roof' },
  { name: 'town hall', footprint: TOWN_HALL_FOOTPRINT, create: createTownHall, door: 'town-hall-door', sign: 'sign-TOWN HALL', roof: 'town-hall-roof' },
  { name: 'clinic', footprint: CLINIC_FOOTPRINT, create: createClinic, door: 'clinic-door', sign: 'sign-CLINIC', roof: 'clinic-roof' },
];

describe.each(cases)('code-built $name', ({ footprint, create, door, sign, roof }) => {
  it('footprint is 6 x 5', () => {
    expect(footprint).toEqual({ width: 6, depth: 5 });
    expect(create(fakeContext()).footprint).toEqual(footprint);
  });

  it('has a tall door and a sign facing the street', () => {
    const piece = create(fakeContext());
    piece.object.updateMatrixWorld(true);
    const d = new THREE.Box3().setFromObject(piece.object.getObjectByName(door)!);
    expect(d.max.y - d.min.y).toBeGreaterThanOrEqual(1.25 * CITIZEN_REFERENCE_HEIGHT);
    expect(d.getCenter(new THREE.Vector3()).z).toBeGreaterThan(0);
    const s = piece.object.getObjectByName(sign);
    expect(s).toBeDefined();
    expect(new THREE.Box3().setFromObject(s!).min.y).toBeGreaterThanOrEqual(d.max.y);
    expect(new THREE.Box3().setFromObject(s!).getCenter(new THREE.Vector3()).z).toBeGreaterThan(0);
  });

  // Game camera pitch 55°, architecture close-up 45°: the ray from the sign's top front edge toward the camera must pass under the eave.
  it.each([45, 55])('sign is not hidden by the roof eave at camera pitch %i°', (pitch) => {
    const object = create(fakeContext()).object;
    object.updateMatrixWorld(true);
    const roofMesh = object.getObjectByName(roof);
    expect(roofMesh, roof).toBeDefined();
    const s = new THREE.Box3().setFromObject(object.getObjectByName(sign)!);
    const eave = new THREE.Box3().setFromObject(roofMesh!);
    const slope = Math.tan((pitch * Math.PI) / 180);
    expect(s.max.y + (eave.max.z - s.max.z) * slope).toBeLessThanOrEqual(eave.min.y);
  });

  it('ground mesh rect stays inside the footprint', () => {
    for (const r of groundRects(create(fakeContext()).object)) {
      expect(r.minX, r.name).toBeGreaterThanOrEqual(-footprint.width / 2 - 0.05);
      expect(r.maxX, r.name).toBeLessThanOrEqual(footprint.width / 2 + 0.05);
      expect(r.minZ, r.name).toBeGreaterThanOrEqual(-footprint.depth / 2 - 0.05);
      expect(r.maxZ, r.name).toBeLessThanOrEqual(footprint.depth / 2 + 0.05);
    }
  });

  it('uses palette surfaces, outlines the root, and reacts to the palette', () => {
    const ctx = fakeContext();
    const piece = create(ctx);
    const allowed = townHexes(ctx);
    for (const call of ctx.surfaces) {
      expect(allowed).toContain(call.hex);
      if (call.emissive !== undefined) expect(allowed).toContain(call.emissive);
    }
    for (const mesh of meshes(piece.object)) {
      expect(ctx.kitMaterials.has(mesh.material as THREE.Material) || ctx.preservedResults.has(mesh.material as THREE.Material)).toBe(true);
    }
    expect(ctx.outlined).toEqual([piece.object]);
    const b = fakeContext('b');
    create(b);
    expect(ctx.surfaces.map((s) => s.hex)).not.toEqual(b.surfaces.map((s) => s.hex));
  });

  it('dispose twice does not throw and frees geometry once', () => {
    const piece = create(fakeContext());
    const spies = [...new Set(meshes(piece.object).map((m) => m.geometry))].map((g) => vi.spyOn(g, 'dispose'));
    piece.dispose();
    expect(() => piece.dispose()).not.toThrow();
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('bank identity', () => {
  it('has four columns, a pediment, steps and a door', () => {
    const root = createBank(fakeContext()).object;
    const columns: THREE.Object3D[] = [];
    root.traverse((o) => { if (o.name === 'bank-column') columns.push(o); });
    expect(columns).toHaveLength(4);
    for (const name of ['bank-pediment', 'bank-steps']) expect(root.getObjectByName(name), name).toBeDefined();
  });
});

describe('town hall identity', () => {
  it('has a tall tower on the back half with a +Z clock', () => {
    const root = createTownHall(fakeContext()).object;
    root.updateMatrixWorld(true);
    const tower = new THREE.Box3().setFromObject(root.getObjectByName('town-hall-tower')!);
    expect(tower.max.y).toBeGreaterThan(11);
    expect(tower.getCenter(new THREE.Vector3()).z).toBeLessThan(0);
    const clock = new THREE.Box3().setFromObject(root.getObjectByName('town-hall-clock')!);
    expect(clock.getCenter(new THREE.Vector3()).z).toBeGreaterThanOrEqual(tower.max.z - 0.05);
  });
});

describe('clinic identity', () => {
  it('has a lit cross of two bars', () => {
    const ctx = fakeContext();
    const cross = createClinic(ctx).object.getObjectByName('clinic-cross')!;
    expect(cross.children).toHaveLength(2);
    const { brick } = ctx.palette.town;
    expect(ctx.surfaces.filter((s) => s.emissive === brick && s.hex === brick)).toHaveLength(2);
  });
});
