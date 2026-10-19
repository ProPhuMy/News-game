import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FOUNTAIN_OFFSET, FOUNTAIN_RADIUS, PLAZA_SIZE, createFountainSquare } from '../../../src/client/town/architecture/fountain.ts';
import { fakeContext, meshes, townHexes } from './fake-context.ts';

describe('fountain square', () => {
  it('constants and footprint', () => {
    expect(PLAZA_SIZE).toBe(20);
    expect(FOUNTAIN_OFFSET).toEqual({ x: 6, z: -6 });
    expect(FOUNTAIN_RADIUS).toBe(3.3);
    expect(createFountainSquare(fakeContext()).footprint).toEqual({ width: 20, depth: 20 });
  });

  it('plaza slab is flat, below the road top and above the ground slab', () => {
    const piece = createFountainSquare(fakeContext());
    piece.object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(piece.object.getObjectByName('plaza')!);
    expect(box.max.y).toBeLessThanOrEqual(0.03);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.max.x - box.min.x).toBeCloseTo(20);
  });

  it('fountain meshes stay within the radius and use palette hexes', () => {
    const ctx = fakeContext();
    const piece = createFountainSquare(ctx);
    piece.object.updateMatrixWorld(true);
    const fountain = piece.object.getObjectByName('fountain')!;
    expect(fountain.position.x).toBe(FOUNTAIN_OFFSET.x);
    expect(fountain.position.z).toBe(FOUNTAIN_OFFSET.z);
    for (const m of meshes(fountain)) {
      const b = new THREE.Box3().setFromObject(m);
      for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
        // box corners overestimate circles; test the box's own extents against the radius per axis
        expect(Math.abs(x - FOUNTAIN_OFFSET.x)).toBeLessThanOrEqual(FOUNTAIN_RADIUS + 1e-6);
        expect(Math.abs(z - FOUNTAIN_OFFSET.z)).toBeLessThanOrEqual(FOUNTAIN_RADIUS + 1e-6);
      }
    }
    for (const c of ctx.surfaces) expect(townHexes(ctx)).toContain(c.hex);
    expect(ctx.outlined).toContain(piece.object);
  });

  it('double dispose is safe', () => {
    const piece = createFountainSquare(fakeContext());
    piece.dispose();
    expect(() => piece.dispose()).not.toThrow();
  });
});
