import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { OFFICE_FOOTPRINT, createOffice } from '../../../src/client/town/architecture/office.ts';
import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { groundRects } from './clearance.ts';
import { fakeContext, meshes } from './fake-context.ts';

const PAPER = 0x336699;
const bannerMeshes = (root: THREE.Object3D) => meshes(root).filter((m) => m.name === 'office-banner');
const kitColors = (ctx: ReturnType<typeof fakeContext>) => [...ctx.kitMaterials].map((m) => (m as THREE.MeshBasicMaterial).color.getHex());

describe('code-built newspaper office', () => {
  it('has footprint 5 x 4.4, a tall +Z door, chimneys and two banners', () => {
    expect(OFFICE_FOOTPRINT).toEqual({ width: 5, depth: 4.4 });
    const piece = createOffice(fakeContext(), PAPER);
    expect(piece.footprint).toEqual(OFFICE_FOOTPRINT);
    piece.object.updateMatrixWorld(true);
    const door = new THREE.Box3().setFromObject(piece.object.getObjectByName('office-door')!);
    expect(door.max.y - door.min.y).toBeGreaterThanOrEqual(1.25 * CITIZEN_REFERENCE_HEIGHT);
    expect(door.getCenter(new THREE.Vector3()).z).toBeGreaterThan(0);
    expect(meshes(piece.object).filter((m) => m.name === 'office-chimney').length).toBeGreaterThanOrEqual(2);
    expect(bannerMeshes(piece.object).length).toBe(2);
  });

  it('ground meshes stay inside the footprint', () => {
    for (const r of groundRects(createOffice(fakeContext(), PAPER).object)) {
      expect(r.minX, r.name).toBeGreaterThanOrEqual(-2.55);
      expect(r.maxX, r.name).toBeLessThanOrEqual(2.55);
      expect(r.minZ, r.name).toBeGreaterThanOrEqual(-2.25);
      expect(r.maxZ, r.name).toBeLessThanOrEqual(2.25);
    }
  });

  it('banners use the paper color and recolor without mutating kit materials', () => {
    const ctx = fakeContext();
    const piece = createOffice(ctx, PAPER);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(PAPER));
    const before = kitColors(ctx);
    const snapshot = [...ctx.kitMaterials].map((m) => [m, (m as THREE.MeshBasicMaterial).color.getHex()] as const);
    piece.setBannerColor(0xaa1122);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(0xaa1122));
    for (const [m, hex] of snapshot) expect((m as THREE.MeshBasicMaterial).color.getHex()).toBe(hex);
    expect(before.length).toBeGreaterThan(0);
    expect(piece.bannerColor()).toBe(0xaa1122);
  });

  it('highlight and recolor compose in either order', () => {
    const ctx = fakeContext();
    const piece = createOffice(ctx, PAPER);
    piece.setHighlight(true);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(PAPER, { emissive: PAPER }));
    piece.setBannerColor(0x11aa22);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(0x11aa22, { emissive: 0x11aa22 }));
    piece.setHighlight(false);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(0x11aa22));
    piece.setBannerColor(0x445566);
    piece.setHighlight(true);
    for (const b of bannerMeshes(piece.object)) expect(b.material).toBe(ctx.materials.surface(0x445566, { emissive: 0x445566 }));
  });

  it('outlines the root and double dispose is safe', () => {
    const ctx = fakeContext();
    const piece = createOffice(ctx, PAPER);
    expect(ctx.outlined).toContain(piece.object);
    piece.dispose();
    expect(() => piece.dispose()).not.toThrow();
  });
});
