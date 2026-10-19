import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { groundRects } from './clearance.ts';

const box = (w: number, h: number, d: number, x: number, y: number, z: number, name = '') => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  m.position.set(x, y, z);
  m.name = name;
  return m;
};

describe('groundRects', () => {
  it('skips parts fully above HEADROOM and flat slabs, keeps low boxes in world XZ', () => {
    const parent = new THREE.Group();
    parent.position.set(10, 0, -20);
    parent.add(box(2, 1, 2, 0, 6, 0, 'awning')); // min.y 5.5 > 3.8
    parent.add(box(20, 0.04, 20, 0, 0, 0, 'slab')); // max.y 0.02
    parent.add(box(2, 2, 4, 1, 1, 3, 'low'));
    const rects = groundRects(parent);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toMatchObject({ name: 'low', minX: 10, maxX: 12, minZ: -19, maxZ: -15 });
  });
});
