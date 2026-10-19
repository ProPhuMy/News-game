import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { PROP_KINDS, createProp } from '../../../src/client/town/props/index.ts';
import { NATURE_MATERIAL_ROLES } from '../../../src/client/town/props/nature.ts';
import { fakeContext, fakeGltf, meshes, townHexes } from '../architecture/fake-context.ts';

const loadsFake = (materialName = 'leafsGreen') => () => Promise.resolve(fakeGltf(materialName).group);

describe('props', () => {
  it.each(PROP_KINDS)('%s builds on the ground', async (kind) => {
    const piece = createProp(kind, fakeContext('a', loadsFake()));
    await expect(piece.ready).resolves.toEqual({ degraded: [] });
    const box = new THREE.Box3().setFromObject(piece.object);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(piece.footprint.width).toBeGreaterThan(0);
    expect(piece.footprint.depth).toBeGreaterThan(0);
  });

  it('unknown kind throws', () => {
    expect(() => createProp('rocket', fakeContext())).toThrow('unknown prop kind "rocket"');
  });

  it('nature materials map by name to palette roles', async () => {
    const gltf = fakeGltf('woodBark');
    const ctx = fakeContext('a', () => Promise.resolve(gltf.group));
    await createProp('tree-oak', ctx).ready;
    expect(NATURE_MATERIAL_ROLES.woodBark).toBe('wood');
    expect(ctx.kitMaterials.has(gltf.mesh.material as THREE.Material)).toBe(true);
    expect(ctx.surfaces.at(-1)?.hex).toBe(ctx.palette.town.wood);
  });

  it('an unmapped material falls back to trim and is reported', async () => {
    const ctx = fakeContext('a', loadsFake('mystery'));
    const { degraded } = await createProp('bush', ctx).ready;
    expect(degraded).toEqual(['bush: unmapped material "mystery"']);
    expect(ctx.surfaces.at(-1)?.hex).toBe(ctx.palette.town.trim);
  });

  it('a nature load failure shows a stand-in and is reported', async () => {
    const ctx = fakeContext('a', () => Promise.reject(new Error('404')));
    const piece = createProp('tree-round', ctx);
    const { degraded } = await piece.ready;
    expect(degraded).toHaveLength(1);
    expect(degraded[0]).toContain('/models/props/kenney-nature/tree_default.glb');
    expect(meshes(piece.object).length).toBeGreaterThan(0);
  });

  it('uses palette colors only', async () => {
    const ctx = fakeContext('b', loadsFake());
    await Promise.all(PROP_KINDS.map((kind) => createProp(kind, ctx).ready));
    const allowed = townHexes(ctx);
    for (const call of ctx.surfaces) {
      expect(allowed).toContain(call.hex);
      if (call.emissive !== undefined) expect(allowed).toContain(call.emissive);
    }
  });

  it('bench legs are wood', () => {
    const ctx = fakeContext('c');
    createProp('bench', ctx);
    expect(ctx.surfaces.map((s) => s.hex)).toContain(ctx.palette.town.wood);
  });

  it('gas lamp stands taller than a citizen', () => {
    const piece = createProp('gas-lamp', fakeContext());
    const size = new THREE.Box3().setFromObject(piece.object).getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(CITIZEN_REFERENCE_HEIGHT);
  });

  it('dispose after a late load does not attach the model', async () => {
    let resolve: (group: THREE.Group) => void = () => {};
    const piece = createProp('bush', fakeContext('a', () => new Promise((r) => { resolve = r; })));
    piece.dispose();
    const gltf = fakeGltf('grass');
    resolve(gltf.group);
    await piece.ready;
    expect(gltf.group.parent).toBeNull();
  });
});
