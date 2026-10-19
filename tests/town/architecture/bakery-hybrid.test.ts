import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { KENNEY_AWNING_URL, createBakeryHybrid } from '../../../src/client/town/architecture/bakery-hybrid.ts';
import { fakeContext, fakeGltf } from './fake-context.ts';

describe('hybrid bakery (Kenney awning)', () => {
  it('original keeps the glTF material and texture untouched', async () => {
    const gltf = fakeGltf();
    const loadGltf = vi.fn(() => Promise.resolve(gltf.group));
    const ctx = fakeContext('a', loadGltf);
    const piece = createBakeryHybrid(ctx, 'original');
    await expect(piece.ready).resolves.toEqual({ degraded: [] });
    expect(loadGltf).toHaveBeenCalledWith(KENNEY_AWNING_URL);
    expect(gltf.mesh.material).toBe(gltf.material);
    expect(gltf.material.map).not.toBeNull();
    expect(piece.object.getObjectByName('bakery-awning')).toBeUndefined();
    expect(piece.object.getObjectByName('bakery-kit-awning')).toBeDefined();
    expect(ctx.outlined).toContain(gltf.group);
  });

  it('palette mode flattens the awning to the brick surface', async () => {
    const gltf = fakeGltf();
    const ctx = fakeContext('a', () => Promise.resolve(gltf.group));
    await createBakeryHybrid(ctx, 'palette').ready;
    expect(ctx.kitMaterials.has(gltf.mesh.material as THREE.Material)).toBe(true);
    expect(ctx.surfaces.at(-1)?.hex).toBe(ctx.palette.town.brick);
  });

  it('a load failure shows the code awning and is reported', async () => {
    const ctx = fakeContext('a', () => Promise.reject(new Error('404')));
    const piece = createBakeryHybrid(ctx, 'original');
    const { degraded } = await piece.ready;
    expect(degraded).toHaveLength(1);
    expect(degraded[0]).toContain(KENNEY_AWNING_URL);
    expect(degraded[0]).toContain('404');
    expect(piece.object.getObjectByName('bakery-awning')).toBeDefined();
  });

  it('dispose leaves loaded resources alone', async () => {
    const gltf = fakeGltf();
    const piece = createBakeryHybrid(fakeContext('a', () => Promise.resolve(gltf.group)), 'original');
    await piece.ready;
    const geometry = vi.spyOn(gltf.mesh.geometry, 'dispose');
    const material = vi.spyOn(gltf.material, 'dispose');
    piece.dispose();
    expect(geometry).not.toHaveBeenCalled();
    expect(material).not.toHaveBeenCalled();
  });

  it('a load that finishes after dispose does not re-attach anything', async () => {
    let resolve: (group: THREE.Group) => void = () => {};
    const ctx = fakeContext('a', () => new Promise((r) => { resolve = r; }));
    const piece = createBakeryHybrid(ctx, 'original');
    piece.dispose();
    const gltf = fakeGltf();
    resolve(gltf.group);
    await piece.ready;
    expect(gltf.group.parent).toBeNull();
  });
});
