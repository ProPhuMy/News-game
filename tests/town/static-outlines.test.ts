import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { batchStaticOutlines } from '../../src/client/town/static-outlines.ts';

function outline(parent: THREE.Object3D, material = new THREE.LineBasicMaterial()) {
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry()), material);
  line.name = 'toon-outline'; parent.add(line); return line;
}

describe('static building outline batching', () => {
  it('combines lines sharing a material without changing their transformed vertices', () => {
    const root = new THREE.Group(); root.position.set(6, 2, -4); root.rotation.y = 0.3;
    const parent = new THREE.Group(); parent.position.set(2, 1, 3); parent.scale.set(2, 3, 1); root.add(parent);
    const first = outline(parent); first.rotation.z = 0.4;
    const second = outline(root, first.material); second.position.set(-2, 0, 1);
    const originals = [first, second];
    root.updateWorldMatrix(true, true);
    const points = originals.flatMap(line => {
      const positions = line.geometry.getAttribute('position');
      return Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(line.matrixWorld));
    });
    const dispose = batchStaticOutlines(root);
    const batch = root.children.find(child => child.name === 'static-outline-batch');
    expect(batch).toBeInstanceOf(THREE.LineSegments);
    if (!(batch instanceof THREE.LineSegments)) throw new Error('missing batch');
    expect(batch.material).toBe(first.material);
    expect(originals.every(line => !line.visible && line.parent !== null)).toBe(true);
    root.updateWorldMatrix(true, true);
    const positions = batch.geometry.getAttribute('position');
    expect(positions.count).toBe(points.length);
    points.forEach((point, i) => expect(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(batch.matrixWorld).distanceTo(point)).toBeLessThan(0.00001));
    const sourceDisposals = originals.map(line => vi.spyOn(line.geometry, 'dispose'));
    const materialDispose = vi.spyOn(first.material, 'dispose');
    const batchDispose = vi.spyOn(batch.geometry, 'dispose');
    dispose(); dispose();
    expect(originals.every(line => line.visible)).toBe(true);
    expect(batch.parent).toBeNull(); expect(batchDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).not.toHaveBeenCalled();
    sourceDisposals.forEach(spy => expect(spy).not.toHaveBeenCalled());
  });

  it('keeps materials separate and leaves hidden, animated and unsupported lines alone', () => {
    const root = new THREE.Group();
    const first = outline(root); outline(root, first.material);
    const other = outline(root); outline(root, other.material);
    const hidden = new THREE.Group(); hidden.visible = false; root.add(hidden);
    const hiddenLine = outline(hidden, first.material);
    const transparent = outline(root, new THREE.LineBasicMaterial({ transparent: true }));
    const unrelated = outline(root, first.material); unrelated.name = 'route';
    const custom = outline(root, first.material); custom.renderOrder = 1;
    const animated = outline(root, first.material); animated.morphTargetInfluences = [0];
    const dispose = batchStaticOutlines(root);
    expect(root.children.filter(child => child.name === 'static-outline-batch')).toHaveLength(2);
    for (const line of [hiddenLine, transparent, unrelated, custom, animated]) expect(line.visible).toBe(true);
    dispose();
  });
});
