import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { BAKERY_FOOTPRINT, createBakery } from '../../../src/client/town/architecture/bakery.ts';
import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { fakeContext, meshes, townHexes } from './fake-context.ts';

const LOT = 12 - 3.4; // GRID.spacing minus road width

describe('code-built bakery', () => {
  it('bounding box sits on the ground, centered', () => {
    const piece = createBakery(fakeContext());
    const box = new THREE.Box3().setFromObject(piece.object);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 2);
    expect(box.min.z).toBeCloseTo(-BAKERY_FOOTPRINT.depth / 2, 2);
  });

  it('footprint fits a lot', () => {
    const piece = createBakery(fakeContext());
    expect(piece.footprint).toEqual(BAKERY_FOOTPRINT);
    expect(piece.footprint.width).toBeLessThanOrEqual(LOT);
    expect(piece.footprint.depth).toBeLessThanOrEqual(LOT);
    const size = new THREE.Box3().setFromObject(piece.object).getSize(new THREE.Vector3());
    expect(size.x).toBeLessThanOrEqual(BAKERY_FOOTPRINT.width + 1.6);
    expect(size.z).toBeLessThanOrEqual(BAKERY_FOOTPRINT.depth + 1.6);
  });

  it('storefront faces +Z with a door taller than a citizen', () => {
    const piece = createBakery(fakeContext());
    piece.object.updateMatrixWorld(true);
    const door = piece.object.getObjectByName('bakery-door');
    expect(door).toBeDefined();
    const box = new THREE.Box3().setFromObject(door!);
    expect(box.getCenter(new THREE.Vector3()).z).toBeGreaterThan(0);
    expect(box.max.y - box.min.y).toBeGreaterThanOrEqual(1.25 * CITIZEN_REFERENCE_HEIGHT);
    expect(piece.object.getObjectByName('bakery-awning')).toBeDefined();
    expect(piece.object.getObjectByName('bakery-pretzel')).toBeDefined();
  });

  it('door is wood', () => {
    const ctx = fakeContext('b');
    const piece = createBakery(ctx);
    const door = piece.object.getObjectByName('bakery-door') as THREE.Mesh;
    const index = [...ctx.kitMaterials].indexOf(door.material as THREE.Material);
    expect(ctx.surfaces[index]?.hex).toBe(ctx.palette.town.wood);
  });

  it('uses only kit materials in palette colors', () => {
    const ctx = fakeContext();
    const piece = createBakery(ctx);
    for (const mesh of meshes(piece.object)) expect(ctx.kitMaterials.has(mesh.material as THREE.Material)).toBe(true);
    const allowed = townHexes(ctx);
    for (const call of ctx.surfaces) {
      expect(allowed).toContain(call.hex);
      if (call.emissive !== undefined) expect(allowed).toContain(call.emissive);
    }
    expect(ctx.outlined).toContain(piece.object);
  });

  it('palette swap changes the colors', () => {
    const a = fakeContext('a');
    const b = fakeContext('b');
    createBakery(a);
    createBakery(b);
    expect(a.surfaces.map((s) => s.hex)).not.toEqual(b.surfaces.map((s) => s.hex));
  });

  it('can leave out the code awning', () => {
    const piece = createBakery(fakeContext(), { awning: false });
    expect(piece.object.getObjectByName('bakery-awning')).toBeUndefined();
  });

  it('ready resolves clean', async () => {
    await expect(createBakery(fakeContext()).ready).resolves.toEqual({ degraded: [] });
  });

  it('dispose frees its geometry once and leaves kit materials alone', () => {
    const ctx = fakeContext();
    const piece = createBakery(ctx);
    const parent = new THREE.Group();
    parent.add(piece.object);
    const geometrySpies = [...new Set(meshes(piece.object).map((m) => m.geometry))].map((g) => vi.spyOn(g, 'dispose'));
    const materialSpies = [...ctx.kitMaterials].map((m) => vi.spyOn(m, 'dispose'));
    piece.dispose();
    expect(piece.object.parent).toBeNull();
    for (const spy of geometrySpies) expect(spy).toHaveBeenCalledTimes(1);
    expect(() => piece.dispose()).not.toThrow();
    for (const spy of geometrySpies) expect(spy).toHaveBeenCalledTimes(1);
    for (const spy of materialSpies) expect(spy).not.toHaveBeenCalled();
  });
});
